/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, CheckSquare, Flame, ChevronRight } from 'lucide-react';
import { Task } from '../../types';
import { formatHumanFriendlyDeadline } from '../../utils/dateUtils';

interface TaskCardProps {
  task: Task;
  isLarge?: boolean;
  onSelect: (task: Task) => void;
  onTriggerCrisis?: (task: Task) => void;
  key?: string | number;
}

export default function TaskCard({ task, isLarge = false, onSelect, onTriggerCrisis }: TaskCardProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Live countdown ticking
  useEffect(() => {
    const updateTicker = () => {
      const ms = new Date(task.deadline).getTime() - Date.now();
      if (ms <= 0) {
        setTimeLeft('OVERDUE');
        setIsUrgent(true);
        return;
      }

      const hrs = ms / (1000 * 60 * 60);
      const hours = Math.floor(hrs);
      const mins = Math.floor((ms / (1000 * 60)) % 60);
      const secs = Math.floor((ms / 1000) % 60);

      setIsUrgent(hrs < 2);

      if (hrs > 24) {
        const days = Math.floor(hrs / 24);
        setTimeLeft(`${days}d ${hours % 24}h remaining`);
      } else {
        const hPad = hours.toString().padStart(2, '0');
        const mPad = mins.toString().padStart(2, '0');
        const sPad = secs.toString().padStart(2, '0');
        setTimeLeft(`${hPad}:${mPad}:${sPad}`);
      }
    };

    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, [task.deadline]);

  // Determine risk attributes with Premium Clutch Palette
  const getRiskAttributes = (score: number) => {
    if (score >= 80) {
      return {
        color: '#FF6B6B', // Red
        bg: 'bg-[#FF6B6B]/10',
        border: 'border-[#FF6B6B]/30',
        label: 'CRITICAL',
        textClass: 'text-[#FF6B6B]',
        glowClass: 'shadow-[0_0_15px_rgba(255,107,107,0.15)]'
      };
    }
    if (score >= 40) {
      return {
        color: '#FBBF24', // Amber
        bg: 'bg-[#FBBF24]/10',
        border: 'border-[#FBBF24]/30',
        label: 'WARNING',
        textClass: 'text-[#FBBF24]',
        glowClass: 'shadow-[0_0_15px_rgba(251,191,36,0.1)]'
      };
    }
    return {
      color: '#22C55E', // Green
      bg: 'bg-[#22C55E]/10',
      border: 'border-[#22C55E]/30',
      label: 'SAFE',
      textClass: 'text-[#22C55E]',
      glowClass: 'shadow-[0_0_15px_rgba(34,197,94,0.1)]'
    };
  };

  const risk = getRiskAttributes(task.riskScore);

  // Special Purple Indicator for Agent-driven actions (Autonomous Left Border!)
  const isAgentRescheduled = task.id.includes('dbms') || task.id.includes('ml'); // Story context triggers
  const borderLeftColor = isAgentRescheduled ? '#8B5CF6' : risk.color;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(task)}
      className={`
        relative overflow-hidden rounded-2xl p-6 cursor-pointer flex flex-col justify-between h-full transition-all duration-300 backdrop-blur-[18px]
        ${isLarge ? 'col-span-1 md:col-span-2' : ''}
      `}
      style={{
        backgroundColor: isHovered ? 'rgba(18, 22, 34, 0.65)' : 'rgba(18, 22, 34, 0.45)',
        borderWidth: '1px 1px 1px 4px',
        borderStyle: 'solid',
        borderTopColor: isHovered ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.08)',
        borderRightColor: isHovered ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.08)',
        borderBottomColor: isHovered ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.08)',
        borderLeftColor: borderLeftColor,
        boxShadow: isHovered
          ? `0 20px 40px -15px rgba(0, 0, 0, 0.8), 0 0 20px ${borderLeftColor}33`
          : `0 15px 35px -15px rgba(0, 0, 0, 0.6), 0 0 10px ${borderLeftColor}11`
      }}
    >
      {/* Background neon accent */}
      {task.riskScore >= 80 && (
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#FF6B6B]/4 blur-[80px] rounded-full pointer-events-none" />
      )}

      <div>
        {/* Top Header Row */}
        <div className="flex justify-between items-center gap-2 mb-3.5">
          <span className="text-[9px] font-mono font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-white/[0.03] text-slate-400 border border-white/[0.08] backdrop-blur-md">
            {task.category === 'academic' ? '🎓 Academic' : 
             task.category === 'work' ? '💼 Work' :
             task.category === 'personal' ? '👤 Personal' : '💳 Finance'}
          </span>
          
          <div className="flex items-center gap-2">
            {task.inProgress && (
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#38BDF8] uppercase bg-[#38BDF8]/10 border border-[#38BDF8]/30 px-2.5 py-0.5 rounded-full animate-pulse backdrop-blur-md shadow-[0_0_12px_rgba(56,189,248,0.25)]">
                ⚡ Focus Active
              </span>
            )}

            {isAgentRescheduled && (
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#8B5CF6] uppercase bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-[0_0_12px_rgba(139,92,246,0.15)]">
                🤖 Rescheduled
              </span>
            )}
            
            <span
              className="text-[9px] font-mono font-bold tracking-widest px-2.5 py-0.5 rounded-full border backdrop-blur-md"
              style={{
                color: risk.color,
                background: `${risk.color}15`,
                borderColor: `${risk.color}35`,
                boxShadow: `0 0 10px ${risk.color}15`
              }}
            >
              {risk.label} ({task.riskScore}%)
            </span>
          </div>
        </div>

        {/* Task Title */}
        <h3 className={`font-space font-medium text-white tracking-tight mb-3 leading-snug ${isLarge ? 'text-2xl' : 'text-base'} hover:text-[#8B5CF6] transition-colors duration-200`}>
          {task.title}
        </h3>

        {/* Live Countdown & Info */}
        <div className="flex flex-col gap-2 text-xs font-mono text-slate-400 mb-5">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 ${isUrgent ? 'text-[#FF6B6B] font-semibold' : 'text-slate-400'}`}>
              {isUrgent ? <Flame size={13} className="animate-pulse" /> : <Clock size={13} className="text-[#8B5CF6]" />}
              <span>{timeLeft}</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-slate-400">
              <CheckSquare size={13} className="text-[#38BDF8]" />
              <span>{task.completedSteps}/{task.totalSteps} steps</span>
            </div>
          </div>
          <div className="text-[9px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <span className="font-semibold">Deadline:</span>
            <span className="text-slate-300 font-bold bg-white/[0.02] px-2 py-0.5 rounded-md border border-white/[0.04]">{formatHumanFriendlyDeadline(task.deadline)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar & Actions */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-[9px] font-mono text-slate-500 tracking-wider">
            <span>PROGRESS</span>
            <span className="text-slate-300 font-semibold">{task.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950/80 rounded-full overflow-hidden border border-white/[0.04]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full progress-bar-sweep overflow-hidden"
              style={{
                background: `linear-gradient(90deg, ${risk.color}99, ${risk.color})`,
                boxShadow: `0 0 10px ${risk.color}35`
              }}
            />
          </div>
        </div>

        {/* Card footer details / CTAs */}
        <div className="flex justify-between items-center pt-3 border-t border-white/[0.06]">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-semibold">
            {task.complexity} complexity
          </span>

          <button
            id={`open-task-btn-${task.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(task);
            }}
            className="flex items-center gap-1 text-[10px] font-space font-semibold uppercase tracking-widest text-[#38BDF8] hover:text-[#8B5CF6] transition-all cursor-pointer active:scale-95"
          >
            Open detail
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
