# Engineering Decisions — Clutch

> This document explains the key architectural and implementation decisions made during the development of Clutch. Each decision is recorded with its rationale, the alternatives that were considered, and the tradeoffs accepted.

---

## 1. Gemini is Proxied Through an Express Server

### Decision
All calls to the Gemini API are routed through a server-side Express proxy (`server.ts`) rather than being made directly from the browser client.

### Rationale
Exposing a Gemini API key in a client-side JavaScript bundle is a critical security vulnerability. Browser bundles are fully inspectable — any key embedded in frontend code can be extracted in under 60 seconds using browser DevTools. The key would then be usable by anyone to make arbitrary Gemini API calls billed to the project owner.

The Express server holds `GEMINI_API_KEY` exclusively in its environment variables. The client never receives or transmits the key. All AI requests flow through two controlled endpoints:

- `POST /api/gemini/parse-task` — structured task extraction
- `POST /api/gemini/chat` — conversational AI coaching with task context

### Tradeoff Accepted
This adds a network hop between the client and Gemini. For a productivity application where AI responses are expected to take 1–3 seconds regardless, this latency cost is negligible. The security guarantee is non-negotiable.

### Security Additions
The Express server also strips the `X-Powered-By` header to avoid advertising the server technology stack, and error handlers redact any active credentials before writing to server logs.

---

## 2. Firestore Was Chosen Over a SQL Database

### Decision
Cloud Firestore is the sole database for user profiles, tasks, agent logs, and notification records.

### Rationale

**Real-time listeners over polling.** The core UI contract of Clutch is that risk scores, task states, and scheduling results update live without the user refreshing. Firestore's `onSnapshot` listener makes this trivial — a single subscription per collection delivers updates to the client the moment a write occurs, whether from the same client, a different device, or a server-side agent process.

**Offline-first persistence.** Firestore's client SDK maintains a local cache and queues writes when the network is unavailable. This is not a feature Clutch had to implement — it is a property of the database choice. For a deadline management tool, operating correctly under poor connectivity is a correctness requirement, not a nice-to-have.

**Schema flexibility during rapid development.** The task object schema evolved significantly during the build phase. Adding `googleCalendarEventId`, `scheduledSlotUTC`, and telemetry fields to an existing SQL table would require migrations. In Firestore, fields are simply added to documents.

**Same ecosystem as Firebase Auth.** User identity from Firebase Auth maps directly to Firestore document paths (`users/{uid}/...`). Security rules can reference `request.auth.uid` to enforce per-user isolation at the database level with no additional application logic.

### Tradeoff Accepted
Firestore does not support complex relational queries or joins. Clutch's data model does not require them — tasks, logs, and notifications are all user-scoped with no cross-user relationships in the current architecture.

---

## 3. Anonymous Authentication Exists

### Decision
Clutch supports full application functionality without requiring Google sign-in via Firebase Anonymous Authentication.

### Rationale

**Demo reliability.** The most common failure mode in a live hackathon demo is an OAuth popup being blocked by the browser or a judge's Google account having restrictive workspace policies. Anonymous auth bypasses both. A judge can open Clutch and see every feature in under 10 seconds.

**Lower friction for first-time users.** Requiring OAuth before a user sees value from the product creates abandonment. Demo Mode allows immediate interaction — tasks can be added, parsed, and locally scheduled before any credential exchange occurs.

**Architectural completeness.** Supporting anonymous users forces the application to handle the case where Google Calendar is unavailable. This produced a more robust system overall: the local scheduling fallback, offline Firestore caching, and demo metadata pathways all exist because anonymous mode required them.

### Implementation
When no active auth session is detected on startup, `signInAnonymously()` creates a temporary Firebase user. All Firestore writes use the anonymous UID path (`users/{uid}/...`) with the same security rules. Google Calendar API calls are bypassed — scheduling operates against a local workspace. A mode flag (`mode: 'demo'`) in the user profile document routes the client to local scheduling paths throughout the application.

### Tradeoff Accepted
Anonymous sessions are ephemeral. Task data created in Demo Mode is not recoverable across sessions unless the user upgrades to Google sign-in. This is an acceptable tradeoff for a tool designed to get users to value immediately.

---

## 4. Optimistic UI Was Implemented

### Decision
Task creation, scheduling actions, and state updates reflect in the interface immediately — before server or Firestore confirmation is received.

### Rationale
A deadline management tool used under time pressure cannot afford the UX cost of async wait states on every action. If a user adds a task and sees a loading spinner for 1.5 seconds before the card appears, the tool has already failed its core promise of being faster and calmer than the deadline itself.

Optimistic UI communicates system confidence. When Clutch schedules a focus block and the calendar event card appears instantly, the user's mental model shifts — the system is authoritative and fast. The actual API confirmation happening in the background is an implementation detail, not a user experience event.

### Undo as the Safety Net
Optimistic UI without recovery is irresponsible. Every scheduling action in Clutch produces an animated toast notification with an inline undo button. The undo action:
1. Reverts the local Firestore document to its pre-action state
2. Calls the Google Calendar API to delete or modify the created event
3. Updates the UI immediately (optimistically) again

