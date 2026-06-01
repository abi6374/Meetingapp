'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { FileText, Download, FileAudio, Search, Loader2, AlertCircle } from 'lucide-react';
import ProtectedLayout from '@/components/layout/ProtectedLayout';

interface Meeting {
  id: string;
  title: string;
  date: string;
  status: string;
  duration: string;
  mom_text: string | null;
}

export default function ReportsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/meetings/');
      // Only show completed meetings with reports
      const completed = res.data.filter((m: Meeting) => m.status === 'completed' && m.mom_text);
      setMeetings(completed);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleDownload = async (id: string, fmt: 'pdf' | 'docx') => {
    try {
      const res = await api.get(`/meetings/${id}/export?fmt=${fmt}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MeetingMind_Report_${id}.${fmt}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download report.");
    }
  };

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <FileText className="w-8 h-8 text-indigo-400" /> 
              Intelligence Reports
            </h1>
            <p className="text-slate-400 mt-1">Access and download all your AI-generated meeting minutes.</p>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search reports..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-3xl">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No reports found</h3>
            <p className="text-slate-400 mb-6">Process a meeting to generate intelligence reports.</p>
            <Link href="/meeting/live" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition inline-flex items-center gap-2">
               <FileAudio className="w-4 h-4" /> Record Meeting
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMeetings.map((meeting) => (
              <div key={meeting.id} className="bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 transition-all hover:bg-slate-800/40 flex flex-col group">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {new Date(meeting.date).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                    {meeting.title}
                  </h3>
                  <p className="text-sm text-slate-400 mb-6 line-clamp-3">
                    {/* Extract a tiny preview of the executive summary if available */}
                    {meeting.mom_text?.split('\n').find(line => line.length > 20 && !line.startsWith('#')) || "Intelligence report ready."}
                  </p>
                </div>
                
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                  <Link 
                    href={`/meeting/${meeting.id}`}
                    className="flex-1 text-center py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    View Report
                  </Link>
                  <button 
                    onClick={() => handleDownload(meeting.id, 'pdf')}
                    className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-500 bg-indigo-500/10 rounded-lg transition-colors tooltip-trigger"
                    title="Download Premium PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
