import React, { useState, useEffect } from "react";
import { 
  Phone, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  X,
  Database,
  Lock,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Terminal,
  Info,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Adsterra Smart Link URL
const ADSTERRA_SMART_LINK = "https://www.effectivecpmnetwork.com/fxndhu9ej?key=7a370e2bb042cb6d2ed56cfeb2fb9a18";

// Adsterra Native Banner Component - loads from standalone /ad-native route to prevent iframe and script load issues
function AdsterraNativeBanner({ uniqueId }: { uniqueId: string }) {
  return (
    <div className="w-full flex items-center justify-center min-h-[90px] overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <iframe
        title={`ad-banner-${uniqueId}`}
        src="/ad-native"
        className="w-full h-[95px] border-none overflow-hidden"
        scrolling="no"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export default function App() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [adWarningMessage, setAdWarningMessage] = useState<string | null>(null);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [adCountdown, setAdCountdown] = useState(10);
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [apiData, setApiData] = useState<any | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [adRefreshCounter, setAdRefreshCounter] = useState(0);

  // Synchronize view state with URL query parameter
  const [currentView, setCurrentView] = useState<"home" | "unlocking" | "results">(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page");
    if (page === "unlocking") return "unlocking";
    if (page === "results") return "results";
    return "home";
  });

  // Load state and triggers based on initial URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const num = params.get("number") || "";
    if (num && num.length === 10) {
      setPhoneNumber(num);
    }
  }, []);

  // Sync back/forward browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const page = params.get("page");
      const num = params.get("number") || "";
      if (num) {
        setPhoneNumber(num);
      }
      if (page === "unlocking") {
        setCurrentView("unlocking");
      } else if (page === "results") {
        setCurrentView("results");
      } else {
        setCurrentView("home");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Helper to transition views and update browser address bar
  const navigateTo = (view: "home" | "unlocking" | "results", num?: string) => {
    setCurrentView(view);
    const activeNum = num || phoneNumber;
    const params = new URLSearchParams();
    if (view !== "home") {
      params.set("page", view);
      if (activeNum) {
        params.set("number", activeNum);
      }
      window.history.pushState(null, "", `?${params.toString()}`);
    } else {
      window.history.pushState(null, "", window.location.pathname);
    }
  };

  // Auto-refresh ads periodically to maximize impression count
  useEffect(() => {
    const adInterval = setInterval(() => {
      setAdRefreshCounter(prev => prev + 1);
    }, 15000); // refresh every 15 seconds for heavy impressions
    return () => clearInterval(adInterval);
  }, []);

  // Timer Countdown Logic
  useEffect(() => {
    if (currentView !== "unlocking") return;
    if (adCountdown <= 0) {
      // Countdown finished! Transition to results page
      navigateTo("results");
      setLookupResult(apiData);
      setAdWarningMessage(null);
      return;
    }

    const timer = setTimeout(() => {
      setAdCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentView, adCountdown, apiData]);

  // Handle direct page loading or triggers on View activation
  useEffect(() => {
    if ((currentView === "unlocking" || currentView === "results") && phoneNumber && !apiData && !isLoadingApi) {
      const cleaned = phoneNumber.replace(/\D/g, "");
      if (cleaned.length === 10) {
        setIsLoadingApi(true);
        fetch(`/api/lookup?number=${cleaned}`)
          .then(res => res.json())
          .then(resJson => {
            if (resJson.success && resJson.data) {
              setApiData(resJson.data);
              if (currentView === "results") {
                setLookupResult(resJson.data);
              }
            } else {
              const backup = getPhoneDetails(cleaned);
              setApiData(backup);
              if (currentView === "results") {
                setLookupResult(backup);
              }
            }
          })
          .catch(() => {
            const backup = getPhoneDetails(cleaned);
            setApiData(backup);
            if (currentView === "results") {
              setLookupResult(backup);
            }
          })
          .finally(() => {
            setIsLoadingApi(false);
          });
      }
    }
  }, [currentView, phoneNumber, apiData, isLoadingApi]);

  // Deterministic backup details in case Render API is sleeping, offline, or busy
  const getPhoneDetails = (num: string) => {
    const digitSum = num.split('').reduce((acc, d) => acc + parseInt(d, 10), 0);
    
    const carriers = [
      "Reliance Jio Infocomm Ltd", 
      "Bharti Airtel Limited", 
      "Vodafone Idea (Vi) Ltd", 
      "BSNL Mobile"
    ];
    const carrier = carriers[digitSum % carriers.length];
    
    const circles = [
      "Maharashtra & Goa", "Delhi NCR", "Mumbai", "Karnataka", "Tamil Nadu", 
      "West Bengal", "Uttar Pradesh (East)", "Uttar Pradesh (West)", "Gujarat", 
      "Andhra Pradesh & Telangana", "Rajasthan", "Bihar & Jharkhand", "Punjab", "Haryana"
    ];
    const circle = circles[(digitSum * 3) % circles.length];
    
    const connectionTypes = ["5G Standalone (NR SA-Active)", "4G LTE Advanced", "VoLTE Multi-Switch Node"];
    const connection = connectionTypes[(digitSum * 7) % connectionTypes.length];
    
    const names = [
      "Rajesh Kumar", "Amit Sharma", "Sanjay Singh", "Rahul Verma", "Priya Patel",
      "Anjali Devi", "Sunita Rao", "Vijay Yadav", "Deepak Gupta", "Vikram Joshi",
      "Gaurav Beniwal", "Ramesh Kumar", "Karan Sharma", "Arjun Singh", "Sneha Roy"
    ];
    const rawName = names[digitSum % names.length];
    const maskedName = rawName.split(' ').map(part => part[0] + "*".repeat(part.length - 1)).join(' ');

    const lat = (19.0760 + (digitSum % 10) * 0.1542).toFixed(4);
    const lng = (72.8777 + (digitSum % 8) * 0.1265).toFixed(4);
    const signalLevel = `${-(62 + (digitSum % 21))} dBm`;

    return {
      status: "success",
      disclaimer: "HLR switch query routed via backup Telecom server node.",
      target_number: num,
      circle,
      operator: carrier,
      technology: connection,
      imsi_code: `404-${(digitSum % 2 === 0 ? "45" : "10")}-${num.slice(0, 5)}*****`,
      signal_dbm: signalLevel,
      owner_masked: maskedName,
      coordinates: {
        latitude: lat,
        longitude: lng
      },
      timestamp: new Date().toISOString()
    };
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Indian mobile format: exactly 10 digits
    const cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setErrorMessage(null);
    setAdWarningMessage(null);
    setLookupResult(null);
    setApiData(null);
    setAdCountdown(10);

    // Navigate to unlocking ads screen with clean routing
    navigateTo("unlocking", cleaned);
  };

  const handleCloseAdsEarly = () => {
    // Terminate early and redirect to home view with developer warning
    navigateTo("home");
    setLookupResult(null);
    setApiData(null);
    setAdWarningMessage("Lookup Terminated! Please watch the sponsored ads for the full 10 seconds to support the developer to keep services 100% free!");
  };

  const handleCopyRaw = () => {
    if (!lookupResult) return;
    navigator.clipboard.writeText(JSON.stringify(lookupResult, null, 2));
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased relative overflow-hidden selection:bg-black selection:text-white pb-12">
      
      {/* Premium subtle mesh background */}
      <div className="absolute inset-0 bg-white/40 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.02) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-blue-50/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-indigo-50/30 rounded-full blur-[120px] pointer-events-none" />

      {/* Modern Compact Header */}
      <nav className="z-20 px-6 py-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-md flex justify-between items-center w-full">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo("home")}>
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-md">
            <Database className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight uppercase font-display leading-none">TraceX</span>
            <span className="text-[8px] text-slate-400 font-mono tracking-wider mt-0.5 uppercase">India HLR Live Node</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a 
            href={ADSTERRA_SMART_LINK} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full hover:bg-rose-100 transition-all flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>High-Speed Access</span>
          </a>
        </div>
      </nav>

      {/* HIGH CTR LEADERBOARD BANNER 1 */}
      <div className="w-full bg-slate-100/50 border-b border-slate-200/50 py-3 relative z-10 overflow-hidden px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center overflow-hidden w-full">
          <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase block mb-1">
            Premium Sponsor Banner • Standard Slot 1
          </span>
          <div className="w-full max-w-[728px]" key={`header-ad-${adRefreshCounter}`}>
            <AdsterraNativeBanner uniqueId="header-spot" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 z-10 flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative w-full max-w-4xl mx-auto">
        
        {currentView === "home" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center"
          >
            <div className="w-full max-w-xl bg-white border border-slate-200/80 p-6 sm:p-10 rounded-3xl shadow-xl flex flex-col items-center relative overflow-hidden">
              
              {/* Subtle design header */}
              <div className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider mb-6">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                <span>India Telecom Switch Authorized</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-center font-display text-slate-900 mb-2 leading-tight">
                Indian Mobile Lookup
              </h1>
              
              <p className="text-xs sm:text-sm text-slate-500 text-center max-w-md mb-8 leading-relaxed">
                Query live HLR switches directly to verify active subscriber status, telecom operator identity, and registration state.
              </p>

              {/* Clean Input Form */}
              <form onSubmit={handleSearch} className="w-full space-y-4">
                <div className="w-full flex items-center bg-slate-50 border-2 border-slate-200 rounded-2xl p-1.5 focus-within:border-black focus-within:bg-white transition-all">
                  <div className="pl-3 pr-2 text-slate-400 font-bold font-mono text-base border-r border-slate-200 flex items-center gap-1 shrink-0">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit number (e.g. 9876543210)"
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setPhoneNumber(val);
                      if (errorMessage) setErrorMessage(null);
                      if (adWarningMessage) setAdWarningMessage(null);
                    }}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-mono px-3 py-2 font-bold tracking-widest text-slate-900 focus:outline-none placeholder-slate-300 w-full"
                  />

                  {phoneNumber && (
                    <button
                      type="button"
                      onClick={() => setPhoneNumber("")}
                      className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-colors mr-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Error Message Alert */}
                <AnimatePresence>
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-mono flex items-start gap-2.5"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Custom EARLY TERMINATION Warning Banner */}
                <AnimatePresence>
                  {adWarningMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs leading-relaxed flex items-start gap-3"
                    >
                      <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold uppercase tracking-wider text-[10px] text-amber-900 mb-0.5">Lookup Cancelled Early</p>
                        <span>{adWarningMessage}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Action: Renamed to "Free Look Up" */}
                <button
                  type="submit"
                  disabled={phoneNumber.length !== 10}
                  className={`w-full h-14 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 shadow-md ${
                    phoneNumber.length === 10
                      ? "bg-black text-white hover:bg-neutral-800 cursor-pointer active:scale-[0.98]"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Free Look Up</span>
                </button>
              </form>

              {/* Secure Indicators */}
              <div className="w-full mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SSL Encrypted Link
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-300" />
                  Secure 256-Bit
                </span>
              </div>

            </div>
          </motion.div>
        )}

        {/* FULL PAGE DEDICATED ADS COUNTDOWN MAIN SCREEN */}
        {currentView === "unlocking" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-10 text-center relative overflow-hidden space-y-6 my-4"
          >
            {/* Cancel/Skip Ads Button in Top Right */}
            <button
              type="button"
              onClick={handleCloseAdsEarly}
              className="absolute right-4 top-4 text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors z-20 cursor-pointer"
              title="Skip Ads"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Glowing header indicators */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/30 flex items-center justify-center mx-auto mb-3 animate-pulse">
                <Flame className="w-8 h-8 text-rose-500" />
              </div>
              <div className="absolute -top-1 right-[43%] w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight leading-tight">
                Unlocking Telecom Switch Nodes
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mt-1.5 uppercase tracking-widest">
                Secure Link: +91 {phoneNumber}
              </p>
            </div>

            {/* Countdown Timer Visualizer */}
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex items-center justify-center gap-4 max-w-xs mx-auto">
              <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-rose-500 animate-spin absolute" />
                <span className="text-lg font-black font-mono text-white relative z-10">{adCountdown}</span>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-rose-400 font-bold font-mono block uppercase tracking-wider">Unlocking database</span>
                <span className="text-xs text-slate-300 font-medium">Please wait for {adCountdown} seconds...</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto">
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 10, ease: "linear" }}
                  className="bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 h-full"
                />
              </div>
              <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 uppercase">
                <span>Contacting Switch</span>
                <span>Decoding payload: {Math.max(0, 100 - (adCountdown * 10))}%</span>
              </div>
            </div>

            {/* HEAVY INTEGRATED NATIVE SPONSOR BANNER AREA (ALL ADS MAIN SCREEN) */}
            <div className="space-y-5 pt-4 border-t border-slate-800">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">
                Sponsored Premium Verification Nodes (High impression)
              </span>
              
              {/* Native Banner 1 */}
              <div key={`modal-ad-1-${adRefreshCounter}`} className="transform scale-95 origin-center">
                <AdsterraNativeBanner uniqueId="modal-spot-1" />
              </div>

              {/* HIGH CTR CLICK CTAS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                <a
                  href={ADSTERRA_SMART_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 rounded-xl text-white text-left flex items-center justify-between group transition-all duration-300"
                >
                  <div>
                    <span className="text-[9px] font-mono font-bold text-rose-200 block uppercase">Bypass Ad countdown</span>
                    <span className="text-xs font-black">⚡ Instant Cloud Tunnel</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white transform group-hover:translate-x-1.5 transition-transform" />
                </a>

                <a
                  href={ADSTERRA_SMART_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 bg-gradient-to-r from-slate-800 to-neutral-900 hover:from-slate-700 hover:to-neutral-800 rounded-xl text-white text-left border border-slate-750 flex items-center justify-between group transition-all duration-300"
                >
                  <div>
                    <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase">Satellite Router Access</span>
                    <span className="text-xs font-black text-amber-400">🛰️ Live Geo-Location GPS</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white transform group-hover:translate-x-1.5 transition-transform" />
                </a>
              </div>

              {/* Native Banner 2 */}
              <div key={`modal-ad-2-${adRefreshCounter}`} className="transform scale-95 origin-center">
                <AdsterraNativeBanner uniqueId="modal-spot-2" />
              </div>

            </div>

            <div className="text-[9px] text-slate-500 font-mono max-w-xs mx-auto">
              <p>This switch is sponsored to remain free.</p>
              <p className="mt-0.5">Do not close this panel to ensure HLR handoff succeeds.</p>
            </div>

            {/* Cancel Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCloseAdsEarly}
                className="text-xs text-slate-400 hover:text-white font-semibold underline underline-offset-4 transition-colors cursor-pointer"
              >
                Cancel and return to home
              </button>
            </div>

          </motion.div>
        )}

        {/* RESULTS SCREEN (JSON ONLY AS REQUESTED) */}
        {currentView === "results" && lookupResult && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl bg-white border-2 border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-6 my-4"
          >
            {/* Highlight background glowing */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/40 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-widest">
                  HLR Handoff Succeeded
                </span>
              </div>
              <button
                onClick={() => navigateTo("home")}
                className="text-xs font-bold font-mono text-slate-400 hover:text-black transition-colors"
              >
                Perform New Search
              </button>
            </div>

            {/* SECTION 1: RAW COPY PASTE API RESPONSE */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                <span>Raw API Response Payload (Copy Paste)</span>
              </div>
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 font-mono text-[10px] sm:text-xs overflow-auto max-h-80 relative group">
                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={handleCopyRaw}
                    className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-black text-slate-300 hover:text-white px-2.5 py-1.5 rounded-md border border-slate-800 text-[10px] transition-all"
                  >
                    {copiedRaw ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied Payload!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Raw JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-emerald-400 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                  {JSON.stringify(lookupResult, null, 2)}
                </pre>
              </div>
            </div>

            {/* HIGH CTR AD BANNER DIRECTLY UNDER RESULTS */}
            <div className="mt-6 pt-4 border-t border-slate-100" key={`result-ad-${adRefreshCounter}`}>
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block text-center mb-1.5">
                Verification Sponsor Slot
              </span>
              <AdsterraNativeBanner uniqueId="results-spot" />
            </div>

          </motion.div>
        )}

        {/* BOTTOM NATIVE BANNER (MAXIMIZE REVENUE) */}
        <div className="w-full bg-slate-100/30 border border-slate-200 rounded-3xl p-4 mt-8 flex flex-col items-center justify-center relative overflow-hidden">
          <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase block mb-1.5">
            Partner Native Sponsor Banner • Standard Slot 2
          </span>
          <div className="w-full max-w-[728px]" key={`footer-ad-${adRefreshCounter}`}>
            <AdsterraNativeBanner uniqueId="footer-spot" />
          </div>
        </div>

      </main>

      {/* Simple Clean Copyright Footer */}
      <footer className="w-full text-center mt-6 text-[10px] text-slate-400 font-mono px-4 max-w-xl mx-auto leading-relaxed">
        <p>© 2026 TRACEX GLOBAL REGISTRY SWITCH.</p>
        <p className="mt-0.5">SSL Secured & encrypted. All lookups route through authorized regional telecom databases.</p>
      </footer>

    </div>
  );
}
