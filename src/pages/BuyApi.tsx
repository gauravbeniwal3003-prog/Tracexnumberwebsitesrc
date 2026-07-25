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
    <div className="min-h-screen bg-white text-slate-800 selection:bg-sky-500/20 selection:text-sky-900">
      <LiquidBackground />
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 p-4 z-[60] flex items-center justify-between bg-white/70 backdrop-blur-md border-b border-sky-100">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-all group cursor-pointer shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-500 group-hover:animate-ping"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">TRACEXDATA</span>
        </button>
        {user && (
          <button onClick={() => navigate('/account/api')} className="text-[10px] font-black uppercase tracking-widest text-sky-700 px-4 py-1.5 rounded-full bg-sky-100 border border-sky-200 hover:bg-sky-200 transition-all cursor-pointer">
            My API Dashboard
          </button>
        )}
      </nav>

      <div className="relative z-10 pt-24 pb-20 px-4 max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-100 border border-sky-200 mb-6 shadow-sm"
          >
            <Zap size={14} className="text-sky-600" />
            <span className="text-xs font-bold uppercase tracking-widest text-sky-800">SaaS API Marketplace</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-7xl font-black tracking-tighter mb-4 text-slate-900"
          >
            Intelligence at <br className="hidden md:block" /> Your Fingertips.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-600 max-w-2xl mx-auto text-sm md:text-base font-medium"
          >
            Select the service you want below, configure your custom plan, and easily generate white-label keys to power your platforms.
          </motion.p>
        </header>

        {/* STEP 1: API Service Selection Cards Grid */}
        <div className="mb-14">
          <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
            <span className="w-5 h-5 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 font-mono text-[10px] font-bold">1</span>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-600">Select API Service Category</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map((srv) => {
              const IconComp = srv.icon;
              const isSelected = selectedServiceId === srv.id;
              
              return (
                <button
                  key={srv.id}
                  onClick={() => setSelectedServiceId(srv.id)}
                  className={`text-left p-6 rounded-2xl border transition-all relative cursor-pointer shadow-sm ${
                    isSelected 
                      ? 'border-sky-500 bg-sky-50/90 shadow-md ring-2 ring-sky-400/20' 
                      : 'border-sky-100 bg-slate-50/70 hover:bg-sky-50/50 hover:border-sky-300'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-sky-600" />
                  )}
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`p-3 rounded-xl ${isSelected ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 border border-sky-100'}`}>
                      <IconComp size={20} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">{srv.name}</h3>
                      <span className="text-[10px] text-sky-700 font-extrabold font-mono">{srv.badge}</span>
                    </div>
                  </div>
                  <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed font-medium">{srv.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 2: Selected API Plans Grid */}
        <div className="mb-24">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-sky-100">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 font-mono text-[10px] font-bold">2</span>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-600">Available Plans for {activeService.name}</h2>
            </div>
            <span className="text-[10px] font-mono text-sky-700 font-extrabold uppercase tracking-widest hidden md:inline">Instant Generation</span>
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
                    className={`relative p-8 rounded-3xl border flex flex-col justify-between shadow-sm ${
                      isPopular 
                        ? 'border-sky-300 bg-gradient-to-b from-sky-50 to-blue-50/60 ring-2 ring-sky-400/20' 
                        : 'border-sky-100 bg-slate-50/80 hover:bg-sky-50/40'
                    } transition-all`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-sky-600 text-white text-[10px] font-black uppercase tracking-widest shadow-sm">
                        Best Value
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-black text-slate-900 mb-1">{plan.name}</h3>
                      <p className="text-sky-800 text-[10px] font-extrabold uppercase tracking-widest mb-6">
                        {plan.limit} • {plan.duration}
                      </p>

                      <div className="flex items-baseline gap-2 mb-8">
                        <span className="text-3xl font-black text-slate-900">₹{plan.price}</span>
                        <span className="text-slate-500 text-xs font-bold">/ plan cost</span>
                      </div>

                      <ul className="space-y-3 mb-10 border-t border-sky-100 pt-6">
                        <li className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                          <Check size={14} className="text-sky-600 shrink-0" />
                          <span>{plan.limit} Included</span>
                        </li>
                        <li className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                          <Check size={14} className="text-sky-600 shrink-0" />
                          <span>{plan.duration} API Access</span>
                        </li>
                        {activeService.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                            <Check size={14} className="text-sky-600 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => handleBuy(plan.id, plan.price)}
                      className={`w-full py-4 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                        isPopular 
                          ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700' 
                          : 'bg-white text-slate-800 hover:bg-sky-600 hover:text-white border border-sky-200'
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
          className="relative p-8 rounded-[32px] border border-amber-300 bg-amber-50/80 backdrop-blur-xl group hover:border-amber-400 transition-all flex flex-col md:flex-row items-center justify-between gap-6 mb-24 shadow-sm"
        >
          <div className="flex-1">
            <div className="inline-flex px-3 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest mb-4">
              Custom Enterprise System
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Need a custom API or gateway system?</h3>
            <p className="text-slate-700 text-sm max-w-xl leading-relaxed font-medium">
              We construct custom API gateways, web scraping, automation scripts, and database integrations tailored to your technical requirements.
            </p>
          </div>

          <a
            href="https://t.me/Gaurav_beni_0001"
            target="_blank"
            rel="noopener noreferrer"
            className="py-4 px-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0 w-full md:w-auto"
          >
            <span>Message on Telegram</span>
            <ArrowRight size={16} />
          </a>
        </motion.div>

        {/* Features Section */}
        <section className="mb-24 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4 p-6 rounded-2xl bg-slate-50/80 border border-sky-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600">
              <Server size={24} />
            </div>
            <h4 className="text-lg font-black text-slate-900">Hidden Infrastructure</h4>
            <p className="text-slate-600 text-xs leading-relaxed font-medium">Your real API remains 100% secure. Users only interact with our secondary gateway key logic.</p>
          </div>
          <div className="space-y-4 p-6 rounded-2xl bg-slate-50/80 border border-sky-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600">
              <Code size={24} />
            </div>
            <h4 className="text-lg font-black text-slate-900">Clean Response</h4>
            <p className="text-slate-600 text-xs leading-relaxed font-medium">No third-party branding. 100% white-label JSON response that integrates perfectly with your UI.</p>
          </div>
          <div className="space-y-4 p-6 rounded-2xl bg-slate-50/80 border border-sky-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600">
              <Shield size={24} />
            </div>
            <h4 className="text-lg font-black text-slate-900">Instant Fulfillment</h4>
            <p className="text-slate-600 text-xs leading-relaxed font-medium">Get your API key automatically within seconds after successful payment. No manual waiting.</p>
          </div>
        </section>

        {/* API Preview */}
        <section className="glass-card p-8 md:p-12 mb-24 overflow-hidden rounded-[32px] border border-sky-200 bg-white shadow-sm">
          <div className="flex flex-col md:flex-row gap-12">
            <div className="flex-1 space-y-6">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">Integrate in Seconds.</h2>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">Example fetch request to empower your platform with TraceXData Intelligence.</p>
              
              <div className="space-y-2">
                {['Live Validation', 'Auto Filtering', 'No Rate Limits', 'JSON Ready'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-slate-700 font-extrabold text-[10px] uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-600"></div>
                    {item}
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button 
                   onClick={() => navigate('/api-docs')}
                   className="px-8 py-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 font-extrabold text-xs hover:bg-sky-100 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  View Documentation
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-900 rounded-[24px] p-6 font-mono text-[11px] md:text-sm border border-slate-800 shadow-md">
              <div className="flex gap-1.5 mb-6 opacity-40">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
              </div>
              <pre className="text-slate-300 leading-relaxed overflow-x-auto">
                <span className="text-sky-400">fetch</span>(<span className="text-emerald-400">"{getApiBaseUrl().replace(/\/$/, "")}/api/lookup?key=YOUR_KEY&query=987..."</span>)<br />
                &nbsp;&nbsp;.<span className="text-sky-400">then</span>(r =&gt; r.<span className="text-sky-400">json</span>())<br />
                &nbsp;&nbsp;.<span className="text-sky-400">then</span>(data =&gt; &#123;<br />
                &nbsp;&nbsp;&nbsp;&nbsp;console.<span className="text-sky-400">log</span>(data.results[<span className="text-emerald-400">"Result 1"</span>].name);<br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500">// Output: "TraceXData Intelligence"</span><br />
                &nbsp;&nbsp;&#125;);
              </pre>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto space-y-4">
           <h2 className="text-xl font-black text-center mb-10 text-slate-900">Common Questions</h2>
           <div className="space-y-4">
             {[
               { q: 'Is the API real-time?', a: 'Yes, every query hits our live intelligence engine immediately.' },
               { q: 'Can I use it on multiple websites?', a: 'Your API key is not IP-locked. You can use it across any platform you own.' },
               { q: 'What happens when I hit the limit?', a: 'The API will return a 403 error. You can upgrade or renew anytime.' }
             ].map((item, idx) => (
               <div key={idx} className="p-6 rounded-2xl bg-slate-50/80 border border-sky-100 shadow-sm">
                 <h5 className="font-extrabold text-slate-900 mb-2 text-xs">{item.q}</h5>
                 <p className="text-slate-600 text-xs leading-relaxed font-medium">{item.a}</p>
               </div>
             ))}
           </div>
        </section>
      </div>

      <footer className="py-20 text-center border-t border-sky-100 mt-20 bg-sky-50/50">
         <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">Secured by TraceXData Infrastructure</p>
         <div className="flex items-center justify-center gap-6">
            <button onClick={() => navigate('/contactus')} className="text-slate-600 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-widest cursor-pointer">Support</button>
            <button onClick={() => navigate('/')} className="text-slate-600 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-widest cursor-pointer">Trace Home</button>
         </div>
      </footer>
    </div>
  );
}
