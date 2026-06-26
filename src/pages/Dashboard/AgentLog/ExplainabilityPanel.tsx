/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { AgentLog } from '../../../types';

interface ExplainabilityPanelProps {
  log: AgentLog;
}

export default function ExplainabilityPanel({ log }: ExplainabilityPanelProps) {
  if (!log.structuredReasoning) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/30 p-2.5 rounded-xl border border-slate-900">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={11} className="text-[#7B61FF]" />
          Agent Analysis Justification
        </span>
        {log.structuredReasoning.decisionConfidence !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500">DECISION CONFIDENCE:</span>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {log.structuredReasoning.decisionConfidence}%
            </span>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed italic font-sans bg-slate-900/20 p-3 rounded-xl border border-slate-800/30">
        "{log.structuredReasoning.justificationText}"
      </p>

      {/* Matrix Stats */}
      {log.structuredReasoning.metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#09111E] p-2.5 rounded-xl border border-slate-800/50">
            <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest">OBSERVED DEADLINE</span>
            <span className="text-[11px] font-sans font-medium text-slate-300 mt-1 block">
              📅 {log.structuredReasoning.metrics.observedDeadline || 'N/A'}
            </span>
          </div>
          <div className="bg-[#09111E] p-2.5 rounded-xl border border-slate-800/50">
            <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest">OBSERVED PROGRESS</span>
            <span className="text-[11px] font-sans font-medium text-[#00D4FF] mt-1 block">
              📊 {log.structuredReasoning.metrics.observedProgress || 'N/A'}
            </span>
          </div>
          <div className="bg-[#09111E] p-2.5 rounded-xl border border-slate-800/50">
            <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest">WORKLOAD ESTIMATE</span>
            <span className="text-[11px] font-sans font-medium text-amber-400 mt-1 block">
              ⏳ {log.structuredReasoning.metrics.estimatedWorkRemaining || 'N/A'}
            </span>
          </div>
          <div className="bg-[#09111E] p-2.5 rounded-xl border border-slate-800/50">
            <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest">CALENDAR AVAILABILITY</span>
            <span className="text-[11px] font-sans font-medium text-purple-400 mt-1 block">
              🗓️ {log.structuredReasoning.metrics.calendarAvailability || 'N/A'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
