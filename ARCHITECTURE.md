# Clutch AI Operating System: Architecture & Design Manual

This document provides a comprehensive technical overview of the **Clutch AI Operating System**, an autonomous deadline-rescue platform. Clutch leverages a secure, full-stack, multi-agent pipeline designed to identify task risks, generate structured recovery plans, resolve schedule conflicts, and schedule deep-work focus sessions locally or directly into Google Calendar.

---

## 1. Executive Summary

### What is Clutch?
Clutch is an **Autonomous Deadline-Rescue Operating System** that converts unstructured project anxiety into highly organized, calendar-synchronized deep-work focus blocks. It acts as an active partner in rescuing high-risk commitments, evaluating task constraints, tracking biological energy levels, and protecting deep focus from distractions.

### Core Objective
The core objective of Clutch is to **eliminate scheduling friction and protect deep focus**. By executing real-time multi-factor risk assessments and running an autonomous multi-agent pipeline, the system automatically intervenes when a task reaches high-risk thresholds, proactively allocating dedicated 45-minute focus blocks to ensure timely delivery.

### Primary User Workflow
1. **Task Ingestion**: The user enters an unstructured task description or raw voice/text transcription with a real or relative deadline (e.g., "by tomorrow noon", "EOD Friday").
2. **Autonomous Parsing & Risk Evaluation**: The Task Parsing Agent structures the input into milestones and estimated workloads, while the Risk Assessment Agent computes a dynamic Risk Score (0-100%).
3. **Calendar Interlock & Deep-Work Allocation**: The Scheduling Agent evaluates calendar free/busy slots, and the Conflict Detection Agent resolves clashes, allocating an optimal 45-minute focus block.
4. **Rescheduling & Local Fallbacks**: If external API limitations or offline conditions occur, the Recovery Agent transparently drops back to Local Workspace Scheduling, preventing system failure.
5. **Interactive Co-Pilot Engagement**: The user interacts with the **Decision Coach (Clutch Coach)** inside a specialized chat pane to brainstorm, request step-by-step guidance, and adjust schedules on the fly.

---

## 2. System Architecture

The application is structured as a full-stack system combining a responsive React front-end (Vite) and an autonomous service layer backed by Firebase and server-side integrations.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (SPA)                              │
│  React (Vite) / Tailwind CSS / Lucide Icons / Framer Motion / Recharts │
├───────────────────────────────────┬────────────────────────────────────┤
│           DASHBOARD VIEW          │         DIAGNOSTICS PANEL          │
│   Task List & Detail Drawers      │   Real-time Telemetry Audits       │
│   Active Session Tickers & Audio  │   System Health, logs, Auth state  │
├───────────────────────────────────┼────────────────────────────────────┤
│            CHALLENGE UI           │          DECISION COACH            │
│   Crisis Overlay / Trigger Alert  │   Interactive Markdown Chat        │
└─────────────────┬─────────────────┴──────────────────┬─────────────────┘
                  │                                    │
                  │ HTTPS                              │ Secure API Proxy
                  ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                             BACKEND SERVICES                           │
├────────────────────────────────────┬───────────────────────────────────┤
│         FIREBASE UTILITIES         │        EXTERNAL INTEGRATIONS      │
│   - Firebase Auth (Google / Demo)  │   - Google Calendar API V3        │
│   - Firestore Offline Cache / State│   - server-side Gemini API        │
└────────────────────────────────────┴───────────────────────────────────┘
```

---

## 3. The Autonomous Agent Pipeline

The Clutch core runs an ordered pipeline of specialized autonomous agents that handle tasks sequentially.

```
   [Task Input]
        │
        ▼
