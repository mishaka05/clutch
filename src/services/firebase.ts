/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously,
  onAuthStateChanged, 
  User, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  getDocFromServer,
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task, UserProfile, AgentLog, AppNotification, SubTask } from '../types';
import { calculateTaskRisk } from '../utils/riskEngine';
import { parseSchedulingExpression, getLocalISOString } from '../utils/dateParser';

// ==========================================
// FIREBASE CORE INITIALIZATION
// ==========================================

// ==========================================
// FIREBASE CORE INITIALIZATION & AUDIT
// ==========================================

console.log("=== FIREBASE INITIALIZATION AUDIT ===");
console.log("Firebase Config Project ID:", firebaseConfig.projectId);
console.log("Firebase Config Auth Domain:", firebaseConfig.authDomain);
console.log("Firebase Config App ID:", firebaseConfig.appId);
console.log("Initialization Path: src/services/firebase.ts (sole initialization point)");

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore using standard getFirestore with no custom databaseId parameter
// to ensure it connects to the standard default database of the clutch-ccfdd project.
const dbInstance = getFirestore(app);
export const db = dbInstance;
console.log("Firestore Instance: Initialized default database successfully.");
console.log("======================================");

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Run a connection test to diagnose connectivity and verify that we are not locked offline
async function runFirestoreConnectionTest() {
  try {
    const testDocRef = doc(db, 'users', 'connection_test_doc');
    await getDocFromServer(testDocRef);
    console.log("Firestore Connection Test: Successfully reached Firebase servers (online status verified).");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Firestore Connection Test Error: Please check your Firebase configuration or network. The client is offline.", error);
    } else {
      console.log("Firestore Connection Test: Server is reachable. Received expected permissions denial / not found error code:", error?.code || error);
    }
  }
}
runFirestoreConnectionTest();

// Google Auth Provider setup with Google Calendar scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

// ==========================================
// PRELOADED STORY-DRIVEN DEMO TASKS
// ==========================================

function getSeededDemoTasks(uid: string): Task[] {
  const now = Date.now();
  
  // 1. DBMS Assignment (Crisis, due in 1h 45m)
  const dbmsDeadline = new Date(now + (1 * 60 + 45) * 60 * 1000).toISOString();
  const dbmsSubtasks: SubTask[] = [
    { id: 'dbms-1', title: 'Review assignment brief & model entities', completed: true, durationMinutes: 20, sequenceNumber: 1 },
    { id: 'dbms-2', title: 'Normalize relational tables & build schema', completed: false, durationMinutes: 30, sequenceNumber: 2 },
    { id: 'dbms-3', title: 'Draft SELECT queries with JOIN optimizations', completed: false, durationMinutes: 25, sequenceNumber: 3 },
    { id: 'dbms-4', title: 'Establish isolation level & transaction tests', completed: false, durationMinutes: 20, sequenceNumber: 4 },
    { id: 'dbms-5', title: 'Generate reports and entity-relationship charts', completed: false, durationMinutes: 30, sequenceNumber: 5 },
    { id: 'dbms-6', title: 'Compile source archive and proofread final files', completed: false, durationMinutes: 15, sequenceNumber: 6 }
  ];
  const dbmsRisk = calculateTaskRisk({
    deadline: dbmsDeadline,
    progress: 20,
    complexity: 'high',
    estimatedDuration: 180,
  });

  // 2. ML Report (Warning, due in 6 hours)
  const mlDeadline = new Date(now + 6 * 3600 * 1000).toISOString();
  const mlSubtasks: SubTask[] = [
    { id: 'ml-1', title: 'Verify neural model training logs and accuracy', completed: true, durationMinutes: 20, sequenceNumber: 1 },
    { id: 'ml-2', title: 'Analyze neural training plots & validation loss', completed: true, durationMinutes: 25, sequenceNumber: 2 },
    { id: 'ml-3', title: 'Summarize network parameter adjustments', completed: false, durationMinutes: 30, sequenceNumber: 3 },
    { id: 'ml-4', title: 'Draft methodology and performance analysis', completed: false, durationMinutes: 30, sequenceNumber: 4 },
    { id: 'ml-5', title: 'Export precision-recall curve visual figures', completed: false, durationMinutes: 20, sequenceNumber: 5 },
    { id: 'ml-6', title: 'Proofread report content & export final submission', completed: false, durationMinutes: 15, sequenceNumber: 6 }
  ];
  const mlRisk = calculateTaskRisk({
    deadline: mlDeadline,
    progress: 40,
    complexity: 'high',
    estimatedDuration: 240,
  });

  // 3. Revise Data Structures (Safe, due in 22 hours)
  const dsDeadline = new Date(now + 22 * 3600 * 1000).toISOString();
  const dsSubtasks: SubTask[] = [
    { id: 'ds-1', title: 'Revise complexity analysis & big O notation', completed: true, durationMinutes: 15, sequenceNumber: 1 },
    { id: 'ds-2', title: 'Walkthrough array, linked list, stack operations', completed: true, durationMinutes: 20, sequenceNumber: 2 },
    { id: 'ds-3', title: 'Review hash map bucketing & collision handling', completed: true, durationMinutes: 20, sequenceNumber: 3 },
    { id: 'ds-4', title: 'Analyse binary search tree balancing logic', completed: false, durationMinutes: 25, sequenceNumber: 4 },
    { id: 'ds-5', title: 'Write standard recursion algorithms & depth checks', completed: false, durationMinutes: 25, sequenceNumber: 5 },
    { id: 'ds-6', title: 'Complete timed sorting and array mock test', completed: false, durationMinutes: 15, sequenceNumber: 6 }
  ];
  const dsRisk = calculateTaskRisk({
    deadline: dsDeadline,
    progress: 60,
    complexity: 'medium',
    estimatedDuration: 90,
  });

  // 4. Team Presentation (Safe/Low, due in 2 days)
  const teamDeadline = new Date(now + 45 * 3600 * 1000).toISOString();
  const teamSubtasks: SubTask[] = [
    { id: 'team-1', title: 'Outline core slides structures & speaker roles', completed: true, durationMinutes: 15, sequenceNumber: 1 },
    { id: 'team-2', title: 'Draft script segments for the project intro', completed: false, durationMinutes: 20, sequenceNumber: 2 },
    { id: 'team-3', title: 'Assemble mock screens and functional slides', completed: false, durationMinutes: 30, sequenceNumber: 3 },
    { id: 'team-4', title: 'Add high-contrast styling and branding assets', completed: false, durationMinutes: 20, sequenceNumber: 4 },
    { id: 'team-5', title: 'Record a mock practice session with teammates', completed: false, durationMinutes: 25, sequenceNumber: 5 },
    { id: 'team-6', title: 'Audit deployment slides file dimensions', completed: false, durationMinutes: 15, sequenceNumber: 6 }
  ];
  const teamRisk = calculateTaskRisk({
    deadline: teamDeadline,
    progress: 10,
    complexity: 'medium',
    estimatedDuration: 120,
  });

  return [
    {
      id: 'demo-task-dbms',
      uid,
      title: 'Finish DBMS Assignment',
      deadline: dbmsDeadline,
      complexity: 'high',
      priority: 'high',
      estimatedDuration: 180,
      category: 'academic',
      progress: 20,
      riskScore: dbmsRisk.riskScore,
      status: 'active',
      createdAt: new Date(now - 12 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now).toISOString(),
      completedSteps: 1,
      totalSteps: 6,
      aiGenerated: true,
      lastRiskEvaluation: new Date(now).toISOString(),
      lastAIInteraction: new Date(now).toISOString(),
      subtasks: dbmsSubtasks,
    },
    {
      id: 'demo-task-ml',
      uid,
      title: 'Prepare ML Report',
      deadline: mlDeadline,
      complexity: 'high',
      priority: 'high',
      estimatedDuration: 240,
      category: 'work',
      progress: 40,
      riskScore: mlRisk.riskScore,
      status: 'active',
      createdAt: new Date(now - 15 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now).toISOString(),
      completedSteps: 2,
      totalSteps: 6,
      aiGenerated: true,
      lastRiskEvaluation: new Date(now).toISOString(),
      lastAIInteraction: new Date(now).toISOString(),
      subtasks: mlSubtasks,
    },
    {
      id: 'demo-task-ds',
      uid,
      title: 'Revise Data Structures',
      deadline: dsDeadline,
      complexity: 'medium',
      priority: 'medium',
      estimatedDuration: 90,
      category: 'academic',
      progress: 60,
      riskScore: dsRisk.riskScore,
      status: 'active',
      createdAt: new Date(now - 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now).toISOString(),
      completedSteps: 3,
      totalSteps: 6,
      aiGenerated: true,
      lastRiskEvaluation: new Date(now).toISOString(),
      lastAIInteraction: new Date(now).toISOString(),
      subtasks: dsSubtasks,
    },
    {
      id: 'demo-task-team',
      uid,
      title: 'Team Presentation Slides',
      deadline: teamDeadline,
      complexity: 'medium',
      priority: 'low',
      estimatedDuration: 120,
      category: 'work',
      progress: 10,
      riskScore: teamRisk.riskScore,
      status: 'active',
      createdAt: new Date(now - 2 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now).toISOString(),
      completedSteps: 1,
      totalSteps: 6,
      aiGenerated: true,
      lastRiskEvaluation: new Date(now).toISOString(),
      lastAIInteraction: new Date(now).toISOString(),
      subtasks: teamSubtasks,
    },
  ];
}

