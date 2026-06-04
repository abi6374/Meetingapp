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
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
    const fetchStats = async () => {
      try {
        const res = await api.get('meetings/');
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
        {/* ... Header and Widgets (unchanged) ... */}
        {/* Update: Wrap the chart in the hasMounted check */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white">Recording Activity</h3>
              <p className="text-sm text-slate-400">Minutes recorded per month</p>
            </div>
            <div className="h-[300px] w-full bg-slate-900/20 rounded-xl overflow-hidden">
              {hasMounted ? (
                <ResponsiveContainer width="99%" height={300}>
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
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-700 text-xs">Loading Analytics...</div>
              )}
            </div>
          </div>
          {/* ... Rest of the page (Meetings list) ... */}

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

