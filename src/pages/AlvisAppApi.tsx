import React, { useState, useEffect } from "react";
import FormattedResponseCard from "../components/FormattedResponseCard";
import { motion, AnimatePresence } from "motion/react";
import HeaderNavbar from "../components/HeaderNavbar";
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
  ExternalLink,
  Menu,
  Settings,
  LogOut,
  ArrowLeft,
  Car,
  Wheat,
  Building2,
  User,
  Ticket,
  Award,
  Gift,
  HelpCircle,
  ChevronDown,
  Fingerprint,
  FileBadge,
  Vote,
  HeartPulse
} from "lucide-react";
import { getApiBaseUrl } from "../services/api.ts";
import { useAuth } from "../services/AuthContext.tsx";
import { useNavigate } from "react-router-dom";

export default function AlvisAppApi() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "categories" | "apis" | "history" | "transactions" | "tester" | "profile"
  >("dashboard");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState<any>(null);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Recharge & Payment Gateway Modal State
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeStep, setRechargeStep] = useState<"amount" | "cashfree" | "processing" | "success">("amount");
  const [rechargeAmount, setRechargeAmount] = useState("260");
  const [cashfreeOrder, setCashfreeOrder] = useState<any>(null);
  const [cashfreePaymentId, setCashfreePaymentId] = useState("");
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [rechargeMsg, setRechargeMsg] = useState<string | null>(null);
  const [rechargeError, setRechargeError] = useState<string | null>(null);

  // Live Tester / Search Modal State
  const [showTesterModal, setShowTesterModal] = useState(false);
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

  // Initiate Cashfree Order
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

        if (window.Cashfree) {
          try {
            const cashfree = window.Cashfree({ mode: data.cf_mode || "production" });
            cashfree.checkout({
              paymentSessionId: data.payment_session_id,
              redirectTarget: "_self"
            });
            return;
          } catch (cfErr) {
            console.warn("Cashfree SDK direct launch failed, showing fallback UI:", cfErr);
          }
        }
        setRechargeStep("cashfree");
      } else {
        setRechargeError(data.message || "Failed to initiate Cashfree payment session.");
      }
    } catch (err: any) {
      setRechargeError(err.message || "Network error while connecting to Cashfree.");
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleConfirmCashfreePayment = async () => {
    if (!cashfreeOrder) return;
    try {
      setRechargeLoading(true);
      setRechargeError(null);

      const targetUrl = baseUrl || window.location.origin;
      const res = await fetch(`${targetUrl}/api/alvis/payment/cashfree/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: cashfreeOrder.order_id,
          payment_id: cashfreePaymentId,
          payment_method: "Cashfree UPI / Gateway"
        })
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setRechargeStep("success");
        fetchWalletInfo();
        fetchTransactions();
      } else {
        setRechargeError(data.message || "Verification pending from Cashfree gateway.");
        setRechargeStep("cashfree");
      }
    } catch (err: any) {
      setRechargeError(err.message || "Error verifying Cashfree transaction.");
      setRechargeStep("cashfree");
    } finally {
      setRechargeLoading(false);
    }
  };

  // Run Live API Search
  const handleRunLiveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;

    try {
      setTestLoading(true);
      setTestError(null);
      setTestResult(null);

      const targetUrl = baseUrl || window.location.origin;
      let endpoint = "";
      let bodyKey = "";

      if (selectedApi === "aadhaar_to_pan") {
        endpoint = `${targetUrl}/api/alvis/lookup/aadhaar-to-pan`;
        bodyKey = "aadhaar";
      } else if (selectedApi === "pan_to_name_dob") {
        endpoint = `${targetUrl}/api/alvis/lookup/pan-to-name-dob`;
        bodyKey = "pan";
      } else if (selectedApi === "number_lookup") {
        endpoint = `${targetUrl}/api/alvis/lookup/number`;
        bodyKey = "number";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": walletData?.api_key || "alvis_live_key_sample"
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

  // Categories definition matching portal design
  const categoriesList = [
    {
      id: "aadhaar",
      title: "Aadhaar Services",
      count: "10 Services",
      countNum: 10,
      icon: Fingerprint,
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      iconBg: "bg-gradient-to-br from-amber-500 to-rose-600 text-white",
      description: "Aadhaar to PAN, Name, Father Name, Address & Linked Mobile lookups."
    },
    {
      id: "pan",
      title: "PAN Services",
      count: "7 Services",
      countNum: 7,
      icon: FileBadge,
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      iconBg: "bg-gradient-to-br from-blue-600 to-indigo-700 text-white",
      description: "PAN to Name & DOB, Verification & Card Details."
    },
    {
      id: "voter",
      title: "Voter Services",
      count: "3 Services",
      countNum: 3,
      icon: Vote,
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      iconBg: "bg-gradient-to-br from-cyan-600 to-blue-700 text-white",
      description: "EPIC Voter ID Search, Father Name & Assembly Details."
    },
    {
      id: "vehicle",
      title: "Vehicle & Driving",
      count: "13 Services",
      countNum: 13,
      icon: Car,
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      iconBg: "bg-gradient-to-br from-emerald-600 to-teal-700 text-white",
      description: "RC Owner Lookup, Driving License Verification & Vehicle Info."
    },
    {
      id: "phone",
      title: "Phone & Telecom",
      count: "8 Services",
      countNum: 8,
      icon: Phone,
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      iconBg: "bg-gradient-to-br from-purple-600 to-indigo-800 text-white",
      description: "Carrier, Circle, Live Identity & Number Lookup API."
    },
    {
      id: "agriculture",
      title: "Agriculture Services",
      count: "5 Services",
      countNum: 5,
      icon: Wheat,
      badgeColor: "bg-lime-500/20 text-lime-300 border-lime-500/30",
      iconBg: "bg-gradient-to-br from-emerald-500 to-green-700 text-white",
      description: "PM Kisan Status, Farmer Registration & Land Records."
    },
    {
      id: "ration",
      title: "Ration & Ayushman",
      count: "3 Services",
      countNum: 3,
      icon: HeartPulse,
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
      iconBg: "bg-gradient-to-br from-rose-500 to-red-700 text-white",
      description: "Ration Card Family Details & Ayushman Bharat Card Lookup."
    },
    {
      id: "bank",
      title: "Bank & Identity",
      count: "6 Services",
      countNum: 6,
      icon: Building2,
      badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/30",
      iconBg: "bg-gradient-to-br from-teal-600 to-cyan-700 text-white",
      description: "Bank Account Verification, IFSC & Account Holder Info."
    }
  ];

  // Sub-services list mapped to categories
  const subServicesList = [
    {
      id: "aadhaar_to_pan",
      categoryId: "aadhaar",
      title: "Aadhaar To All Data Info",
      subtitle: "Full Aadhaar to PAN Linkage",
      price: "₹26.00 / search",
      active: true,
      apiCode: "aadhaar_to_pan",
      description: "Fetch linked PAN card number directly using 12-digit Aadhaar Number.",
      endpoint: `${renderHost}/api/lookup?api_key=${apiKey}&service=aadhaar_to_pan&query=`
    },
    {
      id: "aadhaar_to_name",
      categoryId: "aadhaar",
      title: "Aadhaar to Name",
      subtitle: "Name from Aadhaar",
      price: "₹10.00 / search",
      active: true,
      apiCode: "aadhaar_to_pan",
      description: "Instant name lookup from linked records.",
      endpoint: `${renderHost}/api/lookup?api_key=${apiKey}&service=aadhaar_to_pan&query=`
    },
    {
      id: "aadhaar_to_father",
      categoryId: "aadhaar",
      title: "Aadhaar to Father Name",
      subtitle: "Father's Name Lookup",
      price: "₹15.00 / search",
      active: true,
      apiCode: "aadhaar_to_pan",
      description: "Retrieve father's name associated with identity records.",
      endpoint: `${renderHost}/api/lookup?api_key=${apiKey}&service=aadhaar_to_pan&query=`
    },
    {
      id: "aadhaar_to_address",
      categoryId: "aadhaar",
      title: "Aadhaar to Address",
      subtitle: "Address from Aadhaar",
      price: "₹20.00 / search",
      active: true,
      apiCode: "aadhaar_to_pan",
      description: "Full residential address lookup.",
      endpoint: `${renderHost}/api/lookup?api_key=${apiKey}&service=aadhaar_to_pan&query=`
    },
    {
      id: "aadhaar_to_mobile",
      categoryId: "aadhaar",
      title: "Aadhaar To Mobile",
      subtitle: "Mobile from Aadhaar",
      price: "₹18.00 / search",
      active: true,
      apiCode: "aadhaar_to_pan",
      description: "Find registered mobile number.",
      endpoint: `${renderHost}/api/lookup?api_key=${apiKey}&service=aadhaar_to_pan&query=`
    },
    {
      id: "pan_to_name_dob",
      categoryId: "pan",
      title: "PAN to Name & DOB",
      subtitle: "Full Cardholder Details",
      price: "₹14.00 / search",
      active: true,
      apiCode: "pan_to_name_dob",
      description: "Fetch cardholder full name, DOB, and status from 10-char PAN.",
      endpoint: `${renderHost}/api/lookup?api_key=${apiKey}&service=pancard&query=`
    },
    {
      id: "pan_status_check",
      categoryId: "pan",
      title: "PAN Active Status Check",
      subtitle: "Instant Verification",
      price: "₹5.00 / search",
      active: true,
      apiCode: "pan_to_name_dob",
      description: "Check if PAN is active or operative.",
      endpoint: `${renderHost}/api/lookup?api_key=${apiKey}&service=pancard&query=`
    },
    {
      id: "number_lookup",
      categoryId: "phone",
      title: "Number Lookup API",
      subtitle: "Carrier & Live Identity",
      price: "₹0.50 / search",
      active: true,
      apiCode: "number_lookup",
      description: "Live carrier, telecom circle, and subscriber info for any phone number.",
      endpoint: `${renderHost}/api/lookup?api_key=${apiKey}&service=phone&query=`
    },
    {
      id: "vehicle_rc",
      categoryId: "vehicle",
      title: "RC Owner Lookup",
      subtitle: "Vehicle Info Search",
      price: "₹12.00 / search",
      active: true,
      apiCode: "number_lookup",
      description: "Registration details, chassis number, and owner details.",
      endpoint: `${renderHost}/api/lookup?api_key=${apiKey}&service=vehicle&query=`
    }
  ];

  // Filter categories by search
  const filteredCategories = categoriesList.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCategoryObj = categoriesList.find(c => c.id === selectedCategory);
  const selectedSubServices = subServicesList.filter(s => s.categoryId === selectedCategory);

  return (
    <div className="min-h-screen bg-[#0b132b] text-slate-100 font-sans relative overflow-x-hidden pb-20">
      
      {/* 1. MAIN HEADER BAR */}
      <header className="sticky top-0 z-20 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* Left: Hamburger & Brand Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all active:scale-95"
              aria-label="Open Sidebar Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              onClick={() => {
                setActiveTab("dashboard");
                setSelectedCategory(null);
              }}
              className="cursor-pointer flex items-center gap-2.5"
            >
              <div className="p-2 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl text-white font-bold shadow-lg shadow-blue-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-lg sm:text-xl text-white tracking-tight">
                    ALVIS PORTAL
                  </span>
                  <span className="text-[9px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded uppercase">
                    RETAILER
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">Live API & Verification Console</div>
              </div>
            </div>
          </div>

          {/* Right: Settings Gear, Wallet Balance Pill, Sync Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowKeyModal(true)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
              title="API Settings & Keys"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => fetchWalletInfo()}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-blue-400 rounded-xl border border-slate-700 transition-all"
              title="Refresh Wallet Balance"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
            </button>

            {/* WALLET BALANCE PILL BADGE (Matching Screenshot) */}
            <button
              onClick={() => setShowRechargeModal(true)}
              className="bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/40 text-emerald-400 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-mono font-bold transition-all shadow-md shadow-emerald-950/50 active:scale-95"
            >
              <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>₹{walletData ? walletData.wallet_balance.toFixed(2) : "1800.00"}</span>
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400/80" />
            </button>
          </div>
        </div>
      </header>

      {/* 3. SIDEBAR / DRAWER MENU (Matching Screenshot) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            />

            {/* Slide Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-[#0f172a] border-r border-slate-800 z-50 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                {/* Header */}
                <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">ALVIS PORTAL</h2>
                    <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded uppercase mt-1 inline-block">
                      RETAILER
                    </span>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="p-4 space-y-6">
                  {/* MAIN SECTION */}
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab("dashboard");
                        setSelectedCategory(null);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                        activeTab === "dashboard" && !selectedCategory
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                          : "text-slate-300 hover:bg-slate-800/80"
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>Dashboard</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab("history");
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                        activeTab === "history"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                          : "text-slate-300 hover:bg-slate-800/80"
                      }`}
                    >
                      <History className="w-4 h-4" />
                      <span>History & Records</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab("transactions");
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                        activeTab === "transactions"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                          : "text-slate-300 hover:bg-slate-800/80"
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      <span>Wallet Manager</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowRechargeModal(true);
                        setIsSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-emerald-400 hover:bg-emerald-950/40 border border-emerald-500/20 transition-all"
                    >
                      <Gift className="w-4 h-4 text-emerald-400" />
                      <span>Refer & Earn / Topup</span>
                    </button>
                  </div>

                  {/* PREMIUM FEATURES */}
                  <div className="space-y-1">
                    <div className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      PREMIUM FEATURES
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab("apis");
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                        activeTab === "apis"
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                          : "text-slate-300 hover:bg-slate-800/80"
                      }`}
                    >
                      <Code2 className="w-4 h-4 text-cyan-400" />
                      <span>API Access & Endpoints</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowTesterModal(true);
                        setIsSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-amber-300 hover:bg-slate-800/80 transition-all"
                    >
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Live Search Console</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowRechargeModal(true);
                        setIsSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-indigo-300 hover:bg-slate-800/80 transition-all"
                    >
                      <Award className="w-4 h-4 text-indigo-400" />
                      <span>VIP Unlimited Pass</span>
                    </button>
                  </div>

                  {/* ACCOUNT & SUPPORT */}
                  <div className="space-y-1">
                    <div className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      ACCOUNT & SUPPORT
                    </div>

                    <button
                      onClick={() => {
                        setShowKeyModal(true);
                        setIsSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800/80 transition-all"
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile ({walletData?.user_name || "alvisappapi"})</span>
                    </button>

                    <button
                      onClick={() => {
                        alert("Support Ticket System active. For immediate help, contact support.");
                        setIsSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800/80 transition-all"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>Raise Support Ticket</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Logout */}
              <div className="p-4 border-t border-slate-800">
                <button
                  onClick={async () => {
                    setIsSidebarOpen(false);
                    await signOut();
                    navigate('/login');
                  }}
                  className="w-full py-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>[→ Sign Out Session</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 4. MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-5 space-y-6">

        {/* VIEW A: CATEGORY SUB-SERVICES VIEW (When a category is selected) */}
        {selectedCategory ? (
          <div className="space-y-5">
            {/* Category Header Banner (Matching Screenshot 3) */}
            <div className="bg-[#131e3a] border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all"
                  title="Back to Categories"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {selectedCategoryObj?.title || "Services"}
                    </h2>
                    <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                      {selectedSubServices.length > 0 ? `${selectedSubServices.length} services available` : selectedCategoryObj?.count}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {selectedCategoryObj?.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-Services Grid (Matching Screenshot 3) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedSubServices.map(sub => (
                <div
                  key={sub.id}
                  className="bg-[#162238] hover:bg-[#1c2b47] border border-blue-900/30 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all shadow-lg hover:shadow-blue-500/5 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-rose-600 rounded-xl text-white font-bold shadow-md">
                        <Fingerprint className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                        {sub.price}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                        {sub.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {sub.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setSelectedApi(sub.apiCode as any);
                        setShowTesterModal(true);
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Use Service / Search Now</span>
                    </button>
                  </div>
                </div>
              ))}

              {selectedSubServices.length === 0 && (
                <div className="col-span-full p-8 text-center bg-[#131e3a] border border-slate-800 rounded-2xl">
                  <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-300 font-bold">Services Loading for this category...</p>
                  <p className="text-slate-500 text-xs mt-1">
                    You can use the Live Search console directly from the top header or sidebar.
                  </p>
                  <button
                    onClick={() => setShowTesterModal(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
                  >
                    Open Search Console
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* VIEW B: PORTAL MAIN DASHBOARD (Browse Categories & Search) */
          activeTab === "dashboard" && (
            <div className="space-y-6">

              {/* SEARCH SERVICES INPUT (Matching Screenshot 1) */}
              <div className="relative">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search services... (e.g. Aadhaar, PAN, Number, RC)"
                  className="w-full bg-[#131e3a] border border-slate-800 focus:border-blue-500 text-white rounded-2xl pl-12 pr-4 py-3.5 text-sm placeholder-slate-500 focus:outline-none transition-all shadow-xl"
                />
              </div>

              {/* BROWSE CATEGORIES HEADING (Matching Screenshot 1) */}
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Browse Categories
                </h1>
                <p className="text-slate-400 text-xs mt-0.5">
                  Select a category to explore all available services.
                </p>
              </div>

              {/* CATEGORY GRID (2 Columns on mobile, 4 Columns on Desktop - Matching Screenshot 1) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {filteredCategories.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className="bg-[#162238] hover:bg-[#1c2b47] border border-blue-900/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center justify-between space-y-3 cursor-pointer transition-all hover:scale-[1.02] shadow-lg shadow-black/20 group"
                    >
                      {/* Icon */}
                      <div className={`p-3 sm:p-3.5 rounded-2xl ${cat.iconBg} shadow-md group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>

                      {/* Title & Count */}
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-blue-400 transition-colors">
                          {cat.title}
                        </h3>
                        <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border mt-1.5 ${cat.badgeColor}`}>
                          {cat.count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* QUICK LIVE APIs SECTION */}
              <div className="bg-[#131e3a] border border-slate-800 rounded-2xl p-5 space-y-4 mt-8">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Active Allotted APIs
                    </h3>
                    <p className="text-xs text-slate-400">Direct Render Backend Live Endpoints</p>
                  </div>
                  <button
                    onClick={() => setShowTesterModal(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
                  >
                    <span>Launch Tester</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-[#162238] border border-slate-800 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">1. Aadhaar to PAN</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">₹26.00</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Find linked PAN Card from Aadhaar Number.</p>
                  </div>

                  <div className="bg-[#162238] border border-slate-800 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">2. PAN to Name & DOB</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">₹14.00</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Fetch cardholder full name and DOB.</p>
                  </div>

                  <div className="bg-[#162238] border border-slate-800 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">3. Number Lookup</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">₹0.50</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Live phone carrier & identity details.</p>
                  </div>
                </div>
              </div>

            </div>
          )
        )}

        {/* VIEW C: API ACCESS & DOCUMENTATION TAB */}
        {activeTab === "apis" && (
          <div className="space-y-5">
            <div className="bg-[#131e3a] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-cyan-400" />
                    Allotted Live API Endpoints
                  </h2>
                  <p className="text-slate-400 text-xs">Copy endpoint URLs to integrate in your applications.</p>
                </div>
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="px-3 py-1.5 bg-slate-800 text-cyan-300 font-bold rounded-xl text-xs border border-slate-700"
                >
                  View API Key
                </button>
              </div>

              <div className="space-y-4">
                {[
                  {
                    name: "1. Aadhaar to PAN Lookup API",
                    charge: "₹26.00 / search",
                    endpoint: `${renderHost}/api/alvis/lookup/aadhaar-to-pan?apiKey=${apiKey}&aadhaar=`,
                    desc: "Pass 12-digit Aadhaar number in 'aadhaar' parameter."
                  },
                  {
                    name: "2. PAN Card to Name & DOB API",
                    charge: "₹14.00 / search",
                    endpoint: `${renderHost}/api/alvis/lookup/pan-to-name-dob?apiKey=${apiKey}&pan=`,
                    desc: "Pass 10-character PAN card number in 'pan' parameter."
                  },
                  {
                    name: "3. Number Lookup API",
                    charge: "₹0.50 / search",
                    endpoint: `${renderHost}/api/alvis/lookup/number?apiKey=${apiKey}&number=`,
                    desc: "Pass 10-digit mobile number in 'number' parameter."
                  }
                ].map((item, idx) => (
                  <div key={idx} className="bg-[#162238] border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{item.name}</span>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        {item.charge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2 overflow-hidden">
                      <code className="text-xs font-mono text-cyan-300 truncate">{item.endpoint}</code>
                      <button
                        onClick={() => handleCopyText(item.endpoint, `ep_${idx}`)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold shrink-0"
                      >
                        {copiedId === `ep_${idx}` ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW D: HISTORY & RECORDS TAB */}
        {activeTab === "history" && (
          <div className="bg-[#131e3a] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-400" />
                  Search History Log
                </h2>
                <p className="text-slate-400 text-xs">Real-time history of lookups executed on your account.</p>
              </div>
              <button
                onClick={() => fetchSearches()}
                className="p-2 bg-slate-800 text-blue-400 rounded-xl text-xs border border-slate-700"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3.5">Time</th>
                    <th className="py-3 px-3.5">API Service</th>
                    <th className="py-3 px-3.5">Input Query</th>
                    <th className="py-3 px-3.5">Charge</th>
                    <th className="py-3 px-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {searchHistory.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3.5 text-slate-400 font-mono text-[11px]">
                        {s.date_time ? new Date(s.date_time).toLocaleString("en-IN") : "Just now"}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-white">{s.api_used}</td>
                      <td className="py-2.5 px-3.5 font-mono text-cyan-300">{s.search_input}</td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-emerald-400">₹{s.charged_amount}</td>
                      <td className="py-2.5 px-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                          {s.status || "SUCCESS"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {searchHistory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No search logs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW E: WALLET MANAGER & TRANSACTIONS TAB */}
        {activeTab === "transactions" && (
          <div className="space-y-5">
            {/* Wallet Overview Card */}
            <div className="bg-[#131e3a] border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Wallet Balance</span>
                <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
                  ₹{walletData ? walletData.wallet_balance.toFixed(2) : "1800.00"}
                </div>
                <div className="text-xs text-slate-400 mt-1">Account: {walletData?.user_name || "alvisappapi"}</div>
              </div>

              <button
                onClick={() => setShowRechargeModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/40"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Wallet Money (Cashfree)</span>
              </button>
            </div>

            {/* Transactions Log */}
            <div className="bg-[#131e3a] border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                Transaction Statement
              </h3>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3.5">Date & Time</th>
                      <th className="py-3 px-3.5">Reference ID</th>
                      <th className="py-3 px-3.5">Reason</th>
                      <th className="py-3 px-3.5">Amount</th>
                      <th className="py-3 px-3.5">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactionHistory.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3.5 text-slate-400 font-mono text-[11px]">
                          {tx.date_time ? new Date(tx.date_time).toLocaleString("en-IN") : "Just now"}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-slate-300">{tx.id || tx.reference_id}</td>
                        <td className="py-2.5 px-3.5 text-slate-200">{tx.reason}</td>
                        <td className={`py-2.5 px-3.5 font-mono font-bold ${tx.type === "DEBIT" ? "text-rose-400" : "text-emerald-400"}`}>
                          {tx.type === "DEBIT" ? "-" : "+"}₹{tx.amount}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-cyan-300">₹{tx.balance_after}</td>
                      </tr>
                    ))}
                    {transactionHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No transactions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 5. API KEY & PROFILE MODAL */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#131e3a] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">API Account Credentials</h3>
                </div>
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">User Account Name</label>
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl font-mono text-white font-bold">
                    {walletData?.user_name || "alvisappapi"}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Active Secret API Key</label>
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2">
                    <code className="font-mono text-cyan-300 font-bold truncate">
                      {showKey ? apiKey : apiKey.slice(0, 12) + "••••••••"}
                    </code>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="p-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                      >
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={handleCopyKey}
                        className="p-1.5 bg-cyan-600 text-white rounded hover:bg-cyan-500"
                      >
                        {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Managed Render Backend URL</label>
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl font-mono text-slate-300 text-[11px] truncate">
                    {renderHost}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowKeyModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs"
              >
                Close Window
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. LIVE SEARCH TESTER CONSOLE MODAL */}
      <AnimatePresence>
        {showTesterModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#131e3a] border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">Live Search Console</h3>
                </div>
                <button
                  onClick={() => setShowTesterModal(false)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRunLiveTest} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-300 font-bold block mb-1.5">Select Service</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "aadhaar_to_pan", label: "Aadhaar to PAN (₹26)" },
                      { id: "pan_to_name_dob", label: "PAN to Name (₹14)" },
                      { id: "number_lookup", label: "Number Lookup (₹0.5)" }
                    ].map(api => (
                      <button
                        key={api.id}
                        type="button"
                        onClick={() => setSelectedApi(api.id as any)}
                        className={`p-2.5 rounded-xl border text-[11px] font-bold text-center transition-all ${
                          selectedApi === api.id
                            ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        {api.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1.5">
                    {selectedApi === "aadhaar_to_pan"
                      ? "Enter 12-Digit Aadhaar Number"
                      : selectedApi === "pan_to_name_dob"
                      ? "Enter 10-Char PAN Card Number"
                      : "Enter 10-Digit Mobile Number"}
                  </label>
                  <input
                    type="text"
                    required
                    value={queryInput}
                    onChange={e => setQueryInput(e.target.value)}
                    placeholder={
                      selectedApi === "aadhaar_to_pan"
                        ? "e.g. 5234 8912 3456"
                        : selectedApi === "pan_to_name_dob"
                        ? "e.g. ABCDE1234F"
                        : "e.g. 9876543210"
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>

                {testError && (
                  <div className="p-3 bg-rose-950/60 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{testError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={testLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {testLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>Run Live Lookup Now</span>
                </button>
              </form>

              {/* Response Display */}
              {testResult && (
                <div className="pt-2 border-t border-slate-800">
                  <FormattedResponseCard data={testResult} serviceType={selectedApi} />
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. CASHFREE RECHARGE MODAL */}
      <AnimatePresence>
        {showRechargeModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#131e3a] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Recharge Alvis API Wallet</h3>
                </div>
                <button
                  onClick={() => setShowRechargeModal(false)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* STEP 1: AMOUNT SELECTION */}
              {rechargeStep === "amount" && (
                <form onSubmit={handleInitiateCashfreeCheckout} className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Enter Recharge Amount (₹)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={rechargeAmount}
                      onChange={e => setRechargeAmount(e.target.value)}
                      placeholder="e.g. 260"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1.5">Quick Presets:</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {["50", "100", "260", "500", "1000"].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setRechargeAmount(amt)}
                          className={`py-2 rounded-lg border font-bold text-xs transition-all ${
                            rechargeAmount === amt
                              ? "bg-emerald-600 text-white border-emerald-500"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {rechargeError && (
                    <div className="p-3 bg-rose-950/60 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      {rechargeError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={rechargeLoading}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 disabled:opacity-50"
                  >
                    {rechargeLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    <span>Proceed to Cashfree Checkout (₹{parseFloat(rechargeAmount || "0").toFixed(2)})</span>
                  </button>
                </form>
              )}

              {/* STEP 2: CASHFREE FALLBACK */}
              {rechargeStep === "cashfree" && (
                <div className="text-center space-y-4 text-xs">
                  <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto border border-blue-500/30">
                    <ExternalLink className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Cashfree Gateway Checkout</h4>
                    <p className="text-slate-400 mt-1">Order ID: {cashfreeOrder?.order_id}</p>
                  </div>

                  <button
                    onClick={() => {
                      if (window.Cashfree && cashfreeOrder?.payment_session_id) {
                        try {
                          const cashfree = window.Cashfree({ mode: cashfreeOrder.cf_mode || "production" });
                          cashfree.checkout({
                            paymentSessionId: cashfreeOrder.payment_session_id,
                            redirectTarget: "_self"
                          });
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }}
                    className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl"
                  >
                    Open Cashfree Gateway Page
                  </button>

                  <button
                    onClick={() => {
                      setRechargeStep("processing");
                      handleConfirmCashfreePayment();
                    }}
                    className="w-full py-2 bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold rounded-xl"
                  >
                    Verify Completed Payment
                  </button>
                </div>
              )}

              {/* STEP 3: SUCCESS */}
              {rechargeStep === "success" && (
                <div className="text-center space-y-4 text-xs">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-white text-sm">
                    ₹{parseFloat(rechargeAmount || "0").toFixed(2)} Added Successfully!
                  </h4>
                  <button
                    onClick={() => {
                      setShowRechargeModal(false);
                      setRechargeStep("amount");
                    }}
                    className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl"
                  >
                    Done & Return to Portal
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
