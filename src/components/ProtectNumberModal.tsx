/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Check, Loader2, Phone, ShieldAlert, MessageSquare, Car } from 'lucide-react';
import { useAuth } from '../services/AuthContext.tsx';
import { PROTECTION_PRICES } from '../types.ts';
import { cleanIndianPhoneNumber } from '../services/utils.ts';
import { supabase } from '../services/supabase.ts';
import { getApiBaseUrl } from '../services/api.ts';

interface ProtectNumberModalProps {
  onClose: () => void;
  initialTab?: 'mobile' | 'telegram';
}

export default function ProtectNumberModal({ onClose, initialTab = 'mobile' }: ProtectNumberModalProps) {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'mobile' | 'telegram'>(initialTab);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const getPrice = () => {
    if (activeTab === 'mobile') return PROTECTION_PRICES.mobile;
    return PROTECTION_PRICES.telegram;
  };

  const getLabel = () => {
    if (activeTab === 'mobile') return 'Mobile Number';
    return 'Telegram User ID';
  };

  const getPlaceholder = () => {
    if (activeTab === 'mobile') return '9876543210';
    return '7850023357';
  };

  const handleProtect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to protect your record");
      return;
    }

    if (!inputValue.trim()) {
      alert(`Please enter a valid ${getLabel()}`);
      return;
    }

    if (activeTab === 'mobile') {
      const cleanVal = inputValue.replace(/\D/g, '');
      if (cleanVal.length !== 10) {
        alert("Please enter a valid 10-digit mobile number");
        return;
      }
    } else if (activeTab === 'telegram') {
      const cleanVal = inputValue.replace(/^@/, '').trim();
      if (cleanVal.length < 3) {
        alert("Telegram handle/ID must be at least 3 characters");
        return;
      }
    }

    setLoading(true);
    const backendUrl = getApiBaseUrl();

    const finalAmount = getPrice();

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
          plan_id: `protect_${activeTab}_${inputValue.trim()}`,
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
          console.error("Backend Error:", text.substring(0, 200));
          throw new Error(`Payment Gateway Error (${response.status}). Please check logs.`);
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
        throw new Error('Payment session could not be created.');
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
      alert(err.message || 'Something went wrong with Cashfree checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="glass-card w-full max-w-md p-8 relative z-10 bg-white border-sky-200 shadow-[0_20px_50px_rgba(14,165,233,0.15)]"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer">
          <X size={20} />
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-200">
              <Check size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Request Shared!</h2>
            <p className="text-slate-600 text-sm font-medium">Your security request has been sent for manual authorization.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-sky-200 shadow-sm">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">TraceX Security</h2>
              <p className="text-slate-600 text-sm font-medium">Stop anyone from finding your details or records on our platform.</p>
            </div>

            {/* Selection Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200 mb-6">
              <button
                type="button"
                onClick={() => { setActiveTab('mobile'); setInputValue(''); }}
                className={`py-2 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer ${activeTab === 'mobile' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Mobile
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('telegram'); setInputValue(''); }}
                className={`py-2 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer ${activeTab === 'telegram' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Telegram
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-100 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Protection Active</span>
                  <span className="text-sky-700 font-extrabold text-sm">Lifetime</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Pricing</span>
                  <span className="text-slate-900 font-black text-xl">₹{getPrice()}</span>
                </div>
              </div>

              <form onSubmit={handleProtect} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{getLabel()}</label>
                  <div className="relative">
                    {activeTab === 'mobile' && <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />}
                    {activeTab === 'telegram' && <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />}
                    
                    <input
                      required
                      type="text"
                      value={inputValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'mobile') {
                          setInputValue(cleanIndianPhoneNumber(val));
                        } else {
                          setInputValue(val.trim());
                        }
                      }}
                      placeholder={getPlaceholder()}
                      className="w-full bg-slate-50 border border-sky-200 rounded-xl px-12 py-3 focus:outline-none focus:bg-white focus:border-sky-500 transition-all text-slate-900 font-mono font-medium"
                    />
                  </div>
                </div>

                <button
                  disabled={loading || !inputValue}
                  type="submit"
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-extrabold flex items-center justify-center gap-2 hover:from-sky-600 hover:to-blue-700 transition-all disabled:opacity-50 shadow-md cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <span>Activate Protection</span>
                      <ShieldAlert size={20} />
                    </>
                  )}
                </button>
              </form>

              <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest leading-relaxed font-bold">
                Once protected, your record will be locked and hidden from all searches forever.
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
