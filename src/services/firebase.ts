/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task, UserProfile, AgentLog, AppNotification, SubTask } from '../types';
import { calculateTaskRisk } from '../utils/riskEngine';

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
// CORE PERSISTENCE LAYER ADAPTERS
// ==========================================

class PersistenceService {
  private currentUser: UserProfile | null = null;
  private onUserListeners: ((user: UserProfile | null) => void)[] = [];

  constructor() {
    // Try to load cached user session
    const savedUser = localStorage.getItem('clutch_session');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch {
        this.currentUser = null;
      }
    }
  }

  // Auth Methods
  public onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    this.onUserListeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.onUserListeners = this.onUserListeners.filter(cb => cb !== callback);
    };
  }

  private notifyAuthListeners() {
    this.onUserListeners.forEach(cb => cb(this.currentUser));
  }

  public async signInWithGoogle(): Promise<UserProfile> {
    // Real auth fallback. In client SPA MVP, we simulate auth using prompt name.
    return this.signInAsDemo('Guest Operator', 'purple');
  }

  public async signInAsDemo(name: string, avatarId: string): Promise<UserProfile> {
    const profile: UserProfile = {
      uid: 'demo-user-123',
      name: name.trim() || 'Void Walker',
      email: 'hbee8559@gmail.com',
      avatarId,
      mode: 'demo',
      createdAt: new Date().toISOString(),
    };
    
    this.currentUser = profile;
    localStorage.setItem('clutch_session', JSON.stringify(profile));
    
    // Seed initial demo data if empty
    if (!localStorage.getItem('clutch_tasks')) {
      const tasks = getSeededDemoTasks(profile.uid);
      localStorage.setItem('clutch_tasks', JSON.stringify(tasks));
    }
    if (!localStorage.getItem('clutch_logs')) {
      const logs = getSeededDemoLogs();
      localStorage.setItem('clutch_logs', JSON.stringify(logs));
    }
    
    this.notifyAuthListeners();
    return profile;
  }

  public async logout(): Promise<void> {
    this.currentUser = null;
    localStorage.removeItem('clutch_session');
    // Clear demo tasks/logs on logout so they reseed fresh next time
    localStorage.removeItem('clutch_tasks');
    localStorage.removeItem('clutch_logs');
    this.notifyAuthListeners();
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public updateUserProfile(name: string, avatarId: string) {
    if (this.currentUser) {
      this.currentUser.name = name;
      this.currentUser.avatarId = avatarId;
      localStorage.setItem('clutch_session', JSON.stringify(this.currentUser));
      this.notifyAuthListeners();
    }
  }

  // Tasks Firestore Mimic CRUD
  public async getTasks(): Promise<Task[]> {
    const tasksRaw = localStorage.getItem('clutch_tasks');
    if (!tasksRaw) return [];
    try {
      const tasks: Task[] = JSON.parse(tasksRaw);
      
      // Dynamic recalculation of risk scores so deadlines stay relative
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
          lastRiskEvaluation: new Date().toISOString(),
        };
      });
      
      this.saveTasksInternal(updatedTasks);
      return updatedTasks;
    } catch {
      return [];
    }
  }

  public async addTask(task: Omit<Task, 'id' | 'uid' | 'createdAt' | 'updatedAt' | 'riskScore' | 'lastRiskEvaluation' | 'lastAIInteraction'>): Promise<Task> {
    const uid = this.currentUser?.uid || 'guest';
    const riskResult = calculateTaskRisk({
      deadline: task.deadline,
      progress: task.progress,
      complexity: task.complexity,
      estimatedDuration: task.estimatedDuration,
    });

    const newTask: Task = {
      ...task,
      id: 'task-' + Math.random().toString(36).substr(2, 9),
      uid,
      riskScore: riskResult.riskScore,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRiskEvaluation: new Date().toISOString(),
      lastAIInteraction: null,
    };

    const tasks = await this.getTasks();
    tasks.push(newTask);
    this.saveTasksInternal(tasks);

    // Log the action
    await this.addAgentLog({
      taskId: newTask.id,
      taskTitle: newTask.title,
      actionType: 'create_task',
      actionTaken: 'Task Initialized',
      reason: `Task successfully parsed and set up with ${riskResult.riskScore}% risk ratio.`,
      isAgentInitiated: false,
    });

    return newTask;
  }

  public async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const tasks = await this.getTasks();
    const taskIndex = tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    const currentTask = tasks[taskIndex];
    const mergedTask = {
      ...currentTask,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Recalculate risk on major state changes (progress, deadline, complexity, duration)
    const riskResult = calculateTaskRisk({
      deadline: mergedTask.deadline,
      progress: mergedTask.progress,
      complexity: mergedTask.complexity,
      estimatedDuration: mergedTask.estimatedDuration,
    });
    mergedTask.riskScore = riskResult.riskScore;
    mergedTask.lastRiskEvaluation = new Date().toISOString();

    tasks[taskIndex] = mergedTask;
    this.saveTasksInternal(tasks);
    return mergedTask;
  }

  public async deleteTask(id: string): Promise<void> {
    const tasks = await this.getTasks();
    const filtered = tasks.filter((t) => t.id !== id);
    this.saveTasksInternal(filtered);
  }

  private saveTasksInternal(tasks: Task[]) {
    localStorage.setItem('clutch_tasks', JSON.stringify(tasks));
  }

  // Agent Activity Logs CRUD
  public async getAgentLogs(): Promise<AgentLog[]> {
    const logsRaw = localStorage.getItem('clutch_logs');
    if (!logsRaw) return [];
    try {
      return JSON.parse(logsRaw);
    } catch {
      return [];
    }
  }

  public async addAgentLog(log: Omit<AgentLog, 'id' | 'timestamp'>): Promise<AgentLog> {
    const newLog: AgentLog = {
      ...log,
      id: 'log-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
    };
    const logs = await this.getAgentLogs();
    // Prepend to show most recent logs first
    logs.unshift(newLog);
    // Keep a max log count of 30 items for clean client storage
    const trimmedLogs = logs.slice(0, 30);
    localStorage.setItem('clutch_logs', JSON.stringify(trimmedLogs));
    return newLog;
  }

  // FCM Simulator and Google Calendar Simulator methods
  public async simulateGoogleCalendarSchedule(taskId: string, durationMinutes: number): Promise<{ success: boolean; eventTime: string }> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');

    const eventTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    eventTime.setMinutes(0, 0, 0);

    const formattedTime = eventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add Agent Log
    await this.addAgentLog({
      taskId,
      taskTitle: task.title,
      actionType: 'reschedule',
      actionTaken: `Scheduled Workspace Focus slot`,
      reason: `Booked 45m block at ${formattedTime} in Google Calendar. Free interval found.`,
      isAgentInitiated: true,
    });

    return {
      success: true,
      eventTime: eventTime.toISOString()
    };
  }

  public async simulateFCMNotification(taskTitle: string, riskScore: number, remainingText: string): Promise<AppNotification> {
    const newNotification: AppNotification = {
      id: 'notif-' + Math.random().toString(36).substr(2, 9),
      title: '⚠️ Clutch Emergency Dispatch',
      body: `"${taskTitle}" is ${riskScore}% likely to be missed. ${remainingText} remaining. Tap to activate survival mode.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      type: 'crisis'
    };
    return newNotification;
  }

  public async updateAgentLogTelemetry(logId: string, feedback: 'USER_ACCEPTED' | 'USER_IGNORED' | 'USER_DELETED'): Promise<AgentLog> {
    const logs = await this.getAgentLogs();
    const logIndex = logs.findIndex(l => l.id === logId);
    if (logIndex === -1) throw new Error('Agent log not found');
    
    logs[logIndex] = {
      ...logs[logIndex],
      telemetryFeedback: feedback
    };
    localStorage.setItem('clutch_logs', JSON.stringify(logs));
    return logs[logIndex];
  }

  private isEvaluating = false;

  public async runTaskMonitorCycle(forceTaskId?: string): Promise<{ evaluated: number; logsCreated: number }> {
    if (this.isEvaluating) {
      return { evaluated: 0, logsCreated: 0 };
    }
    this.isEvaluating = true;
    window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'evaluating' }));

    try {
      const tasks = await this.getTasks();
      const activeTasks = tasks.filter(t => t.status === 'active');
      let evaluatedCount = 0;
      let logsCount = 0;

      for (const task of activeTasks) {
        if (forceTaskId && task.id !== forceTaskId) {
          continue;
        }
        
        if (!forceTaskId) {
          const lastEval = task.lastRiskEvaluation ? new Date(task.lastRiskEvaluation).getTime() : 0;
          if (Date.now() - lastEval < 30000) {
            continue;
          }
        }

        try {
          const { assessTaskRiskWithAI } = await import('./gemini');
          const result = await assessTaskRiskWithAI(task);

          // Update task's risk score and evaluation time
          const tasksList = await this.getTasks();
          const tIdx = tasksList.findIndex(t => t.id === task.id);
          if (tIdx !== -1) {
            tasksList[tIdx] = {
              ...tasksList[tIdx],
              riskScore: result.riskScore,
              lastRiskEvaluation: new Date().toISOString()
            };
            this.saveTasksInternal(tasksList);
          }

          // Add AgentLog
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
            userApprovalApplied: 'AUTONOMOUS'
          });

          evaluatedCount++;
          logsCount++;
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

  public async simulateAgentFailure(type: 'calendar_503' | 'oauth_expired' | 'gemini_timeout'): Promise<AgentLog> {
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
      reason = 'Gemini 2.0 reasoning loop timed out. Falling back to robust offline deterministic safe formulas.';
      errorMessage = 'Gateway Timeout: connection to models/gemini-2.0-flash closed';
      agentType = 'RISK_ASSESSOR';
    }

    const failureLog: AgentLog = {
      id: 'log-err-' + Math.random().toString(36).substr(2, 9),
      uid: 'demo-user-123',
      taskId: null,
      taskTitle: null,
      actionType: 'do_nothing',
      actionTaken,
      reason,
      timestamp: new Date().toISOString(),
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
        justificationText: `System encountered a background error during scheduled agent cycle. Task pushed to recovery loop.`,
        decisionConfidence: 30
      }
    };

    const logs = await this.getAgentLogs();
    logs.unshift(failureLog);
    localStorage.setItem('clutch_logs', JSON.stringify(logs.slice(0, 30)));
    return failureLog;
  }
}

export const firebaseService = new PersistenceService();
export default firebaseService;
