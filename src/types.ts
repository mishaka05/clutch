/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TaskComplexity = 'low' | 'medium' | 'high';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskCategory = 'academic' | 'work' | 'personal' | 'finance';
export type TaskStatus = 'active' | 'completed' | 'dismissed';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  durationMinutes: number;
  sequenceNumber: number;
}

export interface Task {
  id: string;
  uid: string;
  title: string;
  deadline: string; // ISO-8601 string
  complexity: TaskComplexity;
  priority: TaskPriority;
  estimatedDuration: number; // in minutes
  category: TaskCategory;
  progress: number; // 0 to 100
  riskScore: number; // 0 to 100
  status: TaskStatus;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  
  // Future-proof and expanded fields
  completedSteps: number;
  totalSteps: number;
  aiGenerated: boolean;
  lastRiskEvaluation: string | null; // ISO-8601
  lastAIInteraction: string | null; // ISO-8601
  subtasks: SubTask[];
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string | null;
  avatarId: string; // 'purple' | 'cyan' | 'amber' | 'green'
  mode: 'demo' | 'google';
  createdAt: string;
}

export type AgentActionType = 'escalate_risk' | 'trigger_crisis' | 'reschedule' | 'send_alert' | 'do_nothing' | 'create_task';

export interface AgentLog {
  id: string;
  uid?: string; // Phase 2 user id tracking
  taskId: string | null;
  taskTitle: string | null;
  actionType: AgentActionType;
  actionTaken: string;
  reason: string; // Max 15 words
  timestamp: string; // ISO-8601
  isAgentInitiated: boolean; // Purple vs Cyan indicator

  // Phase 2 Milestone 1 Expanded Fields:
  agentType?: 'TASK_MONITOR' | 'RISK_ASSESSOR' | 'CALENDAR_SCHEDULER' | 'RECOVERY_AGENT';
  telemetryFeedback?: 'PENDING' | 'USER_ACCEPTED' | 'USER_IGNORED' | 'USER_DELETED';
  structuredReasoning?: {
    metrics?: {
      observedDeadline?: string;
      observedProgress?: string;
      estimatedWorkRemaining?: string;
      calendarAvailability?: string;
      [key: string]: any;
    };
    justificationText?: string;
    decisionConfidence?: number; // e.g. 94 or 0.94
  };
  decisionExecuted?: string;
  userApprovalApplied?: 'AUTONOMOUS' | 'ASSIST' | 'BALANCED';

  // Failure Recovery / Resiliency tracking:
  isFailure?: boolean;
  retryCount?: number;
  maxRetries?: number;
  status?: 'success' | 'failed_retrying' | 'failed_terminal';
  errorMessage?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string; // ISO-8601
  isRead: boolean;
  taskId?: string;
  type: 'info' | 'warning' | 'crisis' | 'success';
}
