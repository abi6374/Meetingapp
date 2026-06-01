'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Video, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  MoreHorizontal,
  ChevronRight,
  Play
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import api from '@/lib/api';

const mockData = [
  { name: 'Jan', minutes: 120 },
  { name: 'Feb', minutes: 210 },
  { name: 'Mar', minutes: 180 },
  { name: 'Apr', minutes: 390 },
  { name: 'May', minutes: 280 },
  { name: 'Jun', minutes: 420 },
];

interface Meeting {
  id: string;
  title: string;
  date: string;
  status: string;
  duration: string;
}

export default function DashboardPage() {
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/meetings/');
        setRecentMeetings(res.data.slice(0, 4));
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  return (
    <ProtectedLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Overview</h1>
            <p className="text-slate-400 mt-1">Here's what's happening with your meetings.</p>
          </div>
          <Link 
            href="/meeting/live"
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/25"
          >
            <Play className="w-4 h-4 fill-current" /> Record New Meeting
          </Link>
        </div>

        {/* Top Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Meetings', value: '124', icon: Video, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Hours Recorded', value: '48.5', icon: Clock, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { label: 'Pending Actions', value: '12', icon: CheckCircle2, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Productivity Gain', value: '+34%', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:bg-slate-800/40 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <button className="text-slate-500 hover:text-slate-300">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-sm font-medium text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Recording Activity</h3>
              <p className="text-sm text-slate-400">Minutes recorded per month</p>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#c7d2fe' }}
                  />
                  <Area type="monotone" dataKey="minutes" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorMinutes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Meetings */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-white">Recent Meetings</h3>
              <Link href="/history" className="text-sm text-indigo-400 hover:text-indigo-300">View all</Link>
            </div>
            
            <div className="flex-1 flex flex-col gap-4">
              {recentMeetings.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                  <p>No recent meetings.</p>
                </div>
              ) : (
                recentMeetings.map((meeting) => (
                  <Link key={meeting.id} href={`/meeting/${meeting.id}`} className="group p-4 bg-slate-800/30 hover:bg-slate-800/80 border border-slate-700/50 rounded-xl transition-all flex items-center justify-between">
                    <div className="min-w-0">
                      <h4 className="text-white font-medium truncate group-hover:text-indigo-400 transition-colors">{meeting.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>{new Date(meeting.date).toLocaleDateString()}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                        <span>{meeting.duration}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}

