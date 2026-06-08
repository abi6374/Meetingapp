'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { 
  FileText, Clock, Calendar, ChevronRight, Loader2, 
  AlertCircle, Trash2, Search, Filter, ArrowRight
} from 'lucide-react';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Meeting {
  id: string;
  title: string;
  date: string;
  status: string;
  duration: string;
}

export default function HistoryPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchMeetings = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get('meetings/');
      // Sort by date newest first
      const sorted = res.data.sort((a: Meeting, b: Meeting) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setMeetings(sorted);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load your meeting history.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
    // Poll for status updates
    const interval = setInterval(() => fetchMeetings(false), 8000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this meeting? This will also remove it from the AI index.")) return;
    
    setIsDeleting(id);
    try {
      await api.delete(`meetings/${id}`);
      toast.success("Meeting deleted.");
      setMeetings(meetings.filter(m => m.id !== id));
    } catch (err) {
      toast.error("Failed to delete.");
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedLayout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-3">Archive</h1>
            <p className="text-slate-400 text-lg font-light">Explore your meeting intelligence and past discussions.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all shadow-xl"
              />
            </div>
            <button onClick={() => fetchMeetings()} className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition shadow-xl">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading && meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="text-slate-500 font-medium animate-pulse uppercase tracking-widest text-xs">Retrieving Archive...</p>
          </div>
        ) : error ? (
          <div className="p-8 bg-red-500/5 border border-red-500/10 text-red-400 rounded-3xl flex items-center gap-4">
            <AlertCircle className="w-6 h-6" /> 
            <div>
              <p className="font-bold">Access Error</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          </div>
        ) : meetings.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24 bg-slate-900/30 border border-slate-800/60 rounded-[2.5rem] shadow-2xl backdrop-blur-sm"
          >
            <div className="w-20 h-20 bg-slate-800/40 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No Intelligence Indexed</h3>
            <p className="text-slate-400 mb-10 max-w-xs mx-auto">Your meeting archive is currently empty. Start recording to build your knowledge base.</p>
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition shadow-lg shadow-indigo-500/20 group">
              Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredMeetings.map((meeting) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={meeting.id}
                >
                  <Link href={`/meeting/${meeting.id}`} className="block">
                    <div className="group bg-slate-900/40 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-6 transition-all hover:bg-slate-800/40 flex items-center justify-between shadow-lg relative overflow-hidden">
                      {/* Decorative gradient corner */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="flex items-center gap-6 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${
                          meeting.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 
                          meeting.status === 'processing' ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' : 
                          'bg-slate-800 border-slate-700 text-slate-500'
                        }`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-white mb-2 truncate pr-4 group-hover:text-indigo-400 transition-colors">
                            {meeting.title}
                          </h3>
                          <div className="flex items-center gap-5 text-sm text-slate-500">
                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(meeting.date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {meeting.duration}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0 relative z-10">
                        <span className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-lg border ${
                          meeting.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          meeting.status === 'processing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' :
                          'bg-red-500/10 text-red-400 border-red-500/10'
                        }`}>
                          {meeting.status}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => handleDelete(e, meeting.id)}
                            disabled={isDeleting === meeting.id}
                            className="p-3 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Delete Meeting"
                          >
                            {isDeleting === meeting.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                          <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-indigo-400 transition-all group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredMeetings.length === 0 && meetings.length > 0 && (
              <div className="text-center py-20 text-slate-500 italic">
                No meetings match "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
