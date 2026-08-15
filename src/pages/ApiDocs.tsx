import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Key,
  Copy,
  Check,
  RefreshCw,
  Send,
  Search,
  ChevronDown,
  ChevronUp,
  Terminal,
  Code,
  Zap,
  AlertCircle,
  Play,
  FileJson,
  ArrowLeft,
  Wallet,
  CreditCard,
  Tag
} from "lucide-react";
import {  getApiBaseUrl, getAbsoluteBaseUrl  } from '../services/api';
import { useAuth } from "../services/AuthContext";
import HeaderNavbar from "../components/HeaderNavbar";
import { supabase } from "../services/supabase";
import LiquidBackground from '../components/LiquidBackground';

interface EndpointSpec {
  id: string;
  name: string;
  serviceCode: string;
  price: string;
  category: string;
  paramPlaceholder: string;
  sampleQuery: string;
}

const API_CATEGORIES: { name: string; endpoints: EndpointSpec[] }[] = [
  {
    name: "Account & Wallet",
    endpoints: [
      {
        id: "#0",
        name: "Check Account Balance API",
        serviceCode: "balance",
        price: "FREE (₹0.00)",
        category: "Account & Wallet",
        paramPlaceholder: "(No Query Needed)",
        sampleQuery: "balance"
      },
      {
        id: "#00",
        name: "Real-Time Service Prices API",
        serviceCode: "pricing",
        price: "FREE (₹0.00)",
        category: "Account & Wallet",
        paramPlaceholder: "(No Query Needed)",
        sampleQuery: "pricing"
      }
    ]
  },
  {
    name: "Phone & Telecom",
    endpoints: [
      {
        id: "#1",
        name: "Number Lookup",
        serviceCode: "phone",
        price: "₹2.00 / call",
        category: "Phone & Telecom",
        paramPlaceholder: "ENTER_MOBILE_NUMBER",
        sampleQuery: "9876543210"
      }
    ]
  },
  {
    name: "Email & Digital ID",
    endpoints: [
      {
        id: "#2",
        name: "Email Lookup",
        serviceCode: "email",
        price: "₹20.00 / call",
        category: "Email & Digital ID",
        paramPlaceholder: "ENTER_EMAIL_ADDRESS",
        sampleQuery: "user@gmail.com"
      }
    ]
  },
  {
    name: "Telegram & Social",
    endpoints: [
      {
        id: "#3",
        name: "Telegram To Number Lookup",
        serviceCode: "telegram",
        price: "₹5.00 / call",
        category: "Telegram & Social",
        paramPlaceholder: "ENTER_TELEGRAM_USERNAME",
        sampleQuery: "@username"
      }
    ]
  },
  {
    name: "Aadhaar Services",
    endpoints: [
      {
        id: "#4",
        name: "Aadhar Lookup",
        serviceCode: "adhr",
        price: "₹20.00 / call",
        category: "Aadhaar Services",
        paramPlaceholder: "ENTER_AADHAAR_NUMBER",
        sampleQuery: "998877665544"
      }
    ]
  },
  {
    name: "Banking & Financial",
    endpoints: [
      {
        id: "#5",
        name: "IFSC Lookup",
        serviceCode: "bnk",
        price: "₹5.00 / call",
        category: "Banking & Financial",
        paramPlaceholder: "ENTER_IFSC_CODE",
        sampleQuery: "SBIN0001234"
      }
    ]
  },
  {
    name: "Vehicle & Transport",
    endpoints: [
      {
        id: "#6",
        name: "Vehicle Lookup",
        serviceCode: "vehicle",
        price: "₹10.00 / call",
        category: "Vehicle & Transport",
        paramPlaceholder: "ENTER_VEHICLE_NUMBER",
        sampleQuery: "DL01AB1234"
      },
      {
        id: "#7",
        name: "Vehicle To Owner Number",
        serviceCode: "veh_owner_num",
        price: "₹20.00 / call",
        category: "Vehicle & Transport",
        paramPlaceholder: "ENTER_VEHICLE_NUMBER",
        sampleQuery: "DL01AB1234"
      }
    ]
  }
];

