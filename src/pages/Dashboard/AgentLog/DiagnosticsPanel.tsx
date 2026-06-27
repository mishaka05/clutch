/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import { AgentLog } from '../../../types';
import { firebaseService } from '../../../services/firebase';

interface DiagnosticsPanelProps {
  logs: AgentLog[];
  onRefresh: () => Promise<void>;
}

export default function DiagnosticsPanel({ logs, onRefresh }: DiagnosticsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [outages, setOutages] = useState({
    calendar_503: firebaseService.isOutageActive('calendar_503'),
    oauth_expired: firebaseService.isOutageActive('oauth_expired'),
    gemini_timeout: firebaseService.isOutageActive('gemini_timeout'),
  });

  const refreshOutages = () => {
    setOutages({
      calendar_503: firebaseService.isOutageActive('calendar_503'),
      oauth_expired: firebaseService.isOutageActive('oauth_expired'),
      gemini_timeout: firebaseService.isOutageActive('gemini_timeout'),
    });
  };

  useEffect(() => {
    refreshOutages();
    window.addEventListener('clutch-outages-updated', refreshOutages);
    return () => window.removeEventListener('clutch-outages-updated', refreshOutages);
  }, []);

  const handleToggleOutage = async (type: 'calendar_503' | 'oauth_expired' | 'gemini_timeout') => {
    const isCurrentlyActive = outages[type];
    if (isCurrentlyActive) {
      // Clear Outage -> Triggers Recovery Agent self-heal
      firebaseService.setOutageState(type, false);
      // Run evaluation immediately to execute self-healing retry logic
      await firebaseService.runTaskMonitorCycle(undefined, true);
    } else {
      // Simulate failure
      await firebaseService.simulateAgentFailure(type);
    }
    await onRefresh();
    refreshOutages();
  };

  const hasAnyOutages = outages.calendar_503 || outages.oauth_expired || outages.gemini_timeout;

  return (
    <div className="bg-gradient-to-r from-[#1E112A] via-[#0E1527] to-[#09111E] border border-[#7B61FF]/30 rounded-2xl p-5 shadow-xl relative overflow-hidden space-y-4 mb-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#7B61FF]/5 blur-3xl rounded-full pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-[#7B61FF] bg-[#7B61FF]/10 border border-[#7B61FF]/30 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
              DIAGNOSTICS CONSOLE
            </span>
            <span className={`text-[10px] font-mono border px-2.5 py-1 rounded-full uppercase tracking-wider ${
              hasAnyOutages 
                ? 'text-red-400 bg-red-400/10 border-red-500/20' 
                : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
            }`}>
              {hasAnyOutages ? 'Resiliency Alert: Interruptions Active' : 'Resiliency Simulator: All Clear'}
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
            QUEUE TELEMETRY: {hasAnyOutages ? (
              <span className="text-red-400 font-bold">INTERRUPTED (RETRY QUEUE RUNNING)</span>
            ) : (
              <span className="text-emerald-400 font-bold">ACTIVE & SECURE</span>
            )}
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
            <span className={logs.filter(l => l.isFailure && l.status === 'failed_retrying').length > 0 ? "text-amber-400 font-bold" : "text-emerald-400"}>
              {logs.filter(l => l.isFailure && l.status === 'failed_retrying').length} Queue tasks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Calendar Outage (503) */}
            <button
              onClick={() => handleToggleOutage('calendar_503')}
              className={`transition-all text-left p-3.5 rounded-xl text-slate-200 text-xs font-sans group cursor-pointer space-y-2 border ${
                outages.calendar_503
                  ? 'bg-amber-950/20 border-amber-500/60 hover:bg-amber-950/40'
                  : 'bg-[#0D1525] border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 font-bold font-space uppercase text-[10px] tracking-wider ${
                  outages.calendar_503 ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  <AlertTriangle size={12} className={outages.calendar_503 ? "animate-pulse" : ""} />
                  1. Calendar Outage (503)
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  outages.calendar_503 ? 'bg-amber-500/20 text-amber-400 font-bold' : 'bg-slate-800 text-slate-500'
                }`}>
                  {outages.calendar_503 ? 'OUTAGE ACTIVE' : 'ONLINE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                {outages.calendar_503 
                  ? 'Google Calendar API is offline. Click here to RESTORE service and trigger Recovery Agent self-heal.'
                  : 'Simulate Google Calendar API offline block. Injects failure entry to background scheduler.'
                }
              </p>
              {outages.calendar_503 && (
                <div className="pt-1 flex items-center gap-1 text-[10px] font-mono text-amber-400 font-semibold uppercase">
                  <CheckCircle2 size={11} /> Click to Heal Outage
                </div>
              )}
            </button>

            {/* 2. OAuth Credential Loss */}
            <button
              onClick={() => handleToggleOutage('oauth_expired')}
              className={`transition-all text-left p-3.5 rounded-xl text-slate-200 text-xs font-sans group cursor-pointer space-y-2 border ${
                outages.oauth_expired
                  ? 'bg-red-950/20 border-red-500/60 hover:bg-red-950/40'
                  : 'bg-[#0D1525] border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 font-bold font-space uppercase text-[10px] tracking-wider ${
                  outages.oauth_expired ? 'text-red-400' : 'text-slate-400'
                }`}>
                  <ShieldAlert size={12} className={outages.oauth_expired ? "animate-pulse" : ""} />
                  2. OAuth Expired
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  outages.oauth_expired ? 'bg-red-500/20 text-red-400 font-bold' : 'bg-slate-800 text-slate-500'
                }`}>
                  {outages.oauth_expired ? 'OUTAGE ACTIVE' : 'ONLINE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                {outages.oauth_expired
                  ? 'Google OAuth session is expired. Click here to AUTO-REFRESH tokens and self-heal.'
                  : 'Simulate expired authentication session token. Blocks background ingestion, triggers retry loop.'
                }
              </p>
              {outages.oauth_expired && (
                <div className="pt-1 flex items-center gap-1 text-[10px] font-mono text-red-400 font-semibold uppercase">
                  <CheckCircle2 size={11} /> Click to Refresh Auth
                </div>
              )}
            </button>

            {/* 3. Gemini API Timeout */}
            <button
              onClick={() => handleToggleOutage('gemini_timeout')}
              className={`transition-all text-left p-3.5 rounded-xl text-slate-200 text-xs font-sans group cursor-pointer space-y-2 border ${
                outages.gemini_timeout
                  ? 'bg-[#1C1440]/30 border-[#7B61FF]/60 hover:bg-[#1C1440]/50'
                  : 'bg-[#0D1525] border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 font-bold font-space uppercase text-[10px] tracking-wider ${
                  outages.gemini_timeout ? 'text-[#9D8BFF]' : 'text-slate-400'
                }`}>
                  <Sparkles size={12} className={outages.gemini_timeout ? "animate-pulse" : ""} />
                  3. Gemini Timeout
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  outages.gemini_timeout ? 'bg-[#7B61FF]/20 text-[#9D8BFF] font-bold' : 'bg-slate-800 text-slate-500'
                }`}>
                  {outages.gemini_timeout ? 'TIMEOUT ACTIVE' : 'ONLINE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                {outages.gemini_timeout
                  ? 'Gemini 2.0 has high latency timeout. Click here to RESTORE model loop and self-heal.'
                  : 'Force models/gemini-2.0-flash delay. Triggers deterministic local failback routing automatically.'
                }
              </p>
              {outages.gemini_timeout && (
                <div className="pt-1 flex items-center gap-1 text-[10px] font-mono text-[#9D8BFF] font-semibold uppercase">
                  <CheckCircle2 size={11} /> Click to Restore Gemini
                </div>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
