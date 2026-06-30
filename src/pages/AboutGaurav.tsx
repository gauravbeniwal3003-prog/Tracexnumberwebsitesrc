import React from 'react';
import { motion } from 'motion/react';
import { Shield, Code, Cpu, Award, MapPin, ArrowLeft, Terminal, Mail, Network, Server, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';

export default function AboutGaurav() {
  const skills = [
    'Full Stack Engineering (React, Node.js, Python)',
    'Cyber Security & Threat Intelligence',
    'OSINT & Digital Forensics',
    'High-Density API Optimization',
    'Distributed Databases & Cloud Infrastructure',
    'Reverse Engineering & Penetration Testing'
  ];

  const highlights = [
    {
      icon: <Code className="text-cyan-400" size={24} />,
      title: 'Senior Developer',
      description: 'Architecting high-concurrency data delivery services, interactive dashboards, and full-stack ecosystems using modern clean-code architecture.'
    },
    {
      icon: <Shield className="text-emerald-400" size={24} />,
      title: 'Cyber Expert',
      description: 'Specializing in vulnerability assessment, API endpoint hardening, digital identity verification, and anti-threat tracing mechanisms.'
    },
    {
      icon: <Cpu className="text-amber-400" size={24} />,
      title: 'Systems Architect',
      description: 'Designing low-latency, resilient data processing pipelines capable of executing high-volume queries with sub-second lookups.'
    }
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
          className="glass-card p-8 md:p-12 overflow-hidden relative"
        >
          {/* Subtle Ambient Decorative Gradients */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

          {/* Header Section */}
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between border-b border-white/5 pb-10 mb-10">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest mb-3">
                <Terminal size={14} className="animate-pulse" />
                <span>Executive Bio & Portfolio</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white uppercase italic">
                Gaurav Beniwal
              </h1>
              <p className="text-lg text-zinc-400 font-medium mt-2">
                Senior Developer &amp; Elite Cyber Security Specialist
              </p>
              
              <div className="flex items-center gap-2 mt-4 text-xs font-mono text-zinc-500 bg-white/5 w-fit px-3 py-1.5 rounded-lg border border-white/5">
                <MapPin size={12} className="text-red-400" />
                <span>Panipat, Haryana, India — Known for premium craftsmanship and global textile excellence</span>
              </div>
            </div>

            {/* Profile Symbol */}
            <div className="relative p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center self-start md:self-auto overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 opacity-30" />
              <Shield size={48} className="text-cyan-400/90 relative z-10" />
            </div>
          </div>

          <div className="space-y-12">
            {/* About Narrative */}
            <section className="prose prose-invert max-w-none">
              <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                <Network size={14} />
                Professional Summary
              </h3>
              <p className="text-zinc-300 leading-relaxed">
                Based out of the historic and globally recognized industrial hub of <span className="text-white font-semibold">Panipat, Haryana</span>—a city legendary for its quality, precision, and handloom craftsmanship—<span className="text-white font-semibold">Gaurav Beniwal</span> brings the same uncompromising standards of dedication and excellence to the field of Software Engineering and Cybersecurity.
              </p>
              <p className="text-zinc-400 leading-relaxed mt-4">
                As a seasoned <strong>Senior Developer</strong> and <strong>Cyber Expert</strong>, Gaurav specializes in developing state-of-the-art Web Engines, custom distributed system components, and resilient security systems. He has built a reputation for designing secure API architectures, mastering OSINT patterns, and conducting thorough digital analysis systems. His latest showcase engineering achievement is the **TRACEXDATA Intelligence Platform**, optimized for fast data parsing and visual feedback.
              </p>
            </section>

            {/* Core Capability Pillars */}
            <section>
              <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                <Award size={14} />
                Specialized Competences
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {highlights.map((item, index) => (
                  <div key={index} className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3 hover:border-cyan-500/30 transition-all duration-300 group">
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 w-fit group-hover:scale-110 transition-transform duration-300">
                      {item.icon}
                    </div>
                    <h4 className="font-bold text-white uppercase tracking-tighter text-sm mt-1">{item.title}</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Technical Toolbelt */}
            <section className="p-6 rounded-2xl bg-zinc-900/60 border border-white/5">
              <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                <Server size={14} />
                Expert Stack & Technologies
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {skills.map((skill, index) => (
                  <div key={index} className="flex items-center gap-3 text-xs text-zinc-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/80 animate-pulse" />
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer Connection & Contact */}
            <section className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Key size={12} className="text-zinc-600" />
                <span>Gaurav Beniwal — Panipat, Haryana, India</span>
              </div>
              <a 
                href="https://t.me/Gaurav_beni_0001"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/5 px-4 py-2 rounded-xl border border-cyan-500/20 hover:border-cyan-500/40"
              >
                <Mail size={12} />
                Connect on Telegram
              </a>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
