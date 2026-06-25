/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { LogOut, Activity, Flame, LayoutDashboard, History } from 'lucide-react';
import { UserProfile, Task } from '../types';
import AvatarPicker from './AvatarPicker';

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
