import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Search, Phone, ChevronDown, User, Lock, ArrowUpRight, ArrowDownLeft, PhoneOff, Sparkles, RefreshCw, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getApiBaseUrl } from '../services/api.ts';

declare global {
  interface Window {
    Cashfree: any;
  }
}

interface CallItem {
  id: number;
  nameOrNumber: string;
  avatarBg: string;
  avatarText: string;
  type: 'Outgoing' | 'Incoming' | 'Missed';
  duration: string;
  date: string;
  time: string;
  location: string;
}

const CALL_HISTORY_DATA: CallItem[] = [
  { id: 1, nameOrNumber: '+91 9729480795', avatarBg: 'bg-cyan-100', avatarText: 'text-cyan-600', type: 'Outgoing', duration: '8m', date: 'Sat, 14 Dec', time: '10:23', location: 'India • SMS / Call' },
  { id: 2, nameOrNumber: '+91 9812345678', avatarBg: 'bg-pink-100', avatarText: 'text-pink-600', type: 'Outgoing', duration: '5m', date: 'Sat, 14 Dec', time: '09:15', location: 'India • SMS / Call' },
  { id: 3, nameOrNumber: '+91 9876543210', avatarBg: 'bg-emerald-100', avatarText: 'text-emerald-600', type: 'Outgoing', duration: '0m 12s', date: 'Thu, 2 Dec', time: '22:00', location: 'India • SMS / Call' },
  { id: 4, nameOrNumber: 'Nitin Saxena', avatarBg: 'bg-amber-100', avatarText: 'text-amber-700', type: 'Outgoing', duration: '2m 45s', date: 'Fri, 3 Dec', time: '12:08', location: 'India • SMS / Call' },
  { id: 5, nameOrNumber: '+91 9416012345', avatarBg: 'bg-purple-100', avatarText: 'text-purple-600', type: 'Incoming', duration: '14m', date: 'Wed, 1 Dec', time: '18:42', location: 'India • SMS / Call' },
  { id: 6, nameOrNumber: 'Ramesh Kumar', avatarBg: 'bg-blue-100', avatarText: 'text-blue-600', type: 'Incoming', duration: '3m 10s', date: 'Wed, 1 Dec', time: '16:20', location: 'India • SMS / Call' },
  { id: 7, nameOrNumber: '+91 7015098765', avatarBg: 'bg-rose-100', avatarText: 'text-rose-600', type: 'Missed', duration: '0m', date: 'Tue, 30 Nov', time: '21:05', location: 'India • SMS / Call' },
  { id: 8, nameOrNumber: 'Pooja Sharma', avatarBg: 'bg-teal-100', avatarText: 'text-teal-600', type: 'Outgoing', duration: '1m 50s', date: 'Tue, 30 Nov', time: '15:30', location: 'India • SMS / Call' },
  { id: 9, nameOrNumber: '+91 8813054321', avatarBg: 'bg-indigo-100', avatarText: 'text-indigo-600', type: 'Incoming', duration: '6m', date: 'Mon, 29 Nov', time: '11:12', location: 'India • SMS / Call' },
  { id: 10, nameOrNumber: 'Amit Verma', avatarBg: 'bg-cyan-100', avatarText: 'text-cyan-600', type: 'Outgoing', duration: '11m', date: 'Sun, 28 Nov', time: '19:50', location: 'India • SMS / Call' },
  { id: 11, nameOrNumber: '+91 9991238844', avatarBg: 'bg-lime-100', avatarText: 'text-lime-700', type: 'Incoming', duration: '4m', date: 'Sat, 27 Nov', time: '13:40', location: 'India • SMS / Call' },
  { id: 12, nameOrNumber: 'Suresh Yadav', avatarBg: 'bg-amber-100', avatarText: 'text-amber-700', type: 'Outgoing', duration: '0m 45s', date: 'Fri, 26 Nov', time: '17:15', location: 'India • SMS / Call' },
  { id: 13, nameOrNumber: '+91 8168011223', avatarBg: 'bg-pink-100', avatarText: 'text-pink-600', type: 'Missed', duration: '0m', date: 'Fri, 26 Nov', time: '10:05', location: 'India • SMS / Call' },
  { id: 14, nameOrNumber: 'Vikas Singh', avatarBg: 'bg-purple-100', avatarText: 'text-purple-600', type: 'Outgoing', duration: '9m 20s', date: 'Thu, 25 Nov', time: '20:30', location: 'India • SMS / Call' },
  { id: 15, nameOrNumber: '+91 9306044556', avatarBg: 'bg-sky-100', avatarText: 'text-sky-600', type: 'Incoming', duration: '2m', date: 'Wed, 24 Nov', time: '14:22', location: 'India • SMS / Call' },
  { id: 16, nameOrNumber: 'Anjali Gupta', avatarBg: 'bg-emerald-100', avatarText: 'text-emerald-600', type: 'Outgoing', duration: '7m 15s', date: 'Tue, 23 Nov', time: '11:08', location: 'India • SMS / Call' },
  { id: 17, nameOrNumber: '+91 9138077889', avatarBg: 'bg-rose-100', avatarText: 'text-rose-600', type: 'Incoming', duration: '18m', date: 'Mon, 22 Nov', time: '18:00', location: 'India • SMS / Call' },
  { id: 18, nameOrNumber: 'Deepak Choudhary', avatarBg: 'bg-violet-100', avatarText: 'text-violet-600', type: 'Outgoing', duration: '3m', date: 'Sun, 21 Nov', time: '16:45', location: 'India • SMS / Call' },
  { id: 19, nameOrNumber: '+91 8708099001', avatarBg: 'bg-amber-100', avatarText: 'text-amber-700', type: 'Missed', duration: '0m', date: 'Sat, 20 Nov', time: '09:30', location: 'India • SMS / Call' },
  { id: 20, nameOrNumber: 'Sunil Mehta', avatarBg: 'bg-cyan-100', avatarText: 'text-cyan-600', type: 'Outgoing', duration: '5m 50s', date: 'Fri, 19 Nov', time: '21:10', location: 'India • SMS / Call' },
];

