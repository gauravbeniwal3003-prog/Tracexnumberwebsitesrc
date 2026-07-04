/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShieldCheck, AlertCircle, Phone, Info, History, Trash2, ChevronRight, User as UserIcon, Coins, LogOut, PlusCircle, X, Zap, Key, Clipboard, Loader2, Check, Terminal } from 'lucide-react';
import LiquidBackground from './components/LiquidBackground.tsx';
import ResultCard from './components/ResultCard.tsx';
import Skeleton from './components/Skeleton.tsx';
import SubscriptionBadge from './components/SubscriptionBadge.tsx';
import SubscriptionModal from './components/SubscriptionModal.tsx';
import LoginScreen from './components/LoginScreen.tsx';
import ProtectNumberModal from './components/ProtectNumberModal.tsx';
import { lookupNumber, ApiResponse } from './services/api.ts';
import { saveToHistory, getHistory, clearHistory } from './services/storage.ts';
import { useAuth, IS_TESTING_MODE } from './services/AuthContext.tsx';
import { supabase } from './services/supabase.ts';
import { cleanIndianPhoneNumber } from './services/utils.ts';
import { REDIRECT_URL } from './redirectConfig.ts';
import PromoDealModal from './components/PromoDealModal.tsx';

import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.tsx';
import Terms from './pages/Terms.tsx';
import Contact from './pages/Contact.tsx';
import Refund from './pages/Refund.tsx';
import SEOPage from './pages/SEO.tsx';
import AboutGaurav from './pages/AboutGaurav.tsx';
import BuyApi from './pages/BuyApi.tsx';
import BuyCredits from './pages/BuyCredits.tsx';
import ApiDashboard from './pages/ApiDashboard.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import ApiDocs from './pages/ApiDocs.tsx';
import PgPaymentPage from './pages/PgPaymentPage.tsx';
import PanFind from './pages/PanFind.tsx';

