'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { MessageSquare, Loader2, AlertCircle, Bot, User, Search, ChevronDown } from 'lucide-react';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { motion, AnimatePresence } from 'framer-motion';

interface Meeting {
  id: string;
  title: string;
  date: string;
}

export default function GlobalChatPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const res = await api.get('/meetings/');
        setMeetings(res.data);
        if (res.data.length > 0 && !selectedMeetingId) {
          setSelectedMeetingId(res.data[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load meetings.");
      }
    };
    fetchMeetings();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  // Reset chat when switching meetings
  useEffect(() => {
    setChatHistory([]);
    setChatInput('');
  }, [selectedMeetingId]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedMeetingId) return;

    const newHistory = [...chatHistory, { role: 'user', content: chatInput }];
    setChatHistory(newHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.post(`/meetings/${selectedMeetingId}/chat`, {
        question: chatInput,
        history: chatHistory,
        provider: 'groq',
        model: 'llama-3.3-70b-versatile'
      });
      setChatHistory([...newHistory, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      console.error(err);
      setChatHistory([...newHistory, { role: 'assistant', content: 'Sorry, failed to get AI response. Please ensure the meeting has finished processing.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);

  return (
    <ProtectedLayout>
      <div className="max-w-5xl mx-auto py-8 px-6 flex flex-col h-[calc(100vh-80px)]">
        
        {/* Header & Meeting Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-indigo-400" /> 
              AI Assistant
            </h1>
            <p className="text-slate-400 mt-1">Ask questions about any of your past meetings.</p>
          </div>

          <div className="relative w-full md:w-72">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 hover:bg-slate-800 transition-colors"
            >
              <span className="truncate pr-2">
                {selectedMeeting ? selectedMeeting.title : "Select a meeting..."}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
                >
                  {meetings.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500 text-center">No meetings available</div>
                  ) : (
                    meetings.map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedMeetingId(m.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors ${selectedMeetingId === m.id ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-300 hover:bg-slate-800'}`}
                      >
                        <div className="font-medium truncate">{m.title}</div>
                        <div className="text-xs opacity-50 mt-0.5">{new Date(m.date).toLocaleDateString()}</div>
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3 text-sm shrink-0">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative">
          
          {!selectedMeetingId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p>Please select a meeting from the dropdown to start chatting.</p>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                    <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400">
                      <Bot className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-300">How can I help you?</h3>
                    <p className="text-sm text-center max-w-sm">
                      I have analyzed the transcript for "{selectedMeeting?.title}". Ask me to summarize decisions, find action items, or clarify what someone said.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-lg">
                      {["What were the key decisions?", "List all my action items", "Provide a 3 sentence summary"].map(q => (
                        <button key={q} onClick={() => setChatInput(q)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-full text-xs text-slate-300 transition-colors">
                          "{q}"
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatHistory.map((msg, i) => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                        {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-indigo-300" />}
                      </div>
                      <div className={`max-w-[80%] rounded-2xl px-6 py-4 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600/20 text-white border border-indigo-500/30 rounded-tr-none' 
                          : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))
                )}
                {chatLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                     <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-700">
                        <Bot className="w-5 h-5 text-indigo-300" />
                      </div>
                    <div className="bg-slate-800 rounded-2xl px-6 py-4 border border-slate-700/50 flex items-center gap-3 text-slate-400 text-sm rounded-tl-none">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Analyzing transcript...
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-slate-900 border-t border-slate-800">
                <form onSubmit={handleChat} className="flex gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Ask about "${selectedMeeting?.title}"...`}
                    className="flex-1 bg-transparent px-4 py-2 text-white focus:outline-none placeholder-slate-500 text-sm"
                  />
                  <button type="submit" disabled={!chatInput.trim() || chatLoading} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20">
                    Send
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
