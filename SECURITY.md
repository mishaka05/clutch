# Clutch AI Operating System: Security Manual

Security is core to the **Clutch AI Operating System** to ensure user tasks, calendars, and API variables remain protected.

---

## 1. Verified Security Measures

### 1.1 Non-Exposure of API Secrets
* **Server-Side API Proxying**: No administrative API secrets or private developer variables (like `GEMINI_API_KEY`) are shipped inside front-end React bundles.
* **Prefixed Public Variables**: Only client-safe environment variables (e.g. Firebase public config) utilize the `VITE_` prefix required by the build compiler.

### 1.2 Access token Isolation
* **In-Memory Sessions Only**: User OAuth scopes retrieved from Google Auth are saved strictly in `sessionStorage`. 
* **Zero Persistence**: No calendar tokens are written to local disk caches or Firestore DB files. Refreshing the browser or logging out flushes all memory buffers instantly.

### 1.3 Firestore Access Restrictions (`firestore.rules`)
Firestore restricts general reads and writes by implementing user isolation rules. No user can read or write documents where the query metadata does not match `request.auth.uid`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /tasks/{taskId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 1.4 Diagnostic Sanitization
* The Diagnostics Agent intercepts logged objects, redacting authorization parameters and secret properties (`Authorization: [REDACTED]`, `access_token: [REDACTED]`) before transmitting outputs to client-side diagnostics cards.

---

## 2. Ongoing Recommendations
* **Secure Cookies (Future)**: Transition OAuth storage from `sessionStorage` to `HttpOnly` secure cookies on customized full-stack proxy servers.
* **Content Security Policy (CSP)**: Establish strict CSP rules preventing scripts from sending data to domains outside of Firebase, Google API, and Gemini backend hosts.
