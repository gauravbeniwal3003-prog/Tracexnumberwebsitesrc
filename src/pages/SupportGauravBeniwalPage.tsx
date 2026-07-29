import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, Car, User, ShieldCheck, CreditCard, Building2, 
  Send, Mail, Search, Sparkles, Youtube, CheckCircle2, 
  AlertCircle, Loader2, ArrowLeft, Heart, Zap, Lock, Key, Eye, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';
import ResultCard from '../components/ResultCard';
import { lookupSupportFree, LookupResult } from '../services/api';

type ServiceType = 'phone' | 'vehicle' | 'veh_owner_num' | 'adhr' | 'pancard' | 'bnk' | 'telegram' | 'email';

interface ServiceTab {
  id: ServiceType;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  badge?: string;
  hint: string;
  example: string;
}

// -----------------------------------------------------------------------------------------
// CONFIGURATION & YOUTUBE LINK
// TODO: Update YOUTUBE_VIDEO_URL with the exact YouTube video URL when ready
// -----------------------------------------------------------------------------------------
const YOUTUBE_VIDEO_URL = "https://www.youtube.com/@Gaurav_beni_0001";
const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@Gaurav_beni_0001";
const VALID_COUPON_CODE = "GBOSINTGOD";

const SERVICE_TABS: ServiceTab[] = [
  {
    id: 'phone',
    label: 'Mobile Lookup',
    icon: Phone,
    placeholder: 'Enter 10-digit mobile number...',
    hint: 'Instant caller details, name, operator & address intel',
    example: '9876543210'
  },
  {
    id: 'vehicle',
    label: 'Vehicle RC',
    icon: Car,
    placeholder: 'Enter Vehicle Number (e.g. DL01AB1234)...',
    hint: 'RC details, vehicle maker, engine/chassis & owner name',
    example: 'DL01AB1234'
  },
  {
    id: 'veh_owner_num',
    label: 'Vehicle Owner Contact',
    icon: User,
    placeholder: 'Enter Vehicle Registration Number...',
    hint: 'Trace direct phone number linked to vehicle owner',
    example: 'MH12PQ9999'
  },
  {
    id: 'adhr',
    label: 'Identity & Address',
    icon: ShieldCheck,
    placeholder: 'Enter 12-digit Aadhaar Number...',
    hint: 'Address, family details & demographic intel',
    example: '123456789012'
  },
  {
    id: 'pancard',
    label: 'PAN Card Details',
    icon: CreditCard,
    placeholder: 'Enter 10-character PAN Number...',
    hint: 'Full name, father name & verification status',
    example: 'ABCDE1234F'
  },
  {
    id: 'bnk',
    label: 'Bank & IFSC Search',
    icon: Building2,
    placeholder: 'Enter IFSC Code (e.g. SBIN0001234)...',
    hint: 'Branch name, MICR, address & bank details',
    example: 'SBIN0001234'
  },
  {
    id: 'telegram',
    label: 'Telegram Intel',
    icon: Send,
    placeholder: 'Enter Telegram Username or ID...',
    hint: 'Linked mobile number & profile metadata',
    example: '@username or 123456789'
  },
  {
    id: 'email',
    label: 'Email OSINT',
    icon: Mail,
    placeholder: 'Enter Email Address...',
    hint: 'Reverse email lookup & digital footprint',
    example: 'target@example.com'
  }
];

