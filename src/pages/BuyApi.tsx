import { getApiBaseUrl } from "../services/api";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Zap, 
  Server, 
  Shield, 
  Code, 
  ChevronRight, 
  ArrowRight, 
  Phone, 
  Send, 
  Fingerprint, 
  Car, 
  Landmark, 
  CreditCard,
  Info,
  Mail
} from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';
import { API_PLANS } from '../types.ts';
import { getOfferStatus, getPlanPrice } from '../services/promo.ts';

// Services mapping
interface ApiService {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  badge: string;
  features: string[];
  plans: {
    id: string;
    name: string;
    price: number;
    limit: string;
    duration: string;
    popular?: boolean;
  }[];
}

const SERVICES: ApiService[] = [
  {
    id: 'number',
    name: 'Number Lookup API',
    icon: Phone,
    description: 'Get real-time operator, name, state and structural details for Indian mobile numbers.',
    badge: 'Plans from ₹20',
    features: [
      'Strict 10-digit format compliance check',
      'Real-time intelligence database routing',
      'High availability & zero-delay queues'
    ],
    plans: [
      { id: 'api_number_20', name: 'Starter Tier', price: 20, limit: '40 Lookups', duration: '30 Days validity' },
      { id: 'api_number_50', name: 'Basic Tier', price: 50, limit: '200 Lookups', duration: '30 Days validity' },
      { id: 'api_number_150', name: 'Weekly Unlimited', price: 150, limit: 'Unlimited Lookups', duration: '1 Week validity' },
      { id: 'api_number_400', name: 'Monthly Unlimited', price: 400, limit: 'Unlimited Lookups', duration: '1 Month validity', popular: true },
      { id: 'api_number_1000', name: 'Quarterly Unlimited', price: 1000, limit: 'Unlimited Lookups', duration: '3 Months validity' },
      { id: 'api_number_1600', name: 'Half-Year Unlimited', price: 1600, limit: 'Unlimited Lookups', duration: '6 Months validity' },
      { id: 'api_number_3000', name: 'Annual Unlimited', price: 3000, limit: 'Unlimited Lookups', duration: '1 Year validity' }
    ]
  },
  {
    id: 'telegram',
    name: 'Telegram Lookup API',
    icon: Send,
    description: 'Trace active Telegram handles or Telegram IDs back to physical contact numbers easily.',
    badge: 'Plans from ₹20',
    features: [
      'Accepts user handles & Telegram IDs',
      'Real-time metadata lookup & matching',
      'Optimized query speeds with direct fallback'
    ],
    plans: [
      { id: 'api_telegram_20', name: 'Basic Pack', price: 20, limit: '5 Lookups', duration: '30 Days validity' },
      { id: 'api_telegram_50', name: 'Pro Pack', price: 50, limit: '20 Lookups', duration: '30 Days validity' },
      { id: 'api_telegram_200', name: 'Weekly Unlimited', price: 200, limit: 'Unlimited Lookups', duration: '1 Week validity' },
      { id: 'api_telegram_650', name: 'Monthly Unlimited', price: 650, limit: 'Unlimited Lookups', duration: '1 Month validity', popular: true },
      { id: 'api_telegram_1800', name: 'Quarterly Unlimited', price: 1800, limit: 'Unlimited Lookups', duration: '3 Months validity' }
    ]
  },
  {
    id: 'identity',
    name: 'Identity Card Lookup API',
    icon: Fingerprint,
    description: 'Verify identity credentials against database registries with white-label JSON responses.',
    badge: 'Plans from ₹20',
    features: [
      'Strict 12-digit format check and stripping',
      'Instant access to registry logs',
      'White-label layout matching your app structure'
    ],
    plans: [
      { id: 'api_identity_20', name: 'Identity Starter', price: 20, limit: '5 Lookups', duration: '30 Days validity' },
      { id: 'api_identity_50', name: 'Identity Plus', price: 50, limit: '30 Lookups', duration: '30 Days validity' },
      { id: 'api_identity_150', name: 'Weekly Unlimited', price: 150, limit: 'Unlimited Lookups', duration: '1 Week validity' },
      { id: 'api_identity_450', name: 'Monthly Unlimited', price: 450, limit: 'Unlimited Lookups', duration: '1 Month validity', popular: true },
      { id: 'api_identity_1100', name: 'Quarterly Unlimited', price: 1100, limit: 'Unlimited Lookups', duration: '3 Months validity' }
    ]
  },
  {
    id: 'vehicle',
    name: 'Vehicle Lookup API',
    icon: Car,
    description: 'Instantly pull RTO vehicle registration logs, chassis, models, and owner details securely.',
    badge: 'Plans from ₹20',
    features: [
      'Instant retrieval of full RTO registration details',
      'No complicated captcha bypasses needed',
      'Clean database caching with high speed response'
    ],
    plans: [
      { id: 'api_vehicle_20', name: 'Basic Vehicle', price: 20, limit: '10 Lookups', duration: '30 Days validity' },
      { id: 'api_vehicle_400', name: 'Fortnightly Unlimited', price: 400, limit: 'Unlimited Lookups', duration: '15 Days validity' },
      { id: 'api_vehicle_700', name: 'Monthly Unlimited', price: 700, limit: 'Unlimited Lookups', duration: '1 Month validity', popular: true },
      { id: 'api_vehicle_1800', name: 'Quarterly Unlimited', price: 1800, limit: 'Unlimited Lookups', duration: '3 Months validity' }
    ]
  },
  {
    id: 'bank',
    name: 'BA&NK Lookup API',
    icon: Landmark,
    description: 'Lookup bank IFSC credentials to instantly verify physical addresses, branches, and IFSC states.',
    badge: 'Plans from ₹20',
    features: [
      'Instant verification of any Indian bank branch',
      'Reliable financial details verification',
      'Clean white-label JSON responses'
    ],
    plans: [
      { id: 'api_bank_20', name: 'Bank Basic', price: 20, limit: '20 Lookups', duration: '30 Days validity' },
      { id: 'api_bank_70', name: 'Weekly Unlimited', price: 70, limit: 'Unlimited Lookups', duration: '1 Week validity' },
      { id: 'api_bank_250', name: 'Monthly Unlimited', price: 250, limit: 'Unlimited Lookups', duration: '1 Month validity', popular: true },
      { id: 'api_bank_600', name: 'Quarterly Unlimited', price: 600, limit: 'Unlimited Lookups', duration: '3 Months validity' }
    ]
  },
  {
    id: 'aadhaar_to_pan',
    name: 'Aadhaar To PAN API',
    icon: CreditCard,
    description: 'Verify national database mappings to securely link any Aadhaar number back to PAN records.',
    badge: 'Plans from ₹1000',
    features: [
      'Authentic mapping with direct verified API routes',
      'Zero fake placeholder responses',
      'Secured backend authentication keys'
    ],
    plans: [
      { id: 'api_aadhaar_to_pan_1000', name: 'Aadhaar To PAN Starter', price: 1000, limit: '10 Lookups', duration: '30 Days validity' },
      { id: 'api_aadhaar_to_pan_2000', name: 'Aadhaar To PAN Pro', price: 2000, limit: '22 Lookups', duration: '30 Days validity' },
      { id: 'api_aadhaar_to_pan_5000', name: 'Aadhaar To PAN Enterprise', price: 5000, limit: '60 Lookups', duration: '30 Days validity', popular: true },
      { id: 'api_aadhaar_to_pan_10000', name: 'Fortnightly Unlimited', price: 10000, limit: 'Unlimited Lookups', duration: '15 Days validity' }
    ]
  },
  {
    id: 'email',
    name: 'Email Lookup API',
    icon: Mail,
    description: 'Trace email addresses to search for associated physical profiles or leaked registry entries.',
    badge: 'Plans from ₹20',
    features: [
      'Raw Response Forwarding (No Branding)',
      'High speed database lookup API',
      'Daily Lookup Limit of 1000 by default'
    ],
    plans: [
      { id: 'api_email_20', name: 'Email Starter', price: 20, limit: '40 Lookups', duration: '30 Days validity' },
      { id: 'api_email_50', name: 'Email Basic', price: 50, limit: '200 Lookups', duration: '30 Days validity' },
      { id: 'api_email_350', name: 'Email Monthly', price: 350, limit: 'Unlimited Lookups (1K/day)', duration: '1 Month validity', popular: true }
    ]
  }
];

