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
  XCircle,
  ArrowRight,
  Zap,
  Sparkles,
  Bot
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
    <div className="min-h-screen bg-[#030712] flex selection:bg-indigo-500/30 font-sans">
      
      {/* Left Column - Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-16 md:px-24 xl:px-32 relative z-10 py-10">
        
        {/* Mobile background bleed */}
        <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
           <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[40%] bg-indigo-600/10 rounded-full blur-[100px]"></div>
           <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Logo / Brand */}
          <Link href="/" className="inline-flex items-center gap-2 mb-10 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
               <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">MeetingMind</span>
          </Link>

          <div className="mb-10">
            <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Create Account</h1>
            <p className="text-slate-400 text-sm">Join MeetingMind and automate your meeting documentation.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSignup}>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-3 text-sm"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-300">Legal Full Name</label>
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
                  className="w-full pl-12 pr-4 py-4 bg-[#0a0f1c] border border-slate-800 hover:border-slate-700 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-300">Email Address</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-4 bg-[#0a0f1c] border border-slate-800 hover:border-slate-700 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-300">Security Password</label>
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
                  className="w-full pl-12 pr-12 py-4 bg-[#0a0f1c] border border-slate-800 hover:border-slate-700 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner font-medium tracking-wide"
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
              <div className="px-1 pt-2 pb-2">
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_0_60px_-15px_rgba(79,70,229,0.7)] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 overflow-hidden relative group"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Create Free Account <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-center text-sm text-slate-400 pt-4">
              Already registered?{' '}
              <Link href="/login" className="font-bold text-white hover:text-indigo-400 transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        </motion.div>
      </div>

      {/* Right Column - Visual Showcase */}
      <div className="hidden lg:flex w-[55%] relative overflow-hidden bg-slate-900 items-center justify-center border-l border-slate-800">
        {/* Dynamic Background Mesh */}
        <div className="absolute inset-0 w-full h-full bg-[#030712]">
          <div className="absolute top-[20%] right-[20%] w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }}></div>
          <div className="absolute bottom-[20%] left-[20%] w-[400px] h-[400px] bg-emerald-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }}></div>
          <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]"></div>
        </div>
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        {/* Floating UI Elements */}
        <div className="relative z-10 w-full max-w-lg">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 p-8 rounded-[2.5rem] shadow-2xl relative"
          >
            <div className="absolute -top-6 -right-6 w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 -rotate-12">
               <Sparkles className="w-6 h-6 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-4">Transform your meetings.</h3>
            <p className="text-slate-400 leading-relaxed mb-8">
              Join thousands of professionals saving hours each week with automated transcription, diarization, and AI-powered insights.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">AI Minutes Generation</h4>
                  <p className="text-slate-500 text-xs mt-0.5">Automated decisions & action items</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Speaker Diarization</h4>
                  <p className="text-slate-500 text-xs mt-0.5">Know exactly who said what</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

    </div>
  );
}

function PasswordCheck({ label, met }: { label: string, met: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${met ? 'text-emerald-400' : 'text-slate-500'}`}>
      {met ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5 opacity-50" />}
      {label}
    </div>
  );
}