export default function SupportGauravBeniwalPage() {
  const navigate = useNavigate();

  // Access Verification state (persisted per device in localStorage)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('gb_support_unlocked_v1') === 'true';
  });
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState(false);

  // Search Page State
  const [activeTab, setActiveTab] = useState<ServiceType>('phone');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultsList, setResultsList] = useState<LookupResult[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);

  const currentTabInfo = SERVICE_TABS.find(t => t.id === activeTab) || SERVICE_TABS[0];

  // Coupon Verification Handler
  const handleVerifyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const cleanCode = couponInput.trim().toUpperCase();

    if (!cleanCode) {
      setCouponError('Please enter the coupon code.');
      return;
    }

    if (cleanCode === VALID_COUPON_CODE) {
      setCouponSuccess(true);
      localStorage.setItem('gb_support_unlocked_v1', 'true');
      localStorage.setItem('gb_access_code', VALID_COUPON_CODE);
      setTimeout(() => {
        setIsUnlocked(true);
      }, 500);
    } else {
      setCouponError('Incorrect Coupon Code! Watch our YouTube video to get the valid code.');
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setResultsList([]);
    
    const cleanQ = query.trim();
    if (!cleanQ) {
      setError('Please enter a valid query before searching.');
      return;
    }

    if (activeTab === 'phone') {
      const cleanDigits = cleanQ.replace(/\D/g, '');
      if (cleanDigits.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
    }

    setIsLoading(true);
    setLoadingStep(1);

    const stepTimer1 = setTimeout(() => setLoadingStep(2), 500);
    const stepTimer2 = setTimeout(() => setLoadingStep(3), 1100);

    try {
      const codeToUse = localStorage.getItem('gb_access_code') || VALID_COUPON_CODE;
      const res = await lookupSupportFree(cleanQ, activeTab, codeToUse);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!res.status || !res.results || Object.keys(res.results).length === 0) {
        setError(res.error || 'No record found for this query. Please check and try again.');
        setIsLoading(false);
        return;
      }

      // Format results into list of cards
      const rawRes = res.results;
      const formatted: any[] = [];

      if (rawRes.results && typeof rawRes.results === 'object') {
        const nested = rawRes.results;
        const keys = Object.keys(nested);
        const hasMultiple = keys.some(k => k.toLowerCase().startsWith('result') || k.toLowerCase().startsWith('record') || !isNaN(Number(k)));
        
        if (hasMultiple) {
          keys.forEach(k => {
            const val = nested[k];
            if (val && typeof val === 'object') {
              formatted.push({ ...val, result_no: k });
            }
          });
        } else {
          formatted.push(nested);
        }
      } else {
        const keys = Object.keys(rawRes);
        const hasMultiple = keys.some(k => k.toLowerCase().startsWith('result') || k.toLowerCase().startsWith('record'));
        if (hasMultiple) {
          keys.forEach(k => {
            const val = rawRes[k];
            if (val && typeof val === 'object') {
              formatted.push({ ...val, result_no: k });
            }
          });
        } else {
          formatted.push(rawRes);
        }
      }

      if (formatted.length === 0) {
        formatted.push(rawRes);
      }

      setResultsList(formatted);
      setSearchedQuery(cleanQ);
    } catch (err: any) {
      console.error('Free search error:', err);
      setError(err.message || 'Lookup gateway busy. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 relative overflow-x-hidden">
      <LiquidBackground />

      {/* Header Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/10 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10"
          >
            <ArrowLeft size={14} /> Back to Portal
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
              <Youtube size={12} className="text-red-500" />
              Community Edition
            </span>
          </div>
        </div>
      </header>

      {/* ACCESS LOCKED OVERLAY */}
      {!isUnlocked ? (
        <main className="max-w-md mx-auto px-4 py-16 lg:py-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="p-6 md:p-8 rounded-3xl bg-slate-900/90 border border-red-500/30 shadow-[0_0_60px_rgba(239,68,68,0.15)] relative overflow-hidden backdrop-blur-2xl"
          >
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-xl shadow-red-600/30">
                <Lock size={32} />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-extrabold uppercase tracking-widest mb-3">
                <Youtube size={12} /> Subscriber Access Verification
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight">
                Enter Access Coupon Code
              </h2>
              <p className="text-slate-300 text-xs mt-2 leading-relaxed">
                To prevent automated DDoS bots, this free search portal requires a coupon code. Get the code from our YouTube video!
              </p>
            </div>

            {/* Watch YouTube Video Link */}
            <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-center">
              <p className="text-[11px] text-red-200 mb-2 font-medium">
                Don't have the coupon code yet?
              </p>
              <a
                href={YOUTUBE_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <Youtube size={16} />
                Watch YouTube Video To Find Code
                <ExternalLink size={14} />
              </a>
            </div>

            {/* Code Input Form */}
            <form onSubmit={handleVerifyCoupon} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
                  Coupon Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-500">
                    <Key size={16} />
                  </div>
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      setCouponError(null);
                    }}
                    placeholder="Enter Coupon Code (e.g. GBOSINTGOD)"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm font-mono uppercase tracking-wider text-white placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                </div>
              </div>

              {couponError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <span>{couponError}</span>
                </div>
              )}

              {couponSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>Access Granted! Unlocking free portal...</span>
                </div>
              )}

              <button
                type="submit"
                disabled={couponSuccess}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Unlock Free Search Portal
              </button>
            </form>

            <div className="mt-6 text-center text-[11px] text-slate-500">
              100% Free • Unlimited Searches • No Login
            </div>
          </motion.div>
        </main>
      ) : (
        /* UNLOCKED SEARCH ENGINE */
        <main className="max-w-6xl mx-auto px-4 py-8 lg:py-12 relative z-10">
          
          {/* Support YouTube Banner */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-red-950/60 via-slate-900/80 to-purple-950/60 border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)] relative overflow-hidden group"
          >
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-red-600/20 transition-all duration-700" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-500/30 shrink-0">
                  <Youtube size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-red-400">100% Free • Support On YouTube</span>
                    <Heart size={12} className="text-red-500 fill-red-500 animate-bounce" />
                  </div>
                  <h1 className="text-xl md:text-3xl font-black text-white tracking-tight">
                    Support Gaurav Beniwal On YouTube
                  </h1>
                  <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl font-medium">
                    Enjoy unlimited, free searches with zero login and no credit deduction! Please subscribe to Gaurav Beniwal on YouTube to support free open intelligence servers.
                  </p>
                </div>
              </div>

              <a
                href={YOUTUBE_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs uppercase tracking-widest shadow-xl shadow-red-600/30 hover:scale-105 transition-all flex items-center gap-2 shrink-0 group/btn"
              >
                <Youtube size={18} className="group-hover/btn:scale-110 transition-transform" />
                Subscribe On YouTube
              </a>
            </div>
          </motion.div>

          {/* Notice Badge for Exclusions */}
          <div className="mb-6 flex items-center justify-between bg-cyan-950/40 border border-cyan-500/20 rounded-2xl p-3 md:p-4 text-xs text-cyan-200">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-cyan-400 shrink-0" />
              <span><strong>Unlimited Free Access:</strong> Mobile, RC, Vehicle Owner, Identity, PAN, Bank & Telegram searches are completely free.</span>
            </div>
            <span className="hidden md:inline-flex text-[10px] uppercase tracking-widest font-extrabold px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              No Login Needed
            </span>
          </div>

          {/* Service Category Tabs */}
          <div className="mb-6 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex items-center gap-2 min-w-max">
              {SERVICE_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setError(null);
                      setResultsList([]);
                    }}
                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-cyan-400' : 'text-slate-400'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Input Box */}
          <div className="glass-card p-6 md:p-8 rounded-3xl border-white/10 relative overflow-hidden mb-8">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                    <Search size={20} />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={currentTabInfo.placeholder}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-slate-950" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Free Search</span>
                    </>
                  )}
                </button>
              </div>

              {/* Hint & Example */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 gap-2 pt-1 px-1">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  {currentTabInfo.hint}
                </span>
                
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Try example:</span>
                  <button
                    type="button"
                    onClick={() => setQuery(currentTabInfo.example)}
                    className="font-mono text-cyan-400 hover:underline hover:text-cyan-300 font-bold"
                  >
                    {currentTabInfo.example}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Loading Progress State */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 rounded-3xl bg-slate-900/80 border border-cyan-500/30 text-center relative overflow-hidden mb-8"
              >
                <div className="w-16 h-16 mx-auto mb-4 relative flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                  <Sparkles size={24} className="text-cyan-400 animate-pulse" />
                </div>

                <h3 className="text-lg font-bold text-white mb-2">
                  {loadingStep === 1 && "Connecting to TRACEXDATA Free Node..."}
                  {loadingStep === 2 && "Bypassing authentication gates..."}
                  {loadingStep === 3 && "Scrubbing metadata & rendering results..."}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Performing direct server-side lookup for {query}...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 flex items-start gap-3 mb-8"
              >
                <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs md:text-sm font-medium">
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Container */}
          {resultsList.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  Found {resultsList.length} {resultsList.length === 1 ? 'Record' : 'Records'} for <span className="text-cyan-400 font-mono">{searchedQuery}</span>
                </h2>
                <span className="text-xs text-slate-400 font-mono">100% Free Intelligence</span>
              </div>

              {resultsList.map((resItem, idx) => (
                <ResultCard key={`res-${idx}`} data={resItem} index={idx} />
              ))}
            </div>
          )}

          {/* Bottom YouTube Callout */}
          <div className="mt-16 text-center border-t border-white/10 pt-10">
            <p className="text-xs text-slate-400 mb-4 max-w-lg mx-auto">
              TRACEXDATA Open Intelligence is maintained freely for the community. Share this page with your friends and support Gaurav Beniwal on YouTube!
            </p>
            <a
              href={YOUTUBE_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 transition-all"
            >
              <Youtube size={16} />
              Visit Gaurav Beniwal YouTube Channel
            </a>
          </div>

        </main>
      )}
    </div>
  );
}
