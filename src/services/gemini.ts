/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SubTask, TaskCategory, TaskComplexity, TaskPriority } from '../types';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Centrally configurable Gemini Model setting (for documentation/metadata)
export const GEMINI_MODEL = 'gemini-3.5-flash';

// Lightweight log deduplication mechanism to prevent console spam
const loggedMessages = new Set<string>();
function logOnce(msg: string) {
  if (!loggedMessages.has(msg)) {
    loggedMessages.add(msg);
    console.log(msg);
  }
}

// Helper to check if API key exists (deprecated on client for security, returns null)
export function getApiKey(): string | null {
  return null;
}

// Lazy initialization of Gemini client (deprecated on client for security)
export function getGeminiClient(): null {
  return null;
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
    logOnce('[Gemini Parse] Utilizing local parser fallback.');
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
  try {
    const response = await fetch('/api/gemini/generate-subtasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, deadline, progress }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.subtasks;
  } catch (error) {
    logOnce('[Gemini Subtask] Utilizing local planner fallback.');
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
  try {
    const response = await fetch('/api/gemini/generate-crisis-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, riskScore, hoursRemaining }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.steps;
  } catch (error) {
    logOnce('[Gemini Crisis Plan] Utilizing local simulation fallback.');
    return simulateCrisisPlan(title, hoursRemaining);
  }
}

export interface ChatAIResponse {
  response: string;
  intent: string;
  actionTaken: string;
  logReason: string;
  simulated?: boolean;
}

/**
 * Contextual Chat response helper
 */
export async function generateChatResponseWithAI(
  task: any,
  hoursRemaining: number,
  history: ChatMessage[],
  latestInput: string,
  agentLogs?: any[]
): Promise<ChatAIResponse> {
  try {
    const response = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task, hoursRemaining, history, latestInput, agentLogs }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        response: data.response,
        intent: data.intent || 'general_conversation',
        actionTaken: data.actionTaken || 'Consulted Decision Coach',
        logReason: data.logReason || 'Discussed task status with AI Coach.',
        simulated: data.simulated
      };
    }
    throw new Error(`Server returned status: ${response.status}`);
  } catch (err) {
    logOnce('[Gemini Chat API Proxy] Failed or offline. Falling back to local simulation.');
    const responseText = simulateChatResponse(task, hoursRemaining, history, latestInput, agentLogs);
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
      logReason = 'Provided database/algorithm explanations to assist with task.';
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

    return {
      response: responseText,
      intent,
      actionTaken,
      logReason,
      simulated: true
    };
  }
}

/**
 * Dynamic Risk Assessment Agent via Gemini
 */
