import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Copy, Clock, Activity, AlertCircle, RefreshCcw, ExternalLink, Code, CheckCircle, ChevronRight, LayoutDashboard, Database, HelpCircle } from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';
import { getApiBaseUrl } from '../services/api.ts';

interface ApiKey {
  id: string;
  api_key: string;
  plan_name: string;
  expires_at: string;
  requests_used: number;
  request_limit: number | null;
  status: string;
  created_at: string;
  last_used_at: string | null;
}

export default function ApiDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchKeys();
  }, [user]);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || '';
      const response = await fetch(`${getApiBaseUrl()}/api/user-keys`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setKeys(data);
      } else {
        console.error("Failed to fetch secure user keys:", await response.text());
      }
    } catch (err) {
      console.error("Error fetching keys:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const calculateTimeLeft = (expiry: string) => {
    const total = Date.parse(expiry) - Date.now();
    if (total <= 0) return 'Expired';
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    return `${days}d ${hours}h`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <RefreshCcw className="animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      <LiquidBackground />
      
      {/* Sidebar/Nav */}
      <nav className="fixed top-0 left-0 right-0 p-4 z-[60] flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <LayoutDashboard size={16} className="text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">Account Home</span>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/api-docs')} className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-4 py-2 hover:text-white transition-colors">Documentation</button>
          <button onClick={() => navigate('/buy-api')} className="bg-cyan-500 text-zinc-950 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest">Buy API</button>
        </div>
      </nav>

      <div className="relative z-10 pt-24 pb-12 px-4 max-w-5xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-bold mb-2">API Intelligence</h1>
          <p className="text-zinc-500 text-sm">Manage your secret keys and monitor real-time platform usage.</p>
        </header>

        {keys.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-zinc-600">
              <Database size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">No Active API Keys</h3>
            <p className="text-zinc-500 text-sm max-w-sm mb-8">You haven't purchased any API plans yet. Unlock full platform capability with our SaaS endpoints.</p>
            <button 
              onClick={() => navigate('/buy-api')}
              className="px-8 py-3 rounded-xl bg-cyan-500 text-zinc-950 font-bold text-xs hover:bg-cyan-400"
            >
              Get My First Key
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {keys.map((key) => {
              const isExpired = new Date(key.expires_at) < new Date();
              const progress = key.request_limit ? (key.requests_used / key.request_limit) * 100 : 0;
              
              return (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6 md:p-8"
                >
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Key Info */}
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${isExpired ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'}`}>
                            <Key size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-white leading-tight">{key.plan_name}</h4>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">Plan Identity</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          isExpired ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {isExpired ? 'Expired' : 'Active'}
                        </div>
                      </div>

                      <div className="relative group">
                        <div className="flex items-center justify-between font-mono bg-black/40 border border-white/5 rounded-xl px-4 py-3 group-hover:bg-black/60 transition-all">
                          <span className="text-zinc-400 text-sm overflow-hidden text-ellipsis whitespace-nowrap mr-4">
                            {key.api_key}
                          </span>
                          <button 
                            onClick={() => copyToClipboard(key.api_key, key.id)}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors shrink-0"
                          >
                            {copiedKey === key.id ? <CheckCircle size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                        <AnimatePresence>
                          {copiedKey === key.id && (
                            <motion.span
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="absolute -top-8 right-0 text-[10px] font-bold text-cyan-400"
                            >
                              Copied!
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-white/2 border border-white/5">
                          <div className="flex items-center gap-2 text-zinc-500 mb-1">
                            <Clock size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Time Remaining</span>
                          </div>
                          <span className="text-lg font-bold text-white">{calculateTimeLeft(key.expires_at)}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/2 border border-white/5">
                          <div className="flex items-center gap-2 text-zinc-500 mb-1">
                            <Activity size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Usage Count</span>
                          </div>
                          <span className="text-lg font-bold text-white">{key.requests_used} reqs</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="w-full md:w-64 space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                          <span>Request Quota</span>
                          <span>{key.request_limit ? `${Math.round(progress)}%` : 'Unlimited'}</span>
                        </div>
                        {key.request_limit ? (
                           <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                             <div 
                               className={`h-full transition-all duration-1000 ${progress > 90 ? 'bg-red-500' : 'bg-cyan-500'}`}
                               style={{ width: `${progress}%` }}
                             />
                           </div>
                        ) : (
                          <div className="h-1.5 w-full bg-cyan-500/20 rounded-full flex items-center justify-center">
                            <span className="text-[8px] font-bold text-cyan-400">∞ LIFETIME THROUGHPUT</span>
                          </div>
                        )}
                        <p className="text-[9px] text-zinc-600 font-medium">Reset on renewal. Includes full dataset lookup.</p>
                      </div>

                      <div className="pt-4 space-y-2">
                        <button 
                          onClick={() => {
                            const planUpper = String(key.plan_name || "").toUpperCase();
                            let targetUrl = "";
                            const baseDomain = getApiBaseUrl().replace(/\/$/, "");
                            
                            if (planUpper.includes("TELEGRAM")) {
                              targetUrl = `${baseDomain}/api/telegram?key=${key.api_key}&api=gaurav_beniwal_0001`;
                            } else if (planUpper.includes("VEH_OWNER") || planUpper.includes("VEH_NUMM") || planUpper.includes("VEHICLE TO OWNER") || planUpper.includes("OWNER")) {
                              targetUrl = `${baseDomain}/api/veh-owner-num?key=${key.api_key}&query=BR07PB6268`;
                            } else if (planUpper.includes("VEHICLE")) {
                              targetUrl = `${baseDomain}/api/vehicle?key=${key.api_key}&query=BR07PB6268`;
                            } else if (planUpper.includes("PAN") || planUpper.includes("PN")) {
                              targetUrl = `${baseDomain}/api/pancard?key=${key.api_key}&query=NTEPK1628C`;
                            } else if (planUpper.includes("ADHR") || planUpper.includes("IDENTITY") || planUpper.includes("AADH")) {
                              targetUrl = `${baseDomain}/api/identity?key=${key.api_key}&query=381933049732`;
                            } else if (planUpper.includes("BNK") || planUpper.includes("BANK")) {
                              targetUrl = `${baseDomain}/api/bank?key=${key.api_key}&query=ABCD0001325`;
                            } else if (planUpper.includes("EMAIL") || planUpper.includes("MAIL")) {
                              targetUrl = `${baseDomain}/api/email?key=${key.api_key}&query=gauravbeniwal303@gmail.com`;
                            } else {
                              targetUrl = `${baseDomain}/api/lookup?key=${key.api_key}&number=9879712345`;
                            }
                            copyToClipboard(targetUrl, `${key.id}-endpoint`);
                          }}
                          className="w-full py-3 rounded-xl bg-white/5 border border-white/5 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        >
                          <Code size={14} />
                          Copy Endpoint
                        </button>
                        <button 
                          onClick={() => navigate('/buy-api')}
                          className="w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2"
                        >
                          Renew / Upgrade
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <section className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="p-8 rounded-[32px] border border-white/5 bg-white/2">
             <HelpCircle className="text-zinc-600 mb-6" size={32} />
             <h4 className="text-xl font-bold mb-4">Quick Documentation</h4>
             <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
               All endpoints return high-fidelity JSON. We recommend using a backend proxy to keep your API key hidden from frontend users.
             </p>
             <button onClick={() => navigate('/api-docs')} className="text-cyan-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-all">
               Full Documentation
               <ChevronRight size={14} />
             </button>
           </div>
           <div className="p-8 rounded-[32px] border border-white/5 bg-white/2">
             <LayoutDashboard className="text-zinc-600 mb-6" size={32} />
             <h4 className="text-xl font-bold mb-4">Request Logs</h4>
             <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
               Detailed analytics and request history are available in your primary account dashboard. Monitor IP origin and response times.
             </p>
             <button onClick={() => navigate('/')} className="text-zinc-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-all">
               Return Home
               <ChevronRight size={14} />
             </button>
           </div>
        </section>
      </div>

      <footer className="py-12 text-center text-[10px] text-zinc-700 font-bold uppercase tracking-[0.2em]">
        TraceXData Intelligence • API Gateway v4.1
      </footer>
    </div>
  );
}
