/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../../services/gemini';

interface ChatMessageProps {
  msg: ChatMessageType;
  onAutoSchedule: () => void;
  key?: string | number;
}

export default function ChatMessage({ msg, onAutoSchedule }: ChatMessageProps) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`
          max-w-[85%] rounded-xl p-3 text-xs leading-relaxed font-sans whitespace-pre-wrap
          ${isUser 
            ? 'bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-slate-100 rounded-tr-none' 
            : 'bg-[#142436] border border-[#20364F] text-slate-200 rounded-tl-none'}
        `}
      >
        {msg.text}

        {/* Inline Action Trigger Button in Model response */}
        {!isUser && msg.text.includes('[Confirm Booking]') && (
          <div className="mt-3 pt-2.5 border-t border-slate-700/40 flex justify-end">
            <button
              id="confirm-booking-inline-btn"
              onClick={onAutoSchedule}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7B61FF] text-[#0D1B2A] font-space font-bold uppercase rounded text-[10px] tracking-wider hover:bg-[#00D4FF] transition-all cursor-pointer"
            >
              <Calendar size={11} />
              Confirm Booking
            </button>
          </div>
        )}
      </div>
      <span className="text-[9px] font-mono text-slate-500 mt-1 uppercase tracking-widest px-1">
        {isUser ? 'You' : 'Clutch Agent'}
      </span>
    </div>
  );
}
