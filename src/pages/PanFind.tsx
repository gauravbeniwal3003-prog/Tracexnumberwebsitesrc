import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Loader2, Sparkles, AlertCircle, FileSearch, Check, Shield, Search, Send, CreditCard, Clipboard } from 'lucide-react';
import LiquidBackground from '../components/LiquidBackground';
import FormattedResponseCard from '../components/FormattedResponseCard';
import { safeFetchJson, getApiBaseUrl } from '../services/api.ts';

export default function PanFind() {
  const [searchParams, setSearchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const queryAadhaar = searchParams.get('aadhaar_number');
  const renderBackendUrl = getApiBaseUrl();

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
        const errorData = await safeFetchJson(response).catch(() => ({}));
        throw new Error(errorData.error || `Failed to verify payment or retrieve record.`);
      }

      const data = await safeFetchJson(response);
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
        const errorData = await safeFetchJson(response).catch(() => ({}));
        throw new Error(errorData.error || `Server Error ${response.status}`);
      }

      const orderData = await safeFetchJson(response);
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
    <div className="relative min-h-screen bg-white text-slate-800 selection:bg-sky-500/20 selection:text-sky-900 overflow-x-hidden flex flex-col justify-between font-sans">
      <LiquidBackground />

      {/* Secure Header */}
      <nav className="fixed top-0 left-0 right-0 p-4 md:p-6 z-[60] flex items-center justify-between pointer-events-none">
        <Link 
          to="/"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-sky-200 backdrop-blur-xl pointer-events-auto transition-all hover:bg-sky-50 shadow-sm"
        >
          <ArrowLeft size={14} className="text-slate-600" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">TRACEXDATA</span>
        </Link>

        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 backdrop-blur-xl pointer-events-auto shadow-sm">
          <Shield size={12} className="text-emerald-600" />
          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest font-mono">
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
                className="glass-card p-6 md:p-8 relative overflow-hidden rounded-[32px] border border-sky-200 bg-white shadow-sm"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-sky-100 border border-sky-200 text-sky-600">
                    <FileSearch size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase italic">
                      Aadhaar To PAN Search
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">
                      Instantly query secure linking details for Rs. 150
                    </p>
                  </div>
                </div>

                <form onSubmit={handleProceed} className="space-y-5">
                  
                  {/* Target Aadhaar input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
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
                        className="w-full bg-slate-50 border border-sky-200 rounded-xl px-4 py-3 text-sm font-mono tracking-widest text-slate-900 focus:outline-none focus:border-sky-500 transition-colors shadow-inner font-semibold"
                      />
                      <Search className="absolute right-4 top-3.5 text-slate-400" size={16} />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center my-6">
                    <div className="flex-grow border-t border-sky-100" />
                    <span className="text-[9px] font-black tracking-[0.2em] text-slate-500 px-3 uppercase">Payer Contact details</span>
                    <div className="flex-grow border-t border-sky-100" />
                  </div>

                  {/* Guest Contact Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                        Full Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        className="w-full bg-slate-50 border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition-colors font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                        Phone (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        placeholder="9999999999"
                        value={payerPhone}
                        onChange={(e) => setPayerPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-50 border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition-colors font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition-colors font-medium"
                    />
                  </div>

                  {/* Pricing Overview and CTA */}
                  <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between mt-6">
                    <div className="flex items-center gap-2">
                      <CreditCard className="text-sky-600" size={16} />
                      <span className="text-xs font-bold text-slate-700">Transaction Value</span>
                    </div>
                    <span className="text-base font-black text-slate-900 font-mono">
                      ₹ 150.00
                    </span>
                  </div>

                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 font-semibold"
                    >
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold text-xs uppercase tracking-widest transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
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
                className="glass-card p-10 text-center flex flex-col items-center justify-center gap-6 rounded-[32px] border border-sky-200 bg-white shadow-sm"
              >
                <div className="relative">
                  <div className="relative p-5 rounded-full bg-sky-50 border border-sky-200 text-sky-600">
                    <Loader2 className="animate-spin" size={42} />
                  </div>
                </div>

                <div className="space-y-2 max-w-sm">
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                    Verifying Payment Ledger
                  </h2>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
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
                className="space-y-4"
              >
                <div className="flex items-center justify-between px-2">
                  <button
                    onClick={handleReset}
                    className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-colors text-xs font-black text-slate-800 cursor-pointer shadow-2xs"
                  >
                    ← New Search
                  </button>
                </div>
                <FormattedResponseCard data={results} serviceType="aadhaar_to_pan" />
              </motion.div>
            )}

            {/* FAILED state */}
            {verificationStatus === 'failed' && (
              <motion.div
                key="failed-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-8 text-center space-y-6 rounded-[32px] border border-sky-200 bg-white shadow-sm"
              >
                <div className="p-4 rounded-full bg-rose-50 border border-rose-200 text-rose-600 w-fit mx-auto">
                  <AlertCircle size={36} />
                </div>

                <div className="space-y-2">
                  <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm">
                    Query Blocked
                  </h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {errorMsg || 'We were unable to verify your Cashfree payment or the search gateway is busy. Please try again.'}
                  </p>
                </div>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors text-xs font-black text-slate-800 cursor-pointer"
                  >
                    Try Again
                  </button>
                  <Link
                    to="/"
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-bold text-slate-700"
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
      <footer className="p-6 text-center text-xs font-semibold text-slate-500 bg-sky-50/50 border-t border-sky-100 relative z-10">
        © {new Date().getFullYear()} TRACEXDATA. All rights reserved.
      </footer>
    </div>
  );
}
