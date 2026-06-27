/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, Sparkles, Check, Play } from 'lucide-react';
import { AgentLog } from '../../../types';
import { firebaseService } from '../../../services/firebase';
import ExplainabilityPanel from './ExplainabilityPanel';

interface AgentLogCardProps {
  log: AgentLog;
  onRefresh: () => Promise<void>;
  key?: string | number;
}

export default function AgentLogCard({ log, onRefresh }: AgentLogCardProps) {
  const isErr = log.isFailure === true;

  return (
    <div className="relative group">
      {/* Left Bullet Icon */}
      <span 
        className="absolute -left-[35px] top-1.5 w-6 h-6 rounded-full border-2 border-[#0D1B2A] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
        style={{
          backgroundColor: isErr ? '#EF4444' : log.isAgentInitiated ? '#7B61FF' : '#00D4FF',
          boxShadow: isErr 
            ? '0 0 10px rgba(239, 68, 68, 0.4)' 
            : log.isAgentInitiated 
              ? '0 0 10px rgba(123, 97, 255, 0.4)' 
              : 'none'
        }}
      >
        {isErr ? (
          <AlertTriangle size={11} className="text-white animate-pulse" />
        ) : log.isAgentInitiated ? (
          <Sparkles size={11} className="text-white" />
        ) : (
          <Check size={11} className="text-[#0D1B2A] font-bold" />
        )}
      </span>

      <div className={`p-5 rounded-2xl border transition-all ${
        isErr 
          ? 'bg-red-950/20 border-red-500/20 hover:border-red-500/40' 
          : log.isAgentInitiated 
            ? 'bg-[#121B2A] border-[#1C2F46] hover:border-[#7B61FF]/40' 
            : 'bg-slate-900/40 border-[#1C2F46]/50 hover:border-[#00D4FF]/30'
      }`}>
        {/* Card Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span 
              className="text-sm font-space font-bold uppercase tracking-wider"
              style={{ color: isErr ? '#F87171' : log.isAgentInitiated ? '#9D8BFF' : '#00D4FF' }}
            >
              {log.actionTaken}
            </span>
            
            {log.agentType && (
              <span className="text-[9px] font-mono bg-slate-900/80 text-slate-400 border border-slate-800 px-2 py-0.5 rounded uppercase font-semibold">
                🤖 {log.agentType}
              </span>
            )}

            {log.evaluationSource && (
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-semibold border ${
                log.evaluationSource === 'gemini'
                  ? 'bg-purple-950/40 text-purple-400 border-purple-500/20'
                  : log.evaluationSource === 'deterministic'
                    ? 'bg-blue-950/40 text-blue-400 border-blue-500/20'
                    : 'bg-amber-950/40 text-amber-400 border-amber-500/20'
              }`}>
                🧠 {log.evaluationSource}
              </span>
            )}

            {isErr && (
              <span className="text-[9px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded uppercase font-semibold animate-pulse">
                {log.status === 'failed_retrying' ? '🔄 RETRY QUEUE (1 of 3)' : '🔴 TERMINAL OUTAGE'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500">
              {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Task Context Title Banner */}
        {log.taskTitle && (
          <div className="mb-3 inline-flex items-center gap-1.5 bg-slate-950/40 border border-slate-900 px-2.5 py-1 rounded text-[11px] font-mono text-slate-400">
            <span className="text-slate-500">Target Task:</span>
            <span className="text-slate-300 font-sans font-medium">{log.taskTitle}</span>
          </div>
        )}

        {/* Primary Reason details */}
        <p className="text-xs text-slate-300 leading-relaxed font-sans font-normal mb-4">
          {log.reason}
        </p>

        {/* Error block details */}
        {isErr && log.errorMessage && (
          <div className="mb-4 p-3 bg-red-950/40 rounded-xl border border-red-500/10 font-mono text-[10px] text-red-400 space-y-1">
            <div><strong className="text-red-300">DIAGNOSTIC ERROR LOG:</strong> {log.errorMessage}</div>
            <div className="text-slate-500 font-sans">System State: Active queue hold backoff (15s polling active)</div>
          </div>
        )}

        {/* Explainability Matrix Grid & Confidence */}
        <ExplainabilityPanel log={log} />

        {/* Footer Action Bar for error recovery & Telemetry (LEARN Matrix) */}
        <div className="mt-4 pt-3 border-t border-slate-800/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Approval Model:</span>
            <span className="text-[10px] font-mono text-[#7B61FF] bg-[#7B61FF]/10 px-2 py-0.5 rounded font-semibold ml-1">
              {log.userApprovalApplied || 'AUTONOMOUS'}
            </span>
          </div>

          {isErr ? (
            <button
              onClick={async () => {
                // Clear the associated simulated outage
                let outageType: 'calendar_503' | 'oauth_expired' | 'gemini_timeout' | null = null;
                if (log.agentType === 'CALENDAR_SCHEDULER') outageType = 'calendar_503';
                else if (log.agentType === 'TASK_MONITOR') outageType = 'oauth_expired';
                else if (log.agentType === 'RISK_ASSESSOR') outageType = 'gemini_timeout';

                if (outageType) {
                  firebaseService.setOutageState(outageType, false);
                }

                // Execute background Recovery Agent cycle immediately
                await firebaseService.runTaskMonitorCycle(undefined, true);
                await onRefresh();
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-[#0D1B2A] text-[10px] font-bold font-space uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play size={10} className="fill-[#0D1B2A]" />
              Trigger Manual Self-Heal Recovery Loop
            </button>
          ) : (
            log.isAgentInitiated && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-slate-400 uppercase mr-1">Telemetry (LEARN):</span>
                <button
                  onClick={async () => {
                    await firebaseService.updateAgentLogTelemetry(log.id, 'USER_ACCEPTED');
                    await onRefresh();
                  }}
                  className={`px-2 py-0.5 text-[9px] font-mono rounded border transition-all ${
                    log.telemetryFeedback === 'USER_ACCEPTED'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                  }`}
                >
                  Accept
                </button>
                <button
                  onClick={async () => {
                    await firebaseService.updateAgentLogTelemetry(log.id, 'USER_IGNORED');
                    await onRefresh();
                  }}
                  className={`px-2 py-0.5 text-[9px] font-mono rounded border transition-all ${
                    log.telemetryFeedback === 'USER_IGNORED'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                  }`}
                >
                  Ignore
                </button>
                <button
                  onClick={async () => {
                    await firebaseService.updateAgentLogTelemetry(log.id, 'USER_DELETED');
                    await onRefresh();
                  }}
                  className={`px-2 py-0.5 text-[9px] font-mono rounded border transition-all ${
                    log.telemetryFeedback === 'USER_DELETED'
                      ? 'bg-red-500/20 text-red-400 border-red-500/40 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                  }`}
                >
                  Revert
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