┌─────────────────────────┐
│   Task Parsing Agent    │  <-- Structures raw text into subtasks and absolute dates
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Risk Assessment Agent  │  <-- Dynamically computes Risk Score (0-100%)
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│    Scheduling Agent     │  <-- Finds ideal 45-minute deep-work sprint slots
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│Conflict Detection Agent │  <-- Scans calendar free/busy schedules, resolves clashes
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│     Recovery Agent      │  <-- Mitigates API limits & handles offline/demo fallbacks
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│    Diagnostics Agent    │  <-- Streams real-time telemetry and audit logs
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│     Decision Coach      │  <-- Generates tactical crisis and execution advice
└─────────────────────────┘
```

### Deep Dive into Agent Definitions

#### 1. Task Parsing Agent
* **Objective**: Translates unstructured task parameters and deadlines into structured records.
* **Responsibilities**:
  * Extracts absolute deadlines, estimated hours, categorization, and milestone breakdowns.
  * Handles relative time expressions (e.g., "by EOD Friday", "in three days") based on local system time.
  * Ensures schema validity. Defaults to 24 hours from the current time if completely omitted.

#### 2. Risk Assessment Agent
* **Objective**: Quantifies task vulnerability and predicts potential scheduling breaches.
* **Responsibilities**:
  * Calculates a dynamic **Risk Score (0–100%)** utilizing multi-factor formulas:
    $$\text{Risk Score} = w_1 \cdot \text{Urgency} + w_2 \cdot \text{Complexity} + w_3 \cdot \text{Track Record}$$
  * Automatically triggers **Crisis Mode** if the calculated score exceeds 75%.
  * Logs high-level vulnerability metrics (e.g., "Overbooked calendar", "Insufficient buffer time") without technical noise.

#### 3. Scheduling Agent
* **Objective**: Allocates dedicated, optimal work slots to protect deep work focus.
* **Responsibilities**:
  * Determines the best 45-minute deep-work sprint blocks.
  * Respects peak cognitive energy patterns (e.g., morning focus peaks vs evening grinds).
  * Coordinates with the current scheduling engine (Google Calendar or Local Workspace database).
  * Uses lazy initialization to prevent initialization failures when keys are absent.

#### 4. Conflict Detection Agent
* **Objective**: Prevents scheduling conflicts and protects focus blocks from external intrusion.
* **Responsibilities**:
  * Scans calendar free/busy schedules (real Google Calendar events or local slots).
  * Proposes alternative, conflict-free scheduling windows when overlaps or fatigue risks are detected.
  * Clearly highlights resolved clashes in the diagnostics log panel.

#### 5. Recovery Agent
* **Objective**: Serves as a circuit breaker to handle API rate limits, transient outages, and authentication expired states.
* **Responsibilities**:
  * Intercepts Google Calendar API failures (401, 429, 503 errors).
  * Transparently drops back to **Local Workspace Scheduling** if Google sync is offline or unavailable.
  * Gracefully manages `isAnonymous` / Guest states, ensuring no Google Calendar operations fail in Demo Mode.
  * Redacts secret keys or auth parameters from user-facing diagnostics.

#### 6. Diagnostics Agent
* **Objective**: Maintains a real-time, high-fidelity audit trail of underlying pipeline executions.
* **Responsibilities**:
  * Formats and logs granular steps (Parsing, Scheduling, Sync).
  * Categorizes events dynamically (`success`, `info`, `warning`, `error`).
  * Distinguishes user authentication states dynamically (e.g., `Authenticated (Google)` vs `Authenticated (Anonymous)`).

#### 7. Decision Coach (Clutch Coach)
* **Objective**: Acts as a professional emergency deadline specialist and productivity strategist.
* **Responsibilities**:
  * Provides highly structured, action-oriented tactical advice (no generic or flowery motivational fillers).
  * Adapts suggestions based on current progress, deadlines, and active authentication mode (Demo vs Live).

---

## 4. End-to-End Task Lifecycle & Data Flow

```
┌──────────────┐      ┌─────────────────────┐      ┌─────────────────────────┐
│  Task Input  ├─────►│ Task Parsing Agent  ├─────►│  Firestore Store Doc    │
│ (Raw / Text) │      │  (Gemini Parse)     │      │  (Write task and state) │
└──────────────┘      └─────────────────────┘      └────────────┬────────────┘
                                                                │
                                                                ▼
┌──────────────┐      ┌─────────────────────┐      ┌─────────────────────────┐
│ Google Cal   │◄─────┤  Scheduling Agent   │◄─────┤  Risk Assessment Agent  │
│ Event Sync   │      │ (Free/busy scan +   │      │ (Risk index calculation)│
│  (Or Local)  │      │ conflict check)     │      │                         │
└──────┬───────┘      └─────────────────────┘      └─────────────────────────┘
       │
       ▼
