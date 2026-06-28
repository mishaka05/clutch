/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  User, 
  Calendar, 
  Key, 
  Clock, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle 
} from 'lucide-react';
import { firebaseService } from '../../../services/firebase';

export default function CalendarDiagnostics() {
  const [logs, setLogs] = useState<{ timestamp: string; message: string; type: 'info' | 'success' | 'error' }[]>([]);
  const [lastSync, setLastSync] = useState<{ timestamp: string; status: 'Success' | 'Failure'; message: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [userProfile, setUserProfile] = useState(firebaseService.getCurrentUser());
  const [isAuthorized, setIsAuthorized] = useState(firebaseService.isCalendarConnected());
  const [isExpired, setIsExpired] = useState(firebaseService.isOutageActive('oauth_expired'));

  const updateState = () => {
    setLogs([...firebaseService.getDiagnosticLogs()]);
    setLastSync(firebaseService.getLastAttemptedSync());
    setUserProfile(firebaseService.getCurrentUser());
    setIsAuthorized(firebaseService.isCalendarConnected());
    setIsExpired(firebaseService.isOutageActive('oauth_expired'));
  };

  useEffect(() => {
    updateState();
    const unsubscribe = firebaseService.subscribeToDiagnostics(updateState);
    
    // Also listen to window event for manual trigger updates
    window.addEventListener('clutch-diagnostics-updated', updateState);
    window.addEventListener('clutch-outages-updated', updateState);
    
    return () => {
      unsubscribe();
      window.removeEventListener('clutch-diagnostics-updated', updateState);
      window.removeEventListener('clutch-outages-updated', updateState);
    };
  }, []);

  const handleRunDiagnostics = async () => {
    setIsRunning(true);
    try {
      await firebaseService.runGoogleCalendarDiagnostics();
    } catch (e) {
      console.error("Manual diagnostics run failed:", e);
    } finally {
      setIsRunning(false);
      updateState();
    }
  };

  // Status computation
  const isAuthActive = userProfile !== null;
  const isFirestoreActive = true; // Hardcoded connected state as per instructions
  const isCalendarActive = isAuthorized && !isExpired;
  const isGeminiActive = !firebaseService.isOutageActive('gemini_timeout');
  const isOfflineActive = true; // Always active fallback

  const getTokenValidity = () => {
    if (!firebaseService.getGoogleAccessToken()) return 'Missing';
    if (isExpired) return 'Expired';
    return 'Valid';
  };

  return (
    <div className="bg-[#0A0D14] border border-white/[0.07] rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-6">
      {/* Visual background ambient accent */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-500/[0.015] blur-3xl rounded-full pointer-events-none" />
      
      {/* Header section with diagnostic statuses */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/[0.05] pb-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2.5">
            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              System Core Ready
            </span>
            <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              v1.0.4-live
            </span>
          </div>
          <h3 className="text-lg font-space font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Terminal size={18} className="text-emerald-500" />
            Google Calendar Diagnostics Pipeline
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Autonomous audit engine verifying OAuth authentication integrity, token health, and primary calendar write boundaries.
          </p>
        </div>

        <button
          onClick={handleRunDiagnostics}
          disabled={isRunning}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00E676]/10 hover:bg-[#00E676]/20 border border-[#00E676]/30 hover:border-[#00E676]/60 text-[#00E676] disabled:opacity-50 disabled:pointer-events-none rounded-xl text-xs font-mono font-bold uppercase transition-all duration-300 shadow-lg shrink-0"
        >
          {isRunning ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              Verifying Pipeline...
            </>
          ) : (
            <>
              <Play size={12} fill="currentColor" />
              Run Diagnostics
            </>
          )}
        </button>
      </div>

      {/* Required Status Indicators section */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="text-[10px]">{isAuthActive ? '🟢' : '🔴'}</span>
          <span className="text-[11px] font-mono text-slate-300 font-medium">Firebase Auth</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px]">{isFirestoreActive ? '🟢' : '🔴'}</span>
          <span className="text-[11px] font-mono text-slate-300 font-medium">Firestore Connected</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px]">{isCalendarActive ? '🟢' : '🔴'}</span>
          <span className="text-[11px] font-mono text-slate-300 font-medium">Calendar Authorized</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px]">{isGeminiActive ? '🟢' : '🔴'}</span>
          <span className="text-[11px] font-mono text-slate-300 font-medium">Gemini Available</span>
        </div>
        <div className="flex items-center gap-2 col-span-2 md:col-span-1">
          <span className="text-[10px]">{isOfflineActive ? '🟢' : '🔴'}</span>
          <span className="text-[11px] font-mono text-slate-300 font-medium">Offline Cache Active</span>
        </div>
      </div>

      {/* Core Diagnostic Fields Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Field 1: Account Connected */}
        <div className="bg-white/[0.015] border border-white/[0.04] p-4 rounded-xl space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Account Connection</span>
            <User size={14} className="text-slate-400" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-200 break-all">
              {userProfile?.email || 'Disconnected'}
            </div>
            <div className="text-[10px] font-mono text-slate-500 uppercase">
              Mode: {userProfile?.mode || 'Demo'}
            </div>
          </div>
        </div>

        {/* Field 2: Calendar Status */}
        <div className="bg-white/[0.015] border border-white/[0.04] p-4 rounded-xl space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Calendar Link</span>
            <Calendar size={14} className="text-slate-400" />
          </div>
          <div className="space-y-1">
            <div className={`text-xs font-semibold flex items-center gap-1.5 ${isCalendarActive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isCalendarActive ? (
                <>
                  <CheckCircle2 size={12} /> Connected
                </>
              ) : (
                <>
                  <XCircle size={12} /> Error / Disconnected
                </>
              )}
            </div>
            <div className="text-[10px] font-mono text-slate-500 uppercase">
              Google Primary Calendar
            </div>
          </div>
        </div>

        {/* Field 3: Token Validity */}
        <div className="bg-white/[0.015] border border-white/[0.04] p-4 rounded-xl space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Token Validity</span>
            <Key size={14} className="text-slate-400" />
          </div>
          <div className="space-y-1">
            <div className={`text-xs font-semibold flex items-center gap-1.5 ${
              getTokenValidity() === 'Valid' ? 'text-emerald-400' : getTokenValidity() === 'Expired' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {getTokenValidity() === 'Valid' && <CheckCircle2 size={12} />}
              {getTokenValidity() === 'Expired' && <AlertTriangle size={12} />}
              {getTokenValidity() === 'Missing' && <XCircle size={12} />}
              {getTokenValidity()}
            </div>
            <div className="text-[10px] font-mono text-slate-500 uppercase">
              Workspace Access Key
            </div>
          </div>
        </div>

        {/* Field 4: Last Attempted Sync */}
        <div className="bg-white/[0.015] border border-white/[0.04] p-4 rounded-xl space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Last Sync Attempt</span>
            <Clock size={14} className="text-slate-400" />
          </div>
          <div className="space-y-1">
            <div className={`text-xs font-semibold flex items-center gap-1.5 ${
              lastSync?.status === 'Success' ? 'text-emerald-400' : lastSync?.status === 'Failure' ? 'text-red-400' : 'text-slate-400'
            }`}>
              {lastSync ? (
                <>
                  {lastSync.status === 'Success' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {lastSync.status}
                </>
              ) : (
                'Never Run'
              )}
            </div>
            <div className="text-[10px] font-mono text-slate-400 break-words leading-tight">
              {lastSync ? (
                <>
                  {new Date(lastSync.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {lastSync.message}
                </>
              ) : (
                'Run diagnostics to test'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Live logs section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
            Diagnostics Live Terminal Feed
          </span>
          <span className="text-[9px] font-mono text-slate-500 uppercase">
            Showing last {logs.length} operations
          </span>
        </div>
        
        <div className="bg-[#030508] border border-white/[0.06] rounded-xl p-4 h-[240px] overflow-y-auto font-mono text-xs text-slate-300 space-y-2 shadow-inner scrollbar-thin scrollbar-thumb-white/[0.05] scrollbar-track-transparent">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic h-full flex items-center justify-center text-[11px] font-sans">
              No diagnostics compiled yet. Press "Run Diagnostics" or schedule a focus session to generate audit logs.
            </div>
          ) : (
            logs.map((log, index) => (
              <div 
                key={index} 
                className={`flex items-start gap-2.5 leading-relaxed py-1 border-b border-white/[0.02] last:border-0 ${
                  log.type === 'success' ? 'text-[#00E676]' : log.type === 'error' ? 'text-[#FF1744]' : 'text-slate-400'
                }`}
              >
                <span className="text-slate-600 select-none text-[10px] mt-0.5 shrink-0">
                  [{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                </span>
                <span className="whitespace-pre-wrap font-mono">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
