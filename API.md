# Clutch AI Operating System: API Documentation

This file documents the application-level service interfaces, server-side integrations, and client-side modules that facilitate autonomous task parsing, risk analysis, local/cloud logging, and Google Calendar synchronizations.

---

## 1. Firebase Service Interface (`src/services/firebase.ts`)

The `firebaseService` handles initialization, anonymous/Google authentication states, local task caching, user profile updates, telemetry logs, and notifications.

### `getCurrentUser()`
Returns the active authenticated user profile details or `null`.
* **Output**:
  ```typescript
  interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    mode: 'demo' | 'google';
    bioPattern?: {
      morningPeak: boolean;
      nightGrind: boolean;
    };
  }
  ```

### `getTasks(uid: string)`
Queries the task collection sorted by deadline/creation date. Includes offline disk cache resolution.
* **Input**: `uid: string`
* **Output**: `Promise<Task[]>`

### `saveTask(uid: string, task: Task)`
Persists or updates a task inside Firestore.
* **Input**: `uid: string, task: Task`
* **Output**: `Promise<void>`

### `saveLog(uid: string, log: DiagnosticLog)`
Writes operational telemetry logs to `/users/{uid}/logs/{logId}`.
* **Input**: `uid: string, log: DiagnosticLog`
* **Output**: `Promise<void>`

---

## 2. Gemini API Service (`src/services/gemini.ts`)

Facilitates secure server-side proxy prompts or client-side direct interactions for the autonomous pipeline agents.

### `parseTaskDescription(prompt: string, localTime: string)`
Calls Gemini models using structured output parameters to convert unstructured prompts into schema-compliant JSON structures.
* **Input**:
  * `prompt: string` (e.g., "submit my research paper by Friday noon, need to write introduction, edit refs, check figures")
  * `localTime: string` (Current timestamp for relative deadline parsing)
* **Output**:
  ```json
  {
    "title": "Submit Research Paper",
    "deadline": "2026-07-03T12:00:00-07:00",
    "category": "academic",
    "subtasks": [
      { "id": "sub-1", "title": "Write introduction", "completed": false },
      { "id": "sub-2", "title": "Edit references", "completed": false },
      { "id": "sub-3", "title": "Check figures", "completed": false }
    ],
    "estimatedHours": 8.5
  }
  ```

### `askDecisionCoach(taskId: string, chatHistory: Message[], query: string)`
Interacts with the Clutch Decision Coach to generate focused, tactical emergency strategies or answer coding/concept inquiries.
* **Input**:
  * `taskId: string` (Active task metadata reference)
  * `chatHistory: Message[]` (Message threads preserving developer conversational state)
  * `query: string` (Current user query)
* **Output**: `Promise<string>` (Markdown-formatted direct response)

---

## 3. Google Calendar Service (`src/services/googleCalendar.ts`)

Manages client-side OAuth popups, token sessions, availability queries, and deep-work event placement.

### `authenticateGoogle()`
Triggers a secure pop-up to request Google Calendar access scopes, resolving with an access token.
* **Output**: `Promise<string>` (Access Token)

### `getFreeBusy(token: string, timeMin: string, timeMax: string)`
Scans current calendar intervals to identify overlaps or blockades.
* **Input**:
  * `token: string`
  * `timeMin: string` (ISO String)
  * `timeMax: string` (ISO String)
* **Output**: `Promise<TimePeriod[]>`

### `createFocusSession(token: string, taskTitle: string, startTime: string, endTime: string)`
Injects a 45-minute deep-work focus block into the primary calendar.
* **Input**:
  * `token: string`
  * `taskTitle: string`
  * `startTime: string` (ISO String)
  * `endTime: string` (ISO String)
* **Output**: `Promise<GoogleEvent>`
