/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { AgentLog } from '../../../types';
import AgentLogCard from './AgentLogCard';

interface AgentTimelineProps {
  logs: AgentLog[];
  onRefresh: () => Promise<void>;
}

export default function AgentTimeline({ logs, onRefresh }: AgentTimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/20 border border-dashed border-[#1C2F46] rounded-2xl text-center">
        <AlertCircle className="text-slate-600 mb-3" size={32} />
        <p className="text-slate-400 text-sm font-sans font-medium">No actions logged yet</p>
        <p className="text-slate-500 text-xs font-mono mt-1">
          Our background agents register logs when analyzing or rescheduled tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-8 space-y-6">
      {/* Vertical Timeline Thread */}
      <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#7B61FF] via-[#00D4FF] to-slate-800" />
      
      {logs.map((log) => (
        <AgentLogCard key={log.id} log={log} onRefresh={onRefresh} />
      ))}
    </div>
  );
}
