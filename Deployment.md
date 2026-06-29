# Clutch AI Operating System: Deployment Manual

This guide describes how to build, deploy, and configure the **Clutch AI Operating System** to cloud-hosted environments, such as Google Cloud Run, Firebase Hosting, and Firestore.

---

## 1. Firebase & Firestore Deployment

Clutch utilizes **Firebase Firestore** for durable user task data, audit trails, and notification configurations.

### 1.1 Firestore Security Rules Setup
Deploy security rules to isolate client data per authenticated workspace:
1. Verify `firestore.rules` exists in your project root with the following secure bindings:
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
2. Deploy the rules configuration using the Firebase CLI:
   ```bash
   firebase deploy --only firestore:rules
   ```

### 1.2 Enable Offline Persistence
Clutch automatically enforces client-side cached databases on supported browsers. No extra deployment steps are required; Firestore will automatically queue operations if a network disconnection occurs.

---

## 2. Environment Variables Configuration

To run and compile the application in Production mode, configure the following variables in your environment or CI/CD dashboards:

```env
# Server Secrets (Do NOT expose to client code)
GEMINI_API_KEY=your_gemini_api_key_here

# Client Configs (Pre-fixed with VITE_ to expose to bundle compiler)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# Google OAuth Calendar Client Credential
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

---

## 3. Google Cloud Console & Calendar API Configuration

To enable the live **Google Calendar Interlock** features:

1. Go to the **Google Cloud Console** (https://console.cloud.google.com).
2. Create or select your project.
3. Search for and **Enable Google Calendar API**.
4. Navigate to **APIs & Services > OAuth Consent Screen**:
   * Set User Type to **External**.
   * Fill out the App Name, support email, and developer contact.
   * Add the following scopes:
     * `.../auth/calendar.events` (View and edit events on all your calendars)
     * `.../auth/calendar.readonly` (View your calendars)
5. Navigate to **APIs & Services > Credentials**:
   * Click **Create Credentials** and select **OAuth client ID**.
   * Set Application Type to **Web application**.
   * Add **Authorized JavaScript origins**:
     * Add your localhost port origin: `http://localhost:3000` and `http://localhost:5173`.
     * Add your secure Cloud Run/Vercel/Firebase hosting domain: `https://your-app-domain.web.app`.
   * Add **Authorized redirect URIs**:
     * Set matching redirect boundaries if custom popup handlers are used.
6. Copy the generated **Client ID** and bind it to your `VITE_GOOGLE_CLIENT_ID` environment variable.

---

## 4. Google Cloud Run Deployment

If you are using full-stack capabilities (e.g. Express server and server-side Gemini API proxies):

1. Compile the static frontend and bundle the server:
   ```bash
   npm run build
   ```
2. Build the Docker Container:
   ```bash
   gcloud builds submit --tag gcr.io/your-project-id/clutch-os
   ```
3. Deploy to **Cloud Run**:
   ```bash
   gcloud run deploy clutch-os \
     --image gcr.io/your-project-id/clutch-os \
     --platform managed \
     --port 3000 \
     --set-env-vars GEMINI_API_KEY=your_gemini_api_key \
     --allow-unauthenticated
   ```
