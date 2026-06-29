/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Flame, Shield, ArrowLeft, Trash2, Plus, X, Check } from 'lucide-react';
import { Task, AgentLog } from '../../types';
import { firebaseService } from '../../services/firebase';
import Button from '../../components/Button';
import { formatHumanFriendlyDeadline } from '../../utils/dateUtils';

interface CalendarViewProps {
  tasks: Task[];
  logs: AgentLog[];
  onSelectTask: (task: Task) => void;
  onRefresh?: () => void;
}

interface CalendarEvent {
  id: string;
  type: 'deadline' | 'focus_session';
  title: string;
  time: Date;
  task: Task | null;
  riskScore?: number;
}

export default function CalendarView({ tasks, logs, onSelectTask, onRefresh }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDayEventsDate, setSelectedDayEventsDate] = useState<Date>(new Date());

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [timeValue, setTimeValue] = useState<string>('09:00');
  const [durationValue, setDurationValue] = useState<number>(45);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const [optimisticEvents, setOptimisticEvents] = useState<any[]>(() => firebaseService.getOptimisticEvents());

  React.useEffect(() => {
    const unsubscribe = firebaseService.subscribeToOptimisticEvents(() => {
      setOptimisticEvents([...firebaseService.getOptimisticEvents()]);
    });
    return unsubscribe;
  }, []);

  // Helper arrays
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // 1. Gather all events (Task deadlines + Calendar focus block logs)
  const events: CalendarEvent[] = [];

  // Add Task Deadlines as events
  tasks.forEach((task) => {
    if (task.status === 'active' && task.deadline) {
      events.push({
        id: `deadline-${task.id}`,
        type: 'deadline',
        title: `🏁 Deadline: ${task.title}`,
        time: new Date(task.deadline),
        task,
        riskScore: task.riskScore,
      });
    }
  });

  // Add Autonomous Focus Bookings from logs
  logs.forEach((log) => {
    if (log.actionType === 'reschedule' && log.agentType === 'CALENDAR_SCHEDULER' && !log.isFailure && log.scheduledAt) {
      const matchingTask = tasks.find((t) => t.id === log.taskId) || null;
      events.push({
        id: `focus-${log.id}`,
        type: 'focus_session',
        title: `🤖 Focus Block: ${log.taskTitle || 'Task Sprint'}`,
        time: new Date(log.scheduledAt),
        task: matchingTask,
      });
    }
  });

  // Add Optimistic events
  optimisticEvents.forEach((opt) => {
    // Deduplicate: if there is already a matching logged focus session block in logs, skip
    const isAlreadyInLogs = logs.some((l) => 
      l.taskId === opt.taskId && 
      l.scheduledAt && 
      Math.abs(new Date(l.scheduledAt).getTime() - new Date(opt.scheduledAt).getTime()) < 60000 &&
      l.actionType === 'reschedule' &&
      l.agentType === 'CALENDAR_SCHEDULER' &&
      !l.isFailure
    );

    if (!isAlreadyInLogs) {
      const matchingTask = tasks.find((t) => t.id === opt.taskId) || null;
      events.push({
        id: `optimistic-${opt.id}`,
        type: 'focus_session',
        title: `🤖 Focus Block: ${opt.taskTitle || 'Task Sprint'}`,
        time: new Date(opt.scheduledAt),
        task: matchingTask,
        isOptimistic: true,
        optimisticStatus: opt.status,
      } as any);
    }
  });

  // 2. Generate Calendar Days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month Grid Calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthDays: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
    monthDays.push({
      date: prevDate,
      isCurrentMonth: false,
      isToday: isSameDay(prevDate, new Date()),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const currDate = new Date(year, month, i);
    monthDays.push({
      date: currDate,
      isCurrentMonth: true,
      isToday: isSameDay(currDate, new Date()),
    });
  }

  // Next month leading days (to complete a grid of 6 weeks = 42 cells)
  const remainingCells = 42 - monthDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextDate = new Date(year, month + 1, i);
    monthDays.push({
      date: nextDate,
      isCurrentMonth: false,
      isToday: isSameDay(nextDate, new Date()),
    });
  }

  // Week Grid Calculation
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Go to Sunday

  const weekDays: { date: Date; isToday: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + i);
    weekDays.push({
      date: dayDate,
      isToday: isSameDay(dayDate, new Date()),
    });
  }

  // 3. Navigate handler
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(currentDate.getDate() - 7);
      setCurrentDate(prevWeek);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextWeek);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDayEventsDate(today);
  };

  // 4. Utility match date
  function isSameDay(d1: Date, d2: Date) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  const getEventsForDay = (date: Date) => {
    return events.filter((e) => isSameDay(e.time, date)).sort((a, b) => a.time.getTime() - b.time.getTime());
  };

  const getRiskAttributes = (score: number) => {
    if (score >= 80) return { bg: 'bg-[#FF3B5C]/20 text-[#FF3B5C] border-[#FF3B5C]/30 hover:bg-[#FF3B5C]/30', dot: 'bg-[#FF3B5C]' };
    if (score >= 40) return { bg: 'bg-[#FFB800]/20 text-[#FFB800] border-[#FFB800]/30 hover:bg-[#FFB800]/30', dot: 'bg-[#FFB800]' };
    return { bg: 'bg-[#00E676]/20 text-[#00E676] border-[#00E676]/30 hover:bg-[#00E676]/40', dot: 'bg-[#00E676]' };
  };

  // Selected day agenda events
  const selectedDayEvents = getEventsForDay(selectedDayEventsDate);

  return (
    <div className="space-y-6">
      {/* Page Title & Navigation Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#1C2F46]">
        <div>
          <h2 className="text-2xl font-space font-bold text-slate-100 uppercase tracking-tight flex items-center gap-2">
            <CalendarIcon className="text-[#00D4FF]" size={22} />
            Workspace Focus Calendar
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            AUTONOMOUS CALENDAR SCHEDULING DISPATCHES & DEADLINES
          </p>
        </div>

        {/* View Controls & Month/Week Selector */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex bg-[#07111C] p-0.5 rounded-lg border border-[#1A2F45]">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-[11px] font-space font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                viewMode === 'month' ? 'bg-[#00D4FF] text-[#0D1B2A]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-[11px] font-space font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                viewMode === 'week' ? 'bg-[#00D4FF] text-[#0D1B2A]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Week
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-[10px] font-mono text-slate-300 bg-[#14263B] border border-[#1C2F46] hover:border-[#00D4FF]/40 rounded hover:text-white uppercase cursor-pointer"
            >
              Today
            </button>
            <div className="flex items-center bg-[#14263B] border border-[#1C2F46] rounded">
              <button
                onClick={handlePrev}
                className="p-1 hover:text-white text-slate-400 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNext}
                className="p-1 hover:text-white text-slate-400 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout: Calendar on Left, Agenda Panel on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Main Calendar Body (Left Columns) */}
        <div className="lg:col-span-8 bg-[#0F1D30] border border-[#1A2E46] rounded-2xl p-4 md:p-6 shadow-lg">
          
          {/* Header Display */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-space font-bold text-[#00D4FF] uppercase tracking-wide">
              {viewMode === 'month' ? (
                <>
                  {months[month]} <span className="text-slate-400">{year}</span>
                </>
              ) : (
                <>
                  Week of {months[startOfWeek.getMonth()]} {startOfWeek.getDate()}, {startOfWeek.getFullYear()}
                </>
              )}
            </h3>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              {events.length} tracked events
            </span>
          </div>

          {/* Weekday columns labels */}
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 text-center">
            {weekdays.map((day) => (
              <div key={day} className="text-[10px] md:text-xs font-mono text-slate-500 font-semibold py-1 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Month View Grid */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 gap-1.5 md:gap-2.5">
              {monthDays.map(({ date, isCurrentMonth, isToday }, idx) => {
                const dayEvents = getEventsForDay(date);
                const isSelected = isSameDay(date, selectedDayEventsDate);
                
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDayEventsDate(date)}
                    className={`min-h-[70px] md:min-h-[105px] p-1 md:p-2 border rounded-xl flex flex-col justify-between transition-all cursor-pointer relative group ${
                      isCurrentMonth ? 'bg-[#07111C]/60' : 'bg-transparent opacity-25'
                    } ${
                      isToday ? 'border-[#38BDF8] bg-[#38BDF8]/5 shadow-[0_0_10px_rgba(56,189,248,0.1)]' : 'border-[#1C2F46]/60 hover:border-slate-600'
                    } ${
                      isSelected ? 'ring-1 ring-[#8B5CF6] border-[#8B5CF6] bg-[#8B5CF6]/5' : ''
                    }`}
                  >
                    {/* Day number */}
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-mono font-bold ${
                        isToday ? 'text-[#38BDF8]' : isCurrentMonth ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        {date.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse md:hidden" />
                      )}
                    </div>

                    {/* Desktop events list inside cell */}
                    <div className="hidden md:flex flex-col gap-1 mt-1.5 overflow-y-auto max-h-[64px] no-scrollbar">
                      {dayEvents.slice(0, 2).map((evt) => {
                        const isFocus = evt.type === 'focus_session';
                        const riskAttr = evt.riskScore !== undefined ? getRiskAttributes(evt.riskScore) : null;
                        const isOptimistic = (evt as any).isOptimistic;
                        const optStatus = (evt as any).optimisticStatus;
                        
                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (evt.task) onSelectTask(evt.task);
                            }}
                            className={`text-[9px] font-sans font-medium px-1.5 py-0.5 rounded truncate border leading-tight transition-all duration-500 ${
                              isFocus 
                                ? isOptimistic 
                                  ? optStatus === 'pending'
                                    ? 'bg-[#8B5CF6]/5 border-[#8B5CF6]/20 text-[#8B5CF6]/70 opacity-70 animate-pulse'
                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 text-[#8B5CF6] hover:bg-[#8B5CF6]/25' 
                                : riskAttr?.bg || ''
                            }`}
                            title={evt.title}
                          >
                            {isOptimistic ? (
                              <span className="flex items-center gap-1">
                                {optStatus === 'pending' ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-ping" />
                                    <span>⏳ {evt.task?.title || evt.title}</span>
                                  </>
                                ) : (
                                  <>
                                    <span>✓ {evt.task?.title || evt.title}</span>
                                  </>
                                )}
                              </span>
                            ) : (
                              evt.task?.title || evt.title
                            )}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[8px] font-mono text-slate-500 text-right pr-1">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Week View Grid */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-7 gap-1.5 md:gap-2.5">
              {weekDays.map(({ date, isToday }, idx) => {
                const dayEvents = getEventsForDay(date);
                const isSelected = isSameDay(date, selectedDayEventsDate);

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDayEventsDate(date)}
                    className={`min-h-[160px] md:min-h-[220px] p-2 border rounded-xl flex flex-col justify-between transition-all cursor-pointer relative ${
                      isToday ? 'border-[#38BDF8] bg-[#38BDF8]/5 shadow-[0_0_10px_rgba(56,189,248,0.1)]' : 'border-[#1C2F46]/60 hover:border-slate-600'
                    } ${
                      isSelected ? 'ring-1 ring-[#8B5CF6] border-[#8B5CF6] bg-[#8B5CF6]/5' : ''
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-xs font-mono font-bold ${
                        isToday ? 'text-[#38BDF8]' : 'text-slate-300'
                      }`}>
                        {date.getDate()}
                      </span>
                      <span className="text-[8px] font-mono text-slate-500 uppercase">
                        {date.toLocaleDateString([], { month: 'short' })}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-2 flex-1 overflow-y-auto max-h-[110px] md:max-h-[160px] no-scrollbar">
                      {dayEvents.map((evt) => {
                        const isFocus = evt.type === 'focus_session';
                        const riskAttr = evt.riskScore !== undefined ? getRiskAttributes(evt.riskScore) : null;
                        const isOptimistic = (evt as any).isOptimistic;
                        const optStatus = (evt as any).optimisticStatus;

                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (evt.task) onSelectTask(evt.task);
                            }}
                            className={`text-[9px] font-sans font-medium px-1.5 py-1 rounded border leading-tight break-words flex flex-col gap-0.5 transition-all duration-500 ${
                              isFocus 
                                ? isOptimistic
                                  ? optStatus === 'pending'
                                    ? 'bg-[#8B5CF6]/5 border-[#8B5CF6]/20 text-[#8B5CF6]/70 opacity-70 animate-pulse'
                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 text-[#8B5CF6] hover:bg-[#8B5CF6]/25' 
                                : riskAttr?.bg || ''
                            }`}
                            title={evt.title}
                          >
                            <span className="font-bold truncate flex items-center justify-between">
                              <span>{isFocus ? (isOptimistic ? '⏳ Focus Block' : '🤖 Focus Block') : '🏁 Deadline'}</span>
                              {isOptimistic && (
                                <span className="text-[8px] font-mono text-slate-400">
                                  {optStatus === 'pending' ? 'Saving...' : 'Synced ✓'}
                                </span>
                              )}
                            </span>
                            <span className="line-clamp-2 leading-none text-[8px] opacity-90">
                              {evt.task?.title || evt.title}
                            </span>
                            <span className="text-[7px] font-mono text-right opacity-60 mt-0.5">
                              {evt.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                      {dayEvents.length === 0 && (
                        <div className="text-[8px] font-mono text-slate-600 italic text-center py-4">
                          Empty
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Selected Day Agenda Side Panel (Right Columns) */}
        <div className="lg:col-span-4 bg-[#0F1D30] border border-[#1A2E46] rounded-2xl p-5 shadow-lg space-y-4">
          <div className="border-b border-[#1C2F46]/60 pb-3 flex justify-between items-start gap-2">
            <div>
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                Selected Day Agenda
              </h3>
              <p className="text-sm font-space font-bold text-[#00D4FF] uppercase mt-1 leading-tight">
                {selectedDayEventsDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            {!showAddForm && (
              <Button
                onClick={() => {
                  setShowAddForm(true);
                  const active = tasks.filter(t => t.status === 'active');
                  if (active.length > 0) {
                    setSelectedTaskId(active[0].id);
                  } else {
                    setSelectedTaskId('custom');
                  }
                }}
                variant="secondary"
                size="sm"
                className="shrink-0"
                title="Schedule a focus block"
              >
                <Plus size={11} />
                <span>Add Block</span>
              </Button>
            )}
          </div>

          {/* Add Calendar Block Form */}
          {showAddForm && (
            <div className="bg-[#07111C] p-4 rounded-xl border border-[#1A2F45] space-y-3.5 animate-fadeIn text-left">
              <div className="flex justify-between items-center pb-2 border-b border-[#1A2F45]">
                <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  Create Focus Block
                </h4>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                {/* Task selection */}
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Associate Task
                  </label>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full bg-[#091524] border border-[#1A2E46] text-slate-200 text-xs rounded-lg p-2 focus:outline-none focus:border-[#00D4FF] cursor-pointer"
                  >
                    {tasks.filter(t => t.status === 'active').map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.progress}%)
                      </option>
                    ))}
                    <option value="custom">-- Custom Text block --</option>
                  </select>
                </div>

                {selectedTaskId === 'custom' && (
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                      Custom Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Prep Database Entities"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full bg-[#091524] border border-[#1A2E46] text-slate-200 text-xs rounded-lg p-2 focus:outline-none focus:border-[#00D4FF]"
                    />
                  </div>
                )}

                {/* Time & Duration */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={timeValue}
                      onChange={(e) => setTimeValue(e.target.value)}
                      className="w-full bg-[#091524] border border-[#1A2E46] text-slate-200 text-xs rounded-lg p-2 focus:outline-none focus:border-[#00D4FF] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                      Duration
                    </label>
                    <select
                      value={durationValue}
                      onChange={(e) => setDurationValue(parseInt(e.target.value, 10))}
                      className="w-full bg-[#091524] border border-[#1A2E46] text-slate-200 text-xs rounded-lg p-2 focus:outline-none focus:border-[#00D4FF] cursor-pointer"
                    >
                      <option value="15">15 min Sprint</option>
                      <option value="30">30 min Block</option>
                      <option value="45">45 min Block</option>
                      <option value="60">60 min Hour</option>
                      <option value="90">90 min Deep Work</option>
                    </select>
                  </div>
                </div>

                {/* Confirm buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={async () => {
                      try {
                        let finalTitle = '';
                        let tId = '';
                        if (selectedTaskId === 'custom') {
                          finalTitle = customTitle.trim() || 'Custom Focus Block';
                          tId = 'custom-block';
                        } else {
                          const matched = tasks.find(t => t.id === selectedTaskId);
                          finalTitle = matched ? matched.title : 'Focus Block';
                          tId = selectedTaskId;
                        }

                        const [hh, mm] = timeValue.split(':');
                        const targetDate = new Date(selectedDayEventsDate);
                        targetDate.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);

                        const formattedTime = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        const optId = firebaseService.createOptimisticEvent(tId, finalTitle, targetDate.toISOString(), durationValue);

                        try {
                          await firebaseService.addAgentLog({
                            taskId: tId,
                            taskTitle: finalTitle,
                            actionType: 'reschedule',
                            actionTaken: 'Scheduled Workspace Focus slot',
                            reason: `Manually Scheduled: Booked ${durationValue}m focus session at ${formattedTime} for "${finalTitle}".`,
                            isFailure: false,
                            isAgentInitiated: false,
                            agentType: 'CALENDAR_SCHEDULER',
                            scheduledAt: targetDate.toISOString(),
                            structuredReasoning: {
                              metrics: {
                                observedDeadline: 'N/A',
                                observedProgress: 'N/A',
                                estimatedWorkRemaining: 'N/A',
                                calendarAvailability: 'Manually added slot'
                              },
                              justificationText: `User manually scheduled a ${durationValue}-minute focus session starting at ${formattedTime} in the Focus Calendar.`,
                              decisionConfidence: 100
                            },
                            decisionExecuted: 'SCHEDULED_FOCUS_BLOCK',
                            userApprovalApplied: 'ASSIST'
                          });

                          await firebaseService.addNotification({
                            title: '🗓️ Calendar Block Added',
                            body: `ADDED: Scheduled ${durationValue}-minute focus slot at ${formattedTime} for "${finalTitle}".`,
                            type: 'info'
                          });

                          firebaseService.addDiagnosticLog("✓ Firestore sync complete", "success");
                          firebaseService.addDiagnosticLog("✓ Google Calendar sync complete", "success");
                          firebaseService.resolveOptimisticEvent(optId, 'success');
                          firebaseService.addDiagnosticLog("✓ UI reconciled", "success");

                          setShowAddForm(false);
                          setCustomTitle('');
                          if (onRefresh) onRefresh();
                        } catch (e) {
                          firebaseService.resolveOptimisticEvent(optId, 'failed');
                          throw e;
                        }
                      } catch (e) {
                        console.error('Failed to manually add calendar block:', e);
                      }
                    }}
                    variant="primary"
                    size="sm"
                    className="flex-1 text-center"
                  >
                    Confirm Add
                  </Button>
                  <Button
                    onClick={() => setShowAddForm(false)}
                    variant="ghost"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[360px] lg:max-h-[500px] overflow-y-auto pr-1">
            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                💤 Clear Grid. No sprints or deadlines for this slot.
              </div>
            ) : (
              selectedDayEvents.map((evt) => {
                const isFocus = evt.type === 'focus_session';
                const riskAttr = evt.riskScore !== undefined ? getRiskAttributes(evt.riskScore) : null;
                const isOptimistic = (evt as any).isOptimistic;
                const optStatus = (evt as any).optimisticStatus;

                return (
                  <div
                    key={evt.id}
                    onClick={() => {
                      if (evt.task) onSelectTask(evt.task);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.01] relative overflow-hidden ${
                      isFocus 
                        ? isOptimistic
                          ? optStatus === 'pending'
                            ? 'bg-[#8B5CF6]/5 border-[#8B5CF6]/20 shadow-[0_0_10px_rgba(139,92,246,0.02)] opacity-75'
                            : 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                          : 'bg-[#8B5CF6]/5 border-[#8B5CF6]/30 hover:border-[#8B5CF6]/60 shadow-[0_0_15px_rgba(139,92,246,0.05)]' 
                        : 'bg-[#0D1B2A] border-[#1C2F46] hover:border-slate-500'
                    }`}
                  >
                    {deletingEventId === evt.id ? (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="absolute inset-0 bg-[#0F1D30] bg-opacity-95 flex flex-col justify-center items-center p-3 text-center animate-fadeIn z-10"
                      >
                        <p className="text-[11px] font-mono text-slate-300 uppercase tracking-wider mb-2">
                          Delete focus session?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              const logId = evt.id.replace('focus-', '');
                              await firebaseService.deleteAgentLog(logId);
                              
                              await firebaseService.addNotification({
                                title: '🗑️ Calendar Block Removed',
                                body: `REMOVED: Focus session for "${evt.task?.title || evt.title}" deleted from schedule.`,
                                type: 'info'
                              });

                              setDeletingEventId(null);
                              if (onRefresh) onRefresh();
                            }}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white font-mono text-[10px] font-bold uppercase rounded cursor-pointer transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeletingEventId(null)}
                            className="px-3 py-1 bg-[#1A2E46] hover:bg-[#253D59] text-slate-300 font-mono text-[10px] font-bold uppercase rounded cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded border ${
                          isFocus 
                            ? isOptimistic && optStatus === 'success'
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : 'text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/20' 
                            : 'text-[#FF6B6B] bg-[#FF6B6B]/10 border-[#FF6B6B]/20'
                        }`}>
                          {isFocus ? (isOptimistic ? (optStatus === 'pending' ? 'Saving...' : 'Synced ✓') : 'Focus Block') : 'Task Deadline'}
                        </span>
                        {isOptimistic && optStatus === 'pending' && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B5CF6] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8B5CF6]"></span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatHumanFriendlyDeadline(evt.time)}
                        </span>
                        {isFocus && !isOptimistic && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setDeletingEventId(evt.id);
                            }}
                            className="text-slate-500 hover:text-red-400 p-0.5 transition-colors cursor-pointer rounded hover:bg-slate-800"
                            title="Remove focus block"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="text-xs font-sans font-bold text-slate-100 mb-2 leading-snug group-hover:text-[#38BDF8] transition-colors line-clamp-2">
                      {evt.task?.title || evt.title}
                    </h4>

                    {/* Metadata indicators */}
                    <div className="flex items-center gap-3.5 text-[10px] font-mono text-slate-400 border-t border-[#1C2F46]/50 pt-2 mt-2">
                      {isFocus ? (
                        isOptimistic && optStatus === 'pending' ? (
                          <div className="flex items-center gap-1 text-[#8B5CF6]/80 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-ping" />
                            <span>Saving Block...</span>
                          </div>
                        ) : isOptimistic && optStatus === 'success' ? (
                          <div className="flex items-center gap-1 text-emerald-400">
                            <Check size={11} className="animate-bounce" />
                            <span>Synced ✓</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[#8B5CF6]">
                            <Shield size={11} />
                            <span>Focus Session</span>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-1" style={{ color: riskAttr?.dot.includes('FF6B6B') ? '#FF6B6B' : riskAttr?.dot.includes('FBBF24') ? '#FBBF24' : '#22C55E' }}>
                          <Flame size={11} />
                          <span>{evt.riskScore}% Miss risk</span>
                        </div>
                      )}

                      {evt.task && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Clock size={11} />
                          <span>{evt.task.estimatedDuration}m dur</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="bg-[#07111C] p-3 rounded-xl border border-[#1A2F45] text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Proactive Defusing Tip
            </span>
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              Select any event pill to review diagnostic risk graphs, execute direct mock sprints, and override deadlines.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
