/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Trash2, Clock, Check, Info, Sparkles } from 'lucide-react';
import { Task, UserProfile, AgentLog, SubTask } from '../../types';
import { firebaseService } from '../../services/firebase';

import HeroSection from './HeroSection';
import TaskMatrix from './TaskMatrix';
import TaskParser from './TaskParser';
import DiagnosticsPanel from './AgentLog/DiagnosticsPanel';
import AgentTimeline from './AgentLog/AgentTimeline';
import ChatPanel from './Chat/ChatPanel';
import CrisisTakeoverOverlay from './CrisisMode';
import RiskGauge from './RiskGauge';

interface DashboardProps {
  user: UserProfile;
  activeTab: 'dashboard' | 'logs';
  setActiveTab: (tab: 'dashboard' | 'logs') => void;
}

export default function Dashboard({ user, activeTab, setActiveTab }: DashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'monitoring' | 'evaluating' | 'recovery' | 'scheduling' | 'dispatch'>('monitoring');

  // Task details and microtask list editing state
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [isCoachExpanded, setIsCoachExpanded] = useState(true);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<'academic' | 'work' | 'personal' | 'finance'>('work');
  const [editComplexity, setEditComplexity] = useState<'low' | 'medium' | 'high'>('medium');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editDeadline, setEditDeadline] = useState('');
  const [editDuration, setEditDuration] = useState(60);
  const [editSubtasks, setEditSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDuration, setNewSubtaskDuration] = useState(15);

  // Synchronize editing inputs with selected task details
  useEffect(() => {
    if (selectedTask) {
      setEditTitle(selectedTask.title);
      setEditCategory(selectedTask.category);
      setEditComplexity(selectedTask.complexity);
      setEditPriority(selectedTask.priority);
      
      if (selectedTask.deadline) {
        const date = new Date(selectedTask.deadline);
        const pad = (num: number) => String(num).padStart(2, '0');
        const formatted = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        setEditDeadline(formatted);
      } else {
        setEditDeadline('');
      }
      
      setEditDuration(selectedTask.estimatedDuration);
      setEditSubtasks(selectedTask.subtasks || []);
      setNewSubtaskTitle('');
      setNewSubtaskDuration(15);
    } else {
      setIsEditingTask(false);
    }
  }, [selectedTask]);

  // Load Initial Session Data
  useEffect(() => {
    const loadSession = async () => {
      const allTasks = await firebaseService.getTasks();
      const allLogs = await firebaseService.getAgentLogs();
      setTasks(allTasks);
      setLogs(allLogs);

      // Warm up and evaluate active tasks on launch
      setTimeout(async () => {
        try {
          await firebaseService.runTaskMonitorCycle();
          const refreshedTasks = await firebaseService.getTasks();
          const refreshedLogs = await firebaseService.getAgentLogs();
          setTasks(refreshedTasks);
          setLogs(refreshedLogs);
        } catch (e) {
          console.error('Initial background monitoring cycle failed:', e);
        }
      }, 1000);
    };
    loadSession();

    // Setup periodic automatic evaluation every 20 seconds in UI
    const interval = setInterval(async () => {
      try {
        await firebaseService.runTaskMonitorCycle();
        const refreshedTasks = await firebaseService.getTasks();
        const refreshedLogs = await firebaseService.getAgentLogs();
        setTasks(refreshedTasks);
        setLogs(refreshedLogs);
      } catch (e) {
        console.error('Periodic background monitoring cycle failed:', e);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent<'monitoring' | 'evaluating' | 'recovery' | 'scheduling' | 'dispatch'>;
      if (customEvent.detail) {
        setAgentStatus(customEvent.detail);
      }
    };
    window.addEventListener('clutch-agent-status', handleStatusChange);
    return () => window.removeEventListener('clutch-agent-status', handleStatusChange);
  }, []);

  const getDisplayedStatus = (): 'monitoring' | 'evaluating' | 'recovery' | 'scheduling' | 'dispatch' => {
    const hasActiveFailures = logs.some(l => l.isFailure && l.status === 'failed_retrying');
    if (hasActiveFailures) {
      return 'recovery';
    }
    if (agentStatus === 'scheduling') {
      return 'scheduling';
    }
    if (agentStatus === 'dispatch') {
      return 'dispatch';
    }
    if (agentStatus === 'evaluating') {
      return 'evaluating';
    }
    return 'monitoring';
  };

  const getBadgeStyles = () => {
    const displayed = getDisplayedStatus();
    switch (displayed) {
      case 'evaluating':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          text: '🟡 Evaluating'
        };
      case 'recovery':
        return {
          bg: 'bg-red-500/10 border-red-500/30 text-red-400',
          text: '🔴 Recovery Active'
        };
      case 'scheduling':
        return {
          bg: 'bg-[#00D4FF]/10 border-[#00D4FF]/30 text-[#00D4FF]',
          text: '🔵 Calendar Scheduling'
        };
      case 'dispatch':
        return {
          bg: 'bg-[#7B61FF]/10 border-[#7B61FF]/30 text-[#7B61FF]',
          text: '🟣 Notification Dispatch'
        };
      default:
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          text: '🟢 Active Monitoring'
        };
    }
  };

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

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const completedCount = updatedSubtasks.filter(st => st.completed).length;
    const progressPercent = Math.round((completedCount / updatedSubtasks.length) * 100);

    await firebaseService.updateTask(taskId, {
      subtasks: updatedSubtasks,
      progress: progressPercent,
      completedSteps: completedCount
    });

    if (progressPercent === 100) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
      
      await firebaseService.addAgentLog({
        taskId,
        taskTitle: task.title,
        actionType: 'do_nothing',
        actionTaken: 'Task Accomplished',
        reason: `User successfully checked off all micro-steps. Risk dropped to 0%.`,
        isAgentInitiated: false
      });
    } else {
      // Trigger the Task Monitor & Risk Assessor Agents on progress updates
      setTimeout(async () => {
        try {
          await firebaseService.runTaskMonitorCycle(taskId);
          await refreshData();
        } catch (e) {
          console.error('Toggle subtask evaluation failed:', e);
        }
      }, 300);
    }

    await refreshData();
  };

  const handleDeleteTask = async (taskId: string) => {
    await firebaseService.deleteTask(taskId);
    setSelectedTask(null);
    await refreshData();
  };

  const activeTasks = tasks.filter(t => t.status === 'active');
  const highestRiskTask = [...activeTasks].sort((a, b) => b.riskScore - a.riskScore)[0] || null;

  const totalFocusTimeMins = activeTasks.reduce((sum, t) => sum + t.estimatedDuration * (1 - t.progress / 100), 0);
  const totalFocusHours = Math.floor(totalFocusTimeMins / 60);
  const totalFocusMins = Math.round(totalFocusTimeMins % 60);

  const crisisCount = activeTasks.filter(t => t.riskScore >= 80).length;

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
        {highestRiskTask && highestRiskTask.riskScore >= 80 && (
          <CrisisTakeoverOverlay
            task={highestRiskTask}
            onDefuse={async () => {
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
              const fourHoursLater = new Date(Date.now() + 4.5 * 3600 * 1000).toISOString();
              await firebaseService.updateTask(highestRiskTask.id, {
                deadline: fourHoursLater
              });
              await refreshData();
            }}
          />
        )}
      </AnimatePresence>

      <main className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto">
        {activeTab === 'dashboard' ? (
          <>
            <HeroSection
              activeTasks={activeTasks}
              highestRiskTask={highestRiskTask}
              totalFocusHours={totalFocusHours}
              totalFocusMins={totalFocusMins}
              crisisCount={crisisCount}
              setActiveTab={setActiveTab}
            />

            <TaskParser
              onRefresh={refreshData}
              setSelectedTask={setSelectedTask}
            />

            <TaskMatrix
              activeTasks={activeTasks}
              highestRiskTask={highestRiskTask}
              onSelectTask={setSelectedTask}
            />
          </>
        ) : (
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
              <div className="flex items-center gap-3">
                <button
                  id="run-agent-scan-btn"
                  onClick={async () => {
                    try {
                      await firebaseService.runTaskMonitorCycle(undefined, true);
                      await refreshData();
                    } catch (e) {
                      console.error('Manual assessment scan failed:', e);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 bg-[#091524] border border-[#1A2E46] hover:border-[#7B61FF]/40 text-slate-300 hover:text-slate-100 rounded text-xs font-mono transition-all cursor-pointer shadow-md uppercase tracking-wider ${
                    agentStatus === 'evaluating' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={agentStatus === 'evaluating'}
                >
                  🤖 Run Risk Assessor
                </button>
                <div className={`flex items-center gap-1.5 border px-3 py-1 rounded text-xs font-mono transition-all duration-300 ${getBadgeStyles().bg}`}>
                  <Activity size={13} className="animate-pulse" />
                  <span>{getBadgeStyles().text}</span>
                </div>
              </div>
            </div>

            <DiagnosticsPanel logs={logs} onRefresh={refreshData} />

            <div className="bg-[#0F1D30] border border-[#1A2E46] rounded-2xl p-6 shadow-lg space-y-6">
              <div className="flex items-start gap-3 bg-[#7B61FF]/10 p-4 rounded-xl border border-[#7B61FF]/30">
                <Info size={16} className="text-[#7B61FF] shrink-0 mt-0.5" />
                <div className="text-xs font-sans text-slate-300 leading-relaxed">
                  <strong className="text-slate-100">Audit Guidelines:</strong> All actions marked with a <span className="text-[#7B61FF] font-bold">Purple Accent</span> represent autonomous agent decisions made independently by the Clutch AI engine. Interactive reinforcement logs allow manual state calibrations.
                </div>
              </div>

              <AgentTimeline logs={logs} onRefresh={refreshData} />
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {selectedTask && (
          <>
            {/* Backdrop Overlay for standard drawer behaviour */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="fixed inset-0 bg-black/60 z-40"
            />
            {/* Fixed Sliding Sidebar/Drawer */}
            <motion.aside
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className={`fixed inset-y-0 right-0 z-50 h-screen bg-[#0E1A29] border-l border-[#1C2F46] flex flex-row shadow-2xl overflow-hidden transition-all duration-300 ${
                isCoachExpanded 
                  ? 'w-full sm:w-[820px] md:w-[880px]' 
                  : 'w-full sm:w-[420px] md:w-[480px]'
              }`}
            >
              {/* Left Column: Task details/forms */}
              <div className="w-full sm:w-[420px] md:w-[480px] h-full flex flex-col justify-between shrink-0">
                <div className="p-5 border-b border-[#1C2F46] flex justify-between items-center bg-[#0B1521]">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                      {isEditingTask ? 'Configuration Panel' : 'Operational Details'}
                    </span>
                    <h3 className="font-space font-bold text-slate-100 uppercase tracking-tight">
                      Task Command Center
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id="toggle-coach-btn"
                      onClick={() => setIsCoachExpanded(!isCoachExpanded)}
                      className={`text-xs font-mono px-2.5 py-1 rounded cursor-pointer transition-all uppercase border flex items-center gap-1.5 ${
                        isCoachExpanded
                          ? 'bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/50'
                          : 'bg-[#122234] text-slate-300 border-[#1C2F46] hover:text-[#00D4FF] hover:border-[#00D4FF]/40'
                      }`}
                      title={isCoachExpanded ? 'Collapse AI Coach' : 'Expand AI Coach'}
                    >
                      <Sparkles size={11} className={isCoachExpanded ? 'text-[#00D4FF]' : 'text-slate-400'} />
                      {isCoachExpanded ? 'Hide Coach' : 'AI Coach'}
                    </button>
                    <button
                      id="toggle-edit-task-btn"
                      onClick={() => setIsEditingTask(!isEditingTask)}
                      className={`text-xs font-mono px-2.5 py-1 rounded cursor-pointer transition-all uppercase border ${
                        isEditingTask
                          ? 'bg-[#7B61FF]/20 text-[#7B61FF] border-[#7B61FF]/50'
                          : 'bg-[#122234] text-slate-300 border-[#1C2F46] hover:text-slate-100 hover:border-[#7B61FF]/40'
                      }`}
                    >
                      {isEditingTask ? 'Cancel' : 'Edit Details'}
                    </button>
                    <button
                      id="close-drawer-btn"
                      onClick={() => setSelectedTask(null)}
                      className="text-xs font-mono text-slate-400 hover:text-slate-100 cursor-pointer uppercase border border-[#1A2F45] px-2.5 py-1 rounded bg-[#07111C]"
                    >
                      Close &times;
                    </button>
                  </div>
                </div>

                {isEditingTask ? (
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const completedCount = editSubtasks.filter(st => st.completed).length;
                      const progressPercent = editSubtasks.length > 0 
                        ? Math.round((completedCount / editSubtasks.length) * 100) 
                        : 0;

                      try {
                        await firebaseService.updateTask(selectedTask.id, {
                          title: editTitle,
                          category: editCategory,
                          complexity: editComplexity,
                          priority: editPriority,
                          deadline: new Date(editDeadline).toISOString(),
                          estimatedDuration: editDuration,
                          subtasks: editSubtasks,
                          progress: progressPercent,
                          completedSteps: completedCount,
                          totalSteps: editSubtasks.length
                        });
                        
                        // Trigger a bypass evaluation cycle to recalculate risk autonomously
                        await firebaseService.runTaskMonitorCycle(undefined, true);
                        
                        await refreshData();
                        setIsEditingTask(false);
                      } catch (err) {
                        console.error('Failed to update task:', err);
                      }
                    }}
                    className="flex-1 overflow-y-auto p-5 space-y-5"
                  >
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Task Title
                      </label>
                      <input
                        id="edit-task-title-input"
                        type="text"
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-[#122234] border border-[#1E334D] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-[#7B61FF]/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                          Category
                        </label>
                        <select
                          id="edit-task-category-select"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as any)}
                          className="w-full bg-[#122234] border border-[#1E334D] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-[#7B61FF]/50 cursor-pointer"
                        >
                          <option value="academic">Academic</option>
                          <option value="work">Work</option>
                          <option value="personal">Personal</option>
                          <option value="finance">Finance</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                          Priority
                        </label>
                        <select
                          id="edit-task-priority-select"
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value as any)}
                          className="w-full bg-[#122234] border border-[#1E334D] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-[#7B61FF]/50 cursor-pointer"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                          Complexity
                        </label>
                        <select
                          id="edit-task-complexity-select"
                          value={editComplexity}
                          onChange={(e) => setEditComplexity(e.target.value as any)}
                          className="w-full bg-[#122234] border border-[#1E334D] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-[#7B61FF]/50 cursor-pointer"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                          Focus Workload (Mins)
                        </label>
                        <input
                          id="edit-task-duration-input"
                          type="number"
                          required
                          min={1}
                          value={editDuration}
                          onChange={(e) => setEditDuration(parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-[#122234] border border-[#1E334D] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-[#7B61FF]/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Deadline Date & Time
                      </label>
                      <input
                        id="edit-task-deadline-input"
                        type="datetime-local"
                        required
                        value={editDeadline}
                        onChange={(e) => setEditDeadline(e.target.value)}
                        className="w-full bg-[#122234] border border-[#1E334D] rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-[#7B61FF]/50 font-mono"
                      />
                    </div>

                    <div className="space-y-3 pt-4 border-t border-[#1C2F46]/50">
                      <h4 className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                        Configure Microtask Checklist
                      </h4>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {editSubtasks.map((st, index) => (
                          <div 
                            key={st.id} 
                            className="bg-[#0A121E]/80 border border-[#1C2F46] p-2.5 rounded-lg flex flex-col gap-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-mono text-slate-500 uppercase">
                                Step #{index + 1}
                              </span>
                              
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (index === 0) return;
                                    const copy = [...editSubtasks];
                                    const temp = copy[index];
                                    copy[index] = copy[index - 1];
                                    copy[index - 1] = temp;
                                    setEditSubtasks(copy);
                                  }}
                                  disabled={index === 0}
                                  className={`p-1 bg-[#122234] hover:bg-[#1E334D] rounded text-slate-400 hover:text-slate-200 cursor-pointer text-[10px] ${
                                    index === 0 ? 'opacity-30 cursor-not-allowed' : ''
                                  }`}
                                  title="Move Up"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (index === editSubtasks.length - 1) return;
                                    const copy = [...editSubtasks];
                                    const temp = copy[index];
                                    copy[index] = copy[index + 1];
                                    copy[index + 1] = temp;
                                    setEditSubtasks(copy);
                                  }}
                                  disabled={index === editSubtasks.length - 1}
                                  className={`p-1 bg-[#122234] hover:bg-[#1E334D] rounded text-slate-400 hover:text-slate-200 cursor-pointer text-[10px] ${
                                    index === editSubtasks.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
                                  }`}
                                  title="Move Down"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy = editSubtasks.filter((_, idx) => idx !== index);
                                    setEditSubtasks(copy);
                                  }}
                                  className="p-1 bg-[#2C1318] hover:bg-[#4E1D24] rounded text-red-400 hover:text-red-300 cursor-pointer ml-1"
                                  title="Remove Step"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                              <input
                                type="text"
                                required
                                value={st.title}
                                onChange={(e) => {
                                  const copy = [...editSubtasks];
                                  copy[index] = { ...st, title: e.target.value };
                                  setEditSubtasks(copy);
                                }}
                                className="col-span-3 bg-[#122234] border border-[#1E334D] rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-[#7B61FF]/40"
                                placeholder="Step name..."
                              />
                              <input
                                type="number"
                                required
                                min={1}
                                value={st.durationMinutes}
                                onChange={(e) => {
                                  const copy = [...editSubtasks];
                                  copy[index] = { ...st, durationMinutes: parseInt(e.target.value, 10) || 0 };
                                  setEditSubtasks(copy);
                                }}
                                className="col-span-1 bg-[#122234] border border-[#1E334D] rounded px-2 py-1 text-slate-200 text-xs text-center focus:outline-none focus:border-[#7B61FF]/40"
                                placeholder="Mins"
                                title="Duration (minutes)"
                              />
                            </div>
                          </div>
                        ))}

                        {editSubtasks.length === 0 && (
                          <div className="text-center py-6 border border-dashed border-[#1C2F46] rounded-xl text-slate-500 text-xs">
                            No steps in checklist. Add one below!
                          </div>
                        )}
                      </div>

                      <div className="bg-[#091523]/60 border border-[#1C2F46]/50 p-3 rounded-xl space-y-2.5">
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wide block">
                          ➕ Append New Step
                        </span>
                        <div className="flex gap-2">
                          <input
                            id="new-step-title-input"
                            type="text"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            placeholder="Add checklist action..."
                            className="flex-1 bg-[#122234] border border-[#1E334D] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-[#7B61FF]/40"
                          />
                          <input
                            id="new-step-duration-input"
                            type="number"
                            min={1}
                            value={newSubtaskDuration}
                            onChange={(e) => setNewSubtaskDuration(parseInt(e.target.value, 10) || 0)}
                            placeholder="Mins"
                            className="w-16 bg-[#122234] border border-[#1E334D] rounded-lg px-2 py-1.5 text-slate-200 text-xs text-center focus:outline-none focus:border-[#7B61FF]/40"
                            title="Focus minutes"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newSubtaskTitle.trim()) return;
                              const newSub: SubTask = {
                                id: 'sub-' + Math.random().toString(36).substr(2, 9),
                                title: newSubtaskTitle.trim(),
                                completed: false,
                                durationMinutes: newSubtaskDuration,
                                sequenceNumber: editSubtasks.length + 1
                              };
                              setEditSubtasks([...editSubtasks, newSub]);
                              setNewSubtaskTitle('');
                              setNewSubtaskDuration(15);
                            }}
                            className="px-3 bg-[#7B61FF] hover:bg-[#684FE3] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-[#00E676] hover:bg-[#00c853] text-[#0D1B2A] text-xs font-bold uppercase font-space rounded-xl tracking-wider transition-colors cursor-pointer"
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingTask(false)}
                        className="px-4 py-2 bg-[#122234] hover:bg-[#1E334D] border border-[#1C2F46] text-slate-300 text-xs font-bold uppercase font-space rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex-1 overflow-y-auto p-5 space-y-6 flex flex-col justify-between">
                    <div className="space-y-6 flex-1">
                      <div className="flex flex-col items-center py-4 bg-[#0A121E]/60 rounded-2xl border border-[#1C2F46]/60">
                        <RiskGauge score={selectedTask.riskScore} size="lg" />
                        
                        <div className="w-4/5 text-center mt-3 space-y-1">
                          <p className="text-xs font-sans text-slate-300 font-medium">
                            Task progress checklist is {selectedTask.progress}% defused
                          </p>
                          <p className="text-[10px] font-mono text-slate-500">
                            Checked off {selectedTask.completedSteps} of {selectedTask.totalSteps} steps
                          </p>
                        </div>
                      </div>

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

                        <button
                          id="edit-details-inline-btn"
                          onClick={() => setIsEditingTask(true)}
                          className="w-full py-2.5 bg-[#7B61FF]/10 hover:bg-[#7B61FF]/20 border border-[#7B61FF]/30 hover:border-[#7B61FF]/50 text-[#7B61FF] hover:text-slate-100 text-xs font-mono uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
                        >
                          ⚙️ Configure Task & Checklist
                        </button>

                        <button
                          id="toggle-coach-inline-btn"
                          onClick={() => setIsCoachExpanded(!isCoachExpanded)}
                          className={`w-full py-2.5 border text-xs font-mono uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 ${
                            isCoachExpanded
                              ? 'bg-[#00D4FF]/10 hover:bg-[#00D4FF]/20 border-[#00D4FF]/30 hover:border-[#00D4FF]/50 text-[#00D4FF] hover:text-slate-100'
                              : 'bg-[#00D4FF]/20 hover:bg-[#00D4FF]/30 border-[#00D4FF]/40 hover:border-[#00D4FF]/60 text-[#00D4FF] hover:text-slate-100'
                          }`}
                        >
                          <Sparkles size={13} />
                          {isCoachExpanded ? 'Collapse AI Decision Coach' : 'Consult AI Decision Coach'}
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#1C2F46]/50 flex justify-between items-center shrink-0">
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
                )}
              </div>

              {/* Right Column: AI Decision Coach */}
              {isCoachExpanded && (
                <ChatPanel
                  task={selectedTask}
                  hoursRemaining={(new Date(selectedTask.deadline).getTime() - Date.now()) / (1000 * 3600)}
                  onRescheduleCompleted={refreshData}
                />
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
