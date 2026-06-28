/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, Sparkles, Check, Play } from 'lucide-react';
import { AgentLog } from '../../../types';
import { firebaseService } from '../../../services/firebase';
import { formatHumanFriendlyDeadline } from '../../../utils/dateUtils';
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
        className="absolute -left-[35px] top-1.5 w-6 h-6 rounded-full border-2 border-[#020106] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
        style={{
          backgroundColor: isErr ? '#FF3B5C' : log.isAgentInitiated ? '#8052ff' : '#00D4FF',
          boxShadow: isErr 
            ? '0 0 12px rgba(255, 59, 92, 0.4)' 
            : log.isAgentInitiated 
              ? '0 0 12px rgba(128, 82, 255, 0.4)' 
              : '0 0 12px rgba(0, 212, 255, 0.2)'
        }}
      >
        {isErr ? (
          <AlertTriangle size={10} className="text-white animate-pulse" />
        ) : log.isAgentInitiated ? (
          <Sparkles size={10} className="text-white" />
        ) : (
          <Check size={10} className="text-black font-bold" />
        )}
      </span>

      <div className={`p-6 rounded-2xl border transition-all duration-300 ${
        isErr 
          ? 'bg-gradient-to-br from-[#1c080d] to-[#040103] border-red-500/20 hover:border-red-500/40 shadow-2xl' 
          : log.isAgentInitiated 
            ? 'bg-gradient-to-br from-[#0c0a18] via-[#050508] to-[#010103] border-white/[0.08] hover:border-[#8052ff]/40 shadow-lg' 
            : 'bg-gradient-to-br from-[#050508] to-[#010103] border-white/[0.06] hover:border-[#00D4FF]/30 shadow-md'
      }`}>
        {/* Card Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2">
            <span 
              className="text-xs font-space font-semibold uppercase tracking-wider"
              style={{ color: isErr ? '#FF5C7A' : log.isAgentInitiated ? '#a385ff' : '#00D4FF' }}
            >
              {log.actionTaken}
            </span>
            
            {log.agentType && (
              <span className="text-[8px] font-mono bg-white/[0.03] text-slate-400 border border-white/[0.05] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                🤖 {log.agentType}
              </span>
            )}

            {log.evaluationSource && (
              <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full uppercase font-bold tracking-wider border ${
                log.evaluationSource === 'gemini'
                  ? 'bg-purple-950/20 text-purple-400 border-purple-500/20'
                  : log.evaluationSource === 'deterministic'
                    ? 'bg-blue-950/20 text-blue-400 border-blue-500/20'
                    : 'bg-amber-950/20 text-amber-400 border-amber-500/20'
              }`}>
                🧠 {log.evaluationSource}
              </span>
            )}

            {isErr && (
              <span className="text-[8px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider animate-pulse">
                {log.status === 'failed_retrying' ? '🔄 RETRY QUEUE (1 of 3)' : '🔴 TERMINAL OUTAGE'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-semibold">
              {formatHumanFriendlyDeadline(log.timestamp)}
            </span>
          </div>
        </div>

        {/* Task Context Title Banner */}
        {log.taskTitle && (
          <div className="mb-3.5 inline-flex items-center gap-2 bg-white/[0.01] border border-white/[0.05] px-3 py-1 rounded-xl text-[10px] font-mono text-slate-400">
            <span className="text-slate-500 uppercase font-bold tracking-wider text-[8px]">Target Task:</span>
            <span className="text-slate-300 font-sans font-medium">{log.taskTitle}</span>
          </div>
        )}

        {/* Primary Reason details */}
        <p className="text-xs text-slate-300 leading-relaxed font-sans font-normal mb-4">
          {log.reason}
        </p>

        {/* Error block details */}
        {isErr && log.errorMessage && (
          <div className="mb-4 p-4 bg-red-950/15 rounded-xl border border-red-500/10 font-mono text-[10px] text-red-400 space-y-1">
            <div><strong className="text-red-300 uppercase tracking-wider text-[9px]">DIAGNOSTIC ERROR LOG:</strong> {log.errorMessage}</div>
            <div className="text-slate-500 font-sans text-[10px]">System State: Active queue hold backoff (15s polling active)</div>
          </div>
        )}

        {/* Explainability Matrix Grid & Confidence */}
        <ExplainabilityPanel log={log} />

        {/* Footer Action Bar for error recovery & Telemetry (LEARN Matrix) */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">Approval:</span>
            <span className="text-[9px] font-mono text-[#8052ff] bg-[#8052ff]/10 border border-[#8052ff]/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
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
              className="bg-[#00E676] hover:bg-[#22ff8f] text-black text-[10px] font-bold font-space uppercase px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-[0.97]"
            >
              <Play size={10} className="fill-black text-black" />
              Manual Self-Heal Loop
            </button>
          ) : (
            log.isAgentInitiated && (
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono text-slate-500 uppercase font-bold tracking-wider mr-1">Feedback Loop:</span>
                <button
                  onClick={async () => {
                    await firebaseService.updateAgentLogTelemetry(log.id, 'USER_ACCEPTED');
                    await onRefresh();
                  }}
                  className={`px-3 py-1 text-[9px] font-mono rounded-full border transition-all cursor-pointer active:scale-90 ${
                    log.telemetryFeedback === 'USER_ACCEPTED'
                      ? 'bg-emerald-500/20 text-[#00E676] border-emerald-500/35 font-bold'
                      : 'bg-white/[0.01] border-white/[0.05] text-slate-500 hover:text-slate-300 hover:border-white/[0.12]'
                  }`}
                >
                  Accept
                </button>
                <button
                  onClick={async () => {
                    await firebaseService.updateAgentLogTelemetry(log.id, 'USER_IGNORED');
                    await onRefresh();
                  }}
                  className={`px-3 py-1 text-[9px] font-mono rounded-full border transition-all cursor-pointer active:scale-90 ${
                    log.telemetryFeedback === 'USER_IGNORED'
                      ? 'bg-amber-500/20 text-[#FFB800] border-amber-500/35 font-bold'
                      : 'bg-white/[0.01] border-white/[0.05] text-slate-500 hover:text-slate-300 hover:border-white/[0.12]'
                  }`}
                >
                  Ignore
                </button>
                <button
                  onClick={async () => {
                    await firebaseService.updateAgentLogTelemetry(log.id, 'USER_DELETED');
                    await onRefresh();
                  }}
                  className={`px-3 py-1 text-[9px] font-mono rounded-full border transition-all cursor-pointer active:scale-90 ${
                    log.telemetryFeedback === 'USER_DELETED'
                      ? 'bg-red-500/20 text-[#FF3B5C] border-red-500/35 font-bold'
                      : 'bg-white/[0.01] border-white/[0.05] text-slate-500 hover:text-slate-300 hover:border-white/[0.12]'
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
