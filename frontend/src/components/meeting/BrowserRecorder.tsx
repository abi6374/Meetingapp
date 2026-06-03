'use client';

import React, { useState } from 'react';
import { Play, Square, Loader2, AlertCircle, UploadCloud } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useRecordingStore } from '@/store/useRecordingStore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function BrowserRecorder() {
  const {
    isRecording,
    startRecording,
    stopRecording,
    clearRecording,
    audioBlob,
    error,
    sourceLabel,
    duration
  } = useRecordingStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [meetingId, setMeetingId] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleProcess = async () => {
    if (!audioBlob) {
      toast.error("No audio recorded.");
      return;
    }
    
    setIsProcessing(true);
    const toastId = toast.loading("Uploading meeting audio...");
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('title', `Live Meeting - ${new Date().toLocaleDateString()}`);
      formData.append('date', new Date().toISOString());
      formData.append('duration', duration.toString());

      const response = await api.post('meetings/upload', formData);
      setMeetingId(response.data.meeting_id);
      toast.success("Meeting uploaded successfully!", { id: toastId });
      
    } catch (err: any) {
      console.error('Upload failed:', err);
      toast.error(err.response?.data?.detail || 'Failed to upload meeting', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscard = () => {
      clearRecording();
      setMeetingId(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl backdrop-blur-xl">
      {/* Header Status */}
      <div className="flex justify-center mb-8">
        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors",
          isRecording 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : audioBlob
              ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
              : "bg-slate-800 border-slate-700 text-slate-400"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isRecording ? "bg-emerald-500 animate-pulse" : audioBlob ? "bg-blue-500" : "bg-slate-500"
          )} />
          {isRecording ? "Recording Background Meeting" : audioBlob ? "Recording Completed" : "Meeting: Ready"}
        </div>
      </div>

      {/* Timer */}
      <div className="text-center mb-10">
        <div className="font-mono text-6xl font-light text-slate-100 tracking-tight">
          {formatDuration(duration)}
        </div>
        {sourceLabel && (
          <div className="mt-4 text-sm text-slate-400 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Input: {sourceLabel}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-semibold transition-all transform hover:-translate-y-0.5 shadow-lg hover:shadow-emerald-500/25"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Meeting
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-red-500/30 text-red-400 hover:text-red-300 rounded-2xl font-semibold transition-all"
          >
            <Square className="w-5 h-5 fill-current" />
            Stop Meeting
          </button>
        )}

        {audioBlob && !isRecording && (
          <div className="flex flex-col items-center gap-4 w-full">
            <button
              onClick={handleProcess}
              disabled={isProcessing || !!meetingId}
              className="flex items-center justify-center w-full gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl font-semibold transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : meetingId ? (
                "Processing Started"
              ) : (
                <>
                  <UploadCloud className="w-5 h-5" />
                  Process Meeting
                </>
              )}
            </button>
            
            {meetingId && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <p className="text-emerald-400 text-sm font-medium">
                  Meeting uploaded successfully!
                </p>
                <a 
                  href="/history" 
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm transition-colors"
                >
                  Go to Meeting History
                </a>
              </div>
            )}

            {!isProcessing && !meetingId && (
              <button
                onClick={handleDiscard}
                className="text-slate-400 hover:text-slate-300 text-sm underline underline-offset-4"
              >
                Discard and Start Over
              </button>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      {!isRecording && !audioBlob && (
        <div className="mt-8 text-center text-sm text-slate-500 leading-relaxed">
          <p>Click Start, select your <b>Meeting Tab</b> (Google Meet, Teams, Zoom)</p>
          <p>and ensure <span className="text-blue-400 font-medium">"Share tab audio"</span> is checked.</p>
        </div>
      )}
    </div>
  );
}
