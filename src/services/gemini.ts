/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { SubTask, TaskCategory, TaskComplexity, TaskPriority } from '../types';
import { TASK_PARSER_SYSTEM_INSTRUCTION, generateTaskParserPrompt } from '../utils/prompts/taskParser';
import { MICRO_PLANNER_SYSTEM_INSTRUCTION, generateMicroPlannerPrompt } from '../utils/prompts/microPlanner';
import { CRISIS_COACH_SYSTEM_INSTRUCTION, generateCrisisCoachPrompt } from '../utils/prompts/crisisCoach';
import { CONTEXTUAL_CHAT_SYSTEM_INSTRUCTION, generateContextualChatPrompt, ChatMessage } from '../utils/prompts/contextualChat';

export type { ChatMessage };

// Centrally configurable Gemini Model setting
export const GEMINI_MODEL = 'gemini-2.0-flash';

// Helper to check if API key exists
export function getApiKey(): string | null {
  return (import.meta as any).env.VITE_GEMINI_API_KEY || null;
}

// Lazy initialization of Gemini client
let genAIInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
}

/**
 * Task Parsing Agent Interface
 */
export async function parseTaskWithAI(userInput: string): Promise<{
  title: string;
  deadline: string;
  complexity: TaskComplexity;
  priority: TaskPriority;
  estimatedDuration: number;
  category: TaskCategory;
  progress: number;
  simulated?: boolean;
  model?: string;
  error?: string;
}> {
  try {
    const response = await fetch('/api/gemini/parse-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userInput }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      title: data.title || userInput,
      deadline: data.deadline || new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      complexity: (data.complexity as TaskComplexity) || 'medium',
      priority: (data.priority as TaskPriority) || 'medium',
      estimatedDuration: data.estimatedDuration || 120,
      category: (data.category as TaskCategory) || 'work',
      progress: data.progress ?? 0,
      simulated: data.simulated,
      model: data.model,
      error: data.error,
    };
  } catch (error: any) {
    console.warn('Backend parsing call failed, falling back to local simulation:', error);
    const sim = simulateTaskParser(userInput);
    return {
      ...sim,
      simulated: true,
      error: error?.message || 'Network error',
    };
  }
}

/**
 * Execution Planning Agent (Micro-Step Subtasks)
 */
export async function generateSubTasksWithAI(
  title: string,
  deadline: string,
  progress: number
): Promise<{ title: string; durationMinutes: number }[]> {
  const apiKey = getApiKey();
  const client = getGeminiClient();

  if (!apiKey || !client) {
    console.warn('Gemini API key missing. Running Execution Planning Agent in simulation.');
    return simulateSubTaskPlanner(title);
  }

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: generateMicroPlannerPrompt(title, deadline, progress),
      config: {
        systemInstruction: MICRO_PLANNER_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      }
    });

    const text = response.text?.trim() || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Gemini Subtask Generation failed, falling back to simulation:', error);
    return simulateSubTaskPlanner(title);
  }
}

/**
 * Decision Support Agent (Crisis Survival Planner)
 */
export async function generateCrisisPlanWithAI(
  title: string,
  riskScore: number,
  hoursRemaining: number
): Promise<string[]> {
  const apiKey = getApiKey();
  const client = getGeminiClient();

  if (!apiKey || !client) {
    console.warn('Gemini API key missing. Running Decision Support Agent in simulation.');
    return simulateCrisisPlan(title, hoursRemaining);
  }

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: generateCrisisCoachPrompt(title, riskScore, hoursRemaining),
      config: {
        systemInstruction: CRISIS_COACH_SYSTEM_INSTRUCTION,
      }
    });

    const text = response.text || '';
    // Parse numbered list
    const steps = text
      .split(/\n+/)
      .map((line) => line.replace(/^\d+[\.\-\)]\s*/, '').trim())
      .filter((line) => line.length > 0)
      .slice(0, 3);

    if (steps.length === 3) {
      return steps;
    }
    return simulateCrisisPlan(title, hoursRemaining);
  } catch (error) {
    console.error('Gemini Crisis Plan Generation failed, falling back to simulation:', error);
    return simulateCrisisPlan(title, hoursRemaining);
  }
}

/**
 * Contextual Chat response helper
 */
