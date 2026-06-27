/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Activity, Flame, LayoutDashboard, History, Bell } from 'lucide-react';
import { UserProfile, Task, AppNotification } from '../types';
import AvatarPicker from './AvatarPicker';
import { firebaseService } from '../services/firebase';

interface NavbarProps {
  user: UserProfile;
  tasks: Task[];
  activeTab: 'dashboard' | 'logs';
  setActiveTab: (tab: 'dashboard' | 'logs') => void;
  onLogout: () => void;
}

export default function Navbar({ user, tasks, activeTab, setActiveTab, onLogout }: NavbarProps) {
  // Count counts of tasks
  const activeTasks = tasks.filter((t) => t.status === 'active');
  const criticalCount = activeTasks.filter((t) => t.riskScore >= 80).length;
  const warningCount = activeTasks.filter((t) => t.riskScore >= 40 && t.riskScore < 80).length;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isTrayOpen, setIsTrayOpen] = useState(false);

  const loadNotifications = async () => {
    const list = await firebaseService.getNotifications();
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
    window.addEventListener('clutch-notifications-updated', loadNotifications);
    return () => window.removeEventListener('clutch-notifications-updated', loadNotifications);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="w-full bg-[#0E1B2A]/90 border-b border-[#1C2F46] backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-3.5 flex justify-between items-center transition-all">
      {/* Brand Logo and Title */}
      <div className="flex items-center gap-2 select-none">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#00D4FF] to-[#7B61FF] flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.3)]">
          <Flame size={15} className="text-[#0D1B2A] stroke-[3]" />
        </div>
        <span className="font-space font-bold text-lg text-slate-100 tracking-wider">
          CLUTCH
        </span>
        <span className="hidden sm:inline text-[9px] font-mono text-[#00D4FF] uppercase tracking-widest bg-[#00D4FF]/10 px-2 py-0.5 rounded border border-[#00D4FF]/20">
          Agent Active
        </span>
      </div>

      {/* Navigation tabs */}
      <div className="hidden md:flex items-center bg-[#07111C] p-1 rounded-lg border border-[#1A2F45]">
        <button
          id="tab-dashboard"
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-space uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-[#00D4FF] text-[#0D1B2A] font-bold shadow-[0_0_15px_rgba(0,212,255,0.2)]'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          <LayoutDashboard size={13} />
          Terminal
        </button>
        <button
          id="tab-logs"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-space uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-[#7B61FF] text-[#0D1B2A] font-bold shadow-[0_0_15px_rgba(123,97,255,0.2)]'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          <History size={13} />
          Agent Log
        </button>
      </div>

      {/* Task indicators and User credentials */}
      <div className="flex items-center gap-4">
        
        {/* Urgent indicators */}
        <div className="hidden sm:flex items-center gap-3">
          {criticalCount > 0 && (
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex items-center gap-1 bg-[#FF3B5C]/15 border border-[#FF3B5C]/30 text-[#FF3B5C] px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold"
            >
              <div className="w-1.5 h-1.5 bg-[#FF3B5C] rounded-full" />
              <span>{criticalCount} CRISIS</span>
            </motion.div>
          )}
          
          {warningCount > 0 && (
            <div className="flex items-center gap-1 bg-[#FFB800]/15 border border-[#FFB800]/30 text-[#FFB800] px-2.5 py-1 rounded-full text-[10px] font-mono">
              <div className="w-1.5 h-1.5 bg-[#FFB800] rounded-full" />
              <span>{warningCount} WARNING</span>
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

                  <div className="max-h-64 overflow-y-auto space-y-2 divide-y divide-slate-800/40 pr-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 font-mono text-[11px]">
                        📭 Queue Empty. No active alerts.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={async () => {
                            await firebaseService.markNotificationAsRead(notif.id);
                            await loadNotifications();
                          }}
                          className={`pt-2.5 first:pt-0 flex items-start gap-2.5 cursor-pointer transition-colors group ${
                            notif.isRead ? 'opacity-50' : 'opacity-100'
                          }`}
                        >
                          <span className="mt-1 shrink-0 text-xs">
                            {notif.type === 'crisis' ? '🚨' : notif.type === 'warning' ? '⚠️' : 'ℹ️'}
                          </span>
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <h4 className={`text-xs font-sans font-bold leading-tight group-hover:text-[#00D4FF] transition-colors ${
                              notif.isRead ? 'text-slate-400' : 'text-slate-200'
                            }`}>
                              {notif.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 font-sans leading-normal break-words">
                              {notif.body}
                            </p>
                            <div className="text-[9px] font-mono text-slate-500">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </div>
                          {!notif.isRead && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] mt-1.5 shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User profile capsule */}
        <div className="flex items-center gap-2.5 bg-[#07111C] border border-[#1A2F45] pl-3 pr-2.5 py-1 rounded-full">
          <div className="flex flex-col text-right pr-1">
            <span className="text-xs font-semibold text-slate-100 max-w-[100px] truncate leading-tight">
              {user.name}
            </span>
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest leading-none">
              Operator
            </span>
          </div>

          {/* Large Avatar preview */}
          <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-700 bg-[#0A121E]">
            <AvatarPicker
              selectedId={user.avatarId}
              onSelect={() => {}}
              interactive={false}
              size="sm"
            />
          </div>

          {/* Action trigger: Sign-Out */}
          <button
            id="nav-logout-btn"
            onClick={onLogout}
            title="Disconnect system"
            className="p-1 text-slate-400 hover:text-[#FF3B5C] transition-colors hover:scale-105 active:scale-95 cursor-pointer ml-1"
          >
            <LogOut size={13} />
          </button>
        </div>

      </div>
    </header>
  );
}
