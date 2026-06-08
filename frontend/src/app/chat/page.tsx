'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { 
  MessageSquare, Loader2, AlertCircle, Bot, User, 
  Search, ChevronDown, Globe, Target, ExternalLink, Clock
} from 'lucide-react';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { motion, AnimatePresence } from 'framer-motion';

interface Meeting {
  id: string;
  title: string;
  date: string;
}

interface Source {
  meeting_id: string;
  title: string;
  date: string;
  speaker: string;
  start: number;
  end: number;
}

interface ChatMessage {
  role: string;
  content: string;
  sources?: Source[];
}

export default function GlobalChatPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [isGlobalMode, setIsGlobalMode] = useState(true);
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const res = await api.get('meetings/');
        setMeetings(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load meeting history.");
      }
    };
    fetchMeetings();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.post('rag/chat', {
        question: chatInput,
        meeting_id: isGlobalMode ? null : selectedMeetingId,
      });
      
      const aiMessage: ChatMessage = { 
        role: 'assistant', 
        content: res.data.answer,
        sources: res.data.sources
      };
      setChatHistory([...newHistory, aiMessage]);
    } catch (err: any) {
      console.error(err);
      setChatHistory([...newHistory, { 
        role: 'assistant', 
        content: 'I encountered an error while searching your meeting index. Please ensure your meetings have finished processing.' 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);

  return (
    <ProtectedLayout>
      <div className="max-w-5xl mx-auto py-8 px-6 flex flex-col h-[calc(100vh-80px)]">
        
        {/* Header & Mode Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Bot className="w-8 h-8 text-indigo-400" /> 
              Meeting Intelligence
            </h1>
            <p className="text-slate-400 mt-1">Grounded AI assistant for your meeting corpus.</p>
          </div>

          <div className="flex items-center bg-slate-900/50 border border-slate-800 p-1.5 rounded-2xl backdrop-blur-sm shadow-xl">
             <button 
               onClick={() => setIsGlobalMode(true)}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isGlobalMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200'}`}
             >
               <Globe className="w-3.5 h-3.5" /> All Meetings
             </button>
             <button 
               onClick={() => {
                 setIsGlobalMode(false);
                 if (!selectedMeetingId && meetings.length > 0) setSelectedMeetingId(meetings[0].id);
               }}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${!isGlobalMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200'}`}
             >
               <Target className="w-3.5 h-3.5" /> Specific Meeting
             </button>
          </div>
        </div>

        {/* Meeting Selector (Targeted Mode Only) */}
        <AnimatePresence>
          {!isGlobalMode && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="relative w-full md:w-80">
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 hover:border-indigo-500/50 transition-all"
                >
                  <span className="truncate pr-2 font-medium">
                    {selectedMeeting ? selectedMeeting.title : "Select meeting..."}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                    {meetings.map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedMeetingId(m.id);
                          setDropdownOpen(false);
                          setChatHistory([]); // Reset on specific meeting change
                        }}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-slate-800/50 last:border-0 ${selectedMeetingId === m.id ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-300 hover:bg-slate-800'}`}
                      >
                        <div className="font-semibold truncate">{m.title}</div>
                        <div className="text-[10px] uppercase tracking-wider opacity-40 mt-1">{new Date(m.date).toLocaleDateString()}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Interface */}
        <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative">
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150"></div>
                  <Bot className="w-16 h-16 text-indigo-400 relative z-10" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-slate-300">
                    Search Intelligence
                  </h3>
                  <p className="text-sm max-w-sm leading-relaxed">
                    {isGlobalMode 
                      ? "I can search across your entire meeting history to find connections, summaries, and facts."
                      : `I am focused on the transcript for "${selectedMeeting?.title}".`}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl">
                  {[
                    "What are the recurring project risks?",
                    "List all decisions made this month",
                    "Summarize recent action items",
                    "Who is responsible for the API?"
                  ].map(q => (
                    <button key={q} onClick={() => setChatInput(q)} className="text-left p-4 bg-slate-800/40 border border-slate-800 hover:border-indigo-500/30 rounded-2xl text-xs text-slate-300 transition-all hover:bg-slate-800">
                      "{q}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-800 border border-slate-700'}`}>
                    {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-indigo-400" />}
                  </div>
                  <div className="flex flex-col gap-3 max-w-[85%]">
                    <div className={`rounded-3xl px-6 py-4 text-[15px] leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600/10 text-indigo-50 border border-indigo-500/20 rounded-tr-none' 
                        : 'bg-slate-800/50 text-slate-200 border border-slate-700/50 rounded-tl-none backdrop-blur-sm'
                    }`}>
                      {msg.content}
                    </div>
                    
                    {/* Sources / Citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2 px-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest w-full mb-1 flex items-center gap-1.5">
                          <Search className="w-3 h-3" /> Grounded in {msg.sources.length} sources
                        </span>
                        {msg.sources.map((s, idx) => (
                          <Link 
                            key={idx}
                            href={`/meeting/${s.meeting_id}`}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-lg text-[11px] text-slate-400 hover:text-indigo-300 transition-all"
                          >
                            <span className="font-bold text-indigo-500">[{idx+1}]</span>
                            <span className="truncate max-w-[120px]">{s.title}</span>
                            <div className="flex items-center gap-1 opacity-50 ml-1 border-l border-slate-800 pl-2">
                               <Clock className="w-2.5 h-2.5" />
                               {Math.floor(s.start / 60)}:{(Math.floor(s.start % 60)).toString().padStart(2, '0')}
                            </div>
                            <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-50" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
            {chatLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-5">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-slate-800 border border-slate-700 animate-pulse">
                  <Bot className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="bg-slate-800/50 rounded-3xl px-6 py-4 border border-slate-700/50 flex items-center gap-3 text-slate-400 text-sm rounded-tl-none italic">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> 
                  Scanning semantic index...
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 shadow-2xl">
            <form onSubmit={handleChat} className="flex gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all shadow-inner relative group">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isGlobalMode ? "Search across all meetings..." : `Ask about "${selectedMeeting?.title}"...`}
                className="flex-1 bg-transparent px-5 py-3 text-white focus:outline-none placeholder-slate-600 text-[15px]"
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim() || chatLoading} 
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Query"}
              </button>
            </form>
            <div className="mt-3 text-center">
               <p className="text-[10px] text-slate-600 font-medium uppercase tracking-[0.2em]">
                 AI can make mistakes. Verify important information from sources.
               </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
