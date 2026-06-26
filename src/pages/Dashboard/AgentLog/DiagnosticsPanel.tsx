/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Sparkles } from 'lucide-react';
import { AgentLog } from '../../../types';
import { firebaseService } from '../../../services/firebase';

interface DiagnosticsPanelProps {
  logs: AgentLog[];
  onRefresh: () => Promise<void>;
}

export default function DiagnosticsPanel({ logs, onRefresh }: DiagnosticsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-[#1E112A] via-[#0E1527] to-[#09111E] border border-[#7B61FF]/30 rounded-2xl p-5 shadow-xl relative overflow-hidden space-y-4 mb-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#7B61FF]/5 blur-3xl rounded-full pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-[#7B61FF] bg-[#7B61FF]/10 border border-[#7B61FF]/30 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
              DIAGNOSTICS CONSOLE
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Resiliency Simulator
            </span>
          </div>
          <h3 className="text-lg font-space font-bold text-slate-100 tracking-tight">
            Simulate Agent Interruptions & Outages
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Test the system's self-healing recovery pipeline. Force background API or OAuth failures to watch the Recovery Queue log errors, dispatch alerts, and execute automatic backoff loops.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <div className="text-[10px] font-mono text-slate-500">
            QUEUE TELEMETRY: <span className="text-emerald-400">ACTIVE & SECURE</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-[#7B61FF]/50 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-mono transition-all cursor-pointer shadow-md select-none"
          >
            <span>{isExpanded ? '▲ Advanced Diagnostics' : '▼ Advanced Diagnostics'}</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-2 border-t border-slate-800/60 animate-fadeIn">
          <div className="flex items-center justify-between bg-[#080E1A] p-3 rounded-xl border border-slate-900 text-xs text-slate-400 font-mono">
            <span>🔄 Retries Active:</span>
            <span className="text-emerald-400 font-bold">
              {logs.filter(l => l.isFailure && l.status === 'failed_retrying').length} Queue tasks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={async () => {
                await firebaseService.simulateAgentFailure('calendar_503');
                await onRefresh();
              }}
              className="bg-[#0D1525] border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left p-3.5 rounded-xl text-slate-200 text-xs font-sans group cursor-pointer space-y-1"
            >
              <div className="flex items-center gap-1.5 text-amber-400 font-bold font-space uppercase text-[10px] tracking-wider">
                <AlertTriangle size={12} className="group-hover:animate-bounce" />
                1. Calendar Outage (503)
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Trigger Google Calendar API block. Injects failure entry to background scheduler retry queue.
              </p>
            </button>

            <button
              onClick={async () => {
                await firebaseService.simulateAgentFailure('oauth_expired');
                await onRefresh();
              }}
              className="bg-[#0D1525] border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/5 transition-all text-left p-3.5 rounded-xl text-slate-200 text-xs font-sans group cursor-pointer space-y-1"
            >
              <div className="flex items-center gap-1.5 text-red-400 font-bold font-space uppercase text-[10px] tracking-wider">
                <AlertTriangle size={12} className="group-hover:animate-bounce" />
                2. OAuth Credential Loss
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Simulate expired authentication token. Triggers automatic re-handshake and token pool refresh.
              </p>
            </button>

            <button
              onClick={async () => {
                await firebaseService.simulateAgentFailure('gemini_timeout');
                await onRefresh();
              }}
              className="bg-[#0D1525] border border-[#7B61FF]/20 hover:border-[#7B61FF]/50 hover:bg-[#7B61FF]/5 transition-all text-left p-3.5 rounded-xl text-slate-200 text-xs font-sans group cursor-pointer space-y-1"
            >
              <div className="flex items-center gap-1.5 text-[#9D8BFF] font-bold font-space uppercase text-[10px] tracking-wider">
                <Sparkles size={12} className="group-hover:animate-bounce" />
                3. Gemini API Timeout
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Force models/gemini-2.0-flash delay. Triggers deterministic local failback routing automatically.
              </p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
