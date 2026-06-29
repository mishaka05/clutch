/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../../services/gemini';
import { firebaseService } from '../../../services/firebase';

interface ChatMessageProps {
  msg: ChatMessageType;
  onAutoSchedule: () => void;
  key?: string | number;
}

export default function ChatMessage({ msg, onAutoSchedule }: ChatMessageProps) {
  const isUser = msg.role === 'user';
  const isDemo = firebaseService.getCurrentUser()?.mode === 'demo';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`
          max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed font-sans whitespace-pre-wrap shadow-lg
          ${isUser 
            ? 'bg-[#8052ff]/10 border border-[#8052ff]/35 text-white rounded-tr-none' 
            : 'bg-white/[0.02] border border-white/[0.06] text-slate-200 rounded-tl-none'}
        `}
      >
        {msg.text}

        {/* Inline Action Trigger Button in Model response */}
        {!isUser && msg.text.includes('[Confirm Booking]') && (
          <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex justify-end">
            <button
              id="confirm-booking-inline-btn"
              onClick={onAutoSchedule}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#8052ff] hover:bg-[#9066ff] text-white font-space font-semibold uppercase rounded-xl text-[10px] tracking-wider transition-all cursor-pointer hover:shadow-[0_0_15px_rgba(128,82,255,0.4)] active:scale-[0.97]"
            >
              <Calendar size={11} />
              {isDemo ? 'Confirm Booking (Local)' : 'Confirm Booking'}
            </button>
          </div>
        )}
      </div>
      <span className="text-[8px] font-mono text-slate-500 mt-1.5 uppercase tracking-widest px-2">
        {isUser ? 'You' : 'Clutch Coach'}
      </span>
    </div>
  );
}
