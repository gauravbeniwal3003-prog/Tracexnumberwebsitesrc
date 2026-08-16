import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Coins, 
  AlertTriangle, 
  Terminal, 
  History, 
  Gift, 
  Wallet, 
  Key, 
  ShieldCheck, 
  HelpCircle, 
  LogOut, 
  Code, 
  FileText, 
  Cpu, 
  BookOpen,
  Smartphone,
  Send,
  Building2,
  Car,
  CreditCard,
  Mail,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, IS_TESTING_MODE } from '../services/AuthContext';

interface HeaderNavbarProps {
  title?: string;
  subtitle?: string;
}

const TELEGRAM_SUPPORT_URL = 'https://t.me/Gaurav_beni_0001';

export default function HeaderNavbar({ title, subtitle }: HeaderNavbarProps) {
  const { user, profile, isDemoMode, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(IS_TESTING_MODE ? 120 : 86);

  useEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleOpenPricing = () => {
    navigate('/pricing');
  };

  const handleOpenLogin = () => {
    window.dispatchEvent(new CustomEvent('open-login'));
  };

  const handleOpenTelegram = () => {
    try {
      window.open(TELEGRAM_SUPPORT_URL, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = TELEGRAM_SUPPORT_URL;
    }
  };

  const navItemClass = (isActive: boolean) => 
    `w-full p-3 rounded-2xl font-extrabold text-xs flex items-center justify-between transition-all cursor-pointer ${
      isActive
        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
        : "text-slate-700 hover:bg-slate-100/90 active:scale-[0.99]"
    }`;

  return (
    <>
      {/* 1. FIXED TOP HEADER BAR - Never hides on scroll */}
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 w-full max-w-full shadow-xs bg-white">
        {IS_TESTING_MODE && (
          <div className="w-full h-[34px] bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 text-white text-[10px] sm:text-xs font-bold text-center flex items-center justify-center gap-2 border-b border-sky-300/30 backdrop-blur-md shadow-xs px-2">
            <span className="inline-block animate-pulse w-2 h-2 rounded-full bg-emerald-300 shrink-0" />
            <span className="truncate">🧪 Testing Mode Active — Free Search Enabled Without Sign-In</span>
            <span className="hidden sm:inline bg-white/20 text-white border border-white/30 text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-extrabold shrink-0">Admin Access</span>
          </div>
        )}

        {/* TOP DISCLAIMER BLUE RIBBON */}
        <div className="w-full bg-blue-600 text-white py-1.5 px-3 text-[10px] sm:text-xs font-bold text-center flex items-center justify-center gap-1.5 border-b border-blue-700">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="truncate max-w-full">महत्वपूर्ण सूचना: यह कोई सरकारी पोर्टल नहीं है और न ही इसका सरकार से कोई संबंध है।</span>
        </div>

        {/* TOP HEADER NAVBAR - Clean Minimalist Web App Style */}
        <nav className="w-full px-3 sm:px-5 py-2.5 bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-[0_2px_16px_rgba(0,0,0,0.04)] flex items-center justify-between max-w-full">
          
          {/* Left: Hamburger Menu Button + Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-2xs hover:shadow-xs group"
              aria-label="Open Left Sidebar Navigation"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 group-hover:text-blue-600 transition-colors" />
            </button>

            <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-1.5 group cursor-pointer shrink-0">
              <span className="font-black text-sm sm:text-base text-slate-900 tracking-tight uppercase group-hover:text-blue-600 transition-colors">
                TRACEXDATA
              </span>
              <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                PORTAL
              </span>
            </Link>
          </div>

          {/* Right: Balance Capsule & Sign In */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Wallet Balance Capsule */}
            {user ? (
              <button
                onClick={handleOpenPricing}
                className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                title="Wallet Balance — Click to Add Balance"
              >
                <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-mono whitespace-nowrap">₹{Number(profile?.credits ?? profile?.wallet_balance ?? 0).toFixed(2)}</span>
              </button>
            ) : (
              <button
                onClick={handleOpenLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3 sm:px-4 py-1.5 rounded-full shadow-xs cursor-pointer shrink-0"
              >
                Sign In
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Spacer to prevent fixed header from overlapping main body content */}
      <div 
        style={{ height: `${headerHeight}px` }} 
        className="w-full shrink-0 select-none pointer-events-none transition-[height] duration-150" 
        aria-hidden="true" 
      />

      {/* 3. SLIDE-OVER LEFT SIDEBAR DRAWER MENU */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[100]"
            />

            {/* Slide-in Drawer Container from Left */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-[290px] sm:w-[330px] max-w-[85vw] bg-white border-r border-slate-200 z-[101] shadow-[24px_0_60px_rgba(0,0,0,0.18)] flex flex-col justify-between overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                      TRACEXDATA
                    </h2>
                    <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded uppercase">
                      PRO
                    </span>
                  </div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 mt-0.5">
                    INTELLIGENCE PORTAL
                  </p>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
                  aria-label="Close Sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Wallet / Account Summary Card */}
              <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
                {user ? (
                  <div className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 uppercase shadow-xs">
                          {user.email?.charAt(0) || 'U'}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-black text-slate-900 truncate">
                            {isDemoMode ? 'Demo User' : (profile?.full_name || user.email?.split('@')[0])}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate font-mono">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">Wallet Balance:</span>
                      <button
                        onClick={() => {
                          setIsSidebarOpen(false);
                          handleOpenPricing();
                        }}
                        className="text-[11px] font-black font-mono bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Coins className="w-3 h-3 text-emerald-600" />
                        <span>₹{Number(profile?.credits ?? profile?.wallet_balance ?? 0).toFixed(2)}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl text-center space-y-2">
                    <p className="text-xs font-bold text-slate-700">Sign in to save searches and access your wallet</p>
                    <button
                      onClick={() => {
                        setIsSidebarOpen(false);
                        handleOpenLogin();
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer"
                    >
                      Sign In / Register
                    </button>
                  </div>
                )}
              </div>

              {/* Drawer Navigation Links */}
              <div className="p-3.5 sm:p-4 space-y-5 flex-1 overflow-y-auto">
                {/* Core Navigation */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3">
                    MAIN NAVIGATION
                  </span>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate(user ? '/dashboard' : '/'); }}
                    className={navItemClass(currentPath === '/dashboard' || currentPath === '/')}
                  >
                    <div className="flex items-center gap-3">
                      <Terminal className="w-4.5 h-4.5 text-blue-600" />
                      <span>Dashboard & Services</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/history'); }}
                    className={navItemClass(currentPath === '/history' || currentPath === '/service-records')}
                  >
                    <div className="flex items-center gap-3">
                      <History className="w-4.5 h-4.5 text-indigo-600" />
                      <span>Search History & Logs</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/pricing'); }}
                    className={navItemClass(currentPath === '/pricing')}
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className="w-4.5 h-4.5 text-emerald-600" />
                      <span>Wallet Recharge & Rates</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/referral'); }}
                    className={navItemClass(currentPath === '/referral')}
                  >
                    <div className="flex items-center gap-3">
                      <Gift className="w-4.5 h-4.5 text-rose-500" />
                      <span>Refer & Earn (5% Bonus)</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                </div>

                {/* Popular Services Quick Access */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3">
                    SEARCH SERVICES
                  </span>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/service/number-lookup'); }}
                    className="w-full p-2.5 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="w-4 h-4 text-cyan-600" />
                      <span>Number Lookup</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">₹2</span>
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/service/email_osint'); }}
                    className="w-full p-2.5 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-indigo-600" />
                      <span>Email Lookup</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">₹20</span>
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/service/telegram_osint'); }}
                    className="w-full p-2.5 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Send className="w-4 h-4 text-sky-500" />
                      <span>Telegram Intelligence</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">₹5</span>
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/service/adhr_basic'); }}
                    className="w-full p-2.5 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>Aadhar Lookup</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">₹25</span>
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/service/vehicle_rc'); }}
                    className="w-full p-2.5 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Car className="w-4 h-4 text-orange-600" />
                      <span>Vehicle RC Details</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">₹12</span>
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/service/veh_owner_num'); }}
                    className="w-full p-2.5 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Car className="w-4 h-4 text-orange-700" />
                      <span>Vehicle To Owner Number</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">₹25</span>
                  </button>
                </div>

                {/* API & DEVELOPER */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3">
                    DEVELOPER & B2B
                  </span>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/api-docs'); }}
                    className={navItemClass(currentPath === '/api-docs')}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4.5 h-4.5 text-indigo-500" />
                      <span>B2B API Documentation</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/protect'); }}
                    className={navItemClass(currentPath === '/protect')}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4.5 h-4.5 text-amber-500" />
                      <span>Protect Your Record</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                </div>

                {/* SUPPORT & LEGAL */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3">
                    SUPPORT & LEGAL
                  </span>

                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      handleOpenTelegram();
                    }}
                    className="w-full p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-extrabold text-xs flex items-center justify-between transition-colors cursor-pointer border border-sky-200/80"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-4.5 h-4.5 text-sky-600" />
                      <span>Official Telegram Support</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/terms'); }}
                    className={navItemClass(currentPath === '/terms')}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4.5 h-4.5 text-slate-500" />
                      <span>Terms & Conditions</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/refund'); }}
                    className={navItemClass(currentPath === '/refund')}
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4.5 h-4.5 text-slate-500" />
                      <span>Refund Policy</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>

                  {profile && (profile as any).is_admin && (
                    <button
                      onClick={() => { setIsSidebarOpen(false); navigate('/admin'); }}
                      className="w-full p-3 rounded-2xl bg-purple-50 text-purple-800 border border-purple-200 font-extrabold text-xs flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-4.5 h-4.5 text-purple-600" />
                        <span>Admin Console</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </button>
                  )}
                </div>
              </div>

              {/* Drawer Footer / Sign Out */}
              <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/70">
                {user ? (
                  <button
                    onClick={async () => {
                      setIsSidebarOpen(false);
                      await signOut();
                      navigate('/login');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isDemoMode ? 'Exit Demo Mode' : 'Sign Out Account'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      handleOpenLogin();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <span>Sign In to Account</span>
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