┌──────────────┐      ┌─────────────────────┐
│ Diagnostics  ├─────►│  User Notification  │
│ (Audit Trail)│      │  (Interactive UI)   │
└──────────────┘      └─────────────────────┘
```

1. **Task Ingestion**: The user creates a task. A document is added to `/users/{uid}/tasks`.
2. **AI Structuring**: A Gemini endpoint analyzes the raw text, returning structured subtasks and extracting a clean target completion date.
3. **Vulnerability Evaluation**: The Risk Assessment module computes the risk score. If the score is $>75\%$, the task flag `isCrisis` is enabled, immediately triggering visual alerts and visual overlays.
4. **Slot Searching**: The system scans local schedules or real Google Calendar events to find an open 45-minute gap.
5. **Calendar Placement**: The event is scheduled in Google Calendar or fallback local database.
6. **Diagnostics logging**: The system logs every stage of execution into `/users/{uid}/logs`.
7. **Client Feedback**: Real-time toast notifications inform the user of updates.

---

## 5. Firebase & Security Architecture

The app uses Firebase Firestore for persistent storage, combined with Firebase Auth for credential handling.

### Firestore Schema Layout

* `/users/{uid}`: Holds the user configuration, current productivity preference parameters, and authenticated synchronization mode (`demo` vs `google`).
* `/users/{uid}/tasks/{taskId}`: Individual user task documents (containing titles, deadlines, category, progress, risk scores, and subtask arrays).
* `/users/{uid}/logs/{logId}`: Audit trail logs maintained by the Diagnostics Agent.
* `/users/{uid}/notifications/{notifId}`: Interactive toast and alert messages.
* `/users/{uid}/conversations/{taskId}`: Conversation histories with the Decision Coach, containing individual structured role messages.

### Firestore Security Rules (`firestore.rules`)
To prevent data enumeration, collection-level read/write permissions are strictly scoped to the authenticated Firebase User ID:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /tasks/{taskId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /logs/{logId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /notifications/{notifId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /conversations/{convId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 6. Google Calendar & Integration Flows

The application provides a seamless Google Calendar Interlock, utilizing pop-up authentication and OAuth tokens:

1. **Popup Integration**: The user initiates Google Authentication from the setup menu. The OAuth token is safely retrieved on client authorization and stored in temporary `sessionStorage` (preventing persistent key exposure).
2. **Free/Busy Scans**: Before scheduling an event, Clutch queries Google Calendar API's `/freeBusy` endpoint to scan current availability.
3. **Booking Actions**: Deep-work focus blocks are booked as real calendar events with custom description payloads containing task progress, risk vectors, and structural milestones.
4. **Interactive Rescheduling**: If a user drags, completes, or edits subtasks, Clutch automatically updates, reschedules, or clears matching calendar event boundaries.
5. **Graceful Demo Fallback**: When in **Demo Mode** or offline, the Google sync blocks are bypassed, saving all scheduled intervals locally to avoid 401 unauthenticated errors.

---

## 7. Technology Stack

* **Front-end Library**: React 18+ (with TypeScript)
* **Build System**: Vite (HMR disabled for structured development consistency)
* **Styling**: Tailwind CSS
* **Animations**: Framer Motion
* **Charts & Visualizers**: Recharts (with Custom Tooltips, Area and Radar grids)
* **Database & Auth**: Firebase Firestore & Firebase Auth
* **AI SDK**: Server-side Google Gen AI SDK (`@google/genai` or server-side proxies)
* **Calendar Connector**: Google Calendar API V3 Integration (OAuth 2.0 Client Flow)

---

## 8. Security & Production-Readiness Audit

### Verified Security Guarantees
1. **Zero Secret Leakage**: No Google Client Secrets, Firebase Admin keys, or Gemini API keys are bundled or exposed client-side. The application operates securely utilizing standard user-authenticated context tokens.
2. **Storage Isolation**: Tokens are stored strictly in volatile `sessionStorage`. Performing a logout triggers clean-up operations, completely flushing in-memory authentications, sessionStorage states, and cached Firestore stores.
3. **Query Containment**: Every Firestore query is dynamically checked, preventing any user from reading, listing, or modifying tasks belonging to another active UID.
4. **No Telemetry Leaks**: The Diagnostics Agent automatically filters and redacts authorization headers, access tokens, and key properties, ensuring all output logs remain secure for hackathon demonstrations.
