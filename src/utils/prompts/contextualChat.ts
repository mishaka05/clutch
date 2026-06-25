/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task } from '../../types';

export const CONTEXTUAL_CHAT_SYSTEM_INSTRUCTION = `You are CLUTCH's contextual task optimization engine, an aggressive, pragmatic deadline-rescue assistant. Your job is to help the user execute, debug, and optimize their active task. Answer user queries, draft solutions, explain technical concepts, or offer calendar rescheduling options based on their task context. Keep responses highly operational, brief, and supportive. Do not use generic filler.`;

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export function generateContextualChatPrompt(
  task: Task,
  hoursRemaining: number,
  chatHistory: ChatMessage[],
  latestInput: string
): string {
  const historyText = chatHistory
    .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
    .join('\n');

  return `Current Task Context:
- Title: "${task.title}"
- Category: ${task.category}
- Complexity: ${task.complexity}
- Current Progress: ${task.progress}%
- Risk Score: ${task.riskScore}/100
- Remaining Time Window: ${hoursRemaining.toFixed(1)} hours
- Completed Steps: ${task.completedSteps} of ${task.totalSteps}

Conversation History:
${historyText || '(No previous messages)'}

User Request: "${latestInput}"

Instructions: Give an extremely context-aware, direct, and practical reply. If appropriate, suggest a quick action or offer to reorganize their remaining subtasks.`;
}
export function generateAgentDecisionPrompt(tasksJson: string, calendarJson: string, isoTimestamp: string): string {
  return `You are the Clutch background agent. You monitor task states and autonomously decide what action to take. 
Current time: ${isoTimestamp}. 
Task list: ${tasksJson}. 
Calendar availability for next 8hrs: ${calendarJson}. 

Analyze all tasks and return a JSON array of actions. Each action must have: task_id, action_type (one of: escalate_risk / trigger_crisis / reschedule / send_alert / do_nothing), new_risk_score (if escalating), reason (max 15 words). Return ONLY valid JSON. No explanation.`;
}
