import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Search, 
  ArrowLeft, 
  Coins, 
  ShieldCheck, 
  User as UserIcon, 
  Vote, 
  Car, 
  Sprout, 
  Landmark, 
  Building2, 
  Phone, 
  Mail,
  Send,
  Smartphone,
  CreditCard,
  Fingerprint, 
  Crown, 
  CheckCircle2, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  Sparkles,
  ChevronRight,
  AlertCircle,
  X
} from 'lucide-react';
import { CATEGORIES, Category, SubService } from '../data/services';

interface DashboardServicesViewProps {
  initialService?: string;
  user: any;
  profile: any;
  isDemoMode: boolean;
  onOpenPricing: () => void;
  onOpenLogin: () => void;
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  result: any;
  aadhaarPanResult: any;
  handleSearch: (e?: React.FormEvent, forceQuery?: string, customServiceType?: string) => void;
  getFormattedResponse: () => string;
  copiedResponse: boolean;
  setCopiedResponse: (val: boolean) => void;
  hasUnlimitedAction: () => boolean;
  onClearError?: () => void;
}

export function CategoryIcon({ name, className = "w-7 h-7" }: { name: string; className?: string }) {
  if (name === 'phone' || name === 'Phone') {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center p-2 shrink-0 shadow-md shadow-cyan-500/20 relative overflow-hidden group-hover:scale-105 transition-transform">
        <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
        </div>
      </div>
    );
  }

  if (name === 'email' || name === 'Mail') {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center p-2 shrink-0 shadow-md shadow-indigo-500/20 relative overflow-hidden group-hover:scale-105 transition-transform">
        <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
    );
  }

  if (name === 'telegram' || name === 'Send') {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center p-2 shrink-0 shadow-md shadow-sky-500/20 relative overflow-hidden group-hover:scale-105 transition-transform">
        <Send className="w-5 h-5 sm:w-6 sm:h-6 text-white -rotate-12 translate-x-0.5 -translate-y-0.5" />
      </div>
    );
  }

  if (name === 'ShieldCheck' || name === 'aadhaar') {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center p-1.5 shrink-0 shadow-md shadow-amber-500/20 relative overflow-hidden group-hover:scale-105 transition-transform">
        <svg className="w-full h-full text-white drop-shadow-xs" viewBox="0 0 100 100" fill="currentColor">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M50 20 C32 20 20 32 20 50 C20 68 32 80 50 80 C68 80 80 68 80 50" stroke="currentColor" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M50 32 C39 32 30 39 30 50 C30 61 39 70 50 70" stroke="#FEF08A" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M50 42 C44 42 38 44 38 50 C38 56 44 60 50 60" stroke="#FFF" strokeWidth="5" strokeLinecap="round" fill="none" />
          <circle cx="50" cy="50" r="4" fill="#FFF" />
        </svg>
      </div>
    );
  }

  if (name === 'UserIcon' || name === 'pan') {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center p-2 shrink-0 shadow-md shadow-blue-900/20 relative overflow-hidden group-hover:scale-105 transition-transform">
        <div className="w-full h-full bg-white/10 rounded-xl border border-white/20 flex flex-col items-center justify-center text-white">
          <span className="text-[10px] font-black tracking-widest uppercase text-amber-300">PAN</span>
          <div className="w-4 h-0.5 bg-emerald-400 rounded-full mt-0.5" />
        </div>
      </div>
    );
  }

  if (name === 'Building2' || name === 'banking') {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center p-2 shrink-0 shadow-md shadow-emerald-500/20 relative overflow-hidden group-hover:scale-105 transition-transform">
        <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
    );
  }

  if (name === 'Car' || name === 'vehicle') {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center p-2 shrink-0 shadow-md shadow-orange-500/20 relative overflow-hidden group-hover:scale-105 transition-transform">
        <Car className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
    );
  }

  if (name === 'Vote' || name === 'voter') {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center p-2 shrink-0 shadow-md shadow-purple-600/20 relative overflow-hidden group-hover:scale-105 transition-transform">
        <Vote className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
    );
  }

  if (name === 'Sprout' || name === 'agriculture') {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 text-white flex items-center justify-center p-2 shrink-0 shadow-md shadow-green-500/20 relative overflow-hidden group-hover:scale-105 transition-transform">
        <Sprout className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
    );
  }

  if (name === 'Landmark' || name === 'ration') {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center p-2 shrink-0 shadow-md shadow-rose-500/20 relative overflow-hidden group-hover:scale-105 transition-transform">
        <Landmark className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center p-2 shrink-0 shadow-md shadow-slate-900/20 relative overflow-hidden group-hover:scale-105 transition-transform">
      <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
    </div>
  );
}

