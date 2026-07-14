import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Zap, CreditCard, ChevronRight, CheckCircle2, AlertCircle, RefreshCw, Sparkles, User, Mail, Phone, IndianRupee, FileDown, Timer, PlayCircle, Terminal, ClipboardCheck, History, ArrowLeft, Loader2, Check, Clipboard } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import LiquidBackground from '../components/LiquidBackground';
import { getApiBaseUrl } from '../services/api.ts';
import { cleanIndianPhoneNumber } from '../services/utils.ts';

interface ScriptPurchaseRecord {
  order_id: string;
  amount: number;
  status: 'pending' | 'active' | 'expired';
  created_at: string;
  activated_at: string | null;
  expires_at: string | null;
  time_left_ms: number;
}

export default function ScriptPurchase() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('order_id');

  const [purchases, setPurchases] = useState<ScriptPurchaseRecord[]>([]);
  const [activePurchase, setActivePurchase] = useState<ScriptPurchaseRecord | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [loading, setLoading] = useState(true);
  
  // Checkout Form State
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  
  // Action States
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      setPayerName(profile?.full_name || '');
      setPayerEmail(user.email || '');
      fetchStatus();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  // Handle URL order ID redirection for cashfree status callback
  useEffect(() => {
    if (orderIdFromUrl && user) {
      verifyOrder(orderIdFromUrl);
    }
  }, [orderIdFromUrl, user]);

  const fetchStatus = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || '';
      
      const response = await fetch(`${getApiBaseUrl()}/api/script/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPurchases(data.purchases || []);
        const active = data.latest_active_purchase;
        if (active) {
          setActivePurchase(active);
          const secondsLeft = Math.floor(active.time_left_ms / 1000);
          setTimeLeft(secondsLeft > 0 ? secondsLeft : 0);
        } else {
          setActivePurchase(null);
          setTimeLeft(0);
        }
      }
    } catch (err) {
      console.error('Error fetching script purchase status:', err);
    } finally {
      setLoading(false);
    }
  };

  const verifyOrder = async (oid: string) => {
    setIsVerifying(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/cashfree/status/${oid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.order_status === 'PAID') {
          setSuccessMsg('Payment successfully verified! Your 10-minute download window is now open.');
          setSearchParams({}); // Clear query params
          await fetchStatus();
        } else {
          setErrorMsg(`Payment verification pending: status is ${data.order_status || 'unknown'}.`);
        }
      } else {
        throw new Error('Verification network fault.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify payment status.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Timer Countdown Logic
  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // Refresh status once timer hits 0 to automatically lock download access
            fetchStatus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || '';

      const payload = {
        user_id: user?.id,
        user_email: payerEmail || user?.email || 'pvt_purchaser@tracexdata.com',
        plan_id: 'gaurav_pvt_script',
        amount: 400,
        customer_phone: payerPhone || '9999999999',
        customer_name: payerName || 'VIP Purchaser',
        return_url: `${window.location.origin}/script?order_id={order_id}`
      };

      const response = await fetch(`${getApiBaseUrl()}/api/cashfree/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const orderData = await response.json();

      if (!orderData.payment_session_id) {
        throw new Error('Could not initiate secure gateway session. Try again.');
      }

      const cashfreeMode = orderData.cf_mode || "production";
      const cashfree = window.Cashfree({
        mode: cashfreeMode
      });

      await cashfree.checkout({
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: "_self"
      });

    } catch (err: any) {
      console.error('Payment Error:', err);
      setErrorMsg(err.message || 'Payment initiation failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleDownloadFile = async () => {
    if (!activePurchase || isDownloading) return;

    setIsDownloading(true);
    setErrorMsg(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || '';

      const response = await fetch(`${getApiBaseUrl()}/api/script/download-file?order_id=${activePurchase.order_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.download_url) {
          // Open direct download link in a secure new tab
          window.open(data.download_url, '_blank');
          setSuccessMsg('Download initiated! Check your downloads tab.');
        } else {
          throw new Error('No download URL returned from secure endpoint.');
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Download verification rejected by backend.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Download attempt failed. Please contact support.');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const copyCommand = () => {
    navigator.clipboard.writeText('pkg update && pkg upgrade -y && pkg install python python-pip git openssl-tool termux-exec -y && pip install requests urllib3');
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const openLogin = () => {
    window.dispatchEvent(new CustomEvent('open-login'));
  };

  return (
    <div className="min-h-screen bg-[#020204] text-zinc-100 selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden flex flex-col justify-between relative font-sans">
      <LiquidBackground />

      {/* Decorative Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-20">
        <div className="absolute top-[20%] left-[10%] w-72 h-72 rounded-full bg-gradient-to-br from-cyan-500/10 to-transparent blur-[80px]" />
        <div className="absolute bottom-[25%] right-[10%] w-80 h-80 rounded-full bg-gradient-to-tr from-purple-500/10 to-transparent blur-[100px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 p-4 md:p-6 z-[60] flex items-center justify-between">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-xl transition-all hover:bg-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]"
        >
          <ArrowLeft size={14} className="text-cyan-400" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-300">Back to Lookup</span>
        </button>

        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <ShieldCheck size={12} className="text-emerald-400" /> SECURE DECRYPTION
          </span>
        </div>
      </nav>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-24 pb-16 px-4 max-w-4xl mx-auto w-full">
        
        {/* Banner Headers */}
        <header className="text-center max-w-lg mx-auto mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-md"
          >
            <Zap size={12} className="text-cyan-400 animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-cyan-400 font-mono">Premium Digital Assets</span>
          </motion.div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2 uppercase italic bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
            Script Center
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm">
            Acquire private tools and utilities verified under proper, automated license servers.
          </p>
        </header>

        {/* Global Alert Notification */}
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-2xl p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs md:text-sm flex items-start gap-3 relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-red-500" />
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span className="leading-relaxed font-semibold">{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-2xl p-4 mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs md:text-sm flex items-start gap-3 relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-emerald-500" />
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <span className="leading-relaxed font-semibold">{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verifying Checkout Flow Overlay */}
        {isVerifying && (
          <div className="w-full max-w-2xl glass-card p-10 mb-8 text-center space-y-6 border border-cyan-500/20 bg-cyan-500/5 backdrop-blur-2xl">
            <RefreshCw className="text-cyan-400 animate-spin mx-auto" size={40} />
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Verifying Receipt Signature</h3>
              <p className="text-zinc-400 text-xs mt-1">Stand by while we confirm the automated payment gateway receipt...</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="w-full max-w-2xl glass-card p-12 text-center">
            <Loader2 className="animate-spin text-cyan-400 mx-auto mb-4" size={32} />
            <p className="text-zinc-400 text-xs uppercase tracking-widest font-mono">Fetching Private Ledger Status...</p>
          </div>
        ) : !user ? (
          /* Authentication Lock UI */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl glass-card p-8 text-center space-y-6 border-t-white/[0.12] border-b-white/[0.04] bg-gradient-to-b from-white/[0.04] to-transparent backdrop-blur-2xl rounded-3xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mx-auto flex items-center justify-center">
              <CreditCard className="text-red-400" size={28} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">AUTHENTICATION REQUIRED</h2>
              <p className="text-zinc-400 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
                You must be logged in to your secure TRACEXDATA account to purchase or access digital assets. Authenticated purchases secure your unique 10-minute license window.
              </p>
            </div>
            <button
              onClick={openLogin}
              className="px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black tracking-wider uppercase text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign In to Continue
            </button>
          </motion.div>
        ) : activePurchase ? (
          /* Active Download Area (10-minute window) */
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl glass-card border-t-white/[0.15] border-x-white/[0.08] border-b-white/[0.04] bg-gradient-to-b from-zinc-950/40 via-white/[0.01] to-transparent p-6 md:p-8 rounded-3xl space-y-8 relative overflow-hidden"
          >
            {/* Top Status Gradient Strip */}
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500" />
            <div className="absolute -inset-4 bg-emerald-500/[0.02] rounded-[40px] blur-3xl -z-10 pointer-events-none" />

            {/* Timer visual header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={20} />
                </div>
                <div className="text-left">
                  <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-400 font-extrabold">LICENSE VERIFIED</span>
                  <h3 className="text-lg font-black text-white leading-tight">ACTIVE DOWNLOAD WINDOW</h3>
                </div>
              </div>
              
              {/* Countdown badge */}
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 px-4 py-2 rounded-2xl">
                <Timer size={16} className="text-red-400 animate-pulse" />
                <span className="font-mono text-sm font-black text-red-400">{formatTime(timeLeft)}</span>
              </div>
            </div>

            {/* Product specifications and file info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 text-left">
                <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono tracking-wider">Product ID / Order Reference</span>
                <p className="text-zinc-200 font-mono text-xs truncate" title={activePurchase.order_id}>{activePurchase.order_id}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 text-left">
                <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono tracking-wider">File Specifications</span>
                <p className="text-zinc-200 text-xs">Python Script • 18.49 KB • Last Updated: Yesterday</p>
              </div>
            </div>

            {/* SECURE DOWNLOAD BUTTON */}
            <div className="text-center py-4 space-y-3">
              <button
                onClick={handleDownloadFile}
                disabled={isDownloading}
                className="w-full md:w-auto px-10 py-4.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:opacity-95 text-zinc-950 font-black tracking-wider uppercase text-xs transition-all flex items-center justify-center gap-2 shadow-[0_15px_30px_rgba(16,185,129,0.2)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                {isDownloading ? (
                  <RefreshCw className="animate-spin text-zinc-950" size={16} />
                ) : (
                  <FileDown size={16} />
                )}
                <span>{isDownloading ? 'FETCHING ENCRYPTED FILE...' : 'DOWNLOAD PYTHON SCRIPT NOW'}</span>
              </button>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                Access will be automatically revoked upon timer expiration. Preserve your files locally.
              </p>
            </div>

            {/* STEP 2: INSTALLATION AND SETUP INSTRUCTIONS */}
            <div className="rounded-2xl border border-white/5 bg-zinc-950/60 p-5 space-y-4 text-left">
              <h4 className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 font-mono flex items-center gap-2">
                <Terminal size={14} /> STEP 2: INSTALLATION &amp; SETUP
              </h4>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Run the following setup command in your terminal (Termux, Linux, or command prompt) to install the necessary modules and dependencies:
              </p>
              <div className="relative group">
                <pre className="p-4 rounded-xl bg-[#030305] border border-white/5 font-mono text-[10px] md:text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap pr-16 select-all">
                  pkg update && pkg upgrade -y && pkg install python python-pip git openssl-tool termux-exec -y && pip install requests urllib3
                </pre>
                <button
                  onClick={copyCommand}
                  className="absolute right-3 top-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/5"
                  title="Copy command"
                >
                  {copiedCommand ? <Check size={14} className="text-emerald-400" /> : <Clipboard size={14} />}
                </button>
              </div>
            </div>

            {/* STEP 3: TUTORIAL VIDEO REFERENCES */}
            <div className="rounded-2xl border border-white/5 bg-zinc-950/60 p-5 space-y-3 text-left">
              <h4 className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 font-mono flex items-center gap-2">
                <PlayCircle size={14} /> STEP 3: TUTORIAL REFERENCES
              </h4>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Watch the detailed setup and terminal integration tutorial video to configure your script commands accurately:
              </p>
              <a 
                href="https://youtu.be/f85X1gvPGmg?si=6gG35k9VR_bAvOgi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:underline text-xs font-semibold"
              >
                <PlayCircle size={14} />
                <span>Watch YouTube Configuration Tutorial</span>
              </a>
            </div>

          </motion.div>
        ) : (
          /* Checkout Purchase State Form */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl glass-card border-t-white/[0.15] border-x-white/[0.08] border-b-white/[0.04] bg-gradient-to-b from-white/[0.04] to-zinc-950/[0.4] backdrop-blur-[24px] shadow-[0_45px_90px_rgba(0,0,0,0.7)] p-6 md:p-10 rounded-3xl flex flex-col relative"
          >
            {/* Outer Glow */}
            <div className="absolute -inset-4 bg-cyan-500/[0.02] rounded-[40px] blur-3xl -z-10 pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-cyan-500/50" />

            {/* Product card presentation in the form */}
            <div className="p-5 md:p-6 mb-8 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="text-left space-y-2">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-cyan-400 animate-pulse" />
                  <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase font-mono">Digital script</span>
                </div>
                <h3 className="text-xl font-extrabold text-white tracking-tight uppercase">Gaurav PVT Python Script</h3>
                <p className="text-zinc-400 text-xs">Coded By Gaurav Beniwal • 100% Working &amp; Last Updated Yesterday</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-mono text-zinc-400">File Size: 18.49KB</span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/10 text-[9px] font-mono text-cyan-400 animate-pulse">Updated Yesterday</span>
                </div>
              </div>

              {/* Price section */}
              <div className="bg-cyan-500/10 border border-cyan-500/25 px-5 py-3.5 rounded-2xl text-center self-stretch md:self-auto flex md:flex-col justify-between md:justify-center items-center gap-1 min-w-[120px]">
                <span className="text-[10px] text-cyan-400 uppercase font-mono tracking-widest font-black">PRICE</span>
                <span className="text-2xl font-black text-white font-mono flex items-center justify-center">
                  <IndianRupee size={18} className="text-cyan-400 shrink-0" />400
                </span>
              </div>
            </div>

            {/* Inputs label */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest text-left font-mono">BILLING INFORMATION</h4>
              
              <form onSubmit={handlePay} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 flex items-center gap-1.5 font-mono">
                    <User size={12} className="text-zinc-500" /> FULL NAME
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="Enter your name"
                    value={payerName}
                    disabled={isProcessing}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.07] border border-white/10 focus:border-[#22d3ee] outline-none transition-all px-5 py-3.5 text-sm text-white rounded-2xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 flex items-center gap-1.5 font-mono">
                    <Mail size={12} className="text-zinc-500" /> EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={payerEmail}
                    disabled={isProcessing}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.07] border border-white/10 focus:border-[#22d3ee] outline-none transition-all px-5 py-3.5 text-sm text-white rounded-2xl"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 flex items-center gap-1.5 font-mono">
                    <Phone size={12} className="text-zinc-500" /> MOBILE NUMBER (FOR TELEGRAM/OTP DELIVERY)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={payerPhone}
                    disabled={isProcessing}
                    onChange={(e) => setPayerPhone(cleanIndianPhoneNumber(e.target.value))}
                    className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.07] border border-white/10 focus:border-[#22d3ee] outline-none transition-all px-5 py-3.5 text-sm font-mono text-white rounded-2xl"
                    required
                  />
                </div>

                {/* SUBMIT TRIGGERS */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="md:col-span-2 w-full h-14 mt-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 hover:opacity-95 text-zinc-950 font-black tracking-widest uppercase text-xs transition-all flex items-center justify-center gap-2 shadow-[0_12px_24px_rgba(6,182,212,0.15)] disabled:opacity-40 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin text-zinc-950" size={18} />
                  ) : (
                    <>
                      <Zap size={14} className="fill-zinc-950" />
                      <span>UNLOCK SCRIPT NOW • PAY ₹400</span>
                      <ChevronRight size={14} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* PURCHASE HISTORY LEDGER SECTION */}
        {user && purchases.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-2xl mt-12 space-y-4 text-left"
          >
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <History size={16} className="text-zinc-500" />
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 font-mono">My Purchase History Ledger</h4>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#030305]/60 overflow-hidden backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className="bg-white/[0.01] border-b border-white/5 text-zinc-500 uppercase tracking-wider text-[10px] font-bold">
                      <th className="px-5 py-3.5">Order Reference</th>
                      <th className="px-5 py-3.5 text-center">Amount</th>
                      <th className="px-5 py-3.5">Purchase Date &amp; Time</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {purchases.map((p) => (
                      <tr key={p.order_id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-5 py-4 font-mono select-all text-zinc-300 text-[11px] truncate max-w-[120px]" title={p.order_id}>
                          {p.order_id}
                        </td>
                        <td className="px-5 py-4 text-center text-zinc-200">
                          ₹{p.amount}
                        </td>
                        <td className="px-5 py-4 text-zinc-400">
                          {new Date(p.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) + ' (IST)'}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {p.status === 'active' ? (
                            <button
                              onClick={fetchStatus}
                              className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[9px] uppercase tracking-wider animate-pulse"
                            >
                              Active
                            </button>
                          ) : p.status === 'expired' ? (
                            <span className="px-2 py-1 rounded bg-zinc-500/10 border border-zinc-500/10 text-zinc-500 text-[9px] uppercase tracking-wider">
                              Expired
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] uppercase tracking-wider">
                              {p.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

      </div>

      {/* Footer */}
      <footer className="w-full py-6 text-center select-none pointer-events-none relative z-10 border-t border-white/5 bg-black/20">
        <span className="text-zinc-600 text-[9px] uppercase tracking-[0.25em] font-extrabold font-mono">
          TRACEXDATA Security Systems • License Decryption Node
        </span>
      </footer>
    </div>
  );
}
