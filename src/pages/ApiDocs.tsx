import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Key,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Wallet,
  ShieldCheck,
  Code
} from "lucide-react";
import { getApiBaseUrl } from '../services/api';
import { useAuth } from "../services/AuthContext";
import HeaderNavbar from "../components/HeaderNavbar";
import { supabase } from "../services/supabase";
import LiquidBackground from '../components/LiquidBackground';

export default function ApiDocs() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const baseDomain = getApiBaseUrl().replace(/\/$/, "");

  // API Token State
  const [apiKey, setApiKey] = useState<string>("be46807e4885358a1adcc55a73038d7f");
  const [userKeys, setUserKeys] = useState<any[]>([]);
  const [isCopiedToken, setIsCopiedToken] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  // Live Interactive Testing states
  const [testPhone, setTestPhone] = useState<string>("9876543210");
  const [testTelegram, setTestTelegram] = useState<string>("durov");
  const [copiedPhoneUrl, setCopiedPhoneUrl] = useState<boolean>(false);
  const [copiedTelegramUrl, setCopiedTelegramUrl] = useState<boolean>(false);

  // Fetch Permanent API Key for logged in user
  const loadKeys = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || "";
      const email = user?.email || "";

      let url = `${baseDomain}/api/user-keys`;
      if (email) {
        url += `?email=${encodeURIComponent(email)}`;
      }

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUserKeys(data);
          if (data.length > 0) {
            const k8 = data.find((k: any) => k.api_key && String(k.api_key).length === 8 && k.status === 'active');
            if (k8) {
              setApiKey(k8.api_key);
            } else {
              setApiKey(data[0].api_key);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error loading user permanent API key:", err);
    }
  };

  const [paymentStatusMsg, setPaymentStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const orderId = searchParams.get('order_id');
    if (orderId) {
      checkPaymentStatus(orderId);
      window.history.replaceState({}, document.title, "/api-docs");
    }
  }, [user]);

  const checkPaymentStatus = async (orderId: string) => {
    try {
      setIsActionLoading("checking_status");
      setPaymentStatusMsg(null);
      const res = await fetch(`${baseDomain}/api/cashfree/status/${orderId}`);
      if (!res.ok) {
        throw new Error(`Verification request failed: ${res.status}`);
      }
      const data = await res.json();
      if (data.order_status === "PAID" || data.order_status === "SUCCESS") {
        setPaymentStatusMsg({
          type: 'success',
          text: `Payment Successful! Your API Subscription/Renewal has been processed and activated.`
        });
        await refreshProfile();
        await loadKeys();
      } else {
        setPaymentStatusMsg({
          type: 'error',
          text: `Payment status is: ${data.order_status}. Please try again.`
        });
      }
    } catch (err: any) {
      console.error("Error verifying payment status:", err);
      setPaymentStatusMsg({
        type: 'error',
        text: err.message || "Failed to verify payment with Cashfree."
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  useEffect(() => {
    loadKeys();
  }, [user, baseDomain]);

  // Handle Buy Plan using Cashfree directly
  const handleBuyPlan = async (planId: string) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-login'));
      return;
    }

    const planName = planId === "api_number_600" ? "Number API" : "Telegram API";
    if (!window.confirm(`Are you sure you want to purchase the ${planName} Unlimited Plan for ₹600.00 via Cashfree?`)) {
      return;
    }

    setIsActionLoading(planId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || "";

      const response = await fetch(`${baseDomain}/api/cashfree/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          user_id: user.id,
          user_email: user.email,
          plan_id: planId,
          amount: 600,
          customer_phone: profile?.mobile || '9999999999',
          customer_name: profile?.name || user.email?.split('@')[0],
          return_url: `${window.location.origin}/api-docs?order_id={order_id}`
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
          amount: 600,
          planId: planId,
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
      alert("An unexpected error occurred: " + err.message);
    } finally {
      setIsActionLoading(null);
    }
  };

  // Handle Renew Plan using Cashfree directly
  const handleRenewPlan = async (apiKeyId: string, planLabel: string) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-login'));
      return;
    }

    if (!window.confirm(`Are you sure you want to renew your ${planLabel} subscription for 30 more days at the price of ₹600.00 via Cashfree?`)) {
      return;
    }

    setIsActionLoading(apiKeyId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || "";

      const response = await fetch(`${baseDomain}/api/cashfree/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          user_id: user.id,
          user_email: user.email,
          plan_id: `api_renew_${apiKeyId}`,
          amount: 600,
          customer_phone: profile?.mobile || '9999999999',
          customer_name: profile?.name || user.email?.split('@')[0],
          return_url: `${window.location.origin}/api-docs?order_id={order_id}`
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
          amount: 600,
          planId: `api_renew_${apiKeyId}`,
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
      alert("An unexpected error occurred: " + err.message);
    } finally {
      setIsActionLoading(null);
    }
  };

  // Handle Copy Key
  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setIsCopiedToken(true);
    setTimeout(() => setIsCopiedToken(false), 2000);
  };

  // Regenerate Token
  const handleRegenerateKey = async () => {
    setIsRegenerating(true);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let newKey = "";
    for (let i = 0; i < 8; i++) {
      newKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || "";
      if (token && user?.id) {
        await supabase.from("api_keys").insert([{
          api_key: newKey,
          user_id: user.id,
          user_email: user.email || "N/A",
          plan_name: "Account Wallet API (8-Digit)",
          status: "active"
        }]);
      }
    } catch (err) {
      console.error(err);
    }
    setApiKey(newKey);
    setTimeout(() => {
      setIsRegenerating(false);
      alert(`New 8-Digit API Key (${newKey}) generated successfully!`);
    }, 400);
  };

  const walletAmount = profile?.unlimited_expiry && new Date(profile.unlimited_expiry) > new Date()
    ? "Unlimited"
    : (profile?.credits !== undefined ? `₹${profile.credits.toLocaleString("en-IN")}` : "₹0.00");

  return (
    <div className="min-h-screen bg-[#f8fafc] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] text-slate-800 font-sans pb-24 selection:bg-blue-500/20 selection:text-blue-900">
      <LiquidBackground />
      <HeaderNavbar title="TRACEXDATA" subtitle="DEVELOPER API HUB" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {paymentStatusMsg && (
          <div className={`p-4 rounded-2xl border text-xs font-bold flex items-start gap-3 shadow-xs ${
            paymentStatusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-red-50 border-red-200 text-red-950'
          }`}>
            <span className="text-base">{paymentStatusMsg.type === 'success' ? '✅' : '❌'}</span>
            <span className="leading-relaxed flex-1">{paymentStatusMsg.text}</span>
          </div>
        )}

        {/* 1. TOP BLUE HERO BANNER */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white rounded-2xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 max-w-2xl relative z-10">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Developer API Portal
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm font-medium leading-relaxed">
              Activate API access, manage your credentials, and buy high-speed Unlimited Lookup plans.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 text-center min-w-[120px] shrink-0 self-start sm:self-auto relative z-10">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-200 block">Status</span>
            <span className="text-xs font-black tracking-wider text-white flex items-center gap-1.5 justify-center mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Active
            </span>
          </div>
        </div>

        {/* 2. GRID: LEFT (API Key) & RIGHT (API Buy Plans) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Allotted API Key (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-black text-slate-900 tracking-wide uppercase">
                    Your Allotted API Key
                  </h3>
                </div>
                <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Private Key
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Use this unique 8-digit key to authenticate all developer API requests. Keep it secure and do not share it.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-mono text-sm text-slate-800 break-all select-all font-black text-center tracking-widest shadow-inner">
                  {apiKey}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleCopyKey}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  {isCopiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopiedToken ? "Copied!" : "Copy Key"}</span>
                </button>

                <button
                  onClick={handleRegenerateKey}
                  disabled={isRegenerating}
                  className="py-3 px-4 rounded-xl text-slate-500 hover:text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 hover:bg-slate-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                  <span>Regenerate (Free)</span>
                </button>
              </div>

              {/* API AUTHENTICATION RULE */}
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Plan Verification Required</span>
                </div>
                <p className="text-[10px] text-amber-700 font-medium leading-normal">
                  Your API Key will <strong>only work</strong> with the endpoint once you purchase one of the active API plans shown on the right. Per-lookup billing is completely discontinued.
                </p>
              </div>

              {/* INTEGRATION EXAMPLE & PLAYGROUND */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <Code className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black uppercase tracking-wider">Live API URL Playground</span>
                </div>

                {/* PLAYGROUND: 1. PHONE LOOKUP */}
                <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">1. Phone Lookup API</span>
                    <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">GET</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="text-[10px] font-semibold text-slate-500 self-center">Test Query:</div>
                    <input
                      type="text"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="9876543210"
                      className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono text-slate-800 font-bold"
                    />
                  </div>
                  <div className="bg-slate-900 text-slate-100 rounded-lg p-2.5 font-mono text-[10px] space-y-1 relative group overflow-hidden">
                    <div className="text-emerald-400 break-all select-all font-semibold">
                      {baseDomain}/api/lookup?key={apiKey}&amp;service=phone&amp;query={testPhone}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        const url = `${baseDomain}/api/lookup?key=${apiKey}&service=phone&query=${testPhone}`;
                        navigator.clipboard.writeText(url);
                        setCopiedPhoneUrl(true);
                        setTimeout(() => setCopiedPhoneUrl(false), 2000);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-black text-slate-700 flex items-center justify-center gap-1 transition-all"
                    >
                      {copiedPhoneUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{copiedPhoneUrl ? "Copied!" : "Copy URL"}</span>
                    </button>
                    <a
                      href={`${baseDomain}/api/lookup?key=${apiKey}&service=phone&query=${testPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black flex items-center justify-center gap-1 transition-all text-center"
                    >
                      <span>⚡ Open Test Link</span>
                    </a>
                  </div>
                </div>

                {/* PLAYGROUND: 2. TELEGRAM LOOKUP */}
                <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">2. Telegram Lookup API</span>
                    <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">GET</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="text-[10px] font-semibold text-slate-500 self-center">Test Query:</div>
                    <input
                      type="text"
                      value={testTelegram}
                      onChange={(e) => setTestTelegram(e.target.value)}
                      placeholder="durov"
                      className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-mono text-slate-800 font-bold"
                    />
                  </div>
                  <div className="bg-slate-900 text-slate-100 rounded-lg p-2.5 font-mono text-[10px] space-y-1 relative group overflow-hidden">
                    <div className="text-indigo-400 break-all select-all font-semibold">
                      {baseDomain}/api/lookup?key={apiKey}&amp;service=telegram&amp;query={testTelegram}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        const url = `${baseDomain}/api/lookup?key=${apiKey}&service=telegram&query=${testTelegram}`;
                        navigator.clipboard.writeText(url);
                        setCopiedTelegramUrl(true);
                        setTimeout(() => setCopiedTelegramUrl(false), 2000);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-black text-slate-700 flex items-center justify-center gap-1 transition-all"
                    >
                      {copiedTelegramUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{copiedTelegramUrl ? "Copied!" : "Copy URL"}</span>
                    </button>
                    <a
                      href={`${baseDomain}/api/lookup?key=${apiKey}&service=telegram&query=${testTelegram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black flex items-center justify-center gap-1 transition-all text-center"
                    >
                      <span>⚡ Open Test Link</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: API Buy Plans Only (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="text-blue-500">👑</span> Unlimited API Plans
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Buy a monthly plan to activate lookup features on your API Key.
                  </p>
                </div>
                <div className="bg-slate-100/80 px-4 py-2 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">YOUR BALANCE</span>
                  <span className="text-sm font-black text-slate-800">{walletAmount}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* NUMBER API CARD */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between transition-all hover:bg-slate-100/40">
                  <div className="space-y-3">
                    <span className="bg-blue-50 border border-blue-200 text-blue-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider inline-block">
                      NUMBER API
                    </span>
                    <h3 className="text-sm font-black text-slate-800">Phone Lookup API Plan</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-slate-900">₹600</span>
                      <span className="text-[10px] text-slate-400">/ month</span>
                    </div>
                    <ul className="text-[10px] text-slate-500 space-y-1.5 font-medium">
                      <li className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span> Unlimited Indian Mobile &amp; Name queries
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span> Zero per-lookup extra charges
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleBuyPlan("api_number_600")}
                    disabled={isActionLoading !== null}
                    className="w-full mt-4 py-2.5 px-4 rounded-xl font-extrabold text-xs transition-all bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 cursor-pointer text-center"
                  >
                    {isActionLoading === "api_number_600" ? "Buying..." : "Buy for ₹600"}
                  </button>
                </div>

                {/* TELEGRAM API CARD */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between transition-all hover:bg-slate-100/40">
                  <div className="space-y-3">
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider inline-block">
                      TELEGRAM API
                    </span>
                    <h3 className="text-sm font-black text-slate-800">Telegram Lookup API Plan</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-slate-900">₹600</span>
                      <span className="text-[10px] text-slate-400">/ month</span>
                    </div>
                    <ul className="text-[10px] text-slate-500 space-y-1.5 font-medium">
                      <li className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span> Unlimited Username Verification queries
                      </li>
                      <li className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span> Zero per-lookup extra charges
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleBuyPlan("api_telegram_600")}
                    disabled={isActionLoading !== null}
                    className="w-full mt-4 py-2.5 px-4 rounded-xl font-extrabold text-xs transition-all bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 cursor-pointer text-center"
                  >
                    {isActionLoading === "api_telegram_600" ? "Buying..." : "Buy for ₹600"}
                  </button>
                </div>
              </div>

              {/* RENEWING / VIEW ALL PLANS */}
              <div className="text-center pt-2">
                <button
                  onClick={() => navigate("/unlimited-plans")}
                  className="text-xs font-extrabold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  Need more plans? View Account &amp; App Unlimited Plans →
                </button>
              </div>

              {/* ACTIVE CREDENTIALS TABLE */}
              {userKeys.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-black tracking-wide text-slate-400 uppercase">
                      Your Credentials &amp; Subscriptions
                    </h3>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse bg-white">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="px-4 py-2.5">Plan / Type</th>
                          <th className="px-4 py-2.5">API Key</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Expires At</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {userKeys.map((k: any) => {
                          const is8 = k.api_key && String(k.api_key).length === 8;
                          const isUnlimitedPlan = k.plan_name && (k.plan_name.includes("Number") || k.plan_name.includes("Telegram"));
                          const isExpired = k.expires_at ? new Date(k.expires_at) < new Date() : false;
                          return (
                            <tr key={k.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-2.5 font-bold text-slate-800">
                                {k.plan_name || (is8 ? "Default Developer Key" : "Master API Key")}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-[11px] select-all tracking-wider text-slate-500">
                                {k.api_key}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                  isExpired 
                                    ? "bg-red-50 text-red-600 border border-red-200" 
                                    : k.status === 'active' 
                                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                                      : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}>
                                  {isExpired ? "Expired" : k.status || "active"}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-medium text-slate-500">
                                {k.expires_at ? new Date(k.expires_at).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                }) : "Never"}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(k.api_key);
                                      alert("API Key copied!");
                                    }}
                                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                                    title="Copy"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  {isUnlimitedPlan && (
                                    <button
                                      onClick={() => handleRenewPlan(k.id, k.plan_name)}
                                      disabled={isActionLoading !== null}
                                      className="px-2 py-0.5 text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      Renew
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
