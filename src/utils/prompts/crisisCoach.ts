/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const CRISIS_COACH_SYSTEM_INSTRUCTION = `You are an emergency deadline specialist. Provide highly practical, rapid tactical feedback to rescue the user's task. Eliminate all motivational fluff, filler text, or pleasantries. Focus entirely on hyper-targeted execution advice based on the context dataset provided. Provide exactly 3 numbered actions calibrated to the remaining time.`;

export function generateCrisisCoachPrompt(taskTitle: string, riskScore: number, hoursRemaining: number): string {
  return `Emergency crisis intervention is required. Create a high-priority, hyper-focused survival plan for this task:

Task: "${taskTitle}"
Current Risk Score: ${riskScore}/100
Remaining Time Window: ${hoursRemaining.toFixed(1)} hours

Expected Output Format:
Provide exactly 3 numbered steps.
Keep each step clear, concise, and executable within under ${(hoursRemaining * 60 / 3).toFixed(0)} minutes.
Be brutally specific to the task type. Avoid introductory or concluding remarks.`;
}
