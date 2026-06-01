'use client';

import { useEffect } from 'react';
import { AlertOctagon, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#090c15] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-red-500/10 p-4 rounded-full mb-6">
        <AlertOctagon className="w-12 h-12 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">Something went wrong!</h2>
      <p className="text-slate-400 max-w-md mb-8">
        We encountered an unexpected error while loading this page. Our team has been notified.
      </p>
      
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors border border-slate-700 hover:border-slate-600"
      >
        <RefreshCcw className="w-4 h-4" /> Try again
      </button>
    </div>
  );
}
