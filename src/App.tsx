/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShieldCheck, AlertCircle, Phone, Info, ChevronRight, User as UserIcon, Coins, LogOut, PlusCircle, X, Zap, Key, Clipboard, Loader2, Check, Terminal, Bell, BellOff, Menu, Moon, Sun, Crown, Gift, Headphones, AlertTriangle, ExternalLink, Building2, Car, Vote, Sprout, Landmark, Wallet } from 'lucide-react';
import LiquidBackground from './components/LiquidBackground.tsx';
import ResultCard from './components/ResultCard.tsx';
import Skeleton from './components/Skeleton.tsx';
import SubscriptionBadge from './components/SubscriptionBadge.tsx';
import LoginScreen from './components/LoginScreen.tsx';
import ProtectNumberModal, { ProtectTabType } from './components/ProtectNumberModal.tsx';
import FormattedResponseCard from './components/FormattedResponseCard.tsx';
import { lookupNumber, ApiResponse, getApiBaseUrl, saveLocalSearchHistory } from './services/api.ts';
import { useAuth, IS_TESTING_MODE } from './services/AuthContext.tsx';
import { supabase } from './services/supabase.ts';
import { cleanIndianPhoneNumber } from './services/utils.ts';
import { initNotificationEngine } from './services/notifications.ts';

import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import HeaderNavbar from './components/HeaderNavbar.tsx';
import ScrollToTop from './components/ScrollToTop.tsx';
import Terms from './pages/Terms.tsx';
import Contact from './pages/Contact.tsx';
import Refund from './pages/Refund.tsx';
import SEOPage from './pages/SEO.tsx';
import AboutGaurav from './pages/AboutGaurav.tsx';
import BuyCredits from './pages/BuyCredits.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import ApiDocs from './pages/ApiDocs.tsx';
import PgPaymentPage from './pages/PgPaymentPage.tsx';
import ScriptPurchase from './pages/ScriptPurchase.tsx';
import CallHistoryNumber from './pages/CallHistoryNumber.tsx';
import SupportGauravBeniwalPage from './pages/SupportGauravBeniwalPage.tsx';
import ReferralPage from './pages/ReferralPage.tsx';
import WalletHistory from './pages/WalletHistory.tsx';
import ServiceRecords from './pages/ServiceRecords.tsx';
import { DashboardServicesView } from './components/DashboardServicesView.tsx';

import LandingPage from './pages/LandingPage.tsx';
import ProtectRecordPage from './pages/ProtectRecordPage.tsx';
import UnlimitedPlans from './pages/UnlimitedPlans.tsx';

