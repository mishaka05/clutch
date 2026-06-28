/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { TASK_PARSER_SYSTEM_INSTRUCTION, generateTaskParserPrompt } from './src/utils/prompts/taskParser.js';
import { RISK_ASSESSOR_SYSTEM_INSTRUCTION, generateRiskAssessorPrompt } from './src/utils/prompts/riskAssessor.js';
import { CONTEXTUAL_CHAT_SYSTEM_INSTRUCTION, generateContextualChatPrompt } from './src/utils/prompts/contextualChat.js';
import { MICRO_PLANNER_SYSTEM_INSTRUCTION, generateMicroPlannerPrompt } from './src/utils/prompts/microPlanner.js';
import { CRISIS_COACH_SYSTEM_INSTRUCTION, generateCrisisCoachPrompt } from './src/utils/prompts/crisisCoach.js';
import { calculateTaskRisk } from './src/utils/riskEngine.js';

dotenv.config();

const loggedMessages = new Set<string>();
function logOnce(msg: string) {
  if (!loggedMessages.has(msg)) {
    loggedMessages.add(msg);
    console.log(msg);
  }
}

// Simple in-memory rate limiter to prevent API abuse
const rateLimits = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 35; // Max 35 requests per minute

function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const limit = rateLimits.get(ip);

  if (!limit) {
    rateLimits.set(ip, { count: 1, lastReset: now });
    return next();
  }

  if (now - limit.lastReset > RATE_LIMIT_WINDOW) {
    limit.count = 1;
    limit.lastReset = now;
    return next();
  }

  limit.count++;
  if (limit.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Too many requests. Please cool down before retrying.',
      retryAfterSeconds: Math.ceil((RATE_LIMIT_WINDOW - (now - limit.lastReset)) / 1000),
    });
  }

  next();
}

// Global Gemini circuit-breaker cooldown if we encounter quota limits (HTTP 429)
let geminiCooldownUntil = 0;
const COOLDOWN_DURATION = 60 * 1000; // 1 minute cooldown

function handleGeminiError(error: any, context: string) {
  console.error(`[Gemini Error - ${context}]:`, error);
  const errorMsg = String(error?.message || '').toLowerCase();
  const isQuotaError = error?.status === 429 || 
                       errorMsg.includes('429') || 
                       errorMsg.includes('quota') || 
                       errorMsg.includes('resource exhausted') ||
                       errorMsg.includes('rate limit');
  
  if (isQuotaError) {
    console.warn(`[Gemini Circuit Breaker]: Quota exceeded. Triggering ${COOLDOWN_DURATION / 1000}s cooldown.`);
    geminiCooldownUntil = Date.now() + COOLDOWN_DURATION;
  }
}

function isGeminiOnCooldown(): boolean {
  if (Date.now() < geminiCooldownUntil) {
    console.warn(`[Gemini Circuit Breaker]: Gemini is on cooldown. Using deterministic fallback.`);
    return true;
  }
  return false;
}

// Define TaskComplexity & TaskCategory types (or import)
type TaskComplexity = 'low' | 'medium' | 'high';
type TaskPriority = 'low' | 'medium' | 'high';
type TaskCategory = 'academic' | 'work' | 'personal' | 'finance';

interface ParsedTaskResponse {
  title: string;
  deadline: string;
  complexity: TaskComplexity;
  priority: TaskPriority;
  estimatedDuration: number;
  category: TaskCategory;
  progress: number;
}

