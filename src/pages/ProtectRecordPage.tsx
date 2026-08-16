/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, ShieldAlert, Phone, MessageSquare, FileText, Car, UserCheck, 
  Mail, Check, Loader2, ArrowRight, Lock, EyeOff, Search, HelpCircle, 
  Sparkles, ExternalLink, Shield, AlertCircle, RefreshCw, Zap, CheckCircle2, ArrowLeft
} from 'lucide-react';
import HeaderNavbar from '../components/HeaderNavbar.tsx';
import LiquidBackground from '../components/LiquidBackground.tsx';
import { useAuth } from '../services/AuthContext.tsx';
import { getApiBaseUrl } from '../services/api.ts';
import { supabase } from '../services/supabase.ts';
import { useSearchParams, useNavigate } from 'react-router-dom';

export type ProtectTabType = 'mobile' | 'telegram' | 'adhr' | 'vehicle' | 'veh_owner_num' | 'email';

export default function ProtectRecordPage() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabParam = (searchParams.get('tab') as ProtectTabType) || 'mobile';
  const [activeTab, setActiveTab] = useState<ProtectTabType>(tabParam);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Verifier State
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyType, setVerifyType] = useState<ProtectTabType>('mobile');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ checked: boolean; isProtected: boolean; query: string } | null>(null);

  // Synchronize tab state if URL query param changes
  useEffect(() => {
    if (searchParams.get('tab')) {
      const t = searchParams.get('tab') as ProtectTabType;
      if (['mobile', 'telegram', 'adhr', 'vehicle', 'veh_owner_num', 'email'].includes(t)) {
        setActiveTab(t);
      }
    }
  }, [searchParams]);

  const tabs: { id: ProtectTabType; label: string; icon: any; placeholder: string; helper: string; example: string }[] = [
    { 
      id: 'mobile', 
      label: 'Mobile Number', 
      icon: Phone, 
      placeholder: 'Enter 10-digit mobile number (e.g. 9876543210)', 
      helper: 'Strictly 10 digits required.',
      example: '9876543210' 
    },
    { 
      id: 'telegram', 
      label: 'Telegram Handle / ID', 
      icon: MessageSquare, 
      placeholder: 'Enter Telegram username or User ID (e.g. @username)', 
      helper: 'Min 3 characters. Accepts @handle or numerical user ID.',
      example: '@username or 7850023357' 
    },
    { 
      id: 'adhr', 
      label: 'Aadhaar Number', 
      icon: FileText, 
      placeholder: 'Enter 12-digit Aadhaar number (e.g. 998877665544)', 
      helper: 'Strictly 12 digits required.',
      example: '998877665544' 
    },
    { 
      id: 'vehicle', 
      label: 'Vehicle RC Reg', 
      icon: Car, 
      placeholder: 'Enter Vehicle Number (e.g. DL01AB1234)', 
      helper: 'Standard Indian Vehicle Registration Number format.',
      example: 'DL01AB1234' 
    },
    { 
      id: 'veh_owner_num', 
      label: 'Vehicle Owner', 
      icon: UserCheck, 
      placeholder: 'Enter Vehicle Registration Number for Owner Lock', 
      helper: 'Protects Vehicle Owner record details.',
      example: 'HR60E3838' 
    },
    { 
      id: 'email', 
      label: 'Email Address', 
      icon: Mail, 
      placeholder: 'Enter Email Address (must include @gmail.com)', 
      helper: 'Requires @gmail.com address for query shielding.',
      example: 'user@gmail.com' 
    },
  ];

  const currentTabInfo = tabs.find(t => t.id === activeTab) || tabs[0];

  const getMaxInputLength = () => {
    if (activeTab === 'mobile') return 10;
    if (activeTab === 'adhr') return 12;
    if (activeTab === 'vehicle' || activeTab === 'veh_owner_num') return 11;
    return 100;
  };

  const handleInputChange = (val: string) => {
    setErrorMessage(null);
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

  const handleProtectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      window.dispatchEvent(new CustomEvent('open-login'));
      return;
    }

    if (!inputValue.trim()) {
      setErrorMessage(`Please enter a valid ${currentTabInfo.label}`);
      return;
    }

    // Smart Validation Checks
    if (activeTab === 'mobile') {
      const cleanVal = inputValue.replace(/\D/g, '');
      if (cleanVal.length !== 10) {
        setErrorMessage("Mobile number must be strictly 10 digits");
        return;
      }
    } else if (activeTab === 'telegram') {
      const cleanVal = inputValue.replace(/^@/, '').trim();
      if (cleanVal.length < 3) {
        setErrorMessage("Telegram handle/ID must be at least 3 characters");
        return;
      }
    } else if (activeTab === 'adhr') {
      const cleanVal = inputValue.replace(/\D/g, '');
      if (cleanVal.length !== 12) {
        setErrorMessage("Aadhaar number must be strictly 12 digits");
        return;
      }
    } else if (activeTab === 'email') {
      const cleanVal = inputValue.trim().toLowerCase();
      if (!cleanVal.includes('@gmail.com')) {
        setErrorMessage("Email query cannot be sent without @gmail.com");
        return;
      }
    } else if (activeTab === 'vehicle' || activeTab === 'veh_owner_num') {
      const cleanVal = inputValue.replace(/[^a-zA-Z0-9]/g, '');
      if (cleanVal.length < 6 || cleanVal.length > 11) {
        setErrorMessage("Please enter a valid Vehicle Registration Number (e.g. DL01AB1234)");
        return;
      }
    }

    setLoading(true);
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
          plan_id: `protect_${activeTab}_${inputValue.trim()}`,
          amount: 99,
          customer_phone: profile?.mobile || '9999999999',
          customer_name: profile?.name || user.email?.split('@')[0],
          return_url: `${window.location.origin}/protect?order_id={order_id}`
        })
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.detail || `Server error: ${response.status}`);
        } else {
          throw new Error(`Payment gateway communication error (${response.status}). Please try again.`);
        }
      }

      const orderData = await response.json();
      if (orderData.error) throw new Error(orderData.error);
      if (!orderData.payment_session_id) throw new Error('Payment session could not be created.');

      // Check if Cashfree SDK loaded
      if (typeof window.Cashfree === 'function') {
        const cashfree = window.Cashfree({ mode: "production" });
        await cashfree.checkout({
          paymentSessionId: orderData.payment_session_id,
          redirectTarget: "_self"
        });
      } else {
        throw new Error("Payment gateway SDK is loading. Please try again in 5 seconds.");
      }

    } catch (err: any) {
      console.error('Payment Initialization Error:', err);
      setErrorMessage(err.message || 'Something went wrong while initiating checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;

    setVerifyLoading(true);
    setVerifyResult(null);

    try {
      const backendUrl = getApiBaseUrl();
      const response = await fetch(`${backendUrl.replace(/\/$/, "")}/api/check-protected`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: verifyType, query: verifyInput.trim() })
      });

      if (!response.ok) {
        throw new Error('Verification service temporary offline');
      }

      const data = await response.json();
      setVerifyResult({
        checked: true,
        isProtected: !!data.isProtected,
        query: verifyInput.trim()
      });
    } catch (err) {
      console.error("Verification error:", err);
      alert("Failed to verify protection status. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const openTelegramSupport = () => {
    window.open("https://t.me/TRACE_X_OWNER", "_blank");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] text-slate-800 font-sans pb-24 selection:bg-blue-500/20 selection:text-blue-900 relative">
      <LiquidBackground />
      <HeaderNavbar title="TRACEXDATA" subtitle="PRIVACY PROTECTION" />

      <main className="max-w-6xl w-full mx-auto px-4 pt-6 space-y-8 relative z-10">
        
        {/* 1. TOP HERO BLUE BANNER */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-blue-600/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-100 text-xs font-extrabold uppercase tracking-widest mb-1">
              <ShieldCheck size={14} className="text-amber-300" />
              <span>TRACEX PRIVACY GUARD</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Protect Your Record From OSINT Searches
            </h1>

            <p className="text-blue-100 text-xs sm:text-sm font-medium leading-relaxed">
              Shield your Mobile Number, Telegram Handle, Aadhaar, Vehicle RC, or Email. Once protected, any search via Dashboard or B2B API instantly returns a <span className="font-bold underline text-amber-200">TRACEX Privacy Shield</span> notice.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-2 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-center min-w-[130px] w-full sm:w-auto">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-200 block">PROTECTION FEE</span>
              <span className="text-lg font-black tracking-wider text-amber-300">₹99.00 <span className="text-xs font-normal text-white">/ Lifetime</span></span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white transition-colors py-1 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>

        {/* 2. MAIN PROTECTION CONSOLE CARD */}
        <div className="bg-white/95 border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 backdrop-blur-md space-y-8">
          
          {/* TAB SELECTION */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                1. Select Record Type To Shield
              </label>
              <span className="text-xs text-blue-600 font-bold">100% Instant Shielding</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200">
              {tabs.map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setInputValue('');
                      setErrorMessage(null);
                    }}
                    className={`py-3 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <IconComp size={18} className={isActive ? 'text-white' : 'text-slate-500'} />
                    <span className="truncate w-full text-center">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FORM & INPUT */}
          <form onSubmit={handleProtectSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  2. Enter {currentTabInfo.label}
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  Sample format: {currentTabInfo.example}
                </span>
              </div>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600">
                  {React.createElement(currentTabInfo.icon, { size: 20 })}
                </div>

                <input
                  required
                  type="text"
                  maxLength={getMaxInputLength()}
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={currentTabInfo.placeholder}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 placeholder-slate-400 font-mono text-sm sm:text-base outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <p className="text-xs text-slate-500 font-medium">{currentTabInfo.helper}</p>
            </div>

            {/* ERROR ALERTS */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-3"
                >
                  <AlertCircle size={18} className="shrink-0 text-red-500" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PRICING & BENEFIT BOX */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Protection Fee
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">₹99.00</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Lifetime Security 🛡️
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">One-time payment • Zero monthly recurring charges</p>
              </div>

              <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6 w-full sm:w-auto">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Included Safeguards
                </span>
                <ul className="text-xs text-slate-700 space-y-1 font-medium">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Instant Search Interception (&lt; 10ms)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Blocks Dashboard &amp; B2B API Lookups</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Zero Data Leak Guarantee</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              disabled={loading || !inputValue.trim()}
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin text-white" />
                  <span>Connecting Payment Gateway...</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={20} />
                  <span>Activate Record Protection (₹99.00)</span>
                </>
              )}
            </button>

            {!user && (
              <p className="text-xs text-amber-800 text-center font-medium bg-amber-50 p-3 rounded-xl border border-amber-200">
                ⚠️ Please log in to your account before activating record protection.
              </p>
            )}
          </form>
        </div>

        {/* 3. PROTECTION VERIFIER WIDGET */}
        <div className="bg-white/90 border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm shadow-slate-200/40 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-600 text-xs font-extrabold uppercase tracking-wider mb-1">
                <Search size={14} />
                <span>Protection Verifier</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Check If Your Record Is Protected</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Verify any Mobile, Telegram, Aadhaar, Vehicle or Email</span>
          </div>

          <form onSubmit={handleVerifyCheck} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={verifyType}
                onChange={(e) => setVerifyType(e.target.value as ProtectTabType)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
              >
                <option value="mobile">Mobile Number</option>
                <option value="telegram">Telegram Handle</option>
                <option value="adhr">Aadhaar Card</option>
                <option value="vehicle">Vehicle Registration</option>
                <option value="veh_owner_num">Vehicle Owner</option>
                <option value="email">Email Address</option>
              </select>

              <div className="flex-1 relative">
                <input
                  required
                  type="text"
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  placeholder={`Enter ${verifyType.toUpperCase()} identifier to verify...`}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-mono placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <button
                disabled={verifyLoading || !verifyInput.trim()}
                type="submit"
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {verifyLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                <span>Verify Status</span>
              </button>
            </div>

            {verifyResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                  verifyResult.isProtected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {verifyResult.isProtected ? (
                    <ShieldCheck size={28} className="text-emerald-600 shrink-0" />
                  ) : (
                    <ShieldAlert size={28} className="text-amber-600 shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      {verifyResult.isProtected ? 'PROTECTION ACTIVE 🛡️' : 'UNPROTECTED RECORD ⚠️'}
                    </h3>
                    <p className="text-xs opacity-90 font-mono">
                      {verifyResult.query} — {verifyResult.isProtected ? 'Searching this record returns a TRACEX protection notice.' : 'This record is currently public. Protect it now for ₹99.'}
                    </p>
                  </div>
                </div>

                {!verifyResult.isProtected && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputValue(verifyResult.query);
                      setActiveTab(verifyType);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-all shrink-0 cursor-pointer shadow-xs"
                  >
                    Protect Now
                  </button>
                )}
              </motion.div>
            )}
          </form>
        </div>

        {/* 4. HOW IT WORKS SECTION */}
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-slate-900">How Record Protection Works</h2>
            <p className="text-slate-500 text-sm font-medium">4 simple steps to secure your personal identity</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-extrabold text-sm">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base">Select Record</h3>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                Choose Mobile Number, Telegram Handle, Aadhaar, Vehicle RC, or Email Address.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-extrabold text-sm">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base">Pay Flat Fee</h3>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                Complete a one-time payment of ₹99.00 via UPI, QR Code, or Netbanking.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-extrabold text-sm">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base">Instant Database Lock</h3>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                Your identifier is locked in our server database in less than 1 second.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-extrabold text-sm">
                4
              </div>
              <h3 className="font-bold text-slate-900 text-base">Zero Data Exposure</h3>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                Any query on Web Dashboard or B2B API displays a TRACEX Protection Shield notice.
              </p>
            </div>
          </div>
        </div>

        {/* 5. FAQ SECTION */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-3">
            <HelpCircle size={24} className="text-blue-600" />
            <h2 className="text-2xl font-black text-slate-900">Frequently Asked Questions</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">What happens when someone searches my protected record?</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                When a user or developer API searches a protected record, our server intercepts the request and returns: 
                <span className="text-blue-700 font-mono block mt-1 font-bold">"This record is protected on TRACEXDATA. 🛡️"</span>
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Is the ₹99 fee a one-time charge or recurring?</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                It is a one-time flat fee of ₹99.00 for lifetime protection per record. There are no monthly charges or hidden renewal fees.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Does it protect against both Dashboard &amp; B2B API?</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Yes. Protection is enforced directly at the server level, instantly shielding your record from web searches and third-party API endpoints.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Can I remove protection if I change my mind later?</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Yes. If you wish to unshield a record, you can contact our official Telegram support team with ownership verification to remove the lock.
              </p>
            </div>
          </div>
        </div>

        {/* 6. TELEGRAM SUPPORT BANNER */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-base">Need Bulk or Enterprise Identity Protection?</h3>
            <p className="text-slate-600 text-xs font-medium">Reach out to our official support team on Telegram for bulk shielding requests.</p>
          </div>
          <button
            onClick={openTelegramSupport}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer shadow-md shadow-blue-600/20"
          >
            <span>Official Telegram Support</span>
            <ExternalLink size={14} />
          </button>
        </div>

      </main>
    </div>
  );
}