export default function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProtectOpen, setIsProtectOpen] = useState(false);
  const [protectTab, setProtectTab] = useState<ProtectTabType>('mobile');

  useEffect(() => {
    const handleLoginEvent = () => setIsLoginOpen(true);
    const handleLaunchPayment = (e: any) => {
      const detail = e.detail;
      if (detail?.type === 'api' && detail?.planId) {
        window.location.href = `/buy-api/${detail.planId}`;
      } else if (detail?.amount) {
        window.location.href = `/pricing?amount=${detail.amount}`;
      } else {
        window.location.href = '/pricing';
      }
    };
    const handleProtectEvent = (e: any) => {
      const tab = e.detail?.tab || 'mobile';
      window.location.href = `/protect?tab=${tab}`;
    };

    window.addEventListener('open-login', handleLoginEvent);
    window.addEventListener('launch-payment', handleLaunchPayment);
    window.addEventListener('open-protect', handleProtectEvent as EventListener);

    // Redirect returned payments to dedicated pricing page
    const searchParams = new URLSearchParams(window.location.search);
    const returnedOrderId = searchParams.get('order_id');
    if (returnedOrderId) {
      window.location.href = `/pricing?order_id=${returnedOrderId}`;
    }

    // Track visitor session via their IP address
    fetch(`${getApiBaseUrl()}/api/visitor/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {
      // Ignore background analytics network errors
    });

    // Initialize true local notification engine
    try {
      initNotificationEngine();
    } catch (err) {
      console.error("Failed to boot notification engine:", err);
    }

    return () => {
      window.removeEventListener('open-login', handleLoginEvent);
      window.removeEventListener('launch-payment', handleLaunchPayment);
      window.removeEventListener('open-protect', handleProtectEvent as EventListener);
    };
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<LoginScreen isSignUpInitial={true} />} />
        <Route path="/register" element={<LoginScreen isSignUpInitial={true} />} />
        <Route path="/dashboard" element={<Home service="phone" />} />
        <Route path="/category/:categoryId" element={<Home service="phone" />} />
        <Route path="/service/:subserviceId" element={<Home service="phone" />} />
        <Route path="/telegram" element={<Home service="telegram" />} />
        <Route path="/identity" element={<Home service="adhr" />} />
        <Route path="/vehicle" element={<Home service="vehicle" />} />
        <Route path="/veh-owner" element={<Home service="veh_owner_num" />} />
        <Route path="/email" element={<Home service="email" />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contactus" element={<Contact />} />
        <Route path="/refund" element={<Refund />} />
        <Route path="/trends" element={<SEOPage />} />
        <Route path="/about-gaurav-beniwal" element={<AboutGaurav />} />
        <Route path="/about" element={<AboutGaurav />} />
        <Route path="/buy-api" element={<ApiDocs />} />
        <Route path="/buy-api/:planId" element={<ApiDocs />} />
        <Route path="/pricing" element={<BuyCredits />} />
        <Route path="/buy-credits" element={<BuyCredits />} />
        <Route path="/unlimited-plans" element={<UnlimitedPlans />} />
        <Route path="/unlimited" element={<UnlimitedPlans />} />
        <Route path="/account/api" element={<ApiDocs />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/:tab" element={<AdminDashboard />} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route path="/api" element={<ApiDocs />} />
        <Route path="/developer-api" element={<ApiDocs />} />
        <Route path="/referral" element={<ReferralPage />} />
        <Route path="/refer" element={<ReferralPage />} />
        <Route path="/wallet-history" element={<WalletHistory />} />
        <Route path="/wallet" element={<WalletHistory />} />
        <Route path="/service-records" element={<ServiceRecords />} />
        <Route path="/history" element={<ServiceRecords />} />
        <Route path="/support" element={<TelegramRedirect />} />
        <Route path="/contact" element={<TelegramRedirect />} />
        
        {/* Separate Free Public & Payment Pages */}
        <Route path="/supportgauravbeniwalonyoutube" element={<SupportGauravBeniwalPage />} />
        <Route path="/SupportGauravBeniwalOnYouTube" element={<SupportGauravBeniwalPage />} />
        <Route path="/callhistorynumber" element={<CallHistoryNumber />} />
        <Route path="/script" element={<ScriptPurchase />} />
        <Route path="/protect" element={<ProtectRecordPage />} />
        <Route path="/protect-record" element={<ProtectRecordPage />} />
        <Route path="/privacy-protection" element={<ProtectRecordPage />} />
        <Route path="/pgpay" element={<PgPaymentPage />} />
        <Route path="/pgpay/:urlAmt" element={<PgPaymentPage fallbackFixed />} />
        <Route path="/:pgpayCustom" element={<PgPaymentPage customSegment />} />
      </Routes>

      <AnimatePresence>
        {isProtectOpen && (
          <ProtectNumberModal initialTab={protectTab} onClose={() => setIsProtectOpen(false)} />
        )}
        {isLoginOpen && (
          <LoginModal onClose={() => setIsLoginOpen(false)} />
        )}
      </AnimatePresence>
    </Router>
  );
}

function TelegramRedirect() {
  useEffect(() => {
    window.location.href = 'https://t.me/Gaurav_beni_0001';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
      <div className="text-center space-y-3 p-6">
        <div className="w-12 h-12 rounded-full border-4 border-sky-500 border-t-transparent animate-spin mx-auto" />
        <h2 className="text-lg font-bold">Redirecting to Official Telegram Support...</h2>
        <p className="text-xs text-slate-400">If you are not redirected automatically, <a href="https://t.me/Gaurav_beni_0001" className="text-sky-400 underline font-bold">click here</a>.</p>
      </div>
    </div>
  );
}

function LoginModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="absolute top-4 right-4 z-50">
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <LoginScreen isModal />
      </motion.div>
    </div>
  );
}

function Home({ service = 'phone' }: { service?: 'phone' | 'telegram' | 'adhr' | 'vehicle' | 'email' | 'veh_owner_num' }) {
  const { user, profile, loading, isDemoMode, exitDemoMode, signOut, refreshProfile, updateProfileCredits } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user && !IS_TESTING_MODE) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);
  const handleOpenLogin = () => {
    window.dispatchEvent(new CustomEvent('open-login'));
  };
  const handleOpenPricing = () => {
    window.dispatchEvent(new CustomEvent('launch-payment'));
  };
  const handleOpenProtect = () => {
    navigate('/protect');
  };
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Initializing Engine...');
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [aadhaarPanResult, setAadhaarPanResult] = useState<{
    pan: string;
    aadhaar_response: any;
    pancard_loading: boolean;
    pancard_result: any;
    pancard_error: string | null;
  } | null>(null);

  const [notifPermission, setNotifPermission] = useState<string>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission('unsupported');
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) return;
    const { requestNotificationPermission } = await import('./services/notifications.ts');
    const granted = await requestNotificationPermission();
    setNotifPermission(Notification.permission);
    if (granted) {
      const { checkAndTriggerNotification } = await import('./services/notifications.ts');
      checkAndTriggerNotification();
    }
  };

  const handleSendTestNotification = async () => {
    const { triggerTestNotificationDirectly } = await import('./services/notifications.ts');
    await triggerTestNotificationDirectly();
  };
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Automatically vanish/clear search results, errors, and input state when page or service changes
  useEffect(() => {
    setError(null);
    setResult(null);
    setAadhaarPanResult(null);
    setPhoneNumber('');
    setIsLoading(false);
  }, [location.pathname, location.search, service]);
  const [copiedStep2, setCopiedStep2] = useState(false);
  const [copiedRawFeed, setCopiedRawFeed] = useState(false);
  const [copiedRawResults, setCopiedRawResults] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const getFormattedResponse = () => {
    let targetObj: any = null;

    if (aadhaarPanResult) {
      targetObj = {
        status: "success",
        pan: aadhaarPanResult.pan,
        aadhaar_details: aadhaarPanResult.aadhaar_response,
      };
      if (aadhaarPanResult.pancard_loading) {
        targetObj.pancard_details = "Loading secondary database registry...";
      } else if (aadhaarPanResult.pancard_error) {
        targetObj.pancard_error = aadhaarPanResult.pancard_error;
      } else if (aadhaarPanResult.pancard_result) {
        targetObj.pancard_details = aadhaarPanResult.pancard_result.results || aadhaarPanResult.pancard_result;
      }
    } else if (result) {
      if (result.raw_results) {
        try {
          targetObj = JSON.parse(result.raw_results);
        } catch (e) {
          targetObj = result.raw_results;
        }
      } else if (result.results && Object.keys(result.results).length > 0) {
        targetObj = result.results;
      } else {
        targetObj = result;
      }
    }

    if (!targetObj) return "";

    let str = typeof targetObj === 'string' ? targetObj : JSON.stringify(targetObj, null, 2);

    // Clean brandings and watermarks properly
    str = str
      .replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier|vishal[\s\-_]*boss|developer|provider|api_buy_link|website_link|buy_api|contact|support|exploitsindia\.site|techvishalboss\.com|exploitsindia|techvishal|cyber|Cyb3r|S0ldier|@?vectraen|vectraen|osintcallerbot)/gi, "")
      .replace(/(💳\s*BUY\s*API\s*:\s*@?\w+|🆘\s*SUPPORT\s*:\s*@?\w+)/gi, "")
      .replace(/(t\.me\/\w+|https?:\/\/(?:www\.)?\w+\.\w+(?:\/\S*)?)/gi, "")
      .replace(/Powered_by/gi, "")
      .replace(/Contact/gi, "")
      .replace(/Buy_API/gi, "")
      .replace(/buy_url/gi, "api_url");

    return str;
  };

  const hasUnlimitedAction = () => {
    if (!profile?.unlimited_expiry) return false;
    return new Date(profile.unlimited_expiry) > new Date();
  };

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Clear inputs on service change
  useEffect(() => {
    setPhoneNumber('');
    setResult(null);
    setAadhaarPanResult(null);
    setError(null);
  }, [service]);

  useEffect(() => {
    if (!isLoading) return;
    
    let messages = [
      'Bypassing Rate Limits...',
      'Opening Deep Core Database...',
      'Searching Encrypted Files...',
      'Decrypting Registry Pack...',
      'Finalizing Intel Reports...'
    ];

    if (service === 'telegram') {
      messages = [
        'Connecting to Telegram Gateway...',
        'Querying API ID Indices...',
        'Scanning Authenticated Records...',
        'Decrypting Linked Accounts...',
        'Filtering Contact Numbers...',
        'Wrapping Telegram Response...'
      ];
    } else if (service === 'adhr') {
      messages = [
        'Syncing with Identity Registries...',
        'Fetching Encrypted Aadhaar Blocks...',
        'Verifying Demographic Credentials...',
        'Processing Profile Matches...',
        'Formatting Identity Intelligence...'
      ];
    } else if (service === 'vehicle') {
      messages = [
        'Connecting to RTO Registry...',
        'Querying License Plate Records...',
        'Decrypting Vehicle Smart Card...',
        'Validating Insurance Status...',
        'Extracting Chassis Credentials...',
        'Finalizing Vehicle Report...'
      ];
    } else if (service === 'veh_owner_num') {
      messages = [
        'Connecting to National Owner Registry...',
        'Resolving License Plate with ID Database...',
        'Mapping Owner Registered Phone Number...',
        'Decrypting Linked Contact Profiles...',
        'Wrapping Owner Intel Response...'
      ];
    }
    
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMessage(messages[i]);
    }, 800);
    return () => clearInterval(interval);
  }, [isLoading, service]);

  const handleSearch = useCallback(async (e?: React.FormEvent, forceQuery?: string, customServiceType?: string) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    const activeService = customServiceType || service;

    if (!user) {
      setError('Authentication Required: Please Sign In to your TRACEXDATA account to continue searching.');
      handleOpenLogin();
      return;
    }

    if (cooldown > 0) {
      setError(`System cooling down. Please wait ${cooldown}s before next query.`);
      return;
    }

    const targetVal = forceQuery || phoneNumber.trim();
    if (!targetVal) return;

    if (activeService === 'phone' || activeService === 'mobile' || activeService === 'number') {
      const cleanPhone = targetVal.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        setError('Please enter a strictly 10-digit mobile number.');
        return;
      }
    } else if (activeService === 'telegram' || activeService === 'tg') {
      if (targetVal.trim().length < 3) {
        setError('Please enter a valid Telegram username or User ID.');
        return;
      }
    } else if (activeService === 'adhr' || activeService === 'aadhaar' || activeService === 'aadhar') {
      const cleanAdhr = targetVal.replace(/\D/g, '');
      if (cleanAdhr.length !== 12) {
        setError('Aadhaar number must be strictly 12 digits.');
        return;
      }
    } else if (activeService === 'vehicle' || activeService === 'veh' || activeService === 'veh_owner_num' || activeService === 'vehicle_owner') {
      const cleanVeh = targetVal.replace(/[^a-zA-Z0-9]/g, '');
      if (cleanVeh.length < 6 || cleanVeh.length > 11) {
        setError('Please enter a valid Vehicle Registration Number (e.g., DL01AB1234).');
        return;
      }
    } else if (activeService === 'email' || activeService === 'gmail' || activeService === 'mail') {
      const cleanEmail = targetVal.trim().toLowerCase();
      if (!cleanEmail.includes('@gmail.com')) {
        setError('Email query cannot be sent without @gmail.com (e.g., user@gmail.com).');
        return;
      }
    }

    const isUnlimited = Boolean(profile?.unlimited_expiry && new Date(profile.unlimited_expiry) > new Date());

    let creditCost = 2;
    if (activeService === 'phone' || activeService === 'number' || activeService === 'mobile') {
      creditCost = 2;
    } else if (activeService === 'telegram' || activeService === 'tg') {
      creditCost = 5;
    } else if (activeService === 'adhr' || activeService === 'aadhaar' || activeService === 'aadhar') {
      creditCost = 25;
    } else if (activeService === 'vehicle' || activeService === 'veh') {
      creditCost = 12;
    } else if (activeService === 'veh_owner_num' || activeService === 'vehicle_owner') {
      creditCost = 25;
    } else if (activeService === 'email' || activeService === 'gmail' || activeService === 'mail') {
      creditCost = 20;
    }

    if (!isUnlimited && profile && profile.credits !== undefined && profile.credits < creditCost && profile.is_free_credit_claimed) {
      setError(`Insufficient Wallet Balance: This lookup costs ₹${creditCost}.00, but your current balance is ₹${profile?.credits || 0}.00. Please top up your wallet.`);
      handleOpenPricing();
      return;
    }
  

    setError(null);
    setIsLoading(true);
    setResult(null);
    setAadhaarPanResult(null);

    try {
      // CHECK PROTECTION
      let isProtected = false;
      try {
        const checkProtectedResponse = await fetch(`${getApiBaseUrl()}/api/check-protected`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ type: activeService, query: targetVal })
        });
        if (checkProtectedResponse.ok) {
          const { isProtected: protectedResult } = await checkProtectedResponse.json();
          if (protectedResult) isProtected = true;
        }
      } catch (e) {
        console.warn("Protection check error:", e);
      }

      if (isProtected) {
        setError(`This record is protected with TRACEXDATA Protection feature. 🛡️\nWant to protect your own record to stay safe from unauthorized searches? Click here.`);
        setIsLoading(false);
        return;
      }

      // Import corresponding lookups
      const { lookupNumber, lookupTelegram, lookupAdhr, lookupVehicle, lookupVehOwnerNum, lookupEmail } = await import('./services/api.ts');

      let data: any;
      if (activeService === 'phone') {
        data = await lookupNumber(targetVal);
      } else if (activeService === 'telegram') {
        data = await lookupTelegram(targetVal);
      } else if (activeService === 'adhr') {
        data = await lookupAdhr(targetVal);
      } else if (activeService === 'vehicle') {
        data = await lookupVehicle(targetVal);
      } else if (activeService === 'veh_owner_num') {
        data = await lookupVehOwnerNum(targetVal);
      } else if (activeService === 'email') {
        data = await lookupEmail(targetVal);
      }

      if (data?.remaining_balance !== undefined) {
        updateProfileCredits(data.remaining_balance);
        refreshProfile().catch(() => {});
      }

      if (!data || data.status === false) {
        setResult(null);
        setError(data?.error || "Sorry, we don't have data related to the query.");
      } else {
        const resObj = data.results;
        const resKeys = typeof resObj === 'object' && resObj !== null ? Object.keys(resObj) : [];
        const hasMeaningfulData = resKeys.some(k => !['error', 'message', 'status', 'success', 'found'].includes(k.toLowerCase()));
        
        if (typeof resObj === 'string' && resObj.trim().length > 0 && !resObj.toLowerCase().includes('no result') && !resObj.toLowerCase().includes('not found') && !resObj.toLowerCase().includes('no record')) {
          setError(null);
          setResult(data);
          setCooldown(5);
          saveLocalSearchHistory(user?.id, activeService, targetVal, data.results || data);
        } else if (hasMeaningfulData || data.raw_results) {
          setError(null);
          setResult(data);
          setCooldown(5);
          saveLocalSearchHistory(user?.id, activeService, targetVal, data.results || data);
        } else {
          setResult(null);
          setError(data.error || (typeof resObj === 'object' && resObj?.error) || "Sorry, we don't have data related to the query.");
        }
      }
    } catch (err: any) {
      console.error('Lookup processing failure:', err);
      const { formatApiError } = await import('./services/api.ts');
      setError(formatApiError(err, activeService === 'phone' ? 'Mobile' : activeService));
      setResult(null);
    } finally {
      setIsLoading(false);
      // Always refresh user profile state to sync latest credit balance with database after lookup attempt
      if (!hasUnlimitedAction() && profile?.id) {
        try {
          await refreshProfile();
        } catch (e) {
          console.error('Failed to refresh profile:', e);
        }
      }
    }
  }, [phoneNumber, profile, service, hasUnlimitedAction, refreshProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getHeaderTitle = () => {
    if (service === 'telegram') return 'VIP Telegram ID Lookup';
    if (service === 'adhr') return 'VIP Identity Card Lookup';
    if (service === 'vehicle') return 'VIP Vehicle Lookup';
    if (service === 'veh_owner_num') return 'VIP Vehicle To Owner Details Lookup';
    if (service === 'email') return 'VIP Email Lookup';
    return 'VIP Number Details Lookup';
  };

  const getInputPlaceholder = () => {
    if (service === 'telegram') return 'Enter Telegram Username (e.g. @Gaurav_beniwal_0001)...';
    if (service === 'adhr') return 'Enter Identity/Aadhaar query (e.g. 962397300673)...';
    if (service === 'vehicle') return 'Enter Vehicle Number (e.g. BR07PB6268)...';
    if (service === 'veh_owner_num') return 'Enter Vehicle Number for Owner Details (e.g. HR60E3838)...';
    if (service === 'email') return 'Enter Email Address (e.g. test@gmail.com)...';
    return 'Search number...';
  };

  return (
    <div className="relative min-h-screen text-slate-800 selection:bg-sky-200 selection:text-sky-900 overflow-x-hidden bg-slate-50/50">
      <LiquidBackground />

      <HeaderNavbar />

      {/* 4. MAIN CONTENT AREA (Exact multi-level views matching Screenshots 1, 2, & 3) */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-6 relative z-10 w-full space-y-6">
        <DashboardServicesView
          initialService={service}
          user={user}
          profile={profile}
          isDemoMode={isDemoMode}
          onOpenPricing={handleOpenPricing}
          onOpenLogin={handleOpenLogin}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          isLoading={isLoading}
          loadingMessage={loadingMessage}
          error={error}
          result={result}
          aadhaarPanResult={aadhaarPanResult}
          handleSearch={handleSearch}
          getFormattedResponse={getFormattedResponse}
          copiedResponse={copiedResponse}
          setCopiedResponse={setCopiedResponse}
          hasUnlimitedAction={hasUnlimitedAction}
          onClearError={() => setError(null)}
        />

        {/* Status Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 p-4 mb-8 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs md:text-sm font-semibold shadow-sm"
            >
              <AlertCircle size={18} className="shrink-0 text-red-500" />
              <span 
                className="flex-1 cursor-pointer whitespace-pre-line"
                onClick={() => {
                  if (error.toLowerCase().includes('sign in')) {
                    handleOpenLogin();
                  }
                  if (error.includes('credits')) handleOpenPricing();
                  if (error.includes('protected')) handleOpenProtect();
                }}
              >
                {error}
              </span>
              {(error.includes('credits') || error.includes('sign in') || error.includes('protected')) && <ChevronRight size={16} />}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setError(null);
                }}
                className="p-1 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-100 transition-colors shrink-0 cursor-pointer ml-1"
                title="Dismiss message"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Results */}
        <div className="min-h-[100px]">
          {isLoading ? (
            <Skeleton message={loadingMessage} />
          ) : (aadhaarPanResult || result) ? (
            <div className="space-y-4">
              <FormattedResponseCard
                data={getFormattedResponse()}
                serviceType={service}
              />

              {service === 'telegram' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card mt-6 p-6 border-amber-200 bg-amber-50/80 text-center flex flex-col items-center gap-3 relative z-10 overflow-hidden shadow-sm"
                >
                  <ShieldCheck className="text-amber-600 w-10 h-10 animate-pulse" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 font-mono">Protect Your Telegram Record 🛡️</h3>
                  <p className="text-xs text-slate-600 max-w-md font-medium leading-relaxed">
                    Prevent other users from tracing your mobile number using your Telegram handle. Secure your Telegram handle on TRACEXDATA lifetime protection.
                  </p>
                  <button
                    onClick={handleOpenProtect}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold uppercase tracking-widest transition-all shadow-md cursor-pointer hover:scale-[1.03] active:scale-[0.98]"
                  >
                    Protect Now (₹99)
                  </button>
                </motion.div>
              )}
            </div>
          ) : null}
        </div>
      </main>

      {/* Clean Corporate Footer */}
      <footer className="w-full py-6 px-4 flex flex-col items-center justify-center relative z-50 bg-white/60 backdrop-blur-md border-t border-slate-200/80">
        <p className="text-xs text-slate-500 font-semibold text-center">
          © {new Date().getFullYear()} TRACEXDATA. All rights reserved.
        </p>
      </footer>

      <AnimatePresence>
        {/* Modals are handled in the parent App component */}
      </AnimatePresence>
    </div>
  );
}

