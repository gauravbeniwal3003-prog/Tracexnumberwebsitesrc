import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Zap, Server, Shield, Code, ChevronRight, ArrowRight, MessageSquare, CreditCard, CheckCircle2, Loader2, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';
import { CREDIT_PLANS, UNLIMITED_PLANS, PricingPlan } from '../types.ts';
import { getOfferStatus, getPlanPrice } from '../services/promo.ts';
import { supabase } from '../services/supabase.ts';
import { getApiBaseUrl } from '../services/api';

export default function BuyCredits() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{ status: 'idle' | 'success' | 'failed', message?: string }>({ status: 'idle' });

  // Self-Healing Missing Credits Recovery State
  const [claimOrderId, setClaimOrderId] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState<{ status: 'idle' | 'success' | 'failed', message: string }>({ status: 'idle', message: '' });

  // Auto-Reconcile Payments on Load
  useEffect(() => {
    const runAutoReconciliation = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(`${getApiBaseUrl()}/api/cashfree/reconcile-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (response.ok) {
          const result = await response.json();
          if (result.recoveredCount > 0) {
            setPaymentStatus({
              status: 'success',
              message: `Smart Fix: Located ${result.recoveredCount} paid order(s) on Cashfree ledger. Adding credits to your balance!`
            });
            await refreshProfile();
          }
        }
      } catch (err) {
        console.error("Auto reconciliation error:", err);
      }
    };

    if (user) {
      runAutoReconciliation();
    }
  }, [user]);

  const handleClaimManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-login'));
      return;
    }
    if (!claimOrderId.trim()) {
      setClaimResult({ status: 'failed', message: 'Please enter a valid order ID.' });
      return;
    }

    try {
      setClaimLoading(true);
      setClaimResult({ status: 'idle', message: '' });
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No login session found. Please sign in again.");
      }

      const response = await fetch(`${getApiBaseUrl()}/api/cashfree/claim-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ order_id: claimOrderId.trim() })
      });

      const resJson = await response.json();
      if (response.ok && resJson.status === 'success') {
        setClaimResult({ status: 'success', message: resJson.message });
        setClaimOrderId('');
        await refreshProfile();
      } else {
        setClaimResult({ status: 'failed', message: resJson.error || 'Fulfillment verification failed.' });
      }
    } catch (err: any) {
      setClaimResult({ status: 'failed', message: err.message || 'Verification connection failed.' });
    } finally {
      setClaimLoading(false);
    }
  };

  // Check URL params for order redirect confirmation
  useEffect(() => {
    const orderId = searchParams.get('order_id');
    if (orderId) {
      checkPaymentStatus(orderId);
      // Clean up URL
      window.history.replaceState({}, document.title, "/pricing");
    }
  }, [searchParams]);

  const checkPaymentStatus = async (orderId: string) => {
    try {
      setIsProcessing(true);
      const backendUrl = "https://tracexdata-api.onrender.com";
      const response = await fetch(`${backendUrl.replace(/\/$/, "")}/api/cashfree/status/${orderId}`);
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Status check failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.order_status === 'PAID') {
        setPaymentStatus({ 
          status: 'success', 
          message: 'Payment completed successfully! Your credit balance has been updated.'
        });
        
        await refreshProfile();
        setTimeout(async () => {
          await refreshProfile();
        }, 2000);
      } else {
        setPaymentStatus({ status: 'failed', message: `Payment ${data.order_status}. Please try again.` });
      }
    } catch (err: any) {
      console.error('Error checking payment status:', err);
      setPaymentStatus({ status: 'failed', message: err.message || 'Verification failed. Please contact support.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchase = async (plan: PricingPlan) => {
    if (!user) {
      // Trigger login modal
      window.dispatchEvent(new CustomEvent('open-login'));
      return;
    }

    setIsProcessing(true);
    const backendUrl = "https://tracexdata-api.onrender.com";
    const finalAmount = getPlanPrice(plan);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';
      const response = await fetch(`${backendUrl.replace(/\/$/, "")}/api/cashfree/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: user.id,
          user_email: user.email,
          plan_id: plan.id,
          amount: finalAmount,
          customer_phone: profile?.mobile || '9999999999',
          customer_name: profile?.name || user.email?.split('@')[0],
          return_url: `${window.location.origin}/pricing?order_id={order_id}`
        })
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.detail || `Server error: ${response.status}`);
        } else {
          throw new Error(`Payment Gateway Technical Error (${response.status}). Please check backend logs.`);
        }
      }

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response from server. Check if backend is alive.");
      }

      const orderData = await response.json();

      if (orderData.error) {
        throw new Error(orderData.error);
      }

      if (!orderData.payment_session_id) {
        throw new Error('Payment session could not be created. Please check backend logs.');
      }

      const cashfree = window.Cashfree({
        mode: "production" 
      });

      await cashfree.checkout({
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: "_self" 
      });

    } catch (err: any) {
      console.error('Payment Error Details:', err);
      alert(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      <LiquidBackground />
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 p-4 z-[60] flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:bg-cyan-500/10 transition-all group">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:animate-ping"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">TRACEXDATA</span>
        </button>
        <div className="flex items-center gap-4">
          {profile && (
            <div className="hidden xs:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-zinc-300">
              <span className="text-zinc-500">Credits:</span>
              <span className="text-cyan-400">{profile.credits ?? 0}</span>
            </div>
          )}
          {user ? (
            <button onClick={() => navigate('/')} className="text-[10px] font-bold uppercase tracking-widest text-[#a855f7] px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all">
              Dashboard
            </button>
          ) : (
            <button onClick={() => window.dispatchEvent(new CustomEvent('open-login'))} className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all">
              Sign In
            </button>
          )}
        </div>
      </nav>

      <div className="relative z-10 pt-24 pb-20 px-4 max-w-7xl mx-auto">
        <header className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/5 border border-purple-500/10 mb-6"
          >
            <Zap size={14} className="text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400/80">Recharge &amp; Subscriptions</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 font-sans"
          >
            Power Your Insights. <br className="hidden md:block" /> Unlimited Access.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500 max-w-xl mx-auto text-sm md:text-lg"
          >
            Select from our fast, high-performance lookup credits or grab an unlimited premium package to bypass all search queue thresholds.
          </motion.p>
        </header>

        {/* Status Messages */}
        <AnimatePresence>
          {paymentStatus.status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-6 rounded-2xl border flex flex-col gap-4 overflow-hidden mb-8 max-w-4xl mx-auto ${
                paymentStatus.status === 'success' 
                  ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span className="font-bold uppercase tracking-wider text-[10px]">{paymentStatus.message}</span>
                </div>
                <button onClick={() => setPaymentStatus({ status: 'idle' })} className="p-1 hover:bg-white/10 rounded-full">
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pricing Layout sections */}
        <div className="max-w-5xl mx-auto space-y-16">
          
          {/* Section 1: Unlimited search plans */}
          <section>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-[0.25em] text-[10px]">
                <Zap size={14} />
                Elite Subscriptions (Bypass limits)
              </div>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            
            <div className="p-4 mb-8 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-400 text-xs font-mono flex items-center gap-3">
              <AlertCircle size={16} className="shrink-0" />
              <span>
                <strong>CRITICAL NOTICE:</strong> Aadhaar to PAN lookup is <strong>strictly excluded</strong> from all Unlimited Plans due to third-party server costs. Aadhaar to PAN searches require credit balances (150 Credits per lookup).
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {UNLIMITED_PLANS.map((plan) => {
                return (
                  <motion.div
                    key={plan.id}
                    whileHover={{ y: -4 }}
                    className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 hover:border-purple-500/30 hover:bg-white/[0.04] transition-all relative overflow-hidden group flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Zap size={80} className="text-purple-500" />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center gap-2 flex-wrap mb-4">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[9px] font-bold text-purple-400 uppercase tracking-widest">
                          UNLIMITED SEARCH
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                      <p className="text-zinc-500 text-xs mb-6">Unlimited lookup routing for 100% complete intelligence access.</p>

                      <div className="flex items-baseline gap-2 mb-8">
                        <span className="text-4xl font-bold text-white">₹{plan.price}</span>
                        <span className="text-zinc-500 font-mono text-xs">/ period</span>
                      </div>

                      <ul className="space-y-3 mb-8">
                        {[
                          'Totally unlimited lookups & queries',
                          'Zero wait-time background lookup queues',
                          'Full visibility of hidden metadata records',
                          'No per-query charge, 24/7 priority routing',
                          'Excludes Aadhaar to PAN (Requires Credits)'
                        ].map((feat, fIdx) => (
                          <li key={fIdx} className={`flex items-center gap-2.5 text-xs ${feat.includes('Excludes') ? 'text-amber-400 font-semibold' : 'text-zinc-400'}`}>
                            <CheckCircle2 size={14} className={`${feat.includes('Excludes') ? 'text-amber-500' : 'text-purple-400'} shrink-0`} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      disabled={isProcessing}
                      onClick={() => handlePurchase(plan)}
                      className="w-full py-4 rounded-2xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 uppercase tracking-wider transition-all flex items-center justify-center gap-2 pt-4 relative z-10"
                    >
                      {isProcessing ? <Loader2 size={14} className="animate-spin" /> : 'Unlock Access Now'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Section 2: Credit lookup plans */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-[0.25em] text-[10px]">
                <CreditCard size={14} />
                Lookup Credits (Pay as you go)
              </div>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CREDIT_PLANS.map((plan) => {
                return (
                  <motion.div
                    key={plan.id}
                    whileHover={{ y: -4 }}
                    className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all relative overflow-hidden group flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <CreditCard size={80} className="text-cyan-500" />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center gap-2 flex-wrap mb-4">
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-bold text-cyan-400 uppercase tracking-widest">
                          QUICK RECHARGE
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                      <p className="text-zinc-500 text-xs mb-6">Instantly reload search credits. Non-expiring high-performance lookups.</p>

                      <div className="flex items-baseline gap-2 mb-8">
                        <span className="text-4xl font-bold text-white">₹{plan.price}</span>
                        <span className="text-zinc-500 font-mono text-xs">/ {plan.value} lookups</span>
                      </div>

                      <ul className="space-y-3 mb-8">
                        {[
                          'Credits never expire, run searches whenever you need',
                          'Access to Phone & Telegram Lookup modules',
                          'Standard routing priorities with high-speed query servers',
                          'Frictionless checkouts with automated balance loading'
                        ].map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-2.5 text-xs text-zinc-400">
                            <CheckCircle2 size={14} className="text-cyan-500 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      disabled={isProcessing}
                      onClick={() => handlePurchase(plan)}
                      className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-cyan-500 hover:text-zinc-950 text-white hover:border-transparent font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 pt-4 relative z-10"
                    >
                      {isProcessing ? <Loader2 size={14} className="animate-spin" /> : 'Buy Credits'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </section>

        </div>

        {/* Anti-Flicker / Smart Self-Healing & Missing Credits Recovery Panel */}
        <section className="mt-16 max-w-4xl mx-auto p-8 rounded-[32px] bg-gradient-to-br from-purple-500/5 via-black to-cyan-500/5 border border-purple-500/15 shadow-2xl relative z-10 overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ShieldCheck size={120} className="text-purple-400" />
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-md">
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-bold text-cyan-400 uppercase tracking-widest block w-fit mb-3 font-sans">
                Payment Reconciliation Gateway
              </span>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2 font-sans">
                <ShieldCheck size={18} className="text-purple-400 animate-pulse" />
                Missing Credits? Self-Heal Verification
              </h3>
              <p className="text-zinc-500 text-xs leading-relaxed font-sans">
                If you completed a transaction but your account credits didn't post, enter your Cashfree **Order ID** below. The server will reconcile with Cashfree in real-time to credit your account immediately.
              </p>
            </div>

            <form onSubmit={handleClaimManual} className="w-full md:w-auto flex-grow max-w-sm flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={claimOrderId}
                  onChange={(e) => setClaimOrderId(e.target.value)}
                  placeholder="order_171881..."
                  className="flex-grow h-11 bg-black/50 border border-white/10 rounded-xl px-4 outline-none text-xs text-white focus:border-purple-500/50 transition-all font-mono"
                  disabled={claimLoading}
                />
                <button
                  type="submit"
                  disabled={claimLoading}
                  className="h-11 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center shrink-0 disabled:opacity-50 font-sans"
                >
                  {claimLoading ? <Loader2 size={13} className="animate-spin" /> : 'Reconcile'}
                </button>
              </div>

              {claimResult.status !== 'idle' && (
                <div
                  className={`p-3 rounded-lg text-xs leading-relaxed border transition-all ${
                    claimResult.status === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400 font-sans'
                  }`}
                >
                  <p className="font-semibold uppercase tracking-wider text-[9px] mb-1 font-sans">
                    {claimResult.status === 'success' ? 'Self-Heal Success' : 'Reconciliation Failed'}
                  </p>
                  {claimResult.message}
                </div>
              )}
            </form>
          </div>
        </section>

        {/* Security & Features Banner */}
        <section className="mt-24 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-white/2 border border-white/5 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <ShieldCheck size={20} />
            </div>
            <h4 className="font-bold text-white text-sm">Secure Merchant Gateway</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">Payments are fully secured via PCI-DSS compliant direct merchant gateways.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/2 border border-white/5 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Zap size={20} />
            </div>
            <h4 className="font-bold text-white text-sm">Instant Recharge Posting</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">Your lookups adjust instantly post-checkout. Refresh dashboard to see newly posted balances.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/2 border border-white/5 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400">
              <Server size={20} />
            </div>
            <h4 className="font-bold text-white text-sm">Priority Lookup Routing</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">Premium members consume secondary intelligence pipelines optimizing access speeds.</p>
          </div>
        </section>

        {/* Support link */}
        <section className="mt-20 text-center">
          <p className="text-zinc-500 text-xs mb-3">Questions about transaction processing or customization?</p>
          <a
            href="https://t.me/Gaurav_beni_0001"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-zinc-300 transition-all"
          >
            <MessageSquare size={14} className="text-purple-400" />
            <span>Chat support on Telegram</span>
          </a>
        </section>
      </div>

      <footer className="py-20 text-center border-t border-white/5">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-4">Secured by TraceXData Infrastructure</p>
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => navigate('/contactus')} className="text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Support</button>
          <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Trace Home</button>
        </div>
      </footer>
    </div>
  );
}
