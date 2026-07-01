import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Loader2, Sparkles, AlertCircle, FileSearch, Check, Shield, Search, Send, CreditCard, Clipboard } from 'lucide-react';
import LiquidBackground from '../components/LiquidBackground';

export default function PanFind() {
  const [searchParams, setSearchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const queryAadhaar = searchParams.get('aadhaar_number');
  const renderBackendUrl = "https://tracexdata-api.onrender.com";

  // Input States
  const [aadhaarNumber, setAadhaarNumber] = useState(queryAadhaar || '');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhone, setPayerPhone] = useState('');

  // Workflow States
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Verification & API result states
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [results, setResults] = useState<any>(null);

  // Auto-trigger verification if returned from gateway
  useEffect(() => {
    if (orderId && queryAadhaar) {
      verifyAndFetch(orderId, queryAadhaar);
    }
  }, [orderId, queryAadhaar]);

  const verifyAndFetch = async (oid: string, aadhaar: string) => {
    setVerificationStatus('loading');
    setErrorMsg(null);
    try {
      // Fetch status & results in a single secure server-side call
      const response = await fetch(`${renderBackendUrl}/api/panfind?order_id=${encodeURIComponent(oid)}&aadhaar_number=${encodeURIComponent(aadhaar)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to verify payment or retrieve record.`);
      }

      const data = await response.json();
      setResults(data);
      setVerificationStatus('success');
    } catch (err: any) {
      console.error('PAN Find retrieval error:', err);
      setVerificationStatus('failed');
      setErrorMsg(err.message || 'Payment verification failed or gateway timeout. Please refresh.');
    }
  };

  const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    // Validate 12-digit numeric Aadhaar
    const cleanAadhaar = aadhaarNumber.replace(/\s/g, '');
    if (!/^\d{12}$/.test(cleanAadhaar)) {
      setErrorMsg('Please enter a valid 12-digit Indian Aadhaar number.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const payload = {
        user_id: `guest_${Date.now()}`,
        user_email: payerEmail || 'guest_panfind@tracexdata.com',
        plan_id: 'panfind',
        amount: 150,
        customer_phone: payerPhone || '9999999999',
        customer_name: payerName || 'PanFind Guest',
        return_url: `${window.location.origin}/panfind?order_id={order_id}&aadhaar_number=${cleanAadhaar}`
      };

      const response = await fetch(`${renderBackendUrl}/api/cashfree/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error ${response.status}`);
      }

      const orderData = await response.json();
      if (orderData.error) {
        throw new Error(orderData.error);
      }

      if (!orderData.payment_session_id) {
        throw new Error('Could not initiate secure checkout session. Please try again.');
      }

      // Initialize Cashfree
      const cashfreeMode = orderData.cf_mode || "production";
      const cashfree = (window as any).Cashfree({
        mode: cashfreeMode
      });

      await cashfree.checkout({
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: "_self"
      });

    } catch (err: any) {
      console.error('Payment Error:', err);
      setErrorMsg(err.message || 'Failed to initialize payment gateway.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSearchParams({});
    setVerificationStatus('idle');
    setResults(null);
    setAadhaarNumber('');
    setPayerName('');
    setPayerEmail('');
    setPayerPhone('');
    setErrorMsg(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="relative min-h-screen bg-[#020204] text-zinc-100 selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden flex flex-col justify-between font-sans">
      <LiquidBackground />

      {/* Decorative Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-20">
        <div className="absolute top-[20%] right-[10%] w-80 h-80 rounded-full bg-gradient-to-br from-cyan-500/5 to-transparent blur-[100px]" />
        <div className="absolute bottom-[25%] left-[15%] w-96 h-96 rounded-full bg-gradient-to-tr from-purple-500/5 to-transparent blur-[120px]" />
      </div>

      {/* Secure Header */}
      <nav className="fixed top-0 left-0 right-0 p-4 md:p-6 z-[60] flex items-center justify-between pointer-events-none">
        <Link 
          to="/"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-xl pointer-events-auto transition-all hover:bg-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]"
        >
          <ArrowLeft size={14} className="text-zinc-400" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-100">TRACEXDATA</span>
        </Link>

        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-xl pointer-events-auto shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <Shield size={12} className="text-emerald-400" />
          <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest font-mono">
            SECURE CHECKOUT
          </span>
        </div>
      </nav>

      {/* Main Container */}
      <div className="relative z-10 flex-grow flex items-center justify-center px-4 py-24 md:py-32">
        <div className="w-full max-w-xl">
          
          <AnimatePresence mode="wait">
            
            {/* IDLE state - Show Search / Payment Form */}
            {verificationStatus === 'idle' && (
              <motion.div
                key="idle-form"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="glass-card p-6 md:p-8 relative overflow-hidden"
              >
                {/* Glowing neon accent header */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500" />

                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <FileSearch size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold tracking-tight text-white uppercase italic">
                      Aadhaar To PAN Search
                    </h1>
                    <p className="text-xs text-zinc-400">
                      Instantly query secure linking details for Rs. 150
                    </p>
                  </div>
                </div>

                <form onSubmit={handleProceed} className="space-y-5">
                  
                  {/* Target Aadhaar input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Target Aadhaar Number (12 Digits)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={12}
                        required
                        placeholder="e.g. 511422100978"
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono tracking-widest text-white focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                      <Search className="absolute right-4 top-3.5 text-zinc-600" size={16} />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center my-6">
                    <div className="flex-grow border-t border-white/5" />
                    <span className="text-[9px] font-bold tracking-[0.2em] text-zinc-600 px-3 uppercase">Payer Contact details</span>
                    <div className="flex-grow border-t border-white/5" />
                  </div>

                  {/* Guest Contact Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                        Full Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        className="w-full bg-zinc-950/40 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                        Phone (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        placeholder="9999999999"
                        value={payerPhone}
                        onChange={(e) => setPayerPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-zinc-950/40 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      className="w-full bg-zinc-950/40 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                  </div>

                  {/* Pricing Overview and CTA */}
                  <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-between mt-6">
                    <div className="flex items-center gap-2">
                      <CreditCard className="text-cyan-400" size={16} />
                      <span className="text-xs font-semibold text-zinc-300">Transaction Value</span>
                    </div>
                    <span className="text-base font-extrabold text-white font-mono">
                      ₹ 150.00
                    </span>
                  </div>

                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/20 text-xs text-red-400 flex items-start gap-2"
                    >
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full relative overflow-hidden group py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold text-xs uppercase tracking-widest hover:from-cyan-400 hover:to-purple-500 transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        <span>Initiating Secure Gateway...</span>
                      </>
                    ) : (
                      <>
                        <Send size={12} />
                        <span>Proceed to Pay ₹150</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* LOADING state - Verifying payment / Querying api */}
            {verificationStatus === 'loading' && (
              <motion.div
                key="loading-gate"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-10 text-center flex flex-col items-center justify-center gap-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-xl animate-pulse" />
                  <div className="relative p-5 rounded-full bg-zinc-950 border border-cyan-500/30 text-cyan-400">
                    <Loader2 className="animate-spin" size={42} />
                  </div>
                </div>

                <div className="space-y-2 max-w-sm">
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    Verifying Payment Ledger
                  </h2>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Analyzing transaction logs and querying secure government links. Please keep this screen open.
                  </p>
                </div>
              </motion.div>
            )}

            {/* SUCCESS state - Showing API Results directly to user */}
            {verificationStatus === 'success' && results && (
              <motion.div
                key="success-results"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-card p-6 md:p-8 relative overflow-hidden space-y-6"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500" />

                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white uppercase tracking-wide text-sm">
                        Verified PAN Records
                      </h3>
                      <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                        STATUS: SUCCESSFUL LOOKUP
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-[10px] uppercase tracking-wider font-bold text-zinc-300"
                  >
                    New Search
                  </button>
                </div>

                {/* API Response Display fields */}
                <div className="space-y-3 font-mono">
                  
                  {/* Status row */}
                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-900 flex flex-col gap-1">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Aadhaar Target</span>
                    <span className="text-xs text-zinc-200">{results.aadhaar_number || queryAadhaar || "N/A"}</span>
                  </div>

                  {results.full_pan_number && (
                    <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">Allocated PAN Number</span>
                        <span className="text-base font-extrabold text-white tracking-widest">{results.full_pan_number}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(results.full_pan_number)}
                        className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-cyan-500/30 text-zinc-400 hover:text-cyan-400 transition-all flex items-center justify-center group"
                        title="Copy PAN"
                      >
                        <Clipboard size={14} className="group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  )}

                  {results.aadhaar_status && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-900 flex flex-col gap-0.5">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Linking Status</span>
                        <span className="text-xs text-zinc-200 capitalize">{results.aadhaar_status}</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-900 flex flex-col gap-0.5">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Search Code</span>
                        <span className="text-xs text-zinc-200">{results.response_code || 200}</span>
                      </div>
                    </div>
                  )}

                  {results.message && (
                    <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-900 flex flex-col gap-0.5">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Server Message</span>
                      <span className="text-xs text-zinc-300">{results.message}</span>
                    </div>
                  )}

                  {results.aadhaar_to_panfind_status && (
                    <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-900 flex flex-col gap-0.5">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Search State</span>
                      <span className="text-xs text-zinc-200">{results.aadhaar_to_panfind_status}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 text-center text-[10px] text-zinc-500 font-mono">
                  Security Seal: Data decrypted securely and never retained on disk.
                </div>
              </motion.div>
            )}

            {/* FAILED state */}
            {verificationStatus === 'failed' && (
              <motion.div
                key="failed-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-8 text-center space-y-6"
              >
                <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 w-fit mx-auto">
                  <AlertCircle size={36} />
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-white uppercase tracking-wider text-sm">
                    Query Blocked
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {errorMsg || 'We were unable to verify your Cashfree payment or the search gateway is busy. Please try again.'}
                  </p>
                </div>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors text-xs font-semibold text-zinc-300"
                  >
                    Try Again
                  </button>
                  <Link
                    to="/"
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Go Back
                  </Link>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </div>

      {/* Footer Details */}
      <footer className="p-6 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 border-t border-white/5 relative z-10">
        TRACEXDATA Security Engine — Managed by Gaurav Beniwal
      </footer>
    </div>
  );
}