export default function App() {
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProtectOpen, setIsProtectOpen] = useState(false);
  const [protectTab, setProtectTab] = useState<'mobile' | 'telegram'>('mobile');

  useEffect(() => {
    const handleLoginEvent = () => setIsLoginOpen(true);
    const handleLaunchPayment = (e: any) => {
      setPendingPayment(e.detail);
      setIsPricingOpen(true);
    };
    const handleProtectEvent = (e: any) => {
      if (e.detail && e.detail.tab) {
        setProtectTab(e.detail.tab);
      } else {
        setProtectTab('mobile');
      }
      setIsProtectOpen(true);
    };

    // First-click redirect handler
    const handleFirstClickRedirect = () => {
      const hasRedirected = sessionStorage.getItem('first_click_redirected');
      if (!hasRedirected) {
        sessionStorage.setItem('first_click_redirected', 'true');
        // Remove listeners immediately to prevent multiple triggers
        window.removeEventListener('click', handleFirstClickRedirect, true);
        window.removeEventListener('touchend', handleFirstClickRedirect, true);
        
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = REDIRECT_URL;
          } else {
            window.location.href = REDIRECT_URL;
          }
        } catch (e) {
          try {
            window.location.href = REDIRECT_URL;
          } catch (e2) {
            window.open(REDIRECT_URL, '_blank');
          }
        }
      }
    };
    
    window.addEventListener('open-login', handleLoginEvent);
    window.addEventListener('launch-payment', handleLaunchPayment);
    window.addEventListener('open-protect', handleProtectEvent as EventListener);
    window.addEventListener('click', handleFirstClickRedirect, true);
    window.addEventListener('touchend', handleFirstClickRedirect, true);

    // Auto-open subscription modal to process returned payments
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('order_id')) {
      setIsPricingOpen(true);
    }
    
    return () => {
      window.removeEventListener('open-login', handleLoginEvent);
      window.removeEventListener('launch-payment', handleLaunchPayment);
      window.removeEventListener('open-protect', handleProtectEvent as EventListener);
      window.removeEventListener('click', handleFirstClickRedirect, true);
      window.removeEventListener('touchend', handleFirstClickRedirect, true);
    };
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home service="phone" />} />
        <Route path="/telegram" element={<Home service="telegram" />} />
        <Route path="/identity" element={<Home service="adhr" />} />
        <Route path="/bank" element={<Home service="bnk" />} />
        <Route path="/vehicle" element={<Home service="vehicle" />} />
        <Route path="/pancard" element={<Home service="pancard" />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contactus" element={<Contact />} />
        <Route path="/refund" element={<Refund />} />
        <Route path="/trends" element={<SEOPage />} />
        <Route path="/about-gaurav-beniwal" element={<AboutGaurav />} />
        <Route path="/about" element={<AboutGaurav />} />
        <Route path="/buy-api" element={<BuyApi />} />
        <Route path="/buy-api/:planId" element={<BuyApi />} />
        <Route path="/pricing" element={<BuyCredits />} />
        <Route path="/buy-credits" element={<BuyCredits />} />
        <Route path="/account/api" element={<ApiDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route path="/panfind" element={<Home service="aadhaar_to_pan" />} />
        
        {/* Separate Secure Payment Receiving Pages */}
        <Route path="/pgpay" element={<PgPaymentPage />} />
        <Route path="/pgpay/:urlAmt" element={<PgPaymentPage fallbackFixed />} />
        <Route path="/:pgpayCustom" element={<PgPaymentPage customSegment />} />
      </Routes>

      <AnimatePresence>
        {isPricingOpen && (
          <SubscriptionModal 
            onClose={() => {
              setIsPricingOpen(false);
              setPendingPayment(null);
            }} 
            initialPayment={pendingPayment}
          />
        )}
        {isProtectOpen && (
          <ProtectNumberModal initialTab={protectTab} onClose={() => setIsProtectOpen(false)} />
        )}
        {isLoginOpen && (
          <LoginModal onClose={() => setIsLoginOpen(false)} />
        )}
      </AnimatePresence>

      {/* Exclusive Personal Deal Popup */}
      <PromoDealModal />
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

function Home({ service = 'phone' }: { service?: 'phone' | 'telegram' | 'adhr' | 'bnk' | 'vehicle' | 'pancard' | 'aadhaar_to_pan' }) {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
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
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [copiedStep2, setCopiedStep2] = useState(false);
  const [copiedRawFeed, setCopiedRawFeed] = useState(false);
  const [copiedRawResults, setCopiedRawResults] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

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
      .replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier|exploitsindia)/gi, "")
      .replace(/💳\s+BUY\s+API\s*:\s*@?Cyb3rS0ldier/gi, "")
      .replace(/🆘\s+SUPPORT\s*:\s*@?Cyb3rS0ldier/gi, "")
      .replace(/buy_url/gi, "api_url")
      .replace(/https:\/\/tracexdata-api\.onrender\.com\/buy-api/gi, "")
      .replace(/https:\/\/exploitsindia\.site\S*/gi, "")
      .replace(/https:\/\/techvishalboss\.com\S*/gi, "");

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

  const handleSearch = useCallback(async (e?: React.FormEvent, forceQuery?: string) => {
    if (e) e.preventDefault();
    if (isLoading) return;

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

    if (service === 'phone') {
      if (targetVal.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
    } else if (service === 'telegram') {
      if (targetVal.length < 3) {
        setError('Please enter a valid Telegram username.');
        return;
      }
    } else if (service === 'adhr') {
      if (targetVal.length < 12) {
        setError('Please enter a valid 12-digit Identity/Aadhaar number.');
        return;
      }
    } else if (service === 'aadhaar_to_pan') {
      if (targetVal.length < 12) {
        setError('Please enter a valid 12-digit Aadhaar number.');
        return;
      }
    } else if (service === 'bnk') {
      if (targetVal.length < 11) {
        setError('Please enter a valid 11-digit IFSC code (e.g., ABCD0001325).');
        return;
      }
    } else if (service === 'vehicle') {
      if (targetVal.length < 3) {
        setError('Please enter a valid Vehicle Number (e.g., DL1CA1234).');
        return;
      }
    } else if (service === 'pancard') {
      if (targetVal.length < 5) {
        setError('Please enter a valid PN/PAN Card Number (e.g., ABCDE1234F).');
        return;
      }
    }

    let creditCost = 5;
    if (service === 'adhr') {
      creditCost = 12;
    } else if (service === 'bnk') {
      creditCost = 18;
    } else if (service === 'vehicle') {
      creditCost = 10;
    } else if (service === 'pancard') {
      creditCost = 20;
    } else if (service === 'aadhaar_to_pan') {
      creditCost = 150;
    }

    if (!hasUnlimitedAction() && (profile?.credits || 0) < creditCost) {
      setError(`Insufficient Credits: This lookup costs ${creditCost} CTR, but you only have ${profile?.credits || 0} CTR. Please top up your wallet.`);
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
      if (service === 'phone') {
        const { data: protectedData } = await supabase
          .from('protected_numbers')
          .select('phone_number')
          .eq('phone_number', targetVal)
          .maybeSingle();
        if (protectedData) isProtected = true;
      } else if (service === 'telegram') {
        const cleanVal = targetVal.replace(/^@/, '');
        const withAt = `@${cleanVal}`;
        const { data: protectedData1 } = await supabase
          .from('protected_telegrams')
          .select('telegram_id')
          .eq('telegram_id', cleanVal)
          .maybeSingle();
        const { data: protectedData2 } = await supabase
          .from('protected_telegrams')
          .select('telegram_id')
          .eq('telegram_id', withAt)
          .maybeSingle();
        if (protectedData1 || protectedData2) isProtected = true;
      }

      if (isProtected) {
        setError(`This ${service === 'phone' ? 'number' : 'Telegram handle'} is protected with TRACEXDATA Protection feature. 🛡️\nWant to protect your own record to stay safe from unauthorized searches? Click here.`);
        setIsLoading(false);
        return;
      }

      // Import corresponding lookups
      const { lookupTelegram, lookupAdhr, lookupBnk, lookupVehicle, lookupPancard, lookupAadhaarToPan } = await import('./services/api.ts');

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
            setError(resStep1.message || 'No PAN number found for this Aadhaar number. 150 credits deducted.');
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
      } else if (service === 'pancard') {
        data = await lookupPancard(targetVal);
      }

      const hasValidData = (data.results && Object.keys(data.results).length > 0) || (data.raw_results && data.raw_results.trim().length > 0);
      
      if (data.status && hasValidData) {
        // Render results IMMEDIATELY
        setResult(data);
        saveToHistory(targetVal, data);
        setSearchHistory(getHistory());

        // Insert into search_history
        if (user?.id) {
          (async () => {
            try {
              await supabase.from('search_history').insert({
                user_id: user.id,
                user_email: user.email || 'Guest User',
                search_type: service,
                query: targetVal,
                status: 'success'
              });
            } catch (e) {
              console.error('Failed to log search history:', e);
            }
          })();
        }

        // Background credit deduction
        if (!hasUnlimitedAction() && profile?.id) {
          (async () => {
            const deductError = null; // Credit deducted securely on backend
            
            if (!deductError) {
              await refreshProfile();
            }
          })();
        }
        setCooldown(5);
      } else {
        setError(data.error || 'No records found or service temporarily unavailable.');
        
        // Insert into search_history (failed/not_found)
        if (user?.id) {
          (async () => {
            try {
              await supabase.from('search_history').insert({
                user_id: user.id,
                user_email: user.email || 'Guest User',
                search_type: service,
                query: targetVal,
                status: 'not_found'
              });
            } catch (e) {
              console.error('Failed to log search history:', e);
            }
          })();
        }
      }
    } catch (err: any) {
      console.error('Lookup processing failure:', err);
      setError(err.message || 'The TRACEXDATA engine encountered a connection fault. Please retry.');
      
      // Insert into search_history (failed)
      if (user?.id) {
        (async () => {
          try {
            await supabase.from('search_history').insert({
              user_id: user.id,
              user_email: user.email || 'Guest User',
              search_type: service,
              query: targetVal,
              status: 'failed'
            });
          } catch (e) {
            console.error('Failed to log search history:', e);
          }
        })();
      }
    } finally {
      setIsLoading(false);
    }
  }, [phoneNumber, profile, service, hasUnlimitedAction, refreshProfile]);

  const removeHistory = () => {
    clearHistory();
    setSearchHistory([]);
  };

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
    if (service === 'pancard') return 'VIP PN/PAN Card Lookup';
    if (service === 'aadhaar_to_pan') return 'VIP Aadhaar to PAN Lookup';
    return 'VIP Number Details Lookup';
  };

  const getInputPlaceholder = () => {
    if (service === 'telegram') return 'Enter Telegram Username (e.g. @Gaurav_beniwal_0001)...';
    if (service === 'adhr') return 'Enter Identity/Aadhaar query (e.g. 962397300673)...';
    if (service === 'bnk') return 'Enter Bank query or IFSC code (e.g. HDFC0001325)...';
    if (service === 'vehicle') return 'Enter Vehicle Number (e.g. BR07PB6268)...';
    if (service === 'pancard') return 'Enter PN/PAN Card Number (e.g. NTEPK1628C)...';
    if (service === 'aadhaar_to_pan') return 'Enter 12-digit Aadhaar Number...';
    return 'Search number...';
  };

  return (
    <div className={`relative min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden ${IS_TESTING_MODE ? 'pt-[36px]' : ''}`}>
      <LiquidBackground />
      
      {IS_TESTING_MODE && (
        <div className="fixed top-0 left-0 right-0 h-[36px] bg-gradient-to-r from-cyan-950/95 via-cyan-900/95 to-emerald-950/95 text-cyan-400 text-[10px] md:text-xs font-bold text-center z-[100] flex items-center justify-center gap-2 border-b border-cyan-500/20 backdrop-blur-md shadow-[0_2px_15px_rgba(0,0,0,0.6)]">
          <span className="inline-block animate-pulse w-2 h-2 rounded-full bg-emerald-400" />
          <span>🧪 Testing Mode Active — Free Search Enabled Without Sign-In</span>
          <span className="hidden sm:inline bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">Unrestricted Admin Access</span>
        </div>
      )}
      
      {/* Top Navbar */}
      <nav className={`fixed ${IS_TESTING_MODE ? 'top-[36px]' : 'top-0'} left-0 right-0 p-4 z-[60] flex items-center justify-between transition-all duration-300`}>
        <a 
          href="https://t.me/Gaurav_beni_0001" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:bg-cyan-500/10 transition-all group"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:animate-ping"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 group-hover:text-cyan-400">TRACEXDATA</span>
        </a>

        <div className="flex items-center gap-2">
          <Link
             to="/buy-api"
             className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all text-[10px] font-bold uppercase tracking-widest"
          >
            <Zap size={14} />
            Buy API
          </Link>

          {user && (
            <Link
               to="/account/api"
               className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-all text-[10px] font-bold uppercase tracking-widest"
            >
              <Key size={14} />
              API Dashboard
            </Link>
          )}

          {user && (
            <button
              onClick={handleOpenProtect}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-all text-[10px] font-bold uppercase tracking-widest"
            >
              <ShieldCheck size={14} />
              Protect Number
            </button>
          )}

          {!user ? (
            <button
              onClick={handleOpenLogin}
              className="px-4 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-[10px] md:text-xs font-bold transition-all shadow-[0_0_15px_-5px_rgba(34,211,238,0.5)]"
            >
              Sign In
            </button>
          ) : (
            <AnimatePresence mode="wait">
              {hasUnlimitedAction() ? (
                <SubscriptionBadge expiry={profile!.unlimited_expiry} />
              ) : (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={handleOpenPricing}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all font-mono text-[10px] md:text-sm"
                >
                  <Coins size={14} />
                  <span>{profile?.credits || 0} CTR</span>
                  <PlusCircle size={14} className="ml-1 opacity-50" />
                </motion.button>
              )}
            </AnimatePresence>
          )}

          {user && (
            <button
              onClick={() => signOut()}
              className="p-2 rounded-full bg-white/5 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 border border-white/10 transition-all"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </nav>

      {/* Header */}
      <header className="pt-16 md:pt-24 pb-2 md:pb-8 px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 mb-2 md:mb-6 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md"
        >
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="text-[8px] md:text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">TRACEXDATA Intelligence VIP</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl md:text-6xl font-bold tracking-tight mb-2 md:mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 leading-tight"
        >
          {getHeaderTitle()}
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-zinc-600 md:text-zinc-500 text-[9px] md:text-base max-w-lg mx-auto leading-relaxed px-4"
        >
          Access premium datasets with liquid glass precision.
        </motion.p>
      </header>

      {/* Main Search Area */}
      <main className="flex-1 max-w-4xl mx-auto px-4 md:px-6 pb-24 relative z-10 w-full">
        {/* Service Toggle Tabs */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-6 md:mb-8">
          <Link
            to="/"
            className={`px-4 py-2.5 rounded-full border text-[10px] font-extrabold uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-1.5 ${
              service === 'phone'
                ? 'bg-cyan-500/15 border-cyan-500/35 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            📱 Mobile ID (5 CTR)
          </Link>
          <Link
            to="/telegram"
            className={`px-4 py-2.5 rounded-full border text-[10px] font-extrabold uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-1.5 ${
              service === 'telegram'
                ? 'bg-amber-500/15 border-amber-500/35 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-pulse'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            ✈️ Telegram (8 CTR) <span className="text-[9px] text-amber-500 font-bold px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md animate-pulse">UNDER MAINTENANCE</span>
          </Link>
          <Link
            to="/identity"
            className={`px-4 py-2.5 rounded-full border text-[10px] font-extrabold uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-1.5 ${
              service === 'adhr'
                ? 'bg-cyan-500/15 border-cyan-500/35 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            🪪 Identity Card (12 CTR)
          </Link>
          <Link
            to="/bank"
            className={`px-4 py-2.5 rounded-full border text-[10px] font-extrabold uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-1.5 ${
              service === 'bnk'
                ? 'bg-cyan-500/15 border-cyan-500/35 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            🏦 BA&NK (18 CTR)
          </Link>
          <Link
            to="/vehicle"
            className={`px-4 py-2.5 rounded-full border text-[10px] font-extrabold uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-1.5 ${
              service === 'vehicle'
                ? 'bg-cyan-500/15 border-cyan-500/35 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            🚗 VEHICLE (10 CTR)
          </Link>
          <Link
            to="/pancard"
            className={`px-4 py-2.5 rounded-full border text-[10px] font-extrabold uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-1.5 ${
              service === 'pancard'
                ? 'bg-cyan-500/15 border-cyan-500/35 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            💳 PN CARD (20 CTR)
          </Link>
          <Link
            to="/panfind"
            className={`px-4 py-2.5 rounded-full border text-[10px] font-extrabold uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-1.5 ${
              service === 'aadhaar_to_pan'
                ? 'bg-cyan-500/15 border-cyan-500/35 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            💳 Aadhaar to PAN (150 CTR)*
          </Link>
        </div>

        {/* Testing Mode Banner removed for Production Mode */}

        {service === 'telegram' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card mb-4 md:mb-8 p-6 md:p-8 border-amber-500/30 bg-amber-500/5 text-center flex flex-col items-center gap-4 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500" />
            <AlertCircle className="text-amber-500 w-12 h-12 animate-pulse" />
            <h3 className="text-lg font-bold uppercase tracking-widest text-amber-400 font-mono">Telegram Lookup Under Maintenance</h3>
            <p className="text-sm text-zinc-400 max-w-md leading-relaxed font-sans">
              The Telegram lookup gateway is currently under maintenance for essential database optimization and security updates.
              We are working to bring this service back online as soon as possible.
            </p>
            <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-mono uppercase tracking-widest">
              Status: Offline (Scheduled Maintenance)
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card mb-4 md:mb-8 p-1"
          >
            <form onSubmit={(e) => handleSearch(e)} className="flex flex-col md:flex-row gap-1.5 md:gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={getInputPlaceholder()}
                  value={phoneNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (service === 'phone') {
                      setPhoneNumber(cleanIndianPhoneNumber(val));
                    } else if (service === 'bnk') {
                      setPhoneNumber(val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 11));
                    } else if (service === 'adhr' || service === 'aadhaar_to_pan') {
                      setPhoneNumber(val.replace(/[^0-9]/g, '').slice(0, 12));
                    } else if (service === 'vehicle') {
                      setPhoneNumber(val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15));
                    } else if (service === 'pancard') {
                      setPhoneNumber(val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 15));
                    } else {
                      setPhoneNumber(val.replace(/[^a-zA-Z0-9_\s\-]/g, '').slice(0, 40));
                    }
                  }}
                  className="w-full glass-input px-6 h-12 md:h-16 text-base md:text-lg font-mono focus:bg-white/10 placeholder:text-zinc-800"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || cooldown > 0 || phoneNumber.trim().length < (service === 'phone' ? 10 : service === 'bnk' ? 11 : (service === 'adhr' || service === 'aadhaar_to_pan') ? 12 : service === 'pancard' ? 5 : 3)}
                className="w-full md:w-48 h-12 md:h-16 rounded-xl md:rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500 text-zinc-950 font-bold transition-all flex items-center justify-center gap-2 liquid-shadow"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                ) : cooldown > 0 ? (
                  <span className="text-sm md:text-base">{cooldown}s</span>
                ) : (
                  <>
                    <Search size={16} className="md:w-[18px]" />
                    <span className="text-sm md:text-base">Trace Now</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* Protection CTA for Mobile/All users */}
        {user && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex md:hidden justify-center mb-8"
          >
            <button 
              onClick={handleOpenProtect}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold uppercase tracking-[0.2em] text-[10px] w-full justify-center"
            >
              <ShieldCheck size={14} />
              TraceX Shield Protection Active
            </button>
          </motion.div>
        )}

        {/* Status Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="group cursor-pointer flex items-center gap-3 p-4 mb-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs md:text-sm"
              onClick={() => {
                if (error.toLowerCase().includes('sign in')) {
                  handleOpenLogin();
                }
                if (error.includes('credits')) handleOpenPricing();
                if (error.includes('protected')) handleOpenProtect();
              }}
            >
              <AlertCircle size={18} className="shrink-0" />
              <span className="flex-1 whitespace-pre-line">{error}</span>
              {(error.includes('credits') || error.includes('sign in') || error.includes('protected')) && <ChevronRight size={16} />}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Results */}
        <div className="min-h-[100px]">
          {isLoading ? (
            <Skeleton message={loadingMessage} />
          ) : (aadhaarPanResult || result) ? (
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 md:p-8 relative overflow-hidden space-y-4 border-cyan-500/30 bg-cyan-500/5"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-500" />
                
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <Terminal size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white uppercase tracking-wide text-xs md:text-sm">
                        Direct Database Feed
                      </h3>
                      <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                        STATUS: SECURE DECRYPTED
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const formatted = getFormattedResponse();
                      navigator.clipboard.writeText(formatted);
                      setCopiedResponse(true);
                      setTimeout(() => setCopiedResponse(false), 2000);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-cyan-500/30 text-zinc-400 hover:text-cyan-400 transition-all flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer"
                  >
                    {copiedResponse ? <Check size={11} className="text-cyan-400" strokeWidth={3} /> : <Clipboard size={11} />}
                    {copiedResponse ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="relative">
                  <pre className="text-left font-mono whitespace-pre-wrap text-emerald-400 select-all overflow-x-auto text-[11px] md:text-xs leading-relaxed p-4 bg-zinc-950/80 border border-zinc-900 rounded-xl max-h-[600px] overflow-y-auto">
                    {getFormattedResponse()}
                  </pre>
                </div>
              </motion.div>

              {service === 'telegram' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card mt-6 p-6 border-orange-500/20 bg-orange-500/5 text-center flex flex-col items-center gap-3 relative z-10 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-orange-500/30 to-transparent"></div>
                  <ShieldCheck className="text-orange-400 w-10 h-10 animate-pulse" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-100 font-mono">Protect Your Telegram Record 🛡️</h3>
                  <p className="text-xs text-zinc-400 max-w-md ml-1 font-sans leading-relaxed">
                    Prevent other users from tracing your mobile number using your Telegram handle. Secure your Telegram handle on TRACEXDATA lifetime protection.
                  </p>
                  <button
                    onClick={handleOpenProtect}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(249,115,22,0.35)] cursor-pointer hover:scale-[1.03] active:scale-[0.98]"
                  >
                    Protect Now (₹79)
                  </button>
                </motion.div>
              )}
            </div>
          ) : searchHistory.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                  <History size={14} />
                  Recent (24h)
                </div>
                <button 
                  onClick={removeHistory}
                  className="p-2 hover:bg-red-500/20 rounded-xl text-zinc-600 hover:text-red-400 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchHistory.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPhoneNumber(item.number);
                      handleSearch(undefined, item.number);
                    }}
                    className="flex items-center justify-between p-4 glass-card border-white/5 bg-white/2 hover:bg-white/5 text-left group transition-all"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-mono text-zinc-100">+91 {item.number}</span>
                      <span className="text-[10px] text-zinc-500">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <ChevronRight size={16} className="text-zinc-700 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-20 grayscale pointer-events-none">
              <Info size={48} className="mb-4" />
              <p className="text-[10px] font-medium tracking-[0.3em] uppercase">Private Encryption Active</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer / Credit */}
      <footer className="w-full py-6 md:py-10 px-4 md:px-6 flex flex-col items-center justify-center gap-3 relative z-50">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="glass-card px-4 md:px-5 py-2.5 md:py-3 border-white/5 bg-black/60 backdrop-blur-3xl text-[9px] md:text-xs font-medium flex items-center gap-3 md:gap-4 group shadow-2xl"
        >
          <span className="text-zinc-500">
            Engine Crafted by 
            <a 
              href="https://t.me/Gaurav_beni_0001" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-1 text-zinc-400 hover:text-cyan-400 transition-colors pointer-events-auto"
            >
              Gaurav Beniwal
            </a>
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
          <a 
            href="https://t.me/Gaurav_beni_0001" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-cyan-400/80 font-bold hover:text-cyan-400 transition-colors uppercase tracking-widest text-[9px] pointer-events-auto"
          >
            Support
          </a>
        </motion.div>
        
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-6">
          <Link to="/about-gaurav-beniwal" className="hover:text-cyan-400 transition-colors text-cyan-400">About Gaurav Beniwal</Link>
          <Link to="/contactus" className="hover:text-cyan-400 transition-colors">Contact Us</Link>
          <Link to="/refund" className="hover:text-cyan-400 transition-colors">Refund Policy</Link>
          <Link to="/terms" className="hover:text-cyan-400 transition-colors">Terms & Conditions</Link>
          <Link to="/api-docs" className="hover:text-cyan-400 transition-colors">API Documentation</Link>
          <Link to="/trends" className="hover:text-cyan-400 transition-colors opacity-50">Intelligence Trends</Link>
        </div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-[7px] md:text-[10px] text-zinc-700 md:text-zinc-600 uppercase tracking-[0.25em] font-bold text-center leading-relaxed"
        >
          TRACEXDATA Intelligence Engine <br className="md:hidden" />
          <span className="opacity-60">Made for ethical purpose only By GAURAV BENIWAL</span>
        </motion.p>
      </footer>

      <AnimatePresence>
        {/* Modals are handled in the parent App component */}
      </AnimatePresence>
    </div>
  );
}

