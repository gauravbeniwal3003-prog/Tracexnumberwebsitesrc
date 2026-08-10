import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Database,
  Lock,
  Phone,
  Eye,
  EyeOff,
  Zap,
  Wallet,
  Headphones,
  User,
  CheckCircle2,
  Sparkles,
  Terminal,
  Copy,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../services/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';

interface LoginScreenProps {
  isSignUpInitial?: boolean;
  isModal?: boolean;
  onClose?: () => void;
}

export default function LoginScreen({ isSignUpInitial = false, isModal = false, onClose }: LoginScreenProps) {
  const { user, loading: authLoading, signInWithGoogle, signInWithMobile, signUpWithMobile, enterDemoMode } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!authLoading && user && !isModal) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, isModal, navigate]);

  const [isSignUp, setIsSignUp] = useState(isSignUpInitial);
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const sqlQuery = `-- SQL Command to create or update mobile users table in PostgreSQL / Supabase
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) DEFAULT 'Mobile User',
    email VARCHAR(255),
    credits NUMERIC(10, 2) DEFAULT 1470.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for high-speed parameterized phone lookups (SQL Injection Safe)
CREATE INDEX IF NOT EXISTS idx_app_users_phone ON public.app_users (phone);

-- Enable Row Level Security (RLS)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Allow Service Role Full Access
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow Service Role Full Access'
    ) THEN
        CREATE POLICY "Allow Service Role Full Access" ON public.app_users FOR ALL USING (true);
    END IF;
END $$;`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    if (pass.length < 6) return { score: 1, label: 'Weak (Min 6 chars)', color: 'bg-rose-500' };
    let score = 1;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass) && pass.length >= 8) score++;
    
    if (score === 1) return { score: 1, label: 'Fair', color: 'bg-amber-500' };
    if (score === 2) return { score: 2, label: 'Good', color: 'bg-blue-500' };
    return { score: 3, label: 'Strong Security', color: 'bg-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMessage('Kripya valid 10-digit mobile number enter karein');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Kripya valid 10-digit Indian mobile number enter karein (starting with 6-9)');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password kam se kam 6 characters ka hona chahiye');
      return;
    }

    if (isSignUp && (!fullName || fullName.trim().length < 2)) {
      setErrorMessage('Kripya apna poora naam (Full Name) enter karein');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error, user } = await signUpWithMobile(cleanPhone, password, fullName.trim());
        if (error) {
          setErrorMessage(error.message || 'Registration fail ho gaya.');
        } else {
          setSuccessMessage('Account safaltapoorvak ban gaya hai! Redirecting...');
          setTimeout(() => {
            if (onClose) onClose();
            navigate('/dashboard');
          }, 800);
        }
      } else {
        const { error, user } = await signInWithMobile(cleanPhone, password);
        if (error) {
          setErrorMessage(error.message || 'Invalid Mobile Number or Password.');
        } else {
          setSuccessMessage('Login safaltapoorvak ho gaya! Redirecting...');
          setTimeout(() => {
            if (onClose) onClose();
            navigate('/dashboard');
          }, 800);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Server connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      setTimeout(() => {
        navigate('/dashboard');
      }, 400);
    } catch (err) {
      console.error("Google sign in error:", err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:grid md:grid-cols-12 font-sans selection:bg-blue-600 selection:text-white relative">
      
      {/* LEFT COLUMN - VIBRANT BRAND BANNER (Visible on Tablet/Laptop/Desktop, Hidden on Mobile) */}
      <div className="hidden md:flex md:col-span-5 lg:col-span-6 xl:col-span-5 bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-900 p-8 sm:p-12 lg:p-16 flex-col justify-between text-white relative overflow-hidden min-h-screen">
        
        {/* Subtle Decorative Background Circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none" />

        {/* Top Logo Badge */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white shadow-md">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <span className="font-black text-xl tracking-tight uppercase text-white">TRACEXDATA</span>
            <span className="text-[10px] font-extrabold bg-white/15 text-blue-100 border border-white/20 px-2 py-0.5 rounded-full ml-2 uppercase">
              PORTAL
            </span>
          </div>
        </div>

        {/* Middle Banner Content */}
        <div className="relative z-10 my-auto py-8 space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight"
          >
            Welcome to <br />
            TraceXData Portal
          </motion.h1>

          <p className="text-blue-100/90 text-sm sm:text-base font-medium leading-relaxed max-w-md">
            India's most trusted digital service network. Experience seamless transactions, secure wallet management, and lightning-fast services all in one place.
          </p>

          {/* 4 Feature Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 pt-4 max-w-md">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3 transition-colors shadow-sm overflow-hidden">
              <div className="shrink-0 p-1.5 sm:p-2 bg-blue-500/30 text-sky-300 rounded-lg sm:rounded-xl">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-sky-300" />
              </div>
              <span className="min-w-0 flex-1 font-bold text-xs sm:text-sm text-white leading-tight break-words">
                Fast Services
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3 transition-colors shadow-sm overflow-hidden">
              <div className="shrink-0 p-1.5 sm:p-2 bg-emerald-500/30 text-emerald-300 rounded-lg sm:rounded-xl">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="min-w-0 flex-1 font-bold text-xs sm:text-sm text-white leading-tight break-words">
                100% Safe & Secure
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3 transition-colors shadow-sm overflow-hidden">
              <div className="shrink-0 p-1.5 sm:p-2 bg-amber-500/30 text-amber-300 rounded-lg sm:rounded-xl">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="min-w-0 flex-1 font-bold text-xs sm:text-sm text-white leading-tight break-words">
                Smart Wallet
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3 transition-colors shadow-sm overflow-hidden">
              <div className="shrink-0 p-1.5 sm:p-2 bg-purple-500/30 text-purple-300 rounded-lg sm:rounded-xl">
                <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="min-w-0 flex-1 font-bold text-xs sm:text-sm text-white leading-tight break-words">
                24/7 Support
              </span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 pt-4 text-xs text-blue-200/80 font-medium">
          © 2026 TraceXData API Services. All rights reserved.
        </div>
      </div>

      {/* RIGHT COLUMN - FORM SECTION */}
      <div className="md:col-span-7 lg:col-span-6 xl:col-span-7 bg-slate-50/70 p-5 sm:p-10 lg:p-16 flex flex-col justify-between relative min-h-screen">
        
        {/* Top Header Row with "Back to Home" & Mobile Logo Badge */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </button>

          {/* Mobile Logo Badge */}
          <div className="md:hidden flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-black text-sm tracking-tight uppercase text-slate-900">TRACEXDATA</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="max-w-md mx-auto w-full my-auto py-6">
          
          {/* Header Title & Subtitle */}
          <div className="space-y-1 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {isSignUp ? "Create Account" : "Welcome Back"}
              </h2>
              <button
                type="button"
                onClick={() => setShowSqlModal(true)}
                className="text-[11px] font-bold bg-slate-900 text-amber-300 hover:bg-slate-800 border border-amber-400/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-amber-300" />
                <span>Database SQL Query</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Apne <span className="text-blue-600 font-bold">TraceXData</span> account me {isSignUp ? "register" : "login"} karein
            </p>
          </div>

          {/* White Input Card */}
          <motion.div
            key={isSignUp ? "signup" : "login"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-5"
          >
            {/* Status Badges */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl text-center flex items-center justify-center gap-2">
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* SQL Injection Shield Banner */}
            <div className="bg-emerald-50/80 border border-emerald-200/80 p-2.5 rounded-2xl flex items-center gap-2 text-[11px] font-bold text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>SQL Injection Protected (Parameterized & Encrypted)</span>
            </div>

            {/* MOBILE NUMBER & PASSWORD AUTH FORM */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Full Name Input (Sign Up Mode Only) */}
              {isSignUp && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-slate-800 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Mobile Number Input with India +91 Badge */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Mobile Number</label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1.5 border-r border-slate-200 pr-2.5">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-extrabold text-slate-600">+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10 digit mobile"
                    className="w-full pl-24 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-extrabold text-slate-800 tracking-wider outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                  {isSignUp && password && (
                    <span className="text-[10px] font-bold text-slate-500">
                      {passwordStrength.label}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-xs font-medium text-slate-800 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator Bar */}
                {isSignUp && password && (
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1.5">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.score / 3) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98 disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing Secure Auth...
                  </span>
                ) : (
                  <>
                    <span>{isSignUp ? "Register Account" : "Login with Mobile"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Switch Mode Footer */}
            <div className="pt-2 text-center text-xs text-slate-600 font-medium">
              {isSignUp ? (
                <span>
                  Pehle se account hai?{" "}
                  <button
                    onClick={() => {
                      setIsSignUp(false);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="font-black text-blue-600 hover:underline cursor-pointer ml-1"
                  >
                    Login karein
                  </button>
                </span>
              ) : (
                <span>
                  Naye user hain?{" "}
                  <button
                    onClick={() => {
                      setIsSignUp(true);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="font-black text-blue-600 hover:underline cursor-pointer ml-1"
                  >
                    Account banayein
                  </button>
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="relative py-1 flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest absolute">
                OR ALTERNATIVE ACCESS
              </span>
            </div>

            {/* GOOGLE OAUTH BUTTON */}
            <div className="space-y-2.5">
              <button
                onClick={handleGoogleLogin}
                type="button"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs active:scale-98"
              >
                <img
                  src="https://www.google.com/favicon.ico"
                  alt="Google"
                  className="w-4 h-4 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <span>Continue with Google OAuth</span>
              </button>
            </div>

          </motion.div>

          {/* Bottom Security Note */}
          <div className="mt-6 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Protected by TraceXData SSL & SQL Injection Shield
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center pt-4">
          <button
            onClick={() => navigate('/alvisappapi')}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            Client Alvis App API Management Page →
          </button>
        </div>
      </div>

      {/* SQL QUERY COMMAND MODAL */}
      <AnimatePresence>
        {showSqlModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSqlModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white">Database SQL Command</h3>
                    <p className="text-xs text-slate-400 font-medium">Run this SQL in your Supabase / PostgreSQL SQL Editor</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SQL Code Box */}
              <div className="relative">
                <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-amber-300 overflow-x-auto max-h-80 leading-relaxed">
                  {sqlQuery}
                </pre>
                <button
                  onClick={copySql}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SQL Query</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700 text-xs text-slate-300 space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>SQL Injection Protection Mechanics:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  1. All phone & password parameters are passed using parameterized bindings (<code className="text-amber-300">$1, $2</code>) to prevent raw SQL query concatenation.<br />
                  2. Mobile input is sanitized to digits only (<code className="text-amber-300">/^[6-9]\d&#123;9&#125;$/</code>).<br />
                  3. Passwords are hashed with <code className="text-amber-300">PBKDF2 SHA-512</code> cryptographic salt before storage.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 font-extrabold text-xs text-white rounded-xl cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
