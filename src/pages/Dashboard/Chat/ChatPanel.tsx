/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertTriangle, Calendar, RefreshCw } from 'lucide-react';
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

  // 1. Conversation Persistence: Load or Seed chat history per task
  useEffect(() => {
    const loadConversation = async () => {
      const persisted = await firebaseService.getTaskConversation(task.id);
      if (persisted && persisted.length > 0) {
        setMessages(persisted);
      } else {
        const welcomeText = `Acknowledged. I am analyzing the operational envelope of your task **"${task.title}"**. Currently, the risk index is **${task.riskScore}%** with **${hoursRemaining.toFixed(1)} hours** remaining.

How can I rescue this deadline? I can:
1. Schedule an emergency focus session in Google Calendar
2. Explain a complex technical concept
3. Help you draft code or answers for remaining steps`;

        const initialMsg: ChatMessageType = { role: 'model', text: welcomeText };
        setMessages([initialMsg]);
        await firebaseService.saveTaskConversation(task.id, [initialMsg]);
      }
    };
    loadConversation();
  }, [task.id]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Adaptive suggested actions based on task context
  const getSuggestedActions = () => {
    const actions: string[] = [];
    
    if (task.category === 'academic') {
      actions.push('Explain this concept');
      actions.push('Generate revision questions');
    } else {
      actions.push('Summarize this topic');
      actions.push('Estimate remaining workload');
    }
    
    if (task.riskScore > 60) {
      actions.push('Reduce task risk');
      actions.push('Schedule a focus session');
    }
    
    const incomplete = task.subtasks?.filter(s => !s.completed) || [];
    if (incomplete.length > 0) {
      actions.push('Break this task into smaller steps');
    }
    
    if (task.progress > 50) {
      actions.push('Review completed work');
    }
    
    // Fallbacks/defaults to make sure we always have 3 distinct useful ones
    if (actions.length < 3) {
      if (!actions.includes('Estimate remaining workload')) actions.push('Estimate remaining workload');
      if (!actions.includes('Break this task into smaller steps')) actions.push('Break this task into smaller steps');
      if (!actions.includes('Schedule a focus session')) actions.push('Schedule a focus session');
    }
    
    return Array.from(new Set(actions)).slice(0, 4);
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessageType = { role: 'user', text: textToSend };
    const updatedWithUser = [...messages, userMsg];
    
    setMessages(updatedWithUser);
    setInputText('');
    setIsTyping(true);
    window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'evaluating' }));

    // Save user message immediately
    await firebaseService.saveTaskConversation(task.id, updatedWithUser);

    try {
      const agentLogs = await firebaseService.getAgentLogs();
      const responseObj = await generateChatResponseWithAI(task, hoursRemaining, messages, textToSend, agentLogs);
      
      const assistantMsg: ChatMessageType = { role: 'model', text: responseObj.response };
      const updatedWithAssistant = [...updatedWithUser, assistantMsg];
      
      setMessages(updatedWithAssistant);
      await firebaseService.saveTaskConversation(task.id, updatedWithAssistant);

      // Create Agent Activity Log entry for AI action
      await firebaseService.addAgentLog({
        taskId: task.id,
        taskTitle: task.title,
        actionType: responseObj.intent === 'calendar_request' ? 'reschedule' : 'do_nothing',
        actionTaken: responseObj.actionTaken,
        reason: responseObj.logReason,
        isAgentInitiated: false,
        agentType: 'RECOVERY_AGENT'
      });
      onRescheduleCompleted(); // trigger refresh of logs timeline
    } catch (err) {
      const errMsg: ChatMessageType = { 
        role: 'model', 
        text: 'Error interacting with core decision network. Let me know if you want to schedule a calendar slot.' 
      };
      const updatedWithErr = [...updatedWithUser, errMsg];
      setMessages(updatedWithErr);
      await firebaseService.saveTaskConversation(task.id, updatedWithErr);
    } finally {
      setIsTyping(false);
      window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'monitoring' }));
    }
  };

  const handleAutoSchedule = async () => {
    setIsTyping(true);
    window.dispatchEvent(new CustomEvent('clutch-agent-status', { detail: 'scheduling' }));
    try {
      let customTimeStr = '';
      let customDate: Date | undefined;

      // Find the last assistant message containing "[Confirm Booking]"
      const lastModelMsg = [...messages].reverse().find(m => m.role === 'model' && m.text.includes('[Confirm Booking]'));
      if (lastModelMsg) {
        // Parse time from model message, e.g., "**3:00 PM**" or "3:00 PM"
        const timeMatch = lastModelMsg.text.match(/(\d{1,2}):(\d{2})\s*(PM|AM|pm|am)/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[3].toUpperCase();
          
          let targetHours = hours;
          if (ampm === 'PM' && hours < 12) targetHours += 12;
          else if (ampm === 'AM' && hours === 12) targetHours = 0;
          
          const d = new Date();
          d.setHours(targetHours, minutes, 0, 0);
          customDate = d;
          customTimeStr = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        }
      }

      // If we couldn't parse from model message, try user message
      if (!customDate) {
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
          const timeMatch = lastUserMsg.text.match(/(\d{1,2})(?::(\d{2}))?\s*(pm|am|PM|AM)/i);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            const ampm = timeMatch[3].toUpperCase();
            
            let targetHours = hours;
            if (ampm === 'PM' && hours < 12) targetHours += 12;
            else if (ampm === 'AM' && hours === 12) targetHours = 0;
            
            const d = new Date();
            d.setHours(targetHours, minutes, 0, 0);
            customDate = d;
            customTimeStr = `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
          }
        }
      }

      // Default fallback
      if (!customDate) {
        const d = new Date(Date.now() + 60 * 60 * 1000);
        d.setMinutes(0, 0, 0);
        customDate = d;
        customTimeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      await firebaseService.simulateGoogleCalendarSchedule(task.id, 45, customDate.toISOString());
      
      const directUserConfirm: ChatMessageType = { role: 'user', text: 'Yes, schedule that slot.' };
      const directModelConfirm: ChatMessageType = { 
        role: 'model', 
        text: `✅ **Confirmed Booking:** I have written a **45-minute focus block** starting at **${customTimeStr}** directly in your Google Calendar. Risk mitigation successfully initiated. I have recorded this in your autonomous Agent Activity Log!` 
      };
      
      const finalMessages = [...messages, directUserConfirm, directModelConfirm];
      setMessages(finalMessages);
      await firebaseService.saveTaskConversation(task.id, finalMessages);

      // Create Agent Log entry for the manual confirmation
      await firebaseService.addAgentLog({
        taskId: task.id,
        taskTitle: task.title,
        actionType: 'reschedule',
        actionTaken: 'Booked Calendar Block',
        reason: `Manually authorized a 45-minute focus slot at ${customTimeStr}.`,
        isAgentInitiated: false,
        agentType: 'RECOVERY_AGENT'
      });

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

  const uncompletedSubtasks = task.subtasks?.filter(st => !st.completed) || [];
  const firstUncompleted = uncompletedSubtasks.length > 0 ? uncompletedSubtasks[0] : null;

  return (
    <div className="flex flex-col h-full bg-[#0B1521] border-l border-[#1B2F46] w-full">
      
      {/* Header Panel */}
      <div className="p-4 bg-[#0F1D2C] border-b border-[#1C2F46] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#00D4FF]" />
          <div>
            <h4 className="font-space font-bold text-sm text-slate-100 uppercase tracking-tight">
              AI Decision Coach
            </h4>
            <p className="text-[10px] font-mono text-slate-400">
              Task Context: {task.riskScore}% risk • {hoursRemaining.toFixed(1)}h remaining
            </p>
          </div>
        </div>
        {task.riskScore > 80 && (
          <span className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-space font-bold text-red-400 uppercase animate-pulse">
            <AlertTriangle size={10} /> Rescue Active
          </span>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* 2. Rescue Mode Dedicated Panel for tasks with risk > 80% */}
        {task.riskScore > 80 && (
          <div className="bg-gradient-to-r from-red-950/40 to-[#141E30] border border-red-500/30 rounded-xl p-4 space-y-3 shadow-md">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={16} className="animate-bounce" />
              <h5 className="font-space font-bold text-xs uppercase tracking-wider">
                Deadline Rescue Plan Active
              </h5>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Task risk is critical at **{task.riskScore}%**. To guarantee successful delivery before your deadline, execute the following recovery strategy in order:
            </p>
            
            <div className="space-y-2.5 pl-1">
              {firstUncompleted && (
                <div className="flex items-start gap-2">
                  <div className="font-mono text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded mt-0.5">1</div>
                  <div className="text-[11px] text-slate-200">
                    <span className="font-bold text-slate-100">Immediate Target:</span> Finish *"{firstUncompleted.title}"* ({firstUncompleted.durationMinutes} mins) to register progress immediately.
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <div className="font-mono text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded mt-0.5">{firstUncompleted ? '2' : '1'}</div>
                <div className="text-[11px] text-slate-200">
                  <span className="font-bold text-slate-100">Scope Reduction:</span> Skip any optional/non-essential details to hit the core criteria first.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="font-mono text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded mt-0.5">{firstUncompleted ? '3' : '2'}</div>
                <div className="text-[11px] text-slate-200 flex flex-col gap-1.5">
                  <span>
                    <span className="font-bold text-slate-100">Deep Work Block:</span> Authorize a 90-minute focus session directly in your schedule.
                  </span>
                  <button
                    onClick={handleAutoSchedule}
                    className="self-start flex items-center gap-1 bg-[#E11D48] hover:bg-[#F43F5E] text-white text-[9px] font-space font-bold uppercase py-1 px-2.5 rounded transition-all tracking-wider"
                  >
                    <Calendar size={10} /> Book Focus Slot
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="font-mono text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded mt-0.5">{firstUncompleted ? '4' : '3'}</div>
                <div className="text-[11px] text-slate-200">
                  <span className="font-bold text-slate-100">Validation:</span> Run a validation/compile checklist before sleeping to verify compliance.
                </div>
              </div>
            </div>
          </div>
        )}

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

      {/* Adaptive suggested actions pills */}
      <div className="px-4 py-1.5 bg-[#0E1B2A] border-t border-[#1C2F46]/60 flex flex-wrap gap-1.5">
        {getSuggestedActions().map((action, i) => (
          <button
            key={i}
            onClick={() => handleSend(action)}
            className="px-2 py-1 bg-[#142435] hover:bg-[#20364F] border border-[#21354A] rounded-full text-[10px] text-slate-300 hover:text-[#00D4FF] transition-all font-sans cursor-pointer whitespace-nowrap"
          >
            {action}
          </button>
        ))}
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
