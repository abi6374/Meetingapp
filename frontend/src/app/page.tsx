'use client';

import React from 'react';
import Link from 'next/link';
import { Mic, FileText, Zap, Shield, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-200 font-sans selection:bg-indigo-500/30">
      <header className="border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
              MeetingMind
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/login" className="text-slate-300 hover:text-white transition-colors">Log in</Link>
            <Link href="/signup" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all">Get Started Free</Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0a0f1c] to-[#0a0f1c] -z-10"></div>
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight">
              Your Meetings, <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Captured and Analyzed</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Capture browser audio natively. Instantly transcribe, summarize, and extract action items from Google Meet, Zoom, and Teams using advanced AI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-indigo-500/25">
                Start for free <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-slate-900/50 border-y border-slate-800/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">Enterprise Meeting Intelligence</h2>
              <p className="text-slate-400">Everything you need to never take manual notes again.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-3xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mb-6">
                  <Mic className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Native Tab Capture</h3>
                <p className="text-slate-400 leading-relaxed">Record directly from your browser. No bots joining your meetings, no software to install.</p>
              </div>

              <div className="p-8 rounded-3xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">AI Intelligence</h3>
                <p className="text-slate-400 leading-relaxed">Automatic generation of executive summaries, decisions, risks, and assigned action items.</p>
              </div>

              <div className="p-8 rounded-3xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Secure & Private</h3>
                <p className="text-slate-400 leading-relaxed">Your data is yours. Meetings are stored securely in your workspace with tenant isolation.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 text-center text-slate-500 text-sm">
        <p>© 2026 MeetingMind. All rights reserved.</p>
      </footer>
    </div>
  );
}
