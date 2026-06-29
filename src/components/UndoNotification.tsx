/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';
import { firebaseService } from '../services/firebase';

interface AutoScheduleEventDetail {
  taskId: string;
  taskTitle: string;
  requestedTime: string;
  scheduledTime: string;
  isConflictDetected: boolean;
  isDemoMode?: boolean;
}

export default function UndoNotification() {
  const [visible, setVisible] = useState(false);
  const [eventData, setEventData] = useState<AutoScheduleEventDetail | null>(null);
  const [countdown, setCountdown] = useState(20);
  const [undoStatus, setUndoStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleAutoSchedule = (e: Event) => {
      const customEvent = e as CustomEvent<AutoScheduleEventDetail>;
      setEventData(customEvent.detail);
      setCountdown(20);
      setUndoStatus('idle');
      setErrorMessage('');
      setVisible(true);
    };

    window.addEventListener('clutch-auto-schedule', handleAutoSchedule);
    return () => {
      window.removeEventListener('clutch-auto-schedule', handleAutoSchedule);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto finalize when countdown hits 0
          firebaseService.clearUndoState();
          setVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible || !eventData) return null;

  const handleUndo = async () => {
    if (undoStatus === 'processing') return;

    setUndoStatus('processing');
    try {
      const success = await firebaseService.undoLastAutoSchedule();
      if (success) {
        setUndoStatus('success');
        setTimeout(() => {
          setVisible(false);
        }, 3000);
      } else {
        setUndoStatus('failed');
        setErrorMessage('Reversal state not found.');
        setTimeout(() => {
          setVisible(false);
        }, 4000);
      }
    } catch (err: any) {
      setUndoStatus('failed');
      setErrorMessage(err?.message || 'Reversal failed.');
      setTimeout(() => {
        setVisible(false);
      }, 5000);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const requestedStr = formatTime(eventData.requestedTime);
  const scheduledStr = formatTime(eventData.scheduledTime);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#091424]/90 backdrop-blur-lg border border-[#00D4FF]/30 rounded-2xl p-4 md:p-5 shadow-[0_8px_32px_rgba(0,212,255,0.15)] overflow-hidden text-left"
        id="clutch-undo-toast"
      >
        {/* Glow decorative background elements */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#00D4FF]/10 blur-2xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-[#8B5CF6]/10 blur-2xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              {undoStatus === 'idle' && (
                <>
                  {eventData.isDemoMode ? (
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-bold text-[#00E676] tracking-wide uppercase flex items-center gap-1.5">
                        <CheckCircle size={13} /> Session Scheduled
                      </p>
                      <p className="text-xs font-sans text-slate-200 font-semibold">
                        ✓ Focus session scheduled locally.
                      </p>
                    </div>
                  ) : eventData.isConflictDetected ? (
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-bold text-[#FFB800] tracking-wide uppercase flex items-center gap-1.5">
                        <AlertTriangle size={13} /> Conflict Resolved
                      </p>
                      <p className="text-xs font-sans text-slate-200 font-medium leading-relaxed">
                        <span className="font-bold text-slate-100">{requestedStr}</span> was unavailable.
                        <br />
                        Your focus session has been scheduled for <span className="font-bold text-[#00D4FF]">{scheduledStr}</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-bold text-[#00E676] tracking-wide uppercase flex items-center gap-1.5">
                        <CheckCircle size={13} /> Session Scheduled
                      </p>
                      <p className="text-xs font-sans text-slate-200 font-semibold">
                        ✓ Focus session scheduled for <span className="text-[#00D4FF]">{scheduledStr}</span>
                      </p>
                    </div>
                  )}
                </>
              )}

              {undoStatus === 'processing' && (
                <div className="flex items-center gap-2.5 py-1">
                  <div className="w-4 h-4 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-mono text-[#00D4FF] uppercase tracking-wider font-bold">
                    Reverting changes...
                  </p>
                </div>
              )}

              {undoStatus === 'success' && (
                <div className="space-y-1">
                  <p className="text-xs font-mono font-bold text-[#00E676] tracking-wide uppercase flex items-center gap-1.5">
                    ✓ Success
                  </p>
                  <p className="text-xs font-sans text-emerald-400 font-bold">
                    Scheduling reverted successfully.
                  </p>
                </div>
              )}

              {undoStatus === 'failed' && (
                <div className="space-y-1">
                  <p className="text-xs font-mono font-bold text-red-400 tracking-wide uppercase flex items-center gap-1.5">
                    ⚠ Reversal Failed
                  </p>
                  <p className="text-xs font-sans text-red-300">
                    {errorMessage}
                  </p>
                </div>
              )}
            </div>

            {undoStatus === 'idle' && (
              <button
                onClick={() => setVisible(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded-lg hover:bg-white/5 cursor-pointer"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {undoStatus === 'idle' && (
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 mt-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                TaskId: {eventData.taskId.substring(0, 8)}
              </span>
              <button
                onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/35 border border-[#8B5CF6]/40 hover:border-[#8B5CF6]/80 text-[#8B5CF6] text-xs font-mono font-bold uppercase rounded-lg transition-all duration-300 hover:shadow-[0_0_10px_rgba(139,92,246,0.2)] cursor-pointer"
              >
                <RotateCcw size={11} />
                <span>Undo ({countdown})</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