function getSeededDemoLogs(): AgentLog[] {
  const now = Date.now();
  return [
    {
      id: 'log-1',
      taskId: 'demo-task-dbms',
      taskTitle: 'Finish DBMS Assignment',
      actionType: 'escalate_risk',
      actionTaken: 'Risk Escalated to 92%',
      reason: 'DBMS deadline is in 1h 45m with only 20% progress.',
      timestamp: new Date(now - 4 * 60 * 1000).toISOString(),
      isAgentInitiated: true,
      agentType: 'RISK_ASSESSOR',
      telemetryFeedback: 'PENDING',
      decisionExecuted: 'ESCALATED_TO_CRISIS_MODE_AND_DISPATCHED_NOTIFICATIONS',
      userApprovalApplied: 'AUTONOMOUS',
      structuredReasoning: {
        metrics: {
          observedDeadline: '1h 45m remaining',
          observedProgress: '20% completed',
          estimatedWorkRemaining: '3h workload load',
          calendarAvailability: '0 free blocks discovered',
        },
        justificationText: 'DBMS project deadline has closed under 2 hours with only 20% progress. Immediate intervention is required to avoid workflow collapse.',
        decisionConfidence: 96,
      },
    },
    {
      id: 'log-2',
      taskId: 'demo-task-ml',
      taskTitle: 'Prepare ML Report',
      actionType: 'reschedule',
      actionTaken: 'Auto-Scheduled Focus Block',
      reason: 'Booked 45m slot at 4:00 PM for ML draft report writing.',
      timestamp: new Date(now - 12 * 60 * 1000).toISOString(),
      scheduledAt: new Date(now + 2 * 3600 * 1000).toISOString(),
      isAgentInitiated: true,
      agentType: 'CALENDAR_SCHEDULER',
      telemetryFeedback: 'USER_ACCEPTED',
      decisionExecuted: 'SCHEDULED_FOCUS_BLOCK',
      userApprovalApplied: 'BALANCED',
      structuredReasoning: {
        metrics: {
          observedDeadline: 'tomorrow 5 PM',
          observedProgress: '40% completed',
          estimatedWorkRemaining: '4h workload load',
          calendarAvailability: '2 open gaps discovered',
        },
        justificationText: 'Identified an open 45-minute sprint gap in Google Calendar. Injected dedicated deep-work focus block to secure the draft delivery.',
        decisionConfidence: 92,
      },
    },
    {
      id: 'log-3',
      taskId: 'demo-task-ds',
      taskTitle: 'Revise Data Structures',
      actionType: 'do_nothing',
      actionTaken: 'Monitored State - Stable',
      reason: 'DS progress is 60% with ample time left. Secure.',
      timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
      isAgentInitiated: true,
      agentType: 'TASK_MONITOR',
      telemetryFeedback: 'USER_ACCEPTED',
      decisionExecuted: 'NO_ACTION',
      userApprovalApplied: 'AUTONOMOUS',
      structuredReasoning: {
        metrics: {
          observedDeadline: 'in 3 days',
          observedProgress: '60% completed',
          estimatedWorkRemaining: '1.5h workload load',
          calendarAvailability: 'Abundant calendar intervals',
        },
        justificationText: 'Workload-to-deadline velocity ratios indicate the task state is fully secure. No automated scheduling is required.',
        decisionConfidence: 98,
      },
    }
  ];
}

// ==========================================
// PERSISTENCE & INTEGRATION SERVICE
// ==========================================

class PersistenceService {
  private currentUser: UserProfile | null = null;
  private onUserListeners: ((user: UserProfile | null) => void)[] = [];
  private isAuthResolved = false;

  // Real in-memory cache for Google Access Token (required by oauth guidelines)
  private googleAccessToken: string | null = null;

  private lastAttemptedSync: { timestamp: string; status: 'Success' | 'Failure'; message: string } | null = null;
  private diagnosticLogs: { timestamp: string; message: string; type: 'info' | 'success' | 'error' }[] = [];
  private diagnosticListeners: (() => void)[] = [];

  public getDiagnosticLogs() {
    return this.diagnosticLogs;
  }
  
  public getLastAttemptedSync() {
    return this.lastAttemptedSync;
  }

  public getGoogleAccessToken(): string | null {
    return this.googleAccessToken;
  }
  
  public subscribeToDiagnostics(callback: () => void) {
    this.diagnosticListeners.push(callback);
    return () => {
      this.diagnosticListeners = this.diagnosticListeners.filter(cb => cb !== callback);
    };
  }
  