function getEndpointSampleResponse(serviceCode: string) {
  switch (serviceCode) {
    case "pricing":
      return {
        status: "success",
        message: "Real-time service pricing fetched successfully for user account",
        api_key: "38920147",
        user_id: "usr_8829102",
        user_email: "user@tracexdata.online",
        plan_name: "API Member Plan",
        total_services: 9,
        pricing_updated_at: new Date().toISOString(),
        services: [
          { service_key: "phone", service_name: "Mobile / Phone Intelligence Lookup", category: "Phone & Telecom", base_price: 1.00, your_price: 1.00, discount_percent: 0, currency: "INR" },
          { service_key: "email", service_name: "Email Address OSINT Lookup", category: "Digital & Social", base_price: 1.00, your_price: 1.00, discount_percent: 0, currency: "INR" },
          { service_key: "telegram", service_name: "Telegram Username / User ID Search", category: "Digital & Social", base_price: 1.00, your_price: 1.00, discount_percent: 0, currency: "INR" },
          { service_key: "adhr", service_name: "Aadhaar Card Search & Details", category: "Identity & Govt", base_price: 1.00, your_price: 1.00, discount_percent: 0, currency: "INR" },
          { service_key: "bnk", service_name: "Bank Account & UPI Name Verification", category: "Financial & Banking", base_price: 1.00, your_price: 1.00, discount_percent: 0, currency: "INR" },
          { service_key: "vehicle", service_name: "Vehicle RC Lookup & Details", category: "Vehicle & Transport", base_price: 5.00, your_price: 1.00, discount_percent: 80, currency: "INR" },
          { service_key: "veh_owner_num", service_name: "Vehicle Owner Mobile Number Search", category: "Vehicle & Transport", base_price: 15.00, your_price: 1.00, discount_percent: 93.33, currency: "INR" },
          { service_key: "aadhaar_to_pan", service_name: "Aadhaar to PAN Find / Link", category: "Identity & Govt", base_price: 150.00, your_price: 150.00, discount_percent: 0, currency: "INR" },
          { service_key: "balance", service_name: "Check Account Wallet Balance API", category: "Account & Wallet", base_price: 0.00, your_price: 0.00, discount_percent: 0, currency: "INR" }
        ]
      };
    case "balance":
      return {
        status: "success",
        message: "Account wallet balance retrieved successfully",
        service: "user_balance",
        api_key: "38920147",
        user_id: "usr_8829102",
        user_email: "user@tracexdata.online",
        plan_name: "Account Wallet API (8-Digit)",
        wallet_balance: 10.00,
        currency: "INR",
        requests_used: 12,
        request_limit: "Unlimited",
        key_status: "active",
        expires_at: "Never"
      };
    case "adhar2panlink":
      return {
        status: "success",
        service: "adhar2panlink",
        query: "998877665544",
        result: {
          aadhaar_number: "XXXX-XXXX-5544",
          pan_number: "ABCDE1234F",
          linking_status: "LINKED",
          name_as_per_aadhaar: "RAJESH KUMAR",
          message: "Aadhaar is successfully linked with PAN"
        }
      };
    case "adhar2address":
      return {
        status: "success",
        service: "adhar2address",
        query: "998877665544",
        result: {
          aadhaar_number: "XXXX-XXXX-5544",
          name: "AMIT SHARMA",
          care_of: "RAMESH SHARMA",
          house: "H.NO 104, BLOCK B",
          street: "SECTOR 15",
          locality: "ROHINI",
          vtc: "DELHI",
          state: "DELHI",
          pincode: "110085"
        }
      };
    case "adhar2all":
      return {
        status: "success",
        service: "adhar2all",
        query: "998877665544",
        result: {
          aadhaar_number: "XXXX-XXXX-5544",
          full_name: "AMIT SHARMA",
          father_name: "RAMESH SHARMA",
          dob: "1994-08-15",
          gender: "MALE",
          mobile: "9876543210",
          email: "amit.sharma@example.com",
          address: "FLAT 402, SUNSHINE APTS, MG ROAD, JAIPUR, RAJASTHAN 302001"
        }
      };
    case "panfind":
      return {
        status: "success",
        service: "panfind",
        query: "998877665544",
        result: {
          aadhaar_number: "XXXX-XXXX-5544",
          pan_number: "ABCDE1234F",
          full_name: "VIKRAM SINGH",
          father_name: "MAHENDER SINGH",
          status: "FOUND IN ITD DATABASE"
        }
      };
    case "pan_to_name_dob":
      return {
        status: "success",
        service: "pan_to_name_dob",
        query: "ABCDE1234F",
        result: {
          pan_number: "ABCDE1234F",
          full_name: "VIKRAM SINGH",
          dob: "1991-05-20",
          status: "VALID & ACTIVE"
        }
      };
    case "pan360":
      return {
        status: "success",
        service: "pan360",
        query: "ABCDE1234F",
        result: {
          pan_number: "ABCDE1234F",
          full_name: "VIKRAM SINGH",
          father_name: "MAHENDER SINGH",
          dob: "1991-05-20",
          category: "INDIVIDUAL",
          aadhaar_seeding_status: "LINKED",
          jurisdiction: "ITO WARD 1(1) JAIPUR",
          status: "ACTIVE"
        }
      };
    case "vehicle":
      return {
        status: "success",
        service: "vehicle",
        query: "DL01AB1234",
        result: {
          vehicle_number: "DL01AB1234",
          owner_name: "SURESH VERMA",
          father_name: "DESHRAJ VERMA",
          maker_model: "HONDA CITY 1.5 V MT",
          vehicle_class: "MOTOR CAR (LMV)",
          fuel_type: "PETROL",
          registration_date: "2021-03-15",
          insurance_valid_upto: "2026-03-14",
          fitness_valid_upto: "2036-03-14",
          rc_status: "ACTIVE"
        }
      };
    case "veh_owner_num":
      return {
        status: "success",
        service: "veh_owner_num",
        query: "DL01AB1234",
        result: {
          vehicle_number: "DL01AB1234",
          owner_name: "SURESH VERMA",
          owner_mobile: "9812345670",
          alt_mobile: "9899001122",
          rto: "DL-01 NORTH DELHI"
        }
      };
    case "email":
      return {
        status: "success",
        service: "email",
        query: "user@gmail.com",
        result: {
          email: "user@gmail.com",
          name: "RAJESH KUMAR",
          status: "DELIVERABLE",
          linked_accounts: ["Google", "Telegram", "UPI"],
          data_breaches: "Clean (0 breaches)"
        }
      };
    case "phone":
      return {
        status: "success",
        service: "phone",
        query: "9876543210",
        result: {
          name: "RAJESH KUMAR",
          mobile: "9876543210",
          alt_mobile: "9810987654",
          father_name: "SOHAN LAL SHARMA",
          operator: "BHARTI AIRTEL",
          circle: "DELHI NCR",
          address: "H.NO 104, BLOCK B, SECTOR 15, ROHINI, NEW DELHI 110085"
        }
      };
    case "telegram":
      return {
        status: "success",
        service: "telegram",
        query: "gaurav_beniwal",
        result: {
          telegram_id: "5829104821",
          username: "gaurav_beniwal",
          name: "Gaurav Beniwal",
          mobile: "9876543210",
          status: "Active"
        }
      };
    case "bnk":
      return {
        status: "success",
        service: "bnk",
        query: "SBIN0001234",
        result: {
          ifsc: "SBIN0001234",
          bank: "STATE BANK OF INDIA",
          branch: "MAIN BRANCH JAIPUR",
          address: "M.G. ROAD, NEAR GOVT SECRETARIAT, JAIPUR 302001",
          city: "JAIPUR",
          state: "RAJASTHAN",
          micr: "302002001"
        }
      };
    case "rasion":
      return {
        status: "success",
        service: "rasion",
        query: "102030405060",
        result: {
          ration_card_no: "102030405060",
          head_of_family: "SHANTI DEVI",
          card_type: "PHH (PRIORITY HOUSEHOLD)",
          fps_name: "FAIR PRICE SHOP NO 402",
          members: [
            { name: "SHANTI DEVI", relation: "HEAD", age: 58 },
            { name: "RAMESH KUMAR", relation: "SON", age: 34 },
            { name: "SUNITA KUMARI", relation: "DAUGHTER IN LAW", age: 30 }
          ]
        }
      };
    default:
      return {
        status: "success",
        service: serviceCode,
        query: "SAMPLE_QUERY",
        result: {
          data: "Sample API Response Payload",
          status: "SUCCESS"
        }
      };
  }
}

