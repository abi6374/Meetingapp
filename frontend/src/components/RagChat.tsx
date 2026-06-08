'use client';

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { useRagChat } from "@/hooks/useRagChat";

interface RagChatProps {
  userId:    string;
  meetingId?: string;         // omit for cross-meeting chat
  placeholder?: string;
}

export default function RagChat({
  userId,
  meetingId,
  placeholder = "Ask anything about this meeting…",
}: RagChatProps) {
  const { messages, loading, ask, reset } = useRagChat(userId, meetingId);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    ask(q);
  };

  const SUGGESTIONS = meetingId
    ? [
        "What decisions were made?",
        "List all action items with owners.",
        "Who spoke the most?",
        "What follow-ups were mentioned?",
      ]
    : [
        "What did we decide about the roadmap last month?",
        "Show me all action items assigned to me.",
        "Which meetings discussed the budget?",
      ];

  return (
    <div className="flex flex-col h-[550px] w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 backdrop-blur-md overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="font-semibold text-sm text-zinc-100">
            {meetingId ? "Meeting AI Assistant" : "Global Semantic Search & Q&A"}
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 px-2 py-1 rounded-md transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-4 py-8">
            <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-400">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-zinc-200 font-medium text-sm">Ask anything about your meetings</h3>
              <p className="text-xs text-zinc-500 max-w-xs">
                I can scan transcripts, summarize discussions, and find action items grounded only in recorded data.
              </p>
            </div>
            
            <div className="w-full space-y-2 max-w-sm">
              <p className="text-[11px] text-zinc-500 font-medium text-left px-1">Suggested questions</p>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="w-full text-left text-xs px-4 py-2.5 rounded-xl
                               bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700
                               text-zinc-300 transition-all duration-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-lg
                ${m.role === "user"
                  ? "bg-purple-600 text-white rounded-br-sm border border-purple-500"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm"
                }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>

              {/* Source citations */}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    Grounded Sources
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {Array.from(new Set(m.sources.map(s => s.meeting_id))).map((mId) => {
                      const sample = m.sources?.find(s => s.meeting_id === mId);
                      if (!sample) return null;
                      return (
                        <div key={mId} className="text-[10px] bg-zinc-950/40 border border-zinc-850 px-2 py-1.5 rounded-lg text-zinc-500">
                          <span className="font-medium text-zinc-300">{sample.title}</span>
                          <span className="mx-1">·</span>
                          <span>{sample.date}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950/40">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={placeholder}
            className="flex-1 bg-zinc-900 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-all"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 rounded-xl text-white transition-all shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
