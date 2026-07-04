import { getApiBaseUrl } from "../services/api";
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Book, Code, Terminal, Layers, Globe, Copy, Check, ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';

export default function ApiDocs() {
  const baseDomain = getApiBaseUrl().replace(/\/$/, "");
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const jsExample = `fetch("${baseDomain}/api/lookup?key=YOUR_API_KEY&query=9876543210")
  .then(response => response.json())
  .then(data => {
    if (data.status === "success") {
      console.log("Results Found:", data.results_found);
      console.log("Owner:", data.results["Result 1"].name);
    }
  })
  .catch(err => console.error(err));`;

  const pythonExample = `import requests

url = "${baseDomain}/api/lookup" 
params = {
    "key": "YOUR_API_KEY",
    "query": "9876543210"
}

response = requests.get(url, params=params)
data = response.json()

if data["status"] == "success":
    print(f"Name: {data['results']['Result 1']['name']}")`;

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      <LiquidBackground />
      
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 p-4 z-[60] flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:bg-cyan-500/10 transition-all">
          <ArrowLeft size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Home</span>
        </button>
        <button onClick={() => navigate('/buy-api')} className="bg-cyan-500 text-zinc-950 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-cyan-500/20">
          Get API Key
        </button>
      </nav>

      <div className="relative z-10 pt-24 pb-20 px-4 max-w-4xl mx-auto">
        <header className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
            <Book size={14} />
            Developer Docs
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">API Integration Guide</h1>
          <p className="text-zinc-500 text-sm md:text-base max-w-2xl leading-relaxed">
            Connect your applications to the TraceXData Intelligence Engine. Our REST API delivers structured, white-labeled JSON responses with high-fidelity accuracy and strict response branding.
          </p>
        </header>

        <main className="space-y-16">
          {/* Input Guidelines & Format Restrictions */}
          <section className="space-y-4 p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800/50">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">🚨 Strict Formatting Compliance</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              If an incorrect format query parameter is passed through the API, it will return an explicit formatting error block immediately. Please design your requests in compliance with these input requirements:
            </p>
            <ul className="text-xs space-y-2 list-disc list-inside text-zinc-300">
              <li>
                <strong className="text-white">Mobile Number Lookup:</strong> You must supply an exact <span className="text-cyan-400 font-bold">10-digit numeric mobile number</span> (e.g. <code className="font-mono bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded">9879712345</code>). Adding prefixes or alphabetical characters will trigger a format failure.
              </li>
              <li>
                <strong className="text-white">Telegram Account Lookup:</strong> You must supply a valid <span className="text-cyan-400 font-bold">Telegram username</span> containing alphabetic letters or beginning with the <code className="font-mono bg-zinc-900 px-1 py-0.5 rounded">@</code> symbol (e.g. <code className="font-mono bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded">@gaurav_beniwal_0001</code>). Length must be at least 3 characters.
              </li>
              <li>
                <strong className="text-red-400">Strict Protection Policy:</strong> Both Number details and Telegram username queries are verified against our safety database first. If registered as protected, the API returns a <span className="text-emerald-400">Protected Status</span> shield record immediately before querying any sources.
              </li>
            </ul>
          </section>

          {/* Base URLs */}
          <section className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Globe size={18} className="text-cyan-400" />
              Intelligence Endpoints
            </h3>
            
            <div className="space-y-4">
              {/* 1. Unified Lookup Registry */}
              <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">1. Unified Registry Endpoint (Universal & Phone)</span>
                  <span className="text-[9px] font-bold text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs md:text-sm group mt-1">
                  <span className="text-zinc-300 break-all">GET {baseDomain}/api/lookup?key=YOUR_KEY&number=9879712345</span>
                  <button 
                     onClick={() => copyCode(`${baseDomain}/api/lookup?key=YOUR_KEY&number=9879712345`, 'mobile_api')}
                     className="text-zinc-600 hover:text-white transition-colors ml-2 shrink-0"
                  >
                     {copied === 'mobile_api' ? <Check size={16} className="text-cyan-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* 2. Telegram Lookup */}
              <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">2. Dedicated Telegram Registry Endpoint</span>
                  <span className="text-[9px] font-bold text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs md:text-sm group mt-1">
                  <span className="text-zinc-300 break-all">GET {baseDomain}/api/telegram?key=YOUR_KEY&api=gaurav_beniwal_0001</span>
                  <button 
                     onClick={() => copyCode(`${baseDomain}/api/telegram?key=YOUR_KEY&api=gaurav_beniwal_0001`, 'tg_api')}
                     className="text-zinc-600 hover:text-white transition-colors ml-2 shrink-0"
                  >
                     {copied === 'tg_api' ? <Check size={16} className="text-cyan-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* 3. Identity Card Lookup */}
              <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">3. Dedicated Identity & Aadhaar Registry Endpoint</span>
                  <span className="text-[9px] font-bold text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs md:text-sm group mt-1">
                  <span className="text-zinc-300 break-all">GET {baseDomain}/api/identity?key=YOUR_KEY&query=381933049732</span>
                  <button 
                     onClick={() => copyCode(`${baseDomain}/api/identity?key=YOUR_KEY&query=381933049732`, 'identity_api')}
                     className="text-zinc-600 hover:text-white transition-colors ml-2 shrink-0"
                  >
                     {copied === 'identity_api' ? <Check size={16} className="text-cyan-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* 4. Bank IFSC Lookup */}
              <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">4. Dedicated BA&NK (IFSC) Registry Endpoint</span>
                  <span className="text-[9px] font-bold text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs md:text-sm group mt-1">
                  <span className="text-zinc-300 break-all">GET {baseDomain}/api/bank?key=YOUR_KEY&query=ABCD0001325</span>
                  <button 
                     onClick={() => copyCode(`${baseDomain}/api/bank?key=YOUR_KEY&query=ABCD0001325`, 'bank_api')}
                     className="text-zinc-600 hover:text-white transition-colors ml-2 shrink-0"
                  >
                     {copied === 'bank_api' ? <Check size={16} className="text-cyan-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* 5. Vehicle Lookup */}
              <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">5. Dedicated RTO Vehicle Registry Endpoint</span>
                  <span className="text-[9px] font-bold text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs md:text-sm group mt-1">
                  <span className="text-zinc-300 break-all">GET {baseDomain}/api/vehicle?key=YOUR_KEY&query=BR07PB6268</span>
                  <button 
                     onClick={() => copyCode(`${baseDomain}/api/vehicle?key=YOUR_KEY&query=BR07PB6268`, 'vehicle_api')}
                     className="text-zinc-600 hover:text-white transition-colors ml-2 shrink-0"
                  >
                     {copied === 'vehicle_api' ? <Check size={16} className="text-cyan-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* 6. PN CARD Lookup */}
              <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">6. Dedicated PN/PAN Card Registry Endpoint</span>
                  <span className="text-[9px] font-bold text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs md:text-sm group mt-1">
                  <span className="text-zinc-300 break-all">GET {baseDomain}/api/pancard?key=YOUR_KEY&query=NTEPK1628C</span>
                  <button 
                     onClick={() => copyCode(`${baseDomain}/api/pancard?key=YOUR_KEY&query=NTEPK1628C`, 'pancard_api')}
                     className="text-zinc-600 hover:text-white transition-colors ml-2 shrink-0"
                  >
                     {copied === 'pancard_api' ? <Check size={16} className="text-cyan-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </section>
 
          {/* Parameters */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Terminal size={18} className="text-cyan-400" />
              Standard Parameters
            </h3>
            <div className="glass-card overflow-hidden">
               <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/2 border-b border-white/5">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Param</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Type</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono text-cyan-400">key</td>
                      <td className="px-6 py-4 text-xs text-zinc-500">String</td>
                      <td className="px-6 py-4 text-xs text-zinc-400 font-medium">Your authorized SaaS API Key</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono text-cyan-400">query</td>
                      <td className="px-6 py-4 text-xs text-zinc-500">String</td>
                      <td className="px-6 py-4 text-xs text-zinc-400 font-medium">Universal input parameter. If it contains only numbers (exactly 10 digits), the engine executes a mobile number lookup. If it contains alphabetic characters or starts with @, it executes a Telegram username lookup. Checking for protected values is done first.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono text-cyan-400">numquery</td>
                      <td className="px-6 py-4 text-xs text-zinc-500">String</td>
                      <td className="px-6 py-4 text-xs text-zinc-400 font-medium">Stricter 10-Digit Mobile Phone Query. Explicitly restricts lookup to Number database.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono text-cyan-400">tgquery</td>
                      <td className="px-6 py-4 text-xs text-zinc-500">String</td>
                      <td className="px-6 py-4 text-xs text-zinc-400 font-medium">Telegram Identifier query parameter (ID or Username). Explicitly restricts lookup to Telegram database.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono text-cyan-400">adhrquery</td>
                      <td className="px-6 py-4 text-xs text-zinc-500">String</td>
                      <td className="px-6 py-4 text-xs text-zinc-400 font-medium">12-Digit Identity/Aadhaar query parameter. Stripped of non-numeric characters automatically.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono text-cyan-400">bnkquery</td>
                      <td className="px-6 py-4 text-xs text-zinc-500">String</td>
                      <td className="px-6 py-4 text-xs text-zinc-400 font-medium">11-Character alphanumeric IFSC code or Bank query. Automatically converted to uppercase.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono text-cyan-400">vehiclequery</td>
                      <td className="px-6 py-4 text-xs text-zinc-500">String</td>
                      <td className="px-6 py-4 text-xs text-zinc-400 font-medium">Any car or automobile license plate number / registration number.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono text-cyan-400">panquery</td>
                      <td className="px-6 py-4 text-xs text-zinc-500">String</td>
                      <td className="px-6 py-4 text-xs text-zinc-400 font-medium">Any PN or PAN card alphanumeric number query.</td>
                    </tr>
                  </tbody>
               </table>
            </div>
          </section>

          {/* Code Examples */}
          <section className="space-y-8">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Code size={18} className="text-cyan-400" />
              Implementation
            </h3>

            <div className="space-y-2">
               <div className="flex items-center justify-between px-2">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">JavaScript (Fetch)</span>
                 <button onClick={() => copyCode(jsExample, 'js')} className="text-zinc-600 hover:text-white transition-all">
                   {copied === 'js' ? <Check size={14} className="text-cyan-400" /> : <Copy size={14} />}
                 </button>
               </div>
               <div className="p-6 rounded-2xl bg-black/40 border border-white/5 font-mono text-sm overflow-x-auto text-zinc-400">
                 <pre>{jsExample}</pre>
               </div>
            </div>

            <div className="space-y-2">
               <div className="flex items-center justify-between px-2">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Python (Requests)</span>
                 <button onClick={() => copyCode(pythonExample, 'py')} className="text-zinc-600 hover:text-white transition-all">
                   {copied === 'py' ? <Check size={14} className="text-cyan-400" /> : <Copy size={14} />}
                 </button>
               </div>
               <div className="p-6 rounded-2xl bg-black/40 border border-white/5 font-mono text-sm overflow-x-auto text-zinc-400">
                 <pre>{pythonExample}</pre>
               </div>
            </div>
          </section>

          {/* Response Schema */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Layers size={18} className="text-cyan-400" />
              Response Profile
            </h3>
            <p className="text-zinc-500 text-xs">Our response is filtered to remove all provider details, exposing only meaningful owner intelligence.</p>
            <div className="p-6 rounded-2xl bg-white/2 border border-white/5 font-mono text-[11px] md:text-sm text-zinc-400 space-y-1">
               <div className="text-emerald-400/80">"status": "success",</div>
               <div className="text-zinc-500">"powered_by": "TraceXData Intelligence",</div>
               <div className="text-zinc-500">"query": "9876543210",</div>
               <div className="text-cyan-400">"api_status": &#123;</div>
               <div className="pl-4">"plan": "24 Hours API Access",</div>
               <div className="pl-4">"expires_at": "2024-...",</div>
               <div className="pl-4">"requests_used": 120</div>
               <div className="text-cyan-400">&#125;,</div>
               <div className="text-orange-400">"results": &#123;</div>
               <div className="pl-4 text-orange-300">"Result 1": &#123;</div>
               <div className="pl-8">"name": "GAURAV BENIWAL",</div>
               <div className="pl-8">"father_name": "N/A",</div>
               <div className="pl-8">"mobile": "9876543210",</div>
               <div className="pl-8">"alt_mobile": "N/A",</div>
               <div className="pl-8">"aadhar_number": "N/A",</div>
               <div className="pl-8">"operator": "AIRTEL",</div>
               <div className="pl-8">"state_circle": "HARYANA",</div>
               <div className="pl-8">"address": "HISAR, HARYANA"</div>
               <div className="pl-4 text-orange-300">&#125;</div>
               <div className="text-orange-400">&#125;</div>
            </div>
          </section>

          {/* Error Codes */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold">Status Codes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[
                 { code: '401', label: 'Invalid Key', desc: 'The API key provided is incorrect or inactive.' },
                 { code: '403', label: 'Expired Plan', desc: 'Your API duration has ended or requests are exhausted.' },
                 { code: '404', label: 'No Data', desc: 'The number searched has no intelligence records found.' },
                 { code: '500', label: 'Engine Error', desc: 'Temporary failure in the lookup routing engine.' }
               ].map(err => (
                 <div key={err.code} className="p-4 rounded-xl border border-white/5 bg-white/2">
                   <div className="flex items-center gap-2 mb-1">
                     <span className="text-xs font-bold text-red-500">{err.code}</span>
                     <span className="text-xs font-bold text-white uppercase tracking-widest">{err.label}</span>
                   </div>
                   <p className="text-[10px] text-zinc-500">{err.desc}</p>
                 </div>
               ))}
            </div>
          </section>
        </main>

        <section className="mt-20 pt-16 border-t border-white/5 text-center">
           <h4 className="text-2xl font-bold mb-4">Ready to start?</h4>
           <p className="text-zinc-500 text-sm mb-10">Choose a platform level that matches your growth needs.</p>
           <button 
             onClick={() => navigate('/buy-api')}
             className="px-10 py-4 rounded-2xl bg-cyan-500 text-zinc-950 font-bold hover:bg-cyan-400 transition-all liquid-shadow"
           >
             Purchase API Access
           </button>
        </section>
      </div>

      <footer className="py-12 text-center text-[10px] text-zinc-700 font-bold uppercase tracking-widest">
        TraceXData Development Hub
      </footer>
    </div>
  );
}
