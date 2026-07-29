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
    <div className="min-h-screen bg-white text-slate-800 selection:bg-sky-500/20 selection:text-sky-900">
      <LiquidBackground />
      
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 p-4 z-[60] flex items-center justify-between bg-white/70 backdrop-blur-md border-b border-sky-100">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-all cursor-pointer shadow-sm">
          <ArrowLeft size={16} className="text-slate-800" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">Home</span>
        </button>
        <button onClick={() => navigate('/buy-api')} className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md cursor-pointer">
          Get API Key
        </button>
      </nav>

      <div className="relative z-10 pt-24 pb-20 px-4 max-w-4xl mx-auto">
        <header className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 text-sky-800 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 shadow-sm">
            <Book size={14} className="text-sky-600" />
            Developer Docs
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-900">API Integration Guide</h1>
          <p className="text-slate-600 text-sm md:text-base max-w-2xl leading-relaxed font-medium">
            Connect your applications to the TraceXData Intelligence Engine. Our REST API delivers structured, white-labeled JSON responses with high-fidelity accuracy and strict response branding.
          </p>
        </header>

        <main className="space-y-16">
          {/* Input Guidelines & Format Restrictions */}
          <section className="space-y-4 p-6 rounded-2xl bg-slate-50/90 border border-sky-200 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-wider text-sky-800">🚨 Strict Formatting Compliance</h3>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              If an incorrect format query parameter is passed through the API, it will return an explicit formatting error block immediately. Please design your requests in compliance with these input requirements:
            </p>
            <ul className="text-xs space-y-2 list-disc list-inside text-slate-700 font-medium">
              <li>
                <strong className="text-slate-900 font-extrabold">Mobile Number Lookup:</strong> You must supply an exact <span className="text-sky-700 font-bold">10-digit numeric mobile number</span> (e.g. <code className="font-mono bg-white border border-sky-200 px-1.5 py-0.5 rounded text-slate-900 font-bold">9879712345</code>). Adding prefixes or alphabetical characters will trigger a format failure.
              </li>
              <li>
                <strong className="text-slate-900 font-extrabold">Telegram Account Lookup:</strong> You must supply a valid <span className="text-sky-700 font-bold">Telegram username</span> containing alphabetic letters or beginning with the <code className="font-mono bg-white border border-sky-200 px-1.5 py-0.5 rounded text-slate-900 font-bold">@</code> symbol (e.g. <code className="font-mono bg-white border border-sky-200 px-1.5 py-0.5 rounded text-slate-900 font-bold">@gaurav_beniwal_0001</code>). Length must be at least 3 characters.
              </li>
              <li>
                <strong className="text-rose-600 font-extrabold">Strict Protection Policy:</strong> Both Number details and Telegram username queries are verified against our safety database first. If registered as protected, the API returns a <span className="text-emerald-700 font-bold">Protected Status</span> shield record immediately before querying any sources.
              </li>
            </ul>
          </section>

          {/* Base URLs */}
          <section className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Globe size={18} className="text-sky-600" />
              Intelligence Endpoints
            </h3>
            
            <div className="space-y-4">
              {/* 1. Unified Lookup Registry */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-sky-100 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-sky-800 uppercase tracking-widest block">1. Unified Registry Endpoint (Universal & Phone)</span>
                  <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs md:text-sm group mt-1">
                  <span className="text-slate-800 font-semibold break-all">GET {baseDomain}/api/lookup?key=YOUR_KEY&number=9879712345</span>
                  <button 
                     onClick={() => copyCode(`${baseDomain}/api/lookup?key=YOUR_KEY&number=9879712345`, 'mobile_api')}
                     className="text-slate-500 hover:text-sky-600 transition-colors ml-2 shrink-0 cursor-pointer"
                  >
                     {copied === 'mobile_api' ? <Check size={16} className="text-sky-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* 2. Telegram Lookup */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-sky-100 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-sky-800 uppercase tracking-widest block">2. Dedicated Telegram Registry Endpoint</span>
                  <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs md:text-sm group mt-1">
                  <span className="text-slate-800 font-semibold break-all">GET {baseDomain}/api/telegram?key=YOUR_KEY&api=gaurav_beniwal_0001</span>
                  <button 
                     onClick={() => copyCode(`${baseDomain}/api/telegram?key=YOUR_KEY&api=gaurav_beniwal_0001`, 'tg_api')}
                     className="text-slate-500 hover:text-sky-600 transition-colors ml-2 shrink-0 cursor-pointer"
                  >
                     {copied === 'tg_api' ? <Check size={16} className="text-sky-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* 3. Identity Card Lookup */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-sky-100 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-sky-800 uppercase tracking-widest block">3. Dedicated Identity & Aadhaar Registry Endpoint</span>
                  <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs md:text-sm group mt-1">
                  <span className="text-slate-800 font-semibold break-all">GET {baseDomain}/api/identity?key=YOUR_KEY&query=381933049732</span>
                  <button 
                     onClick={() => copyCode(`${baseDomain}/api/identity?key=YOUR_KEY&query=381933049732`, 'identity_api')}
                     className="text-slate-500 hover:text-sky-600 transition-colors ml-2 shrink-0 cursor-pointer"
                  >
                     {copied === 'identity_api' ? <Check size={16} className="text-sky-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* 4. Bank IFSC Lookup */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-sky-100 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-sky-800 uppercase tracking-widest block">4. Dedicated BA&NK (IFSC) Registry Endpoint</span>
                  <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs md:text-sm group mt-1">
                  <span className="text-slate-800 font-semibold break-all">GET {baseDomain}/api/bank?key=YOUR_KEY&query=ABCD0001325</span>
                  <button 
                     onClick={() => copyCode(`${baseDomain}/api/bank?key=YOUR_KEY&query=ABCD0001325`, 'bank_api')}
                     className="text-slate-500 hover:text-sky-600 transition-colors ml-2 shrink-0 cursor-pointer"
                  >
                     {copied === 'bank_api' ? <Check size={16} className="text-sky-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* 5. Vehicle Lookup */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-sky-100 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-sky-800 uppercase tracking-widest block">5. Dedicated RTO Vehicle Registry Endpoint</span>
                  <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs md:text-sm group mt-1">
                  <span className="text-slate-800 font-semibold break-all">GET {baseDomain}/api/vehicle?key=YOUR_KEY&query=BR07PB6268</span>
                  <button 
                     onClick={() => copyCode(`${baseDomain}/api/vehicle?key=YOUR_KEY&query=BR07PB6268`, 'vehicle_api')}
                     className="text-slate-500 hover:text-sky-600 transition-colors ml-2 shrink-0 cursor-pointer"
                  >
                     {copied === 'vehicle_api' ? <Check size={16} className="text-sky-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* 6. PN CARD Lookup */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-sky-100 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-sky-800 uppercase tracking-widest block">6. Dedicated PN/PAN Card Registry Endpoint</span>
                  <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs md:text-sm group mt-1">
                  <span className="text-slate-800 font-semibold break-all">GET {baseDomain}/api/pancard?key=YOUR_KEY&query=NTEPK1628C</span>
                  <button 
                     onClick={() => copyCode(`${baseDomain}/api/pancard?key=YOUR_KEY&query=NTEPK1628C`, 'pancard_api')}
                     className="text-slate-500 hover:text-sky-600 transition-colors ml-2 shrink-0 cursor-pointer"
                  >
                     {copied === 'pancard_api' ? <Check size={16} className="text-sky-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </section>
 
          {/* Parameters */}
          <section className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Terminal size={18} className="text-sky-600" />
              Standard Parameters
            </h3>
            <div className="glass-card overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm">
               <table className="w-full text-left">
                  <thead>
                    <tr className="bg-sky-50/80 border-b border-sky-100">
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-700">Param</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-700">Type</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-700">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100">
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-sky-700">key</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-bold">String</td>
                      <td className="px-6 py-4 text-xs text-slate-700 font-medium">Your authorized SaaS API Key</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-sky-700">query</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-bold">String</td>
                      <td className="px-6 py-4 text-xs text-slate-700 font-medium">Universal input parameter. If it contains only numbers (exactly 10 digits), the engine executes a mobile number lookup. If it contains alphabetic characters or starts with @, it executes a Telegram username lookup. Checking for protected values is done first.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-sky-700">numquery</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-bold">String</td>
                      <td className="px-6 py-4 text-xs text-slate-700 font-medium">Stricter 10-Digit Mobile Phone Query. Explicitly restricts lookup to Number database.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-sky-700">tgquery</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-bold">String</td>
                      <td className="px-6 py-4 text-xs text-slate-700 font-medium">Telegram Identifier query parameter (ID or Username). Explicitly restricts lookup to Telegram database.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-sky-700">adhrquery</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-bold">String</td>
                      <td className="px-6 py-4 text-xs text-slate-700 font-medium">12-Digit Identity/Aadhaar query parameter. Stripped of non-numeric characters automatically.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-sky-700">bnkquery</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-bold">String</td>
                      <td className="px-6 py-4 text-xs text-slate-700 font-medium">11-Character alphanumeric IFSC code or Bank query. Automatically converted to uppercase.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-sky-700">vehiclequery</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-bold">String</td>
                      <td className="px-6 py-4 text-xs text-slate-700 font-medium">Any car or automobile license plate number / registration number.</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-sky-700">panquery</td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-bold">String</td>
                      <td className="px-6 py-4 text-xs text-slate-700 font-medium">Any PN or PAN card alphanumeric number query.</td>
                    </tr>
                  </tbody>
               </table>
            </div>
          </section>

          {/* Code Examples */}
          <section className="space-y-8">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Code size={18} className="text-sky-600" />
              Implementation
            </h3>

            <div className="space-y-2">
               <div className="flex items-center justify-between px-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">JavaScript (Fetch)</span>
                 <button onClick={() => copyCode(jsExample, 'js')} className="text-slate-500 hover:text-sky-600 transition-all cursor-pointer">
                   {copied === 'js' ? <Check size={14} className="text-sky-600" /> : <Copy size={14} />}
                 </button>
               </div>
               <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 font-mono text-sm overflow-x-auto text-slate-300 shadow-md">
                 <pre>{jsExample}</pre>
               </div>
            </div>

            <div className="space-y-2">
               <div className="flex items-center justify-between px-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Python (Requests)</span>
                 <button onClick={() => copyCode(pythonExample, 'py')} className="text-slate-500 hover:text-sky-600 transition-all cursor-pointer">
                   {copied === 'py' ? <Check size={14} className="text-sky-600" /> : <Copy size={14} />}
                 </button>
               </div>
               <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 font-mono text-sm overflow-x-auto text-slate-300 shadow-md">
                 <pre>{pythonExample}</pre>
               </div>
            </div>
          </section>

          {/* Response Schema */}
          <section className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Layers size={18} className="text-sky-600" />
              Response Profile
            </h3>
            <p className="text-slate-600 text-xs font-medium">Our response is filtered to remove all provider details, exposing only meaningful owner intelligence.</p>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 font-mono text-[11px] md:text-sm text-slate-300 space-y-1 shadow-md">
               <div className="text-emerald-400">"status": "success",</div>
               <div className="text-slate-400">"powered_by": "TraceXData Intelligence",</div>
               <div className="text-slate-400">"query": "9876543210",</div>
               <div className="text-sky-400">"api_status": &#123;</div>
               <div className="pl-4">"plan": "24 Hours API Access",</div>
               <div className="pl-4">"expires_at": "2024-...",</div>
               <div className="pl-4">"requests_used": 120</div>
               <div className="text-sky-400">&#125;,</div>
               <div className="text-amber-400">"results": &#123;</div>
               <div className="pl-4 text-amber-300">"Result 1": &#123;</div>
               <div className="pl-8">"name": "GAURAV BENIWAL",</div>
               <div className="pl-8">"father_name": "N/A",</div>
               <div className="pl-8">"mobile": "9876543210",</div>
               <div className="pl-8">"alt_mobile": "N/A",</div>
               <div className="pl-8">"aadhar_number": "N/A",</div>
               <div className="pl-8">"operator": "AIRTEL",</div>
               <div className="pl-8">"state_circle": "HARYANA",</div>
               <div className="pl-8">"address": "HISAR, HARYANA"</div>
               <div className="pl-4 text-amber-300">&#125;</div>
               <div className="text-amber-400">&#125;</div>
            </div>
          </section>

          {/* Error Codes */}
          <section className="space-y-4">
            <h3 className="text-xl font-black text-slate-900">Status Codes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[
                 { code: '401', label: 'Invalid Key', desc: 'The API key provided is incorrect or inactive.' },
                 { code: '403', label: 'Expired Plan', desc: 'Your API duration has ended or requests are exhausted.' },
                 { code: '404', label: 'No Data', desc: 'The number searched has no intelligence records found.' },
                 { code: '500', label: 'Engine Error', desc: 'Temporary failure in the lookup routing engine.' }
               ].map(err => (
                 <div key={err.code} className="p-4 rounded-xl border border-sky-100 bg-slate-50/80 shadow-sm">
                   <div className="flex items-center gap-2 mb-1">
                     <span className="text-xs font-black text-rose-600">{err.code}</span>
                     <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{err.label}</span>
                   </div>
                   <p className="text-[10px] text-slate-600 font-medium">{err.desc}</p>
                 </div>
               ))}
            </div>
          </section>
        </main>

        <section className="mt-20 pt-16 border-t border-sky-100 text-center">
           <h4 className="text-2xl font-black mb-4 text-slate-900">Ready to start?</h4>
           <p className="text-slate-600 text-sm mb-10 font-medium">Choose a platform level that matches your growth needs.</p>
           <button 
             onClick={() => navigate('/buy-api')}
             className="px-10 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold transition-all cursor-pointer shadow-md"
           >
             Purchase API Access
           </button>
        </section>
      </div>

      <footer className="py-12 text-center text-[10px] text-slate-500 font-black uppercase tracking-widest bg-sky-50/50 border-t border-sky-100">
        TraceXData Development Hub
      </footer>
    </div>
  );
}
