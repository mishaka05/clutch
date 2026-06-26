/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Flame, ChevronRight, Info, Activity } from 'lucide-react';
import { Task } from '../../types';

interface HeroSectionProps {
  activeTasks: Task[];
  highestRiskTask: Task | null;
  totalFocusHours: number;
  totalFocusMins: number;
  crisisCount: number;
  setActiveTab: (tab: 'dashboard' | 'logs') => void;
}

export default function HeroSection({
  activeTasks,
  highestRiskTask,
  totalFocusHours,
  totalFocusMins,
  crisisCount,
  setActiveTab
}: HeroSectionProps) {
  return (
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
              <p className="text-xs font-mono text-[#FF3B5C] flex items-center gap-1.5 font-semibold animate-pulse">
                <Flame size={13} />
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
  );
}