export function DashboardServicesView({
  initialService = 'phone',
  user,
  profile,
  isDemoMode,
  onOpenPricing,
  onOpenLogin,
  phoneNumber,
  setPhoneNumber,
  isLoading,
  loadingMessage,
  error,
  result,
  aadhaarPanResult,
  handleSearch,
  getFormattedResponse,
  copiedResponse,
  setCopiedResponse,
  hasUnlimitedAction,
  onClearError,
}: DashboardServicesViewProps) {
  const navigate = useNavigate();
  const params = useParams<{ categoryId?: string; subserviceId?: string }>();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  // Derive selected subservice and category from URL params, pathname, or initialService
  const selectedSubService = useMemo(() => {
    const subId = params.subserviceId;
    if (subId) {
      for (const cat of CATEGORIES) {
        const found = cat.subservices.find(s => s.id === subId);
        if (found) return found;
      }
    }
    
    if (location.pathname === '/panfind' || initialService === 'aadhaar_to_pan') {
      for (const cat of CATEGORIES) {
        const found = cat.subservices.find(s => s.id === 'aadhaar-to-pan');
        if (found) return found;
      }
    }
    
    return null;
  }, [params.subserviceId, location.pathname, initialService]);

  const selectedCategory = useMemo(() => {
    if (selectedSubService) {
      return CATEGORIES.find(c => c.id === selectedSubService.categoryId) || null;
    }
    const catId = params.categoryId;
    if (catId) {
      return CATEGORIES.find(c => c.id === catId) || null;
    }
    if (location.pathname === '/identity' || initialService === 'adhr') {
      return CATEGORIES.find(c => c.id === 'aadhaar') || null;
    }
    if (location.pathname === '/pancard' || initialService === 'pancard') {
      return CATEGORIES.find(c => c.id === 'pan') || null;
    }
    if (location.pathname === '/vehicle' || initialService === 'vehicle') {
      return CATEGORIES.find(c => c.id === 'vehicle') || null;
    }
    if (location.pathname === '/bank' || initialService === 'bnk') {
      return CATEGORIES.find(c => c.id === 'banking') || null;
    }
    if (location.pathname === '/telegram' || location.pathname === '/email' || initialService === 'telegram' || initialService === 'email') {
      return CATEGORIES.find(c => c.id === 'telegram') || null;
    }
    return null;
  }, [selectedSubService, params.categoryId, location.pathname, initialService]);

  const handleSelectCategory = (cat: Category) => {
    if (cat.subservices.length === 1) {
      navigate(`/service/${cat.subservices[0].id}`);
    } else {
      navigate(`/category/${cat.id}`);
    }
  };

  const handleSelectSubService = (sub: SubService) => {
    navigate(`/service/${sub.id}`);
  };

  const handleBackToCategories = () => {
    navigate('/dashboard');
  };

  // Auto-redirect if category has only 1 subservice and we are on the category view
  useEffect(() => {
    if (selectedCategory && !selectedSubService && selectedCategory.subservices.length === 1) {
      navigate(`/service/${selectedCategory.subservices[0].id}`, { replace: true });
    }
  }, [selectedCategory, selectedSubService, navigate]);


  const handleBackToSubServices = () => {
    if (selectedCategory) {
      navigate(`/category/${selectedCategory.id}`);
    } else {
      navigate('/dashboard');
    }
  };

  const formattedResponseStr = getFormattedResponse();

  // LEVEL 3: TERMINAL FORM VIEW (Screenshot 1)
  if (selectedSubService) {
    return (
      <div className="w-full relative min-h-[80vh] flex flex-col items-center justify-start py-6 px-3 sm:px-4">
        {/* Dotted Grid Background */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-3xl opacity-60"
          style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
            backgroundSize: '16px 16px'
          }}
        />

        {/* Top Header Controls for Terminal View (Screenshot 1) */}
        <div className="w-full max-w-xl flex items-center justify-between mb-6 relative z-10">
          <button
            type="button"
            onClick={handleBackToSubServices}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-800 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenPricing}
              className="bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-800 font-extrabold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Coins className="w-4 h-4 text-emerald-600" />
              <span className="font-mono">₹{profile?.credits || 1470}.00</span>
            </button>
          </div>
        </div>

        {/* Centered Terminal Container (Screenshot 1) */}
        <div className="w-full max-w-md relative z-10 flex flex-col items-center">
          
          {/* Top Service Icon Box */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-50/90 border border-blue-100/90 flex items-center justify-center p-3 shadow-xs mb-3 text-blue-600">
            <CategoryIcon name={selectedSubService.categoryId} className="w-10 h-10" />
          </div>

          {/* Service Title */}
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight text-center">
            {selectedSubService.title}
          </h1>

          {/* Badges Row (Fee & Plan) */}
          <div className="flex items-center gap-2.5 mt-2.5 mb-6">
            <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/90 text-indigo-700 text-xs font-black flex items-center gap-1.5 shadow-2xs">
              <Coins className="w-3.5 h-3.5 text-indigo-600" />
              <span>Fee: ₹{selectedSubService.fee}.00</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5 shadow-2xs">
              <UserIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Plan: {selectedSubService.plan}</span>
            </span>
          </div>

          {/* Main White Card Box (Screenshot 1) */}
          <div className="w-full bg-white/60 backdrop-blur-xl border border-white/50 rounded-3xl p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 space-y-4 border-t-4 border-t-blue-500">
            
            <form onSubmit={(e) => handleSearch(e, undefined, selectedSubService.serviceType)} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  {selectedSubService.inputLabel}
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={selectedSubService.inputPlaceholder}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>{loadingMessage}</span>
                  </>
                ) : (
                  <>
                    <span>Verify Details Now</span>
                    <ChevronRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </form>
          </div>


        </div>
      </div>
    );
  }

  // LEVEL 2: CATEGORY SUB-SERVICES VIEW (Screenshot 3)
  if (selectedCategory) {
    const filteredSubServices = selectedCategory.subservices.filter(s =>
      !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="w-full space-y-4">
        {/* Top Search Input Bar (Screenshot 3) */}
        <div className="relative w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services... (e.g. Aadhaar, PAN)"
            className="w-full pl-12 pr-4 py-3.5 bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-sm font-medium text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Category Header Card (Screenshot 3) */}
        <div className="p-4 sm:p-5 rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <CategoryIcon name={selectedCategory.id} className="w-10 h-10" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {selectedCategory.title}
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                {selectedCategory.subservices.length} services available
              </p>
            </div>
          </div>

          <button
            onClick={handleBackToCategories}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shadow-2xs active:scale-95"
            title="Back to Categories"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Services Grid (Screenshot 3 - 2 Columns) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredSubServices.map((sub) => (
            <button
              key={sub.id}
              onClick={() => handleSelectSubService(sub)}
              className="p-4 sm:p-5 rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 hover:bg-blue-50/40 hover:border-blue-300 transition-all flex flex-col items-center justify-between text-center gap-2.5 cursor-pointer shadow-xs hover:shadow-md group"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center p-2 group-hover:scale-105 transition-transform">
                <CategoryIcon name={sub.categoryId} className="w-7 h-7" />
              </div>

              <div className="space-y-0.5">
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-blue-700 leading-tight">
                  {sub.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium line-clamp-1">
                  {sub.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // LEVEL 1: BROWSE CATEGORIES MAIN DASHBOARD (Screenshot 2)
  const filteredCategories = CATEGORIES.filter(cat => 
    !searchQuery || 
    cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.subservices.some(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full space-y-6">
      {/* Top Search Input Bar (Screenshot 2) */}
      <div className="relative w-full">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services... (e.g. Aadhaar, PAN)"
          className="w-full pl-12 pr-4 py-3.5 bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-sm font-medium text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Section Title: Browse Categories (Screenshot 2) */}
      <div className="px-1">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Browse Categories
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Select a category to explore all available services.
        </p>
      </div>

      {/* Category Cards Grid (Screenshot 2 - 2 Columns on Mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {filteredCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleSelectCategory(cat)}
            className="p-5 rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 hover:bg-slate-50/80 hover:border-blue-200 transition-all flex flex-col items-center justify-between text-center gap-3 relative overflow-hidden group cursor-pointer shadow-xs hover:shadow-md active:scale-98"
          >
            <CategoryIcon name={cat.id} className="w-10 h-10" />

            <div className="space-y-1">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-blue-700">
                {cat.title}
              </h3>
              <span className="inline-block text-[10px] font-extrabold bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                {cat.countText}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
