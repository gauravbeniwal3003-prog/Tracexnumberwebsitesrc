import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wallet,
  Search,
  Key,
  History,
  CreditCard,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  PlusCircle,
  ShieldCheck,
  Code2,
  TrendingUp,
  Cpu,
  ChevronRight,
  Eye,
  EyeOff,
  Zap,
  ArrowUpRight,
  FileText,
  Phone,
  UserCheck,
  Sparkles,
  Lock,
  Layers,
  Terminal,
  X,
  CheckCircle2,
  QrCode,
  ExternalLink
} from "lucide-react";
import { getApiBaseUrl } from "../services/api.ts";

export default function AlvisAppApi() {
  const [activeTab, setActiveTab] = useState<
    "apis" | "history" | "transactions" | "tester"
  >("apis");

  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState<any>(null);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Recharge & Payment Gateway Modal State
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeStep, setRechargeStep] = useState<"amount" | "cashfree" | "processing" | "success">("amount");
  const [rechargeAmount, setRechargeAmount] = useState("260");
  const [paymentMethod, setPaymentMethod] = useState("Cashfree UPI / Gateway");
  const [cashfreeMethodTab, setCashfreeMethodTab] = useState<"upi" | "card" | "netbanking">("upi");
  const [cashfreeOrder, setCashfreeOrder] = useState<any>(null);
  const [cashfreePaymentId, setCashfreePaymentId] = useState("");
  const [upiVpa, setUpiVpa] = useState("alvisappapi@upi");
  const [cardNumber, setCardNumber] = useState("4532 •••• •••• 8912");
  const [cardExpiry, setCardExpiry] = useState("08/29");
  const [cardCvv, setCardCvv] = useState("•••");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [rechargeMsg, setRechargeMsg] = useState<string | null>(null);
  const [rechargeError, setRechargeError] = useState<string | null>(null);

  // Live Tester State
  const [selectedApi, setSelectedApi] = useState<
    "aadhaar_to_pan" | "pan_to_name_dob" | "number_lookup"
  >("aadhaar_to_pan");
  const [queryInput, setQueryInput] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    const backend = getApiBaseUrl();
    setBaseUrl(backend);
    fetchWalletInfo(backend);
    fetchSearches(backend);
    fetchTransactions(backend);

    // Check for payment return from Cashfree redirection
    const searchParams = new URLSearchParams(window.location.search);
    const orderId = searchParams.get("order_id");
    if (orderId) {
      verifyCashfreeReturn(orderId, backend);
    }
  }, []);

  const verifyCashfreeReturn = async (orderId: string, backend = baseUrl) => {
    try {
      setRechargeLoading(true);
      const targetUrl = backend || window.location.origin;
      const res = await fetch(`${targetUrl}/api/alvis/payment/cashfree/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          payment_method: "Cashfree Payment Gateway Official"
        })
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setRechargeMsg(data.message || "Payment completed successfully! Points credited to your wallet.");
        fetchWalletInfo(backend);
        fetchTransactions(backend);
        // Clear query parameter from browser address bar
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err) {
      console.error("Cashfree return verification error:", err);
    } finally {
      setRechargeLoading(false);
    }
  };

  const fetchWalletInfo = async (backend = baseUrl) => {
    try {
      setLoading(true);
      const targetUrl = backend || window.location.origin;
      const res = await fetch(`${targetUrl}/api/alvis/wallet`);
      const data = await res.json();
      if (data.status === "success") {
        setWalletData(data);
      }
    } catch (err) {
      console.error("Failed to fetch Alvis wallet:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSearches = async (backend = baseUrl) => {
    try {
      const targetUrl = backend || window.location.origin;
      const res = await fetch(`${targetUrl}/api/alvis/history/searches?limit=50`);
      const data = await res.json();
      if (data.status === "success") {
        setSearchHistory(data.searches || []);
      }
    } catch (err) {
      console.error("Failed to fetch search history:", err);
    }
  };

  const fetchTransactions = async (backend = baseUrl) => {
    try {
      const targetUrl = backend || window.location.origin;
      const res = await fetch(`${targetUrl}/api/alvis/history/transactions?limit=50`);
      const data = await res.json();
      if (data.status === "success") {
        setTransactionHistory(data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to fetch transaction history:", err);
    }
  };

  const handleCopyKey = () => {
    if (walletData?.api_key) {
      navigator.clipboard.writeText(walletData.api_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCopyText = (textToCopy: string, identifier: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(identifier);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. Step A: Initiate Direct Cashfree Payment Gateway Redirection
  const handleInitiateCashfreeCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(rechargeAmount);
    if (isNaN(amt) || amt <= 0) {
      setRechargeError("Please enter a valid positive amount.");
      return;
    }

    try {
      setRechargeLoading(true);
      setRechargeError(null);

      const targetUrl = baseUrl || window.location.origin;
      const res = await fetch(`${targetUrl}/api/alvis/payment/cashfree/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt })
      });

      const data = await res.json();
      if (res.ok && data.status === "success" && data.payment_session_id) {
        setCashfreeOrder(data);
        const generatedPayId = "CF_PAY_" + Math.floor(100000 + Math.random() * 900000);
        setCashfreePaymentId(generatedPayId);

        // DIRECT PAYMENT GATEWAY REDIRECTION VIA CASHFREE SDK
        if (window.Cashfree) {
          try {
            const cashfree = window.Cashfree({
              mode: data.cf_mode || "production"
            });
            // Direct redirection to official Cashfree Checkout
            await cashfree.checkout({
              paymentSessionId: data.payment_session_id,
              redirectTarget: "_self"
            });
            return;
          } catch (cfErr) {
            console.warn("Cashfree Checkout SDK redirect notice:", cfErr);
          }
        }
        
        // Fallback to modal if _self is intercepted inside sandbox iframe
        setRechargeStep("cashfree");
      } else {
        setRechargeError(data.error || "Failed to create Cashfree payment order session.");
      }
    } catch (err: any) {
      setRechargeError(err.message || "Network error launching payment gateway.");
    } finally {
      setRechargeLoading(false);
    }
  };

  // 2. Step B: Process Cashfree Payment Verification & Add Wallet Balance
  const handleConfirmCashfreePayment = async () => {
    const amt = parseFloat(rechargeAmount);
    if (!cashfreeOrder || isNaN(amt) || amt <= 0) return;

    setRechargeStep("processing");
    setRechargeError(null);

    // Simulate Payment Gateway Network Delay
    setTimeout(async () => {
      try {
        const targetUrl = baseUrl || window.location.origin;
        const selectedMethodLabel =
          cashfreeMethodTab === "upi"
            ? `Cashfree UPI (${upiVpa})`
            : cashfreeMethodTab === "card"
            ? "Cashfree Card"
            : `Cashfree NetBanking (${selectedBank})`;

        const res = await fetch(`${targetUrl}/api/alvis/payment/cashfree/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amt,
            order_id: cashfreeOrder.order_id,
            payment_id: cashfreePaymentId,
            payment_method: selectedMethodLabel
          })
        });

        const data = await res.json();
        if (res.ok && data.status === "success") {
          setRechargeStep("success");
          fetchWalletInfo();
          fetchTransactions();
        } else {
          setRechargeError(data.error || "Cashfree payment verification failed.");
          setRechargeStep("cashfree");
        }
      } catch (err: any) {
        setRechargeError(err.message || "Failed to verify Cashfree payment.");
        setRechargeStep("cashfree");
      }
    }, 1800);
  };

  const handleRunTestLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim() || !walletData?.api_key) return;

    setTestLoading(true);
    setTestError(null);
    setTestResult(null);

    let endpoint = "/api/alvis/lookup/aadhaar-to-pan";
    let bodyKey = "aadhaar_number";

    if (selectedApi === "pan_to_name_dob") {
      endpoint = "/api/alvis/lookup/pan-to-name-dob";
      bodyKey = "pan_number";
    } else if (selectedApi === "number_lookup") {
      endpoint = "/api/alvis/lookup/number";
      bodyKey = "number";
    }

    try {
      const targetUrl = baseUrl || window.location.origin;
      const res = await fetch(`${targetUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": walletData.api_key
        },
        body: JSON.stringify({ [bodyKey]: queryInput.trim() })
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        setTestResult(data);
      } else {
        setTestError(data.error || data.message || "Lookup failed.");
        setTestResult(data);
      }
    } catch (err: any) {
      setTestError(err.message || "Network error occurred.");
    } finally {
      setTestLoading(false);
      fetchWalletInfo();
      fetchSearches();
      fetchTransactions();
    }
  };

  const apiKey = walletData?.api_key || "alvis_live_key_sample";
  const renderHost = "https://tracexdata-api.onrender.com";

  // The 3 Working APIs allotted to the user with hardcoded prices
  const apis = [
    {
      id: "aadhaar_to_pan",
      name: "1. Aadhaar to PAN Lookup API",
      fixedCharge: "₹26.00",
      exactChargeNum: 26.0,
      icon: FileText,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      endpoint: `${renderHost}/api/alvis/lookup/aadhaar-to-pan?apiKey=${apiKey}&aadhaar=`,
      description: "Direct lookup API to find linked PAN Card number using 12-digit Aadhaar number.",
      searchCount: walletData?.search_counts?.aadhaar_to_pan ?? 0
    },
    {
      id: "pan_to_name_dob",
      name: "2. PAN Card to Name & DOB API",
      fixedCharge: "₹14.00",
      exactChargeNum: 14.0,
      icon: UserCheck,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
      endpoint: `${renderHost}/api/alvis/lookup/pan-to-name-dob?apiKey=${apiKey}&pan=`,
      description: "Fetch cardholder full name, DOB, and verification status from 10-character PAN number.",
      searchCount: walletData?.search_counts?.pan_to_name_dob ?? 0
    },
    {
      id: "number_lookup",
      name: "3. Number Lookup API",
      fixedCharge: "₹0.50",
      exactChargeNum: 0.5,
      icon: Phone,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      endpoint: `${renderHost}/api/alvis/lookup/number?apiKey=${apiKey}&number=`,
      description: "Carrier, telecom circle, and live identity details lookup for any 10-digit phone number.",
      searchCount: walletData?.search_counts?.number_lookup ?? 0
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-sky-50 text-slate-800 font-sans relative overflow-x-hidden pb-28">
      
      {/* BACKGROUND DECORATIVE GLOWS */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 relative z-10 space-y-5">
        
        {/* TOP HEADER: API PANEL */}
        <div className="bg-white/90 border border-blue-100 rounded-2xl p-4 sm:p-6 backdrop-blur-xl shadow-xl shadow-blue-500/5 space-y-4">
          
          {/* Top Title Bar */}
          <div className="flex items-center justify-between border-b border-blue-100/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl text-white font-bold shadow-md shadow-blue-500/20">
                <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    API Panel
                  </h1>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full uppercase tracking-wider">
                    Alvis API Panel
                  </span>
                  <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                    Account: {walletData?.user_name || "alvisappapi"}
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-0.5">
                  Live Managed Render Backend & Pay-Per-Search Wallet
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                fetchWalletInfo();
                fetchSearches();
                fetchTransactions();
              }}
              className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 text-blue-700 rounded-xl transition-all"
              title="Refresh Balance"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>

          {/* Under Top Title: Currently Actual Balance Card & Recharge Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between sm:justify-start gap-4 flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg border border-emerald-500/20">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Currently Actual Balance
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tracking-tight">
                    ₹{walletData ? walletData.wallet_balance.toFixed(2) : "0.00"}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold uppercase">
                  Real Money Only
                </span>
                <div className="text-[10px] text-slate-400 mt-1">No Demo Money</div>
              </div>
            </div>

            {/* Option of Recharge on Right Side */}
            <button
              onClick={() => setShowRechargeModal(true)}
              className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Recharge Wallet</span>
            </button>
          </div>

          {/* User's API Key Quick Row */}
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <Key className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-400 shrink-0 font-medium">Your API Key:</span>
              <code className="font-mono text-cyan-300 font-bold truncate">
                {showKey ? apiKey : apiKey.slice(0, 12) + "••••••••"}
              </code>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowKey(!showKey)}
                className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded border border-slate-700"
              >
                {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showKey ? "Hide" : "Show"}
              </button>
              <button
                onClick={handleCopyKey}
                className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 px-2.5 py-1 rounded font-bold flex items-center gap-1 transition-all"
              >
                {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedKey ? "Copied Key" : "Copy Key"}
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: 3 ALLOTTED APIS SECTION */}
        {activeTab === "apis" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  3 Allotted Working APIs & Fixed Charges
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Use the copy button to copy the backend endpoint URL into your application.
                </p>
              </div>
            </div>

            {/* List of 3 APIs */}
            <div className="space-y-4">
              {apis.map(api => {
                const Icon = api.icon;
                const isCopiedEndpoint = copiedId === api.id;

                return (
                  <div
                    key={api.id}
                    className="bg-white/95 border border-blue-100 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-lg shadow-blue-500/5 space-y-4 relative overflow-hidden"
                  >
                    {/* Header Row: Name, Method & Fixed Charge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100/80 pb-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${api.color}`}>
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900">
                              {api.name}
                            </h3>
                            <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold">
                              GET / POST
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{api.description}</p>
                        </div>
                      </div>

                      {/* FIXED SERVICE CHARGE BADGE */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 bg-blue-50/70 px-3.5 py-2 rounded-xl border border-blue-100 shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Fixed Service Charge</div>
                          <div className="text-sm font-black text-blue-700 font-mono">
                            {api.fixedCharge} <span className="text-[10px] text-slate-500 font-normal">/ search</span>
                          </div>
                        </div>
                        <div className="text-right border-l border-blue-200 pl-3">
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Executed</div>
                          <div className="text-sm font-black text-slate-800 font-mono">
                            {api.searchCount}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Endpoint URL Box with Just Copy Button */}
                    <div>
                      <div className="text-[11px] font-semibold text-slate-600 mb-1">
                        API Endpoint URL (Render Backend):
                      </div>
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2 overflow-hidden">
                        <code className="text-xs font-mono text-cyan-300 truncate select-all">
                          {api.endpoint}
                        </code>
                        <button
                          onClick={() => handleCopyText(api.endpoint, api.id)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-blue-500/20"
                        >
                          {isCopiedEndpoint ? (
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{isCopiedEndpoint ? "Copied!" : "Just Copy"}</span>
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SEARCH HISTORY */}
        {activeTab === "history" && (
          <div className="bg-white/95 border border-blue-100 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-lg shadow-blue-500/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  Search History Log
                </h2>
                <p className="text-slate-500 text-xs">
                  Real-time history of lookups executed on your allotted APIs.
                </p>
              </div>
              <button
                onClick={() => fetchSearches()}
                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs border border-blue-200 transition-all flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Sync
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-blue-100 shadow-sm">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-blue-50/80 text-blue-900 font-semibold uppercase border-b border-blue-100">
                  <tr>
                    <th className="py-3 px-3.5">Time</th>
                    <th className="py-3 px-3.5">API Service</th>
                    <th className="py-3 px-3.5">Search Input</th>
                    <th className="py-3 px-3.5">Charge</th>
                    <th className="py-3 px-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100/60 bg-white">
                  {searchHistory.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-blue-50/40 transition-all">
                      <td className="py-2.5 px-3.5 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(row.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 whitespace-nowrap">
                        {row.api_used === "aadhaar_to_pan"
                          ? "Aadhaar to PAN (₹26)"
                          : row.api_used === "pan_to_name_dob"
                          ? "PAN to Name & DOB (₹14)"
                          : "Number Lookup (₹0.50)"}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-blue-600 font-semibold">{row.search_input}</td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{row.charged_amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.status === "success"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {row.status === "success" ? "Success" : "Refunded"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {searchHistory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No searches recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: TRANSACTIONS HISTORY */}
        {activeTab === "transactions" && (
          <div className="bg-white/95 border border-blue-100 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-lg shadow-blue-500/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Wallet Transactions History
                </h2>
                <p className="text-slate-500 text-xs">
                  Complete audit trail of recharges, search deductions, and refunds.
                </p>
              </div>
              <button
                onClick={() => fetchTransactions()}
                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs border border-blue-200 transition-all flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Sync
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-blue-100 shadow-sm">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-blue-50/80 text-blue-900 font-semibold uppercase border-b border-blue-100">
                  <tr>
                    <th className="py-3 px-3.5">Time</th>
                    <th className="py-3 px-3.5">Type</th>
                    <th className="py-3 px-3.5">Amount</th>
                    <th className="py-3 px-3.5">Bal After</th>
                    <th className="py-3 px-3.5">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100/60 bg-white">
                  {transactionHistory.map((tx, idx) => (
                    <tr key={tx.id || idx} className="hover:bg-blue-50/40 transition-all">
                      <td className="py-2.5 px-3.5 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(tx.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.type === "credit"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : tx.type === "refund"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3.5 font-mono font-bold whitespace-nowrap ${
                          tx.type === "credit" || tx.type === "refund"
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {tx.type === "credit" || tx.type === "refund" ? "+" : "-"}₹
                        {tx.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        ₹{tx.balance_after.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">{tx.reason}</td>
                    </tr>
                  ))}
                  {transactionHistory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: LIVE API TESTER */}
        {activeTab === "tester" && (
          <div className="bg-white/95 border border-blue-100 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-lg shadow-blue-500/5 space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-600" />
                Live API Tester Console
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Test any of your 3 allotted APIs directly inside this panel in real time.
              </p>
            </div>

            <form onSubmit={handleRunTestLookup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select API to Test:
                </label>
                <select
                  value={selectedApi}
                  onChange={e => {
                    setSelectedApi(e.target.value as any);
                    setQueryInput("");
                    setTestResult(null);
                  }}
                  className="w-full bg-blue-50/50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                >
                  <option value="aadhaar_to_pan">Aadhaar to PAN Lookup (Fixed Charge: ₹26.00)</option>
                  <option value="pan_to_name_dob">PAN to Name & DOB Lookup (Fixed Charge: ₹14.00)</option>
                  <option value="number_lookup">Number Lookup (Fixed Charge: ₹0.50)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {selectedApi === "aadhaar_to_pan"
                    ? "Enter 12-Digit Aadhaar Number:"
                    : selectedApi === "pan_to_name_dob"
                    ? "Enter 10-Character PAN Number:"
                    : "Enter 10-Digit Mobile Number:"}
                </label>
                <input
                  type="text"
                  required
                  value={queryInput}
                  onChange={e => setQueryInput(e.target.value)}
                  placeholder={
                    selectedApi === "aadhaar_to_pan"
                      ? "e.g. 234567890123"
                      : selectedApi === "pan_to_name_dob"
                      ? "e.g. ABCDE1234F"
                      : "e.g. 9876543210"
                  }
                  className="w-full bg-blue-50/50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={testLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {testLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Execute Live API Request
              </button>
            </form>

            {/* Test Results JSON Output */}
            {testResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-200">API Response JSON</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      testResult.status === "success"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {testResult.status}
                  </span>
                </div>
                <pre className="text-xs font-mono text-cyan-300 max-h-64 overflow-y-auto leading-relaxed">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

      </div>

      {/* FIXED BOTTOM NAVIGATION BAR ONLY */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-blue-100 backdrop-blur-xl px-2 sm:px-4 py-2 shadow-2xl shadow-blue-900/10">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {[
            { id: "apis", label: "3 APIs", icon: Layers },
            { id: "history", label: "Search History", icon: History },
            { id: "transactions", label: "Transactions", icon: CreditCard },
            { id: "tester", label: "API Tester", icon: Terminal }
          ].map(nav => {
            const Icon = nav.icon;
            const isActive = activeTab === nav.id;
            return (
              <button
                key={nav.id}
                onClick={() => setActiveTab(nav.id as any)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? "text-blue-600 bg-blue-50 font-bold border border-blue-200/50"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-blue-600 scale-110" : ""}`} />
                <span className="text-[10px] tracking-tight whitespace-nowrap">
                  {nav.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RECHARGE / CASHFREE PAYMENT GATEWAY MODAL */}
      <AnimatePresence>
        {showRechargeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-blue-100 rounded-2xl max-w-md w-full shadow-2xl relative text-slate-900 max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden my-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowRechargeModal(false);
                  setRechargeStep("amount");
                  setRechargeError(null);
                }}
                className="absolute top-3 right-3 z-30 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
                {/* STEP 1: AMOUNT SELECTION */}
                {rechargeStep === "amount" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                        <PlusCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-slate-900">Recharge Wallet</h3>
                          <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                            User: alvisappapi
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                          Enter any custom amount to pay via Cashfree Payment Gateway.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleInitiateCashfreeCheckout} className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-800">
                            Enter Amount to Add (₹):
                          </label>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            Any Custom Amount
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-emerald-600 font-black text-sm">₹</span>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            required
                            value={rechargeAmount}
                            onChange={e => setRechargeAmount(e.target.value)}
                            placeholder="Enter amount (e.g. 100, 260, 500)"
                            className="w-full bg-blue-50/50 border border-blue-200 rounded-xl pl-8 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono font-bold transition-all shadow-sm"
                          />
                        </div>
                      </div>

                      {/* Quick Selection Presets */}
                      <div className="space-y-1.5 pt-0.5">
                        <label className="text-[11px] font-semibold text-slate-600">Quick Select Amount:</label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {["50", "100", "260", "500", "1000"].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setRechargeAmount(amt)}
                              className={`py-1.5 rounded-lg border font-bold text-xs transition-all ${
                                rechargeAmount === amt
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20"
                                  : "bg-blue-50/50 border-blue-200 text-slate-700 hover:border-blue-400 hover:bg-blue-100/50"
                              }`}
                            >
                              ₹{amt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {rechargeError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 font-medium">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          {rechargeError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={rechargeLoading}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {rechargeLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                        <span>Proceed to Cashfree Checkout (₹{parseFloat(rechargeAmount || "0").toFixed(2)})</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* STEP 2: CASHFREE DIRECT GATEWAY LAUNCHER (If pop-up fallback needed) */}
                {rechargeStep === "cashfree" && (
                  <div className="p-2 text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border border-blue-200">
                      <ExternalLink className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Redirecting to Cashfree Payment Gateway</h4>
                      <p className="text-slate-500 text-xs mt-1">
                        Order ID: <span className="font-mono text-slate-800 font-bold">{cashfreeOrder?.order_id}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.Cashfree && cashfreeOrder?.payment_session_id) {
                          try {
                            const cashfree = window.Cashfree({ mode: cashfreeOrder.cf_mode || "production" });
                            cashfree.checkout({
                              paymentSessionId: cashfreeOrder.payment_session_id,
                              redirectTarget: "_self"
                            });
                          } catch (err) {
                            console.error("Cashfree redirect error:", err);
                          }
                        }
                      }}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Official Cashfree Gateway Page Now</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRechargeStep("processing");
                        handleConfirmCashfreePayment();
                      }}
                      className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Already Completed Payment? Verify Balance</span>
                    </button>
                  </div>
                )}

                {/* STEP 3: PROCESSING CASHFREE TRANSACTION */}
                {rechargeStep === "processing" && (
                  <div className="p-4 text-center space-y-4 py-8">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border border-blue-200 animate-pulse">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Processing Cashfree Gateway Payment</h4>
                      <p className="text-slate-500 text-xs mt-1">
                        Communicating securely with Cashfree servers for user <strong className="font-mono text-slate-800">alvisappapi</strong>...
                      </p>
                      <div className="text-[11px] font-mono text-emerald-600 mt-2 font-semibold">
                        Order ID: {cashfreeOrder?.order_id}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: SUCCESS CONFIRMATION */}
                {rechargeStep === "success" && (
                  <div className="p-2 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-md shadow-emerald-500/10">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <div>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full uppercase">
                        Cashfree Payment Verified
                      </span>
                      <h4 className="text-lg font-black text-slate-900 mt-1">
                        ₹{parseFloat(rechargeAmount || "0").toFixed(2)} Added Successfully!
                      </h4>
                      <p className="text-slate-500 text-xs mt-1">
                        Funds credited to user <strong className="font-mono text-slate-800">alvisappapi</strong> wallet.
                      </p>
                    </div>

                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-left space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gateway:</span>
                        <span className="font-bold text-slate-800">Cashfree Payments</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Order ID:</span>
                        <span className="font-bold text-slate-800">{cashfreeOrder?.order_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Payment Ref:</span>
                        <span className="font-bold text-emerald-700">{cashfreePaymentId}</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-200/80 pt-1">
                        <span className="text-slate-500">New Wallet Balance:</span>
                        <span className="font-bold text-emerald-600">
                          ₹{walletData ? walletData.wallet_balance.toFixed(2) : "0.00"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowRechargeModal(false);
                        setRechargeStep("amount");
                      }}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-500/20"
                    >
                      Done & Return to Panel
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
