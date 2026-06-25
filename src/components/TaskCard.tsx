/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, CheckSquare, AlertTriangle, Play, Flame, Calendar, ChevronRight } from 'lucide-react';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  isLarge?: boolean;
  onSelect: (task: Task) => void;
  onTriggerCrisis: (task: Task) => void;
  key?: string | number;
}

export default function TaskCard({ task, isLarge = false, onSelect, onTriggerCrisis }: TaskCardProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  // Live countdown countdown ticking
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

  // Determine risk attributes
  const getRiskAttributes = (score: number) => {
    if (score >= 80) {
      return {
        color: '#FF3B5C',
        bg: 'bg-[#FF3B5C]/10',
        border: 'border-[#FF3B5C]/30',
        label: 'CRITICAL',
        textClass: 'text-[#FF3B5C]',
        glowClass: 'shadow-[0_0_15px_rgba(255,59,92,0.15)]'
      };
    }
    if (score >= 40) {
      return {
        color: '#FFB800',
        bg: 'bg-[#FFB800]/10',
        border: 'border-[#FFB800]/30',
        label: 'WARNING',
        textClass: 'text-[#FFB800]',
        glowClass: ''
      };
    }
    return {
      color: '#00E676',
      bg: 'bg-[#00E676]/10',
      border: 'border-[#00E676]/30',
      label: 'SAFE',
      textClass: 'text-[#00E676]',
      glowClass: ''
    };
  };

  const risk = getRiskAttributes(task.riskScore);

  // Special Purple Indicator for Agent-driven actions (Autonomous Left Border!)
  const isAgentRescheduled = task.id.includes('dbms') || task.id.includes('ml'); // Story context triggers
  const borderLeftColor = isAgentRescheduled ? '#7B61FF' : risk.color;

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => onSelect(task)}
      className={`
        relative overflow-hidden rounded-xl bg-[#0F1D30] border border-[#1A2E46] p-5 cursor-pointer flex flex-col justify-between
        ${isLarge ? 'col-span-1 md:col-span-2' : ''}
        ${risk.glowClass}
      `}
      style={{
        borderLeft: `5px solid ${borderLeftColor}`,
      }}
    >
      {/* Background neon accent */}
      {task.riskScore >= 80 && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF3B5C]/5 blur-3xl rounded-full pointer-events-none" />
      )}

      <div>
        {/* Top Header Row */}
        <div className="flex justify-between items-start gap-2 mb-2.5">
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-slate-900/40 text-slate-400">
            {task.category}
          </span>
          
          <div className="flex items-center gap-2">
            {isAgentRescheduled && (
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#7B61FF] uppercase bg-[#7B61FF]/10 border border-[#7B61FF]/20 px-2 py-0.5 rounded">
                🤖 Rescheduled
              </span>
            )}
            
            <span
              className="text-[10px] font-mono font-bold tracking-widest px-2.5 py-0.5 rounded"
              style={{
                color: risk.color,
                background: `${risk.color}15`,
                border: `1px solid ${risk.color}25`
              }}
            >
              {risk.label} ({task.riskScore}%)
            </span>
          </div>
        </div>

        {/* Task Title */}
        <h3 className={`font-space font-bold text-slate-100 tracking-tight mb-2.5 leading-snug ${isLarge ? 'text-xl' : 'text-base'}`}>
          {task.title}
        </h3>

        {/* Live Countdown & Info */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400 mb-4">
          <div className={`flex items-center gap-1.5 ${isUrgent ? 'text-[#FF3B5C] font-semibold' : ''}`}>
            {isUrgent ? <Flame size={13} className="animate-pulse" /> : <Clock size={13} />}
            <span>{timeLeft}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <CheckSquare size={13} />
            <span>{task.completedSteps}/{task.totalSteps} steps</span>
          </div>
        </div>
      </div>

      {/* Progress Bar & Actions */}
      <div className="space-y-3.5">
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>PROGRESS</span>
            <span className="text-slate-300 font-semibold">{task.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#08111C] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${risk.color}dd, ${risk.color})`,
                boxShadow: `0 0 8px ${risk.color}40`
              }}
            />
          </div>
        </div>

        {/* Card footer details / CTAs */}
        <div className="flex justify-between items-center pt-2 border-t border-[#1C2F46]/50">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            {task.complexity} complexity
          </span>

          <button
            id={`open-task-btn-${task.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(task);
            }}
            className="flex items-center gap-1 text-[11px] font-space font-bold uppercase tracking-wider text-[#00D4FF] hover:text-white transition-colors"
          >
            Open detail
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