interface CallHistoryPageProps {
  defaultPhone?: string;
}

export default function CallHistoryPage({ defaultPhone }: CallHistoryPageProps) {
  const navigate = useNavigate();
  const { phone: paramPhone } = useParams<{ phone?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Clean or extract target phone number
  const rawNum = paramPhone || defaultPhone || '6376273288';
  const displayPhone = rawNum.startsWith('+91') ? rawNum : `+91 ${rawNum.replace(/\D/g, '') || '6376273288'}`;

  // Check if unblurred from previous successful payment in session
  const [isUnblurred, setIsUnblurred] = useState(() => {
    return localStorage.getItem(`unblur_callhistory_${rawNum}`) === 'true';
  });

  // Payment states
  const [showPayModal, setShowPayModal] = useState(false);
  const [payerPhone, setPayerPhone] = useState('');
  const [payerName, setPayerName] = useState('');
  const [isInitiatingPay, setIsInitiatingPay] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Success & processing countdown
  const [isProcessingSuccess, setIsProcessingSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Check if returning from Cashfree redirect with order_id or status
  const orderId = searchParams.get('order_id');
  const paymentStatus = searchParams.get('payment') || searchParams.get('status');

  useEffect(() => {
    if (orderId || paymentStatus === 'success') {
      setIsProcessingSuccess(true);
      localStorage.setItem(`unblur_callhistory_${rawNum}`, 'true');
    }
  }, [orderId, paymentStatus, rawNum]);

  // Handle 5 second countdown and auto refresh / visit back
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isProcessingSuccess) {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      } else {
        // Countdown reached 0: Mark unblurred, clear search params, auto refresh & visit back /callhistory6376273288
        setIsUnblurred(true);
        setIsProcessingSuccess(false);
        // Refresh page back to clean route /callhistory6376273288
        window.location.href = `/callhistory${rawNum}`;
      }
    }
    return () => clearTimeout(timer);
  }, [isProcessingSuccess, countdown, rawNum]);

  const handleOpenPay = () => {
    setShowPayModal(true);
    setPayError(null);
  };

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInitiatingPay(true);
    setPayError(null);

    const renderBackendUrl = getApiBaseUrl();

    try {
      const payload = {
        user_id: `guest_${Date.now()}`,
        user_email: 'callhistory_user@tracexdata.com',
        plan_id: 'callhistory_unblur_999',
        amount: 999,
        customer_phone: payerPhone || rawNum || '9999999999',
        customer_name: payerName || 'Call History Guest',
        return_url: `${window.location.origin}/callhistory${rawNum}?order_id={order_id}&payment=success`
      };

      const response = await fetch(`${renderBackendUrl.replace(/\/$/, "")}/api/cashfree/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Gateway Server Error ${response.status}`);
      }

      const orderData = await response.json();

      if (orderData.error) {
        throw new Error(orderData.error);
      }

      if (!orderData.payment_session_id) {
        throw new Error('Could not initiate Cashfree session. Please try again.');
      }

      // Initialize Cashfree checkout widget
      if (window.Cashfree) {
        const cashfreeMode = orderData.cf_mode || "production";
        const cashfree = window.Cashfree({
          mode: cashfreeMode
        });

        await cashfree.checkout({
          paymentSessionId: orderData.payment_session_id,
          redirectTarget: "_self"
        });
      } else {
        // Fallback to PgPaymentPage if SDK script is missing
        navigate(`/pgpay/999?service=callhistory&number=${encodeURIComponent(rawNum)}`);
      }

    } catch (err: any) {
      console.error('Payment launch error:', err);
      setPayError(err.message || 'Failed to open payment gateway. Please try again.');
      setIsInitiatingPay(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col items-center justify-start pb-24 selection:bg-amber-100">
      
      {/* 5-SECOND PROCESSING SUCCESS OVERLAY */}
      <AnimatePresence>
        {isProcessingSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="max-w-sm w-full bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(16,185,129,0.2)] flex flex-col items-center space-y-6"
            >
              {/* Success Icon & Spinner Halo */}
              <div className="relative flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin absolute" />
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  Payment Successful
                </span>
                <h2 className="text-2xl font-black text-white tracking-tight">Processing Unblur...</h2>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Verifying transaction record and unlocking call logs for <strong className="text-slate-200">{displayPhone}</strong>.
                </p>
              </div>

              {/* Countdown Gauge */}
              <div className="w-full bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 flex flex-col items-center justify-center space-y-2">
                <span className="text-xs text-slate-400 font-medium">Auto-refreshing & returning in</span>
                <div className="text-4xl font-black text-amber-400 font-mono tracking-tight flex items-center gap-1">
                  <span>{countdown}</span>
                  <span className="text-sm text-slate-400">sec</span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Redirecting back to /callhistory{rawNum}...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PAYMENT GATEWAY MODAL */}
      <AnimatePresence>
        {showPayModal && !isProcessingSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl text-slate-900 relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">Unlock Call Records</h3>
                    <p className="text-xs text-slate-500 font-medium">Official Cashfree Gateway</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPayModal(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Price Tag Banner */}
              <div className="my-5 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">Total Payable</span>
                  <span className="text-2xl font-extrabold text-slate-900 font-mono">₹999</span>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                    Instant Unblur
                  </span>
                </div>
              </div>

              {/* Error Alert */}
              {payError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {payError}
                </div>
              )}

              {/* Payment Details Form */}
              <form onSubmit={handleInitiatePayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Your Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isInitiatingPay}
                    className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-white font-extrabold text-lg py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                  >
                    {isInitiatingPay ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Opening Gateway...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Proceed to Pay ₹999</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-center text-slate-400 pt-1">
                  🔒 Encrypted 256-bit SSL transaction via Cashfree Payments
                </p>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER */}
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col px-4 pt-4 relative">
        
        {/* Top Header Bar */}
        <header className="flex items-center justify-between pb-4 border-b border-gray-100">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-800 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
          </button>

          <div className="flex items-center gap-3">
            {/* PUBLIC RECORDS PORTAL Circular Seal */}
            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center p-0.5 shadow-sm overflow-hidden flex-shrink-0 relative">
              <div className="w-full h-full rounded-full border border-white/40 flex items-center justify-center relative">
                <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 text-white fill-current opacity-90">
                  <path id="circlePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="none" />
                  <text className="text-[9.5px] uppercase tracking-widest font-bold fill-white">
                    <textPath href="#circlePath" startOffset="0%">
                      PUBLIC RECORDS PORTAL •
                    </textPath>
                  </text>
                </svg>
                {/* Center Crest / Shield */}
                <div className="w-5 h-5 rounded border border-white/80 flex items-center justify-center z-10 bg-black">
                  <span className="text-[10px] font-serif font-black tracking-tighter">PRP</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">Call History</h1>
              <span className="text-sm font-medium text-gray-500">{displayPhone}</span>
            </div>
          </div>

          <button 
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 text-gray-800 transition-colors"
            aria-label="Search"
          >
            <Search className="w-6 h-6 stroke-[2.2]" />
          </button>
        </header>

        {/* Dropdown Selector Card */}
        <div className="my-5">
          <div className="w-full border border-gray-200 rounded-2xl p-4 flex items-center justify-between bg-white shadow-sm hover:border-gray-300 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-800">
                <Phone className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-lg font-semibold text-gray-900">Phone Calls</span>
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400 stroke-[2.5]" />
          </div>
        </div>

        {/* Scrollable Call History Entries (20 Fields) */}
        <div className="flex-1 space-y-5 overflow-y-auto pb-28 pr-1 pt-1">
          {CALL_HISTORY_DATA.map((item) => (
            <div key={item.id} className="flex items-start gap-3.5 pb-4 border-b border-gray-100/80 last:border-0">
              
              {/* Avatar Icon Circle */}
              <div className={`w-12 h-12 rounded-full ${item.avatarBg} ${item.avatarText} flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5`}>
                <User className="w-6 h-6 stroke-[2.2]" />
              </div>

              {/* Call Details Block */}
              <div className="flex-1 min-w-0">
                {/* Title line (Name/Number) with blur or unblurred if paid */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-base font-semibold text-gray-900 tracking-wide ${isUnblurred ? 'blur-none select-text text-emerald-950 font-bold' : 'blur-[5px] select-none'}`}>
                    {item.nameOrNumber}
                  </span>
                  {item.type === 'Outgoing' && (
                    <ArrowUpRight className="w-4 h-4 text-slate-400 stroke-[2.5] flex-shrink-0" />
                  )}
                  {item.type === 'Incoming' && (
                    <ArrowDownLeft className="w-4 h-4 text-emerald-500 stroke-[2.5] flex-shrink-0" />
                  )}
                  {item.type === 'Missed' && (
                    <PhoneOff className="w-4 h-4 text-rose-500 stroke-[2.5] flex-shrink-0" />
                  )}
                </div>

                {/* Subtext 1: Call metadata */}
                <p className={`text-xs font-medium mt-1 ${isUnblurred ? 'blur-none text-slate-600' : 'text-gray-500 blur-[3.5px] select-none'}`}>
                  {item.type} • {item.duration} • {item.date} • {item.time}
                </p>

                {/* Subtext 2: Location / Service */}
                <p className={`text-xs mt-0.5 ${isUnblurred ? 'blur-none text-slate-500 font-mono' : 'text-gray-400 blur-[3px] select-none'}`}>
                  {item.location}
                </p>
              </div>

            </div>
          ))}
        </div>

        {/* Fixed / Sticky Bottom Action Bar */}
        <div className="fixed bottom-4 left-0 right-0 px-4 max-w-md mx-auto z-40">
          {isUnblurred ? (
            <div className="w-full bg-emerald-500 text-white font-extrabold text-lg py-3.5 px-6 rounded-3xl shadow-xl flex items-center justify-center gap-2 border border-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
              <span>Call Records Unlocked</span>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleOpenPay}
              className="w-full bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 text-slate-900 font-extrabold text-xl py-4 px-6 rounded-3xl shadow-xl hover:shadow-2xl flex items-center justify-center gap-3 border border-amber-300/80 backdrop-blur-md transition-all active:brightness-95"
            >
              <span className="text-2xl">🔓</span>
              <span className="tracking-tight">Unblur ₹999</span>
            </motion.button>
          )}
        </div>

      </div>
    </div>
  );
}
