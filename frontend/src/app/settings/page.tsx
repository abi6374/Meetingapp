'use client';

import React, { useState, useEffect } from 'react';
import { Settings2, Save, Globe, BrainCircuit, User as UserIcon, Loader2 } from 'lucide-react';
import ProtectedLayout from '@/components/layout/ProtectedLayout';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, setAuth, token } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [aiProvider, setAiProvider] = useState('groq');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setAiProvider(user.ai_provider || 'groq');
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: any = {
        full_name: fullName,
        ai_provider: aiProvider
      };
      if (password.trim().length > 0) {
        payload.password = password;
      }

      const res = await api.put('/auth/me', payload);
      
      // Update local zustand store
      if (token) {
        setAuth(token, res.data);
      }
      
      setPassword('');
      toast.success("Settings saved successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-indigo-400" /> Settings
          </h1>
          <p className="text-slate-400">Manage your workspace preferences and API integrations.</p>
        </div>

        <div className="space-y-8">
          {/* User Profile */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-indigo-400" /> User Profile
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">New Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* AI Providers Section */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-400" /> AI Provider Preferences
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Default AI Model for Intelligence Reports</label>
                <select 
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 focus:outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="groq">Groq (Llama 3 - Recommended for speed)</option>
                  <option value="gemini">Google Gemini (Recommended for complex reasoning)</option>
                  <option value="ollama">Ollama (Local / Self-hosted)</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">API Keys are securely configured in the backend environment variables.</p>
              </div>
            </div>
          </div>

          {/* General Settings */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 opacity-50 pointer-events-none">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" /> General (Coming Soon)
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Default Transcription Language</label>
                <select className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 appearance-none">
                  <option value="auto">Auto-Detect</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pb-12">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}

