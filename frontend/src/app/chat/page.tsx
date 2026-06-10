'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { 
  MessageSquare, Loader2, AlertCircle, Bot, User, 
  Search, ChevronDown, Globe, Target, ExternalLink, Clock,
  Calendar, ArrowRight
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

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialMeetingId = searchParams.get('meetingId');

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(initialMeetingId);
  const [isGlobalMode, setIsGlobalMode] = useState(!initialMeetingId);
  
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
        
        // If we have an initial ID but it's not in the list yet, we'll wait for list to load
        if (initialMeetingId) {
          setIsGlobalMode(false);
          setSelectedMeetingId(initialMeetingId);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load meeting history.");
      }
    };
    fetchMeetings();
  }, [initialMeetingId]);

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
    <div className="max-w-5xl mx-auto py-8 px-6 flex flex-col h-[calc(100vh-80px)]">
      
      {/* Header & Mode Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Bot className="w-8 h-8 text-indigo-400" /> 
            AI Assistant
          </h1>
          <p className="text-slate-400 mt-1">Intelligent Q&A across your meeting repository.</p>
        </div>

        <div className="flex items-center bg-slate-900/50 border border-slate-800 p-1.5 rounded-2xl backdrop-blur-sm shadow-xl">
           <button 
             onClick={() => {
               setIsGlobalMode(true);
               router.push('/chat'); // Clear URL params
             }}
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
            className="mb-6 overflow-visible"
          >
            <div className="relative w-full md:w-[400px]">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Focusing on Discussion:</p>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between bg-slate-900/80 border border-slate-700/50 hover:border-indigo-500/50 rounded-2xl px-5 py-4 text-sm text-slate-200 transition-all shadow-lg backdrop-blur-sm"
              >
                <div className="flex items-center gap-3 truncate">
                  <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate font-semibold">
                    {selectedMeeting ? selectedMeeting.title : "Select meeting to analyze..."}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
                  <div className="absolute z-50 w-full mt-3 bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-h-80 overflow-y-auto custom-scrollbar p-2 animate-in fade-in zoom-in-95 duration-200">
                    {meetings.length === 0 && (
                      <div className="p-8 text-center text-slate-500 italic text-sm">No processed meetings found.</div>
                    )}
                    {meetings.map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedMeetingId(m.id);
                          setDropdownOpen(false);
                          setChatHistory([]);
                          router.push(`/chat?meetingId=${m.id}`);
                        }}
                        className={`w-full text-left px-5 py-4 rounded-2xl transition-all mb-1 last:mb-0 flex flex-col gap-1 ${selectedMeetingId === m.id ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                      >
                        <div className="font-bold truncate text-sm">{m.title}</div>
                        <div className={`text-[10px] uppercase tracking-widest opacity-60 ${selectedMeetingId === m.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {new Date(m.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Interface */}
      <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative">
        
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-8">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150"></div>
                <Bot className="w-20 h-16 text-indigo-400 relative z-10" />
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Search Meeting Intelligence
                </h3>
                <p className="text-slate-400 max-w-sm leading-relaxed mx-auto">
                  {isGlobalMode 
                    ? "Ask questions across your entire meeting history. I'll provide answers grounded in transcripts with citations."
                    : `I am ready to analyze "${selectedMeeting?.title}". Ask me about decisions, action items, or specific details.`}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {(isGlobalMode ? [
                  "What are the recurring project risks?",
                  "List all decisions made this month",
                  "Summarize recent action items",
                  "Who is responsible for the API?"
                ] : [
                  "What were the key takeaways?",
                  "Extract all action items",
                  "Who spoke the most and about what?",
                  "Were there any open questions left?"
                ]).map(q => (
                  <button key={q} onClick={() => setChatInput(q)} className="group text-left p-5 bg-slate-800/40 border border-slate-800 hover:border-indigo-500/50 rounded-[2rem] text-sm text-slate-300 transition-all hover:bg-slate-800 shadow-sm flex items-center justify-between">
                    <span className="pr-4 leading-snug">"{q}"</span>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatHistory.map((msg, i) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-800 border border-slate-700'}`}>
                  {msg.role === 'user' ? <User className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-indigo-400" />}
                </div>
                <div className={`flex flex-col gap-4 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-3xl px-8 py-5 text-[15px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-tl-none backdrop-blur-sm'
                  }`}>
                    {msg.content}
                  </div>
                  
                  {/* Sources / Citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest w-full mb-1 flex items-center gap-1.5">
                        <Search className="w-3 h-3" /> Information grounded in {msg.sources.length} transcript segments
                      </span>
                      {msg.sources.map((s, idx) => (
                        <Link 
                          key={idx}
                          href={`/meeting/${s.meeting_id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-[11px] text-slate-400 hover:text-indigo-300 transition-all shadow-sm"
                        >
                          <span className="font-black text-indigo-500">[{idx+1}]</span>
                          <span className="truncate max-w-[150px] font-medium">{s.title}</span>
                          <div className="flex items-center gap-1.5 opacity-50 ml-1 border-l border-slate-800 pl-3">
                             <Clock className="w-3 h-3" />
                             {Math.floor(s.start / 60)}:{(Math.floor(s.start % 60)).toString().padStart(2, '0')}
                          </div>
                          <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
          {chatLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-slate-800 border border-slate-700 animate-pulse">
                <Bot className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="bg-slate-800/40 rounded-3xl px-8 py-5 border border-slate-700/50 flex items-center gap-3 text-slate-400 text-sm rounded-tl-none italic">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> 
                Consulting meeting corpus...
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-8 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
          <form onSubmit={handleChat} className="flex gap-4 bg-slate-950 p-2.5 rounded-3xl border border-slate-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all shadow-inner relative group">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={isGlobalMode ? "Query all meetings..." : `Ask about ${selectedMeeting?.title}...`}
              className="flex-1 bg-transparent px-6 py-4 text-white focus:outline-none placeholder-slate-600 text-[15px] font-medium"
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim() || chatLoading} 
              className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
            >
              {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Query AI"}
            </button>
          </form>
          <div className="mt-4 text-center">
             <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">
               Enterprise-Grade Grounded Intelligence
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GlobalChatPage() {
  return (
    <ProtectedLayout>
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }>
        <ChatContent />
      </Suspense>
    </ProtectedLayout>
  );
}
