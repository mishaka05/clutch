/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, Brain, ThumbsUp, HelpCircle } from 'lucide-react';
import { AgentLog } from '../../../types';
import AgentLogCard from './AgentLogCard';

interface AgentTimelineProps {
  logs: AgentLog[];
  onRefresh: () => Promise<void>;
}

export default function AgentTimeline({ logs, onRefresh }: AgentTimelineProps) {
  // Compute Telemetry Stats
  const agentInitiatedLogs = logs.filter(l => l.isAgentInitiated && !l.isFailure);
  
  const accepted = logs.filter(l => l.telemetryFeedback === 'USER_ACCEPTED').length;
  const ignored = logs.filter(l => l.telemetryFeedback === 'USER_IGNORED').length;
  const deleted = logs.filter(l => l.telemetryFeedback === 'USER_DELETED').length;
  
  const totalResponded = accepted + ignored + deleted;
  const acceptanceRate = totalResponded > 0 ? Math.round((accepted / totalResponded) * 100) : 92; // 92% baseline default

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/20 border border-dashed border-[#1C2F46] rounded-2xl text-center">
        <AlertCircle className="text-slate-600 mb-3" size={32} />
        <p className="text-slate-400 text-sm font-sans font-medium">No actions logged yet</p>
        <p className="text-slate-500 text-xs font-mono mt-1">
          Our background agents register logs when analyzing or rescheduled tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Telemetry Hub Bento Stats Widget */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-gradient-to-br from-[#0c0a18] via-[#050508] to-[#010103] border border-white/[0.08] p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#8052ff]/5 blur-3xl rounded-full pointer-events-none" />
        
        <div className="space-y-1.5 p-1">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
            Agent Actions
          </span>
          <div className="flex items-center gap-1.5">
            <Brain size={14} className="text-[#8052ff]" />
            <span className="text-xl font-space font-semibold text-white tracking-tight">
              {agentInitiatedLogs.length} Decisions
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block leading-relaxed font-sans">
            Active autonomous interventions registered by agent engines.
          </span>
        </div>

        <div className="space-y-1.5 p-1 border-t sm:border-t-0 sm:border-l border-white/[0.06] sm:pl-6">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
            Acceptance Rate
          </span>
          <div className="flex items-center gap-1.5">
            <ThumbsUp size={14} className="text-[#00E676]" />
            <span className="text-xl font-space font-semibold text-white tracking-tight">
              {acceptanceRate}% Align
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block leading-relaxed font-sans">
            User alignment ratio with our automated system alerts.
          </span>
        </div>

        <div className="space-y-1.5 p-1 border-t sm:border-t-0 sm:border-l border-white/[0.06] sm:pl-6">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
            Reinforcement Loop
          </span>
          <div className="flex items-center gap-1.5">
            <HelpCircle size={14} className="text-[#00D4FF]" />
            <span className="text-xl font-space font-semibold text-white tracking-tight">
              {totalResponded} Votes
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block leading-relaxed font-sans">
            {accepted} Accept • {ignored} Ignore • {deleted} Dismiss
          </span>
        </div>
      </div>

      <div className="relative pl-8 space-y-6">
        {/* Vertical Timeline Thread */}
        <div className="absolute left-3.5 top-2.5 bottom-2.5 w-[2px] bg-gradient-to-b from-[#8052ff] via-[#00D4FF] to-white/[0.03]" />
        
        {logs.map((log) => (
          <AgentLogCard key={log.id} log={log} onRefresh={onRefresh} />
        ))}
      </div>
    </div>
  );
}
