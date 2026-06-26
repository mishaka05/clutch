/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Task } from '../../../types';
import { generateChatResponseWithAI, ChatMessage as ChatMessageType } from '../../../services/gemini';
import { firebaseService } from '../../../services/firebase';
import ChatMessage from './ChatMessage';

interface ChatPanelProps {
  task: Task;
  hoursRemaining: number;
  onRescheduleCompleted: () => void;
}

export default function ChatPanel({ task, hoursRemaining, onRescheduleCompleted }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Seed initial welcoming message based on task state
  useEffect(() => {
    const welcomeText = `Acknowledged. I am analyzing the operational envelope of your task **"${task.title}"**. Currently, the risk index is **${task.riskScore}%** with **${hoursRemaining.toFixed(1)} hours** remaining.

How can I rescue this deadline? I can:
1. Schedule an emergency focus session in Google Calendar
2. Explain a complex technical concept
3. Help you draft code or answers for remaining steps`;

    setMessages([{ role: 'model', text: welcomeText }]);
  }, [task.id]);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessageType = { role: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'evaluating' }));

    try {
      const response = await generateChatResponseWithAI(task, hoursRemaining, messages, textToSend);
      
      const assistantMsg: ChatMessageType = { role: 'model', text: response };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: 'Error interacting with core decision network. Let me know if you want to schedule a calendar slot.' }
      ]);
    } finally {
      setIsTyping(false);
      window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'monitoring' }));
    }
  };

  const handleAutoSchedule = async () => {
    setIsTyping(true);
    window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'scheduling' }));
    try {
      await firebaseService.simulateGoogleCalendarSchedule(task.id, 45);
      
      // Direct UI response
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: 'Yes, schedule that slot.' },
        { 
          role: 'model', 
          text: `✅ **Confirmed Booking:** I have written a **45-minute focus block** starting at 4:00 PM directly in your Google Calendar. Risk mitigation successfully initiated. I have recorded this in your autonomous Agent Activity Log!` 
        }
      ]);
      onRescheduleCompleted();

      // Dispatch "Notification Dispatch" upon success
      window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'dispatch' }));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'monitoring' }));
      }, 3000);
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'monitoring' }));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0B1521] border-l border-[#1B2F46] w-full md:w-80 lg:w-96">
      
      {/* Header Panel */}
      <div className="p-4 bg-[#0F1D2C] border-b border-[#1C2F46] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#00D4FF]" />
          <div>
            <h4 className="font-space font-bold text-sm text-slate-100 uppercase tracking-tight">
              AI Decision Coach
            </h4>
            <p className="text-[10px] font-mono text-slate-400">
              Task Context: {task.riskScore}% risk
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <ChatMessage key={index} msg={msg} onAutoSchedule={handleAutoSchedule} />
        ))}

        {/* Dynamic Typing Feed */}
        {isTyping && (
          <div className="flex flex-col items-start">
            <div className="bg-[#142436] border border-[#20364F] rounded-xl rounded-tl-none p-3 max-w-[85%] flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Action Form */}
      <div className="p-4 border-t border-[#1C2F46] bg-[#0E1B2A]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputText);
          }}
          className="relative flex items-center"
        >
          <input
            id="chat-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask agent for help..."
            className="w-full pl-3 pr-10 py-2.5 bg-[#142435] border border-[#21354A] rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-all font-sans"
          />
          <button
            id="send-chat-btn"
            type="submit"
            className="absolute right-2 p-1.5 text-slate-400 hover:text-[#00D4FF] transition-colors cursor-pointer"
          >
            <Send size={14} />
          </button>
        </form>
      </div>

    </div>
  );
}
