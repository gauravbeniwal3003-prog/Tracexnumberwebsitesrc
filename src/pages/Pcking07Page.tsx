/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, AlertCircle, Phone, History, Trash2, Clipboard, Check, Terminal, Zap, Sparkles, ShieldCheck } from 'lucide-react';
import LiquidBackground from '../components/LiquidBackground.tsx';
import Skeleton from '../components/Skeleton.tsx';
import { lookupNumberPcking07, ApiResponse } from '../services/api.ts';
import { saveToHistory, getHistory, clearHistory } from '../services/storage.ts';
import { cleanIndianPhoneNumber } from '../services/utils.ts';
import { Link } from 'react-router-dom';

export default function Pcking07Page() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Initializing PCKING07 Engine...');
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // Load local history on mount
  useEffect(() => {
    setSearchHistory(getHistory());
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Dynamic loading messages
  useEffect(() => {
    if (!isLoading) return;
    
    const messages = [
      'Bypassing Rate Limits...',
      'Opening Deep Core Database...',
      'Searching Encrypted Records...',
      'Decrypting Registry Pack...',
      'Finalizing Intelligence Logs...'
    ];

    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMessage(messages[i]);
    }, 800);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSearch = useCallback(async (e?: React.FormEvent, forceQuery?: string) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    if (cooldown > 0) {
      setError(`System cooling down. Please wait ${cooldown}s before next query.`);
      return;
    }

    const targetVal = forceQuery || phoneNumber.trim();
    if (!targetVal) return;

    if (targetVal.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setResult(null);

    try {
      const data = await lookupNumberPcking07(targetVal);
      const hasValidData = (data.results && Object.keys(data.results).length > 0) || (data.raw_results && data.raw_results.trim().length > 0);
      
      if (data.status && hasValidData) {
        setResult(data);
        saveToHistory(targetVal, data);
        setSearchHistory(getHistory());
        setCooldown(5);
      } else {
        setError(data.error || 'No records found or service temporarily unavailable.');
      }
    } catch (err: any) {
      console.error('PCKING07 lookup failure:', err);
      setError(err.message || 'The TRACEXDATA engine encountered a connection error. Please retry.');
    } finally {
      setIsLoading(false);
    }
  }, [phoneNumber, cooldown, isLoading]);

  const getFormattedResponse = () => {
    if (!result) return "";

    let targetObj: any = null;
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

    if (!targetObj) return "";

    let str = typeof targetObj === 'string' ? targetObj : JSON.stringify(targetObj, null, 2);

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

  const removeHistory = () => {
    clearHistory();
    setSearchHistory([]);
  };

  return (
    <div className="relative min-h-screen text-slate-800 selection:bg-sky-200 selection:text-sky-900 overflow-x-hidden">
      <LiquidBackground />

      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 p-3.5 md:p-4 z-[60] flex items-center justify-between transition-all duration-300 bg-white/70 backdrop-blur-xl border-b border-sky-100/80 shadow-[0_2px_15px_rgba(14,165,233,0.05)]">
        <Link 
          to="/" 
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50/90 border border-sky-200/80 backdrop-blur-md hover:bg-sky-100 transition-all group shadow-sm"
        >
          <div className="w-2 h-2 rounded-full bg-sky-600 group-hover:animate-ping"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-800 group-hover:text-sky-700">TRACEXDATA</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] md:text-xs font-black uppercase tracking-wider shadow-sm animate-pulse">
            <Sparkles size={12} />
            <span>PCKING07 Unlimited Mode</span>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="pt-24 md:pt-32 pb-4 md:pb-6 px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 mb-2 md:mb-4 px-3.5 py-1.5 rounded-full bg-emerald-100/90 border border-emerald-300/80 backdrop-blur-md shadow-sm"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">No Login Required • Unlimited Number Lookup</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl md:text-5xl font-black tracking-tight mb-2 md:mb-3 text-slate-900 leading-tight"
        >
          PCKING07 Unlimited Number Lookup
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-600 text-xs md:text-base max-w-lg mx-auto leading-relaxed px-4 font-medium"
        >
          Instant, unrestricted mobile number intelligence feed without sign-in or credit limits.
        </motion.p>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto px-4 md:px-6 pb-20 relative z-10 w-full">
        {/* Notice Banner */}
        <div className="text-center mb-6 md:mb-8 text-[11px] md:text-xs text-emerald-900 bg-emerald-50/90 border border-emerald-200/90 px-4 py-3 rounded-2xl max-w-xl mx-auto flex items-center justify-center gap-2 backdrop-blur-md shadow-sm">
          <Zap size={15} className="text-emerald-600 shrink-0" />
          <span className="leading-relaxed font-semibold">
            PCKING07 Mode: Anyone can search mobile numbers freely. Unlimited lookups enabled directly on this page.
          </span>
        </div>

        {/* Search Input Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card mb-6 md:mb-8 p-1.5 md:p-2 border-sky-100 bg-white/90 shadow-[0_12px_35px_rgba(14,165,233,0.08)]"
        >
          <form onSubmit={(e) => handleSearch(e)} className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search mobile number (e.g. 9876543210)..."
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(cleanIndianPhoneNumber(e.target.value))}
                className="w-full glass-input px-6 h-12 md:h-16 text-base md:text-lg font-mono text-slate-900 focus:bg-white placeholder:text-slate-400 font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || cooldown > 0 || phoneNumber.trim().length < 10}
              className="w-full md:w-48 h-12 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-sky-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(16,185,129,0.3)] cursor-pointer active:scale-98"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : cooldown > 0 ? (
                <span className="text-sm md:text-base">{cooldown}s</span>
              ) : (
                <>
                  <Search size={16} className="md:w-[18px]" />
                  <span className="text-sm md:text-base font-bold">Trace Now</span>
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Error Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 p-4 mb-8 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs md:text-sm font-semibold shadow-sm"
            >
              <AlertCircle size={18} className="shrink-0 text-red-500" />
              <span className="flex-1 whitespace-pre-line">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Results Display */}
        <div className="min-h-[100px]">
          {isLoading ? (
            <Skeleton message={loadingMessage} />
          ) : result ? (
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 md:p-8 relative overflow-hidden space-y-4 border-sky-200 bg-white/90 shadow-[0_10px_35px_rgba(14,165,233,0.08)]"
              >
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
                
                <div className="flex items-center justify-between border-b border-sky-100 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700">
                      <Terminal size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 uppercase tracking-wide text-xs md:text-sm">
                        PCKING07 Direct Database Feed
                      </h3>
                      <p className="text-[10px] font-mono text-emerald-700 uppercase tracking-wider font-bold">
                        STATUS: UNLIMITED DECRYPTED FEED
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
                    className="px-3.5 py-1.5 rounded-lg bg-slate-100 border border-slate-300 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 transition-all flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest cursor-pointer shadow-sm"
                  >
                    {copiedResponse ? <Check size={11} className="text-emerald-600" strokeWidth={3} /> : <Clipboard size={11} />}
                    {copiedResponse ? 'Copied' : 'Copy Feed'}
                  </button>
                </div>

                <div className="relative">
                  <pre className="text-left font-mono whitespace-pre-wrap text-emerald-400 select-all overflow-x-auto text-[11px] md:text-xs leading-relaxed p-4 bg-slate-950 border border-slate-900 rounded-xl max-h-[600px] overflow-y-auto shadow-inner">
                    {getFormattedResponse()}
                  </pre>
                </div>
              </motion.div>
            </div>
          ) : null}
        </div>

        {/* Local Search History */}
        {searchHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 glass-card p-6 border-sky-100 bg-white/90 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-sky-100">
              <div className="flex items-center gap-2">
                <History size={16} className="text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Recent PCKING07 Traces</h3>
              </div>
              <button
                onClick={removeHistory}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-600 font-bold transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                Clear History
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {searchHistory.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setPhoneNumber(item.number);
                    handleSearch(undefined, item.number);
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-sky-50/60 hover:bg-sky-100/80 border border-sky-100 text-slate-800 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <Phone size={14} className="text-sky-600 group-hover:scale-110 transition-transform" />
                    <span className="font-mono text-xs md:text-sm font-bold">{item.number}</span>
                  </div>
                  <span className="text-[10px] text-sky-700 font-extrabold uppercase tracking-wider">Re-Trace</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
