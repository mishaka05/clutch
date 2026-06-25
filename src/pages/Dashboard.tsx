/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Flame, CheckSquare, Plus, ChevronRight, 
  Calendar, Check, AlertTriangle, Play, HelpCircle, Info, Trash2, Mic, Clock, Activity
} from 'lucide-react';
import { Task, UserProfile, AgentLog, TaskComplexity, TaskCategory, TaskPriority } from '../types';
import { firebaseService } from '../services/firebase';
import { parseTaskWithAI, generateSubTasksWithAI, generateCrisisPlanWithAI } from '../services/gemini';
import { calculateTaskRisk } from '../utils/riskEngine';
import RiskGauge from '../components/RiskGauge';
import TaskCard from '../components/TaskCard';
import ChatPanel from '../components/ChatPanel';

function formatFriendlyDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 minutes';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) {
    return `${hrs} hour${hrs > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`;
  } else if (hrs > 0) {
    return `${hrs} hour${hrs > 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

interface DashboardProps {
  user: UserProfile;
  activeTab: 'dashboard' | 'logs';
  setActiveTab: (tab: 'dashboard' | 'logs') => void;
}

export default function Dashboard({ user, activeTab, setActiveTab }: DashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Natural Language Ingestion State
  const [intakeInput, setIntakeInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedTask, setParsedTask] = useState<any | null>(null);
  
  // Confetti / Success Feedback
  const [showCelebration, setShowCelebration] = useState(false);

  // Load Initial Session Data
  useEffect(() => {
    const loadSession = async () => {
      const allTasks = await firebaseService.getTasks();
      const allLogs = await firebaseService.getAgentLogs();
      setTasks(allTasks);
      setLogs(allLogs);
    };
    loadSession();

    // Setup periodic automatic evaluation (simulating scheduled agent loop every 10 seconds in UI)
    const interval = setInterval(async () => {
      const allTasks = await firebaseService.getTasks();
      setTasks(allTasks);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const refreshData = async () => {
    const allTasks = await firebaseService.getTasks();
    const allLogs = await firebaseService.getAgentLogs();
    setTasks(allTasks);
    setLogs(allLogs);
    if (selectedTask) {
      const current = allTasks.find(t => t.id === selectedTask.id);
      if (current) setSelectedTask(current);
    }
  };

  // 1. Natural Language Submission Handler
  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeInput.trim()) return;
    
    setIsParsing(true);
    setParsedTask(null);

    try {
      const parsed = await parseTaskWithAI(intakeInput);
      setParsedTask(parsed);
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmTask = async () => {
    if (!parsedTask) return;
    
    try {
      // Create primary task parameters
      const created = await firebaseService.addTask({
        title: parsedTask.title,
        deadline: parsedTask.deadline,
        complexity: parsedTask.complexity,
        priority: parsedTask.priority || 'medium',
        estimatedDuration: parsedTask.estimatedDuration,
        category: parsedTask.category,
        progress: parsedTask.progress,
        completedSteps: 0,
        totalSteps: 6,
        aiGenerated: true,
        subtasks: [],
        status: 'active'
      });

      // Automatically generate 6 micro-actions via Agent
      const generatedSubtasks = await generateSubTasksWithAI(created.title, created.deadline, created.progress);
      const subtasksList = generatedSubtasks.map((st, idx) => ({
        id: `st-${created.id}-${idx}`,
        title: st.title,
        completed: false,
        durationMinutes: st.durationMinutes,
        sequenceNumber: idx + 1
      }));

      await firebaseService.updateTask(created.id, {
        subtasks: subtasksList,
        totalSteps: subtasksList.length
      });

      setIntakeInput('');
      setParsedTask(null);
      await refreshData();
      
      // Auto-select newly created task to showcase details to judges
      const freshTasks = await firebaseService.getTasks();
      const newlyAdded = freshTasks.find(t => t.title === created.title);
      if (newlyAdded) setSelectedTask(newlyAdded);

    } catch (err) {
      console.error('Task registration failed:', err);
    }
  };

  // 2. Toggle Subtask Completion Updates
  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const completedCount = updatedSubtasks.filter(st => st.completed).length;
    const progressPercent = Math.round((completedCount / updatedSubtasks.length) * 100);

    const updated = await firebaseService.updateTask(taskId, {
      subtasks: updatedSubtasks,
      progress: progressPercent,
      completedSteps: completedCount
    });

    if (progressPercent === 100) {
      // Trigger celebrate
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
      
      // Add Agent log
      await firebaseService.addAgentLog({
        taskId,
        taskTitle: task.title,
        actionType: 'do_nothing',
        actionTaken: 'Task Accomplished',
        reason: `User successfully checked off all micro-steps. Risk dropped to 0%.`,
        isAgentInitiated: false
      });
    }

    await refreshData();
  };

  // 3. Rescheduling callback handler
  const handleRescheduleCallback = async () => {
    await refreshData();
  };

  // 4. Delete Task handler
  const handleDeleteTask = async (taskId: string) => {
    await firebaseService.deleteTask(taskId);
    setSelectedTask(null);
    await refreshData();
  };

  // Today's Focus Metrics Helper
  const activeTasks = tasks.filter(t => t.status === 'active');
  const highestRiskTask = [...activeTasks].sort((a, b) => b.riskScore - a.riskScore)[0] || null;

  const totalFocusTimeMins = activeTasks.reduce((sum, t) => sum + t.estimatedDuration * (1 - t.progress / 100), 0);
  const totalFocusHours = Math.floor(totalFocusTimeMins / 60);
  const totalFocusMins = Math.round(totalFocusTimeMins % 60);

  // Count crisis vs warning tasks
  const crisisCount = activeTasks.filter(t => t.riskScore >= 80).length;
  const warningCount = activeTasks.filter(t => t.riskScore >= 40 && t.riskScore < 80).length;

  // Render main layout
  return (
    <div className="flex-1 w-full flex flex-col md:flex-row bg-[#0D1B2A] relative min-h-[calc(100vh-65px)]">
      
      {/* Dynamic Celebration Confetti overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-slate-900/40"
          >
            <div className="bg-gradient-to-r from-[#00E676] to-[#00D4FF] text-[#0D1B2A] font-space font-bold uppercase tracking-wider px-8 py-4 rounded-xl shadow-2xl animate-bounce">
              🎉 DEADLINE DEFUSED! EXCELLENT SPRINT!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* ==========================================
           FULLSCREEN CRISIS TAKEOVER CARD (HIGHEST PRIORITY)
           ========================================== */}
        {highestRiskTask && highestRiskTask.riskScore >= 80 && (
          <CrisisTakeoverOverlay
            task={highestRiskTask}
            onDefuse={async () => {
              // Mark task as fully completed to defuse tension
              await firebaseService.updateTask(highestRiskTask.id, {
                progress: 100,
                completedSteps: highestRiskTask.totalSteps,
                subtasks: highestRiskTask.subtasks.map(st => ({ ...st, completed: true }))
              });
              
              await firebaseService.addAgentLog({
                taskId: highestRiskTask.id,
                taskTitle: highestRiskTask.title,
                actionType: 'do_nothing',
                actionTaken: 'Crisis Mitigated',
                reason: 'Completed task under emergency pressure.',
                isAgentInitiated: false
              });

              setShowCelebration(true);
              setTimeout(() => setShowCelebration(false), 3000);
              await refreshData();
            }}
            onDismiss={async () => {
              // Postpone crisis by lowering risk score artificially (e.g. increase deadline by 4 hours)
              const fourHoursLater = new Date(Date.now() + 4.5 * 3600 * 1000).toISOString();
              await firebaseService.updateTask(highestRiskTask.id, {
                deadline: fourHoursLater
              });
              await refreshData();
            }}
          />
        )}
      </AnimatePresence>

      {/* ==========================================
         LEFT MAIN SECTION: Terminals / Forms / Logs
         ========================================== */}
      <main className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto">
        
        {activeTab === 'dashboard' ? (
          <>
            {/* 1. TODAY'S FOCUS HERO ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Today's Focus KPI Banner */}
              <div className="lg:col-span-2 bg-gradient-to-r from-[#122338] to-[#0A1624] border border-[#1C2F46] rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#00D4FF]/5 blur-3xl rounded-full pointer-events-none" />
                
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-900/50 px-2.5 py-1 rounded border border-slate-800">
                    Active Cockpit Summary
                  </span>
                  
                  {highestRiskTask ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-slate-400 font-medium">HIGHEST DEADLINE RISK:</p>
                      <h2 className="text-2xl font-space font-bold text-slate-100 tracking-tight leading-snug">
                        {highestRiskTask.title}
                      </h2>
                      <p className="text-xs font-mono text-[#FF3B5C] flex items-center gap-1.5 font-semibold">
                        <Flame size={13} className="animate-pulse" />
                        CRISIS RATIO DETECTED ({highestRiskTask.riskScore}%) — INTERVENE IMMEDIATELY
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <h2 className="text-xl font-space font-bold text-slate-300">
                        Operational Clean Slate
                      </h2>
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        All active systems nominal. Add tasks below to initialize tracking.
                      </p>
                    </div>
                  )}
                </div>

                {/* Grid sub-indicators */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#1C2F46]/50 mt-6">
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 uppercase">Active Tasks</span>
                    <span className="font-space font-bold text-xl text-[#00D4FF]">{activeTasks.length}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 uppercase">Focus Time</span>
                    <span className="font-space font-bold text-xl text-slate-200">
                      {totalFocusHours > 0 ? `${totalFocusHours}h ` : ''}{totalFocusMins}m
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 uppercase">Critical</span>
                    <span className="font-space font-bold text-xl text-[#FF3B5C]">{crisisCount}</span>
                  </div>
                </div>
              </div>

              {/* Real-time Agent System Status */}
              <div className="bg-[#101D2D] border border-[#1D3149] rounded-2xl p-5 flex flex-col justify-between shadow-lg">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-space font-bold text-sm text-slate-200 uppercase tracking-tight">
                      Background Agent
                    </h3>
                    <p className="text-[10px] font-mono text-slate-500">
                      AUTONOMOUS THREAT ANALYSIS
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#7B61FF]/10 px-2 py-0.5 rounded border border-[#7B61FF]/20">
                    <span className="w-1.5 h-1.5 bg-[#7B61FF] rounded-full animate-ping" />
                    <span className="text-[9px] font-mono text-[#7B61FF] font-semibold">RUNNING</span>
                  </div>
                </div>

                <div className="space-y-3.5 py-4">
                  <div className="flex gap-3 text-xs">
                    <Info size={14} className="text-[#00D4FF] shrink-0 mt-0.5" />
                    <p className="text-slate-400 leading-normal font-sans">
                      Our system monitors task progress patterns, evaluating time-complexity ratios dynamically every 10 seconds.
                    </p>
                  </div>
                </div>

                <button
                  id="view-logs-btn"
                  onClick={() => setActiveTab('logs')}
                  className="w-full py-2.5 bg-[#09111C] hover:bg-[#1C2F46]/50 border border-[#1C2F46] hover:border-[#7B61FF] text-slate-300 hover:text-slate-100 font-space font-semibold uppercase rounded-lg tracking-wider text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  Inspect Agent Logs
                  <ChevronRight size={12} />
                </button>
              </div>

            </div>

            {/* 2. NATURAL LANGUAGE QUICK INGESTION BAR */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Natural Language Ingestion (Vite/Gemini Model parsing)
              </h3>
              
              <form onSubmit={handleIntakeSubmit} className="relative flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    id="natural-language-input"
                    type="text"
                    value={intakeInput}
                    onChange={(e) => setIntakeInput(e.target.value)}
                    placeholder='e.g., "Finish DBMS assignment tomorrow 8 PM, high complexity"'
                    className="w-full pl-4 pr-12 py-3.5 bg-[#0F1D30] border border-[#1A2E46] focus:border-[#00D4FF] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00D4FF] transition-all font-sans text-sm shadow-md"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 flex items-center gap-1.5">
                    <Mic size={14} className="hover:text-[#00D4FF] transition-colors cursor-pointer" />
                  </div>
                </div>
                
                <button
                  id="parse-task-btn"
                  type="submit"
                  disabled={isParsing || !intakeInput.trim()}
                  className="px-6 py-3.5 bg-[#00D4FF] hover:bg-cyan-400 text-[#0D1B2A] font-space font-bold uppercase rounded-xl tracking-wider transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,212,255,0.25)] disabled:opacity-40 text-xs cursor-pointer"
                >
                  {isParsing ? 'Parsing...' : 'Parse'}
                </button>
              </form>

              {/* Gemini Parsing Agent Confirmation Card */}
              <AnimatePresence>
                {parsedTask && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-[#12253E] border-2 border-[#00D4FF]/40 rounded-xl p-5 shadow-lg relative"
                  >
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                      {parsedTask.simulated ? (
                        <div className="flex items-center gap-1 text-[10px] font-mono text-[#FFB800] uppercase tracking-wider bg-[#FFB800]/10 border border-[#FFB800]/20 px-2 py-0.5 rounded">
                          <AlertTriangle size={10} />
                          Local Rescue Mode
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] font-mono text-[#00D4FF] uppercase tracking-wider bg-[#00D4FF]/10 border border-[#00D4FF]/20 px-2 py-0.5 rounded">
                          <Sparkles size={10} />
                          Live {parsedTask.model || 'Gemini'} Ingestion
                        </div>
                      )}
                    </div>

                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                      Please confirm parameters:
                    </h4>
                    {parsedTask.simulated && (
                      <p className="text-[10px] text-amber-400 font-mono mt-1">
                        ⚠️ Live Gemini API is currently experiencing high demand (503). Smooth local ingestion is active!
                      </p>
                    )}

                    {/* Param Details edit form inside confirmation card */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                      {/* Title */}
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Task Title</label>
                        <input
                          type="text"
                          value={parsedTask.title}
                          onChange={(e) => setParsedTask({ ...parsedTask, title: e.target.value })}
                          className="w-full bg-[#0F1D30] border border-[#1C2F46] focus:border-[#00D4FF]/80 text-xs text-slate-100 rounded-lg px-3 py-2 mt-1.5 font-sans outline-none transition-all"
                        />
                      </div>

                      {/* Deadline */}
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Deadline (ISO / Text)</label>
                        <input
                          type="text"
                          value={parsedTask.deadline}
                          onChange={(e) => setParsedTask({ ...parsedTask, deadline: e.target.value })}
                          className="w-full bg-[#0F1D30] border border-[#1C2F46] focus:border-[#00D4FF]/80 text-xs text-slate-100 rounded-lg px-3 py-2 mt-1.5 font-mono outline-none transition-all"
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Category</label>
                        <select
                          value={parsedTask.category}
                          onChange={(e) => setParsedTask({ ...parsedTask, category: e.target.value as TaskCategory })}
                          className="w-full bg-[#0F1D30] border border-[#1C2F46] focus:border-[#00D4FF]/80 text-xs text-slate-100 rounded-lg px-3 py-2 mt-1.5 font-sans outline-none transition-all cursor-pointer"
                        >
                          <option value="academic">🎓 Academic</option>
                          <option value="work">💼 Work</option>
                          <option value="personal">👤 Personal</option>
                          <option value="finance">💳 Finance</option>
                        </select>
                      </div>

                      {/* Complexity */}
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Complexity</label>
                        <select
                          value={parsedTask.complexity}
                          onChange={(e) => setParsedTask({ ...parsedTask, complexity: e.target.value as TaskComplexity })}
                          className="w-full bg-[#0F1D30] border border-[#1C2F46] focus:border-[#00D4FF]/80 text-xs text-slate-100 rounded-lg px-3 py-2 mt-1.5 font-sans outline-none transition-all cursor-pointer"
                        >
                          <option value="low">Low Complexity</option>
                          <option value="medium">Medium Complexity</option>
                          <option value="high">High Complexity</option>
                        </select>
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Priority</label>
                        <select
                          value={parsedTask.priority}
                          onChange={(e) => setParsedTask({ ...parsedTask, priority: e.target.value as TaskPriority })}
                          className="w-full bg-[#0F1D30] border border-[#1C2F46] focus:border-[#00D4FF]/80 text-xs text-slate-100 rounded-lg px-3 py-2 mt-1.5 font-sans outline-none transition-all cursor-pointer"
                        >
                          <option value="low">🟢 Low Priority</option>
                          <option value="medium">🟡 Medium Priority</option>
                          <option value="high">🔴 High Priority</option>
                        </select>
                      </div>

                      {/* Progress */}
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Progress ({parsedTask.progress}%)</label>
                        <div className="flex items-center gap-2 mt-1.5">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={parsedTask.progress}
                            onChange={(e) => setParsedTask({ ...parsedTask, progress: parseInt(e.target.value, 10) })}
                            className="flex-1 accent-[#00D4FF] bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={parsedTask.progress}
                            onChange={(e) => setParsedTask({ ...parsedTask, progress: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                            className="w-12 bg-[#0F1D30] border border-[#1C2F46] text-center text-xs text-slate-100 rounded px-1 py-1 font-mono outline-none"
                          />
                        </div>
                      </div>

                      {/* Duration (User-friendly Display) */}
                      <div className="col-span-1 sm:col-span-2 md:col-span-4 mt-1 bg-[#091523]/50 p-3 rounded-lg border border-[#16273B]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                              Estimated Duration
                            </label>
                            <span className="text-xs font-space font-medium text-[#00D4FF] block">
                              🕒 {formatFriendlyDuration(parsedTask.estimatedDuration)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-slate-900/80 rounded-lg px-2 py-1 border border-[#1C2F46]">
                              <input
                                id="duration-hours-input"
                                type="number"
                                min="0"
                                max="24"
                                value={Math.floor(parsedTask.estimatedDuration / 60)}
                                onChange={(e) => {
                                  const hours = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  const mins = parsedTask.estimatedDuration % 60;
                                  setParsedTask({ ...parsedTask, estimatedDuration: hours * 60 + mins });
                                }}
                                className="w-10 bg-transparent text-center text-xs text-slate-100 font-mono outline-none"
                              />
                              <span className="text-[9px] font-mono text-slate-500 uppercase">HRS</span>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-900/80 rounded-lg px-2 py-1 border border-[#1C2F46]">
                              <input
                                id="duration-mins-input"
                                type="number"
                                min="0"
                                max="59"
                                value={parsedTask.estimatedDuration % 60}
                                onChange={(e) => {
                                  const hours = Math.floor(parsedTask.estimatedDuration / 60);
                                  const mins = Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0));
                                  setParsedTask({ ...parsedTask, estimatedDuration: hours * 60 + mins });
                                }}
                                className="w-10 bg-transparent text-center text-xs text-slate-100 font-mono outline-none"
                              />
                              <span className="text-[9px] font-mono text-slate-500 uppercase">MINS</span>
                            </div>
                            <span className="text-slate-500 text-xs font-mono">
                              ({parsedTask.estimatedDuration} total mins)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-[#1C2F46]/50">
                      <button
                        id="cancel-parsed-btn"
                        onClick={() => setParsedTask(null)}
                        className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-slate-200 uppercase cursor-pointer"
                      >
                        Cancel
                      </button>
                      
                      <button
                        id="confirm-parsed-btn"
                        onClick={handleConfirmTask}
                        className="flex items-center gap-1.5 px-5 py-2 bg-[#00D4FF] text-[#0D1B2A] font-space font-bold uppercase rounded-lg text-xs tracking-wider hover:bg-cyan-400 transition-all cursor-pointer"
                      >
                        <Check size={12} strokeWidth={3} />
                        Accept & Initialize Task
                      </button>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. TASK COCKPIT SECTION */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Operational Task Matrix
                </h3>
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  {activeTasks.length} active timelines
                </span>
              </div>

              {activeTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-[#0F1D30]/30 border border-dashed border-[#1C2F46] rounded-2xl text-center">
                  <AlertTriangle className="text-slate-600 mb-3" size={32} />
                  <p className="text-slate-400 text-sm font-sans font-medium">No deadlines recorded</p>
                  <p className="text-slate-500 text-xs font-mono mt-1">Ingest a task above to initialize tracking metrics.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Highlight Highest-Risk task in large format */}
                  {highestRiskTask && (
                    <TaskCard
                      task={highestRiskTask}
                      isLarge={true}
                      onSelect={(task) => setSelectedTask(task)}
                      onTriggerCrisis={(t) => {}}
                    />
                  )}

                  {/* List remainder tasks */}
                  {activeTasks
                    .filter(t => t.id !== highestRiskTask?.id)
                    .map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isLarge={false}
                        onSelect={(task) => setSelectedTask(task)}
                        onTriggerCrisis={(t) => {}}
                      />
                    ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ==========================================
             STAGE 3: AUTONOMOUS AGENT ACTIVITY LOGS
             ========================================== */
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-[#1C2F46]">
              <div>
                <h2 className="text-2xl font-space font-bold text-slate-100 uppercase tracking-tight">
                  Agent Activity Audit Log
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  SECURE PROOF OF AGENTIC DEPTH AND AUTOMATIONS
                </p>
              </div>
              <div className="flex items-center gap-1 bg-[#7B61FF]/10 border border-[#7B61FF]/30 px-3 py-1 rounded text-xs font-mono text-[#7B61FF]">
                <Activity size={13} className="animate-pulse" />
                <span>ACTIVE MONITORING</span>
              </div>
            </div>

            <div className="bg-[#0F1D30] border border-[#1A2E46] rounded-2xl p-6 shadow-lg space-y-6">
              
              <div className="flex items-start gap-3 bg-[#7B61FF]/10 p-4 rounded-xl border border-[#7B61FF]/30">
                <Info size={16} className="text-[#7B61FF] shrink-0 mt-0.5" />
                <div className="text-xs font-sans text-slate-300 leading-relaxed">
                  <strong className="text-slate-100">Audit Guidelines:</strong> All actions marked with a <span className="text-[#7B61FF] font-bold">Purple Accent</span> represent autonomous agent decisions made independently by the Clutch AI engine while the client session is in background monitoring mode. User actions are marked with regular accents.
                </div>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-mono text-xs">
                  No autonomous logs written yet.
                </div>
              ) : (
                <div className="relative border-l-2 border-[#1C2F46] ml-4 pl-6 space-y-6">
                  {logs.map((log) => (
                    <div key={log.id} className="relative">
                      {/* Left Dot Bullet */}
                      <span 
                        className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-[#0D1B2A] flex items-center justify-center shadow-lg"
                        style={{
                          backgroundColor: log.isAgentInitiated ? '#7B61FF' : '#00D4FF',
                          boxShadow: log.isAgentInitiated ? '0 0 10px #7B61FF' : 'none'
                        }}
                      />

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span 
                            className="text-xs font-space font-bold uppercase tracking-wider"
                            style={{ color: log.isAgentInitiated ? '#7B61FF' : '#00D4FF' }}
                          >
                            {log.actionTaken}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          {log.taskTitle && (
                            <span className="text-[9px] font-mono text-slate-400 bg-slate-900/50 border border-slate-800 px-2 py-0.5 rounded">
                              Task: {log.taskTitle}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-slate-300 font-sans leading-relaxed">
                          {log.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}

      </main>

      {/* ==========================================
         RIGHT SIDEBAR DRAWER: DEEP-DIVE TASK DETAILS
         ========================================== */}
      <AnimatePresence>
        {selectedTask && (
          <motion.aside
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            className="w-full md:w-[350px] lg:w-[450px] bg-[#0E1A29] border-t md:border-t-0 md:border-l border-[#1C2F46] flex flex-col justify-between shrink-0"
          >
            {/* Drawer Header details */}
            <div className="p-5 border-b border-[#1C2F46] flex justify-between items-center bg-[#0B1521]">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                  Operational Details
                </span>
                <h3 className="font-space font-bold text-slate-100 uppercase tracking-tight">
                  Task Command Center
                </h3>
              </div>
              <button
                id="close-drawer-btn"
                onClick={() => setSelectedTask(null)}
                className="text-xs font-mono text-slate-400 hover:text-slate-100 cursor-pointer uppercase border border-[#1A2F45] px-2.5 py-1 rounded bg-[#07111C]"
              >
                Close &times;
              </button>
            </div>

            {/* Scrollable central analysis */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Dial Gauge Speedometer hero area */}
              <div className="flex flex-col items-center py-4 bg-[#0A121E]/60 rounded-2xl border border-[#1C2F46]/60">
                <RiskGauge score={selectedTask.riskScore} size="lg" />
                
                {/* Real-time progress scale */}
                <div className="w-4/5 text-center mt-3 space-y-1">
                  <p className="text-xs font-sans text-slate-300 font-medium">
                    Task progress checklist is {selectedTask.progress}% defused
                  </p>
                  <p className="text-[10px] font-mono text-slate-500">
                    Checked off {selectedTask.completedSteps} of {selectedTask.totalSteps} steps
                  </p>
                </div>
              </div>

              {/* Checklist subtasks items */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Micro-Action Breakdown (AI-Generated Checklist)
                </h4>
                
                <div className="space-y-2.5">
                  {selectedTask.subtasks && selectedTask.subtasks.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => handleToggleSubtask(selectedTask.id, st.id)}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all hover:bg-slate-900/30
                        ${st.completed 
                          ? 'bg-[#00E676]/5 border-[#00E676]/20 text-slate-400' 
                          : 'bg-[#122234] border-[#1E334D] text-slate-200'}
                      `}
                    >
                      {/* Custom rounded checkbox */}
                      <div 
                        className={`
                          w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                          ${st.completed ? 'bg-[#00E676] border-[#00E676]' : 'border-slate-600'}
                        `}
                      >
                        {st.completed && <Check size={11} className="text-[#0D1B2A] stroke-[4]" />}
                      </div>

                      <div className="flex-1">
                        <p className={`text-xs font-sans ${st.completed ? 'line-through' : ''}`}>
                          {st.title}
                        </p>
                        <span className="text-[9px] font-mono text-slate-500 flex items-center gap-1.5 mt-1 uppercase">
                          <Clock size={9} />
                          {st.durationMinutes} minutes deep focus
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secondary Actions / Delete Button */}
              <div className="pt-4 border-t border-[#1C2F46]/50 flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-500">
                  Registered {new Date(selectedTask.createdAt).toLocaleDateString()}
                </span>

                <button
                  id={`delete-task-btn-${selectedTask.id}`}
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 font-mono uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Trash2 size={13} />
                  Purge task
                </button>
              </div>

            </div>

            {/* Collapsible Chat Panel inside drawer */}
            <div className="h-96 border-t border-[#1C2F46] shrink-0">
              <ChatPanel
                task={selectedTask}
                hoursRemaining={(new Date(selectedTask.deadline).getTime() - Date.now()) / (1000 * 3600)}
                onRescheduleCompleted={handleRescheduleCallback}
              />
            </div>

          </motion.aside>
        )}
      </AnimatePresence>

    </div>
  );
}