export async function assessTaskRiskWithAI(task: any): Promise<{
  riskScore: number;
  actionType: string;
  actionTaken: string;
  reason: string;
  structuredReasoning: {
    metrics: {
      observedDeadline: string;
      observedProgress: string;
      estimatedWorkRemaining: string;
      calendarAvailability: string;
    };
    justificationText: string;
    decisionConfidence: number;
  };
  simulated?: boolean;
  model?: string;
  error?: string;
  evaluationSource?: 'gemini' | 'deterministic' | 'fallback';
}> {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('clutch_outage_gemini_timeout') === 'true') {
      throw new Error('Gateway Timeout: connection to models/gemini-2.0-flash closed (Simulated Outage)');
    }

    const response = await fetch('/api/gemini/assess-risk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    logOnce('[Gemini Risk Assess] Utilizing local risk assessor fallback.');
    const { calculateTaskRisk } = await import('../utils/riskEngine');
    const riskResult = calculateTaskRisk({
      deadline: task.deadline,
      progress: task.progress,
      complexity: task.complexity,
      estimatedDuration: task.estimatedDuration,
    });
    const remainingHours = riskResult.hoursRemaining;
    let actionType = 'do_nothing';
    if (task.progress < 100) {
      if (riskResult.isCrisis) actionType = 'trigger_crisis';
      else if (riskResult.riskScore >= 70) actionType = 'escalate_risk';
      else if (riskResult.riskScore >= 40) actionType = 'send_alert';
      else if (task.progress < 50 && remainingHours < 12) actionType = 'reschedule';
    }
    return {
      riskScore: riskResult.riskScore,
      actionType,
      actionTaken: `Risk evaluated at ${riskResult.riskScore}%`,
      reason: task.progress >= 100 ? 'Task is already completed.' : `Monitored state: risk level is ${riskResult.riskScore}%.`,
      structuredReasoning: {
        metrics: {
          observedDeadline: `${remainingHours.toFixed(1)} hours remaining`,
          observedProgress: `${task.progress}% completed`,
          estimatedWorkRemaining: `${task.estimatedDuration} mins workload`,
          calendarAvailability: remainingHours < 4 ? 'Critical' : 'Balanced',
        },
        justificationText: `Client fallback evaluation calculated ${riskResult.riskScore}% risk with local deterministic formula.`,
        decisionConfidence: 95
      },
      simulated: true,
      error: error?.message || 'Network error',
      evaluationSource: 'fallback'
    };
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

  // 4. Resolve relative time/deadline and clean title
  // Helper to parse temporal phrases and clean the title
  const parseTemporalPhrases = (input: string) => {
    let cleaned = input;
    let deadlineDate = new Date();
    let hasDateMatch = false;

    // Helper to get upcoming day of week
    const getUpcomingDay = (dayName: string, nextFlag = false) => {
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDayIndex = daysOfWeek.indexOf(dayName);
      if (targetDayIndex === -1) return null;
      
      const now = new Date();
      const currentDayIndex = now.getDay();
      let daysToAdd = targetDayIndex - currentDayIndex;
      if (daysToAdd <= 0) {
        daysToAdd += 7; // force next week if it's today or already past
      }
      if (nextFlag && daysToAdd < 7) {
        daysToAdd += 7; // force next week's day
      }
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + daysToAdd);
      return targetDate;
    };

    // Check for specific hours/times in the input (e.g. "7 pm", "9:30 PM")
    const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*([ap]m)\b/i;
    const timeMatch = cleaned.match(timeRegex);
    let parsedHour: number | null = null;
    let parsedMinute = 0;
    if (timeMatch) {
      let hr = parseInt(timeMatch[1], 10);
      const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3].toLowerCase();
      if (ampm === 'pm' && hr < 12) hr += 12;
      if (ampm === 'am' && hr === 12) hr = 0;
      parsedHour = hr;
      parsedMinute = min;
      cleaned = cleaned.replace(timeRegex, '');
    }

    // A. "next [weekday]" / "this [weekday]" / "[weekday]"
    const weekdayRegex = /\b(next|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
    const weekdayMatch = cleaned.match(weekdayRegex);
    if (weekdayMatch) {
      const modifier = weekdayMatch[1] ? weekdayMatch[1].toLowerCase() : '';
      const dayName = weekdayMatch[2].toLowerCase();
      const nextFlag = modifier === 'next';
      const targetDate = getUpcomingDay(dayName, nextFlag);
      if (targetDate) {
        deadlineDate = targetDate;
        hasDateMatch = true;
      }
      cleaned = cleaned.replace(weekdayRegex, '');
    }
    // B. "tomorrow"
    else if (/\btomorrow\b/i.test(cleaned)) {
      deadlineDate.setDate(deadlineDate.getDate() + 1);
      hasDateMatch = true;
      cleaned = cleaned.replace(/\btomorrow\b/i, '');
    }
    // C. "tonight"
    else if (/\btonight\b/i.test(cleaned)) {
      if (parsedHour === null) {
        parsedHour = 23;
        parsedMinute = 0;
      }
      hasDateMatch = true;
      cleaned = cleaned.replace(/\btonight\b/i, '');
    }
    // D. "in [N] days"
    else {
      const relativeDaysMatch = cleaned.match(/\bin\s+(\d+)\s+days?\b/i);
      if (relativeDaysMatch) {
        const days = parseInt(relativeDaysMatch[1], 10);
        deadlineDate.setDate(deadlineDate.getDate() + days);
        hasDateMatch = true;
        cleaned = cleaned.replace(relativeDaysMatch[0], '');
      }
    }

    if (parsedHour !== null) {
      deadlineDate.setHours(parsedHour, parsedMinute, 0, 0);
    } else if (hasDateMatch) {
      deadlineDate.setHours(12, 0, 0, 0); // Default to noon for relative deadlines if no hour specified
    } else {
      deadlineDate = new Date(Date.now() + 4 * 3600 * 1000); // default 4 hours from now
    }

    return {
      cleanTitle: cleaned,
      deadline: deadlineDate.toISOString()
    };
  };

  const parsed = parseTemporalPhrases(userInput);
  deadline = parsed.deadline;
  let cleanTitle = parsed.cleanTitle;

  // Remove action prefixes
  cleanTitle = cleanTitle.replace(/^(complete|finish|create|do|draft|write|assemble|review)\s+/gi, '');
  
  // Remove phrases starting with "before", "by", "due on", "around", "at", "already finished", etc.
  cleanTitle = cleanTitle.replace(/\s*(?:before|by|due|around|at|already|finished|completed|progress|complete|duration|estimated|complexity|priority)\s+.*$/gi, '');
  
  // Strip common trailing keywords that might have been part of the scheduling phrase (e.g., "for", "on", "by", "at", "due")
  cleanTitle = cleanTitle.replace(/\s+\b(for|on|by|at|due|this|next|tomorrow|tonight)\b\s*$/gi, '');

  // Strip common trailing characters
  cleanTitle = cleanTitle.replace(/[.,;!]+$/, '').replace(/\s+/g, ' ').trim();

  // Capitalize nicely
  if (cleanTitle) {
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    title = cleanTitle;
  } else {
    title = 'Untitled Task';
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

function simulateChatResponse(
  task: any,
  hoursRemaining: number,
  history: any[],
  latestInput: string,
  agentLogs?: any[]
): string {
  const lower = latestInput.toLowerCase();
  const taskTitle = typeof task === 'string' ? task : (task?.title || 'this task');
  const progress = typeof task === 'string' ? 0 : (task?.progress ?? 0);
  const riskScore = typeof task === 'string' ? 0 : (task?.riskScore ?? 0);

  // Find next uncompleted subtasks
  const uncompletedSubtasks = typeof task === 'string' ? [] : ((task?.subtasks || []).filter((st: any) => !st.completed));
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
      const riskLog = logs.find((l: any) => l.agentType === 'RISK_ASSESSOR' && l.taskId === (typeof task === 'string' ? null : task?.id));
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
      const calLog = logs.find((l: any) => l.agentType === 'CALENDAR_SCHEDULER' && l.taskId === (typeof task === 'string' ? null : task?.id));
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

By focusing on **Step 1 ("${nextStepTitle}")** first, you will immediately increase progress to **${Math.min(100, Math.round(progress + (100 / (typeof task === 'string' ? 6 : (task?.totalSteps || 6)))))}%**, which will trigger the Task Monitor to recalculate and lower your risk index.`;
      }
    }

    return `The current autonomous Risk Agent has calculated your task's risk score at **${riskScore}%** based on having **${hoursRemaining.toFixed(1)} hours** left to complete a **${typeof task === 'string' ? 'medium' : (task?.complexity || 'medium')}** complexity workload. By checking off subtasks on your checklist, the Agent will immediately register progress and lower the risk index in real time.`;
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
