import React from 'react';
import { motion } from 'motion/react';
import { Shield, Code, Cpu, Award, MapPin, ArrowLeft, Terminal, Mail, Network, Server, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';
import HeaderNavbar from '../components/HeaderNavbar';

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
      icon: <Code className="text-sky-600" size={24} />,
      title: 'Senior Developer',
      description: 'Architecting high-concurrency data delivery services, interactive dashboards, and full-stack ecosystems using modern clean-code architecture.'
    },
    {
      icon: <Shield className="text-emerald-600" size={24} />,
      title: 'Cyber Expert',
      description: 'Specializing in vulnerability assessment, API endpoint hardening, digital identity verification, and anti-threat tracing mechanisms.'
    },
    {
      icon: <Cpu className="text-amber-600" size={24} />,
      title: 'Systems Architect',
      description: 'Designing low-latency, resilient data processing pipelines capable of executing high-volume queries with sub-second lookups.'
    }
  ];

  return (
    <div className="relative min-h-screen bg-slate-50/50 text-slate-800 selection:bg-sky-500/20 selection:text-sky-900 pb-20">
      <LiquidBackground />
      <HeaderNavbar title="TRACEXDATA" subtitle="LEAD ARCHITECT" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 md:p-12 overflow-hidden relative rounded-[32px] border border-sky-200 bg-white shadow-sm"
        >
          {/* Header Section */}
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between border-b border-sky-100 pb-10 mb-10">
            <div>
              <div className="flex items-center gap-2 text-sky-700 font-extrabold text-xs uppercase tracking-widest mb-3">
                <Terminal size={14} className="animate-pulse" />
                <span>Executive Bio & Portfolio</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase italic">
                Gaurav Beniwal
              </h1>
              <p className="text-lg text-slate-600 font-semibold mt-2">
                Senior Developer &amp; Elite Cyber Security Specialist
              </p>
              
              <div className="flex items-center gap-2 mt-4 text-xs font-bold text-slate-600 bg-sky-50/80 w-fit px-3 py-1.5 rounded-lg border border-sky-200">
                <MapPin size={12} className="text-rose-500" />
                <span>Panipat, Haryana, India — Known for premium craftsmanship and global textile excellence</span>
              </div>
            </div>

            {/* Profile Symbol */}
            <div className="relative p-6 rounded-3xl bg-sky-50 border border-sky-200 flex items-center justify-center self-start md:self-auto overflow-hidden shadow-sm">
              <Shield size={48} className="text-sky-600 relative z-10" />
            </div>
          </div>

          <div className="space-y-12">
            {/* About Narrative */}
            <section className="space-y-4">
              <h3 className="text-sky-700 font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                <Network size={14} />
                Professional Summary
              </h3>
              <p className="text-slate-700 leading-relaxed font-medium">
                Based out of the historic and globally recognized industrial hub of <span className="text-slate-900 font-black">Panipat, Haryana</span>—a city legendary for its quality, precision, and handloom craftsmanship—<span className="text-slate-900 font-black">Gaurav Beniwal</span> brings the same uncompromising standards of dedication and excellence to the field of Software Engineering and Cybersecurity.
              </p>
              <p className="text-slate-600 leading-relaxed font-medium">
                As a seasoned <strong className="text-slate-900">Senior Developer</strong> and <strong className="text-slate-900">Cyber Expert</strong>, Gaurav specializes in developing state-of-the-art Web Engines, custom distributed system components, and resilient security systems. He has built a reputation for designing secure API architectures, mastering OSINT patterns, and conducting thorough digital analysis systems. His latest showcase engineering achievement is the <strong className="text-slate-900">TRACEXDATA Intelligence Platform</strong>, optimized for fast data parsing and visual feedback.
              </p>
            </section>

            {/* Core Capability Pillars */}
            <section>
              <h3 className="text-sky-700 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                <Award size={14} />
                Specialized Competences
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {highlights.map((item, index) => (
                  <div key={index} className="p-6 rounded-2xl bg-slate-50/80 border border-sky-100 flex flex-col gap-3 hover:border-sky-300 transition-all duration-300 group shadow-sm">
                    <div className="p-3 rounded-xl bg-white border border-sky-200 w-fit group-hover:scale-110 transition-transform duration-300 shadow-sm">
                      {item.icon}
                    </div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tighter text-sm mt-1">{item.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Technical Toolbelt */}
            <section className="p-6 rounded-2xl bg-slate-50/80 border border-sky-100 shadow-sm">
              <h3 className="text-sky-700 font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                <Server size={14} />
                Expert Stack & Technologies
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {skills.map((skill, index) => (
                  <div key={index} className="flex items-center gap-3 text-xs text-slate-700 font-semibold">
                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer Connection & Contact */}
            <section className="pt-8 border-t border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                <Key size={12} className="text-slate-400" />
                <span>Gaurav Beniwal — Panipat, Haryana, India</span>
              </div>
              <a 
                href="https://t.me/Gaurav_beni_0001"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-700 hover:text-sky-900 transition-colors bg-sky-50 hover:bg-sky-100 px-4 py-2 rounded-xl border border-sky-200 shadow-sm"
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
