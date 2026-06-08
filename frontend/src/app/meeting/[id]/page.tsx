'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
  Download, AlertCircle, ArrowLeft, Loader2, MessageSquare, 
  AlignLeft, Users, FileText, Trash2, Edit3, Save, X,
  CheckCircle2, ChevronRight, Zap, Search
} from 'lucide-react';
import { useParams } from 'next/navigation';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { useAuthStore } from '@/store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';

interface MeetingSegment {
  start: number;
  end: number;
  text: string;
  speaker: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  status: string;
  duration: string;
  raw_transcript: string;
  speaker_transcript: string;
  segments: MeetingSegment[];
  speakers: string[];
  mom_text: string;
  diarization_error: string | null;
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mom' | 'transcript' | 'chat'>('mom');
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editedMom, setEditedMom] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Transcript Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Chat state
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const fetchMeeting = async () => {
    try {
      const res = await api.get(`meetings/${id}`);
      setMeeting(res.data);
      setEditedMom(res.data.mom_text);
      if (res.data.status === 'processing') {
        setTimeout(fetchMeeting, 5000);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load meeting details');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeeting();
  }, [id]);

  const filteredSegments = React.useMemo(() => {
    if (!meeting?.segments) return [];
    if (!searchQuery.trim()) return meeting.segments;
    const lowerQuery = searchQuery.toLowerCase();
    return meeting.segments.filter(s => 
      s.text.toLowerCase().includes(lowerQuery) || 
      s.speaker.toLowerCase().includes(lowerQuery)
    );
  }, [meeting?.segments, searchQuery]);

  const handleDownload = async (fmt: 'txt' | 'pdf' | 'docx') => {
    try {
      const res = await api.get(`meetings/${id}/export?fmt=${fmt}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MeetingMind_${id}.${fmt}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download file.");
    }
  };

  const handleSaveMom = async () => {
    if (!meeting) return;
    setIsSaving(true);
    try {
      await api.put(`meetings/${id}`, { mom_text: editedMom });
      setMeeting({ ...meeting, mom_text: editedMom });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save:", err);
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`meetings/${id}`);
      router.push('/history');
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete meeting.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newHistory = [...chatHistory, { role: 'user', content: chatInput }];
    setChatHistory(newHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const user = useAuthStore.getState().user;
      const provider = user?.ai_provider || 'groq';
      const model = provider === 'gemini' 
        ? 'gemini-1.5-flash' 
        : provider === 'ollama' 
          ? 'llama3' 
          : 'llama-3.3-70b-versatile';

      const res = await api.post(`meetings/${id}/chat`, {
        question: chatInput,
        history: chatHistory,
        provider,
        model
      });
      setChatHistory([...newHistory, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      console.error(err);
      setChatHistory([...newHistory, { role: 'assistant', content: 'Sorry, failed to get AI response.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </ProtectedLayout>
    );
  }

  if (error || !meeting) {
    return (
      <ProtectedLayout>
        <div className="p-12">
          <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl inline-flex items-center gap-3">
            <AlertCircle className="w-5 h-5" /> {error || 'Meeting not found'}
          </div>
          <br/><br/>
          <Link href="/history" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2">
            <ArrowLeft className="w-4 h-4"/> Back to History
          </Link>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="max-w-6xl mx-auto py-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/history" className="p-2 bg-slate-800/50 hover:bg-slate-700 border border-slate-700/50 rounded-xl text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{meeting.title}</h1>
              <p className="text-sm text-slate-400 mt-1">Recorded on {new Date(meeting.date).toLocaleDateString()} • {meeting.duration}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-800/50 p-1 border border-slate-700/50 rounded-xl">
              <button onClick={() => handleDownload('txt')} className="px-3 py-1.5 text-sm hover:bg-slate-700 rounded-lg flex items-center gap-2 transition text-slate-300">
                <Download className="w-4 h-4"/> TXT
              </button>
              <button onClick={() => handleDownload('pdf')} className="px-3 py-1.5 text-sm hover:bg-slate-700 rounded-lg flex items-center gap-2 transition text-slate-300 border-l border-slate-700/50">
                <Download className="w-4 h-4"/> PDF
              </button>
            </div>
            
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-xl font-bold text-white mb-2">Delete Meeting?</h3>
                <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                  This will permanently delete "{meeting.title}" and its associated transcripts and reports. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition flex items-center gap-2"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {meeting.diarization_error && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>Diarization unavailable: {meeting.diarization_error}. Showing un-diarized transcript.</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 p-1.5 bg-slate-900/50 rounded-2xl w-max border border-slate-800/60 backdrop-blur-sm">
          <button onClick={() => setActiveTab('mom')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'mom' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
            <FileText className="w-4 h-4" /> Intelligence Report
          </button>
          <button onClick={() => setActiveTab('transcript')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'transcript' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
            <AlignLeft className="w-4 h-4" /> Transcript
          </button>
          <button onClick={() => setActiveTab('chat')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
            <MessageSquare className="w-4 h-4" /> Ask AI
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 min-h-[600px] shadow-xl backdrop-blur-sm relative">
          
          {activeTab === 'mom' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="h-full">
              <div className="flex justify-between items-center mb-8 border-b border-slate-800/60 pb-5">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Meeting Intelligence</h2>
                  <p className="text-slate-400 text-sm mt-1">AI-generated executive analysis and deliverables.</p>
                </div>
                {meeting.mom_text && (
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        if (isEditing) handleSaveMom();
                        else setIsEditing(true);
                      }}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isEditing ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? <><Save className="w-4 h-4" /> Save Changes</> : <><Edit3 className="w-4 h-4" /> Edit Report</>}
                    </button>
                    {isEditing && (
                      <button 
                        onClick={() => { setIsEditing(false); setEditedMom(meeting.mom_text); }}
                        className="p-2.5 bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {!meeting.mom_text ? (
                <div className="flex flex-col items-center justify-center py-40 text-slate-500 space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full"></div>
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500 relative z-10" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-300">Analyzing meeting dynamics...</p>
                    <p className="text-sm text-slate-500 mt-1">This usually takes 15-30 seconds depending on duration.</p>
                  </div>
                </div>
              ) : isEditing ? (
                <textarea 
                  value={editedMom}
                  onChange={(e) => setEditedMom(e.target.value)}
                  className="w-full h-[600px] bg-slate-900/80 border border-slate-700 rounded-2xl p-8 text-slate-300 font-mono text-sm leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none shadow-inner"
                  placeholder="Paste or edit meeting notes here..."
                />
              ) : (() => {
                // Try parsing as JSON for modern structured reports
                try {
                  // Robust JSON cleaning to handle markdown fences if the AI includes them
                  let cleanJson = meeting.mom_text.trim();
                  if (cleanJson.startsWith('```')) {
                    cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
                  }
                  
                  const momJson = JSON.parse(cleanJson);
                  return (
                    <div className="space-y-10 pb-10">
                      {/* Summary Section */}
                      <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-3xl p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3 text-indigo-400">
                            <FileText className="w-5 h-5" />
                            <h3 className="text-sm font-bold tracking-widest uppercase">Executive Summary</h3>
                          </div>
                          {momJson.sentiment && (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              momJson.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              momJson.sentiment === 'tense' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {momJson.sentiment} Tone
                            </span>
                          )}
                        </div>
                        <p className="text-slate-200 text-lg leading-relaxed font-light italic">
                          {momJson.summary}
                        </p>
                        {momJson.topics_discussed && (
                          <div className="flex flex-wrap gap-2 mt-6">
                            {momJson.topics_discussed.map((t: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs text-slate-400">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Decisions Card */}
                        <div className="bg-slate-800/20 border border-slate-800 rounded-3xl p-8 flex flex-col">
                          <div className="flex items-center gap-3 mb-6 text-emerald-400">
                            <CheckCircle2 className="w-5 h-5" />
                            <h3 className="text-sm font-bold tracking-widest uppercase">Key Decisions</h3>
                          </div>
                          <div className="space-y-4 flex-1">
                            {momJson.key_decisions?.length > 0 ? momJson.key_decisions.map((d: string, i: number) => (
                              <div key={i} className="flex gap-4 items-start bg-slate-900/40 p-4 rounded-2xl border border-slate-800/50 group hover:border-emerald-500/30 transition-colors">
                                <span className="w-6 h-6 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">{i+1}</span>
                                <p className="text-slate-300 text-sm leading-relaxed">{d}</p>
                              </div>
                            )) : (
                              <p className="text-slate-500 text-sm italic py-4 text-center">No final decisions recorded.</p>
                            )}
                          </div>
                        </div>

                        {/* Action Items Card */}
                        <div className="bg-slate-800/20 border border-slate-800 rounded-3xl p-8">
                          <div className="flex items-center gap-3 mb-6 text-blue-400">
                            <Zap className="w-5 h-5" />
                            <h3 className="text-sm font-bold tracking-widest uppercase">Action Items</h3>
                          </div>
                          <div className="space-y-3">
                            {momJson.action_items?.length > 0 ? momJson.action_items.map((item: any, i: number) => (
                              <div key={i} className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 group hover:bg-slate-800/40 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    item.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                                    item.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                                    'bg-blue-500/10 text-blue-400'
                                  }`}>
                                    {item.priority || 'Normal'}
                                  </span>
                                  {item.due_date && <span className="text-[10px] text-slate-500 font-mono">Due: {item.due_date}</span>}
                                </div>
                                <p className="text-slate-200 text-sm font-medium mb-2">{item.task}</p>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Users className="w-3 h-3" />
                                  <span>Owner: <span className="text-slate-300">{item.owner || 'TBD'}</span></span>
                                </div>
                              </div>
                            )) : (
                              <p className="text-slate-500 text-sm italic py-4 text-center">No pending actions identified.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Next Meeting Info */}
                      {momJson.next_meeting && (
                         <div className="flex items-center gap-4 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-sm">
                            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center">
                              <MessageSquare className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Next Sync</p>
                              <p className="text-slate-200 font-medium">{momJson.next_meeting}</p>
                            </div>
                         </div>
                      )}
                    </div>
                  );
                } catch (e) {
                  // Fallback to Markdown Parsing if JSON fails
                  return (
                    <div className="space-y-12 pb-10">
                      <div className="bg-gradient-to-br from-indigo-500/5 to-transparent border border-indigo-500/10 rounded-3xl p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-4 text-indigo-400">
                          <FileText className="w-5 h-5" />
                          <h3 className="text-sm font-bold tracking-tight uppercase">Executive Summary</h3>
                        </div>
                        <div className="prose prose-invert prose-slate max-w-none text-slate-300 leading-relaxed text-lg italic font-light">
                          {(meeting.mom_text.split(/## \d+\. Executive Summary/i)[1] || meeting.mom_text.split(/## Executive Summary/i)[1] || '').split('##')[0].trim().split('\n').map((line, i) => <p key={i}>{line}</p>) || 
                           meeting.mom_text.split('\n\n')[0]}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-slate-800/20 border border-slate-800 rounded-3xl p-8">
                          <div className="flex items-center gap-3 mb-6 text-emerald-400">
                            <CheckCircle2 className="w-5 h-5" />
                            <h3 className="text-sm font-bold tracking-widest uppercase">Key Decisions</h3>
                          </div>
                          <div className="space-y-4">
                            {(meeting.mom_text.match(/Key Decisions|Decisions Made/i)) ? (
                               (meeting.mom_text.split(/## \d+\. (?:Key Decisions|Decisions Made)/i)[1] || meeting.mom_text.split(/## (?:Key Decisions|Decisions Made)/i)[1] || '')
                               .split('##')[0]
                               .split('\n')
                               .filter(l => l.trim().match(/^(\d+\.|-|\*)/))
                               .map((decision, idx) => (
                                <div key={idx} className="flex gap-4 items-start bg-slate-900/40 p-4 rounded-2xl border border-slate-800/50">
                                  <span className="w-6 h-6 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">{idx+1}</span>
                                  <p className="text-slate-300 text-sm leading-relaxed">{decision.replace(/^(\d+\.|-|\*)\s*/, '')}</p>
                                </div>
                               ))
                            ) : (
                              <p className="text-slate-500 text-sm italic">No specific decisions identified.</p>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-800/20 border border-slate-800 rounded-3xl p-8">
                          <div className="flex items-center gap-3 mb-6 text-blue-400">
                            <Zap className="w-5 h-5" />
                            <h3 className="text-sm font-bold tracking-widest uppercase">Immediate Actions</h3>
                          </div>
                          <div className="space-y-3">
                             {(meeting.mom_text.match(/Action Items/i)) ? (
                               (meeting.mom_text.split(/## \d+\. Action Items/i)[1] || meeting.mom_text.split(/## Action Items/i)[1] || '')
                               .split('##')[0]
                               .split('\n')
                               .filter(l => l.trim().match(/^(\d+\.|-|\*|\|)/) && !l.includes('Action | Owner'))
                               .map((item, idx) => {
                                 const cleanItem = item.replace(/^(\d+\.|-|\*|\|)\s*/, '').replace(/\|/g, ' ').trim();
                                 if (!cleanItem || cleanItem.match(/^[-\s]+$/)) return null;
                                 return (
                                    <div key={idx} className="group flex items-center justify-between gap-4 bg-slate-900/40 hover:bg-slate-800/40 p-4 rounded-2xl border border-slate-800/50 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>
                                        <p className="text-slate-300 text-sm">{cleanItem}</p>
                                      </div>
                                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                                    </div>
                                 );
                               })
                             ) : (
                               <p className="text-slate-500 text-sm italic">No action items found.</p>
                             )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-4">
                          <AlignLeft className="w-5 h-5 text-indigo-400" />
                          <h3 className="text-lg font-bold text-white">Full Intelligence Report</h3>
                        </div>
                        <div className="prose prose-invert prose-slate max-w-none prose-h2:text-indigo-400 prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4 prose-p:leading-relaxed prose-li:text-slate-300 prose-a:text-indigo-400">
                          <div dangerouslySetInnerHTML={{ __html: meeting.mom_text.replace(/\n/g, '<br/>') }} />
                        </div>
                      </div>
                    </div>
                  );
                }
              })())}}
            </motion.div>
          )}

          {activeTab === 'transcript' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search transcript by keyword or speaker..."
                    className="w-full bg-slate-800/40 border border-slate-700/50 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded-full text-slate-500 hover:text-white transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {meeting.speakers && meeting.speakers.length > 0 && (
                  <div className="px-5 py-3 bg-slate-800/30 rounded-2xl border border-slate-700/50 flex items-center gap-3">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {meeting.speakers.length} Speakers
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-8 pr-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                {filteredSegments.length > 0 ? (
                  filteredSegments.map((seg, i) => (
                    <div key={i} className="flex gap-6 group hover:bg-slate-800/20 p-4 -mx-4 rounded-2xl transition-colors border border-transparent hover:border-slate-800/50">
                      <div className="w-16 shrink-0 text-xs font-mono text-slate-500 pt-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                        {Math.floor(seg.start / 3600).toString().padStart(2, '0')}:
                        {Math.floor((seg.start % 3600) / 60).toString().padStart(2, '0')}:
                        {Math.floor(seg.start % 60).toString().padStart(2, '0')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                             seg.speaker.includes('1') ? 'bg-indigo-500/10 text-indigo-400' : 
                             seg.speaker.includes('2') ? 'bg-emerald-500/10 text-emerald-400' :
                             'bg-slate-800 text-slate-400'
                           }`}>
                            {seg.speaker}
                           </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[15px]">
                          {searchQuery ? (
                            seg.text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part, j) => 
                              part.toLowerCase() === searchQuery.toLowerCase() 
                                ? <mark key={j} className="bg-indigo-500/30 text-indigo-200 px-0.5 rounded-sm">{part}</mark> 
                                : part
                            )
                          ) : seg.text}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <Search className="w-10 h-10 mb-4 opacity-20" />
                    <p className="text-sm">No segments match your search query.</p>
                    <button onClick={() => setSearchQuery("")} className="mt-4 text-indigo-400 text-xs font-bold uppercase tracking-widest hover:text-indigo-300">
                      Clear Search
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-[600px]">
              <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                    <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400"><MessageSquare className="w-8 h-8" /></div>
                    <p className="text-sm font-medium">Ask me anything about this meeting!</p>
                    <div className="flex gap-2 mt-4">
                      {["What were the key decisions?", "Summarize the action items", "Who spoke the most?"].map(q => (
                        <button key={q} onClick={() => setChatInput(q)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-xs text-slate-300 transition-colors">
                          "{q}"
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatHistory.map((msg, i) => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-6 py-4 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))
                )}
                {chatLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-slate-800 rounded-2xl px-6 py-4 border border-slate-700/50 flex items-center gap-3 text-slate-400 text-sm rounded-bl-none">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> AI is thinking...
                    </div>
                  </motion.div>
                )}
              </div>
              <form onSubmit={handleChat} className="mt-6 flex gap-3 bg-slate-900/50 p-2 rounded-2xl border border-slate-700/50 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question about the transcript..."
                  className="flex-1 bg-transparent px-4 py-3 text-white focus:outline-none placeholder-slate-500 text-sm"
                />
                <button type="submit" disabled={!chatInput.trim() || chatLoading} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20">
                  Send
                </button>
              </form>
            </motion.div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}

