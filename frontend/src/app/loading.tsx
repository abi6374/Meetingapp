'use client';

import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#090c15] flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
      <p className="text-slate-400 font-medium animate-pulse">Loading workspace...</p>
    </div>
  );
}
