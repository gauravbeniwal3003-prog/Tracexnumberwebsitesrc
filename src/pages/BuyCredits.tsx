import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, CheckCircle2, Loader2, X, ShieldCheck, AlertCircle, IndianRupee, Plus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';
import HeaderNavbar from '../components/HeaderNavbar';
import { supabase } from '../services/supabase.ts';
import { getApiBaseUrl } from '../services/api';

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export default function BuyCredits() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{ status: 'idle' | 'success' | 'failed', message?: string }>({ status: 'idle' });

  // Self-Healing Verification State
  const [claimOrderId, setClaimOrderId] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState<{ status: 'idle' | 'success' | 'failed', message: string }>({ status: 'idle', message: '' });

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
              message: `Smart Fix: Located ${result.recoveredCount} paid order(s). Balance updated!`
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
        setClaimResult({ status: 'failed', message: resJson.error || 'Verification failed.' });
      }
    } catch (err: any) {
      setClaimResult({ status: 'failed', message: err.message || 'Connection failed.' });
    } finally {
      setClaimLoading(false);
    }
  };

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    const amtParam = searchParams.get('amount');
    if (amtParam) {
      const parsed = parseInt(amtParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setSelectedAmount(parsed);
      }
    }
    if (orderId) {
      checkPaymentStatus(orderId);
      window.history.replaceState({}, document.title, "/pricing");
    }
  }, [searchParams]);

  const checkPaymentStatus = async (orderId: string) => {
    try {
      setIsProcessing(true);
      const backendUrl = getApiBaseUrl();
      const response = await fetch(`${backendUrl.replace(/\/$/, "")}/api/cashfree/status/${orderId}`);
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Status check failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.order_status === 'PAID') {
        const addedAmount = data.order_amount || selectedAmount;
        setPaymentStatus({ 
          status: 'success', 
          message: `Payment successful! ₹${addedAmount}.00 added to your wallet balance.`
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
      setPaymentStatus({ status: 'failed', message: err.message || 'Verification failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddFunds = async (amountToPay: number) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-login'));
      return;
    }

    if (!amountToPay || amountToPay < 10) {
      alert("Please enter a valid amount (minimum ₹10)");
      return;
    }

    setIsProcessing(true);
    const backendUrl = getApiBaseUrl();

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
          plan_id: `wallet_${amountToPay}`,
          amount: amountToPay,
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
      alert(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const finalAmount = customAmountInput ? (parseInt(customAmountInput, 10) || 0) : selectedAmount;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-sky-500/20 selection:text-sky-900">
      <LiquidBackground />
      
      {/* Top Navbar */}
      <HeaderNavbar title="TRACEXDATA" subtitle="WALLET RECHARGE" />

      <div className="relative z-10 pt-6 pb-20 px-4 max-w-4xl mx-auto space-y-6">
        <div>
          <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-sky-200 text-slate-700 hover:text-sky-600 hover:border-sky-300 shadow-2xs transition-all cursor-pointer font-bold text-xs">
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <header className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-100/80 border border-sky-200 mb-4 shadow-2xs"
          >
            <Wallet size={14} className="text-sky-700" />
            <span className="text-xs font-bold uppercase tracking-widest text-sky-800">TRACEXDATA Wallet</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-black tracking-tight mb-3 text-slate-900"
          >
            Add Funds to Your Wallet
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-600 max-w-md mx-auto text-sm font-medium"
          >
            Recharge your account balance in Rupees to perform instant pay-as-you-go lookups.
          </motion.p>
        </header>

        {/* Status Messages */}
        <AnimatePresence>
          {paymentStatus.status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-5 rounded-2xl border flex items-center justify-between gap-4 overflow-hidden mb-8 shadow-sm ${
                paymentStatus.status === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span className="font-bold text-xs">{paymentStatus.message}</span>
              </div>
              <button onClick={() => setPaymentStatus({ status: 'idle' })} className="p-1 hover:bg-black/5 rounded-lg">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Recharge Card */}
        <div className="bg-white rounded-3xl border border-sky-200/80 shadow-xl overflow-hidden p-6 md:p-10 space-y-8">
          
          {/* Current Balance Display */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md shadow-blue-500/10">
            <div>
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-sky-100">Current Wallet Balance</span>
              <div className="text-4xl font-black font-mono text-white mt-1">
                ₹{profile?.credits || 0}.00
              </div>
            </div>
            <div className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-2xs">
              <ShieldCheck size={16} />
              <span>Direct Money Charges</span>
            </div>
          </div>

          {/* Amount Selection */}
          <div className="space-y-4">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <IndianRupee size={15} className="text-sky-600" />
              <span>Select Recharge Amount</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRESET_AMOUNTS.map((amt) => {
                const isSelected = selectedAmount === amt && !customAmountInput;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(amt);
                      setCustomAmountInput('');
                    }}
                    className={`py-4 px-5 rounded-2xl font-black text-lg transition-all border cursor-pointer flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-500/25 scale-[1.02]'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-sky-300 hover:bg-sky-50'
                    }`}
                  >
                    <span>₹{amt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <label htmlFor="buy-credits-custom-amount" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Plus size={15} className="text-sky-600" />
              <span>Enter Custom Amount</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">₹</span>
              <input
                id="buy-credits-custom-amount"
                type="number"
                min="10"
                max="100000"
                placeholder="Enter custom amount (e.g. 350)"
                value={customAmountInput}
                onChange={(e) => {
                  setCustomAmountInput(e.target.value);
                  if (e.target.value) {
                    setSelectedAmount(parseInt(e.target.value, 10) || 0);
                  }
                }}
                className="w-full pl-9 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-extrabold text-base focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-mono"
              />
            </div>
          </div>

          {/* Alert Note */}
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-medium flex items-start gap-3">
            <AlertCircle size={18} className="text-sky-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Money added to your wallet never expires. Every lookup on TRACEXDATA automatically charges the cost directly in Rupees from your wallet balance.
            </span>
          </div>

          {/* Action Button */}
          <button
            disabled={isProcessing || !finalAmount || finalAmount < 10}
            onClick={() => handleAddFunds(finalAmount)}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-black text-base uppercase tracking-wider shadow-lg shadow-sky-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3.5 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Redirecting to Cashfree Gateway...</span>
              </>
            ) : (
              <>
                <Wallet size={20} />
                <span>Add ₹{finalAmount || 0}.00 to Wallet</span>
              </>
            )}
          </button>
        </div>

        {/* Self-Healing Manual Order Reconciliation Form */}
        <section className="mt-12 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-md">
              <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
                <ShieldCheck size={18} className="text-sky-600" />
                Missing Payment? Self-Heal Verification
              </h3>
              <p className="text-slate-600 text-xs font-medium">
                If you completed payment but balance wasn't updated, enter your Cashfree Order ID below to reconcile immediately.
              </p>
            </div>

            <form onSubmit={handleClaimManual} className="w-full md:w-auto flex-grow max-w-sm flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={claimOrderId}
                  onChange={(e) => setClaimOrderId(e.target.value)}
                  placeholder="Order ID (e.g. order_12345)"
                  className="flex-grow h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 outline-none text-xs font-mono text-slate-900 focus:border-sky-500 focus:bg-white transition-all"
                  disabled={claimLoading}
                />
                <button
                  type="submit"
                  disabled={claimLoading}
                  className="h-11 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center shrink-0 cursor-pointer"
                >
                  {claimLoading ? <Loader2 size={14} className="animate-spin" /> : 'Claim'}
                </button>
              </div>

              {claimResult.status !== 'idle' && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    claimResult.status === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  {claimResult.message}
                </div>
              )}
            </form>
          </div>
        </section>

      </div>
    </div>
  );
}
