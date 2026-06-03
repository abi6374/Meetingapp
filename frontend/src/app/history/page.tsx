'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { FileText, Clock, Calendar, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import ProtectedLayout from '@/components/layout/ProtectedLayout';

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

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const res = await api.get('meetings/');
      setMeetings(res.data.reverse()); // Show newest first
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
    // Poll every 5 seconds to update status
    const interval = setInterval(fetchMeetings, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Meeting History</h1>
            <p className="text-slate-400">View and manage your processed meetings.</p>
          </div>
          <button onClick={fetchMeetings} className="text-sm px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition">
            Refresh
          </button>
        </div>

        {loading && meetings.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-3xl">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No meetings yet</h3>
            <p className="text-slate-400 mb-6">Start a new meeting to see it here.</p>
            <Link href="/dashboard" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <Link key={meeting.id} href={`/meeting/${meeting.id}`}>
                <div className="group bg-slate-900/40 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 transition-all hover:bg-slate-800/40 flex items-center justify-between cursor-pointer">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-2 group-hover:text-indigo-400 transition-colors">
                      {meeting.title}
                    </h3>
                    <div className="flex items-center gap-6 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(meeting.date).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {meeting.duration}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                      meeting.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      meeting.status === 'processing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
