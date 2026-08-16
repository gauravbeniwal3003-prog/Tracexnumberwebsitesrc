/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Check, Loader2, Phone, ShieldAlert, MessageSquare, Car, FileText, Mail, UserCheck } from 'lucide-react';
import { useAuth } from '../services/AuthContext.tsx';
import { PROTECTION_PRICES } from '../types.ts';
import { cleanIndianPhoneNumber } from '../services/utils.ts';
import { supabase } from '../services/supabase.ts';
import { getApiBaseUrl } from '../services/api.ts';

export type ProtectTabType = 'mobile' | 'telegram' | 'adhr' | 'vehicle' | 'veh_owner_num' | 'email';

interface ProtectNumberModalProps {
  onClose: () => void;
  initialTab?: ProtectTabType;
}

export default function ProtectNumberModal({ onClose, initialTab = 'mobile' }: ProtectNumberModalProps) {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<ProtectTabType>(initialTab);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const getPrice = () => {
    return 99; // Each feature protection costs ₹99
  };

  const getLabel = () => {
    switch (activeTab) {
      case 'mobile': return 'Mobile Number (10 Digits)';
      case 'telegram': return 'Telegram Username / User ID';
      case 'adhr': return 'Aadhaar Card Number (12 Digits)';
      case 'vehicle': return 'Vehicle Reg Number (RC)';
      case 'veh_owner_num': return 'Vehicle Number for Owner';
      case 'email': return 'Email Address (@gmail.com)';
      default: return 'Record Identifier';
    }
  };

  const getPlaceholder = () => {
    switch (activeTab) {
      case 'mobile': return '9876543210';
      case 'telegram': return '@username or 7850023357';
      case 'adhr': return '998877665544';
      case 'vehicle': return 'DL01AB1234';
      case 'veh_owner_num': return 'HR60E3838';
      case 'email': return 'user@gmail.com';
      default: return 'Enter value...';
    }
  };

  const getMaxInputLength = () => {
    if (activeTab === 'mobile') return 10;
    if (activeTab === 'adhr') return 12;
    if (activeTab === 'vehicle' || activeTab === 'veh_owner_num') return 11;
    return 100;
  };

  const handleInputChange = (val: string) => {
    if (activeTab === 'mobile') {
      const clean = val.replace(/\D/g, '').slice(0, 10);
      setInputValue(clean);
    } else if (activeTab === 'adhr') {
      const clean = val.replace(/\D/g, '').slice(0, 12);
      setInputValue(clean);
    } else if (activeTab === 'vehicle' || activeTab === 'veh_owner_num') {
      const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 11);
      setInputValue(clean);
    } else if (activeTab === 'email') {
      setInputValue(val.trim());
    } else {
      setInputValue(val);
    }
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

    // Smart Validation Logics
    if (activeTab === 'mobile') {
      const cleanVal = inputValue.replace(/\D/g, '');
      if (cleanVal.length !== 10) {
        alert("Mobile number must be strictly 10 digits");
        return;
      }
    } else if (activeTab === 'telegram') {
      const cleanVal = inputValue.replace(/^@/, '').trim();
      if (cleanVal.length < 3) {
        alert("Telegram handle/ID must be at least 3 characters");
        return;
      }
    } else if (activeTab === 'adhr') {
      const cleanVal = inputValue.replace(/\D/g, '');
      if (cleanVal.length !== 12) {
        alert("Aadhaar number must be strictly 12 digits");
        return;
      }
    } else if (activeTab === 'email') {
      const cleanVal = inputValue.trim().toLowerCase();
      if (!cleanVal.includes('@gmail.com')) {
        alert("Email query cannot be sent without @gmail.com");
        return;
      }
    } else if (activeTab === 'vehicle' || activeTab === 'veh_owner_num') {
      const cleanVal = inputValue.replace(/[^a-zA-Z0-9]/g, '');
      if (cleanVal.length < 6 || cleanVal.length > 11) {
        alert("Please enter a valid Vehicle Registration Number");
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

  const tabs: { id: ProtectTabType; label: string; icon: any }[] = [
    { id: 'mobile', label: 'Mobile', icon: Phone },
    { id: 'telegram', label: 'Telegram', icon: MessageSquare },
    { id: 'adhr', label: 'Aadhaar', icon: FileText },
    { id: 'vehicle', label: 'Vehicle RC', icon: Car },
    { id: 'veh_owner_num', label: 'Vehicle Owner', icon: UserCheck },
    { id: 'email', label: 'Email', icon: Mail },
  ];

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
        className="glass-card w-full max-w-lg p-6 sm:p-8 relative z-10 bg-white border-sky-200 shadow-[0_20px_50px_rgba(14,165,233,0.15)] rounded-3xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer">
          <X size={20} />
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-200">
              <Check size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Request Processed!</h2>
            <p className="text-slate-600 text-sm font-medium">Your record protection is being activated on TRACEXDATA.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-sky-200 shadow-sm">
                <ShieldCheck size={28} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1 uppercase tracking-tight">TraceX Record Protection</h2>
              <p className="text-slate-600 text-xs sm:text-sm font-medium">Protect your personal records & details from being searched on our site.</p>
            </div>

            {/* Selection Tabs Grid */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 mb-5">
              {tabs.map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setActiveTab(tab.id); setInputValue(''); }}
                    className={`py-2 px-1 text-[10px] sm:text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${isActive ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'}`}
                  >
                    <IconComp size={12} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-5">
              <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-100 shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Protection Validity</span>
                  <span className="text-sky-700 font-extrabold text-xs sm:text-sm">Lifetime Guard 🛡️</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Protection Fee</span>
                  <span className="text-slate-900 font-black text-lg sm:text-xl">₹99.00</span>
                </div>
              </div>

              <form onSubmit={handleProtect} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">{getLabel()}</label>
                  <div className="relative">
                    {activeTab === 'mobile' && <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />}
                    {activeTab === 'telegram' && <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />}
                    {activeTab === 'adhr' && <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />}
                    {(activeTab === 'vehicle' || activeTab === 'veh_owner_num') && <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />}
                    {activeTab === 'email' && <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />}

                    <input
                      required
                      type="text"
                      maxLength={getMaxInputLength()}
                      value={inputValue}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder={getPlaceholder()}
                      className="w-full bg-slate-50 border border-sky-200 rounded-xl px-12 py-3 focus:outline-none focus:bg-white focus:border-sky-500 transition-all text-slate-900 font-mono font-medium text-sm"
                    />
                  </div>
                </div>

                <button
                  disabled={loading || !inputValue}
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-extrabold flex items-center justify-center gap-2 hover:from-sky-600 hover:to-blue-700 transition-all disabled:opacity-50 shadow-md cursor-pointer text-sm"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <span>Activate Protection (₹99)</span>
                      <ShieldAlert size={18} />
                    </>
                  )}
                </button>
              </form>

              <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest leading-relaxed font-bold">
                Once protected, searching this record on dashboard or API will show a TRACEXDATA Protection shield message.
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
