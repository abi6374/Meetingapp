'use client';

import React from 'react';
import BrowserRecorder from '@/components/meeting/BrowserRecorder';
import ProtectedLayout from '@/components/layout/ProtectedLayout';

export default function LiveMeetingPage() {
  return (
    <ProtectedLayout>
      <div className="max-w-7xl mx-auto py-12">
        <div className="mb-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-indigo-500/10 text-indigo-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Live Meeting Intelligence
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Capture browser audio from Google Meet, Teams, or Zoom. We'll automatically transcribe, diarize, and extract actionable insights.
          </p>
        </div>

        <BrowserRecorder />
      </div>
    </ProtectedLayout>
  );
}
