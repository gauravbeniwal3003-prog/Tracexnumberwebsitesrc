import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { ShieldCheck, Zap, CreditCard, ChevronRight, CheckCircle2, AlertCircle, RefreshCw, Camera, Sparkles, User, Mail, Phone, IndianRupee } from 'lucide-react';
import LiquidBackground from '../components/LiquidBackground.tsx';
import { cleanIndianPhoneNumber } from '../services/utils.ts';
import { getApiBaseUrl } from '../services/api.ts';

interface PgPaymentPageProps {
  fallbackFixed?: boolean;
  customSegment?: boolean;
}

export default function PgPaymentPage({ fallbackFixed, customSegment }: PgPaymentPageProps) {
  const { urlAmt, pgpayCustom } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Parse path parameter
  let routeAmount: string | null = null;
  let isInvalidRoute = false;

  if (fallbackFixed && urlAmt) {
    routeAmount = urlAmt;
  } else if (customSegment && pgpayCustom) {
    const norm = pgpayCustom.toLowerCase();
    if (norm.startsWith('pgpay')) {
      const parsedPart = norm.substring(5); // remove 'pgpay'
      if (parsedPart) {
        // Validate if it is a numeric segment, e.g., "150" in "pgpay150"
        if (/^\d+$/.test(parsedPart)) {
          routeAmount = parsedPart;
        } else {
          isInvalidRoute = true;
        }
      }
    } else {
      isInvalidRoute = true;
    }
  }

  // Redirect if URL does not match any valid /pgpay subpath pattern
  if (isInvalidRoute) {
    return <Navigate to="/" replace />;
  }

  const orderId = searchParams.get('order_id');

  const [amount, setAmount] = useState(routeAmount || '');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Verification state
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
  const [verifiedDetails, setVerifiedDetails] = useState<{
    amount: number;
    orderId: string;
    time: string;
  } | null>(null);

  // Clean-up or trigger verification on load
  useEffect(() => {
    setIsLoaded(true);
    if (orderId) {
      verifyPayment(orderId);
    }
  }, [orderId]);

  const verifyPayment = async (oid: string) => {
    setVerificationStatus('loading');
    try {
      const renderBackendUrl = getApiBaseUrl();
      const response = await fetch(`${renderBackendUrl.replace(/\/$/, "")}/api/cashfree/status/${oid}`);
      
      if (!response.ok) {
        throw new Error(`Verification endpoint returned ${response.status}`);
      }

      const data = await response.json();
      if (data.order_status === 'PAID') {
        setVerifiedDetails({
          amount: data.order_amount,
          orderId: oid,
          time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) + ' (IST)'
        });
        setVerificationStatus('success');
      } else {
        setVerificationStatus('failed');
        setErrorMsg(`Payment status check returned: ${data.order_status}.`);
      }
    } catch (err: any) {
      console.error('Failed to verify payment:', err);
      setVerificationStatus('failed');
      setErrorMsg(err.message || 'Verification connection failed. Please refresh.');
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    const finalAmount = routeAmount || amount;
    if (!finalAmount || Number(finalAmount) <= 0) {
      setErrorMsg('Please enter a valid amount to pay.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    const renderBackendUrl = getApiBaseUrl();

    try {
      const payload = {
        user_id: `guest_${Date.now()}`,
        user_email: payerEmail || 'guest_payment@tracexdata.com',
        plan_id: 'pgpay_manual',
        amount: Number(finalAmount),
        customer_phone: payerPhone || '9999999999',
        customer_name: payerName || 'Payer Guest',
        return_url: `${window.location.origin}/pgpay?order_id={order_id}`
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
        throw new Error(errorData.error || `Server Error ${response.status}`);
      }

      const orderData = await response.json();

      if (orderData.error) {
        throw new Error(orderData.error);
      }

      if (!orderData.payment_session_id) {
        throw new Error('Could not initiate secure gateway session. Try again later.');
      }

      // Initialize Cashfree dynamically (production vs sandbox mode compatibility)
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
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSearchParams({});
    setVerificationStatus('idle');
    setVerifiedDetails(null);
    setAmount(routeAmount || '');
    setPayerName('');
    setPayerEmail('');
    setPayerPhone('');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#020204] text-zinc-100 selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden flex flex-col justify-between relative font-sans">
      <LiquidBackground />

      {/* Decorative Floating Glass Orbs/Blobs in the Background for "Liquid Glass" theme */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-20">
        <div className="absolute top-[25%] left-[20%] w-72 h-72 rounded-full bg-gradient-to-br from-cyan-500/10 to-transparent blur-[80px]" />
        <div className="absolute bottom-[30%] right-[15%] w-80 h-80 rounded-full bg-gradient-to-tr from-purple-500/10 to-transparent blur-[100px]" />
      </div>

      {/* Header secure navigation bar */}
      <nav className="fixed top-0 left-0 right-0 p-4 md:p-6 z-[60] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-xl pointer-events-auto transition-all hover:bg-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-100">TRACEXDATA</span>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-xl pointer-events-auto shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <ShieldCheck size={12} className="text-emerald-400" /> SECURE GATEWAY
          </span>
        </div>
      </nav>

      <div className="relative z-10 flex-1 flex items-center justify-center pt-28 pb-16 px-4">
        <AnimatePresence mode="wait">
          
          {/* Loading verification screen */}
          {verificationStatus === 'loading' && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card max-w-md w-full p-8 text-center space-y-6 border border-white/10 bg-white/[0.03] md:p-10 shadow-[0_30px_70px_rgba(0,0,0,0.6)] backdrop-blur-2xl relative"
            >
              {/* Internal Sheen Reflection */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.04] rounded-3xl" />
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mx-auto flex items-center justify-center shadow-[0_4px_20px_rgba(6,182,212,0.15)] relative z-10">
                <RefreshCw className="text-cyan-400 animate-spin" size={28} />
              </div>
              <div className="space-y-2 relative z-10">
                <h2 className="text-xl font-extrabold text-white tracking-tight">Verifying Payment</h2>
                <p className="text-zinc-400 text-xs leading-relaxed max-w-xs mx-auto">Authenticating secure transactional gateway signature. Please stand by...</p>
              </div>
            </motion.div>
          )}

          {/* Success screen indicating user has successfully made payment */}
          {verificationStatus === 'success' && verifiedDetails && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              className="glass-card max-w-lg w-full p-8 md:p-10 space-y-8 border-t-white/[0.15] border-b-white/[0.05] border-x-white/[0.08] bg-gradient-to-b from-white/[0.05] to-zinc-950/[0.4] backdrop-blur-[24px] shadow-[0_40px_80px_rgba(0,0,0,0.7)] relative overflow-hidden"
            >
              {/* Glass sheen light sheen */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.05] pointer-events-none rounded-3xl" />
              {/* Backglow organic light */}
              <div className="absolute -inset-4 bg-emerald-500/5 rounded-[40px] blur-3xl -z-10" />

              {/* Decorative top border overlay */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
              
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="text-emerald-400" size={40} />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400 font-mono">Transaction Approved</span>
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Payment Completed!</h2>
                </div>
              </div>

              {/* Receipt details */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-5 md:p-6 space-y-4 shadow-inner">
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <span className="text-zinc-500 text-xs uppercase tracking-wider font-extrabold font-mono">Amount Paid</span>
                  <span className="text-2xl font-black text-white font-mono flex items-center">
                    <IndianRupee size={20} className="mr-0.5 text-emerald-400" /> {verifiedDetails.amount}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 uppercase tracking-widest font-extrabold font-mono">Paid on</span>
                  <span className="text-zinc-200 font-medium font-mono">{verifiedDetails.time}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 uppercase tracking-widest font-extrabold font-mono">Reference ID</span>
                  <span className="text-zinc-200 font-mono select-all truncate max-w-[200px] hover:text-cyan-400 transition-colors cursor-pointer" title="Click to copy">{verifiedDetails.orderId}</span>
                </div>
              </div>

              {/* ACTION: Take screenshot notice */}
              <div className="rounded-2xl bg-cyan-500/5 border border-cyan-500/15 p-5 flex items-start gap-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] selection:bg-cyan-500/20">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <Camera className="text-cyan-400" size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-cyan-300">Action Required</h4>
                  <p className="text-zinc-400 text-xs leading-relaxed font-medium">
                    Please take a <strong className="text-white underline">screenshot of this receipt</strong> and forward it directly to the <strong>Owner/Support</strong> to confirm your instant fulfillment manual request.
                  </p>
                </div>
              </div>

              {/* Control triggers */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleReset}
                  className="w-full py-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-bold text-xs uppercase tracking-widest border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                >
                  <Sparkles size={14} className="text-cyan-400 animate-pulse" />
                  <span>Pay Again</span>
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-2 text-zinc-500 hover:text-zinc-300 transition-colors text-xs uppercase tracking-widest font-bold font-mono"
                >
                  Back to Homepage
                </button>
              </div>
            </motion.div>
          )}

          {/* Verification Failed flow */}
          {verificationStatus === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card max-w-md w-full p-8 text-center space-y-6 border border-red-500/20 bg-gradient-to-b from-white/[0.03] to-red-950/[0.05] shadow-[0_30px_70px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mx-auto flex items-center justify-center shadow-lg shadow-red-500/5">
                <AlertCircle className="text-red-400" size={28} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">Verification Incomplete</h2>
                <p className="text-zinc-400 text-xs leading-relaxed">{errorMsg || 'We couldn\'t confirm this payment status.'}</p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => verifyPayment(orderId || '')}
                  className="w-full py-3.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 font-extrabold text-xs uppercase tracking-widest border border-red-500/20 transition-all"
                >
                  Retry Verification
                </button>
                <button
                  onClick={handleReset}
                  className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs uppercase tracking-widest border border-white/5 transition-all"
                >
                  Back to Payments
                </button>
              </div>
            </motion.div>
          )}

          {/* Form screen (Direct Pay setup) */}
          {verificationStatus === 'idle' && isLoaded && (
            <motion.div
              key="pay-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="glass-card max-w-lg w-full p-6 md:p-10 border-t-white/[0.15] border-b-white/[0.04] border-x-white/[0.08] bg-gradient-to-b from-white/[0.05] to-zinc-950/[0.4] backdrop-blur-[24px] shadow-[0_45px_90px_rgba(0,0,0,0.7)] flex flex-col relative"
            >
              {/* Outer halo back glow */}
              <div className="absolute -inset-4 bg-cyan-500/[0.03] rounded-[40px] blur-3xl -z-10 pointer-events-none" />
              {/* Interior reflection sheen of high-quality glass */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.04] pointer-events-none rounded-3xl" />
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-cyan-500/50" />
              
              {/* Header and Details */}
              <div className="space-y-3 mb-8 text-center md:text-left">
                <div className="flex justify-center md:justify-start">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-1 shadow-lg shadow-cyan-500/5">
                    <CreditCard className="text-cyan-400" size={22} />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">Secure Payment Gateway</h3>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-medium">Enter your payment requirements instantly. Monitored and fully protected under TraceXData Security Systems.</p>
              </div>

              {/* Direct Input Error Alert */}
              {errorMsg && (
                <div className="p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5 shadow-md relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-500" />
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                  <span className="leading-relaxed font-medium">{errorMsg}</span>
                </div>
              )}

              {/* Payment inputs Form */}
              <form onSubmit={handlePay} className="space-y-6">
                <div className="grid grid-cols-1 gap-5">
                  
                  {/* Payment Amount */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 flex items-center gap-1.5 font-mono">
                      <IndianRupee size={12} className="text-cyan-400" /> AMOUNT TO PAY (INR)
                    </label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-cyan-400 transition-colors">
                        <IndianRupee size={18} />
                      </div>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 150"
                        value={routeAmount || amount}
                        disabled={!!routeAmount || isProcessing}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.07] border border-white/10 focus:border-[#22d3ee] outline-none transition-all pl-12 pr-28 py-4 font-mono font-black text-lg text-white rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:ring-[3px] focus:ring-cyan-500/10"
                        required
                      />
                      {routeAmount ? (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[9px] uppercase tracking-wider font-bold text-cyan-300 font-mono">
                          Fixed Link
                        </div>
                      ) : (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-zinc-500 font-mono uppercase">
                          MANUAL
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Payer details */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 flex items-center gap-1.5 font-mono">
                      <User size={12} className="text-zinc-500" /> FULL NAME (OPTIONAL)
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        maxLength={50}
                        placeholder="e.g. John Doe"
                        value={payerName}
                        disabled={isProcessing}
                        onChange={(e) => setPayerName(e.target.value)}
                        className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.07] border border-white/10 focus:border-[#22d3ee] outline-none transition-all px-5 py-3.5 text-sm text-white rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:ring-[3px] focus:ring-cyan-500/10"
                      />
                    </div>
                  </div>

                  {/* Customer Email details */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 flex items-center gap-1.5 font-mono">
                      <Mail size={12} className="text-zinc-500" /> EMAIL ADDRESS (OPTIONAL)
                    </label>
                    <div className="relative group">
                      <input
                        type="email"
                        placeholder="e.g. name@example.com"
                        value={payerEmail}
                        disabled={isProcessing}
                        onChange={(e) => setPayerEmail(e.target.value)}
                        className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.07] border border-white/10 focus:border-[#22d3ee] outline-none transition-all px-5 py-3.5 text-sm text-white rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:ring-[3px] focus:ring-cyan-500/10"
                      />
                    </div>
                  </div>

                  {/* Customer Phone details */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 flex items-center gap-1.5 font-mono">
                      <Phone size={12} className="text-zinc-500" /> MOBILE NUMBER (OPTIONAL)
                    </label>
                    <div className="relative group">
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={payerPhone}
                        disabled={isProcessing}
                        onChange={(e) => setPayerPhone(cleanIndianPhoneNumber(e.target.value))}
                        className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.07] border border-white/10 focus:border-[#22d3ee] outline-none transition-all px-5 py-3.5 text-sm font-mono text-white rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:ring-[3px] focus:ring-cyan-500/10"
                      />
                    </div>
                  </div>

                </div>

                {/* Submit button with realistic animation and subtle gloss reflection */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full h-14 mt-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 hover:opacity-95 text-zinc-950 font-black tracking-widest uppercase text-xs transition-all flex items-center justify-center gap-2 shadow-[0_12px_24px_rgba(6,182,212,0.15)] disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] cursor-pointer hover:shadow-[0_16px_30px_rgba(6,182,212,0.25)] relative overflow-hidden group/btn"
                >
                  {/* Subtle sweep glare sheen inside button */}
                  <span className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg] -translate-x-full group-hover/btn:animate-[sweep_1.5s_ease_infinite]" />
                  {isProcessing ? (
                    <div className="w-5 h-5 border-[3px] border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Zap size={14} className="fill-zinc-950" />
                      <span>Pay ₹{routeAmount || amount || "0"} Securely</span>
                      <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer credits matches the site theme perfectly */}
      <footer className="w-full py-6 text-center select-none pointer-events-none relative z-10">
        <span className="text-zinc-600 text-[9px] uppercase tracking-[0.25em] font-extrabold font-mono">
          TRACEXDATA Security Gateway Protection Systems • Zero Logs Service
        </span>
      </footer>
    </div>
  );
}
