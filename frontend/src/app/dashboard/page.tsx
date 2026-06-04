'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Video, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  ChevronRight,
  UploadCloud,
  FileAudio,
  Loader2,
  Plus,
  FileText,
  AlertCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Meeting {
  id: string;
  title: string;
  date: string;
  status: string;
  duration: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMeetings = async () => {
    try {
      const res = await api.get('meetings/');
      setMeetings(res.data);
      setRecentMeetings(res.data.slice(0, 4));
    } catch (err) {
      console.error('Failed to fetch meetings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setHasMounted(true);
    fetchMeetings();
  }, []);

  // Compute stats
  const totalMeetings = meetings.length;
  const completedMeetings = meetings.filter(m => m.status === 'completed').length;
  const processingMeetings = meetings.filter(m => m.status === 'processing').length;
  
  // Format total duration sum
  const calculateTotalMinutes = () => {
    let totalSec = 0;
    meetings.forEach(m => {
      // Check if duration is stored as raw seconds or TBD
      if (m.duration && m.duration !== 'TBD') {
        const parts = m.duration.split(':').map(Number);
        if (parts.length === 3) {
          totalSec += (parts[0] * 3600) + (parts[1] * 60) + parts[2];
        } else if (!isNaN(Number(m.duration))) {
          totalSec += Number(m.duration);
        }
      }
    });
    return Math.round(totalSec / 60);
  };
  const totalMinutes = calculateTotalMinutes();

  // Generate chart data based on actual meetings
  const generateChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const counts: { [key: string]: number } = {};
    
    // Initialize current + past 5 months
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      counts[months[m.getMonth()]] = 0;
    }

    meetings.forEach(m => {
      try {
        const date = new Date(m.date);
        const monthName = months[date.getMonth()];
        if (counts[monthName] !== undefined) {
          // Approximate 15 mins per meeting if duration is TBD
          let mins = 15;
          if (m.duration && m.duration !== 'TBD') {
            const parts = m.duration.split(':').map(Number);
            if (parts.length === 3) mins = parts[0] * 60 + parts[1];
          }
          counts[monthName] += mins;
        }
      } catch (e) {}
    });

    return Object.keys(counts).map(name => ({
      name,
      minutes: counts[name]
    }));
  };

  const chartData = generateChartData();

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('audio/') || droppedFile.name.match(/\.(mp3|wav|m4a|ogg|flac|webm)$/i)) {
        setFile(droppedFile);
        setUploadTitle(droppedFile.name.replace(/\.[^/.]+$/, "")); // Strip extension
      } else {
        toast.error("Please upload an audio file (MP3, WAV, M4A, etc.).");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setUploadTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading("Uploading and initiating speech processing...");
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', uploadTitle || file.name);
      formData.append('date', new Date().toISOString());
      
      const res = await api.post('meetings/upload', formData);
      toast.success("Meeting uploaded successfully! Processing started.", { id: toastId });
      
      // Clear state
      setFile(null);
      setUploadTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Refresh meetings list
      fetchMeetings();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to upload audio file.", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="space-y-8 max-w-7xl mx-auto px-4 py-6">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Meeting Dashboard</h1>
            <p className="text-slate-400 mt-1">Record live browsers or upload audio to generate reports and ask AI.</p>
          </div>
          <button 
            onClick={fetchMeetings} 
            className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition"
          >
            Sync Data
          </button>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Meetings</p>
                <h3 className="text-2xl font-bold text-white mt-1">{totalMeetings}</h3>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Completed Reports</p>
                <h3 className="text-2xl font-bold text-white mt-1">{completedMeetings}</h3>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Minutes Tracked</p>
                <h3 className="text-2xl font-bold text-white mt-1">{totalMinutes} min</h3>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">In Progress</p>
                <h3 className="text-2xl font-bold text-white mt-1">{processingMeetings}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Ingest Intake Options (Dual Card Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card A: Native Tab Recorder */}
          <div className="bg-gradient-to-b from-[#0e1424] to-[#0c101c] border border-slate-800/80 rounded-3xl p-8 relative flex flex-col justify-between group shadow-xl">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all"></div>
            <div>
              <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                <Video className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Live Tab Recorder</h3>
              <p className="text-slate-400 leading-relaxed mb-8">
                Record meeting audio directly from your browser tab (Google Meet, Teams, Zoom). No bots, no calendar sync required. Captures system sound natively.
              </p>
            </div>
            <div>
              <Link 
                href="/meeting/live" 
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/15"
              >
                Launch Recorder <Plus className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Card B: Drag & Drop File Uploader */}
          <form 
            onSubmit={handleUploadSubmit}
            onDragEnter={handleDrag}
            className="bg-gradient-to-b from-[#0e1424] to-[#0c101c] border border-slate-800/80 rounded-3xl p-8 relative flex flex-col justify-between group shadow-xl"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all"></div>
            
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center">
                  <FileAudio className="w-7 h-7" />
                </div>
                {file && (
                  <button 
                    type="button" 
                    onClick={() => { setFile(null); setUploadTitle(''); }}
                    className="text-slate-500 hover:text-white text-xs border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-lg px-2.5 py-1"
                  >
                    Clear Selected
                  </button>
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">Upload Audio File</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Import recorded sessions. Supports formats: MP3, WAV, M4A, OGG, FLAC, WEBM.
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {!file ? (
                <div 
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-3 transition-colors ${
                    dragActive 
                      ? 'border-emerald-500 bg-emerald-500/5 text-emerald-300' 
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900/30'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm"
                    className="hidden"
                  />
                  <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  <div>
                    <span className="text-sm font-medium text-slate-300">Drag file here or <span className="text-emerald-400 underline">browse</span></span>
                    <p className="text-xs text-slate-500 mt-1">Maximum file size: 100MB</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <FileAudio className="w-8 h-8 text-emerald-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Meeting Title</label>
                    <input 
                      type="text" 
                      required
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. Project Sync Meeting"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4.5 py-3 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button 
                type="submit" 
                disabled={!file || uploading}
                className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/10"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading & Processing...
                  </>
                ) : (
                  <>
                    Process Audio <CheckCircle2 className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Analytics & Recent list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Activity Chart */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Recording Activity</h3>
                <p className="text-sm text-slate-500 mt-0.5">Aggregated speaking activity (minutes)</p>
              </div>
            </div>
            
            <div className="h-[300px] w-full bg-slate-950/20 rounded-xl overflow-hidden">
              {hasMounted ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '14px' }}
                      itemStyle={{ color: '#818cf8' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="minutes" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorMinutes)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-700 text-xs">Loading analytics...</div>
              )}
            </div>
          </div>

          {/* Recent list */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Recent Meetings</h3>
              <Link href="/history" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">View History</Link>
            </div>
            
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[300px]">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                </div>
              ) : recentMeetings.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-sm py-16 gap-2">
                  <FileAudio className="w-8 h-8 text-slate-700" />
                  <p>No recent sessions found.</p>
                </div>
              ) : (
                recentMeetings.map((meeting) => (
                  <Link 
                    key={meeting.id} 
                    href={`/meeting/${meeting.id}`} 
                    className="group p-4 bg-[#0d1220]/40 hover:bg-slate-800/40 border border-slate-800/60 rounded-2xl transition-all flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <h4 className="text-sm font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                        {meeting.title}
                      </h4>
                      <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-1.5">
                        <span>{new Date(meeting.date).toLocaleDateString()}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          meeting.status === 'completed' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' :
                          meeting.status === 'processing' ? 'bg-blue-500/5 text-blue-400 border-blue-500/10 animate-pulse' :
                          'bg-red-500/5 text-red-400 border-red-500/10'
                        }`}>
                          {meeting.status}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
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
