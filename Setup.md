# Clutch AI Operating System: Local Setup Guide

This guide outlines the step-by-step instructions to clone, install, configure, and execute the **Clutch AI Operating System** locally on your workstation.

---

## 1. Prerequisites
Ensure you have the following software runtimes installed on your local operating system:
* **Node.js** (v18.x or higher)
* **npm** (v9.x or higher)
* **Git** version control CLI

---

## 2. Installation Steps

1. **Clone the Project Repository**:
   ```bash
   git clone <repository-url-here>
   cd clutch-ai-os
   ```

2. **Install Project Dependencies**:
   Execute the package installation tool to download and configure standard dependencies (React, Tailwind CSS, Lucide icons, Framer Motion, Firebase, and Recharts):
   ```bash
   npm install
   ```

---

## 3. Environment Variable Configuration

1. Create a secure local configuration file `.env` based on the example blueprint:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` in your text editor and fill out your specific service credentials:
   ```env
   # API Keys (Keep server secrets safe!)
   GEMINI_API_KEY=AIzaSy...

   # Public Firebase Config
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-app
   VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234:web:abcd

   # Google Calendar Client ID
   VITE_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
   ```

---

## 4. Firebase Database Initialization

To initialize your local database:
1. Ensure your firebase config values are set properly in `.env`.
2. Apply secure firestore rules. Check that `firestore.rules` is present in the workspace root.
3. If running locally with emulators (optional):
   ```bash
   firebase emulators:start
   ```

---

## 5. Launch the Application Locally

Start the local development server:
```bash
npm run dev
```

The development environment will launch, binding port `3000` (or fallback port `5173` on external local runs). 
Open your web browser and navigate to:
* **http://localhost:3000** (or local fallback console output URL)

### Authenticating in Demo (Guest) Mode
If you do not have Google OAuth or Firebase active configs ready, you can immediately click **"Demo Mode" / "Enter Guest Workspace"** on the splash screen. This allows you to explore full features, configure local tasks, view risk assessments, run local calendar simulations, and discuss deadline mitigations with Clutch Coach entirely offline!