export async function generateChatResponseWithAI(
  task: any,
  hoursRemaining: number,
  history: ChatMessage[],
  latestInput: string
): Promise<string> {
  const apiKey = getApiKey();
  const client = getGeminiClient();

  if (!apiKey || !client) {
    console.warn('Gemini API key missing. Running Chat Response in simulation.');
    return simulateChatResponse(task.title, latestInput);
  }

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: generateContextualChatPrompt(task, hoursRemaining, history, latestInput),
      config: {
        systemInstruction: CONTEXTUAL_CHAT_SYSTEM_INSTRUCTION,
      }
    });

    return response.text || 'I am focused on analyzing your deadline emergency, please try again.';
  } catch (error) {
    console.error('Gemini Chat failed, falling back to simulation:', error);
    return simulateChatResponse(task.title, latestInput);
  }
}

// ==========================================
// HIGH-FIDELITY SIMULATION MOCK ENGINE
// ==========================================

function simulateTaskParser(userInput: string) {
  const lower = userInput.toLowerCase();
  
  let title = userInput;
  let deadline = new Date(Date.now() + 4 * 3600 * 1000).toISOString(); // Default 4 hours
  let complexity: TaskComplexity = 'medium';
  let priority: TaskPriority = 'medium';
  let category: TaskCategory = 'work';
  let progress = 0;
  let estimatedDuration = 120;

  // 1. Parse progress first
  const progressMatch = lower.match(/(?:already finished|finished|done|completed|progress:?|at)\s*(\d+)%/i) || 
                        lower.match(/(\d+)%\s*(?:complete|finished|done|completed|progress)/i) || 
                        lower.match(/(\d+)%/);
  if (progressMatch) {
    progress = parseInt(progressMatch[1], 10);
  }

  // 2. Parse duration
  // Look for "6 hours", "Around 6 hours", "1.5 hours", "1h 45m"
  const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*hours?/i) || lower.match(/(\d+(?:\.\d+)?)\s*hrs?/i);
  if (hourMatch) {
    estimatedDuration = Math.round(parseFloat(hourMatch[1]) * 60);
  } else {
    const minMatch = lower.match(/(\d+)\s*(?:minutes|mins|m)\b/i);
    if (minMatch) {
      estimatedDuration = parseInt(minMatch[1], 10);
    }
  }

  // Look for complex formats like "1h 45m"
  const hAndMMatch = lower.match(/(\d+)h\s*(\d+)m/i);
  if (hAndMMatch) {
    estimatedDuration = parseInt(hAndMMatch[1], 10) * 60 + parseInt(hAndMMatch[2], 10);
  }

  // 3. Category & complexity inference
  if (lower.includes('iitm') || lower.includes('mad') || lower.includes('dbms') || lower.includes('assignment') || lower.includes('homework') || lower.includes('exam') || lower.includes('study') || lower.includes('structures') || lower.includes('revise')) {
    category = 'academic';
    complexity = 'high';
    priority = 'high';
  } else if (lower.includes('report') || lower.includes('ml') || lower.includes('project') || lower.includes('presentation') || lower.includes('work')) {
    category = 'work';
    complexity = 'high';
    priority = 'high';
  } else if (lower.includes('bill') || lower.includes('tax') || lower.includes('payment') || lower.includes('finance')) {
    category = 'finance';
    complexity = 'high';
    priority = 'high';
  } else if (lower.includes('personal') || lower.includes('buy') || lower.includes('call') || lower.includes('gym')) {
    category = 'personal';
    complexity = 'low';
    priority = 'low';
  }

  // 4. Resolve relative time/deadline
  if (lower.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (lower.includes('8 pm') || lower.includes('8pm')) {
      tomorrow.setHours(20, 0, 0, 0);
    } else {
      tomorrow.setHours(12, 0, 0, 0);
    }
    deadline = tomorrow.toISOString();
  } else if (lower.includes('tonight')) {
    const tonight = new Date();
    tonight.setHours(23, 0, 0, 0);
    deadline = tonight.toISOString();
  } else if (lower.includes('sunday')) {
    // Upcoming Sunday
    const d = new Date();
    const day = d.getDay();
    const daysToAdd = (7 - day) % 7 || 7; // if today is Sunday, move to next Sunday
    d.setDate(d.getDate() + daysToAdd);
    if (lower.includes('evening')) {
      d.setHours(18, 0, 0, 0);
    } else {
      d.setHours(12, 0, 0, 0);
    }
    deadline = d.toISOString();
  } else if (lower.includes('in 2 days')) {
    const twoDays = new Date();
    twoDays.setDate(twoDays.getDate() + 2);
    deadline = twoDays.toISOString();
  } else if (lower.includes('in 1h 45m') || lower.includes('1h 45m')) {
    deadline = new Date(Date.now() + (1 * 60 + 45) * 60 * 1000).toISOString();
  }

  // 5. Clean Title extraction
  // Let's strip out action words and scheduling/progress/duration annotations
  let cleanTitle = userInput;
  // Remove action prefixes
  cleanTitle = cleanTitle.replace(/^(complete|finish|create|do|draft|write|assemble|review)\s+/gi, '');
  
  // Remove phrases starting with "before", "by", "due on", "around", "at", "already finished", etc.
  cleanTitle = cleanTitle.replace(/\s*(?:before|by|due|around|at|already|finished|completed|progress|complete|duration|estimated|complexity|priority)\s+.*$/gi, '');
  // Also strip common trailing characters
  cleanTitle = cleanTitle.replace(/[.,;!]+$/, '').trim();

  // Capitalize nicely
  if (cleanTitle) {
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    title = cleanTitle;
  }

  return { title, deadline, complexity, priority, estimatedDuration, category, progress };
}

