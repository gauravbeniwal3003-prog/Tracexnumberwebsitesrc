import React from 'react';
import { motion } from 'motion/react';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';
import HeaderNavbar from '../components/HeaderNavbar';

export default function Contact() {
  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      <LiquidBackground />
      <HeaderNavbar title="TRACEXDATA" subtitle="SUPPORT & CONTACT" />
      
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-slate-600 hover:text-sky-600 transition-colors mb-12 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-extrabold uppercase tracking-widest">Back to Home</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-12 text-center rounded-[32px] border border-sky-200 bg-white shadow-sm"
        >
          <div className="flex justify-center mb-8">
            <div className="p-4 rounded-3xl bg-sky-100 border border-sky-200 text-sky-600">
              <MessageSquare size={48} />
            </div>
          </div>
          
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-4">Contact Support</h1>
          <p className="text-slate-600 text-lg mb-12 max-w-md mx-auto font-medium">
            Need assistance with credits, subscription, or business inquiries? Connect with us directly on our official channel.
          </p>

          <div className="space-y-6">
            <a 
              href="https://t.me/Gaurav_beni_0001" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#229ED9] hover:bg-[#229ED9]/90 text-white font-extrabold transition-all group shadow-md"
            >
              <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              <span>Join Official Telegram</span>
            </a>

            <div className="pt-12 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="p-6 rounded-2xl bg-slate-50/80 border border-sky-100 shadow-sm">
                <h3 className="text-sky-700 font-black uppercase tracking-widest text-[10px] mb-2">Technical Issues</h3>
                <p className="text-slate-600 text-sm font-medium">For API errors or account problems, provide your registered email and a screenshot.</p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50/80 border border-sky-100 shadow-sm">
                <h3 className="text-sky-700 font-black uppercase tracking-widest text-[10px] mb-2">Billing Queries</h3>
                <p className="text-slate-600 text-sm font-medium">Include your transaction ID for faster resolution of credit or subscription issues.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
