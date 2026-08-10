import React, { useState } from 'react';
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
  BookOpen 
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, IS_TESTING_MODE } from '../services/AuthContext';

interface HeaderNavbarProps {
  title?: string;
  subtitle?: string;
}

export default function HeaderNavbar({ title, subtitle }: HeaderNavbarProps) {
  const { user, profile, isDemoMode, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const isDashboardActive = currentPath === '/dashboard' || currentPath === '/' || currentPath.startsWith('/category') || currentPath.startsWith('/service') || currentPath === '/phone' || currentPath === '/telegram' || currentPath === '/identity' || currentPath === '/bank' || currentPath === '/vehicle' || currentPath === '/pancard' || currentPath === '/panfind' || currentPath === '/email';
  const isHistoryActive = currentPath === '/history' || currentPath === '/callhistorynumber';
  const isPricingActive = currentPath === '/pricing' || currentPath === '/buy-api' || currentPath === '/pgpay';
  const isReferralActive = currentPath === '/referral';
  const isApiDocsActive = currentPath === '/api-docs';
  const isTermsActive = currentPath === '/terms';
  const isRefundActive = currentPath === '/refund';
  const isAdminActive = currentPath === '/admin';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleOpenPricing = () => {
    navigate('/pricing');
  };

  const handleOpenLogin = () => {
    window.dispatchEvent(new CustomEvent('open-login'));
  };

  return (
    <>
      {IS_TESTING_MODE && (
        <div className="fixed top-0 left-0 right-0 h-[36px] bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 text-white text-[10px] md:text-xs font-bold text-center z-[100] flex items-center justify-center gap-2 border-b border-sky-300/30 backdrop-blur-md shadow-md px-2">
          <span className="inline-block animate-pulse w-2 h-2 rounded-full bg-emerald-300 shrink-0" />
          <span className="truncate">🧪 Testing Mode Active — Free Search Enabled Without Sign-In</span>
          <span className="hidden sm:inline bg-white/20 text-white border border-white/30 text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-extrabold shrink-0">Unrestricted Admin Access</span>
        </div>
      )}

      {/* 1. TOP DISCLAIMER BLUE RIBBON BANNER */}
      <div className="w-full bg-blue-600 text-white py-1.5 px-2 text-[10px] sm:text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-xs border-b border-blue-700 relative z-50">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span className="truncate max-w-full">महत्वपूर्ण सूचना: यह कोई सरकारी पोर्टल नहीं है और न ही इसका सरकार से कोई संबंध है।</span>
      </div>

      {/* 2. TOP HEADER NAVBAR */}
      <nav className="sticky top-0 left-0 right-0 px-2 sm:px-4 py-2 bg-white/95 backdrop-blur-md border-b border-slate-200 z-40 flex items-center justify-between shadow-xs max-w-full overflow-hidden">
        
        {/* Left: Drawer Menu Icon */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Open Sidebar Menu"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Brand Title */}
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group cursor-pointer shrink-0">
          <span className="font-black text-sm sm:text-base text-slate-900 tracking-tight uppercase group-hover:text-blue-600 transition-colors">
            TRACEXDATA
          </span>
          <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
            PORTAL
          </span>
        </Link>

        {/* Right: Dark Mode Toggle & Green Wallet Capsule */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 sm:p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
            title="Toggle Theme Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Green Wallet Balance Capsule (e.g. ₹1,470.00) */}
          {user ? (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleOpenPricing}
                className="bg-emerald-100 hover:bg-emerald-200 border border-emerald-300/80 text-emerald-800 font-extrabold text-[11px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                title="Wallet Balance & Add Money"
              >
                <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                <span className="font-mono whitespace-nowrap">₹{profile?.credits || 0}.00</span>
              </button>
              {isDemoMode ? (
                <span className="hidden md:inline-flex text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  Demo
                </span>
              ) : (
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white font-extrabold text-[10px] sm:text-xs flex items-center justify-center border border-blue-200 shadow-xs uppercase shrink-0">
                  {user.email?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleOpenLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-2.5 sm:px-4 py-1.5 rounded-full shadow-xs cursor-pointer shrink-0"
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* 3. SLIDE-OVER SIDEBAR DRAWER MENU */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100]"
            />

            {/* Slide-in Drawer Container */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 w-[290px] sm:w-[320px] bg-white z-[101] shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                    TRACEXDATA
                  </h2>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-blue-600 mt-0.5">
                    INTELLIGENCE PORTAL
                  </p>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <div className="p-4 space-y-6 flex-1 overflow-y-auto">
                {/* Main Navigation */}
                <div className="space-y-1.5">
                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate(user ? '/dashboard' : '/'); }}
                    className={`w-full p-3 rounded-2xl font-extrabold text-xs flex items-center gap-3 transition-colors cursor-pointer ${
                      isDashboardActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Terminal className={`w-4.5 h-4.5 ${isDashboardActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>Main Dashboard</span>
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/history'); }}
                    className={`w-full p-3 rounded-2xl font-extrabold text-xs flex items-center gap-3 transition-colors cursor-pointer ${
                      isHistoryActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <History className={`w-4.5 h-4.5 ${isHistoryActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>Service Records & Logs</span>
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/pricing'); }}
                    className={`w-full p-3 rounded-2xl font-extrabold text-xs flex items-center gap-3 transition-colors cursor-pointer ${
                      isPricingActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Wallet className={`w-4.5 h-4.5 ${isPricingActive ? 'text-white' : 'text-emerald-600'}`} />
                    <span>Wallet & Add Money</span>
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/referral'); }}
                    className={`w-full p-3 rounded-2xl font-extrabold text-xs flex items-center gap-3 transition-colors cursor-pointer ${
                      isReferralActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Gift className={`w-4.5 h-4.5 ${isReferralActive ? 'text-white' : 'text-rose-500'}`} />
                    <span>Refer & Earn (5% Bonus)</span>
                  </button>
                </div>

                {/* API & DEVELOPER SERVICES */}
                <div className="space-y-1.5 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3">
                    API & DEVELOPER PORTAL
                  </span>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/api-docs'); }}
                    className={`w-full p-3 rounded-2xl font-extrabold text-xs flex items-center gap-3 transition-colors cursor-pointer ${
                      isApiDocsActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <BookOpen className={`w-4.5 h-4.5 ${isApiDocsActive ? 'text-white' : 'text-indigo-500'}`} />
                    <span>API Documentation</span>
                  </button>
                </div>

                {/* ACCOUNT & SUPPORT */}
                <div className="space-y-1.5 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3">
                    LEGAL & SUPPORT
                  </span>

                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      window.open("https://t.me/Gaurav_beni_0001", "_blank");
                    }}
                    className="w-full p-3 rounded-2xl text-slate-700 hover:bg-slate-100 font-extrabold text-xs flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-4.5 h-4.5 text-sky-500" />
                    <span>Contact & Support (Telegram)</span>
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/terms'); }}
                    className={`w-full p-3 rounded-2xl font-extrabold text-xs flex items-center gap-3 transition-colors cursor-pointer ${
                      isTermsActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <FileText className={`w-4.5 h-4.5 ${isTermsActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>Terms & Conditions</span>
                  </button>

                  <button
                    onClick={() => { setIsSidebarOpen(false); navigate('/refund'); }}
                    className={`w-full p-3 rounded-2xl font-extrabold text-xs flex items-center gap-3 transition-colors cursor-pointer ${
                      isRefundActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <ShieldCheck className={`w-4.5 h-4.5 ${isRefundActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>Refund Policy</span>
                  </button>

                  {profile && (profile as any).is_admin && (
                    <button
                      onClick={() => { setIsSidebarOpen(false); navigate('/admin'); }}
                      className={`w-full p-3 rounded-2xl font-extrabold text-xs flex items-center gap-3 transition-colors cursor-pointer ${
                        isAdminActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                          : "text-purple-700 hover:bg-purple-50 border border-purple-100"
                      }`}
                    >
                      <ShieldCheck className={`w-4.5 h-4.5 ${isAdminActive ? 'text-white' : 'text-purple-600'}`} />
                      <span>Admin Management Console</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Drawer Footer User Profile & Logout */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2.5">
                {user ? (
                  <>
                    <div className="p-3 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                          {user.email?.charAt(0) || 'D'}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-black text-slate-900 truncate">
                            {isDemoMode ? 'Demo User' : (profile?.full_name || user.email?.split('@')[0])}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate font-mono">{user.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md shrink-0">
                        ₹{profile?.credits || 0}
                      </span>
                    </div>

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
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      handleOpenLogin();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
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
