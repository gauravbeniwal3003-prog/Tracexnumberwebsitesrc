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
      className={`glass-card w-full max-w-md p-8 relative z-10 ${isModal ? 'shadow-2xl border-white/10' : ''}`}
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 mx-auto mb-4">
          <ShieldAlert className="text-cyan-400" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight uppercase">TRACEXDATA</h1>
        <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest font-mono">Mobile Intelligence Engine</p>
      </div>

      <motion.div
        key="google"
        initial={isModal ? {} : { opacity: 0, scale: 0.95 }}
        animate={isModal ? {} : { opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        <button
          onClick={signInWithGoogle}
          className="w-full py-4 px-6 rounded-2xl bg-white text-zinc-950 font-bold flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
          Continue with Google Account
        </button>
        
        <p className="text-center text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed">
          One-tap secure access via Google Cloud Auth.<br />
          No password required for TRACEXDATA VIP.
        </p>
      </motion.div>

      <p className="mt-12 text-center text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold">
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