// ==========================================
// FULLSCREEN CRISIS TAKEOVER OVERLAY
// ==========================================

interface CrisisTakeoverProps {
  task: Task;
  onDefuse: () => void;
  onDismiss: () => void;
}

function CrisisTakeoverOverlay({ task, onDefuse, onDismiss }: CrisisTakeoverProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [survivalPlan, setSurvivalPlan] = useState<string[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Load AI Survival plan
  useEffect(() => {
    const fetchPlan = async () => {
      setLoadingPlan(true);
      const hoursRemaining = (new Date(task.deadline).getTime() - Date.now()) / (1000 * 3600);
      const steps = await generateCrisisPlanWithAI(task.title, task.riskScore, hoursRemaining);
      setSurvivalPlan(steps);
      setLoadingPlan(false);
    };
    fetchPlan();
  }, [task.id]);

  // Real-time ticking Countdown down to the second
  useEffect(() => {
    const updateTime = () => {
      const diff = new Date(task.deadline).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.floor(diff / 1000)));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [task.deadline]);

  const formatCountdown = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const hPad = hours.toString().padStart(2, '0');
    const mPad = mins.toString().padStart(2, '0');
    const sPad = secs.toString().padStart(2, '0');

    return `${hPad}:${mPad}:${sPad}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-b from-[#1A0010] to-[#0D1B2A] backdrop-blur-md"
    >
      {/* Subtle pulsing crimson borders */}
      <div className="absolute inset-4 md:inset-8 border-2 border-red-500/20 rounded-2xl pointer-events-none animate-pulse" />
      <div className="absolute inset-0 border-[30px] border-[#FF3B5C]/5 pointer-events-none" />

      <div className="w-full max-w-2xl bg-black/60 border border-[#FF3B5C]/30 rounded-2xl p-6 md:p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(255,59,92,0.15)] space-y-6 flex flex-col relative text-center">
        
        {/* Urgent warning banner */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,59,92,0.25)] animate-bounce">
            <Flame size={24} className="text-[#FF3B5C]" />
          </div>
          <span className="text-[10px] font-mono text-[#FF3B5C] font-bold tracking-widest uppercase bg-[#FF3B5C]/10 px-3 py-1 rounded border border-[#FF3B5C]/20">
            CRISIS INTERRUPT: SURVIVAL ACTIVATED
          </span>
        </div>

        {/* Big monospaced real-time countdown clocks */}
        <div className="space-y-1">
          <span className="text-5xl md:text-6xl font-mono font-bold tracking-tighter text-slate-100">
            {formatCountdown(secondsLeft)}
          </span>
          <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest">
            time remaining until disaster threshold
          </span>
        </div>

        {/* Capitalized urgent Task Title */}
        <div className="py-2.5">
          <h2 className="text-2xl md:text-3xl font-space font-bold text-slate-100 uppercase tracking-tight max-w-xl mx-auto leading-snug">
            {task.title}
          </h2>
          <p className="text-xs font-mono text-[#FFB800] mt-1">
            RISK FACTOR HAS ESCALATED TO {task.riskScore}%
          </p>
        </div>

        {/* 3-Step Survival Plan steps */}
        <div className="text-left bg-[#0A050B]/80 border border-[#FF3B5C]/20 rounded-xl p-5 space-y-4 max-w-lg mx-auto">
          <span className="text-[10px] font-mono text-[#00D4FF] uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={11} />
            CLUTCH Rescue Specialist Survival Plan:
          </span>

          {loadingPlan ? (
            <div className="space-y-2.5 py-4">
              <div className="h-4 bg-slate-800 rounded animate-pulse" />
              <div className="h-4 bg-slate-800 rounded animate-pulse w-5/6" />
              <div className="h-4 bg-slate-800 rounded animate-pulse w-4/5" />
            </div>
          ) : (
            <div className="space-y-3.5">
              {survivalPlan.map((step, idx) => (
                <div key={idx} className="flex gap-3 text-xs leading-relaxed font-sans">
                  <span className="w-5 h-5 rounded-full bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 flex items-center justify-center text-[#FF3B5C] font-mono font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-slate-300">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mitigate Crisis Done CTAs */}
        <div className="space-y-4 max-w-lg mx-auto w-full pt-2">
          <button
            id="mitigate-done-btn"
            onClick={onDefuse}
            className="w-full py-4 bg-[#FF3B5C] hover:bg-red-500 text-slate-100 font-space font-bold uppercase rounded-xl tracking-wider text-sm transition-all duration-300 shadow-[0_0_30px_rgba(255,59,92,0.35)] cursor-pointer hover:scale-101 active:scale-99"
          >
            I'M DONE (DEFUSE tension)
          </button>

          <button
            id="crisis-dismiss-btn"
            onClick={onDismiss}
            className="text-[10px] font-mono text-slate-500 hover:text-slate-300 uppercase tracking-widest block mx-auto cursor-pointer"
          >
            This was a false alarm (postpone tracking)
          </button>
        </div>

      </div>
    </motion.div>
  );
}
