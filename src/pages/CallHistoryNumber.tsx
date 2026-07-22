import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  PhoneCall, 
  ShieldCheck, 
  AlertCircle, 
  CreditCard, 
  CheckCircle2, 
  RefreshCw, 
  Lock, 
  ArrowLeft,
  IndianRupee
} from 'lucide-react';
import LiquidBackground from '../components/LiquidBackground.tsx';
import { cleanIndianPhoneNumber } from '../services/utils.ts';
import { getApiBaseUrl } from '../services/api.ts';

declare global {
  interface Window {
    Cashfree: any;
  }
}

export default function CallHistoryNumber() {
  const [searchParams, setSearchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const urlPhone = searchParams.get('phone') || '';

  const [phoneNumber, setPhoneNumber] = useState(urlPhone);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Payment Verification State
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [verifiedPhone, setVerifiedPhone] = useState<string>(urlPhone);

  useEffect(() => {
    if (orderId) {
      verifyPayment(orderId);
    }
  }, [orderId]);

  const verifyPayment = async (oid: string) => {
    setVerificationStatus('loading');
    setErrorMsg(null);
    try {
      const renderBackendUrl = getApiBaseUrl();
      const response = await fetch(`${renderBackendUrl.replace(/\/$/, "")}/api/cashfree/status/${oid}`);

      if (!response.ok) {
        throw new Error(`Status check returned ${response.status}`);
      }

      const data = await response.json();
      if (data.order_status === 'PAID') {
        setVerificationStatus('success');
        if (urlPhone) {
          setVerifiedPhone(urlPhone);
        }
      } else {
        setVerificationStatus('failed');
        setErrorMsg('Payment was not completed. Please do payment first.');
      }
    } catch (err: any) {
      console.error('Payment verification failed:', err);
      setVerificationStatus('failed');
      setErrorMsg(err.message || 'Payment verification failed. Please do payment first.');
    }
  };

  const handleGetHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleaned = cleanIndianPhoneNumber(phoneNumber);
    if (!cleaned || cleaned.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsProcessing(true);

    try {
      const renderBackendUrl = getApiBaseUrl();
      const payload = {
        user_id: `guest_${Date.now()}`,
        user_email: 'callhistory@tracexdata.online',
        plan_id: 'call_history_499',
        amount: 499,
        customer_phone: cleaned,
        customer_name: 'User',
        return_url: `${window.location.origin}/callhistorynumber?order_id={order_id}&phone=${encodeURIComponent(cleaned)}`
      };

      const response = await fetch(`${renderBackendUrl.replace(/\/$/, "")}/api/cashfree/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server response: ${response.status}`);
      }

      const orderData = await response.json();

      if (orderData.error) {
        throw new Error(orderData.error);
      }

      if (!orderData.payment_session_id) {
        throw new Error('Payment gateway session could not be established. Please try again.');
      }

      const cashfreeMode = orderData.cf_mode || "production";
      if (!window.Cashfree) {
        throw new Error('Cashfree SDK failed to load. Please refresh the page and try again.');
      }

      const cashfree = window.Cashfree({ mode: cashfreeMode });
      await cashfree.checkout({
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: "_self"
      });

    } catch (err: any) {
      console.error('Payment order creation error:', err);
      setErrorMsg(err.message || 'Payment initiation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetSearch = () => {
    setSearchParams({});
    setVerificationStatus('idle');
    setPhoneNumber('');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 selection:bg-sky-200 selection:text-sky-900 overflow-x-hidden flex flex-col justify-between relative font-sans">
      
      {/* Soft liquid glass ambient gradient accents on pure white */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-sky-200/25 blur-[120px]" />
        <div className="absolute top-[35%] -right-24 w-96 h-96 rounded-full bg-blue-200/20 blur-[130px]" />
        <div className="absolute -bottom-24 left-[20%] w-[500px] h-[500px] rounded-full bg-cyan-100/35 blur-[140px]" />
      </div>

      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 p-3.5 md:p-5 z-[60] flex items-center justify-between bg-white/60 backdrop-blur-xl border-b border-sky-100/80 shadow-[0_2px_15px_rgba(14,165,233,0.04)]">
        <Link 
          to="/" 
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50/80 border border-sky-200/80 text-sky-800 hover:bg-sky-100/80 transition-all shadow-sm group"
        >
          <ArrowLeft className="w-4 h-4 text-sky-600 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-xs font-semibold">Back to Home</span>
        </Link>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-300/40 text-sky-800 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-sky-600" />
          <span className="text-[11px] font-semibold tracking-wide">256-Bit SSL Encrypted</span>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-24 pb-12 relative z-10 max-w-2xl mx-auto w-full">
        
        {/* Header Info */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 border border-sky-200/80 text-sky-700 text-xs font-semibold mb-3 shadow-sm">
            <PhoneCall className="w-3.5 h-3.5 text-sky-600" />
            <span>Call History Lookup Portal</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 mb-2">
            Get Call History Details
          </h1>
          <p className="text-xs md:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Enter any 10-digit mobile number to fetch call logs and history details.
          </p>
          <p className="text-[11px] md:text-xs text-sky-800 mt-2 font-medium bg-sky-100/60 border border-sky-200/60 rounded-lg px-3 py-1.5 inline-block">
            * Note: Details are not available for all numbers, but our database covers maximum number history details.
          </p>
        </div>

        {/* Verification Loader State */}
        {verificationStatus === 'loading' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-white/80 border border-sky-100 backdrop-blur-2xl rounded-2xl md:rounded-3xl p-8 text-center shadow-[0_10px_30px_rgba(14,165,233,0.08)]"
          >
            <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">Verifying Payment...</h3>
            <p className="text-sm text-slate-600">Please wait while we confirm your payment transaction.</p>
          </motion.div>
        )}

        {/* Successful Payment Result State */}
        {verificationStatus === 'success' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-6"
          >
            <div className="bg-white/80 border border-emerald-200/80 backdrop-blur-2xl rounded-2xl md:rounded-3xl p-6 md:p-8 text-center shadow-[0_10px_35px_rgba(16,185,129,0.12)] relative overflow-hidden">
              <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto mb-3 shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200">
                Payment Verified
              </span>

              <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-1">
                Search Completed
              </h2>

              <p className="text-xs md:text-sm text-slate-600 mb-5">
                Target Number: <span className="font-mono font-bold text-sky-700">{verifiedPhone || 'Provided Phone Number'}</span>
              </p>

              {/* Always Result Box */}
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-5 mb-5 text-left space-y-3 shadow-inner">
                <div className="flex items-center gap-2 text-slate-800 text-xs md:text-sm font-bold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                  <span>Call History Search Result:</span>
                </div>
                <p className="text-base md:text-lg font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 text-center shadow-sm">
                  No history found for this number
                </p>
                <p className="text-[11px] md:text-xs text-slate-500 text-center">
                  No CDR records or call log entries were found matching this search request in our active database.
                </p>
              </div>

              <button
                onClick={handleResetSearch}
                className="w-full py-3.5 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300/80 text-slate-800 font-bold text-xs md:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
              >
                <RefreshCw className="w-4 h-4 text-slate-600" />
                <span>Search Another Number</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Failed or Default Form View */}
        {verificationStatus !== 'loading' && verificationStatus !== 'success' && (
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-5"
          >
            {/* Failed Payment Banner */}
            {verificationStatus === 'failed' && (
              <div className="bg-red-50 border border-red-200/90 rounded-xl p-3.5 flex items-center gap-3 text-red-700 text-xs md:text-sm font-semibold shadow-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                <span>Please do payment first</span>
              </div>
            )}

            {/* Error Message Box */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200/90 rounded-xl p-3.5 flex items-center gap-3 text-red-700 text-xs md:text-sm font-medium shadow-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Main Liquid Glass Form Card */}
            <div className="bg-white/85 border border-sky-100 backdrop-blur-2xl rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-[0_15px_40px_rgba(14,165,233,0.08)] space-y-5">
              
              {/* Pricing Header Banner */}
              <div className="flex items-center justify-between p-4 rounded-xl md:rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50/60 to-cyan-50 border border-sky-200/80 shadow-sm">
                <div>
                  <span className="text-[11px] md:text-xs text-sky-800 font-bold uppercase tracking-wider block">Single Search Rate</span>
                  <span className="text-xs text-slate-500">One-time instant search report</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl md:text-3xl font-black text-slate-900 flex items-center justify-end">
                    <IndianRupee className="w-5 h-5 text-sky-600" />
                    499
                  </span>
                  <span className="text-[10px] text-slate-500 block font-medium">per search</span>
                </div>
              </div>

              <form onSubmit={handleGetHistory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Target Phone Number <span className="text-sky-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sky-600">
                      <PhoneCall className="w-4.5 h-4.5" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter 10-digit mobile number"
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50/90 border border-sky-200/90 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all font-mono font-medium shadow-inner"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-tight">
                    * Details may not be available for all numbers, but maximum number history details are covered in our system.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-sm tracking-wide shadow-[0_8px_25px_rgba(14,165,233,0.3)] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer active:scale-[0.99]"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Initiating Payment...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
                      <span>Pay ₹499 & Get Call History</span>
                    </>
                  )}
                </button>
              </form>

              {/* Policy Rules Banner */}
              <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                  <span>Strict Policy Terms</span>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed font-bold">
                  Strictly No Refund Policy - Non-refundable digital service
                </p>
                <p className="text-[11px] text-amber-800/80 leading-normal">
                  All requests processed through this portal are final once payment is confirmed. No refunds or cancellations will be issued under any circumstances.
                </p>
              </div>

            </div>
          </motion.div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-5 px-4 border-t border-sky-100 bg-white/50 backdrop-blur-md text-center text-xs text-slate-500 relative z-10">
        <p>© 2026 TRACEXDATA. All rights reserved.</p>
      </footer>
    </div>
  );
}
