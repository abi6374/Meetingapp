'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { 
  LayoutDashboard, 
  Video, 
  FileAudio, 
  FileText, 
  MessageSquare, 
  Settings, 
  LogOut,
  Menu,
  X,
  Sparkles,
  Search,
  Bell,
  Sun,
  Moon,
  Mic
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRecordingStore } from '@/store/useRecordingStore';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Live Meeting', path: '/meeting/live', icon: Video },
  { name: 'Meetings', path: '/history', icon: FileAudio },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'AI Assistant', path: '/chat', icon: MessageSquare },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { token, user, logout } = useAuthStore();
  const { isRecording } = useRecordingStore();
  
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (isHydrated && !token) {
      router.push('/login');
    }
  }, [isHydrated, token, router]);

  if (!isHydrated || !token) return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-[#090c15] text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">
      <Toaster position="bottom-right" toastOptions={{
        style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
      }} />
      
      {/* Sidebar */}
      <motion.aside 
        initial={{ width: 260 }}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className="flex flex-col h-full bg-[#0d121f] border-r border-slate-800/60 z-20 shrink-0 transition-all duration-300 relative"
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/60 shrink-0">
          {sidebarOpen ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                MeetingMind
              </span>
            </motion.div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 bg-slate-800 border border-slate-700 rounded-full p-1 text-slate-400 hover:text-white z-30"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <Link key={item.path} href={item.path}>
                <div className={`flex items-center ${sidebarOpen ? 'px-4' : 'justify-center'} py-3 mb-1 rounded-xl transition-all duration-200 group relative ${
                  isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}>
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  {sidebarOpen && (
                    <span className={`ml-3 font-medium ${isActive ? 'font-semibold' : ''}`}>
                      {item.name}
                    </span>
                  )}
                  {isActive && sidebarOpen && (
                    <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/60">
          <div className={`flex items-center ${sidebarOpen ? 'px-4' : 'justify-center'} py-3 rounded-xl hover:bg-slate-800/50 transition-colors cursor-pointer text-slate-400 hover:text-red-400`} onClick={handleLogout}>
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="ml-3 font-medium">Log out</span>}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800/60 bg-[#0a0f1c]/80 backdrop-blur-xl z-10 shrink-0">
          <div className="flex-1 flex items-center gap-4">
            <div className="relative w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search meetings... (Ctrl+K)" 
                className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">⌘K</kbd>
            </div>
            
            {/* Global Recording Indicator */}
            {isRecording && (
              <Link href="/meeting/live">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full cursor-pointer hover:bg-red-500/20 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-medium text-red-400">Recording</span>
                </motion.div>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0f1c]"></span>
            </button>
            <div className="w-px h-6 bg-slate-800"></div>
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block text-sm">
                <p className="font-medium text-slate-200 leading-none">{user?.full_name}</p>
                <p className="text-xs text-slate-500 mt-1">{user?.email}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </div>
        </main>

      </div>
    </div>
  );
}