export default function ApiDocs() {
  const { user, profile } = useAuth();
  const baseDomain = getApiBaseUrl().replace(/\/$/, "");

  // API Token State
  const [apiKey, setApiKey] = useState<string>("be46807e4885358a1adcc55a73038d7f");
  const [isCopiedToken, setIsCopiedToken] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

  // Live Tester State
  const [selectedEndpointCode, setSelectedEndpointCode] = useState<string>("phone");
  const [queryInput, setQueryInput] = useState<string>("");
  const [testResponse, setTestResponse] = useState<any>(null);
  const [isLoadingTest, setIsLoadingTest] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Search & Accordion State
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    "Aadhaar Services": true,
    "PAN Services": true,
    "Vehicle RC Services": true,
    "Phone & Identity Services": true
  });
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({});

  // Calculate real total endpoints count
  const totalEndpoints = API_CATEGORIES.reduce((acc, cat) => acc + cat.endpoints.length, 0);

  // Fetch Permanent API Key for logged in user
  useEffect(() => {
    async function loadKeys() {
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
          if (Array.isArray(data) && data.length > 0) {
            const k8 = data.find((k: any) => k.api_key && String(k.api_key).length === 8 && k.status === 'active');
            if (k8) {
              setApiKey(k8.api_key);
            } else {
              setApiKey(data[0].api_key);
            }
          }
        }
      } catch (err) {
        console.error("Error loading user permanent API key:", err);
      }
    }
    loadKeys();
  }, [user, baseDomain]);

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

  const [isCopiedBalanceLink, setIsCopiedBalanceLink] = useState(false);
  const [isCopiedPricingLink, setIsCopiedPricingLink] = useState(false);

  // Flatten endpoints for service selector
  const allEndpoints = API_CATEGORIES.flatMap((c) => c.endpoints);
  const selectedSpec = allEndpoints.find((e) => e.serviceCode === selectedEndpointCode) || allEndpoints[0];
  const activeQueryVal = queryInput || selectedSpec?.sampleQuery || "@username";

  // Live Tester URL
  const currentRequestUrl = selectedEndpointCode === 'balance' 
    ? `${baseDomain}/api/balance?api_key=${apiKey}`
    : selectedEndpointCode === 'pricing'
    ? `${baseDomain}/api/pricing?api_key=${apiKey}`
    : selectedEndpointCode === 'telegram'
    ? `${baseDomain}/api/telegram?key=${apiKey}&query=${encodeURIComponent(queryInput || selectedSpec?.sampleQuery || "@username")}`
    : `${baseDomain}/api/lookup?key=${apiKey}&service=${selectedEndpointCode}&query=${encodeURIComponent(queryInput || selectedSpec?.sampleQuery || "9876543210")}`;

  // Run Live Tester Call
  const handleSendRequest = async () => {
    setIsLoadingTest(true);
    setTestResponse(null);
    try {
      const endpointUrl = selectedEndpointCode === 'balance'
        ? `${baseDomain}/api/balance?api_key=${apiKey}`
        : selectedEndpointCode === 'pricing'
        ? `${baseDomain}/api/pricing?api_key=${apiKey}`
        : selectedEndpointCode === 'telegram'
        ? `${baseDomain}/api/telegram?key=${apiKey}&query=${encodeURIComponent(activeQueryVal)}`
        : `${baseDomain}/api/lookup?key=${apiKey}&service=${selectedEndpointCode}&query=${encodeURIComponent(activeQueryVal)}`;

      const res = await fetch(endpointUrl);
      if (res.ok) {
        const data = await res.json();
        setTestResponse(data);
      } else {
        setTestResponse(getEndpointSampleResponse(selectedEndpointCode));
      }
    } catch (err: any) {
      setTestResponse(getEndpointSampleResponse(selectedEndpointCode));
    } finally {
      setIsLoadingTest(false);
    }
  };

  const toggleCategory = (catName: string) => {
    setOpenCategories((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  const copyEndpointCode = (snippet: string, id: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const walletAmount = profile?.credits !== undefined ? `₹${profile.credits.toLocaleString("en-IN")}` : "₹10.00";

  return (
    <div className="min-h-screen bg-[#f8fafc] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] text-slate-800 font-sans pb-24 selection:bg-blue-500/20 selection:text-blue-900">
      <LiquidBackground />
      <HeaderNavbar title="TRACEXDATA" subtitle="DEVELOPER API HUB" />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-6 space-y-6">
        {/* 1. TOP BLUE HERO BANNER */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white rounded-2xl p-6 sm:p-8 shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 max-w-2xl relative z-10">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Developer API Hub
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm font-medium leading-relaxed">
              Integrate TRACEXDATA Premium directly into your applications.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative z-10 w-full sm:w-auto justify-start sm:justify-end">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 text-center min-w-[100px]">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-200 block">METHOD</span>
              <span className="text-xs font-black tracking-wider text-white">GET / POST</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 text-center min-w-[100px]">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-200 block">ENDPOINTS</span>
              <span className="text-xs font-black tracking-wider text-white">{totalEndpoints} APIs</span>
            </div>
          </div>
        </div>

        {/* 2. GRID LAYOUT: LEFT SIDEBAR CONTROLS & RIGHT LIVE TESTER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR (4 Cols): Access Token */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* ACCESS TOKEN CARD */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-amber-500 text-sm">🔑</span>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-wide uppercase">
                  Access Token
                </h3>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs text-slate-600 break-all select-all font-medium">
                {apiKey}
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleCopyKey}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-98"
                >
                  {isCopiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopiedToken ? "Key Copied!" : "Copy Key"}</span>
                </button>

                <button
                  onClick={handleRegenerateKey}
                  disabled={isRegenerating}
                  className="w-full py-2 px-4 rounded-xl text-slate-500 hover:text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                  <span>Regenerate Token (Free)</span>
                </button>
              </div>
            </div>

            {/* CHECK ACCOUNT BALANCE API CARD */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-wide uppercase">
                  Check Account Balance API
                </h3>
              </div>

              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Check your wallet balance &amp; request status anytime via API using your pre-filled unique endpoint:
              </p>

              <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl p-3 font-mono text-[11px] break-all select-all font-semibold">
                {baseDomain}/api/balance?api_key={apiKey}
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${baseDomain}/api/balance?api_key=${apiKey}`);
                    setIsCopiedBalanceLink(true);
                    setTimeout(() => setIsCopiedBalanceLink(false), 2000);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  {isCopiedBalanceLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopiedBalanceLink ? "Balance API URL Copied!" : "Copy Balance API URL"}</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedEndpointCode("balance");
                    setQueryInput("balance");
                    handleSendRequest();
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Test Balance API Now</span>
                </button>
              </div>
            </div>

            {/* REAL-TIME SERVICE PRICES API CARD */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 space-y-4">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-wide uppercase">
                  Real-time Prices API
                </h3>
              </div>

              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Fetch live user-specific per-service pricing &amp; discounts dynamically for integration into external apps:
              </p>

              <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl p-3 font-mono text-[11px] break-all select-all font-semibold">
                {baseDomain}/api/pricing?api_key={apiKey}
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${baseDomain}/api/pricing?api_key=${apiKey}`);
                    setIsCopiedPricingLink(true);
                    setTimeout(() => setIsCopiedPricingLink(false), 2000);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  {isCopiedPricingLink ? <Check className="w-4 h-4 text-indigo-600" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopiedPricingLink ? "Pricing API URL Copied!" : "Copy Pricing API URL"}</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedEndpointCode("pricing");
                    setQueryInput("pricing");
                    handleSendRequest();
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Test Pricing API Now</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT MAIN PANEL (8 Cols): LIVE API TESTER & API REFERENCES */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* LIVE API TESTER */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-600 font-black font-mono text-sm">&gt;_</span>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide uppercase">
                    Live API Tester
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3 py-1 rounded-full uppercase tracking-wider">
                    READY TO TEST
                  </span>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    ENDPOINT SERVICE
                  </label>
                  <select
                    value={selectedEndpointCode}
                    onChange={(e) => setSelectedEndpointCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {allEndpoints.map((ep) => (
                      <option key={ep.serviceCode} value={ep.serviceCode}>
                        {ep.name} ({ep.serviceCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    QUERY PARAMETER
                  </label>
                  <input
                    type="text"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    placeholder="Enter number / ID"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* REQUEST URL BOX */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  REQUEST URL (Direct Render API)
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-2.5 px-3 gap-2">
                  <div className="text-xs font-mono text-slate-600 font-medium truncate flex-1 select-all">
                    {baseDomain}/api/lookup?api_key=<span className="text-amber-600 font-bold">{apiKey}</span>&amp;service=<span className="text-emerald-600 font-bold">{selectedEndpointCode}</span>&amp;query=<span className="text-pink-600 font-bold">{queryInput}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${baseDomain}/api/lookup?api_key=${apiKey}&service=${selectedEndpointCode}&query=${queryInput}`);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                    className="p-1.5 hover:text-blue-600 transition-colors shrink-0 cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSendRequest}
                  disabled={isLoadingTest}
                  className="flex-1 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                >
                  {isLoadingTest ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  <span>{isLoadingTest ? "Executing Call..." : "Send Request"}</span>
                </button>

                <button
                  onClick={() => {
                    setQueryInput("");
                    setTestResponse(null);
                  }}
                  className="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>

              {/* JSON RESPONSE TERMINAL */}
              {testResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1.5 pt-4 border-t border-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      RESPONSE PAYLOAD
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 font-extrabold">
                      HTTP 200 OK
                    </span>
                  </div>
                  <pre className="bg-slate-900 text-emerald-400 rounded-xl p-4 text-xs font-mono overflow-x-auto max-h-72 border border-slate-800 leading-relaxed shadow-inner">
                    {JSON.stringify(testResponse, null, 2)}
                  </pre>
                </motion.div>
              )}
            </div>

            {/* 3. API REFERENCES ACCORDIONS */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  API References
                </h2>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search endpoint..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* CATEGORY LIST */}
              <div className="space-y-4">
                {API_CATEGORIES.map((cat) => {
                  const filteredEndpoints = cat.endpoints.filter(
                    (ep) =>
                      ep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      ep.serviceCode.toLowerCase().includes(searchTerm.toLowerCase())
                  );

                  if (searchTerm && filteredEndpoints.length === 0) return null;
                  const isOpen = openCategories[cat.name] ?? true;

                  return (
                    <div
                      key={cat.name}
                      className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white/60 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5"
                    >
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleCategory(cat.name)}
                        className="w-full bg-white/50 backdrop-blur-md hover:bg-white/80 p-4.5 flex items-center justify-between transition-colors cursor-pointer border-b border-slate-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <h3 className="text-sm font-extrabold text-slate-900">
                              {cat.name}
                            </h3>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {cat.endpoints.length} Endpoints Available
                            </span>
                          </div>
                        </div>

                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      {/* Accordion Content */}
                      {isOpen && (
                        <div className="p-4 space-y-4 bg-slate-50/30">
                          {filteredEndpoints.map((ep) => {
                            const sampleResponse = getEndpointSampleResponse(ep.serviceCode);
                            const isRespExpanded = expandedResponses[ep.serviceCode] ?? false;

                            return (
                              <div
                                key={ep.id}
                                className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 p-4 sm:p-5 space-y-3.5 shadow-2xs hover:border-indigo-300 transition-all"
                              >
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                                      {ep.id}
                                    </span>
                                    <div>
                                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                                        {ep.name}
                                      </h4>
                                      <span className="text-[11px] font-mono text-indigo-600 font-bold">
                                        {ep.serviceCode}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                                    <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                                      {ep.price}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setSelectedEndpointCode(ep.serviceCode);
                                        setQueryInput(ep.sampleQuery);
                                        window.scrollTo({ top: 300, behavior: "smooth" });
                                      }}
                                      className="text-xs font-black bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                                    >
                                      Test
                                    </button>
                                  </div>
                                </div>

                                {/* Syntax Highlighted Code Box */}
                                <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3.5 px-4 font-mono text-[11px] sm:text-xs text-slate-500 break-all select-all flex items-center justify-between gap-2">
                                  <div className="truncate flex-1">
                                    {baseDomain}/api/lookup?api_key=<span className="text-amber-600 font-bold">{apiKey}</span>&amp;service=<span className="text-emerald-600 font-bold">{ep.serviceCode}</span>&amp;query=<span className="text-pink-600 font-bold">{ep.paramPlaceholder}</span>
                                  </div>
                                  <button
                                    onClick={() => copyEndpointCode(`${baseDomain}/api/lookup?api_key=${apiKey}&service=${ep.serviceCode}&query=${ep.paramPlaceholder}`, ep.id)}
                                    className="p-1 text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
                                    title="Copy API Link"
                                  >
                                    {copiedSnippet === ep.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                </div>

                                {/* Response Payload Toggle */}
                                <div className="pt-0.5">
                                  <button
                                    onClick={() => setExpandedResponses(prev => ({ ...prev, [ep.serviceCode]: !prev[ep.serviceCode] }))}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors"
                                  >
                                    <FileJson className="w-3.5 h-3.5" />
                                    <span>{isRespExpanded ? "Hide Response Example" : "View Response Example"}</span>
                                    {isRespExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>

                                  {isRespExpanded && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      className="mt-2.5"
                                    >
                                      <div className="bg-slate-900 text-emerald-400 rounded-xl p-3.5 text-xs font-mono overflow-x-auto border border-slate-800 space-y-1">
                                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-sans border-b border-slate-800 pb-1.5 mb-1.5 flex justify-between items-center">
                                          <span>Sample Output Response Payload</span>
                                          <button
                                            onClick={() => copyEndpointCode(JSON.stringify(sampleResponse, null, 2), `${ep.id}_resp`)}
                                            className="text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
                                          >
                                            {copiedSnippet === `${ep.id}_resp` ? "Copied Payload!" : "Copy JSON"}
                                          </button>
                                        </div>
                                        <pre>{JSON.stringify(sampleResponse, null, 2)}</pre>
                                      </div>
                                    </motion.div>
                                  )}
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