export default function BuyApi() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { planId } = useParams();

  // Selected service state - default is number lookup
  const [selectedServiceId, setSelectedServiceId] = useState<string>('number');

  const handleBuy = (pId: string, basePrice: number) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('open-login'));
      return;
    }
    const finalPrice = getPlanPrice({ id: pId, price: basePrice });
    window.dispatchEvent(new CustomEvent('launch-payment', { 
      detail: { planId: pId, amount: finalPrice, type: 'api' } 
    }));
  };

  useEffect(() => {
    if (planId) {
      // Find which service this plan ID belongs to
      const matchingService = SERVICES.find(s => s.plans.some(p => p.id === planId));
      if (matchingService) {
        setSelectedServiceId(matchingService.id);
        const plan = matchingService.plans.find(p => p.id === planId);
        if (plan) {
          const t = setTimeout(() => {
            handleBuy(plan.id, plan.price);
          }, 800);
          return () => clearTimeout(t);
        }
      }
    }
  }, [planId, user]);

  const activeService = SERVICES.find(s => s.id === selectedServiceId) || SERVICES[0];

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
        <header className="text-center mb-12">
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
            className="text-4xl md:text-7xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40"
          >
            Intelligence at <br className="hidden md:block" /> Your Fingertips.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500 max-w-2xl mx-auto text-sm md:text-base"
          >
            Select the service you want below, configure your custom plan, and easily generate white-label keys to power your platforms.
          </motion.p>
        </header>

        {/* STEP 1: API Service Selection Cards Grid */}
        <div className="mb-14">
          <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
            <span className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono text-[10px] font-bold">1</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Select API Service Category</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map((srv) => {
              const IconComp = srv.icon;
              const isSelected = selectedServiceId === srv.id;
              
              return (
                <button
                  key={srv.id}
                  onClick={() => setSelectedServiceId(srv.id)}
                  className={`text-left p-6 rounded-2xl border transition-all relative ${
                    isSelected 
                      ? 'border-cyan-500 bg-cyan-500/5 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                      : 'border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-cyan-400" />
                  )}
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`p-3 rounded-xl ${isSelected ? 'bg-cyan-500/10 text-cyan-400' : 'bg-white/5 text-zinc-400'}`}>
                      <IconComp size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm sm:text-base leading-tight">{srv.name}</h3>
                      <span className="text-[10px] text-zinc-500 font-mono">{srv.badge}</span>
                    </div>
                  </div>
                  <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">{srv.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 2: Selected API Plans Grid */}
        <div className="mb-24">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono text-[10px] font-bold">2</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Available Plans for {activeService.name}</h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest hidden md:inline">Instant Generation</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedServiceId}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {activeService.plans.map((plan, idx) => {
                const isPopular = plan.popular;
                return (
                  <div
                    key={plan.id}
                    className={`relative p-8 rounded-3xl border flex flex-col justify-between ${
                      isPopular 
                        ? 'border-cyan-500/30 bg-gradient-to-b from-cyan-500/5 to-transparent' 
                        : 'border-white/5 bg-white/2'
                    } backdrop-blur-xl group hover:border-cyan-500/20 transition-all`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-cyan-500 text-zinc-950 text-[10px] font-bold uppercase tracking-widest">
                        Best Value
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-6">
                        {plan.limit} • {plan.duration}
                      </p>

                      <div className="flex items-baseline gap-2 mb-8">
                        <span className="text-3xl font-bold text-white">₹{plan.price}</span>
                        <span className="text-zinc-600 text-xs">/ plan cost</span>
                      </div>

                      <ul className="space-y-3 mb-10 border-t border-white/5 pt-6">
                        <li className="flex items-center gap-2.5 text-xs text-zinc-400">
                          <Check size={14} className="text-cyan-400 shrink-0" />
                          <span>{plan.limit} Included</span>
                        </li>
                        <li className="flex items-center gap-2.5 text-xs text-zinc-400">
                          <Check size={14} className="text-cyan-400 shrink-0" />
                          <span>{plan.duration} API Access</span>
                        </li>
                        {activeService.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-2.5 text-xs text-zinc-400">
                            <Check size={14} className="text-cyan-400/70 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => handleBuy(plan.id, plan.price)}
                      className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        isPopular 
                          ? 'bg-cyan-500 text-zinc-950 hover:bg-cyan-400' 
                          : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      <span>Buy Key Now</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Custom API System Custom Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative p-8 rounded-[32px] border border-amber-500/35 bg-amber-500/5 backdrop-blur-xl group hover:border-amber-500/50 transition-all flex flex-col md:flex-row items-center justify-between gap-6 mb-24"
        >
          <div className="flex-1">
            <div className="inline-flex px-3 py-1 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold uppercase tracking-widest mb-4">
              Custom Enterprise System
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Need a custom API or gateway system?</h3>
            <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
              We construct custom API gateways, web scraping, automation scripts, and database integrations tailored to your technical requirements.
            </p>
          </div>

          <a
            href="https://t.me/Gaurav_beni_0001"
            target="_blank"
            rel="noopener noreferrer"
            className="py-4 px-8 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm hover:bg-amber-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.25)] shrink-0 w-full md:w-auto"
          >
            <span>Message on Telegram</span>
            <ArrowRight size={16} />
          </a>
        </motion.div>

        {/* Features Section */}
        <section className="mb-24 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Server size={24} />
            </div>
            <h4 className="text-lg font-bold text-white">Hidden Infrastructure</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">Your real API remains 100% secure. Users only interact with our secondary gateway key logic.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Code size={24} />
            </div>
            <h4 className="text-lg font-bold text-white">Clean Response</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">No third-party branding. 100% white-label JSON response that integrates perfectly with your UI.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Shield size={24} />
            </div>
            <h4 className="text-lg font-bold text-white">Instant Fulfillment</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">Get your API key automatically within seconds after successful payment. No manual waiting.</p>
          </div>
        </section>

        {/* API Preview */}
        <section className="glass-card p-8 md:p-12 mb-24 overflow-hidden rounded-[32px] border border-white/5 bg-white/2">
          <div className="flex flex-col md:flex-row gap-12">
            <div className="flex-1 space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Integrate in Seconds.</h2>
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
                <span className="text-cyan-400">fetch</span>(<span className="text-orange-300">"{getApiBaseUrl().replace(/\/$/, "")}/api/lookup?key=YOUR_KEY&query=987..."</span>)<br />
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
           <h2 className="text-xl font-bold text-center mb-10 text-white">Common Questions</h2>
           <div className="space-y-4">
             {[
               { q: 'Is the API real-time?', a: 'Yes, every query hits our live intelligence engine immediately.' },
               { q: 'Can I use it on multiple websites?', a: 'Your API key is not IP-locked. You can use it across any platform you own.' },
               { q: 'What happens when I hit the limit?', a: 'The API will return a 403 error. You can upgrade or renew anytime.' }
             ].map((item, idx) => (
               <div key={idx} className="p-6 rounded-2xl bg-white/2 border border-white/5">
                 <h5 className="font-bold text-white mb-2 text-xs">{item.q}</h5>
                 <p className="text-zinc-500 text-xs leading-relaxed">{item.a}</p>
               </div>
             ))}
           </div>
        </section>
      </div>

      <footer className="py-20 text-center border-t border-white/5 mt-20">
         <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-4">Secured by TraceXData Infrastructure</p>
         <div className="flex items-center justify-center gap-6">
            <button onClick={() => navigate('/contactus')} className="text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Support</button>
            <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Trace Home</button>
         </div>
      </footer>
    </div>
  );
}
