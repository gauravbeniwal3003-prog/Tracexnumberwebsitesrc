import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ArrowLeft, Globe, Zap, Shield, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';

export default function SEOPage() {
  const keywords = [
    'VIP Number Lookup', 'Mobile OSINT', 'Data Intelligence 2026', 'Tracing Mobile Numbers', 
    'Owner details India', 'Aadhar verification API', 'Gaurav Beniwal Projects', 'TRACEXDATA VIP', 
    'Cyber Intelligence Tools', 'Number Tracker Online', 'Address Finder Mobile', 'Father Name Scanning',
    'Alternate Number Search', 'SIM Owner Details', 'Best Number Lookup 2026', 'Viral Tech Tools',
    'AI Powered Search', 'Liquid Glass UI', 'Privacy Protection Tool', 'Digital Footprint Scanning'
  ];

  const tags = [
    '#CyberSecurity', '#OSINT', '#NumberLookup', '#IndianTech', '#GauravBeniwal', '#DataScience',
    '#ViralTool', '#IntelligenceEngine', '#Tech2026', '#PrivacyFirst', '#DigitalIndia', '#MobileTrace'
  ];

  return (
    <div className="relative min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200">
      <LiquidBackground />
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-24">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-cyan-400 transition-colors mb-12 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-mono uppercase tracking-widest">Back to Lookup</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 md:p-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <TrendingUp size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white uppercase italic">TRACEXDATA Intelligence Trends</h1>
          </div>

          <div className="space-y-12">
            {/* SEO Content Paragraphs */}
            <section className="prose prose-invert max-w-none">
              <p className="text-lg text-zinc-300 leading-relaxed font-medium">
                Welcome to the official TRACEXDATA Intelligence portal, the world's most advanced 
                <span className="text-cyan-400"> VIP Number Details Lookup</span> engine. In 2026, data precision is everything. 
                Our platform leverages liquid glass architectural patterns and distributed intelligence feeds 
                to provide you with the most accurate mobile owner details, including father's name, address, 
                alternate mobile numbers, and state circles across all major Indian operators like JIO, Airtel, and VI.
              </p>
              
              <p className="text-zinc-400 leading-relaxed mt-4">
                Whether you are conducting independent research or verifying digital identities, 
                TRACEXDATA by <span className="text-white">Gaurav Beniwal</span> offers a premium, 
                lightning-fast experience that bypasses traditional API rate limits for seamless tracing. 
                Our community-focused model ensures that you get high-density results in under 2 seconds, 
                making us the <span className="italic">trending choice</span> for digital investigators and 
                tech enthusiasts globally.
              </p>
            </section>

            {/* Trending Tags Grid */}
            <section>
              <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                <Zap size={14} />
                Trending Intelligence Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-xs hover:border-cyan-500/50 hover:text-cyan-400 transition-all cursor-default">
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            {/* Key Optimization Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
                <Globe className="text-cyan-400" size={24} />
                <h4 className="font-bold text-white uppercase tracking-tighter">Global Reach</h4>
                <p className="text-xs text-zinc-500">Scanning multi-node intelligence servers for comprehensive database access.</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
                <Shield className="text-emerald-400" size={24} />
                <h4 className="font-bold text-white uppercase tracking-tighter">Secure Trace</h4>
                <p className="text-xs text-zinc-500">End-to-end encrypted queries ensuring search anonymity and protocol safety.</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
                <Search className="text-cyan-400" size={24} />
                <h4 className="font-bold text-white uppercase tracking-tighter">High Density</h4>
                <p className="text-xs text-zinc-500">Retrieving name, father's info, and location in a single consolidated report.</p>
              </div>
            </section>

            {/* Hidden/Long Keyword list for SEO crawlers */}
            <section className="pt-8 border-t border-white/5">
              <h3 className="text-zinc-600 font-mono text-[10px] uppercase tracking-[0.3em] mb-4">Crawler Keywords Index</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-2 opacity-30 text-[10px] font-mono text-zinc-400 italic">
                {keywords.map(kw => <span key={kw}>{kw}</span>)}
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