function simulateSubTaskPlanner(title: string): { title: string; durationMinutes: number }[] {
  const genericSteps = [
    { title: 'Deconstruct scope and document structural checklist items', durationMinutes: 20 },
    { title: 'Configure environment, modules, and boilerplate utilities', durationMinutes: 15 },
    { title: 'Draft core functional implementation algorithms', durationMinutes: 30 },
    { title: 'Conduct unit inspection, state debugging, and error checking', durationMinutes: 20 },
    { title: 'Assemble UI elements, styling variables, and layout integration', durationMinutes: 25 },
    { title: 'Perform user journey execution audit and final deployment checks', durationMinutes: 15 },
  ];

  if (title.toLowerCase().includes('dbms') || title.toLowerCase().includes('assignment')) {
    return [
      { title: 'Review DBMS assignment brief & identify primary entity relations', durationMinutes: 20 },
      { title: 'Construct Normalized SQL tables & establish schema relationships', durationMinutes: 30 },
      { title: 'Draft complex queries using JOINs and index optimizations', durationMinutes: 25 },
      { title: 'Write transaction isolation checks and safety test cases', durationMinutes: 20 },
      { title: 'Design the final presentation data reports and visual charts', durationMinutes: 30 },
      { title: 'Proofread queries, format schema, and submit file archive', durationMinutes: 15 },
    ];
  }

  if (title.toLowerCase().includes('ml') || title.toLowerCase().includes('report')) {
    return [
      { title: 'Aggregate training dataset logs & verify features accuracy', durationMinutes: 20 },
      { title: 'Analyze neural model validation plots & evaluate loss gradients', durationMinutes: 25 },
      { title: 'Summarize architectural adjustments & parameter fine-tuning results', durationMinutes: 30 },
      { title: 'Draft executive summary, methodology sections, and results', durationMinutes: 30 },
      { title: 'Export visual precision-recall charts & validation figures', durationMinutes: 20 },
      { title: 'Perform layout check, proofread report findings, and submit', durationMinutes: 15 },
    ];
  }

  return genericSteps;
}

function simulateCrisisPlan(title: string, hoursRemaining: number): string[] {
  const mins = Math.max(15, Math.round((hoursRemaining * 60) / 3));
  return [
    `Eliminate tabs, switch off your phone, and initialize a ${mins}-min focus block immediately.`,
    `Identify the absolute core submission criteria and draft a rough version covering those exact essentials.`,
    `Spend the final ${Math.round(mins / 2)} minutes on polishing execution logic, proofreading code, and compiling.`,
  ];
}

function simulateChatResponse(title: string, latestInput: string): string {
  const lower = latestInput.toLowerCase();
  if (lower.includes('schedule') || lower.includes('calendar')) {
    return `🚨 **Execution recommendation:** I have scanned your calendar blocks. I recommend booking an emergency **45-minute sprint starting at 4:00 PM** to tackle the next 3 sub-steps. Should I auto-schedule this work slot in your Google Calendar? [Confirm Booking]`;
  }
  if (lower.includes('what') && lower.includes('do')) {
    return `Based on your remaining time window, your top priority is: **Deconstruct scope and normalize database entities**. Turn off all devices, set your timer, and focus solely on this block for 20 minutes. I will monitor your progress metrics.`;
  }
  return `Understood. For your active task **"${title}"**, my recommendation is to lock down your browser tabs, focus strictly on the immediate micro-step, and avoid distraction. Let me know if you'd like me to draft code snippets, break down concepts, or suggest a calendar slot.`;
}
