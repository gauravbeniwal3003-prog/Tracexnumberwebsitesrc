/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../services/AuthContext.tsx';
import LiquidBackground from './LiquidBackground.tsx';

export default function LoginScreen({ isModal = false }: { isModal?: boolean }) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'google'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { error: signInError } = await signInWithEmail(email, password);
        if (signInError) throw signInError;
      } else if (mode === 'signup') {
        if (!fullName) throw new Error('Full name is required');
        const { error: signUpError } = await signUpWithEmail(email, password, fullName);
        if (signUpError) throw signUpError;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <motion.div
      initial={isModal ? {} : { opacity: 0, scale: 0.95 }}
      animate={isModal ? {} : { opacity: 1, scale: 1 }}
      className={`glass-card w-full max-w-md p-8 relative z-10 bg-white/95 border-sky-200 ${isModal ? 'shadow-[0_20px_50px_rgba(14,165,233,0.15)] border-sky-200' : 'shadow-xl'}`}
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-3xl bg-sky-100 flex items-center justify-center border border-sky-200 mx-auto mb-4 shadow-sm">
          <ShieldAlert className="text-sky-600" size={32} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">TRACEXDATA</h1>
        <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest font-bold">Mobile Intelligence Engine</p>
      </div>

      <motion.div
        key="google"
        initial={isModal ? {} : { opacity: 0, scale: 0.95 }}
        animate={isModal ? {} : { opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        <button
          onClick={signInWithGoogle}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold flex items-center justify-center gap-3 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" referrerPolicy="no-referrer" />
          Continue with Google Account
        </button>
        
        <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
          One-tap secure access via Google Cloud Auth.<br />
          No password required for TRACEXDATA VIP.
        </p>
      </motion.div>

      <p className="mt-12 text-center text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">
        Secured by TRACEXDATA Enterprise
      </p>
    </motion.div>
  );

  if (isModal) return content;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <LiquidBackground />
      {content}
    </div>
  );
}