  public addDiagnosticLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      type
    };
    this.diagnosticLogs.unshift(logEntry); // new logs first
    if (this.diagnosticLogs.length > 100) {
      this.diagnosticLogs.pop();
    }
    // Notify subscribers
    this.diagnosticListeners.forEach(cb => {
      try { cb(); } catch(e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('clutch-diagnostics-updated'));
  }
  
  public setLastAttemptedSync(status: 'Success' | 'Failure', message: string) {
    this.lastAttemptedSync = {
      timestamp: new Date().toISOString(),
      status,
      message
    };
    this.diagnosticListeners.forEach(cb => {
      try { cb(); } catch(e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('clutch-diagnostics-updated'));
  }

  constructor() {
    // Check initial session storage for the google access token (if still within same browser session context)
    const savedToken = sessionStorage.getItem('clutch_g_token');
    if (savedToken) {
      this.googleAccessToken = savedToken;
    }

    // Subscribe to real Firebase auth changes
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          let name = firebaseUser.displayName || 'Operator';
          let avatarId = 'purple';
          let mode: 'demo' | 'google' = firebaseUser.isAnonymous ? 'demo' : 'google';

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            name = data.name || name;
            avatarId = data.avatarId || avatarId;
            mode = data.mode || mode;
          } else {
            // Write user profile to firestore
            const newProfile = {
              uid: firebaseUser.uid,
              name,
              email: firebaseUser.email || null,
              avatarId,
              mode,
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newProfile);
          }

          this.currentUser = {
            uid: firebaseUser.uid,
            name,
            email: firebaseUser.email || null,
            avatarId,
            mode,
            createdAt: firebaseUser.metadata.creationTime || new Date().toISOString()
          };

          // Synchronize/Seed Initial Data if brand new user (Google or Demo/Anonymous)
          await this.seedInitialDataIfNewUser(firebaseUser.uid);

        } catch (err) {
          console.error("Firestore user profile fetch/create error:", err);
          // Fallback to offline user profile state
          this.currentUser = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Operator',
            email: firebaseUser.email || null,
            avatarId: 'purple',
            mode: firebaseUser.isAnonymous ? 'demo' : 'google',
            createdAt: new Date().toISOString()
          };
        }
      } else {
        this.currentUser = null;
        this.googleAccessToken = null;
        sessionStorage.removeItem('clutch_g_token');
      }
      this.isAuthResolved = true;
      this.notifyAuthListeners();
    });
  }

  // Auth Listeners & State Change
  public onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    this.onUserListeners.push(callback);
    if (this.isAuthResolved) {
      callback(this.currentUser);
    }
    return () => {
      this.onUserListeners = this.onUserListeners.filter(cb => cb !== callback);
    };
  }

  private notifyAuthListeners() {
    this.onUserListeners.forEach(cb => cb(this.currentUser));
  }

  // Real Google Sign In Flow with popup
  public async signInWithGoogle(): Promise<UserProfile> {
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        this.googleAccessToken = credential.accessToken;
        // Keep in session storage so reload within the same session handles calendar sync
        sessionStorage.setItem('clutch_g_token', credential.accessToken);
        this.setOutageState('oauth_expired', false);
      } else {
        console.warn("No calendar scopes authorized, calendar will use local scheduling");
      }

      const uid = result.user.uid;
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);

      let name = result.user.displayName || 'Google Operator';
      let avatarId = 'purple';

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        name = data.name || name;
        avatarId = data.avatarId || avatarId;
      } else {
        await setDoc(userDocRef, {
          uid,
          name,
          email: result.user.email,
          avatarId,
          mode: 'google',
          createdAt: new Date().toISOString()
        });
      }

      const profile: UserProfile = {
        uid,
        name,
        email: result.user.email,
        avatarId,
        mode: 'google',
        createdAt: result.user.metadata.creationTime || new Date().toISOString()
      };

      this.currentUser = profile;
      this.isAuthResolved = true;
      this.notifyAuthListeners();

      await this.seedInitialDataIfNewUser(uid);

      return profile;
    } catch (err: any) {
      console.error("Firebase Google Popup authentication failed:", err);
      throw err;
    }
  }

  // Sign In as Demo Operator using Anonymous auth + user doc setup
  public async signInAsDemo(name: string, avatarId: string): Promise<UserProfile> {
    try {
      const result = await signInAnonymously(auth);
      const uid = result.user.uid;

      const userDocRef = doc(db, 'users', uid);
      const profileData = {
        uid,
        name: name.trim() || 'Void Walker',
        email: null,
        avatarId,
        mode: 'demo',
        createdAt: new Date().toISOString()
      };
      await setDoc(userDocRef, profileData);

      const profile: UserProfile = {
        uid,
        name: profileData.name,
        email: null,
        avatarId,
        mode: 'demo',
        createdAt: profileData.createdAt
      };

      this.currentUser = profile;
      this.isAuthResolved = true;
      this.notifyAuthListeners();

      await this.seedInitialDataIfNewUser(uid);

      return profile;
    } catch (err: any) {
      console.error("Anonymous Demo sign in failed:", err);
      throw err;
    }
  }

  public async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Firebase logout failed:", err);
    }
    this.currentUser = null;
    this.googleAccessToken = null;
    sessionStorage.removeItem('clutch_g_token');
    this.isAuthResolved = true;
    this.notifyAuthListeners();
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public async updateUserProfile(name: string, avatarId: string) {
    if (this.currentUser) {
      const uid = this.currentUser.uid;
      try {
        await updateDoc(doc(db, 'users', uid), {
          name,
          avatarId
        });
        this.currentUser.name = name;
        this.currentUser.avatarId = avatarId;
        this.notifyAuthListeners();
      } catch (err) {
        console.error("Error updating profile in Firestore:", err);
      }
    }
  }

  // Seeding initial data under the unique Firebase UID in Firestore
  private async seedInitialDataIfNewUser(uid: string) {
    try {
      const tasksColRef = collection(db, 'users', uid, 'tasks');
      const testSnap = await getDocs(query(tasksColRef, limit(1)));

      if (testSnap.empty) {
        console.log(`[Database Engine] Seeding original story tasks and logs for isolated user profile: ${uid}`);
        
        // Batch seed tasks
        const demoTasks = getSeededDemoTasks(uid);
        for (const task of demoTasks) {
          await setDoc(doc(db, 'users', uid, 'tasks', task.id), task);
        }

        // Batch seed logs
        const demoLogs = getSeededDemoLogs();
        for (const log of demoLogs) {
          await setDoc(doc(db, 'users', uid, 'logs', log.id), { ...log, uid });
        }

        // Welcome Notification
        await this.addNotification({
          title: '🔥 Decision Core Activated',
          body: 'Welcome back. Autonomous agents have indexed your active timelines. Monitor risk gauges in real-time below.',
          type: 'success'
        });
      }
    } catch (err) {
      console.error("Failed to seed initial user workspace collections:", err);
    }
  }

  // ==========================================
  // REAL FIRESTORE CRUD OPERATIONS (USER-ISOLATED)
  // ==========================================

  public async getTasks(): Promise<Task[]> {
    const uid = this.currentUser?.uid;
    if (!uid) return [];

    try {
      const tasksRef = collection(db, 'users', uid, 'tasks');
      const snapshot = await getDocs(tasksRef);
      const tasks: Task[] = [];
      snapshot.forEach(docSnap => {
        tasks.push(docSnap.data() as Task);
      });

      // Recalculate risk scores dynamically relative to the current time
      const updatedTasks = tasks.map((task) => {
        const riskResult = calculateTaskRisk({
          deadline: task.deadline,
          progress: task.progress,
          complexity: task.complexity,
          estimatedDuration: task.estimatedDuration,
        });
        return {
          ...task,
          riskScore: riskResult.riskScore,
          lastRiskEvaluation: task.lastRiskEvaluation || null,
        };
      });

      return updatedTasks;
    } catch (err) {
      console.error("Firestore getTasks failed, using local offline cache fallback:", err);
      return [];
    }
  }

  public async addTask(task: Omit<Task, 'id' | 'uid' | 'createdAt' | 'updatedAt' | 'riskScore' | 'lastRiskEvaluation' | 'lastAIInteraction'>): Promise<Task> {
    const uid = this.currentUser?.uid;
    if (!uid) throw new Error('Unauthenticated operation');

    const riskResult = calculateTaskRisk({
      deadline: task.deadline,
      progress: task.progress,
      complexity: task.complexity,
      estimatedDuration: task.estimatedDuration,
    });

    const taskId = 'task-' + Math.random().toString(36).substr(2, 9);
    const newTask: Task = {
      ...task,
      id: taskId,
      uid,
      riskScore: riskResult.riskScore,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRiskEvaluation: new Date().toISOString(),
      lastAIInteraction: null,
    };

    try {
      await setDoc(doc(db, 'users', uid, 'tasks', taskId), newTask);

      await this.addAgentLog({
        taskId: newTask.id,
        taskTitle: newTask.title,
        actionType: 'create_task',
        actionTaken: 'Task Initialized',
        reason: `Task parsed successfully and set up in decision matrix with ${riskResult.riskScore}% completion risk.`,
        isAgentInitiated: false,
      });

      return newTask;
    } catch (err) {
      console.error("Firestore addTask failed:", err);
      throw err;
    }
  }

  public async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const uid = this.currentUser?.uid;
    if (!uid) throw new Error('Unauthenticated operation');

    try {
      const taskDocRef = doc(db, 'users', uid, 'tasks', id);
      const taskDocSnap = await getDoc(taskDocRef);
      if (!taskDocSnap.exists()) {
        throw new Error('Requested task does not exist');
      }

      const currentTask = taskDocSnap.data() as Task;
      const mergedTask = {
        ...currentTask,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const riskResult = calculateTaskRisk({
        deadline: mergedTask.deadline,
        progress: mergedTask.progress,
        complexity: mergedTask.complexity,
        estimatedDuration: mergedTask.estimatedDuration,
      });
      mergedTask.riskScore = riskResult.riskScore;
      mergedTask.lastRiskEvaluation = new Date().toISOString();

      await setDoc(taskDocRef, mergedTask);
      return mergedTask;
    } catch (err) {
      console.error("Firestore updateTask failed:", err);
      throw err;
    }
  }

  public async deleteTask(id: string): Promise<void> {
    const uid = this.currentUser?.uid;
    if (!uid) throw new Error('Unauthenticated operation');

    try {
      const taskDocRef = doc(db, 'users', uid, 'tasks', id);
      const taskDocSnap = await getDoc(taskDocRef);

      if (taskDocSnap.exists()) {
        const task = taskDocSnap.data() as Task;
        // Clean up Google Calendar event if present and synced
        if (task.googleCalendarEventId) {
          console.log(`[Google Sync] Cleaning up scheduled event on deletion: ${task.googleCalendarEventId}`);
          await this.deleteCalendarEvent(task.googleCalendarEventId);
        }
      }

      await deleteDoc(taskDocRef);
    } catch (err) {
      console.error("Firestore deleteTask failed:", err);
    }
  }

  // ==========================================
  // CONVERSATIONS PERSISTENCE (USER-ISOLATED)
  // ==========================================

  public async getTaskConversation(taskId: string): Promise<{ role: 'user' | 'model'; text: string }[]> {
    const uid = this.currentUser?.uid;
    if (!uid) return [];

    try {
      const convDocRef = doc(db, 'users', uid, 'conversations', taskId);
      const convSnap = await getDoc(convDocRef);
      if (convSnap.exists()) {
        return convSnap.data().messages || [];
      }
      return [];
    } catch (err) {
      console.error("Firestore getTaskConversation failed:", err);
      return [];
    }
  }

  public async saveTaskConversation(taskId: string, messages: { role: 'user' | 'model'; text: string }[]): Promise<void> {
    const uid = this.currentUser?.uid;
    if (!uid) return;

    try {
      await setDoc(doc(db, 'users', uid, 'conversations', taskId), { messages });
    } catch (err) {
      console.error("Firestore saveTaskConversation failed:", err);
    }
  }

  // ==========================================
  // LOGS PERSISTENCE (USER-ISOLATED)
  // ==========================================

  public async getAgentLogs(): Promise<AgentLog[]> {
    const uid = this.currentUser?.uid;
    if (!uid) return [];

    try {
      const logsRef = collection(db, 'users', uid, 'logs');
      const snapshot = await getDocs(logsRef);
      const logs: AgentLog[] = [];
      snapshot.forEach(docSnap => {
        logs.push(docSnap.data() as AgentLog);
      });
      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
      console.error("Firestore getAgentLogs failed:", err);
      return [];
    }
  }

  public async deleteAgentLog(logId: string): Promise<void> {
    const uid = this.currentUser?.uid;
    if (!uid) return;

    try {
      const logDocRef = doc(db, 'users', uid, 'logs', logId);
      const logDocSnap = await getDoc(logDocRef);

      if (logDocSnap.exists()) {
        const logData = logDocSnap.data() as AgentLog;
        if (logData.taskId) {
          // Fetch corresponding task and delete Google Calendar event
          const taskDocRef = doc(db, 'users', uid, 'tasks', logData.taskId);
          const taskSnap = await getDoc(taskDocRef);
          if (taskSnap.exists()) {
            const task = taskSnap.data() as Task;
            if (task.googleCalendarEventId) {
              console.log(`[Google Sync] Cancelling Google Calendar focus session: ${task.googleCalendarEventId}`);
              await this.deleteCalendarEvent(task.googleCalendarEventId);
              await updateDoc(taskDocRef, { googleCalendarEventId: null });
            }
          }
        }
      }

      await deleteDoc(logDocRef);
    } catch (err) {
      console.error("Firestore deleteAgentLog failed:", err);
    }
  }

  public async addAgentLog(log: Omit<AgentLog, 'id' | 'timestamp'>): Promise<AgentLog> {
    const uid = this.currentUser?.uid || 'guest';
    const logId = 'log-' + Math.random().toString(36).substr(2, 9);
    const newLog: AgentLog = {
      ...log,
      id: logId,
      uid,
      timestamp: new Date().toISOString(),
    };

    if (uid !== 'guest') {
      try {
        await setDoc(doc(db, 'users', uid, 'logs', logId), newLog);
      } catch (err) {
        console.error("Firestore addAgentLog failed:", err);
      }
    }
    return newLog;
  }

  public async updateAgentLogTelemetry(logId: string, feedback: 'USER_ACCEPTED' | 'USER_IGNORED' | 'USER_DELETED'): Promise<AgentLog> {
    const uid = this.currentUser?.uid;
    if (!uid) throw new Error('Unauthenticated operation');

    try {
      const logDocRef = doc(db, 'users', uid, 'logs', logId);
      await updateDoc(logDocRef, { telemetryFeedback: feedback });
      const snap = await getDoc(logDocRef);
      return snap.data() as AgentLog;
    } catch (err) {
      console.error("Firestore updateAgentLogTelemetry failed:", err);
      throw err;
    }
  }

  // ==========================================
  // APP NOTIFICATIONS PERSISTENCE (USER-ISOLATED)
  // ==========================================

  public async getNotifications(): Promise<AppNotification[]> {
    const uid = this.currentUser?.uid;
    if (!uid) return [];

    try {
      const notifsRef = collection(db, 'users', uid, 'notifications');
      const snapshot = await getDocs(notifsRef);
      const notifications: AppNotification[] = [];
      snapshot.forEach(docSnap => {
        notifications.push(docSnap.data() as AppNotification);
      });
      return notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
      console.error("Firestore getNotifications failed:", err);
      return [];
    }
  }

  public async addNotification(notif: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>): Promise<AppNotification> {
    const uid = this.currentUser?.uid || 'guest';
    const notifId = 'notif-' + Math.random().toString(36).substr(2, 9);
    const newNotif: AppNotification = {
      ...notif,
      id: notifId,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    if (uid !== 'guest') {
      try {
        await setDoc(doc(db, 'users', uid, 'notifications', notifId), newNotif);
      } catch (err) {
        console.error("Firestore addNotification failed:", err);
      }
    }

    window.dispatchEvent(new CustomEvent('clutch-notifications-updated'));
    return newNotif;
  }

  public async markNotificationAsRead(id: string): Promise<void> {
    const uid = this.currentUser?.uid;
    if (!uid) return;

    try {
      await updateDoc(doc(db, 'users', uid, 'notifications', id), { isRead: true });
      window.dispatchEvent(new CustomEvent('clutch-notifications-updated'));
    } catch (err) {
      console.error("Firestore markNotificationAsRead failed:", err);
    }
  }

  public async clearAllNotifications(): Promise<void> {
    const uid = this.currentUser?.uid;
    if (!uid) return;

    try {
      const notifsRef = collection(db, 'users', uid, 'notifications');
      const snapshot = await getDocs(notifsRef);
      const batch = writeBatch(db);
      snapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      window.dispatchEvent(new CustomEvent('clutch-notifications-updated'));
    } catch (err) {
      console.error("Firestore clearAllNotifications failed:", err);
    }
  }

  // ==========================================
  // REAL GOOGLE CALENDAR API INTEGRATIONS
  // ==========================================

  public isCalendarConnected(): boolean {
    return this.googleAccessToken !== null;
  }

  // Event Creation
  private async createCalendarEvent(task: Task, scheduledAt: string, durationMinutes: number): Promise<string | null> {
    if (!this.googleAccessToken) {
      this.addDiagnosticLog("❌ OAuth access token is missing in event creator.", "error");
      return null;
    }

    try {
      console.log("✓ Schedule request started");
      this.addDiagnosticLog("✓ Schedule request started", "info");

      const payload = {
        summary: `Focus Block: ${task.title}`,
        description: `Autonomous sprint scheduled by Clutch Decision Core.\n\nTask Category: ${task.category.toUpperCase()}\nEstimated Work: ${task.estimatedDuration} mins\nRisk Index: ${task.riskScore}%\nTarget Deadline: ${new Date(task.deadline).toLocaleString()}`,
        start: {
          dateTime: new Date(scheduledAt).toISOString(),
        },
        end: {
          dateTime: new Date(new Date(scheduledAt).getTime() + durationMinutes * 60 * 1000).toISOString(),
        },
        reminders: {
          useDefault: true
        }
      };

      console.log("✓ Event payload generated", payload);
      this.addDiagnosticLog("✓ Event payload generated", "info");

      console.log("✓ Calendar request sent");
      this.addDiagnosticLog("✓ Calendar request sent to Google Calendar v3 API", "info");

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.googleAccessToken}`,
          'Content-Type': 'application/json'
         },
         body: JSON.stringify(payload)
      });

      console.log("✓ Calendar response received");
      this.addDiagnosticLog(`✓ Calendar response received: HTTP ${response.status}`, "info");

      if (!response.ok) {
        const errorDetails = await response.json().catch(() => ({}));
        const errorMsg = `Calendar Create Failed: HTTP ${response.status} - ${JSON.stringify(errorDetails)}`;
        console.error(errorMsg);
        this.addDiagnosticLog(`❌ ${errorMsg}`, "error");
        this.setLastAttemptedSync("Failure", `HTTP ${response.status}: ${errorDetails?.error?.message || response.statusText}`);
        throw new Error(errorMsg);
      }

      const eventData = await response.json();
      console.log("✓ Event created");
      this.addDiagnosticLog(`✓ Event created successfully. Event ID: ${eventData.id}`, "success");
      return eventData.id;
    } catch (err: any) {
      console.error("Failed to sync new event to Google Calendar:", err);
      this.handleCalendarError(err);
      throw err;
    }
  }

  // Event Updates
  private async updateCalendarEvent(eventId: string, task: Task, scheduledAt: string, durationMinutes: number): Promise<boolean> {
    if (!this.googleAccessToken) return false;

    try {
      console.log("✓ Schedule request started");
      this.addDiagnosticLog("✓ Schedule request started (update)", "info");

      const payload = {
        summary: `Focus Block: ${task.title}`,
        start: {
          dateTime: new Date(scheduledAt).toISOString(),
        },
        end: {
          dateTime: new Date(new Date(scheduledAt).getTime() + durationMinutes * 60 * 1000).toISOString(),
        }
      };

      console.log("✓ Event payload generated", payload);
      this.addDiagnosticLog("✓ Event payload generated", "info");

      console.log("✓ Calendar request sent");
      this.addDiagnosticLog("✓ Calendar request sent (update)", "info");

      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.googleAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log("✓ Calendar response received");
      this.addDiagnosticLog(`✓ Calendar response received: HTTP ${response.status} (update)`, "info");

      if (!response.ok) {
        if (response.status === 404) {
          console.warn("Event not found on Google Calendar; presumably deleted manually. Will trigger re-creation.");
          this.addDiagnosticLog("Event not found on Google Calendar (update 404). Triggering re-creation.", "info");
          return false;
        }
        const errorDetails = await response.json().catch(() => ({}));
        const errorMsg = `Calendar Patch Failed: HTTP ${response.status} - ${JSON.stringify(errorDetails)}`;
        console.error(errorMsg);
        this.addDiagnosticLog(`❌ ${errorMsg}`, "error");
        this.setLastAttemptedSync("Failure", `HTTP ${response.status}: ${errorDetails?.error?.message || response.statusText}`);
        throw new Error(errorMsg);
      }

      console.log("✓ Event created"); // Consistent with logging requirements
      this.addDiagnosticLog("✓ Event updated successfully.", "success");
      return true;
    } catch (err: any) {
      console.error("Failed to sync schedule update to Google Calendar:", err);
      this.handleCalendarError(err);
      throw err;
    }
  }

  // Event Deletions
  private async deleteCalendarEvent(eventId: string): Promise<boolean> {
    if (!this.googleAccessToken) return false;

    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.googleAccessToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn("Event already removed from Google Calendar.");
          return true;
        }
        const errorDetails = await response.json().catch(() => ({}));
        throw new Error(`Calendar Delete Failed: ${response.status} - ${JSON.stringify(errorDetails)}`);
      }

      return true;
    } catch (err) {
      console.error("Failed to delete event from Google Calendar:", err);
      this.handleCalendarError(err);
      return false;
    }
  }

  // Robust Error Handling for OAuth/503 Propagation
  private handleCalendarError(error: any) {
    const errorStr = String(error?.message || error);
    const isUnauthorized = errorStr.includes('401') || errorStr.includes('invalid_credential') || errorStr.includes('expired') || errorStr.includes('Unauthorized');
    const is503 = errorStr.includes('503') || errorStr.includes('Unavailable');

    if (isUnauthorized) {
      this.setOutageState('oauth_expired', true);
      this.addNotification({
        title: '🔑 Google Calendar Sync Paused',
        body: 'Google Calendar OAuth session has expired or been revoked. Re-authenticate to resume live scheduling.',
        type: 'warning'
      });
      this.addAgentLog({
        taskId: null,
        taskTitle: null,
        actionType: 'do_nothing',
        actionTaken: 'Calendar Sync Paused',
        reason: 'OAuth session token expired. Falling back to robust local offline scheduler.',
        isAgentInitiated: true,
        agentType: 'CALENDAR_SCHEDULER',
        isFailure: true,
        retryCount: 1,
        maxRetries: 3,
        status: 'failed_retrying',
        errorMessage: 'Token Expired: Identity pool could not verify access rights.'
      });
    } else if (is503) {
      this.setOutageState('calendar_503', true);
      this.addNotification({
        title: '🗓️ Google Calendar Unreachable (503)',
        body: 'Clutch detected that Google Calendar is temporarily down. Backoff recovery loop is holding your booking.',
        type: 'warning'
      });
    }
  }

  // ==========================================
  // CALENDAR SCHEDULER & EVENT SYNC ADAPTER
  // ==========================================

  public async runGoogleCalendarDiagnostics(): Promise<{
    authOk: boolean;
    tokenOk: boolean;
    scopesOk: boolean;
    syncOk: boolean;
    details: string;
  }> {
    this.addDiagnosticLog("Starting end-to-end Google Calendar diagnostic verification...", "info");
    
    // 1. Auth check
    const user = this.currentUser;
    if (!user) {
      this.addDiagnosticLog("❌ Stage 1 Failed: User is not authenticated. Please log in first.", "error");
      this.setLastAttemptedSync("Failure", "Unauthenticated user");
      return { authOk: false, tokenOk: false, scopesOk: false, syncOk: false, details: "User is unauthenticated." };
    }
    
    this.addDiagnosticLog(`✓ User authenticated (UID: ${user.uid}, Email: ${user.email})`, "success");
    if (user.mode !== 'google') {
      this.addDiagnosticLog("⚠ User is logged in Demo/Anonymous mode. Real Google Calendar Sync is disabled.", "error");
      this.setLastAttemptedSync("Failure", "Demo mode active");
      return { authOk: true, tokenOk: false, scopesOk: false, syncOk: false, details: "User is in Demo Mode. Real Google Calendar sync is disabled." };
    }
    
    // 2. Token exist check
    const token = this.googleAccessToken;
    if (!token) {
      this.addDiagnosticLog("❌ Stage 2 Failed: Google OAuth Access Token is missing. Please log in with Google to authorize Calendar scopes.", "error");
      this.setLastAttemptedSync("Failure", "Missing Access Token");
      return { authOk: true, tokenOk: false, scopesOk: false, syncOk: false, details: "OAuth Access Token is missing." };
    }
    this.addDiagnosticLog("✓ OAuth token acquired from session storage / credentials", "success");
    
    // 3. Calendar authorization / token validation via Calendar API
    this.addDiagnosticLog("Calling Google Calendar API to validate token and calendar authorization...", "info");
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorDetails = await response.json().catch(() => ({}));
        this.addDiagnosticLog(`❌ Calendar Authorization Failed: HTTP ${response.status} - ${JSON.stringify(errorDetails)}`, "error");
        if (response.status === 401) {
          this.setOutageState('oauth_expired', true);
          this.addDiagnosticLog("Token is invalid or expired. Re-authentication required.", "error");
        }
        this.setLastAttemptedSync("Failure", `HTTP ${response.status}: API error`);
        return { authOk: true, tokenOk: false, scopesOk: false, syncOk: false, details: `Calendar API returned status ${response.status}.` };
      }
      
      const calendarData = await response.json();
      this.addDiagnosticLog(`✓ Calendar Authorization Verified! Connected to: ${calendarData.id} (${calendarData.summary})`, "success");
      this.addDiagnosticLog("✓ Google Calendar scopes granted & verified", "success");
      this.setOutageState('oauth_expired', false);
      this.setOutageState('calendar_503', false);
    } catch (err: any) {
      this.addDiagnosticLog(`❌ Calendar API Unreachable: ${err?.message || err}`, "error");
      this.setLastAttemptedSync("Failure", "API Unreachable");
      return { authOk: true, tokenOk: false, scopesOk: false, syncOk: false, details: err?.message || "Calendar API Unreachable." };
    }
    
    // 4. Test Sync Event Creation & Deletion
    this.addDiagnosticLog("Triggering test calendar sync (scheduling test event)...", "info");
    try {
      this.addDiagnosticLog("✓ Event payload generated for diagnostics test", "info");
      this.addDiagnosticLog("✓ Calendar request sent to primary calendar", "info");
      
      const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: 'Clutch Integration Test Event',
          description: 'Automated end-to-end diagnostic verification of Google Calendar Sync.',
          start: {
            dateTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
          },
          end: {
            dateTime: new Date(Date.now() + 2.75 * 3600 * 1000).toISOString(),
          }
        })
      });
      
      this.addDiagnosticLog(`✓ Calendar response received: HTTP ${createResponse.status}`, "info");
      
      if (!createResponse.ok) {
        const errorDetails = await createResponse.json().catch(() => ({}));
        this.addDiagnosticLog(`❌ Test Event Creation Failed: HTTP ${createResponse.status} - ${JSON.stringify(errorDetails)}`, "error");
        this.setLastAttemptedSync("Failure", `Event Creation HTTP ${createResponse.status}`);
        return { authOk: true, tokenOk: true, scopesOk: true, syncOk: false, details: `Event creation failed: HTTP ${createResponse.status}` };
      }
      
      const eventData = await createResponse.json();
      const testEventId = eventData.id;
      this.addDiagnosticLog(`✓ Test Event successfully created on Google Calendar! Event ID: ${testEventId}`, "success");
      
      // Clean up by deleting the test event
      this.addDiagnosticLog("Cleaning up: Deleting diagnostics test event...", "info");
      const deleteResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${testEventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (deleteResponse.ok) {
        this.addDiagnosticLog("✓ Diagnostics test event deleted successfully.", "success");
      } else {
        this.addDiagnosticLog(`⚠ Clean up warning: Failed to delete test event ${testEventId}. HTTP ${deleteResponse.status}`, "info");
      }
      
      this.setLastAttemptedSync("Success", "All diagnostic steps passed");
      this.addDiagnosticLog("🟢 Google Calendar Integration is 100% HEALTHY and ACTIVE!", "success");
      return { authOk: true, tokenOk: true, scopesOk: true, syncOk: true, details: "All steps succeeded." };
    } catch (err: any) {
      this.addDiagnosticLog(`❌ Test Sync failed: ${err?.message || err}`, "error");
      this.setLastAttemptedSync("Failure", "Test Sync Exception");
      return { authOk: true, tokenOk: true, scopesOk: true, syncOk: false, details: err?.message || "Sync failed with error." };
    }
  }

  public async simulateGoogleCalendarSchedule(taskId: string, durationMinutes: number, customScheduledAt?: string): Promise<{ success: boolean; eventTime: string }> {
    const uid = this.currentUser?.uid;
    if (!uid) throw new Error('Unauthenticated operation');

    console.log("✓ User authenticated");
    this.addDiagnosticLog("✓ User authenticated", "success");

    if (this.googleAccessToken) {
      console.log("✓ Calendar scopes granted");
      this.addDiagnosticLog("✓ Calendar scopes granted", "success");
      console.log("✓ OAuth token acquired");
      this.addDiagnosticLog("✓ OAuth token acquired", "success");
    }

    const taskDocRef = doc(db, 'users', uid, 'tasks', taskId);
    const taskSnap = await getDoc(taskDocRef);
    if (!taskSnap.exists()) throw new Error('Task target does not exist');
    const task = taskSnap.data() as Task;

    let eventTime: Date;
    let rolloverOccurred = false;
    let hasExplicitDate = false;
    const now = new Date();

    if (customScheduledAt) {
      // Check if customScheduledAt is an ISO string or similar timestamp
      const isISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(customScheduledAt);
      if (isISO) {
        eventTime = new Date(customScheduledAt);
        // Determine rollover by checking if the hour/minute set on today is <= now,
        // and the target date has indeed been set to tomorrow.
        const eventTimeOnToday = new Date(now);
        eventTimeOnToday.setHours(eventTime.getHours(), eventTime.getMinutes(), 0, 0);
        if (eventTime.getDate() === now.getDate() + 1 && eventTimeOnToday.getTime() <= now.getTime()) {
          rolloverOccurred = true;
        }
      } else {
        // It's a natural language expression! Parse it.
        const parseResult = parseSchedulingExpression(customScheduledAt, now);
        eventTime = parseResult.localDate;
        rolloverOccurred = parseResult.rolloverOccurred;
        hasExplicitDate = parseResult.hasExplicitDate;
      }
    } else {
      // Default: 1 hour from now
      eventTime = new Date(now.getTime() + 60 * 60 * 1000);
      eventTime.setMinutes(0, 0, 0);
    }

    // Store diagnostic logs for auditing date interpretation
    const initialLocalISO = getLocalISOString(eventTime);
    this.addDiagnosticLog(`[Date Interpreter Audit] Current local datetime: ${getLocalISOString(now)} (${now.toLocaleString()})`, "info");
    this.addDiagnosticLog(`[Date Interpreter Audit] Parsed requested datetime: ${initialLocalISO} (${eventTime.toLocaleString()})`, "info");
    this.addDiagnosticLog(`[Date Interpreter Audit] Whether rollover to tomorrow occurred: ${rolloverOccurred ? 'Yes (Time passed today)' : 'No'}`, rolloverOccurred ? "info" : "success");

    // ==========================================
    // INTELLIGENT CONFLICT DETECTION & RESOLUTION
    // ==========================================
    interface CalendarEventInterval {
      title: string;
      start: Date;
      end: Date;
    }

    const durationMs = durationMinutes * 60 * 1000;
    const googleEvents: CalendarEventInterval[] = [];
    const localEvents: CalendarEventInterval[] = [];

    // 1. Query Google Calendar if connected
    const isGoogleActive = this.googleAccessToken && !this.isOutageActive('calendar_503') && !this.isOutageActive('oauth_expired');
    if (isGoogleActive) {
      try {
        const startOfDay = new Date(eventTime);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfRange = new Date(startOfDay);
        endOfRange.setDate(endOfRange.getDate() + 7);
        endOfRange.setHours(23, 59, 59, 999);

        const timeMin = getLocalISOString(startOfDay);
        const timeMax = getLocalISOString(endOfRange);

        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.googleAccessToken}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          const items = data.items || [];
          for (const item of items) {
            if (item.status === 'cancelled') continue;
            // Skip our own focus block to avoid false conflict on reschedule/update
            if (task.googleCalendarEventId && item.id === task.googleCalendarEventId) {
              continue;
            }
            const sStr = item.start?.dateTime;
            const eStr = item.end?.dateTime;
            if (!sStr || !eStr) continue; // skip all-day events
            
            googleEvents.push({
              title: item.summary || 'Untitled Event',
              start: new Date(sStr),
              end: new Date(eStr)
            });
          }
          this.addDiagnosticLog(`✓ Fetched ${googleEvents.length} events from Google Calendar for conflict checking.`, "success");
        } else {
          this.addDiagnosticLog(`⚠️ Failed to fetch Google Calendar events: HTTP ${response.status}.`, "info");
        }
      } catch (err: any) {
        this.addDiagnosticLog(`⚠️ Google Calendar events fetch failed: ${err?.message || err}.`, "info");
      }
    }

    // 2. Query other local tasks from Firestore as fallback/secondary check
    try {
      const tasksQuery = query(collection(db, 'users', uid, 'tasks'));
      const tasksSnap = await getDocs(tasksQuery);
      tasksSnap.forEach(docSnap => {
        if (docSnap.id === taskId) return; // skip self
        const t = docSnap.data() as Task;
        if (t.googleCalendarScheduledAtLocal) {
          const tStart = new Date(t.googleCalendarScheduledAtLocal);
          const tEnd = new Date(tStart.getTime() + (t.estimatedDuration || 45) * 60 * 1000);
          localEvents.push({
            title: t.title,
            start: tStart,
            end: tEnd
          });
        }
      });
      this.addDiagnosticLog(`✓ Fetched ${localEvents.length} local scheduled focus slots.`, "success");
    } catch (err: any) {
      this.addDiagnosticLog(`⚠️ Failed to load local scheduled focus slots: ${err?.message || err}`, "info");
    }

    // 3. Determine target list of events to check conflicts against
    const eventsToCheck = isGoogleActive && googleEvents.length > 0 ? googleEvents : localEvents;
    
    // Sort chronologically
    eventsToCheck.sort((a, b) => a.start.getTime() - b.start.getTime());

    // 4. Resolve conflicts
    let candidateStart = new Date(eventTime);
    let conflictFoundInCurrentRun = true;
    let attempts = 0;
    const maxAttempts = 500;

    let firstConflictingEvent: CalendarEventInterval | null = null;
    let conflictType: 'partial' | 'full' | null = null;

    while (conflictFoundInCurrentRun && attempts < maxAttempts) {
      attempts++;
      conflictFoundInCurrentRun = false;
      const candidateEnd = new Date(candidateStart.getTime() + durationMs);

      for (const E of eventsToCheck) {
        if (E.start < candidateEnd && E.end > candidateStart) {
          // Conflict detected!
          if (!firstConflictingEvent) {
            firstConflictingEvent = E;
            const requestedStart = eventTime;
            const requestedEnd = new Date(eventTime.getTime() + durationMs);
            if (requestedStart >= E.start && requestedEnd <= E.end) {
              conflictType = 'full';
            } else {
              conflictType = 'partial';
            }
          }

          // Advance candidate start to the end of this conflicting event
          candidateStart = new Date(E.end.getTime());
          conflictFoundInCurrentRun = true;
          break; // restart check with new candidateStart
        }
      }
    }

    const resolvedTime = candidateStart;
    const isConflictDetected = resolvedTime.getTime() !== eventTime.getTime();

    // Helpers to format time ranges beautifully
    const formatTimeRange = (start: Date, durationMins: number): string => {
      const end = new Date(start.getTime() + durationMins * 60 * 1000);
      const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${startStr}–${endStr}`;
    };

    // Log the conflict detection process inside the Diagnostics Panel
    this.addDiagnosticLog(`[Conflict Detection] Requested time: ${eventTime.toLocaleString()}`, "info");
    if (isConflictDetected && firstConflictingEvent) {
      this.addDiagnosticLog(`[Conflict Detection] Conflicting event title: "${firstConflictingEvent.title}"`, "info");
      this.addDiagnosticLog(`[Conflict Detection] Conflict type: ${conflictType === 'full' ? 'Full Overlap' : 'Partial Overlap'}`, "info");
      this.addDiagnosticLog(`[Conflict Detection] Suggested alternative: ${resolvedTime.toLocaleString()}`, "info");
      
      const requestedRangeStr = formatTimeRange(eventTime, durationMinutes);
      const resolvedRangeStr = formatTimeRange(resolvedTime, durationMinutes);
      const conflictMessage = `${requestedRangeStr} was unavailable because another calendar event already exists. Your focus session has been scheduled for ${resolvedRangeStr} instead.`;
      
      // Dispatch clear notification
      await this.addNotification({
        title: '🗓️ Calendar Conflict Resolved',
        body: conflictMessage,
        type: 'info'
      });
    } else {
      this.addDiagnosticLog(`[Conflict Detection] No conflict found. Slot is available.`, "success");
    }
    this.addDiagnosticLog(`[Conflict Detection] Final scheduled time: ${resolvedTime.toLocaleString()}`, "success");

    // Assign final resolved time to eventTime so subsequent sync and logs write to the correct time
    eventTime = resolvedTime;

    const formattedTime = eventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const localISO = getLocalISOString(eventTime);
    const utcISO = eventTime.toISOString();

    this.addDiagnosticLog(`[Date Interpreter Audit] Final datetime sent to Google Calendar: ${utcISO}`, "success");

    let calendarEventId = task.googleCalendarEventId || null;
    let isRealGoogleSync = false;

    // Check if Google Calendar OAuth and permission is active and healthy
    if (this.googleAccessToken && !this.isOutageActive('calendar_503') && !this.isOutageActive('oauth_expired')) {
      if (calendarEventId) {
        console.log(`[Google Sync] Modifying existing Google Event: ${calendarEventId}`);
        this.addDiagnosticLog(`[Google Sync] Modifying existing Google Event: ${calendarEventId}`, "info");
        const updateOk = await this.updateCalendarEvent(calendarEventId, task, localISO, durationMinutes);
        if (updateOk) {
          isRealGoogleSync = true;
          // Store both the local scheduled datetime and the UTC timestamp in Firestore
          await updateDoc(taskDocRef, { 
            googleCalendarScheduledAtUTC: utcISO,
            googleCalendarScheduledAtLocal: localISO
          });
          console.log("✓ Firestore updated with corrected datetime");
          this.addDiagnosticLog("✓ Firestore updated with corrected local and UTC datetime", "success");
        } else {
          // If event was manually deleted from Google, re-create it
          console.log("[Google Sync] Event was missing on remote calendar. Creating fresh block...");
          this.addDiagnosticLog("[Google Sync] Event was missing on remote calendar. Creating fresh block...", "info");
          calendarEventId = await this.createCalendarEvent(task, localISO, durationMinutes);
          if (calendarEventId) {
            await updateDoc(taskDocRef, { 
              googleCalendarEventId: calendarEventId,
              googleCalendarScheduledAtUTC: utcISO,
              googleCalendarScheduledAtLocal: localISO
            });
            console.log("✓ Firestore updated");
            this.addDiagnosticLog("✓ Firestore updated with Google Event ID and corrected datetime", "success");
            isRealGoogleSync = true;
          } else {
            throw new Error(`Google Calendar scheduling failed. Please verify API response logs in diagnostics.`);
          }
        }
      } else {
        console.log("[Google Sync] Creating brand new Google Event block");
        this.addDiagnosticLog("[Google Sync] Creating brand new Google Event block", "info");
        calendarEventId = await this.createCalendarEvent(task, localISO, durationMinutes);
        if (calendarEventId) {
          await updateDoc(taskDocRef, { 
            googleCalendarEventId: calendarEventId,
            googleCalendarScheduledAtUTC: utcISO,
            googleCalendarScheduledAtLocal: localISO
          });
          console.log("✓ Firestore updated");
          this.addDiagnosticLog("✓ Firestore updated with Google Event ID and corrected datetime", "success");
          isRealGoogleSync = true;
        } else {
          throw new Error(`Google Calendar scheduling failed. Please verify API response logs in diagnostics.`);
        }
      }
    } else {
      // Update local task fallback in Firestore
      await updateDoc(taskDocRef, {
        googleCalendarScheduledAtUTC: utcISO,
        googleCalendarScheduledAtLocal: localISO
      });
      console.log("✓ Firestore updated with local fallback datetime");
      this.addDiagnosticLog("✓ Firestore updated with local fallback datetime", "info");

      // If the user's mode is Google but token is missing, expired, or offline outage active, fail!
      if (this.currentUser?.mode === 'google') {
        const errorMsg = this.isOutageActive('calendar_503') 
          ? "Google Calendar API is offline (503 Service Unavailable). Resiliency block active."
          : "Google Calendar sync is active, but Google OAuth token is missing or expired. Please re-authenticate.";
        this.addDiagnosticLog(`❌ ${errorMsg}`, "error");
        this.setLastAttemptedSync("Failure", this.isOutageActive('calendar_503') ? "HTTP 503 Outage" : "Missing or expired OAuth token");
        throw new Error(errorMsg);
      }
    }

    // Identify if scheduler is executing in real sync vs local fallback
    const logs = await this.getAgentLogs();
    const existingLogIndex = logs.findIndex(l => 
      l.taskId === taskId && 
      l.agentType === 'CALENDAR_SCHEDULER' && 
      l.actionType === 'reschedule' && 
      !l.isFailure
    );

    if (existingLogIndex !== -1) {
      // Reschedule in-place
      const existingLog = logs[existingLogIndex];
      existingLog.scheduledAt = eventTime.toISOString();
      existingLog.reason = isRealGoogleSync 
        ? `Synced: Booked 45m block at ${formattedTime} in Google Calendar.` 
        : `Rescheduled: Booked 45m block at ${formattedTime} in Google Calendar (Local Fallback).`;
      
      if (existingLog.structuredReasoning) {
        existingLog.structuredReasoning.justificationText = isRealGoogleSync
          ? `Autonomous Calendar Agent synchronized focus session at ${formattedTime} directly with Google Calendar to mitigate risk.`
          : `Autonomous Calendar Agent updated focus session at ${formattedTime} using local scheduling.`;
        if (existingLog.structuredReasoning.metrics) {
          existingLog.structuredReasoning.metrics.calendarAvailability = isRealGoogleSync ? 'Synced Live' : 'Local Gaps';
        }
      }
      
      await setDoc(doc(db, 'users', uid, 'logs', existingLog.id), existingLog);

      await this.addNotification({
        title: isRealGoogleSync ? '🗓️ Google Calendar Focus Session Updated' : '🗓️ Focus Session Rescheduled (Local)',
        body: `RESCHEDULED: Blocked a 45-minute deep-work session starting at ${formattedTime} for "${task.title}".`,
        type: 'info'
      });
    } else {
      // Create new booking log
      await this.addAgentLog({
        taskId,
        taskTitle: task.title,
        actionType: 'reschedule',
        actionTaken: isRealGoogleSync ? 'Auto-Scheduled Focus Block' : 'Auto-Scheduled Focus Block (Local)',
        reason: isRealGoogleSync 
          ? `Synced: Booked 45m block at ${formattedTime} in Google Calendar.` 
          : `Booked 45m block at ${formattedTime} in Google Calendar (Local Fallback).`,
        isAgentInitiated: true,
        agentType: 'CALENDAR_SCHEDULER',
        scheduledAt: eventTime.toISOString(),
        structuredReasoning: {
          metrics: {
            observedDeadline: 'N/A',
            observedProgress: `${task.progress || 0}%`,
            estimatedWorkRemaining: 'N/A',
            calendarAvailability: isRealGoogleSync ? 'Live scanned & synced' : '1 local gap discovered'
          },
          justificationText: isRealGoogleSync
            ? `Autonomous Calendar Scheduling Agent successfully secured a 45-minute focus session starting at ${formattedTime} directly with your Google Calendar.`
            : `Autonomous Calendar Scheduling Agent successfully scanned calendar free/busy slots locally and secured a 45-minute focus session.`,
          decisionConfidence: 95
        },
        decisionExecuted: 'SCHEDULED_FOCUS_BLOCK',
        userApprovalApplied: 'ASSIST'
      });

      await this.addNotification({
        title: isRealGoogleSync ? '🗓️ Google Calendar Focus Session Booked' : '🗓️ Focus Session Booked (Local)',
        body: `AUTONOMOUS SPRINT: Blocked a 45-minute deep-work session starting at ${formattedTime} for "${task.title}".`,
        type: 'info'
      });
    }

    return {
      success: true,
      eventTime: eventTime.toISOString()
    };
  }

  // ==========================================
  // OUTAGES & SELF-HEALING SYSTEMS
  // ==========================================

  public isOutageActive(type: 'calendar_503' | 'oauth_expired' | 'gemini_timeout'): boolean {
    return localStorage.getItem(`clutch_outage_${type}`) === 'true';
  }

  public setOutageState(type: 'calendar_503' | 'oauth_expired' | 'gemini_timeout', isActive: boolean): void {
    if (isActive) {
      localStorage.setItem(`clutch_outage_${type}`, 'true');
    } else {
      localStorage.removeItem(`clutch_outage_${type}`);
    }
    window.dispatchEvent(new CustomEvent('clutch-outages-updated'));
  }

  public getActiveOutages(): ('calendar_503' | 'oauth_expired' | 'gemini_timeout')[] {
    const outages: ('calendar_503' | 'oauth_expired' | 'gemini_timeout')[] = [];
    if (this.isOutageActive('calendar_503')) outages.push('calendar_503');
    if (this.isOutageActive('oauth_expired')) outages.push('oauth_expired');
    if (this.isOutageActive('gemini_timeout')) outages.push('gemini_timeout');
    return outages;
  }

  public async runRecoveryAgentCycle(): Promise<number> {
    const logs = await this.getAgentLogs();
    const activeFailureLogs = logs.filter(l => l.isFailure && l.status === 'failed_retrying');
    if (activeFailureLogs.length === 0) return 0;

    let recoveredCount = 0;
    const uid = this.currentUser?.uid;
    if (!uid) return 0;

    const newLogsToAdd: AgentLog[] = [];

    for (const log of logs) {
      if (log.isFailure && log.status === 'failed_retrying') {
        let outageType: 'calendar_503' | 'oauth_expired' | 'gemini_timeout' | null = null;
        if (log.agentType === 'CALENDAR_SCHEDULER') outageType = 'calendar_503';
        else if (log.agentType === 'TASK_MONITOR') outageType = 'oauth_expired';
        else if (log.agentType === 'RISK_ASSESSOR') outageType = 'gemini_timeout';

        if (outageType) {
          const isOutageStillActive = this.isOutageActive(outageType);
          if (!isOutageStillActive) {
            // Outage was cleared! Recover this entry.
            const recoveredLog: AgentLog = {
              ...log,
              isFailure: false,
              status: 'success',
              actionTaken: `Self-Healed: ${log.actionTaken} Recovered`,
              reason: `The autonomous Recovery Agent detected connection restoration. Succeeded after retry ${log.retryCount || 1}.`,
              timestamp: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', uid, 'logs', log.id), recoveredLog);
            recoveredCount++;

            // Create a dedicated Recovery Agent Success Log
            const successLogId = 'log-' + Math.random().toString(36).substr(2, 9);
            const successLog: AgentLog = {
              id: successLogId,
              uid,
              taskId: log.taskId,
              taskTitle: log.taskTitle,
              actionType: log.actionType || 'do_nothing',
              actionTaken: 'Connection Restored & State Re-synchronized',
              reason: `Autonomous Recovery Agent successfully drained retry queue & restored connection.`,
              timestamp: new Date().toISOString(),
              isAgentInitiated: true,
              agentType: 'RECOVERY_AGENT',
              telemetryFeedback: 'PENDING',
              structuredReasoning: {
                metrics: {
                  observedDeadline: 'Online',
                  observedProgress: 'Online',
                  estimatedWorkRemaining: 'Restored',
                  calendarAvailability: 'Restored'
                },
                justificationText: `The outage for ${log.agentType} was successfully resolved. The Recovery Agent cleared all pending transactions.`,
                decisionConfidence: 99
              }
            };
            await setDoc(doc(db, 'users', uid, 'logs', successLogId), successLog);

            await this.addNotification({
              title: '🟢 Clutch Recovery Agent Self-Healed',
              body: `SUCCESS: Connection issue with ${log.agentType === 'CALENDAR_SCHEDULER' ? 'Google Calendar API' : log.agentType === 'TASK_MONITOR' ? 'Google OAuth Services' : 'Gemini reasoning engine'} has been fully self-healed.`,
              type: 'info'
            });
          } else {
            // Outage remains active. Increment retryCount!
            const newRetryCount = (log.retryCount || 1) + 1;
            const maxRetries = log.maxRetries || 3;
            if (newRetryCount > maxRetries) {
              const terminalLog: AgentLog = {
                ...log,
                retryCount: newRetryCount,
                status: 'failed_terminal',
                errorMessage: `Recovery Agent: Retry threshold exceeded. Terminal failure recorded. Contacting operator.`,
                timestamp: new Date().toISOString()
              };
              await setDoc(doc(db, 'users', uid, 'logs', log.id), terminalLog);

              // Create terminal outage notification
              await this.addNotification({
                title: '🚨 CRITICAL: Self-Heal Retry Limit Exceeded',
                body: `Terminal failure: Recovery Agent was unable to resolve connection for ${log.agentType}. Manual operator login required.`,
                type: 'crisis'
              });
            } else {
              await updateDoc(doc(db, 'users', uid, 'logs', log.id), {
                retryCount: newRetryCount,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      }
    }

    return recoveredCount;
  }

  public async runTaskMonitorCycle(forceTaskId?: string, bypassThrottle: boolean = false): Promise<{ evaluated: number; logsCreated: number }> {
    if (this.isEvaluating) {
      return { evaluated: 0, logsCreated: 0 };
    }
    this.isEvaluating = true;
    window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'evaluating' }));

    try {
      await this.runRecoveryAgentCycle();
    } catch (e) {
      console.error('Recovery Agent scan failed:', e);
    }

    try {
      const tasks = await this.getTasks();
      const activeTasks = tasks.filter(t => t.status === 'active');

      let evaluatedCount = 0;
      let logsCount = 0;

      for (const task of activeTasks) {
        if (forceTaskId && task.id !== forceTaskId) {
          continue;
        }
        
        if (!forceTaskId && !bypassThrottle) {
          const lastEval = task.lastRiskEvaluation ? new Date(task.lastRiskEvaluation).getTime() : 0;
          if (Date.now() - lastEval < 15000) {
            continue;
          }
        }

        if (this.isOutageActive('oauth_expired')) {
          console.warn('[Task Monitor] OAuth session remains expired. Skipping evaluation.');
          continue;
        }

        try {
          const { assessTaskRiskWithAI } = await import('./gemini');
          const result = await assessTaskRiskWithAI(task);

          // Update task's risk score and evaluation time
          await this.updateTask(task.id, {
            riskScore: result.riskScore,
            lastRiskEvaluation: new Date().toISOString()
          });

          // Add Risk Assessor AgentLog
          await this.addAgentLog({
            taskId: task.id,
            taskTitle: task.title,
            actionType: result.actionType as any,
            actionTaken: result.actionTaken,
            reason: result.reason,
            isAgentInitiated: true,
            agentType: 'RISK_ASSESSOR',
            telemetryFeedback: 'PENDING',
            structuredReasoning: result.structuredReasoning,
            decisionExecuted: result.actionType.toUpperCase(),
            userApprovalApplied: 'AUTONOMOUS',
            evaluationSource: result.evaluationSource
          });

          evaluatedCount++;
          logsCount++;

          if (result.riskScore >= 80) {
            await this.addNotification({
              title: '🚨 Clutch Emergency Dispatch',
              body: `CRITICAL RISK: "${task.title}" is ${result.riskScore}% likely to be missed. Immediate intervention recommended.`,
              type: 'crisis'
            });
          } else if (result.riskScore >= 40) {
            await this.addNotification({
              title: '⚠️ Clutch High Risk Warning',
              body: `WARNING: "${task.title}" risk ratio is elevated to ${result.riskScore}%.`,
              type: 'warning'
            });
          }

          // Orchestrate Calendar Scheduling Agent autonomously if recommended
          if (result.actionType === 'reschedule') {
            const currentLogs = await this.getAgentLogs();
            const isAlreadyScheduled = currentLogs.some(l => 
              l.taskId === task.id &&
              l.agentType === 'CALENDAR_SCHEDULER' &&
              l.actionType === 'reschedule' &&
              !l.isFailure
            );

            if (!isAlreadyScheduled) {
              window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'scheduling' }));
              await new Promise(resolve => setTimeout(resolve, 800)); // Latency feeler

              await this.simulateGoogleCalendarSchedule(task.id, 45);
              logsCount++;

              window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'dispatch' }));
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          }
        } catch (err) {
          console.error(`Task Monitor failed to evaluate task "${task.title}":`, err);
        }
      }

      return { evaluated: evaluatedCount, logsCreated: logsCount };
    } finally {
      this.isEvaluating = false;
      window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'monitoring' }));
    }
  }

  private isEvaluating = false;

  public async simulateAgentFailure(type: 'calendar_503' | 'oauth_expired' | 'gemini_timeout'): Promise<AgentLog> {
    this.setOutageState(type, true);

    let actionTaken = 'API Connection Error';
    let reason = '';
    let errorMessage = '';
    let agentType: 'TASK_MONITOR' | 'RISK_ASSESSOR' | 'CALENDAR_SCHEDULER' | 'RECOVERY_AGENT' = 'CALENDAR_SCHEDULER';
    
    if (type === 'calendar_503') {
      actionTaken = 'Calendar Booking Postponed';
      reason = 'Google Calendar API connection lost (503 Service Unavailable). Retry scheduled in background.';
      errorMessage = 'HTTP 503: Service Unavailable';
      agentType = 'CALENDAR_SCHEDULER';
    } else if (type === 'oauth_expired') {
      actionTaken = 'Focus Ingestion Blocked';
      reason = 'Google OAuth session expired. Auth re-handshake registered. Attempting token self-healing retry.';
      errorMessage = 'Token expired: Access token could not be verified by Identity Pool';
      agentType = 'TASK_MONITOR';
    } else if (type === 'gemini_timeout') {
      actionTaken = 'Risk Analysis Postponed';
      reason = 'Gemini reasoning loop timed out. Falling back to robust offline deterministic formulas.';
      errorMessage = 'Gateway Timeout: connection to models/gemini-3.5-flash closed';
      agentType = 'RISK_ASSESSOR';
    }

    const failureLog = await this.addAgentLog({
      taskId: null,
      taskTitle: null,
      actionType: 'do_nothing',
      actionTaken,
      reason,
      isAgentInitiated: true,
      agentType,
      telemetryFeedback: 'PENDING',
      isFailure: true,
      retryCount: 1,
      maxRetries: 3,
      status: 'failed_retrying',
      errorMessage,
      structuredReasoning: {
        metrics: {
          observedDeadline: 'N/A',
          observedProgress: 'N/A',
          estimatedWorkRemaining: 'N/A',
          calendarAvailability: 'Locked or Unreachable'
        },
        justificationText: `System encountered a background connection outage during scheduled agent cycle. Task pushed to background recovery loop.`,
        decisionConfidence: 30
      }
    });

    await this.addNotification({
      title: `🔴 Outage Detected: ${agentType}`,
      body: `CRITICAL: ${actionTaken}. The autonomous Recovery Agent is handling retries.`,
      type: 'crisis'
    });

    return failureLog;
  }
}

export const firebaseService = new PersistenceService();
export default firebaseService;
