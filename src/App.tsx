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
import ProtectNumberModal from './components/ProtectNumberModal.tsx';
import FormattedResponseCard from './components/FormattedResponseCard.tsx';
import { lookupNumber, ApiResponse, getApiBaseUrl } from './services/api.ts';
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
import PanFind from './pages/PanFind.tsx';
import ScriptPurchase from './pages/ScriptPurchase.tsx';
import CallHistoryNumber from './pages/CallHistoryNumber.tsx';
import SupportGauravBeniwalPage from './pages/SupportGauravBeniwalPage.tsx';
import AlvisAppApi from './pages/AlvisAppApi.tsx';
import ReferralPage from './pages/ReferralPage.tsx';
import WalletHistory from './pages/WalletHistory.tsx';
import ServiceRecords from './pages/ServiceRecords.tsx';
import { DashboardServicesView } from './components/DashboardServicesView.tsx';

import LandingPage from './pages/LandingPage.tsx';

export default function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProtectOpen, setIsProtectOpen] = useState(false);
  const [protectTab, setProtectTab] = useState<'mobile' | 'telegram'>('mobile');

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
      if (e.detail && e.detail.tab) {
        setProtectTab(e.detail.tab);
      } else {
        setProtectTab('mobile');
      }
      setIsProtectOpen(true);
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
        <Route path="/alvisappapi" element={<AlvisAppApi />} />
        <Route path="/Alvisappapi" element={<AlvisAppApi />} />
        <Route path="/telegram" element={<Home service="telegram" />} />
        <Route path="/identity" element={<Home service="adhr" />} />
        <Route path="/bank" element={<Home service="bnk" />} />
        <Route path="/vehicle" element={<Home service="vehicle" />} />
        <Route path="/veh-owner" element={<Home service="veh_owner_num" />} />
        <Route path="/pancard" element={<Home service="pancard" />} />
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
        <Route path="/account/api" element={<ApiDocs />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route path="/api" element={<ApiDocs />} />
        <Route path="/developer-api" element={<ApiDocs />} />
        <Route path="/referral" element={<ReferralPage />} />
        <Route path="/refer" element={<ReferralPage />} />
        <Route path="/wallet-history" element={<WalletHistory />} />
        <Route path="/wallet" element={<WalletHistory />} />
        <Route path="/service-records" element={<ServiceRecords />} />
        <Route path="/history" element={<ServiceRecords />} />
        <Route path="/panfind" element={<Home service="aadhaar_to_pan" />} />
        
        {/* Separate Free Public & Payment Pages */}
        <Route path="/supportgauravbeniwalonyoutube" element={<SupportGauravBeniwalPage />} />
        <Route path="/SupportGauravBeniwalOnYouTube" element={<SupportGauravBeniwalPage />} />
        <Route path="/callhistorynumber" element={<CallHistoryNumber />} />
        <Route path="/script" element={<ScriptPurchase />} />
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

function Home({ service = 'phone' }: { service?: 'phone' | 'telegram' | 'adhr' | 'bnk' | 'vehicle' | 'pancard' | 'aadhaar_to_pan' | 'email' | 'veh_owner_num' }) {
  const { user, profile, loading, isDemoMode, exitDemoMode, signOut, refreshProfile } = useAuth();
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
    window.dispatchEvent(new CustomEvent('open-protect'));
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
      } else if (result.results) {
        targetObj = result.results;
      } else {
        targetObj = result;
      }
    }

    if (!targetObj) return "";

    let str = typeof targetObj === 'string' ? targetObj : JSON.stringify(targetObj, null, 2);

    // Clean brandings and watermarks properly
    str = str
      .replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier|vishal[\s\-_]*boss|developer|provider|api_buy_link|website_link|buy_api|contact|support|exploitsindia\.site|techvishalboss\.com|exploitsindia|techvishal|cyber|Cyb3r|S0ldier)/gi, "")
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
    } else if (service === 'bnk') {
      messages = [
        'Interrogating Clearing Houses...',
        'Resolving IFSC Routing Indexes...',
        'Retrieving Branch Configurations...',
        'Validating Settlement Networks...',
        'Exporting Bank Intel Reports...'
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
    } else if (service === 'pancard') {
      messages = [
        'Connecting to Income Tax Department Registry...',
        'Decrypting PN/PAN Card Records...',
        'Verifying Permanent Account Holder...',
        'Correlating Status & Category Indexes...',
        'Structuring Financial Intel Logs...'
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

    if (activeService === 'phone') {
      if (targetVal.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
    } else if (activeService === 'telegram') {
      if (targetVal.length < 3) {
        setError('Please enter a valid Telegram username.');
        return;
      }
    } else if (activeService === 'adhr') {
      if (targetVal.length < 12) {
        setError('Please enter a valid 12-digit Identity/Aadhaar number.');
        return;
      }
    } else if (activeService === 'aadhaar_to_pan') {
      if (targetVal.length < 12) {
        setError('Please enter a valid 12-digit Aadhaar number.');
        return;
      }
    } else if (activeService === 'bnk') {
      if (targetVal.length < 11) {
        setError('Please enter a valid 11-digit IFSC code (e.g., ABCD0001325).');
        return;
      }
    } else if (activeService === 'vehicle') {
      if (targetVal.length < 3) {
        setError('Please enter a valid Vehicle Number (e.g., DL1CA1234).');
        return;
      }
    } else if (activeService === 'veh_owner_num') {
      if (targetVal.length < 3) {
        setError('Please enter a valid Vehicle Number (e.g., HR60E3838).');
        return;
      }
    } else if (activeService === 'pancard') {
      if (targetVal.length < 5) {
        setError('Please enter a valid PN/PAN Card Number (e.g., ABCDE1234F).');
        return;
      }
    } else if (activeService === 'email') {
      if (!targetVal.includes('@') || !targetVal.includes('.')) {
        setError('Please enter a valid Email Address (e.g., test@gmail.com).');
        return;
      }
    }

    let creditCost = 2;
    if (activeService === 'telegram') {
      creditCost = 8;
    } else if (activeService === 'adhr') {
      creditCost = 10;
    } else if (activeService === 'bnk') {
      creditCost = 10;
    } else if (activeService === 'vehicle') {
      creditCost = 5;
    } else if (activeService === 'veh_owner_num') {
      creditCost = 15;
    } else if (activeService === 'pancard') {
      creditCost = 10;
    } else if (activeService === 'aadhaar_to_pan') {
      creditCost = 150;
    } else if (activeService === 'email') {
      creditCost = 20;
    }

    if ((profile?.credits || 0) < creditCost) {
      setError(`Insufficient Wallet Balance: This lookup costs ₹${creditCost}.00, but your current balance is ₹${profile?.credits || 0}.00. Please top up your wallet.`);
      handleOpenPricing();
      return;
    }


    // Credit checks are now handled securely on the backend.
  

    setError(null);
    setIsLoading(true);
    setResult(null);
    setAadhaarPanResult(null);

    try {
      // CHECK PROTECTION
      let isProtected = false;
      if (service === 'phone' || service === 'telegram') {
        const checkProtectedResponse = await fetch(`${getApiBaseUrl()}/api/check-protected`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ type: service, query: targetVal })
        });
        if (checkProtectedResponse.ok) {
          const { isProtected: protectedResult } = await checkProtectedResponse.json();
          if (protectedResult) isProtected = true;
        }
      }

      if (isProtected) {
        setError(`This ${service === 'phone' ? 'number' : 'Telegram handle'} is protected with TRACEXDATA Protection feature. 🛡️\nWant to protect your own record to stay safe from unauthorized searches? Click here.`);
        setIsLoading(false);
        return;
      }

      // Import corresponding lookups
      const { lookupTelegram, lookupAdhr, lookupBnk, lookupVehicle, lookupVehOwnerNum, lookupPancard, lookupAadhaarToPan, lookupEmail } = await import('./services/api.ts');

      if (service === 'aadhaar_to_pan') {
        setAadhaarPanResult(null);
        setResult(null);
        setError(null);
        setIsLoading(true);
        setLoadingMessage('Bypassing Rate Limits...');

        try {
          const resStep1 = await lookupAadhaarToPan(targetVal);

          await refreshProfile(); // update user credits instantly

          if (resStep1.status === 'success' && resStep1.pan_found) {
            const pan = resStep1.pan;
            setAadhaarPanResult({
              pan: pan,
              aadhaar_response: resStep1.results,
              pancard_loading: true,
              pancard_result: null,
              pancard_error: null
            });
            setIsLoading(false);

            // Automatically proceed to Step 2
            try {
              const panDetails = await lookupPancard(pan);
              if (panDetails.status && (panDetails.results || panDetails.raw_results)) {
                setAadhaarPanResult(prev => prev ? {
                  ...prev,
                  pancard_loading: false,
                  pancard_result: panDetails,
                  pancard_error: null
                } : null);
              } else {
                setAadhaarPanResult(prev => prev ? {
                  ...prev,
                  pancard_loading: false,
                  pancard_result: null,
                  pancard_error: panDetails.error || 'Failed to retrieve PAN Card details.'
                } : null);
              }
            } catch (panErr: any) {
              setAadhaarPanResult(prev => prev ? {
                ...prev,
                pancard_loading: false,
                pancard_result: null,
                pancard_error: panErr.message || 'Error occurred while fetching PAN details.'
              } : null);
            }
          } else {
            setIsLoading(false);
            setError(resStep1.message || 'No PAN number found for this Aadhaar number. Any charged credits have been instantly refunded.');
          }
        } catch (err: any) {
          setIsLoading(false);
          setError(err.message || 'The Aadhaar to PAN gateway encountered an error.');
        }
        setCooldown(5);
        return;
      }

      let data: any;
      if (service === 'phone') {
        data = await lookupNumber(targetVal);
      } else if (service === 'telegram') {
        data = await lookupTelegram(targetVal);
      } else if (service === 'adhr') {
        data = await lookupAdhr(targetVal);
      } else if (service === 'bnk') {
        data = await lookupBnk(targetVal);
      } else if (service === 'vehicle') {
        data = await lookupVehicle(targetVal);
      } else if (service === 'veh_owner_num') {
        data = await lookupVehOwnerNum(targetVal);
      } else if (service === 'pancard') {
        data = await lookupPancard(targetVal);
      } else if (service === 'email') {
        data = await lookupEmail(targetVal);
      }

      const hasValidData = (data.results && Object.keys(data.results).length > 0) || (data.raw_results && data.raw_results.trim().length > 0);
      
      if (data.status && hasValidData) {
        // Render results IMMEDIATELY
        setResult(data);
        setCooldown(5);
      } else {
        setError(data.error || 'No records found for this query. If any credits were charged, they have been automatically refunded.');
      }
    } catch (err: any) {
      console.error('Lookup processing failure:', err);
      setError(err.message || 'The TRACEXDATA engine encountered a connection fault. Please retry.');
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
    if (service === 'bnk') return 'VIP BA&NK Lookup';
    if (service === 'vehicle') return 'VIP Vehicle Lookup';
    if (service === 'veh_owner_num') return 'VIP Vehicle To Owner Details Lookup';
    if (service === 'pancard') return 'VIP PN/PAN Card Lookup';
    if (service === 'aadhaar_to_pan') return 'VIP Aadhaar to PAN Lookup';
    if (service === 'email') return 'VIP Email Lookup';
    return 'VIP Number Details Lookup';
  };

  const getInputPlaceholder = () => {
    if (service === 'telegram') return 'Enter Telegram Username (e.g. @Gaurav_beniwal_0001)...';
    if (service === 'adhr') return 'Enter Identity/Aadhaar query (e.g. 962397300673)...';
    if (service === 'bnk') return 'Enter Bank query or IFSC code (e.g. HDFC0001325)...';
    if (service === 'vehicle') return 'Enter Vehicle Number (e.g. BR07PB6268)...';
    if (service === 'veh_owner_num') return 'Enter Vehicle Number for Owner Details (e.g. HR60E3838)...';
    if (service === 'pancard') return 'Enter PN/PAN Card Number (e.g. NTEPK1628C)...';
    if (service === 'aadhaar_to_pan') return 'Enter 12-digit Aadhaar Number...';
    if (service === 'email') return 'Enter Email Address (e.g. test@gmail.com)...';
    return 'Search number...';
  };

  return (
    <div className={`relative min-h-screen text-slate-800 selection:bg-sky-200 selection:text-sky-900 overflow-x-hidden bg-slate-50/50 ${IS_TESTING_MODE ? 'pt-[36px]' : ''}`}>
      <LiquidBackground />
      
      {IS_TESTING_MODE && (
        <div className="fixed top-0 left-0 right-0 h-[36px] bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 text-white text-[10px] md:text-xs font-bold text-center z-[100] flex items-center justify-center gap-2 border-b border-sky-300/30 backdrop-blur-md shadow-md">
          <span className="inline-block animate-pulse w-2 h-2 rounded-full bg-emerald-300" />
          <span>🧪 Testing Mode Active — Free Search Enabled Without Sign-In</span>
          <span className="hidden sm:inline bg-white/20 text-white border border-white/30 text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-extrabold">Unrestricted Admin Access</span>
        </div>
      )}

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
                data={result || aadhaarPanResult || getFormattedResponse()}
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
                    Protect Now (₹79)
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

