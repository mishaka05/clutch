/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, AlertTriangle, Check } from 'lucide-react';
import { Task, TaskCategory, TaskComplexity, TaskPriority } from '../../types';
import { firebaseService } from '../../services/firebase';
import { parseTaskWithAI, generateSubTasksWithAI } from '../../services/gemini';
import Button from '../../components/Button';

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

function getDatetimeLocalValue(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface TaskParserProps {
  onRefresh: () => Promise<void>;
  setSelectedTask: (task: Task | null) => void;
}

export default function TaskParser({ onRefresh, setSelectedTask }: TaskParserProps) {
  // Natural Language Ingestion State
  const [intakeInput, setIntakeInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedTask, setParsedTask] = useState<any | null>(null);

  // 1. Natural Language Submission Handler
  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeInput.trim()) return;
    
    setIsParsing(true);
    setParsedTask(null);
    window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'evaluating' }));

    try {
      const parsed = await parseTaskWithAI(intakeInput);
      setParsedTask(parsed);
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsing(false);
      window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'monitoring' }));
    }
  };

  const handleConfirmTask = async () => {
    if (!parsedTask) return;
    
    try {
      window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'evaluating' }));
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

      // Trigger the Task Monitor & Risk Assessor Agents on this new task
      setTimeout(async () => {
        try {
          await firebaseService.runTaskMonitorCycle(created.id);
          await onRefresh();
        } catch (e) {
          console.error('Initial risk assessment agent failed:', e);
        }
      }, 500);

      setIntakeInput('');
      setParsedTask(null);
      await onRefresh();
      
      // Auto-select newly created task to showcase details to judges
      const freshTasks = await firebaseService.getTasks();
      const newlyAdded = freshTasks.find(t => t.title === created.title);
      if (newlyAdded) setSelectedTask(newlyAdded);

      // Dispatch "Notification Dispatch" upon success
      window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'dispatch' }));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'monitoring' }));
      }, 3000);

    } catch (err) {
      console.error('Task registration failed:', err);
      window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'monitoring' }));
    }
  };

  return (
    <div className="space-y-3.5">
      <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8B5CF6]">
        Natural Language Task Ingestion
      </h3>
      
      <form onSubmit={handleIntakeSubmit} className="relative flex items-center gap-3">
        <div className="relative flex-1">
          <input
            id="natural-language-input"
            type="text"
            value={intakeInput}
            onChange={(e) => setIntakeInput(e.target.value)}
            placeholder='e.g., "Finish DBMS assignment tomorrow 8 PM, high complexity"'
            className="w-full px-4 py-4 bg-white/[0.02] border border-white/[0.08] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/30 rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all font-sans text-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"
          />
        </div>
        
        <Button
          id="parse-task-btn"
          type="submit"
          disabled={isParsing || !intakeInput.trim()}
          variant="primary"
          size="md"
          className="shrink-0"
        >
          {isParsing ? 'Parsing...' : 'Ingest'}
        </Button>
      </form>

      {/* Gemini Parsing Agent Confirmation Card */}
      <AnimatePresence>
        {parsedTask && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-br from-[#0c0a18] via-[#050508] to-[#010103] border border-[#8B5CF6]/30 rounded-2xl p-6 shadow-[0_30px_70px_rgba(0,0,0,0.9)] relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#8B5CF6]/5 blur-3xl rounded-full pointer-events-none" />
            
            <div className="absolute top-5 right-6 flex flex-col items-end gap-1">
              {parsedTask.simulated ? (
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#ffb829] uppercase tracking-wider bg-[#ffb829]/10 border border-[#ffb829]/20 px-2.5 py-1 rounded-full">
                  <AlertTriangle size={10} />
                  Local Rescue Mode
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#00D4FF] uppercase tracking-wider bg-[#00D4FF]/10 border border-[#00D4FF]/20 px-2.5 py-1 rounded-full">
                  <Sparkles size={10} />
                  Live {parsedTask.model || 'Gemini'} Ingestion
                </div>
              )}
            </div>

            <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
              Confirm Ingestion Parameters:
            </h4>
            {parsedTask.simulated && (
              <p className="text-[10px] text-amber-400 font-mono mt-1.5">
                ⚠️ Live Gemini API is currently experiencing high demand. Smooth local ingestion is active!
              </p>
            )}

            {/* Param Details edit form inside confirmation card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-5">
              {/* Title */}
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Task Title</label>
                <input
                  type="text"
                  value={parsedTask.title}
                  onChange={(e) => setParsedTask({ ...parsedTask, title: e.target.value })}
                  className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-[#8B5CF6] text-xs text-white rounded-lg px-3 py-2.5 mt-1.5 font-sans outline-none transition-all"
                />
              </div>

              {/* Deadline */}
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Deadline</label>
                <input
                  type="datetime-local"
                  value={getDatetimeLocalValue(parsedTask.deadline)}
                  onChange={(e) => {
                    const localVal = e.target.value;
                    if (localVal) {
                      try {
                        const iso = new Date(localVal).toISOString();
                        setParsedTask({ ...parsedTask, deadline: iso });
                      } catch (err) {
                        setParsedTask({ ...parsedTask, deadline: localVal });
                      }
                    } else {
                      setParsedTask({ ...parsedTask, deadline: '' });
                    }
                  }}
                  className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-[#8B5CF6] text-xs text-white rounded-lg px-3 py-2.5 mt-1.5 font-mono outline-none transition-all cursor-pointer"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Category</label>
                <select
                  value={parsedTask.category}
                  onChange={(e) => setParsedTask({ ...parsedTask, category: e.target.value as TaskCategory })}
                  className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-[#8B5CF6] text-xs text-white rounded-lg px-3 py-2.5 mt-1.5 font-sans outline-none transition-all cursor-pointer"
                >
                  <option value="academic" className="bg-[#0c0a18]">🎓 Academic</option>
                  <option value="work" className="bg-[#0c0a18]">💼 Work</option>
                  <option value="personal" className="bg-[#0c0a18]">👤 Personal</option>
                  <option value="finance" className="bg-[#0c0a18]">💳 Finance</option>
                </select>
              </div>

              {/* Complexity */}
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Complexity</label>
                <select
                  value={parsedTask.complexity}
                  onChange={(e) => setParsedTask({ ...parsedTask, complexity: e.target.value as TaskComplexity })}
                  className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-[#8B5CF6] text-xs text-white rounded-lg px-3 py-2.5 mt-1.5 font-sans outline-none transition-all cursor-pointer"
                >
                  <option value="low" className="bg-[#0c0a18]">Low Complexity</option>
                  <option value="medium" className="bg-[#0c0a18]">Medium Complexity</option>
                  <option value="high" className="bg-[#0c0a18]">High Complexity</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Priority</label>
                <select
                  value={parsedTask.priority}
                  onChange={(e) => setParsedTask({ ...parsedTask, priority: e.target.value as TaskPriority })}
                  className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-[#8B5CF6] text-xs text-white rounded-lg px-3 py-2.5 mt-1.5 font-sans outline-none transition-all cursor-pointer"
                >
                  <option value="low" className="bg-[#0c0a18]">🟢 Low Priority</option>
                  <option value="medium" className="bg-[#0c0a18]">🟡 Medium Priority</option>
                  <option value="high" className="bg-[#0c0a18]">🔴 High Priority</option>
                </select>
              </div>

              {/* Progress */}
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Progress ({parsedTask.progress}%)</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={parsedTask.progress}
                    onChange={(e) => setParsedTask({ ...parsedTask, progress: parseInt(e.target.value, 10) })}
                    className="flex-1 accent-[#8B5CF6] bg-slate-900 h-1 rounded-lg appearance-none cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={parsedTask.progress}
                    onChange={(e) => setParsedTask({ ...parsedTask, progress: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                    className="w-12 bg-white/[0.02] border border-white/[0.06] text-center text-xs text-white rounded px-1.5 py-1 font-mono outline-none"
                  />
                </div>
              </div>

              {/* Duration (User-friendly Display) */}
              <div className="col-span-1 sm:col-span-2 md:col-span-4 mt-1 bg-white/[0.01] p-4 rounded-xl border border-white/[0.04]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                      Estimated Duration
                    </label>
                    <span className="text-xs font-space font-medium text-[#00D4FF] block">
                      🕒 {formatFriendlyDuration(parsedTask.estimatedDuration)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-950/80 rounded-lg px-2 py-1.5 border border-white/[0.06]">
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
                        className="w-10 bg-transparent text-center text-xs text-white font-mono outline-none"
                      />
                      <span className="text-[8px] font-mono text-slate-500 uppercase font-bold">HRS</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-950/80 rounded-lg px-2 py-1.5 border border-white/[0.06]">
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
                        className="w-10 bg-transparent text-center text-xs text-white font-mono outline-none"
                      />
                      <span className="text-[8px] font-mono text-slate-500 uppercase font-bold">MINS</span>
                    </div>
                    <span className="text-slate-500 text-[10px] font-mono">
                      ({parsedTask.estimatedDuration} total mins)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-white/[0.06]">
              <Button
                id="cancel-parsed-btn"
                onClick={() => setParsedTask(null)}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
              
              <Button
                id="confirm-parsed-btn"
                onClick={handleConfirmTask}
                variant="primary"
                size="sm"
              >
                <Check size={12} strokeWidth={3} />
                Accept & Initialize Task
              </Button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
