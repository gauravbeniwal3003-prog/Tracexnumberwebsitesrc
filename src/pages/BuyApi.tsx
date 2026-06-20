import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Zap, Server, Shield, Code, ChevronRight, ArrowRight, MessageSquare } from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';
import { API_PLANS } from '../types.ts';
import { getOfferStatus, getPlanPrice } from '../services/promo.ts';

export default function BuyApi() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { planId } = useParams();

  const handleBuy = (pId: string, basePrice: number) => {
    if (!user) {
      // Trigger login
      window.dispatchEvent(new CustomEvent('open-login'));
      return;
    }
    const finalPrice = getPlanPrice({ id: pId, price: basePrice });
    // Launch standard payment modal logic
    window.dispatchEvent(new CustomEvent('launch-payment', { 
      detail: { planId: pId, amount: finalPrice, type: 'api' } 
    }));
  };

  useEffect(() => {
    if (planId) {
      const plan = API_PLANS.find(p => p.id === planId);
      if (plan) {
        // Slight delay to allow component to fully render
        const t = setTimeout(() => {
          handleBuy(plan.id, plan.price);
        }, 800);
        return () => clearTimeout(t);
      }
    }
  }, [planId, user]);

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      <LiquidBackground />
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 p-4 z-[60] flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:bg-cyan-500/10 transition-all group">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:animate-ping"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">TRACEXDATA</span>
        </button>
        {user && (
          <button onClick={() => navigate('/account/api')} className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            My API Dashboard
          </button>
        )}
      </nav>

      <div className="relative z-10 pt-24 pb-20 px-4 max-w-7xl mx-auto">
        <header className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/5 border border-cyan-500/10 mb-6"
          >
            <Zap size={14} className="text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400/80">SaaS API Marketplace</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40"
          >
            Intelligence at <br className="hidden md:block" /> Your Fingertips.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500 max-w-xl mx-auto text-sm md:text-lg"
          >
            Power your websites, apps, and platforms with the world's most accurate phone intelligence engine.
          </motion.p>
        </header>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24 justify-center">
          {API_PLANS.map((plan, idx) => {
            const planDetails: Record<string, { duration: string; limit: string; features: string[] }> = {
              api_number: {
                duration: '1 Month',
                limit: 'Unlimited',
                features: [
                  'Number Lookup only',
                  'Strict 10-digit format compliance check',
                  'Real-time intelligence database routing',
                  'High availability and zero-delay queue'
                ]
              },
              api_telegram: {
                duration: '1 Month',
                limit: 'Unlimited',
                features: [
                  'Telegram Lookup only',
                  'Accepts user handles & telegram IDs',
                  'Real-time metadata lookup',
                  'Optimized network lookup speed'
                ]
              },
              api_identity: {
                duration: '1 Month',
                limit: 'Unlimited',
                features: [
                  'Aadhaar / Identity Card lookup only',
                  'Strict 12-digit format check and stripping',
                  'Real-time verification registry connection',
                  'High throughput, zero-delay responses'
                ]
              },
              api_bank: {
                duration: '1 Month',
                limit: 'Unlimited',
                features: [
                  'Bank IFSC Lookup only',
                  'Instant verification of any IFSC code',
                  'Real-time bank details retrieval',
                  'White-label JSON formatted responses'
                ]
              },
              api_vehicle: {
                duration: '1 Month',
                limit: 'Unlimited',
                features: [
                  'Vehicle Lookup only',
                  'Instant retrieval of RTO registration details',
                  'Frictionless car and vehicle number plate lookups',
                  'Clean JSON formatted response structures'
                ]
              },
              api_pancard: {
                duration: '1 Month',
                limit: 'Unlimited',
                features: [
                  'PN/PAN Card Lookup only',
                  'Instant verification of any PAN/PN card details',
                  'Real-time verification registry connection',
                  'Clean JSON formatted response structures'
                ]
              },
              api_combo: {
                duration: '1 Month',
                limit: 'Unlimited',
                features: [
                  'All Combo Special',
                  'Access to Phone, Telegram, Identity, & Bank API endpoints',
                  'Priority server routing with no queues',
                  'Dedicated VIP developer integration support'
                ]
              }
            };

            const details = planDetails[plan.id] || {
              duration: '1 Month',
              limit: 'Unlimited',
              features: [
                'Information Lookup Access',
                'Real-time Intel Routing Engine',
                '99.9% System Uptime SLA'
              ]
            };

            const isPopular = plan.id === 'api_combo';
            const duration = details.duration;
            const limit = details.limit;
            const features = details.features;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx + 0.3 }}
                className={`relative p-8 rounded-[32px] border ${isPopular ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-white/5 bg-white/2'} backdrop-blur-xl group hover:border-cyan-500/30 transition-all`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-cyan-500 text-zinc-950 text-[10px] font-bold uppercase tracking-widest">
                    Best Value
                  </div>
                )}
                
                <h3 className="text-xl font-bold mb-1 text-white">{plan.name}</h3>
                <p className="text-zinc-500 text-xs mb-6 uppercase tracking-widest font-bold">{duration} • {limit}</p>
                
                <div className="flex items-baseline gap-2 mb-8 flex-wrap">
                  <span className="text-3xl font-bold text-white">₹{plan.price}</span>
                  <span className="text-zinc-600 text-sm">/plan</span>
                </div>

                <ul className="space-y-4 mb-10">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-xs text-zinc-400">
                      <Check size={14} className="text-cyan-400 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

              <button
                onClick={() => handleBuy(plan.id, plan.price)}
                className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  isPopular 
                    ? 'bg-cyan-500 text-zinc-950 hover:bg-cyan-400' 
                    : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                <span>Buy Key</span>
                <ChevronRight size={16} />
              </button>
            </motion.div>
          );
        })}

        {/* Custom API System Custom Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative p-8 rounded-[32px] border border-amber-500/35 bg-amber-500/5 backdrop-blur-xl group hover:border-amber-500/50 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold uppercase tracking-widest">
              Custom Solution
            </div>
            
            <h3 className="text-xl font-bold mb-1 text-white">Custom API System</h3>
            <p className="text-zinc-500 text-xs mb-6 uppercase tracking-widest font-bold">On-Demand • Full Integration</p>
            
            <div className="flex items-baseline gap-2 mb-8 flex-wrap">
              <span className="text-3xl font-bold text-amber-400">Custom System</span>
              <span className="text-zinc-500 text-xs ml-1">based on scope</span>
            </div>

            <ul className="space-y-4 mb-10">
              <li className="flex items-center gap-3 text-xs text-zinc-400">
                <Check size={14} className="text-amber-400 shrink-0" />
                <span>Custom API Service Development</span>
              </li>
              <li className="flex items-center gap-3 text-xs text-zinc-400">
                <Check size={14} className="text-amber-400 shrink-0" />
                <span>Full Working API Gateway Systems</span>
              </li>
              <li className="flex items-center gap-3 text-xs text-zinc-400">
                <Check size={14} className="text-amber-400 shrink-0" />
                <span>Interactive Real-time Data Sync</span>
              </li>
              <li className="flex items-center gap-3 text-xs text-zinc-400">
                <Check size={14} className="text-amber-400 shrink-0" />
                <span>Dedicated Admin Control Panels</span>
              </li>
            </ul>
          </div>

          <a
            href="https://t.me/Gaurav_beni_0001"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl bg-amber-500 text-zinc-950 font-bold text-sm hover:bg-amber-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.25)]"
          >
            <span>Message on Telegram</span>
            <ArrowRight size={16} />
          </a>
        </motion.div>
      </div>

        {/* Features Section */}
        <section className="mb-24 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Server size={24} />
            </div>
            <h4 className="text-xl font-bold text-white">Hidden Infrastructure</h4>
            <p className="text-zinc-500 text-sm leading-relaxed">Your real API remains 100% secure. Users only interact with our secondary gateway key logic.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Code size={24} />
            </div>
            <h4 className="text-xl font-bold text-white">Clean Response</h4>
            <p className="text-zinc-500 text-sm leading-relaxed">No third-party branding. 100% white-label JSON response that integrates perfectly with your UI.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Shield size={24} />
            </div>
            <h4 className="text-xl font-bold text-white">Instant Fulfillment</h4>
            <p className="text-zinc-500 text-sm leading-relaxed">Get your API key automatically within seconds after successful payment. No manual waiting.</p>
          </div>
        </section>

        {/* API Preview */}
        <section className="glass-card p-8 md:p-12 mb-24 overflow-hidden">
          <div className="flex flex-col md:flex-row gap-12">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-bold text-white">Integrate in Seconds.</h2>
              <p className="text-zinc-500 text-sm leading-relaxed">Example fetch request to empower your platform with TraceXData Intelligence.</p>
              
              <div className="space-y-2">
                {['Live Validation', 'Auto Filtering', 'No Rate Limits', 'JSON Ready'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
                    <div className="w-1 h-1 rounded-full bg-cyan-500"></div>
                    {item}
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button 
                   onClick={() => navigate('/api-docs')}
                   className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  View Documentation
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-black/40 rounded-[24px] p-6 font-mono text-[11px] md:text-sm border border-white/5 shadow-2xl">
              <div className="flex gap-1.5 mb-6 opacity-30">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
              <pre className="text-zinc-400 leading-relaxed overflow-x-auto">
                <span className="text-cyan-400">fetch</span>(<span className="text-orange-300">"https://tracexdata-api.onrender.com/api/lookup?key=YOUR_KEY&query=987..."</span>)<br />
                &nbsp;&nbsp;.<span className="text-cyan-400">then</span>(r =&gt; r.<span className="text-cyan-400">json</span>())<br />
                &nbsp;&nbsp;.<span className="text-cyan-400">then</span>(data =&gt; &#123;<br />
                &nbsp;&nbsp;&nbsp;&nbsp;console.<span className="text-cyan-400">log</span>(data.results[<span className="text-orange-300">"Result 1"</span>].name);<br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-zinc-600">// Output: "TraceXData Intelligence"</span><br />
                &nbsp;&nbsp;&#125;);
              </pre>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto space-y-4">
           <h2 className="text-2xl font-bold text-center mb-12 text-white">Common Questions</h2>
           <div className="space-y-4">
             {[
               { q: 'Is the API real-time?', a: 'Yes, every query hits our live intelligence engine immediately.' },
               { q: 'Can I use it on multiple websites?', a: 'Your API key is not IP-locked. You can use it across any platform you own.' },
               { q: 'What happens when I hit the limit?', a: 'The API will return a 403 error. You can upgrade or renew anytime.' }
             ].map((item, idx) => (
               <div key={idx} className="p-6 rounded-2xl bg-white/2 border border-white/5">
                 <h5 className="font-bold text-white mb-2 text-sm">{item.q}</h5>
                 <p className="text-zinc-500 text-xs leading-relaxed">{item.a}</p>
               </div>
             ))}
           </div>
        </section>
      </div>

      <footer className="py-20 text-center border-t border-white/5">
         <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-4">Secured by TraceXData Infrastructure</p>
         <div className="flex items-center justify-center gap-6">
            <button onClick={() => navigate('/contactus')} className="text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Support</button>
            <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Trace Home</button>
         </div>
      </footer>
    </div>
  );
}
