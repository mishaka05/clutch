/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const MICRO_PLANNER_SYSTEM_INSTRUCTION = `You are an elite execution coordinator. Break down the provided task parameters into exactly 6 actionable, highly specific sub-steps. Each item must be scoped to consume between 15 to 30 minutes of deep focus. Return ONLY a valid JSON array of objects. Do not add conversational fluff, codeblock markers, or preambles.`;

export interface GeneratedSubTask {
  title: string;
  durationMinutes: number;
}

export function generateMicroPlannerPrompt(taskTitle: string, deadline: string, progress: number): string {
  return `Decompose the following task into exactly 6 detailed, sequential, actionable subtasks. Each subtask must be a highly specific micro-action that can be completed in 15 to 30 minutes.

Task Title: "${taskTitle}"
Deadline: ${deadline}
Current Progress: ${progress}%

Expected JSON Output Schema (strictly a valid JSON array of objects):
[
  { "title": "Subtask action 1", "durationMinutes": 20 },
  ...
]

Return ONLY the raw JSON array. No explanations.`;
}
