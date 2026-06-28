/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Flame, Sparkles } from 'lucide-react';
import { Task } from '../../types';
import { generateCrisisPlanWithAI } from '../../services/gemini';
import Button from '../../components/Button';

interface CrisisTakeoverProps {
  task: Task;
  onDefuse: () => void;
  onDismiss: () => void;
}

export default function CrisisTakeoverOverlay({ task, onDefuse, onDismiss }: CrisisTakeoverProps) {
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
        <div className="text-left bg-[#0A050B]/80 border border-[#FF3B5C]/20 rounded-xl p-5 space-y-4 max-w-lg mx-auto w-full">
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
          <Button
            id="mitigate-done-btn"
            onClick={onDefuse}
            variant="danger"
            size="lg"
            className="w-full"
          >
            I'M DONE (DEFUSE tension)
          </Button>

          <Button
            id="crisis-dismiss-btn"
            onClick={onDismiss}
            variant="ghost"
            size="sm"
            className="block mx-auto text-[10px] font-mono text-slate-500 hover:text-slate-300 uppercase tracking-widest"
          >
            This was a false alarm (postpone tracking)
          </Button>
        </div>

      </div>
    </motion.div>
  );
}
