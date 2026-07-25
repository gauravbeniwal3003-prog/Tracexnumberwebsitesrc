/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, Zap, CheckCircle2, ShieldCheck, Loader2, AlertCircle, Server } from 'lucide-react';
import { CREDIT_PLANS, UNLIMITED_PLANS, API_PLANS, PricingPlan, SPECIAL_DEAL_PLAN } from '../types.ts';
import { useAuth } from '../services/AuthContext.tsx';
import { supabase } from '../services/supabase.ts';
import { getOfferStatus, getPlanPrice } from '../services/promo.ts';
import { getApiBaseUrl } from '../services/api.ts';

interface SubscriptionModalProps {
  onClose: () => void;
  initialPayment?: { planId: string; amount: number; type: string };
}

declare global {
  interface Window {
    Cashfree: any;
  }
}

export default function SubscriptionModal({ onClose, initialPayment }: SubscriptionModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{ status: 'idle' | 'success' | 'failed', message?: string }>({ status: 'idle' });

  const [purchasedApiKey, setPurchasedApiKey] = useState<string | null>(null);
  const [purchasedPlanName, setPurchasedPlanName] = useState<string | null>(null);

  // Handle URL parameters for redirect confirmation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    
    if (orderId) {
      checkPaymentStatus(orderId);
      // Clean up URL
      window.history.replaceState({}, document.title, "/");
    }

    const handleExternalPayment = (e: any) => {
      const { planId } = e.detail;
      const allPlans = [...CREDIT_PLANS, ...UNLIMITED_PLANS, ...API_PLANS, SPECIAL_DEAL_PLAN];
      const plan = allPlans.find(p => p.id === planId);
      if (plan) handlePurchase(plan);
    };

    if (initialPayment) {
      const allPlans = [...CREDIT_PLANS, ...UNLIMITED_PLANS, ...API_PLANS, SPECIAL_DEAL_PLAN];
      const plan = allPlans.find(p => p.id === initialPayment.planId);
      if (plan) {
         // Tiny delay to ensure modal is ready
         setTimeout(() => handlePurchase(plan), 500);
      }
    }

    window.addEventListener('launch-payment', handleExternalPayment);
    return () => window.removeEventListener('launch-payment', handleExternalPayment);
  }, [initialPayment]);

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
        const isProtectOrder = data.plan_id && data.plan_id.startsWith('protect_');
        const isApiOrder = !isProtectOrder && (initialPayment?.type === 'api' || data.order_id.includes('api') || (data.plan_id && data.plan_id.startsWith('api_')) || (data.order_id.includes('order_') && !data.plan_id));
        
        if (isApiOrder && user) {
          try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token || '';
            const keysResponse = await fetch(`${getApiBaseUrl()}/api/user-keys`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (keysResponse.ok) {
              const keys = await keysResponse.json();
              if (keys && keys.length > 0) {
                setPurchasedApiKey(keys[0].api_key);
                setPurchasedPlanName(keys[0].plan_name);
              }
            }
          } catch (keysErr) {
            console.error("Failed to fetch generated key from backend:", keysErr);
          }
        }

        let successMessage = 'Payment successful! Your credits/unlimited plan have been updated successfully.';
        if (isProtectOrder) {
          successMessage = 'Payment successful! Your target record is now fully protected and hidden on TRACEXDATA. 🛡️';
        } else if (isApiOrder) {
          successMessage = 'Payment successful! Your API Key has been generated.';
        }

        setPaymentStatus({ 
          status: 'success', 
          message: successMessage
        });
        
        // Instant refresh
        await refreshProfile();
        
        // Back-up refresh after 2 seconds to ensure database consistency
        setTimeout(async () => {
          await refreshProfile();
        }, 2000);
      } else {
        setPaymentStatus({ status: 'failed', message: `Payment ${data.order_status}. Please try again.` });
      }
    } catch (err: any) {
      console.error('Error checking payment status:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchase = async (plan: PricingPlan) => {
    if (!user) {
      alert("Please sign in to continue");
      return;
    }

    setIsProcessing(true);
    const backendUrl = getApiBaseUrl();

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
          return_url: `${window.location.origin}?order_id={order_id}`
        })
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.detail || `Server error: ${response.status}`);
        } else {
          const text = await response.text();
          console.error("Backend HTML Error:", text.substring(0, 200));
          throw new Error(`Payment Gateway Technical Error (${response.status}). Please check your Render backend logs.`);
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

      // Initialize Cashfree
      const cashfree = window.Cashfree({
        mode: "production" 
      });

      await cashfree.checkout({
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: "_self" 
      });

    } catch (err: any) {
      console.error('Payment Error Details:', err);
      const isNotFound = err.message?.includes('404') || err.message?.includes('Not Found');
      const msg = isNotFound 
        ? `Backend API not found. Please ensure your Render backend is deployed with the latest code.\nTarget: ${backendUrl}`
        : (err.message || 'Something went wrong. Please try again.');
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative z-10 border-sky-200 bg-white shadow-[0_20px_60px_rgba(14,165,233,0.15)]"
      >
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-500 animate-gradient-x" />
        
        <div className="p-6 md:p-8 border-b border-sky-100 flex items-center justify-between bg-sky-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center border border-sky-200">
              <Zap className="text-sky-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Upgrade Intelligence</h2>
              <p className="text-slate-600 text-xs md:text-sm font-medium">Power your searches with premium data throughput</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 items-center gap-2 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">Secure Gateway Active</span>
            </div>
            <button 
              onClick={onClose} 
              className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-all border border-slate-200 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-8 pt-4 md:hidden">
          <div className="px-4 py-3 rounded-xl bg-sky-50 border border-sky-200 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-sky-600 animate-pulse shrink-0" />
            <span className="text-[9px] font-bold text-sky-800 uppercase tracking-[0.1em]">Secure payment gateway active. Fast processing.</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-10 custom-scrollbar bg-white">
          {/* Status Messages */}
          <AnimatePresence>
            {paymentStatus.status !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-6 rounded-2xl border flex flex-col gap-4 overflow-hidden shadow-sm ${
                  paymentStatus.status === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span className="font-bold uppercase tracking-wider text-[10px]">{paymentStatus.message}</span>
                  </div>
                  <button onClick={() => setPaymentStatus({ status: 'idle' })} className="p-1 hover:bg-black/5 rounded-full">
                    <X size={14} />
                  </button>
                </div>

                {purchasedApiKey && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-md"
                  >
                    <div>
                      <div className="text-[10px] uppercase font-bold text-sky-400 tracking-widest mb-2">Your Private API Key</div>
                      <div className="flex items-center gap-3">
                        <code className="flex-1 p-3 rounded-lg bg-slate-950 text-emerald-400 font-mono text-sm border border-slate-800 break-all">
                          {purchasedApiKey}
                        </code>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(purchasedApiKey);
                            alert('API Key copied to clipboard!');
                          }}
                          className="px-4 py-3 rounded-lg bg-sky-500 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-sky-600 transition-all shrink-0 cursor-pointer shadow-sm"
                        >
                          Copy Key
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Endpoint Example</div>
                      <div className="flex items-center gap-3">
                        <code className="flex-1 p-3 rounded-lg bg-slate-950 text-slate-300 font-mono text-[10px] border border-slate-800 break-all">
                          {(() => {
                            const planUpper = String(purchasedPlanName || "").toUpperCase();
                            if (planUpper.includes("TELEGRAM")) {
                              return `${getApiBaseUrl().replace(/\/$/, "")}/api/telegram?key=${purchasedApiKey}&api=gaurav_beniwal_0001`;
                            } else if (planUpper.includes("VEH_OWNER") || planUpper.includes("VEH_NUMM") || planUpper.includes("VEHICLE TO OWNER") || planUpper.includes("OWNER")) {
                              return `${getApiBaseUrl().replace(/\/$/, "")}/api/veh-owner-num?key=${purchasedApiKey}&query=BR07PB6268`;
                            } else if (planUpper.includes("VEHICLE")) {
                              return `${getApiBaseUrl().replace(/\/$/, "")}/api/vehicle?key=${purchasedApiKey}&query=BR07PB6268`;
                            } else if (planUpper.includes("PAN") || planUpper.includes("PN")) {
                              return `${getApiBaseUrl().replace(/\/$/, "")}/api/pancard?key=${purchasedApiKey}&query=NTEPK1628C`;
                            } else if (planUpper.includes("ADHR") || planUpper.includes("IDENTITY") || planUpper.includes("AADH")) {
                              return `${getApiBaseUrl().replace(/\/$/, "")}/api/identity?key=${purchasedApiKey}&query=381933049732`;
                            } else if (planUpper.includes("BNK") || planUpper.includes("BANK")) {
                              return `${getApiBaseUrl().replace(/\/$/, "")}/api/bank?key=${purchasedApiKey}&query=ABCD0001325`;
                            } else if (planUpper.includes("EMAIL") || planUpper.includes("MAIL")) {
                              return `${getApiBaseUrl().replace(/\/$/, "")}/api/email?key=${purchasedApiKey}&query=gauravbeniwal303@gmail.com`;
                            } else {
                              return `${getApiBaseUrl().replace(/\/$/, "")}/api/lookup?key=${purchasedApiKey}&number=9879712345`;
                            }
                          })()}
                        </code>
                        <button 
                          onClick={() => {
                            const planUpper = String(purchasedPlanName || "").toUpperCase();
                            let targetUrl = "";
                            if (planUpper.includes("TELEGRAM")) {
                              targetUrl = `${getApiBaseUrl().replace(/\/$/, "")}/api/telegram?key=${purchasedApiKey}&api=gaurav_beniwal_0001`;
                            } else if (planUpper.includes("VEH_OWNER") || planUpper.includes("VEH_NUMM") || planUpper.includes("VEHICLE TO OWNER") || planUpper.includes("OWNER")) {
                              targetUrl = `${getApiBaseUrl().replace(/\/$/, "")}/api/veh-owner-num?key=${purchasedApiKey}&query=BR07PB6268`;
                            } else if (planUpper.includes("VEHICLE")) {
                              targetUrl = `${getApiBaseUrl().replace(/\/$/, "")}/api/vehicle?key=${purchasedApiKey}&query=BR07PB6268`;
                            } else if (planUpper.includes("PAN") || planUpper.includes("PN")) {
                              targetUrl = `${getApiBaseUrl().replace(/\/$/, "")}/api/pancard?key=${purchasedApiKey}&query=NTEPK1628C`;
                            } else if (planUpper.includes("ADHR") || planUpper.includes("IDENTITY") || planUpper.includes("AADH")) {
                              targetUrl = `${getApiBaseUrl().replace(/\/$/, "")}/api/identity?key=${purchasedApiKey}&query=381933049732`;
                            } else if (planUpper.includes("BNK") || planUpper.includes("BANK")) {
                              targetUrl = `${getApiBaseUrl().replace(/\/$/, "")}/api/bank?key=${purchasedApiKey}&query=ABCD0001325`;
                            } else if (planUpper.includes("EMAIL") || planUpper.includes("MAIL")) {
                              targetUrl = `${getApiBaseUrl().replace(/\/$/, "")}/api/email?key=${purchasedApiKey}&query=gauravbeniwal303@gmail.com`;
                            } else {
                              targetUrl = `${getApiBaseUrl().replace(/\/$/, "")}/api/lookup?key=${purchasedApiKey}&number=9879712345`;
                            }
                            navigator.clipboard.writeText(targetUrl);
                            alert('Example URL copied to clipboard!');
                          }}
                          className="px-4 py-3 rounded-lg bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700 shrink-0 cursor-pointer"
                        >
                          Copy URL
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-[10px] pt-1">
                      <ShieldCheck size={12} className="text-sky-400" />
                      Keep this key secure. It provides direct access to TraceX Intelligence.
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {/* Credit Plans */}
          <section>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-2 text-sky-700 font-bold uppercase tracking-[0.2em] text-[10px]">
                <CreditCard size={12} className="md:w-3.5 md:h-3.5" />
                Precision Credits
              </div>
              <div className="h-px flex-1 bg-sky-100 ml-4" />
            </div>

            <div className="p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10px] md:text-xs font-mono flex items-center gap-2.5 shadow-sm">
              <Server size={14} className="shrink-0 animate-pulse text-amber-600" />
              <span>
                <strong>VPS &amp; MAINTENANCE COST NOTICE:</strong> These credit costs purely cover our high performance website hosting, VPS, and API data maintenance costs, not for earning profit.
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-5">
              {CREDIT_PLANS.map((plan) => {
                const discountedPrice = getPlanPrice(plan);
                return (
                  <motion.div 
                    key={plan.id} 
                    whileHover={{ y: -5 }}
                    className="p-3 md:p-6 rounded-2xl md:rounded-3xl bg-slate-50/80 border border-sky-100 hover:border-sky-300 hover:bg-sky-50/50 transition-all group relative overflow-hidden flex flex-col shadow-sm"
                  >
                    <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <CreditCard size={32} className="md:w-16 md:h-16 text-sky-600" />
                    </div>

                    <div className="absolute top-1.5 right-1.5 bg-red-100 text-[6px] md:text-[8px] font-extrabold uppercase text-red-800 px-1 py-0.5 rounded border border-red-300 tracking-widest animate-pulse">
                      50% OFF
                    </div>
                    
                    <div className="mb-3 md:mb-6">
                      <h3 className="text-[10px] md:text-sm font-bold text-slate-600 mb-0.5 md:mb-1 uppercase tracking-wider truncate">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 flex-wrap">
                        <span className="text-xl md:text-3xl font-black text-slate-900">₹{discountedPrice}</span>
                        {discountedPrice !== plan.price && (
                          <span className="text-xs text-slate-400 line-through font-semibold">₹{plan.price}</span>
                        )}
                        <span className="text-[8px] md:text-xs text-slate-500 font-mono ml-1 font-bold">/ {plan.value}c</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-3 mb-4 md:mb-8 hidden xs:block">
                      <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-xs text-slate-700 font-medium">
                        <CheckCircle2 size={10} className="md:w-3.5 md:h-3.5 text-sky-600" />
                        <span className="truncate">{plan.value} Searches</span>
                      </div>
                    </div>

                    <button 
                      disabled={isProcessing}
                      onClick={() => handlePurchase(plan)}
                      className="mt-auto w-full py-2 md:py-3 bg-white border border-sky-200 group-hover:bg-sky-600 group-hover:text-white transition-all rounded-xl md:rounded-2xl text-[9px] md:text-xs font-extrabold text-slate-800 group-hover:border-transparent tracking-widest uppercase flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      {isProcessing ? <Loader2 size={14} className="animate-spin" /> : 'Select'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Unlimited Plans */}
          <section>
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="flex items-center gap-2 text-blue-700 font-bold uppercase tracking-[0.2em] text-[10px]">
                <Zap size={12} className="md:w-3.5 md:h-3.5" />
                Elite Subscriptions
              </div>
              <div className="h-px flex-1 bg-sky-100 ml-4" />
            </div>

            <div className="p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10px] md:text-xs font-mono flex items-center gap-2.5 shadow-sm">
              <AlertCircle size={14} className="shrink-0 text-amber-600" />
              <span>
                <strong>CRITICAL NOTICE:</strong> Aadhaar to PAN lookup is <strong>strictly excluded</strong> from all Unlimited Plans. Aadhaar to PAN lookup costs 150 Credits per query.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {UNLIMITED_PLANS.map((plan) => {
                const discountedPrice = getPlanPrice(plan);
                return (
                  <motion.div 
                    key={plan.id} 
                    whileHover={{ scale: 1.02 }}
                    className={`p-5 md:p-8 rounded-2xl md:rounded-[32px] relative overflow-hidden group transition-all duration-500 shadow-sm ${
                      plan.id === 'unlimited_24h' 
                        ? 'bg-gradient-to-br from-sky-50 to-blue-100/60 border border-sky-300' 
                        : 'bg-slate-50/80 border border-sky-100 hover:border-sky-300'
                    }`}
                  >
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4 md:mb-8">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-2">
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 border border-sky-300 text-[8px] md:text-[10px] font-extrabold text-sky-800 uppercase tracking-widest">
                              {plan.id === 'unlimited_24h' ? 'Popular' : 'Elite'}
                            </div>
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 border border-red-300 text-[8px] md:text-[10px] font-extrabold text-red-700 uppercase tracking-widest animate-pulse">
                              50% OFF
                            </div>
                          </div>
                          <h3 className="text-lg md:text-2xl font-black text-slate-900 mb-0.5 md:mb-1 tracking-tight">{plan.name}</h3>
                          <div className="flex items-baseline gap-1 flex-wrap">
                            <span className="text-2xl md:text-4xl font-black text-slate-900">₹{discountedPrice}</span>
                            {discountedPrice !== plan.price && (
                              <span className="text-sm text-slate-400 line-through font-semibold">₹{plan.price}</span>
                            )}
                            <span className="text-slate-500 text-[10px] md:text-sm font-semibold">/ period</span>
                          </div>
                        </div>
                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white flex items-center justify-center border border-sky-200 shadow-sm">
                          <Zap className={`${plan.id === 'unlimited_24h' ? 'text-amber-500' : 'text-sky-600'} w-5 h-5 md:w-7 md:h-7`} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-1 gap-2 md:gap-4 mb-6 md:mb-10">
                        <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-800 font-semibold">
                          <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-sky-100 flex items-center justify-center border border-sky-200 shrink-0">
                            <CheckCircle2 size={10} className="md:w-3 text-sky-600" />
                          </div>
                          <span className="truncate">Unlimited Search</span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-800 font-semibold">
                          <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-sky-100 flex items-center justify-center border border-sky-200 shrink-0">
                            <CheckCircle2 size={10} className="md:w-3 text-sky-600" />
                          </div>
                          <span className="truncate">Full Record Visibility</span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-amber-800 font-extrabold">
                          <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-amber-100 flex items-center justify-center border border-amber-200 shrink-0">
                            <AlertCircle size={10} className="md:w-3 text-amber-600" />
                          </div>
                          <span className="truncate">Excludes Aadhaar to PAN</span>
                        </div>
                      </div>

                      <button 
                        disabled={isProcessing}
                        onClick={() => handlePurchase(plan)}
                        className={`mt-auto w-full py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-sm font-black tracking-widest uppercase transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                          plan.id === 'unlimited_24h'
                            ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700 active:scale-[0.98]'
                            : 'bg-white border border-sky-200 text-slate-800 hover:bg-sky-600 hover:text-white active:scale-[0.98]'
                        }`}
                      >
                        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Unlock Access'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* API Plans (Marketplace Sync) */}
          {initialPayment?.type === 'api' && (
            <section>
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-2 text-sky-700 font-bold uppercase tracking-[0.2em] text-[10px]">
                  <ShieldCheck size={12} className="md:w-3.5 md:h-3.5" />
                  API Gateway License
                </div>
                <div className="h-px flex-1 bg-sky-100 ml-4" />
              </div>

              <div className="p-6 md:p-10 rounded-[32px] bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 relative overflow-hidden group shadow-sm">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Zap size={120} className="text-sky-600" />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">
                      {API_PLANS.find(p => p.id === initialPayment.planId)?.name || 'Selected API Plan'}
                    </h3>
                    <p className="text-slate-600 text-sm mb-6 max-w-md font-medium">You are purchasing a secure API gateway key. Fulfillment is instant after verification.</p>
                    <div className="flex flex-wrap gap-4">
                      {['High Throughput', '99.9% Uptime', 'JSON Results'].map(f => (
                        <div key={f} className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-extrabold text-slate-700">
                           <div className="w-2 h-2 rounded-full bg-sky-600" />
                           {f}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-center md:text-right">
                    <div className="text-4xl font-black text-slate-900 mb-1">₹{initialPayment.amount}</div>
                    <div className="text-slate-500 text-xs mb-6 uppercase tracking-widest font-bold">One-time payment</div>
                    <button
                      disabled={isProcessing}
                      onClick={() => {
                        const plan = API_PLANS.find(p => p.id === initialPayment.planId);
                        if (plan) handlePurchase(plan);
                      }}
                      className="px-12 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-extrabold text-sm hover:from-sky-600 hover:to-blue-700 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Order'}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
        
        {/* Footer Info */}
        <div className="p-4 bg-sky-50 border-t border-sky-100 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Secure Encrypted Checkout • Power by TRACEXDATA</p>
        </div>
      </motion.div>
    </div>
  );
}
