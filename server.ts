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
import { calculateTaskRisk } from './src/utils/riskEngine.js';

dotenv.config();

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Task Parsing using Gemini 3.5 Flash
  app.post('/api/gemini/parse-task', async (req, res) => {
    const { userInput } = req.body;
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({ error: 'userInput string is required in request body' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY missing on server. Falling back to simulated task parsing.');
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

      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.5-flash'];
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
            console.warn(`Model ${model} failed on attempt ${attempts + 1}:`, err?.message || err);
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
      console.error('Server Gemini Task Parsing failed, falling back to simulated parser:', error);
      const simulationResult = simulateTaskParser(userInput);
      return res.json({ ...simulationResult, simulated: true, error: error?.message || 'Gemini error' });
    }
  });

  // API Route: Risk Assessment using Gemini 3.5 Flash
  app.post('/api/gemini/assess-risk', async (req, res) => {
    const { task } = req.body;
    if (!task) {
      return res.status(400).json({ error: 'task object is required in request body' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY missing on server. Falling back to simulated risk assessment.');
      const simulationResult = simulateRiskAssessment(task);
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

      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.5-flash'];
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
            console.warn(`Model ${model} failed on risk assessment attempt ${attempts + 1}:`, err?.message || err);
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
        model: usedModel
      });

    } catch (error: any) {
      console.error('Server Gemini Risk Assessment failed, falling back to simulated assessor:', error);
      const simulationResult = simulateRiskAssessment(task);
      return res.json({ ...simulationResult, simulated: true, error: error?.message || 'Gemini error' });
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
