/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Trash2, Clock, Check, Info, Sparkles, Play, Pause, Square, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import { Task, UserProfile, AgentLog, SubTask } from '../../types';
import { firebaseService } from '../../services/firebase';

import HeroSection from './HeroSection';
import TaskMatrix from './TaskMatrix';
import TaskParser from './TaskParser';
import DiagnosticsPanel from './AgentLog/DiagnosticsPanel';
import CalendarDiagnostics from './AgentLog/CalendarDiagnostics';
import AgentTimeline from './AgentLog/AgentTimeline';
import ChatPanel from './Chat/ChatPanel';
import CrisisTakeoverOverlay from './CrisisMode';
import RiskGauge from './RiskGauge';
import CalendarView from './CalendarView';
import { formatHumanFriendlyDeadline } from '../../utils/dateUtils';
import Button from '../../components/Button';

interface DashboardProps {
  user: UserProfile;
  activeTab: 'dashboard' | 'calendar' | 'logs';
  setActiveTab: (tab: 'dashboard' | 'calendar' | 'logs') => void;
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

  // Active Focus Session States
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(null);
  const [focusTimeLeft, setFocusTimeLeft] = useState<number>(45 * 60); // 45 minutes default
  const [isFocusPaused, setIsFocusPaused] = useState<boolean>(false);
  const [showProgressPrompt, setShowProgressPrompt] = useState<boolean>(false);
  const [completedFocusTask, setCompletedFocusTask] = useState<Task | null>(null);
  const [feedbackProgress, setFeedbackProgress] = useState<number>(30); // Slider input percentage

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeFocusTask && !isFocusPaused) {
      interval = setInterval(() => {
        setFocusTimeLeft((prev) => {
          if (prev <= 1) {
            if (interval) clearInterval(interval);
            handleFocusSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeFocusTask, isFocusPaused]);

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
          bg: 'bg-[#FBBF24]/10 border-[#FBBF24]/30 text-[#FBBF24] shadow-[0_0_10px_rgba(251,191,36,0.15)] backdrop-blur-md',
          text: '🟡 Evaluating'
        };
      case 'recovery':
        return {
          bg: 'bg-[#FF6B6B]/10 border-[#FF6B6B]/30 text-[#FF6B6B] shadow-[0_0_10px_rgba(255,107,107,0.15)] backdrop-blur-md',
          text: '🔴 Recovery Active'
        };
      case 'scheduling':
        return {
          bg: 'bg-[#38BDF8]/10 border-[#38BDF8]/30 text-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.15)] backdrop-blur-md',
          text: '🔵 Calendar Scheduling'
        };
      case 'dispatch':
        return {
          bg: 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 text-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.15)] backdrop-blur-md',
          text: '🟣 Notification Dispatch'
        };
      default:
        return {
          bg: 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.15)] backdrop-blur-md',
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

  // Active Focus Session Actions
  const handleFocusSessionComplete = async () => {
    if (!activeFocusTask) return;
    const finishedTask = activeFocusTask;

    await firebaseService.updateTask(finishedTask.id, { inProgress: false });

    await firebaseService.addAgentLog({
      taskId: finishedTask.id,
      taskTitle: finishedTask.title,
      actionType: 'do_nothing',
      actionTaken: 'Focus Session Completed',
      reason: `Operator successfully completed a 45-minute deep focus sprint on "${finishedTask.title}".`,
      isAgentInitiated: false,
      agentType: 'TASK_MONITOR'
    });

    await firebaseService.addNotification({
      title: '🎯 Focus Sprint Complete',
      body: `Congratulations! You focused on "${finishedTask.title}" for 45 minutes. Calibrate your progress now.`,
      type: 'success'
    });

    setCompletedFocusTask(finishedTask);
    setFeedbackProgress(finishedTask.progress);
    setShowProgressPrompt(true);
    setActiveFocusTask(null);
    await refreshData();
  };

  const handleStartFocusSession = async (task: Task) => {
    if (activeFocusTask) {
      // Gracefully terminate existing focus session
      await firebaseService.updateTask(activeFocusTask.id, { inProgress: false });
    }

    await firebaseService.updateTask(task.id, { inProgress: true });

    await firebaseService.addAgentLog({
      taskId: task.id,
      taskTitle: task.title,
      actionType: 'do_nothing',
      actionTaken: 'Focus Session Commenced',
      reason: `Operator locked into a dedicated deep-work focus sprint on "${task.title}".`,
      isAgentInitiated: false,
      agentType: 'TASK_MONITOR'
    });

    await firebaseService.addNotification({
      title: '⏳ Focus Sprint Commenced',
      body: `Deep focus locked. Commencing a 45-minute sprint for "${task.title}".`,
      type: 'info'
    });

    setActiveFocusTask(task);
    setFocusTimeLeft(45 * 60); // 45 minutes countdown
    setIsFocusPaused(false);
    await refreshData();
  };

  const handlePauseFocusSession = () => {
    setIsFocusPaused(true);
  };

  const handleResumeFocusSession = () => {
    setIsFocusPaused(false);
  };

  const handleStopFocusSession = async () => {
    if (!activeFocusTask) return;
    const stoppedTask = activeFocusTask;

    await firebaseService.updateTask(stoppedTask.id, { inProgress: false });

    await firebaseService.addAgentLog({
      taskId: stoppedTask.id,
      taskTitle: stoppedTask.title,
      actionType: 'do_nothing',
      actionTaken: 'Focus Session Terminated',
      reason: `Operator aborted active deep focus sprint on "${stoppedTask.title}".`,
      isAgentInitiated: false,
      agentType: 'TASK_MONITOR'
    });

    setCompletedFocusTask(stoppedTask);
    setFeedbackProgress(stoppedTask.progress);
    setShowProgressPrompt(true);
    setActiveFocusTask(null);
    await refreshData();
  };

  const handleSubmitProgressFeedback = async () => {
    if (!completedFocusTask) return;

    const isCompleted = feedbackProgress >= 100;
    const status = isCompleted ? 'completed' : 'active';

    const subtasksCount = completedFocusTask.subtasks.length;
    const updatedSubtasks = completedFocusTask.subtasks.map((st, idx) => {
      const ratio = (idx + 1) / subtasksCount;
      return {
        ...st,
        completed: ratio <= feedbackProgress / 100
      };
    });
    const completedCount = updatedSubtasks.filter(st => st.completed).length;

    await firebaseService.updateTask(completedFocusTask.id, {
      progress: feedbackProgress,
      status: isCompleted ? 'completed' : 'active',
      subtasks: updatedSubtasks,
      completedSteps: completedCount
    });

    await firebaseService.addAgentLog({
      taskId: completedFocusTask.id,
      taskTitle: completedFocusTask.title,
      actionType: 'do_nothing',
      actionTaken: isCompleted ? 'Task Accomplished' : 'Progress Registered',
      reason: `Progress recalibrated to ${feedbackProgress}% post focus sprint.`,
      isAgentInitiated: false,
      agentType: 'TASK_MONITOR'
    });

    setShowProgressPrompt(false);
    setCompletedFocusTask(null);

    // Trigger immediate risk evaluation
    window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'evaluating' }));
    setTimeout(async () => {
      try {
        await firebaseService.runTaskMonitorCycle(completedFocusTask.id, true);
      } catch (err) {
        console.error('Post focus assessment failed:', err);
      }
      await refreshData();
    }, 1000);
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
    <div className="flex-1 w-full flex flex-col md:flex-row bg-transparent relative min-h-[calc(100vh-65px)]">
      
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
        {activeTab === 'dashboard' && (
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
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            tasks={tasks}
            logs={logs}
            onSelectTask={setSelectedTask}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'logs' && (
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
                <Button
                  id="run-agent-scan-btn"
                  onClick={async () => {
                    try {
                      await firebaseService.runTaskMonitorCycle(undefined, true);
                      await refreshData();
                    } catch (e) {
                      console.error('Manual assessment scan failed:', e);
                    }
                  }}
                  variant="secondary"
                  size="sm"
                  disabled={agentStatus === 'evaluating'}
                >
                  🤖 Run Risk Assessor
                </Button>
                <div className={`flex items-center gap-1.5 border px-3 py-1 rounded text-xs font-mono transition-all duration-300 ${getBadgeStyles().bg}`}>
                  <Activity size={13} className="animate-pulse" />
                  <span>{getBadgeStyles().text}</span>
                </div>
              </div>
            </div>

            <DiagnosticsPanel logs={logs} onRefresh={refreshData} />

            <CalendarDiagnostics />

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
              className={`fixed inset-y-0 right-0 z-50 h-screen bg-[#0E1A29] border-l border-[#1C2F46] flex flex-col lg:flex-row shadow-2xl overflow-hidden transition-all duration-300 ${
                isCoachExpanded 
                  ? 'w-full lg:w-[880px]' 
                  : 'w-full sm:w-[420px] md:w-[480px]'
              }`}
            >
              {/* Left Column: Task details/forms */}
              <div className={`w-full lg:w-[480px] flex flex-col justify-between shrink-0 overflow-y-auto ${
                isCoachExpanded ? 'h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-[#1C2F46]' : 'h-full'
              }`}>
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
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        className="flex-1"
                      >
                        Save Changes
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setIsEditingTask(false)}
                        variant="ghost"
                        size="sm"
                      >
                        Cancel
                      </Button>
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

                      {/* Dynamic Task Metadata Grid with Human-Friendly Deadline */}
                      <div className="grid grid-cols-2 gap-3 bg-[#0C1623] p-4 rounded-xl border border-[#1C2F46]/50">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Category</span>
                          <p className="text-xs font-sans font-bold text-slate-200 capitalize">
                            {selectedTask.category === 'academic' ? '🎓 Academic' : 
                             selectedTask.category === 'work' ? '💼 Work' :
                             selectedTask.category === 'personal' ? '👤 Personal' : '💳 Finance'}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Complexity</span>
                          <p className="text-xs font-sans font-bold text-[#00D4FF] capitalize">
                            {selectedTask.complexity} Complexity
                          </p>
                        </div>
                        <div className="space-y-0.5 col-span-2 border-t border-[#1C2F46]/30 pt-2 flex justify-between items-center">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Deadline</span>
                            <p className="text-xs font-sans font-bold text-slate-200">
                              🕒 {formatHumanFriendlyDeadline(selectedTask.deadline)}
                            </p>
                          </div>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border backdrop-blur-md ${
                            selectedTask.priority === 'high' ? 'bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]/25 shadow-[0_0_8px_rgba(255,107,107,0.1)]' :
                            selectedTask.priority === 'medium' ? 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/25 shadow-[0_0_8px_rgba(251,191,36,0.1)]' :
                            'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/25 shadow-[0_0_8px_rgba(34,197,94,0.1)]'
                          }`}>
                            {selectedTask.priority} priority
                          </span>
                        </div>
                      </div>

                      {/* Active Focus Session Button */}
                      <Button
                        id="start-focus-session-btn"
                        onClick={() => {
                          handleStartFocusSession(selectedTask);
                          setSelectedTask(null);
                        }}
                        variant="primary"
                        size="md"
                        className="w-full mt-2"
                      >
                        <Play size={14} className="fill-white" />
                        ⚡ Start Sprint Focus Session
                      </Button>

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

                        <Button
                          id="edit-details-inline-btn"
                          onClick={() => setIsEditingTask(true)}
                          variant="secondary"
                          size="sm"
                          className="w-full mt-4 flex items-center justify-center gap-2 text-xs font-mono"
                        >
                          ⚙️ Configure Task & Checklist
                        </Button>

                        <Button
                          id="toggle-coach-inline-btn"
                          onClick={() => setIsCoachExpanded(!isCoachExpanded)}
                          variant={isCoachExpanded ? "secondary" : "primary"}
                          size="sm"
                          className="w-full mt-2 flex items-center justify-center gap-2 text-xs font-mono"
                        >
                          {isCoachExpanded ? 'Collapse AI Decision Coach' : 'Consult AI Decision Coach'}
                        </Button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#1C2F46]/50 flex justify-between items-center shrink-0">
                      <span className="text-[10px] font-mono text-slate-500">
                        Registered {formatHumanFriendlyDeadline(selectedTask.createdAt)}
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
                <div className="w-full lg:flex-1 h-1/2 lg:h-full overflow-y-auto">
                  <ChatPanel
                    task={selectedTask}
                    hoursRemaining={(new Date(selectedTask.deadline).getTime() - Date.now()) / (1000 * 3600)}
                    onRescheduleCompleted={refreshData}
                  />
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Floating Focus HUD Panel */}
      <AnimatePresence>
        {activeFocusTask && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 w-[calc(100vw-32px)] sm:w-[380px] bg-[#0E1A29]/95 border border-[#00D4FF]/40 backdrop-blur-md rounded-2xl p-4 shadow-[0_0_25px_rgba(0,212,255,0.15)] flex flex-col gap-3 text-slate-100 transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isFocusPaused ? 'bg-amber-400' : 'bg-[#00D4FF]'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isFocusPaused ? 'bg-amber-500' : 'bg-[#00D4FF]'}`}></span>
                </span>
                <div className="min-w-0">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
                    {activeFocusTask.category} SPRINT SESS
                  </span>
                  <h4 className="text-xs font-sans font-bold truncate text-slate-100">
                    {activeFocusTask.title}
                  </h4>
                </div>
              </div>

              {/* Large monospaced timer displays minutes and seconds */}
              <div className="text-xl font-mono font-bold tracking-tight text-[#00D4FF] bg-[#07111C] px-3 py-1 rounded-lg border border-[#1A2F45]">
                {(() => {
                  const minutes = Math.floor(focusTimeLeft / 60);
                  const seconds = focusTimeLeft % 60;
                  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                })()}
              </div>
            </div>

            {/* Slider progress track */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className={isFocusPaused ? 'text-amber-400' : 'text-[#00E676] animate-pulse'}>
                  {isFocusPaused ? '⏸️ SPRINT PAUSED' : '⚡ SPRINT ACTIVE'}
                </span>
                <span className="text-slate-400">
                  {Math.round((focusTimeLeft / (45 * 60)) * 100)}% left
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#07111C] rounded-full overflow-hidden border border-[#1A2F45]">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${isFocusPaused ? 'bg-amber-500' : 'bg-gradient-to-r from-[#00E676] to-[#00D4FF]'}`}
                  style={{ width: `${(focusTimeLeft / (45 * 60)) * 100}%` }}
                />
              </div>
            </div>

            {/* Control triggers */}
            <div className="flex items-center justify-between border-t border-[#1C2F46]/60 pt-2.5 mt-0.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                Survival dashboard HUD
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={isFocusPaused ? handleResumeFocusSession : handlePauseFocusSession}
                  className="p-2 bg-[#122234] hover:bg-[#1E334D] border border-[#1C2F46] hover:border-[#00D4FF]/30 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
                  title={isFocusPaused ? 'Resume Sprint' : 'Pause Sprint'}
                >
                  {isFocusPaused ? <Play size={13} className="fill-slate-300" /> : <Pause size={13} className="fill-slate-300" />}
                </button>
                <button
                  onClick={handleStopFocusSession}
                  className="p-2 bg-[#2D1217] hover:bg-[#4D1D23] border border-red-500/20 hover:border-red-500/50 rounded-lg text-red-400 hover:text-red-300 transition-all cursor-pointer"
                  title="Stop Focus Session"
                >
                  <Square size={13} className="fill-red-400" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Calibration Modal */}
      <AnimatePresence>
        {showProgressPrompt && completedFocusTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-[#0F1D30] border border-[#1A2E46] rounded-2xl p-6 shadow-2xl space-y-5 text-slate-100"
            >
              <div className="text-center space-y-1">
                <span className="text-[10px] font-mono text-[#00D4FF] uppercase tracking-widest block font-bold">
                  🎯 Task Progress Calibration
                </span>
                <h3 className="text-base font-space font-bold uppercase tracking-tight text-slate-200">
                  Defusal Calibration Audit
                </h3>
                <p className="text-xs text-slate-400">
                  Sprint complete on: <span className="text-slate-200 font-semibold italic">"{completedFocusTask.title}"</span>
                </p>
              </div>

              {/* Slider Input */}
              <div className="bg-[#07111C] p-4 rounded-xl border border-[#1A2F45] space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-400 uppercase">
                    Completion Status
                  </span>
                  <span className="text-lg font-mono font-bold text-[#00D4FF]">
                    {feedbackProgress}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={feedbackProgress}
                  onChange={(e) => setFeedbackProgress(parseInt(e.target.value, 10))}
                  className="w-full accent-[#00D4FF] bg-slate-800 rounded-lg h-2 cursor-pointer"
                />

                <div className="text-center py-1">
                  <span className={`text-[10px] font-mono px-3 py-1 rounded border uppercase ${
                    feedbackProgress >= 100 
                      ? 'bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]' 
                      : feedbackProgress >= 70 
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                        : feedbackProgress >= 30 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                          : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                  }`}>
                    {feedbackProgress >= 100 
                      ? '🏁 100% COMPLETE & DEFUSED' 
                      : feedbackProgress >= 70 
                        ? 'Polishing & Final Testing' 
                        : feedbackProgress >= 30 
                          ? 'Deep Implementation' 
                          : 'Draft Stage / Foundations'}
                  </span>
                </div>
              </div>

              {/* Calibration Shortcut Actions */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">
                  Quick adjustments
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackProgress(prev => Math.min(100, prev + 20))}
                    className="flex-1 py-2 bg-[#14263B] hover:bg-[#1E334D] border border-[#1C2F46] rounded-lg text-xs font-mono transition-all cursor-pointer hover:text-white"
                  >
                    +20%
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackProgress(prev => Math.min(100, prev + 50))}
                    className="flex-1 py-2 bg-[#14263B] hover:bg-[#1E334D] border border-[#1C2F46] rounded-lg text-xs font-mono transition-all cursor-pointer hover:text-white"
                  >
                    +50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackProgress(100)}
                    className="flex-1 py-2 bg-[#00E676]/20 hover:bg-[#00E676]/30 border border-[#00E676]/40 rounded-lg text-xs font-mono text-[#00E676] transition-all cursor-pointer uppercase font-bold"
                  >
                    100%
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleSubmitProgressFeedback}
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#00E676] to-[#00D4FF] hover:from-[#00E676]/90 hover:to-[#00D4FF]/90 text-[#0D1B2A] text-xs font-bold font-space uppercase rounded-xl tracking-wider transition-all cursor-pointer shadow-lg"
                >
                  Confirm Calibration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
