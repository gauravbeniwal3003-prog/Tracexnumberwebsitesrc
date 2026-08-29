import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, CheckCircle2, Loader2, ShieldCheck, Clock, Check, AlertCircle, Sparkles, HelpCircle } from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { useNavigate } from 'react-router-dom';
import HeaderNavbar from '../components/HeaderNavbar';
import LiquidBackground from '../components/LiquidBackground';
import { getApiBaseUrl, getAuthToken } from '../services/api';

export default function UnlimitedPlans() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [isBuying, setIsBuying] = useState(false);
  const [status, setStatus] = useState<{ status: 'idle' | 'success' | 'failed', message: string }>({ status: 'idle', message: '' });
  const [unlimitedCountdown, setUnlimitedCountdown] = useState<string>('');

  // Calculate live countdown for unlimited plan
  useEffect(() => {
    if (!profile?.unlimited_expiry) {
      setUnlimitedCountdown('');
      return;
    }

    const updateTimer = () => {
      const expiry = new Date(profile.unlimited_expiry).getTime();
      const now = Date.now();
      const diff = expiry - now;
      if (diff <= 0) {
        setUnlimitedCountdown('');
        return;
      }
      
      const secs = Math.floor(diff / 1000);
      const mins = Math.floor(secs / 60);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) {
        setUnlimitedCountdown(`${days}d ${hours % 24}h ${mins % 60}m`);
      } else if (hours > 0) {
        setUnlimitedCountdown(`${hours}h ${mins % 60}m ${secs % 60}s`);
      } else {
        setUnlimitedCountdown(`${mins}m ${secs % 60}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [profile?.unlimited_expiry]);

  const currentBalance = Math.max(Number(profile?.credits || 0), Number(profile?.wallet_balance || 0));

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const orderId = searchParams.get('order_id');
    if (orderId) {
      checkPaymentStatus(orderId);
      window.history.replaceState({}, document.title, "/unlimited-plans");
    }
  }, [user]);

  const checkPaymentStatus = async (orderId: string) => {
    try {
      setIsBuying(true);
      setStatus({ status: 'idle', message: 'Verifying payment status with Cashfree...' });
      const backendUrl = getApiBaseUrl();
      const response = await fetch(`${backendUrl.replace(/\/$/, "")}/api/cashfree/status/${orderId}`);
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Status check failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.order_status === 'PAID' || data.order_status === 'SUCCESS') {
        setStatus({ 
          status: 'success', 
          message: `Payment Successful! Your Unlimited Search Plan has been activated successfully.`
        });
        localStorage.removeItem('tracex_last_pending_order');
        await refreshProfile();
        setTimeout(async () => {
          await refreshProfile();
        }, 2000);
      } else {
        setStatus({ status: 'failed', message: `Payment status: ${data.order_status}. Please try again.` });
      }
    } catch (err: any) {
      console.error('Error checking payment status:', err);
      setStatus({ status: 'failed', message: err.message || 'Verification failed.' });
    } finally {
      setIsBuying(false);
    }
  };

  const handleBuyPlan = async (days: number) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-login'));
      return;
    }

    const price = days === 1 ? 100 : days === 7 ? 400 : 1200;
    const planName = days === 1 ? "1 Day" : days === 7 ? "7 Days" : "1 Month";

    const confirmed = window.confirm(`Are you sure you want to purchase the ${planName} Unlimited Search Plan for ₹${price} via Cashfree?`);
    if (!confirmed) return;

    try {
      setIsBuying(true);
      setStatus({ status: 'idle', message: '' });
      const token = await getAuthToken();
      if (!token) throw new Error("Authentication token expired. Please sign in again.");

      const backendUrl = getApiBaseUrl();
      const response = await fetch(`${backendUrl.replace(/\/$/, "")}/api/cashfree/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: user.id,
          user_email: user.email,
          plan_id: `unlimited_${days}`,
          amount: price,
          customer_phone: profile?.mobile || '9999999999',
          customer_name: profile?.name || user.email?.split('@')[0],
          return_url: `${window.location.origin}/unlimited-plans?order_id={order_id}`
        })
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.detail || `Server error: ${response.status}`);
        } else {
          throw new Error(`Payment Gateway Technical Error (${response.status}).`);
        }
      }

      const orderData = await response.json();
      if (orderData.error) {
        throw new Error(orderData.error);
      }

      if (!orderData.payment_session_id) {
        throw new Error('Payment session could not be created.');
      }

      // Save pending order locally
      try {
        localStorage.setItem('tracex_last_pending_order', JSON.stringify({
          orderId: orderData.order_id,
          amount: price,
          planId: `unlimited_${days}`,
          createdAt: Date.now()
        }));
      } catch (e) {}

      if (!window.Cashfree) {
        throw new Error('Cashfree Payment Gateway SDK failed to initialize. Please refresh the page.');
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
      console.error('Payment Error Details:', err);
      setStatus({
        status: 'failed',
        message: err.message || 'Something went wrong. Please try again.'
      });
    } finally {
      setIsBuying(false);
    }
  };

  const isActive = Boolean(profile?.unlimited_expiry && new Date(profile.unlimited_expiry) > new Date());

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      <LiquidBackground />
      <HeaderNavbar title="TRACEXDATA" subtitle="UNLIMITED PLANS" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        
        {/* Top Active Plan Bar / Banner */}
        {isActive ? (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 font-black text-9xl uppercase tracking-widest select-none pointer-events-none">
              VIP
            </div>
            <div className="space-y-1 relative z-10">
              <span className="text-xs font-black uppercase tracking-widest text-amber-100 bg-black/10 px-3 py-1 rounded-full border border-white/10 inline-block mb-1.5">
                👑 Unlimited Plan Active
              </span>
              <h1 className="text-2xl sm:text-3xl font-black">
                Infinite Searches Enabled
              </h1>
              <p className="text-xs text-amber-50 font-medium">
                You can perform unlimited search operations without deducting standard credits from your account.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 relative z-10 w-full md:w-auto">
              <div className="bg-white/20 border border-white/30 backdrop-blur-md rounded-xl p-4 flex items-center gap-3 w-full sm:w-auto">
                <Clock className="w-6 h-6 text-white shrink-0 animate-pulse" />
                <div>
                  <span className="text-[10px] text-amber-100 font-bold uppercase block tracking-wider">Remaining Duration</span>
                  <span className="text-sm font-extrabold font-mono text-white block">
                    {unlimitedCountdown || "Calculating..."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="text-amber-500">👑</span>
                <span>Get Unlimited Search Power</span>
              </h2>
              <p className="text-slate-500 text-xs font-semibold">
                Activate an Unlimited Search Plan to query names, numbers, vehicles, and records with absolutely zero deductions!
              </p>
            </div>
            <div className="text-center sm:text-right shrink-0">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Wallet Balance</span>
              <span className="text-xl font-black font-mono text-slate-900 block">
                ₹{currentBalance.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Status Alerts */}
        <AnimatePresence mode="popLayout">
          {status.status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl border text-xs font-bold flex items-start gap-3 shadow-xs ${
                status.status === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-red-50 border-red-200 text-red-950'
              }`}
            >
              {status.status === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              ) }
              <span className="flex-1">{status.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { days: 1, label: '1 Day Unlimited', price: 100, desc: 'Perfect for quick, high-intensity database searches and investigations.', badge: 'Hourly' },
            { days: 7, label: '7 Days Unlimited', price: 400, desc: 'Best choice for active weekly intelligence collection and tracking.', badge: 'Most Popular' },
            { days: 30, label: '1 Month Unlimited', price: 1200, desc: 'Ultimate long-term privilege. Zero limits, fully professional grade.', badge: 'Super Saver' }
          ].map((plan) => {
            return (
              <div 
                key={plan.days} 
                className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-amber-400/80 hover:shadow-xl transition-all flex flex-col justify-between gap-6 relative overflow-hidden"
              >
                <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-extrabold uppercase">
                  {plan.badge}
                </div>

                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                    🏆
                  </div>
                  <h3 className="font-black text-slate-900 text-base tracking-tight">{plan.label}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed font-semibold">{plan.desc}</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-950">₹{plan.price}</span>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">
                      / {plan.days === 1 ? 'day' : plan.days === 7 ? '7 days' : 'month'}
                    </span>
                  </div>

                  <button
                    disabled={isBuying}
                    onClick={() => handleBuyPlan(plan.days)}
                    className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    {isBuying ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Processing Purchase...</span>
                      </>
                    ) : (
                      <span>Activate Unlimited Plan</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Core Perks Section */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
          <h2 className="text-base font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            <span>Why Switch To Unlimited?</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Check className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">No Search Deduction</h4>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  Your regular wallet money is safely preserved. Searches will be free of charge instantly during the plan.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Check className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">Seamless Stacking</h4>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  Already have an active unlimited plan? Purchasing another plan adds the hours/days consecutively!
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Check className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">Premium High-Speed Queries</h4>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  Unlimited plans use our specialized API streams, guaranteeing faster query delivery and processing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Check className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">Anti-Scam DecentRegistry Guarantee</h4>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                  Each purchase transaction is signed securely by our distributed ledger security logic.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
