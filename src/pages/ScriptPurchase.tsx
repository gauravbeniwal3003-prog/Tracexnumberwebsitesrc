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
    <div className="min-h-screen bg-slate-50/50 text-slate-800 selection:bg-sky-500/20 selection:text-sky-900 overflow-x-hidden flex flex-col justify-between relative font-sans">
      <LiquidBackground />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 p-4 md:p-6 z-[60] flex items-center justify-between">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-sky-200 backdrop-blur-xl transition-all hover:bg-sky-50 shadow-sm cursor-pointer"
        >
          <ArrowLeft size={14} className="text-sky-600" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">Back to Lookup</span>
        </button>

        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 backdrop-blur-xl shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <ShieldCheck size={12} className="text-emerald-600" /> SECURE DECRYPTION
          </span>
        </div>
      </nav>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-24 pb-16 px-4 max-w-4xl mx-auto w-full">
        
        {/* Banner Headers */}
        <header className="text-center max-w-lg mx-auto mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 backdrop-blur-md"
          >
            <Zap size={12} className="text-sky-600 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-sky-800 font-mono">Premium Digital Assets</span>
          </motion.div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-2 uppercase italic">
            Script Center
          </h1>
          <p className="text-slate-600 text-xs md:text-sm font-medium">
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
              className="w-full max-w-2xl p-4 mb-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs md:text-sm flex items-start gap-3 relative overflow-hidden font-semibold shadow-sm"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed font-semibold">{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-2xl p-4 mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs md:text-sm flex items-start gap-3 relative overflow-hidden font-semibold shadow-sm"
            >
              <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed font-semibold">{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verifying Checkout Flow Overlay */}
        {isVerifying && (
          <div className="w-full max-w-2xl glass-card p-10 mb-8 text-center space-y-6 border border-sky-200 bg-white rounded-[32px] shadow-sm">
            <RefreshCw className="text-sky-600 animate-spin mx-auto" size={40} />
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">Verifying Receipt Signature</h3>
              <p className="text-slate-600 text-xs mt-1 font-medium">Stand by while we confirm the automated payment gateway receipt...</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="w-full max-w-2xl glass-card p-12 text-center rounded-[32px] border border-sky-200 bg-white shadow-sm">
            <Loader2 className="animate-spin text-sky-600 mx-auto mb-4" size={32} />
            <p className="text-slate-600 text-xs uppercase tracking-widest font-black">Fetching Private Ledger Status...</p>
          </div>
        ) : !user ? (
          /* Authentication Lock UI */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl glass-card p-8 text-center space-y-6 border border-sky-200 bg-white rounded-[32px] shadow-sm"
          >
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 mx-auto flex items-center justify-center">
              <CreditCard className="text-rose-600" size={28} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">AUTHENTICATION REQUIRED</h2>
              <p className="text-slate-600 text-xs md:text-sm max-w-md mx-auto leading-relaxed font-medium">
                You must be logged in to your secure TRACEXDATA account to purchase or access digital assets. Authenticated purchases secure your unique 10-minute license window.
              </p>
            </div>
            <button
              onClick={openLogin}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black tracking-wider uppercase text-xs transition-all shadow-md cursor-pointer"
            >
              Sign In to Continue
            </button>
          </motion.div>
        ) : activePurchase ? (
          /* Active Download Area (10-minute window) */
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl glass-card border border-sky-200 bg-white p-6 md:p-8 rounded-[32px] space-y-8 relative overflow-hidden shadow-sm"
          >
            {/* Timer visual header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-sky-100 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 size={20} />
                </div>
                <div className="text-left">
                  <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-800 font-black">LICENSE VERIFIED</span>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">ACTIVE DOWNLOAD WINDOW</h3>
                </div>
              </div>
              
              {/* Countdown badge */}
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-4 py-2 rounded-2xl">
                <Timer size={16} className="text-rose-600 animate-pulse" />
                <span className="font-mono text-sm font-black text-rose-700">{formatTime(timeLeft)}</span>
              </div>
            </div>

            {/* Product specifications and file info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-sky-100 space-y-1 text-left">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Product ID / Order Reference</span>
                <p className="text-slate-900 font-mono text-xs truncate font-bold" title={activePurchase.order_id}>{activePurchase.order_id}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-sky-100 space-y-1 text-left">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">File Specifications</span>
                <p className="text-slate-800 text-xs font-semibold">Python Script • 18.49 KB • Last Updated: Yesterday</p>
              </div>
            </div>

            {/* SECURE DOWNLOAD BUTTON */}
            <div className="text-center py-4 space-y-3">
              <button
                onClick={handleDownloadFile}
                disabled={isDownloading}
                className="w-full md:w-auto px-10 py-4.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black tracking-wider uppercase text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {isDownloading ? (
                  <RefreshCw className="animate-spin text-white" size={16} />
                ) : (
                  <FileDown size={16} />
                )}
                <span>{isDownloading ? 'FETCHING ENCRYPTED FILE...' : 'DOWNLOAD PYTHON SCRIPT NOW'}</span>
              </button>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                Access will be automatically revoked upon timer expiration. Preserve your files locally.
              </p>
            </div>

            {/* STEP 2: INSTALLATION AND SETUP INSTRUCTIONS */}
            <div className="rounded-2xl border border-sky-200 bg-slate-50 p-5 space-y-4 text-left">
              <h4 className="text-xs uppercase font-black tracking-widest text-sky-700 font-mono flex items-center gap-2">
                <Terminal size={14} /> STEP 2: INSTALLATION &amp; SETUP
              </h4>
              <p className="text-slate-600 text-xs leading-relaxed font-medium">
                Run the following setup command in your terminal (Termux, Linux, or command prompt) to install the necessary modules and dependencies:
              </p>
              <div className="relative group">
                <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[10px] md:text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap pr-16 select-all">
                  pkg update && pkg upgrade -y && pkg install python python-pip git openssl-tool termux-exec -y && pip install requests urllib3
                </pre>
                <button
                  onClick={copyCommand}
                  className="absolute right-3 top-3 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
                  title="Copy command"
                >
                  {copiedCommand ? <Check size={14} className="text-emerald-400" /> : <Clipboard size={14} />}
                </button>
              </div>
            </div>

            {/* STEP 3: TUTORIAL VIDEO REFERENCES */}
            <div className="rounded-2xl border border-sky-200 bg-slate-50 p-5 space-y-3 text-left">
              <h4 className="text-xs uppercase font-black tracking-widest text-sky-700 font-mono flex items-center gap-2">
                <PlayCircle size={14} /> STEP 3: TUTORIAL REFERENCES
              </h4>
              <p className="text-slate-600 text-xs leading-relaxed font-medium">
                Watch the detailed setup and terminal integration tutorial video to configure your script commands accurately:
              </p>
              <a 
                href="https://youtu.be/f85X1gvPGmg?si=6gG35k9VR_bAvOgi" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sky-700 hover:text-sky-900 hover:underline text-xs font-bold"
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
            className="w-full max-w-2xl glass-card border border-sky-200 bg-white shadow-sm p-6 md:p-10 rounded-[32px] flex flex-col relative"
          >
            {/* Product card presentation in the form */}
            <div className="p-5 md:p-6 mb-8 rounded-2xl bg-slate-50 border border-sky-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="text-left space-y-2">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-sky-600 animate-pulse" />
                  <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Digital script</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Gaurav PVT Python Script</h3>
                <p className="text-slate-600 text-xs font-medium">Coded By Gaurav Beniwal • 100% Working &amp; Last Updated Yesterday</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-sky-200 text-[9px] font-extrabold text-slate-700">File Size: 18.49KB</span>
                  <span className="px-2 py-0.5 rounded-md bg-sky-100 border border-sky-200 text-[9px] font-black text-sky-800 animate-pulse">Updated Yesterday</span>
                </div>
              </div>

              {/* Price section */}
              <div className="bg-sky-100 border border-sky-200 px-5 py-3.5 rounded-2xl text-center self-stretch md:self-auto flex md:flex-col justify-between md:justify-center items-center gap-1 min-w-[120px]">
                <span className="text-[10px] text-sky-800 uppercase font-black tracking-widest">PRICE</span>
                <span className="text-2xl font-black text-slate-900 font-mono flex items-center justify-center">
                  <IndianRupee size={18} className="text-sky-600 shrink-0" />400
                </span>
              </div>
            </div>

            {/* Inputs label */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest text-left">BILLING INFORMATION</h4>
              
              <form onSubmit={handlePay} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                    <User size={12} className="text-slate-500" /> FULL NAME
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="Enter your name"
                    value={payerName}
                    disabled={isProcessing}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full bg-slate-50 border border-sky-200 focus:border-sky-500 outline-none transition-all px-5 py-3.5 text-sm text-slate-900 rounded-2xl font-medium"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                    <Mail size={12} className="text-slate-500" /> EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={payerEmail}
                    disabled={isProcessing}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-sky-200 focus:border-sky-500 outline-none transition-all px-5 py-3.5 text-sm text-slate-900 rounded-2xl font-medium"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] uppercase tracking-wider font-black text-slate-700 flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-500" /> MOBILE NUMBER (FOR TELEGRAM/OTP DELIVERY)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={payerPhone}
                    disabled={isProcessing}
                    onChange={(e) => setPayerPhone(cleanIndianPhoneNumber(e.target.value))}
                    className="w-full bg-slate-50 border border-sky-200 focus:border-sky-500 outline-none transition-all px-5 py-3.5 text-sm font-mono text-slate-900 rounded-2xl font-semibold"
                    required
                  />
                </div>

                {/* SUBMIT TRIGGERS */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="md:col-span-2 w-full h-14 mt-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-black tracking-widest uppercase text-xs transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-40 cursor-pointer"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin text-white" size={18} />
                  ) : (
                    <>
                      <Zap size={14} className="fill-white" />
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
            <div className="flex items-center gap-2 border-b border-sky-100 pb-3">
              <History size={16} className="text-slate-500" />
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 font-mono">My Purchase History Ledger</h4>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-sky-100 text-slate-600 uppercase tracking-wider text-[10px] font-black">
                      <th className="px-5 py-3.5">Order Reference</th>
                      <th className="px-5 py-3.5 text-center">Amount</th>
                      <th className="px-5 py-3.5">Purchase Date &amp; Time</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100">
                    {purchases.map((p) => (
                      <tr key={p.order_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 font-mono select-all text-slate-800 text-[11px] truncate max-w-[120px] font-semibold" title={p.order_id}>
                          {p.order_id}
                        </td>
                        <td className="px-5 py-4 text-center text-slate-900 font-bold">
                          ₹{p.amount}
                        </td>
                        <td className="px-5 py-4 text-slate-600 font-medium">
                          {new Date(p.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) + ' (IST)'}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {p.status === 'active' ? (
                            <button
                              onClick={fetchStatus}
                              className="px-2 py-1 rounded bg-emerald-100 border border-emerald-200 text-emerald-800 font-black text-[9px] uppercase tracking-wider animate-pulse cursor-pointer"
                            >
                              Active
                            </button>
                          ) : p.status === 'expired' ? (
                            <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-bold uppercase tracking-wider">
                              Expired
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-amber-100 border border-amber-200 text-amber-800 text-[9px] font-bold uppercase tracking-wider">
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
      <footer className="w-full py-6 text-center select-none pointer-events-none relative z-10 border-t border-sky-100 bg-sky-50/50">
        <span className="text-slate-500 text-[9px] uppercase tracking-[0.25em] font-black font-mono">
          TRACEXDATA Security Systems • License Decryption Node
        </span>
      </footer>
    </div>
  );
}