// Inline fallback simulator to keep server self-contained and fast
function simulateTaskParser(userInput: string): ParsedTaskResponse {
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

function simulateRiskAssessment(task: any) {
  const riskResult = calculateTaskRisk({
    deadline: task.deadline,
    progress: task.progress,
    complexity: task.complexity,
    estimatedDuration: task.estimatedDuration,
  });

  const remainingHours = riskResult.hoursRemaining;
  let actionType: 'escalate_risk' | 'trigger_crisis' | 'reschedule' | 'send_alert' | 'do_nothing' = 'do_nothing';
  
  if (task.progress >= 100) {
    actionType = 'do_nothing';
  } else if (riskResult.isCrisis) {
    actionType = 'trigger_crisis';
  } else if (riskResult.riskScore >= 70) {
    actionType = 'escalate_risk';
  } else if (riskResult.riskScore >= 40) {
    actionType = 'send_alert';
  } else if (task.progress < 50 && remainingHours < 12) {
    actionType = 'reschedule';
  }

  let actionTaken = `Risk evaluated at ${riskResult.riskScore}%`;
  let reason = `Task progress is secure and stable.`;
  if (task.progress >= 100) {
    reason = "Task is already completed.";
  } else if (riskResult.isCrisis) {
    reason = `CRITICAL: Due in ${remainingHours.toFixed(1)}h with only ${task.progress}% progress.`;
  } else if (riskResult.riskScore >= 70) {
    reason = `HIGH RISK: Progress is lagging relative to deadline.`;
  } else if (riskResult.riskScore >= 40) {
    reason = `MODERATE RISK: Monitor closely.`;
  }

  return {
    riskScore: riskResult.riskScore,
    actionType,
    actionTaken,
    reason: reason.substring(0, 60),
    structuredReasoning: {
      metrics: {
        observedDeadline: `${remainingHours.toFixed(1)} hours remaining`,
        observedProgress: `${task.progress}% completed`,
        estimatedWorkRemaining: `${task.estimatedDuration} mins workload`,
        calendarAvailability: remainingHours < 4 ? "Critical - 0 free gaps" : "Balanced availability"
      },
      justificationText: `Automated assessment calculated a risk ratio of ${riskResult.riskScore}% based on a ${task.complexity} complexity level and current progress velocity.`,
      decisionConfidence: 95
    }
  };
}

function simulateChatResponse(
  task: any,
  hoursRemaining: number,
  history: any[],
  latestInput: string,
  agentLogs?: any[]
): string {
  const lower = latestInput.toLowerCase();
  const taskTitle = task?.title || 'this task';
  const progress = task?.progress ?? 0;
  const riskScore = task?.riskScore ?? 0;

  // Find next uncompleted subtasks
  const uncompletedSubtasks = (task?.subtasks || []).filter((st: any) => !st.completed);
  const nextStepTitle = uncompletedSubtasks.length > 0 ? uncompletedSubtasks[0].title : 'Final wrap-up';

  // 1. Calendar Commands
  if (lower.includes('schedule') || lower.includes('calendar') || lower.includes('slot') || lower.includes('book')) {
    const timeMatch = latestInput.match(/(\d{1,2})(?::(\d{2}))?\s*(pm|am|PM|AM)/i);
    let timeStr = '';
    if (timeMatch) {
      const hh = timeMatch[1];
      const mm = timeMatch[2] || '00';
      const ampm = timeMatch[3].toUpperCase();
      timeStr = `at **${hh}:${mm} ${ampm}**`;
    } else {
      const hourMatch24 = latestInput.match(/\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\b/);
      if (hourMatch24) {
        timeStr = `at **${hourMatch24[1]}:${hourMatch24[2]}**`;
      } else {
        const nextHour = new Date(Date.now() + 60 * 60 * 1000);
        nextHour.setMinutes(0, 0, 0);
        const formatted = nextHour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timeStr = `starting at **${formatted}**`;
      }
    }

    return `🚨 **Execution Recommendation:** I have scanned your active operational timeline. Based on your current progress of **${progress}%** and **${hoursRemaining.toFixed(1)}h** remaining, I recommend booking a **45-minute focus session** ${timeStr} to tackle the next step: *"${nextStepTitle}"*.

Should I auto-schedule this work slot directly in your Google Calendar?

[Confirm Booking]`;
  }

  // 2. Academic / Educational Questions
  if (lower.includes('inner join') || (lower.includes('join') && (lower.includes('sql') || lower.includes('database')))) {
    return `An **INNER JOIN** is an operations query in SQL used to select records that have matching values in both tables. It compares each row of the first table with each row of the second table to find all pairs of rows which satisfy the join-predicate. If the predicate is met, column values for each matched pair of rows are combined into a result row.

Since your active task is **"${taskTitle}"**, understanding INNER JOINs is directly relevant. For example, if you are querying student assignments or schemas, you could join a \`students\` table with an \`assignments\` table on \`student_id\` to easily correlate records.`;
  }

  if (lower.includes('normalization') || lower.includes('normalize') || lower.includes('normal form')) {
    return `Database **Normalization** is the systematic process of structuring a relational database to reduce data redundancy and improve data integrity. It organizes fields and tables of a database to ensure that dependencies are properly enforced (minimizing insert, update, and delete anomalies). It is typically structured in progressive levels:
1. **1NF (First Normal Form)**: Eliminate duplicate columns; ensure atomic values.
2. **2NF (Second Normal Form)**: Meet 1NF; ensure all non-key columns depend fully on the primary key.
3. **3NF (Third Normal Form)**: Meet 2NF; ensure no transitive dependencies exist.

Applying database normalization directly relates to your work on **"${taskTitle}"**, as establishing a clean 3NF database schema ensures optimal query speeds and robust transactional boundaries for your upcoming subtasks.`;
  }

  if (lower.includes('recursion') || lower.includes('recursive')) {
    return `In computer science, **Recursion** is a programming method where a function solves a problem by calling itself. To prevent infinite execution, every recursive function must have two core elements:
1. **Base Case**: The termination condition that yields a direct result without further recursive calls.
2. **Recursive Step**: The logic where the function calls itself with a reduced/simplified input, progressively moving closer to the base case.

In your active task **"${taskTitle}"**, recursion is highly practical for traversing hierarchal data structures like nested directories, parsing ASTs, or evaluating tree nodes.`;
  }

  if (lower.includes('explain') || lower.includes('what is') || lower.includes('how does') || lower.includes('how do i') || lower.includes('what are')) {
    // Other academic questions
    if (lower.includes('big o') || lower.includes('complexity') || lower.includes('notation')) {
      return `**Big O Notation** is a mathematical notation used to describe the limiting behavior of a function when the argument tends towards a particular value or infinity. In computer science, it classifies algorithms according to how their run time or space requirements grow as the input size grows.

In the context of your active task **"${taskTitle}"**, utilizing Big O will help you write performant code and optimize operations so they don't lag or timeout.`;
    }
    if (lower.includes('binary search tree') || lower.includes('bst') || lower.includes('tree')) {
      return `A **Binary Search Tree (BST)** is a node-based binary tree data structure which has the following properties:
- The left subtree of a node contains only nodes with keys lesser than the node's key.
- The right subtree of a node contains only nodes with keys greater than the node's key.
- Both left and right subtrees must also be binary search trees.

Since your active task is **"${taskTitle}"**, understanding BST properties is key if you are sorting, searching, or organizing records efficiently with logarithmic O(log n) average time complexity.`;
    }
  }

  // 3. Task Management & Explainability (Using AgentLogs if available)
  if (lower.includes('why') || lower.includes('risk') || lower.includes('reason') || lower.includes('recommendation') || lower.includes('created') || lower.includes('increased') || lower.includes('score') || lower.includes('notification') || lower.includes('log') || lower.includes('explain')) {
    const logs = agentLogs || [];
    
    // Look for risk escalation log
    if (lower.includes('risk') || lower.includes('score') || lower.includes('increased') || lower.includes('agent')) {
      const riskLog = logs.find((l: any) => l.agentType === 'RISK_ASSESSOR' && l.taskId === task?.id);
      if (riskLog) {
        return `According to the **Risk Assessor Agent**'s evaluation (recorded at ${new Date(riskLog.timestamp).toLocaleTimeString()}):
- **Decision:** ${riskLog.actionTaken}
- **Metrics Evaluated:** 
  • Observed Deadline: ${riskLog.structuredReasoning?.metrics?.observedDeadline || 'N/A'}
  • Observed Progress: ${riskLog.structuredReasoning?.metrics?.observedProgress || `${progress}%`}
  • Work Remaining: ${riskLog.structuredReasoning?.metrics?.estimatedWorkRemaining || 'N/A'}
- **Justification:** *"${riskLog.structuredReasoning?.justificationText || riskLog.reason}"*

This decision is derived directly from your completion velocity. Since only ${progress}% is complete with ${hoursRemaining.toFixed(1)}h remaining, the Risk Agent increased the score to alert you.`;
      }
    }

    // Look for calendar scheduling log
    if (lower.includes('calendar') || lower.includes('slot') || lower.includes('scheduled') || lower.includes('session')) {
      const calLog = logs.find((l: any) => l.agentType === 'CALENDAR_SCHEDULER' && l.taskId === task?.id);
      if (calLog) {
        return `According to the **Calendar Scheduler Agent**'s telemetry:
- **Decision:** ${calLog.actionTaken}
- **Reason:** *"${calLog.reason}"*
- **Justification:** *"${calLog.structuredReasoning?.justificationText || 'Focus block was placed in your Google Calendar.'}"*

This block was autonomously booked to help mitigate your active delivery risk.`;
      }
    }

    // Look for notification log
    if (lower.includes('notification') || lower.includes('alert')) {
      const notifLog = logs.find((l: any) => l.agentType === 'RISK_ASSESSOR' && l.structuredReasoning?.metrics?.observedDeadline);
      if (notifLog) {
        return `The emergency notification was triggered by Clutch because the **Risk Assessor Agent** detected high completion risks: *"${notifLog.reason}"*. The notification was dispatched to draw your focus immediately back to the critical path.`;
      }
    }

    // General subtask break down / risk reduction
    if (lower.includes('step') || lower.includes('break') || lower.includes('reduce') || lower.includes('how')) {
      if (uncompletedSubtasks.length > 0) {
        const stepsList = uncompletedSubtasks.map((st: any, i: number) => `**Step ${i + 1}:** ${st.title} (${st.durationMinutes} mins)`).join('\n');
        return `To reduce the risk of **"${taskTitle}"**, you should break the remaining work into the following operational micro-steps:

${stepsList}

By focusing on **Step 1 ("${nextStepTitle}")** first, you will immediately increase progress to **${Math.min(100, Math.round(progress + (100 / (task?.totalSteps || 6))))}%**, which will trigger the Task Monitor to recalculate and lower your risk index.`;
      }
    }

    return `The current autonomous Risk Agent has calculated your task's risk score at **${riskScore}%** based on having **${hoursRemaining.toFixed(1)} hours** left to complete a **${task?.complexity || 'medium'}** complexity workload. By checking off subtasks on your checklist, the Agent will immediately register progress and lower the risk index in real time.`;
  }

  // 4. Productivity Coaching
  if (lower.includes('overwhelmed') || lower.includes('procrastinat') || lower.includes('lazy') || lower.includes('stuck') || lower.includes('focus') || lower.includes('approach')) {
    let response = `I completely understand that managing **"${taskTitle}"** can feel overwhelming, especially with a risk index of **${riskScore}%** and only **${hoursRemaining.toFixed(1)} hours** remaining.

Here is an immediate, actionable strategy to break the paralysis:
1. **Pledge just 15 minutes:** Shut down all other browser tabs, set a timer for 15 minutes, and close your phone.
2. **Work on only ONE step:** Do not worry about finishing the entire assignment. Focus 100% of your energy solely on: *"${nextStepTitle}"*.
3. **Do not look at the final deadline** or the entire list. Just spend 15 minutes working on this single step.`;

    if (riskScore >= 80) {
      response += `\n\nSince your task is at critical risk (**${riskScore}%**), would you like me to schedule a dedicated 45-minute focus slot in your Google Calendar right now to get you started? [Confirm Booking]`;
    }
    return response;
  }

  // Default response (engaging with task context, answering directly)
  return `Understood. For your active task **"${taskTitle}"** (${progress}% complete, ${riskScore}% risk, due in ${hoursRemaining.toFixed(1)} hours):
 
My primary recommendation is to tackle the next micro-step on your checklist: *"${nextStepTitle}"*. Let me know if you would like me to explain any academic concepts, explain specific autonomous agent decisions, or help schedule a focus slot.`;
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Task Parsing using Gemini 3.5 Flash
  app.post('/api/gemini/parse-task', rateLimiter, async (req, res) => {
    const { userInput } = req.body;
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({ error: 'userInput string is required in request body' });
    }

    // Input length sanitization to prevent prompt injection or extremely long request payloads
    if (userInput.length > 500) {
      return res.status(400).json({ error: 'Input is too long (maximum 500 characters).' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || isGeminiOnCooldown()) {
      logOnce('[Gemini Task Parse] API key missing or on cooldown. Utilizing local simulation.');
      const simulationResult = simulateTaskParser(userInput);
      return res.json({ ...simulationResult, simulated: true });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
      let lastError: any = null;
      let text = '';
      let usedModel = '';

      for (const model of modelsToTry) {
        let attempts = 0;
        const maxAttempts = 2;
        while (attempts < maxAttempts) {
          try {
            console.log(`Attempting task parsing with model: ${model} (attempt ${attempts + 1})`);
            const response = await ai.models.generateContent({
              model: model,
              contents: generateTaskParserPrompt(userInput, new Date().toISOString()),
              config: {
                systemInstruction: TASK_PARSER_SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
              }
            });
            const responseText = response.text?.trim() || '';
            if (responseText) {
              text = responseText;
              usedModel = model;
              break;
            }
          } catch (err: any) {
            lastError = err;
            console.log(`[Gemini Task Parse] Model ${model} retry-active on attempt ${attempts + 1}.`);
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 300 * attempts));
            }
          }
        }
        if (text) {
          break;
        }
      }

      if (!text) {
        throw lastError || new Error('All configured Gemini models failed to return output.');
      }

      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJson);

      // Validate and normalize response fields
      const parsedTask: ParsedTaskResponse = {
        title: result.title || userInput,
        deadline: result.deadline || new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        complexity: (result.complexity as TaskComplexity) || 'medium',
        priority: (result.priority as TaskPriority) || 'medium',
        estimatedDuration: result.estimatedDuration || 120,
        category: (result.category as TaskCategory) || 'work',
        progress: result.progress ?? 0,
      };

      return res.json({ ...parsedTask, simulated: false, model: usedModel });

    } catch (error: any) {
      handleGeminiError(error, 'Task Parse');
      const simulationResult = simulateTaskParser(userInput);
      return res.json({ ...simulationResult, simulated: true, error: 'Local simulation fallback' });
    }
  });

  // API Route: Risk Assessment using Gemini 3.5 Flash
  app.post('/api/gemini/assess-risk', rateLimiter, async (req, res) => {
    const { task } = req.body;
    if (!task) {
      return res.status(400).json({ error: 'task object is required in request body' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || isGeminiOnCooldown()) {
      logOnce('[Gemini Risk Assess] API key missing or on cooldown. Utilizing local simulation.');
      const simulationResult = simulateRiskAssessment(task);
      return res.json({ ...simulationResult, simulated: true, evaluationSource: 'deterministic' });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
      let lastError: any = null;
      let text = '';
      let usedModel = '';

      for (const model of modelsToTry) {
        let attempts = 0;
        const maxAttempts = 2;
        while (attempts < maxAttempts) {
          try {
            console.log(`Attempting risk assessment with model: ${model} (attempt ${attempts + 1})`);
            const response = await ai.models.generateContent({
              model: model,
              contents: generateRiskAssessorPrompt(task, new Date().toISOString()),
              config: {
                systemInstruction: RISK_ASSESSOR_SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
              }
            });
            const responseText = response.text?.trim() || '';
            if (responseText) {
              text = responseText;
              usedModel = model;
              break;
            }
          } catch (err: any) {
            lastError = err;
            console.log(`[Gemini Risk Assess] Model ${model} retry-active on attempt ${attempts + 1}.`);
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 300 * attempts));
            }
          }
        }
        if (text) {
          break;
        }
      }

      if (!text) {
        throw lastError || new Error('All configured Gemini models failed to return risk assessment.');
      }

      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJson);

      return res.json({
        riskScore: result.riskScore ?? 0,
        actionType: result.actionType || 'do_nothing',
        actionTaken: result.actionTaken || 'Risk evaluated',
        reason: result.reason || 'Risk evaluated successfully.',
        structuredReasoning: {
          metrics: {
            observedDeadline: result.structuredReasoning?.metrics?.observedDeadline || 'N/A',
            observedProgress: result.structuredReasoning?.metrics?.observedProgress || 'N/A',
            estimatedWorkRemaining: result.structuredReasoning?.metrics?.estimatedWorkRemaining || 'N/A',
            calendarAvailability: result.structuredReasoning?.metrics?.calendarAvailability || 'N/A',
          },
          justificationText: result.structuredReasoning?.justificationText || 'Assessment complete.',
          decisionConfidence: result.structuredReasoning?.decisionConfidence ?? 90
        },
        simulated: false,
        model: usedModel,
        evaluationSource: 'gemini'
      });

    } catch (error: any) {
      handleGeminiError(error, 'Risk Assess');
      const simulationResult = simulateRiskAssessment(task);
      return res.json({ ...simulationResult, simulated: true, error: 'Local simulation fallback', evaluationSource: 'fallback' });
    }
  });

  // API Route: Contextual Chat using Gemini 3.5 Flash
  app.post('/api/gemini/chat', rateLimiter, async (req, res) => {
    const { task, hoursRemaining, history, latestInput, agentLogs } = req.body;
    if (!task || !latestInput) {
      return res.status(400).json({ error: 'task and latestInput are required in request body' });
    }

    // Chat input length limit to prevent abuse or prompt injection
    if (latestInput.length > 500) {
      return res.status(400).json({ error: 'Input is too long (maximum 500 characters).' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || isGeminiOnCooldown()) {
      logOnce('[Gemini Chat] API key missing or on cooldown. Utilizing local simulation.');
      const responseText = simulateChatResponse(task, hoursRemaining || 24, history || [], latestInput, agentLogs || []);
      const lower = latestInput.toLowerCase();
      let intent = 'general_conversation';
      let actionTaken = 'Consulted Decision Coach';
      let logReason = 'Consulted decision coach on task state.';

      if (lower.includes('schedule') || lower.includes('calendar') || lower.includes('slot') || lower.includes('book')) {
        intent = 'calendar_request';
        actionTaken = 'Recommended Calendar Adjustment';
        logReason = 'Recommended a Google Calendar focus block to mitigate task risk.';
      } else if (lower.includes('inner join') || lower.includes('join') || lower.includes('normalization') || lower.includes('recursion') || lower.includes('big o') || lower.includes('binary search tree') || lower.includes('explain') || lower.includes('what is')) {
        intent = 'academic_question';
        actionTaken = 'Explained Academic Concept';
        logReason = 'Provided conceptual database/algorithm explanations to assist with task.';
      } else if (lower.includes('why') || lower.includes('risk') || lower.includes('reason') || lower.includes('created') || lower.includes('increased') || lower.includes('score')) {
        intent = 'risk_explanation';
        actionTaken = 'Explained Risk Assessment';
        logReason = 'Analyzed telemetry logs to explain risk assessor decisions.';
      } else if (lower.includes('step') || lower.includes('break') || lower.includes('reduce') || lower.includes('how')) {
        intent = 'task_planning';
        actionTaken = 'Generated Work Breakdown';
        logReason = 'Generated tactical task checklist steps to reduce delivery risk.';
      } else if (lower.includes('overwhelmed') || lower.includes('procrastinat') || lower.includes('lazy') || lower.includes('stuck') || lower.includes('focus')) {
        intent = 'productivity_advice';
        actionTaken = 'Delivered Productivity Advice';
        logReason = 'Delivered focus and momentum advice to help with feeling overwhelmed.';
      }

      return res.json({
        response: responseText,
        intent,
        actionTaken,
        logReason,
        simulated: true
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
      let lastError: any = null;
      let text = '';

      const prompt = generateContextualChatPrompt(task, hoursRemaining || 24, history || [], latestInput, agentLogs || []);

      for (const model of modelsToTry) {
        let attempts = 0;
        const maxAttempts = 2;
        while (attempts < maxAttempts) {
          try {
            console.log(`Attempting chat with model: ${model} (attempt ${attempts + 1})`);
            const response = await ai.models.generateContent({
              model: model,
              contents: prompt,
              config: {
                systemInstruction: CONTEXTUAL_CHAT_SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
              }
            });
            const responseText = response.text?.trim() || '';
            if (responseText) {
              text = responseText;
              break;
            }
          } catch (err: any) {
            lastError = err;
            console.log(`[Gemini Chat] Model ${model} retry-active on attempt ${attempts + 1}.`);
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 300 * attempts));
            }
          }
        }
        if (text) {
          break;
        }
      }

      if (!text) {
        throw lastError || new Error('All configured Gemini models failed to return chat response.');
      }

      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJson);

      return res.json({
        response: result.response,
        intent: result.intent || 'general_conversation',
        actionTaken: result.actionTaken || 'Consulted Decision Coach',
        logReason: result.logReason || 'Discussed task status with AI Coach.',
        simulated: false
      });

    } catch (error: any) {
      handleGeminiError(error, 'Chat');
      const responseText = simulateChatResponse(task, hoursRemaining || 24, history || [], latestInput, agentLogs || []);
      const lower = latestInput.toLowerCase();
      let intent = 'general_conversation';
      let actionTaken = 'Consulted Decision Coach';
      let logReason = 'Consulted decision coach on task state.';

      if (lower.includes('schedule') || lower.includes('calendar') || lower.includes('slot') || lower.includes('book')) {
        intent = 'calendar_request';
        actionTaken = 'Recommended Calendar Adjustment';
        logReason = 'Recommended a Google Calendar focus block to mitigate task risk.';
      } else if (lower.includes('inner join') || lower.includes('join') || lower.includes('normalization') || lower.includes('recursion') || lower.includes('big o') || lower.includes('binary search tree') || lower.includes('explain') || lower.includes('what is')) {
        intent = 'academic_question';
        actionTaken = 'Explained Academic Concept';
        logReason = 'Provided conceptual database/algorithm explanations to assist with task.';
      } else if (lower.includes('why') || lower.includes('risk') || lower.includes('reason') || lower.includes('created') || lower.includes('increased') || lower.includes('score')) {
        intent = 'risk_explanation';
        actionTaken = 'Explained Risk Assessment';
        logReason = 'Analyzed telemetry logs to explain risk assessor decisions.';
      } else if (lower.includes('step') || lower.includes('break') || lower.includes('reduce') || lower.includes('how')) {
        intent = 'task_planning';
        actionTaken = 'Generated Work Breakdown';
        logReason = 'Generated tactical task checklist steps to reduce delivery risk.';
      } else if (lower.includes('overwhelmed') || lower.includes('procrastinat') || lower.includes('lazy') || lower.includes('stuck') || lower.includes('focus')) {
        intent = 'productivity_advice';
        actionTaken = 'Delivered Productivity Advice';
        logReason = 'Delivered focus and momentum advice to help with feeling overwhelmed.';
      }

      return res.json({
        response: responseText,
        intent,
        actionTaken,
        logReason,
        simulated: true,
        error: 'Local simulation fallback'
      });
    }
  });

  // API Route: Subtask Generation using Gemini 3.5 Flash
  app.post('/api/gemini/generate-subtasks', rateLimiter, async (req, res) => {
    const { title, deadline, progress } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title string is required in request body' });
    }
    const safeProgress = typeof progress === 'number' ? progress : 0;
    const safeDeadline = typeof deadline === 'string' ? deadline : new Date().toISOString();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || isGeminiOnCooldown()) {
      logOnce('[Gemini Subtasks] API key missing or on cooldown. Utilizing local simulation.');
      const simulationResult = simulateSubTaskPlanner(title);
      return res.json({ subtasks: simulationResult, simulated: true });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: generateMicroPlannerPrompt(title, safeDeadline, safeProgress),
        config: {
          systemInstruction: MICRO_PLANNER_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
        }
      });

      const text = response.text?.trim() || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJson);
      return res.json({ subtasks: result, simulated: false });

    } catch (error: any) {
      handleGeminiError(error, 'Generate Subtasks');
      const simulationResult = simulateSubTaskPlanner(title);
      return res.json({ subtasks: simulationResult, simulated: true, error: 'Fallback simulation triggered' });
    }
  });

  // API Route: Crisis Survival Plan using Gemini 3.5 Flash
  app.post('/api/gemini/generate-crisis-plan', rateLimiter, async (req, res) => {
    const { title, riskScore, hoursRemaining } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title string is required in request body' });
    }
    const safeRiskScore = typeof riskScore === 'number' ? riskScore : 50;
    const safeHoursRemaining = typeof hoursRemaining === 'number' ? hoursRemaining : 12;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || isGeminiOnCooldown()) {
      logOnce('[Gemini Crisis Plan] API key missing or on cooldown. Utilizing local simulation.');
      const simulationResult = simulateCrisisPlan(title, safeHoursRemaining);
      return res.json({ steps: simulationResult, simulated: true });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: generateCrisisCoachPrompt(title, safeRiskScore, safeHoursRemaining),
        config: {
          systemInstruction: CRISIS_COACH_SYSTEM_INSTRUCTION,
        }
      });

      const text = response.text || '';
      const steps = text
        .split(/\n+/)
        .map((line) => line.replace(/^\d+[\.\-\)]\s*/, '').trim())
        .filter((line) => line.length > 0)
        .slice(0, 3);

      if (steps.length === 3) {
        return res.json({ steps, simulated: false });
      }
      const simulationResult = simulateCrisisPlan(title, safeHoursRemaining);
      return res.json({ steps: simulationResult, simulated: true });

    } catch (error: any) {
      handleGeminiError(error, 'Generate Crisis Plan');
      const simulationResult = simulateCrisisPlan(title, safeHoursRemaining);
      return res.json({ steps: simulationResult, simulated: true, error: 'Fallback simulation triggered' });
    }
  });

  // Vite development vs production static handling
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
