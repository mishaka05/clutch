/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Activity, Flame, LayoutDashboard, History, Bell, Calendar as CalendarIcon } from 'lucide-react';
import { UserProfile, Task, AppNotification } from '../types';
import AvatarPicker from './AvatarPicker';
import { firebaseService } from '../services/firebase';
import { formatHumanFriendlyDeadline } from '../utils/dateUtils';

interface NavbarProps {
  user: UserProfile;
  tasks: Task[];
  activeTab: 'dashboard' | 'calendar' | 'logs';
  setActiveTab: (tab: 'dashboard' | 'calendar' | 'logs') => void;
  onLogout: () => void;
}

export default function Navbar({ user, tasks, activeTab, setActiveTab, onLogout }: NavbarProps) {
  // Count counts of tasks
  const activeTasks = tasks.filter((t) => t.status === 'active');
  const criticalCount = activeTasks.filter((t) => t.riskScore >= 80).length;
  const warningCount = activeTasks.filter((t) => t.riskScore >= 40 && t.riskScore < 80).length;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [recentUpdates, setRecentUpdates] = useState<Record<string, {
    updatedAt: number;
    prevRiskScore?: number;
    newRiskScore?: number;
  }>>({});

  const prevNotifsRef = React.useRef<AppNotification[]>([]);
  const isInitialLoadRef = React.useRef<boolean>(true);

  const loadNotifications = async () => {
    const list = await firebaseService.getNotifications();
    
    if (isInitialLoadRef.current) {
      setNotifications(list);
      prevNotifsRef.current = list;
      isInitialLoadRef.current = false;
      return;
    }

    const updatedMap = { ...recentUpdates };
    let hasNewUpdates = false;

    for (const newNotif of list) {
      const oldNotif = prevNotifsRef.current.find(n => n.id === newNotif.id);
      if (oldNotif) {
        const bodyChanged = oldNotif.body !== newNotif.body;
        const typeChanged = oldNotif.type !== newNotif.type;
        const riskChanged = oldNotif.riskScore !== newNotif.riskScore;

        if (bodyChanged || typeChanged || riskChanged) {
          hasNewUpdates = true;
          updatedMap[newNotif.id] = {
            updatedAt: Date.now(),
            prevRiskScore: oldNotif.riskScore,
            newRiskScore: newNotif.riskScore,
          };
        }
      }
    }

    if (hasNewUpdates) {
      setRecentUpdates(updatedMap);
    }

    setNotifications(list);
    prevNotifsRef.current = list;
  };

  useEffect(() => {
    loadNotifications();
    window.addEventListener('clutch-notifications-updated', loadNotifications);
    return () => window.removeEventListener('clutch-notifications-updated', loadNotifications);
  }, []);

  useEffect(() => {
    const keys = Object.keys(recentUpdates);
    if (keys.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      const copy = { ...recentUpdates };

      for (const id of keys) {
        if (now - copy[id].updatedAt >= 5000) {
          delete copy[id];
          changed = true;
        }
      }

      if (changed) {
        setRecentUpdates(copy);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [recentUpdates]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
    <header className="w-full bg-[#0E1B2A]/90 border-b border-[#1C2F46] backdrop-blur-md sticky top-0 z-40 px-3 sm:px-4 md:px-6 lg:px-8 py-3.5 flex justify-between items-center transition-all">
      {/* Brand Logo and Title */}
      <div className="flex items-center gap-2 select-none shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#38BDF8] to-[#8B5CF6] flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.3)]">
          <Flame size={15} className="text-[#0D1B2A] stroke-[3]" />
        </div>
        <span className="font-space font-bold text-base sm:text-lg text-slate-100 tracking-wider">
          CLUTCH
        </span>
        <span className="hidden lg:inline text-[9px] font-mono text-[#38BDF8] uppercase tracking-widest bg-[#38BDF8]/10 px-2 py-0.5 rounded border border-[#38BDF8]/20">
          Agent Active
        </span>
      </div>

      {/* Navigation tabs */}
      <div className="hidden md:flex items-center bg-[#07111C] p-1 rounded-lg border border-[#1A2F45] shrink-0">
        <button
          id="tab-dashboard"
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-1.5 px-2.5 lg:px-4 py-1.5 rounded-md text-xs font-space uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-[#38BDF8] text-[#0D1B2A] font-bold shadow-[0_0_15px_rgba(56,189,248,0.2)]'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          <LayoutDashboard size={13} />
          Terminal
        </button>
        <button
          id="tab-calendar"
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-1.5 px-2.5 lg:px-4 py-1.5 rounded-md text-xs font-space uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-[#22C55E] text-[#0D1B2A] font-bold shadow-[0_0_15px_rgba(34,197,94,0.2)]'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          <CalendarIcon size={13} />
          Calendar
        </button>
        <button
          id="tab-logs"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-1.5 px-2.5 lg:px-4 py-1.5 rounded-md text-xs font-space uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-[#8B5CF6] text-[#0D1B2A] font-bold shadow-[0_0_15px_rgba(139,92,246,0.2)]'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          <History size={13} />
          Agent Log
        </button>
      </div>

      {/* Task indicators and User credentials */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        
        {/* Urgent indicators */}
        <div className="hidden sm:flex items-center gap-2.5">
          {criticalCount > 0 && (
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex items-center gap-1 bg-[#FF3B5C]/15 border border-[#FF3B5C]/30 text-[#FF3B5C] px-2 py-1 rounded-full text-[10px] font-mono font-semibold shrink-0"
            >
              <div className="w-1.5 h-1.5 bg-[#FF3B5C] rounded-full shrink-0" />
              <span className="hidden lg:inline">{criticalCount} CRISIS</span>
              <span className="inline lg:hidden">{criticalCount}C</span>
            </motion.div>
          )}
          
          {warningCount > 0 && (
            <div className="flex items-center gap-1 bg-[#FFB800]/15 border border-[#FFB800]/30 text-[#FFB800] px-2 py-1 rounded-full text-[10px] font-mono shrink-0">
              <div className="w-1.5 h-1.5 bg-[#FFB800] rounded-full shrink-0" />
              <span className="hidden lg:inline">{warningCount} WARNING</span>
              <span className="inline lg:hidden">{warningCount}W</span>
            </div>
          )}
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            id="nav-notification-btn"
            onClick={() => setIsTrayOpen(!isTrayOpen)}
            className={`relative p-2 rounded-xl transition-all cursor-pointer ${
              isTrayOpen ? 'text-[#00D4FF] bg-[#1A2F45]/40' : 'text-slate-400 hover:text-[#00D4FF] hover:bg-[#1A2F45]/20'
            }`}
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF3B5C] rounded-full animate-pulse" />
            )}
          </button>

          <AnimatePresence>
            {isTrayOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsTrayOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2.5 w-80 md:w-96 bg-[#0E1B2A] border border-[#1C2F46] rounded-2xl shadow-2xl p-4 z-50 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-200">NOTIFICATION DISPATCH</span>
                      {unreadCount > 0 && (
                        <span className="bg-[#FF3B5C]/10 text-[#FF3B5C] text-[9px] font-mono px-2 py-0.5 rounded-full font-bold">
                          {unreadCount} NEW
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={async () => {
                          await firebaseService.clearAllNotifications();
                          await loadNotifications();
                        }}
                        className="text-[9px] font-mono text-slate-500 hover:text-red-400 uppercase transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 relative">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 font-mono text-[11px]">
                        📭 Queue Empty. No active alerts.
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const updateInfo = recentUpdates[notif.id];
                        const isUpdated = !!updateInfo;
                        const hasRiskChanged = isUpdated && 
                          updateInfo.prevRiskScore !== undefined && 
                          updateInfo.newRiskScore !== undefined && 
                          updateInfo.prevRiskScore !== updateInfo.newRiskScore;

                        return (
                          <motion.div
                            key={notif.id}
                            onClick={async () => {
                              await firebaseService.markNotificationAsRead(notif.id);
                              await loadNotifications();
                            }}
                            animate={isUpdated ? {
                              scale: [1, 1.02, 1],
                              borderColor: ["rgba(28, 47, 70, 0.4)", "rgba(0, 212, 255, 0.8)", "rgba(28, 47, 70, 0.4)"],
                              boxShadow: [
                                "0 0 0 rgba(0, 212, 255, 0)",
                                "0 0 12px rgba(0, 212, 255, 0.3)",
                                "0 0 0 rgba(0, 212, 255, 0)"
                              ]
                            } : {}}
                            transition={isUpdated ? {
                              repeat: Infinity,
                              duration: 1.5,
                              ease: "easeInOut"
                            } : {}}
                            className={`relative p-3 rounded-xl border flex gap-2.5 cursor-pointer transition-all duration-300 group ${
                              isUpdated
                                ? 'bg-[#10243C]/60 border-[#00D4FF]/50 shadow-[0_0_15px_rgba(0,212,255,0.15)] ring-1 ring-[#00D4FF]/20'
                                : 'bg-[#09121E]/50 border-[#1C2F46]/70 hover:bg-[#122339]/50 hover:border-[#2A415C]/80 shadow-inner'
                            } ${
                              notif.isRead ? 'opacity-55 hover:opacity-85' : 'opacity-100'
                            }`}
                          >
                            <span className="mt-0.5 shrink-0 text-sm">
                              {notif.type === 'crisis' ? '🚨' : notif.type === 'warning' ? '⚠️' : 'ℹ️'}
                            </span>
                            
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-1.5">
                                <h4 className={`text-xs font-sans font-bold leading-tight group-hover:text-[#00D4FF] transition-colors ${
                                  notif.isRead ? 'text-slate-400' : 'text-slate-200'
                                }`}>
                                  {notif.title}
                                </h4>
                                
                                <AnimatePresence>
                                  {isUpdated && (
                                    <motion.span
                                      initial={{ scale: 0.7, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      exit={{ scale: 0.7, opacity: 0 }}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 tracking-widest uppercase shrink-0 animate-pulse"
                                    >
                                      UPDATED
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </div>
                              
                              <p className="text-[11px] text-slate-400 font-sans leading-normal break-words">
                                {notif.body}
                              </p>

                              <AnimatePresence>
                                {hasRiskChanged && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                    animate={{ height: "auto", opacity: 1, marginTop: 6 }}
                                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="flex items-center gap-1.5 bg-[#00D4FF]/10 border border-[#00D4FF]/20 rounded-md px-2 py-1 font-mono text-[10px] text-[#00D4FF] w-fit">
                                      <span className="font-semibold uppercase tracking-wider text-[8px]">Risk Updated:</span>
                                      <span className="font-bold line-through opacity-65">{updateInfo.prevRiskScore}%</span>
                                      <span>→</span>
                                      <span className="font-extrabold text-white animate-bounce inline-block">{updateInfo.newRiskScore}%</span>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <div className="text-[9px] font-mono text-slate-500 pt-1 flex items-center justify-between">
                                <span>
                                  {isUpdated ? (
                                    <span className="text-[#00D4FF] font-bold animate-pulse">Just now</span>
                                  ) : (
                                    formatHumanFriendlyDeadline(notif.timestamp)
                                  )}
                                </span>
                                {notif.riskScore !== undefined && (
                                  <span className="text-slate-400 font-mono text-[9px] bg-[#112235] px-1.5 py-0.5 rounded border border-slate-700/50">
                                    Risk: {notif.riskScore}%
                                  </span>
                                )}
                              </div>
                            </div>

                            {!notif.isRead && (
                              <div className="absolute top-3.5 right-3 w-1.5 h-1.5 rounded-full bg-[#00D4FF] shrink-0 shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User profile capsule */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#07111C] border border-[#1A2F45] pl-2.5 sm:pl-3 pr-1.5 sm:pr-2 py-1 rounded-full shrink-0">
          <div className="flex flex-col text-right pr-1 shrink-0">
            <span className="text-xs font-semibold text-slate-100 max-w-[60px] sm:max-w-[80px] lg:max-w-[120px] truncate leading-tight">
              {user.name}
            </span>
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest leading-none">
              Operator
            </span>
          </div>

          {/* Large Avatar preview */}
          <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-700 bg-[#0A121E] shrink-0 flex items-center justify-center">
            <AvatarPicker
              selectedId={user.avatarId}
              onSelect={() => {}}
              interactive={false}
              size="xs"
            />
          </div>

          {/* Action trigger: Sign-Out */}
          <button
            id="nav-logout-btn"
            onClick={onLogout}
            title="Disconnect system"
            className="p-1 text-slate-400 hover:text-[#FF3B5C] transition-colors hover:scale-105 active:scale-95 cursor-pointer ml-0.5 shrink-0"
          >
            <LogOut size={13} />
          </button>
        </div>

      </div>
    </header>

    {/* Mobile Bottom Navigation Bar */}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0E1B2A]/95 border-t border-[#1C2F46] backdrop-blur-md z-40 py-2.5 px-6 flex justify-around items-center shadow-lg">
      <button
        onClick={() => setActiveTab('dashboard')}
        className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
          activeTab === 'dashboard' ? 'text-[#38BDF8]' : 'text-slate-400'
        }`}
      >
        <LayoutDashboard size={18} />
        <span className="text-[9px] font-space uppercase font-bold tracking-wider">Terminal</span>
      </button>
      <button
        onClick={() => setActiveTab('calendar')}
        className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
          activeTab === 'calendar' ? 'text-[#22C55E]' : 'text-slate-400'
        }`}
      >
        <CalendarIcon size={18} />
        <span className="text-[9px] font-space uppercase font-bold tracking-wider">Calendar</span>
      </button>
      <button
        onClick={() => setActiveTab('logs')}
        className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
          activeTab === 'logs' ? 'text-[#8B5CF6]' : 'text-slate-400'
        }`}
      >
        <History size={18} />
        <span className="text-[9px] font-space uppercase font-bold tracking-wider">Agent Log</span>
      </button>
    </nav>
    </>
  );
}
