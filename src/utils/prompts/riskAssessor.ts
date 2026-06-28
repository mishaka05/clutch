/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const Type = {
  OBJECT: 'OBJECT' as const,
  INTEGER: 'INTEGER' as const,
  STRING: 'STRING' as const,
};

export const RISK_ASSESSOR_SYSTEM_INSTRUCTION = `You are a professional, high-agency autonomous AI Risk Assessor Agent for Clutch.
Your objective is to evaluate a user's task state (title, deadline, complexity, priority, estimated duration, progress, subtasks) and determine the dynamic, real-time risk of deadline failure or failure to complete.

You must perform a deep project-management reasoning analysis and return a strict, single JSON object containing:
1. riskScore (integer 0 to 100): Calculated based on time remaining, complexity, duration, and progress.
2. actionType ('escalate_risk' | 'trigger_crisis' | 'reschedule' | 'send_alert' | 'do_nothing'):
   - 'trigger_crisis' if riskScore is >= 80 and the deadline is under 2 hours.
   - 'escalate_risk' if riskScore is >= 70 but not a crisis.
   - 'reschedule' if progress is lagging significantly relative to time elapsed.
   - 'send_alert' if risk is moderate but needs immediate attention.
   - 'do_nothing' if the task progress is secure, stable, or completed.
3. actionTaken (string): A short, elegant description of your action (e.g., "Risk evaluated at 45%").
4. reason (string): A highly concise summary of why this decision was made (MAX 15 words).
5. structuredReasoning (object):
   - metrics (object):
     - observedDeadline (string): e.g., "1.5 hours remaining" or "due in 2 days"
     - observedProgress (string): e.g., "20% completed"
     - estimatedWorkRemaining (string): e.g., "150 mins workload remaining"
     - calendarAvailability (string): e.g., "limited free slots" or "abundant time"
   - justificationText (string): An elegant, professional explanation of your project management reasoning.
   - decisionConfidence (integer 0 to 100): Your confidence in this assessment.

Be objective, and avoid "AI fluff". Output only valid JSON.`;

export function generateRiskAssessorPrompt(task: any, nowIso: string): string {
  const msRemaining = new Date(task.deadline).getTime() - new Date(nowIso).getTime();
  const hoursRemaining = msRemaining / (1000 * 60 * 60);

  return `Perform a risk assessment for the following task.
Current time: ${nowIso}
Hours remaining: ${hoursRemaining.toFixed(2)} hours

Task properties:
- Title: "${task.title}"
- Deadline: "${task.deadline}"
- Complexity: "${task.complexity}"
- Priority: "${task.priority}"
- Estimated Duration: ${task.estimatedDuration} minutes
- Current Progress: ${task.progress}%
- Subtasks checklist:
${(task.subtasks || []).map((s: any) => `  * [${s.completed ? 'x' : ' '}] ${s.title} (${s.durationMinutes} mins)`).join('\n')}

Generate the required JSON output matching the requested schema.`;
}

export const riskAssessorResponseSchema = {
  type: Type.OBJECT,
  properties: {
    riskScore: { type: Type.INTEGER, description: 'Risk score from 0 to 100' },
    actionType: { 
      type: Type.STRING, 
      enum: ['escalate_risk', 'trigger_crisis', 'reschedule', 'send_alert', 'do_nothing'],
      description: 'The recommended autonomous agent action' 
    },
    actionTaken: { type: Type.STRING, description: 'Short description of the evaluation outcome' },
    reason: { type: Type.STRING, description: 'Concise reason (MAX 15 words)' },
    structuredReasoning: {
      type: Type.OBJECT,
      properties: {
        metrics: {
          type: Type.OBJECT,
          properties: {
            observedDeadline: { type: Type.STRING },
            observedProgress: { type: Type.STRING },
            estimatedWorkRemaining: { type: Type.STRING },
            calendarAvailability: { type: Type.STRING }
          },
          required: ['observedDeadline', 'observedProgress', 'estimatedWorkRemaining', 'calendarAvailability']
        },
        justificationText: { type: Type.STRING },
        decisionConfidence: { type: Type.INTEGER }
      },
      required: ['metrics', 'justificationText', 'decisionConfidence']
    }
  },
  required: ['riskScore', 'actionType', 'actionTaken', 'reason', 'structuredReasoning']
};
