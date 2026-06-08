'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { 
  Loader2, 
  AlertCircle, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  UserPlus, 
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Password Strength State
  const [strength, setStrength] = useState(0);
  const [checks, setChecks] = useState({
    length: false,
    number: false,
    special: false,
    upper: false
  });

  const router = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const newChecks = {
      length: password.length >= 8,
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      upper: /[A-Z]/.test(password)
    };
    setChecks(newChecks);
    
    let s = 0;
    if (newChecks.length) s += 25;
    if (newChecks.number) s += 25;
    if (newChecks.special) s += 25;
    if (newChecks.upper) s += 25;
    setStrength(s);
  }, [password]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strength < 75) {
      setError("Please choose a stronger password.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await api.post('auth/signup', {
        email,
        password,
        full_name: fullName
      });
      
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      const res = await api.post('auth/login', formData);
      const token = res.data.access_token;
      
      const meRes = await api.get('auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAuth(token, meRes.data);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. This email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4 selection:bg-indigo-500/30">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10 py-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4"
          >
            <UserPlus className="w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h1>
          <p className="text-slate-400 mt-2">Join MeetingMind and automate your meeting documentation</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 md:p-10 rounded-[2.5rem] shadow-2xl">
          <form className="space-y-5" onSubmit={handleSignup}>
            <AnimatePresence mode='wait'>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-sm"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Legal Full Name</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Security Password</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Strength Meter */}
              <div className="px-1 pt-2">
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${strength}%` }}
                    className={`h-full transition-colors duration-500 ${
                      strength <= 25 ? 'bg-red-500' :
                      strength <= 50 ? 'bg-amber-500' :
                      strength <= 75 ? 'bg-blue-500' :
                      'bg-emerald-500'
                    }`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                  <PasswordCheck label="8+ characters" met={checks.length} />
                  <PasswordCheck label="Upper case" met={checks.upper} />
                  <PasswordCheck label="Number" met={checks.number} />
                  <PasswordCheck label="Special char" met={checks.special} />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
              </button>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0b121f] px-2 text-slate-500 font-medium">Already registered?</span>
              </div>
            </div>

            <Link 
              href="/login" 
              className="w-full flex items-center justify-center py-3.5 border border-slate-800 hover:bg-slate-800/50 text-slate-300 font-semibold rounded-2xl transition-all"
            >
              Sign In to Existing Account
            </Link>
          </form>
        </div>

        <p className="text-center text-[10px] text-slate-600 font-medium uppercase tracking-[0.2em] mt-8">
          Compliance Verified • GDPR Ready
        </p>
      </motion.div>
    </div>
  );
}

function PasswordCheck({ label, met }: { label: string, met: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${met ? 'text-emerald-400' : 'text-slate-600'}`}>
      {met ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3 opacity-50" />}
      {label}
    </div>
  );
}
