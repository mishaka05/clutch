/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Flame, ChevronRight, Info, Activity } from 'lucide-react';
import { Task } from '../../types';
import Button from '../../components/Button';

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-0">
      
      {/* Today's Focus KPI Banner */}
      <div className="lg:col-span-2 bg-gradient-to-br from-[#0c0a18] via-[#050508] to-[#010103] border border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] group transition-all duration-300 hover:border-white/[0.15]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#8B5CF6]/8 blur-[100px] rounded-full pointer-events-none group-hover:bg-[#8B5CF6]/12 transition-all duration-500" />
        
        <div>
          <span className="text-[10px] font-mono text-slate-300 uppercase tracking-widest bg-white/[0.03] px-3 py-1.5 rounded-full border border-white/[0.06] backdrop-blur-sm">
            Active Cockpit Summary
          </span>
          
          {highestRiskTask ? (
            <div className="mt-5 space-y-2.5">
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">CRITICAL ASSIGNMENT UNDER ANALYSIS:</p>
              <h2 className="text-3xl font-space font-semibold text-white tracking-tight leading-snug group-hover:text-[#38BDF8] transition-colors duration-300">
                {highestRiskTask.title}
              </h2>
              <p className="text-xs font-mono text-[#FF6B6B] flex items-center gap-1.5 font-semibold bg-[#FF6B6B]/10 py-1.5 px-3 rounded-lg w-fit border border-[#FF6B6B]/20">
                <Flame size={13} className="animate-pulse" />
                CRITICAL THREAT LEVEL ({highestRiskTask.riskScore}%) — INTERVENE IMMEDIATELY
              </p>
            </div>
          ) : (
            <div className="mt-5">
              <h2 className="text-2xl font-space font-medium text-slate-200 tracking-tight">
                Operational Clean Slate
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1.5">
                ● All active systems nominal. Add tasks below to initialize autonomous tracking.
              </p>
            </div>
          )}
        </div>

        {/* Grid sub-indicators */}
        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/[0.06] mt-6">
          <div className="space-y-1">
            <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Active Tasks</span>
            <span className="font-space font-semibold text-2xl text-[#38BDF8] block tracking-tight">{activeTasks.length}</span>
          </div>
          <div className="space-y-1 border-l border-white/[0.06] pl-6">
            <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Focus Sprints</span>
            <span className="font-space font-semibold text-2xl text-slate-100 block tracking-tight">
              {totalFocusHours > 0 ? `${totalFocusHours}h ` : ''}{totalFocusMins}m
            </span>
          </div>
          <div className="space-y-1 border-l border-white/[0.06] pl-6">
            <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Critical</span>
            <span className="font-space font-semibold text-2xl text-[#FF6B6B] block tracking-tight">{crisisCount}</span>
          </div>
        </div>
      </div>

      {/* Real-time Agent System Status */}
      <div className="bg-gradient-to-br from-[#07050d] to-[#010103] border border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.8)] group hover:border-white/[0.15] transition-all duration-300">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="font-space font-semibold text-sm text-slate-200 uppercase tracking-wider">
              Threat Engine
            </h3>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
              AUTONOMOUS ANALYSIS FEED
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#8B5CF6]/10 px-2.5 py-1 rounded-full border border-[#8B5CF6]/20">
            <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full animate-pulse" />
            <span className="text-[9px] font-mono text-[#8B5CF6] font-bold tracking-wider">ACTIVE</span>
          </div>
        </div>

        <div className="space-y-3.5 py-5">
          <div className="flex gap-3 text-xs bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
            <Info size={14} className="text-[#38BDF8] shrink-0 mt-0.5" />
            <p className="text-slate-400 leading-relaxed font-sans text-[11px]">
              Our systems evaluate task complexity ratios dynamically. Real-time updates prevent unexpected schedule slippage.
            </p>
          </div>
        </div>

        <Button
          id="view-logs-btn"
          onClick={() => setActiveTab('logs')}
          variant="secondary"
          size="sm"
          className="w-full flex items-center justify-center gap-1.5"
        >
          Inspect Agent Logs
          <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>

    </div>
  );
}
