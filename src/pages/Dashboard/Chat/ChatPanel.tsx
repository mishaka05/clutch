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
import { parseSchedulingExpression } from '../../../utils/dateParser';

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

      const lastModelMsg = [...messages].reverse().find(m => m.role === 'model' && m.text.includes('[Confirm Booking]'));
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');

      let parseSourceText = '';
      if (lastModelMsg && lastUserMsg) {
        parseSourceText = `${lastUserMsg.text} | ${lastModelMsg.text}`;
      } else if (lastModelMsg) {
        parseSourceText = lastModelMsg.text;
      } else if (lastUserMsg) {
        parseSourceText = lastUserMsg.text;
      }

      if (parseSourceText) {
        const parseResult = parseSchedulingExpression(parseSourceText);
        customDate = parseResult.localDate;
        customTimeStr = customDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      // Default fallback if parsing completely failed
      if (!customDate) {
        const d = new Date(Date.now() + 60 * 60 * 1000);
        d.setMinutes(0, 0, 0);
        customDate = d;
        customTimeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      const result = await firebaseService.simulateGoogleCalendarSchedule(task.id, 45, customDate.toISOString());
      const resolvedDate = new Date(result.eventTime);
      const resolvedTimeStr = resolvedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const formatTimeRange = (start: Date, durationMins: number): string => {
        const end = new Date(start.getTime() + durationMins * 60 * 1000);
        const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${startStr}–${endStr}`;
      };

      const directUserConfirm: ChatMessageType = { role: 'user', text: 'Yes, schedule that slot.' };
      
      let directModelConfirmText = `✅ **Confirmed Booking:** I have written a **45-minute focus block** starting at **${resolvedTimeStr}** directly in your Google Calendar. Risk mitigation successfully initiated. I have recorded this in your autonomous Agent Activity Log!`;
      
      if (resolvedDate.getTime() !== customDate.getTime()) {
        const requestedRange = formatTimeRange(customDate, 45);
        const resolvedRange = formatTimeRange(resolvedDate, 45);
        directModelConfirmText = `⚠️ **Calendar Conflict Resolved:** **${requestedRange}** was unavailable because another calendar event already exists. Your focus session has been scheduled for **${resolvedRange}** instead.\n\nI have successfully synced this block directly with Google Calendar!`;
      }

      const directModelConfirm: ChatMessageType = { 
        role: 'model', 
        text: directModelConfirmText
      };
      
      const finalMessages = [...messages, directUserConfirm, directModelConfirm];
      setMessages(finalMessages);
      await firebaseService.saveTaskConversation(task.id, finalMessages);
 
       // Create Agent Log entry for the manual confirmation
       await firebaseService.addAgentLog({
         taskId: task.id,
         taskTitle: task.title,
         actionType: 'reschedule',
         actionTaken: resolvedDate.getTime() !== customDate.getTime() ? 'Resolved Conflict & Booked' : 'Booked Calendar Block',
         reason: resolvedDate.getTime() !== customDate.getTime()
           ? `Resolved overlap: scheduled focus slot at ${resolvedTimeStr} instead of ${customTimeStr}.`
           : `Manually authorized a 45-minute focus slot at ${customTimeStr}.`,
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
    <div className="flex flex-col h-full bg-[#020106] border-l border-white/[0.07] w-full">
      
      {/* Header Panel */}
      <div className="p-5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Sparkles size={16} className="text-[#8052ff]" />
          <div>
            <h4 className="font-space font-semibold text-xs text-slate-200 uppercase tracking-widest">
              AI Decision Coach
            </h4>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mt-0.5">
              Task Context: {task.riskScore}% risk • {hoursRemaining.toFixed(1)}h remaining
            </p>
          </div>
        </div>
        {task.riskScore > 80 && (
          <span className="flex items-center gap-1 bg-red-500/10 border border-red-500/25 px-3 py-1 rounded-full text-[9px] font-space font-semibold text-red-400 uppercase tracking-wider animate-pulse">
            <AlertTriangle size={10} /> Rescue Active
          </span>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        
        {/* 2. Rescue Mode Dedicated Panel for tasks with risk > 80% */}
        {task.riskScore > 80 && (
          <div className="bg-gradient-to-br from-[#1c080d] to-[#040103] border border-red-500/25 rounded-2xl p-5 space-y-4 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full pointer-events-none" />
            
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={16} className="animate-bounce" />
              <h5 className="font-space font-semibold text-xs uppercase tracking-widest">
                Deadline Rescue Plan Active
              </h5>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Task risk is critical at **{task.riskScore}%**. To guarantee successful delivery before your deadline, execute the following recovery strategy in order:
            </p>
            
            <div className="space-y-3 pl-1">
              {firstUncompleted && (
                <div className="flex items-start gap-3">
                  <div className="font-mono text-[9px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full mt-0.5">1</div>
                  <div className="text-[11px] text-slate-200">
                    <span className="font-bold text-white">Immediate Target:</span> Finish *"{firstUncompleted.title}"* ({firstUncompleted.durationMinutes} mins) to register progress immediately.
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <div className="font-mono text-[9px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full mt-0.5">{firstUncompleted ? '2' : '1'}</div>
                <div className="text-[11px] text-slate-200">
                  <span className="font-bold text-white">Scope Reduction:</span> Skip any optional/non-essential details to hit the core criteria first.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="font-mono text-[9px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full mt-0.5">{firstUncompleted ? '3' : '2'}</div>
                <div className="text-[11px] text-slate-200 flex flex-col gap-2">
                  <span>
                    <span className="font-bold text-white">Deep Work Block:</span> Authorize a 90-minute focus session directly in your schedule.
                  </span>
                  <button
                    onClick={handleAutoSchedule}
                    className="self-start flex items-center gap-1.5 bg-[#E11D48] hover:bg-[#F43F5E] text-white text-[9px] font-space font-semibold uppercase py-1.5 px-3 rounded-full transition-all tracking-wider hover:shadow-[0_0_15px_rgba(225,29,72,0.4)] cursor-pointer active:scale-[0.97]"
                  >
                    <Calendar size={10} /> Book Focus Slot
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="font-mono text-[9px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full mt-0.5">{firstUncompleted ? '4' : '3'}</div>
                <div className="text-[11px] text-slate-200">
                  <span className="font-bold text-white">Validation:</span> Run a validation/compile checklist before sleeping to verify compliance.
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
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl rounded-tl-none p-3.5 max-w-[85%] flex items-center gap-1.5 shadow-md">
              <span className="w-1.5 h-1.5 bg-[#8052ff] rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-[#8052ff] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 h-1.5 bg-[#8052ff] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Adaptive suggested actions pills */}
      <div className="px-5 py-2 bg-white/[0.01] border-t border-white/[0.05] flex flex-wrap gap-2">
        {getSuggestedActions().map((action, i) => (
          <button
            key={i}
            onClick={() => handleSend(action)}
            className="px-3 py-1.5 bg-white/[0.02] hover:bg-[#8052ff]/15 border border-white/[0.06] hover:border-[#8052ff]/40 rounded-full text-[10px] text-slate-300 hover:text-white transition-all font-sans cursor-pointer whitespace-nowrap active:scale-[0.96]"
          >
            {action}
          </button>
        ))}
      </div>

      {/* Input Action Form */}
      <div className="p-5 border-t border-white/[0.05] bg-white/[0.01]">
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
            placeholder="Ask AI agent for strategy..."
            className="w-full pl-4 pr-11 py-3 bg-white/[0.02] border border-white/[0.07] focus:border-[#8052ff] focus:ring-1 focus:ring-[#8052ff]/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-sans"
          />
          <button
            id="send-chat-btn"
            type="submit"
            className="absolute right-3.5 p-1.5 text-slate-400 hover:text-[#8052ff] transition-colors cursor-pointer"
          >
            <Send size={14} />
          </button>
        </form>
      </div>

    </div>
  );
}