This creates a complete optimistic cycle: act fast, recover safely.

---

## 5. sessionStorage Was Chosen for OAuth Access Tokens

### Decision
Google OAuth access tokens acquired during the Calendar authorization flow are stored in `sessionStorage` under the key `clutch_g_token`, not in `localStorage` or an HttpOnly cookie.

### Rationale

**Against `localStorage`:** Tokens in `localStorage` persist across browser sessions and are accessible to any JavaScript on the page indefinitely. For an OAuth access token with Calendar read/write scope, this represents an unacceptable persistence risk. A token that expires in one hour should not be stored in a medium that survives browser restarts.

**For `sessionStorage` over cookies:** Implementing HttpOnly cookies for token storage requires a stateful session management layer on the Express server, adding complexity that is out of scope for the current architecture. `sessionStorage` achieves the primary security goal — tokens are cleared when the tab closes — while keeping the auth flow stateless on the server.

**Behaviour:** On page refresh, `sessionStorage` retains the token within the same browser session. On tab close or sign-out, the token is cleared. Sign-out explicitly calls `sessionStorage.removeItem('clutch_g_token')` before the Firebase sign-out call.

### Residual Risk and Mitigation
`sessionStorage` is accessible to JavaScript and is therefore vulnerable to XSS. The mitigation is Vite's build pipeline, which does not inline environment variables into the client bundle and enforces Content Security Policy headers. A documented recommendation exists to migrate to HttpOnly cookies in a future production hardening pass.

---

## 6. Deterministic Fallbacks Exist When Gemini Quota Is Exhausted

### Decision
When Gemini returns an HTTP 429 (rate limit) or is unreachable, the system transparently routes the request to a local deterministic parsing engine built from regex patterns and static scheduling rules.

### Rationale

**Demo safety.** The single most destructive failure mode in a live hackathon demonstration is a broken AI call producing an error state on screen in front of judges. A fallback engine that silently handles quota exhaustion eliminates this failure mode entirely. From the user's perspective, the system continues to function.

**Architectural honesty.** A production scheduling system cannot have a single point of failure in an external AI API. The deterministic engine is not a hack — it is the correct architectural response to depending on a rate-limited third-party service.

**Recovery loop.** After entering fallback mode, a recovery agent monitors Gemini availability and re-processes any queued requests when the service is restored. The system self-heals without user intervention.

### What the Fallback Engine Does
- Extracts deadline expressions using temporal regex patterns (`tomorrow`, `at 5 PM`, `by Thursday`)
- Normalises extracted datetimes to ISO UTC strings
- Estimates complexity using keyword heuristics (`presentation`, `report`, `review`)
- Assigns a default risk score based on remaining hours

### What It Does Not Do
The fallback engine cannot perform conversational coaching or generate micro-action checklists — these require Gemini's generative capability. In fallback mode, the AI Decision Coach displays a status message indicating limited availability. Core scheduling continues uninterrupted.

---

## 7. Google Calendar Synchronisation Is Optional in Demo Mode

### Decision
When a user authenticates anonymously (Demo Mode), all scheduling operations target a local workspace rather than the Google Calendar API. No Calendar API calls are made.

### Rationale

**OAuth scope minimisation.** Requesting Calendar write scope from an anonymous user is not meaningful — there is no Google account to write to. Attempting it would produce an error.

**Demonstration completeness.** Demo Mode must show every feature of Clutch without requiring Calendar access. The local scheduling engine replicates the scheduling agent's behaviour — slot detection, conflict resolution, focus block creation — against a simulated calendar workspace stored in Firestore. The UI is identical to the authenticated experience.

**Diagnostics transparency.** The Diagnostics Console detects the Demo Mode state and adjusts its log output accordingly — local workspace actions are logged with a `[LOCAL]` prefix rather than `[CALENDAR API]`. Judges reviewing the diagnostic feed can see exactly what the system is doing and why the API path differs.

### Upgrade Path
When a Demo Mode user subsequently authenticates with Google, the system migrates locally-scheduled tasks by creating real Calendar events for each active focus block. The local workspace entries are removed and replaced with `googleCalendarEventId` references on the Firestore task documents.

---

## 8. Firestore Security Rules Enforce Per-User Isolation at the Database Level

### Decision
All Firestore reads and writes are gated by security rules that compare `request.auth.uid` against the document path's `{userId}` segment. No application-layer middleware handles this — the database enforces it.

### Rationale
Application-layer authorization can be bypassed if a bug exists in the request handling code. Moving access control to the database layer means that even a compromised or incorrectly implemented API route cannot return another user's data — the Firestore SDK will reject the read at the platform level before any data is transmitted.

```javascript
// firestore.rules
match /users/{userId} {
  allow read, write: if request.auth != null
                     && request.auth.uid == userId;
  match /tasks/{taskId} {
    allow read, write: if request.auth != null
                       && request.auth.uid == userId;
  }
}
```

This rule structure also applies to anonymous users — their UID from `signInAnonymously()` is a valid Firebase UID and matches their document path, so Demo Mode data is isolated exactly as authenticated data is.
