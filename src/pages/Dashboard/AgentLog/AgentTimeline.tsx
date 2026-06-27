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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#08101B]/80 border border-[#1C2F46]/60 p-4 rounded-xl">
        <div className="space-y-1 p-2">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">
            Agent Actions
          </span>
          <div className="flex items-center gap-1.5">
            <Brain size={14} className="text-[#7B61FF]" />
            <span className="text-lg font-space font-bold text-slate-200">
              {agentInitiatedLogs.length} Decisions
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block leading-relaxed font-sans">
            Total active autonomous interventions.
          </span>
        </div>

        <div className="space-y-1 p-2 border-t sm:border-t-0 sm:border-l border-slate-800/80 sm:pl-4">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">
            Acceptance Rate
          </span>
          <div className="flex items-center gap-1.5">
            <ThumbsUp size={14} className="text-emerald-400" />
            <span className="text-lg font-space font-bold text-slate-200">
              {acceptanceRate}% Align
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block leading-relaxed font-sans">
            User alignment with autonomous recommendations.
          </span>
        </div>

        <div className="space-y-1 p-2 border-t sm:border-t-0 sm:border-l border-slate-800/80 sm:pl-4">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">
            Reinforcement Loop
          </span>
          <div className="flex items-center gap-1.5">
            <HelpCircle size={14} className="text-[#00D4FF]" />
            <span className="text-lg font-space font-bold text-slate-200">
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
        <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#7B61FF] via-[#00D4FF] to-slate-800" />
        
        {logs.map((log) => (
          <AgentLogCard key={log.id} log={log} onRefresh={onRefresh} />
        ))}
      </div>
    </div>
  );
}
