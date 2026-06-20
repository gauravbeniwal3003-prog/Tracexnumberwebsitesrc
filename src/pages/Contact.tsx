import React from 'react';
import { motion } from 'motion/react';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';

export default function Contact() {
  return (
    <div className="relative min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200">
      <LiquidBackground />
      
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-24">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-cyan-400 transition-colors mb-12 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-mono uppercase tracking-widest">Back to Lookup</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-12 text-center"
        >
          <div className="flex justify-center mb-8">
            <div className="p-4 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <MessageSquare size={48} />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight text-white mb-4">Contact Support</h1>
          <p className="text-zinc-400 text-lg mb-12 max-w-md mx-auto">
            Need assistance with credits, subscription, or business inquiries? Connect with us directly on our official channel.
          </p>

          <div className="space-y-6">
            <a 
              href="https://t.me/Gaurav_beni_0001" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#229ED9] hover:bg-[#229ED9]/90 text-white font-bold transition-all liquid-shadow group"
            >
              <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              <span>Join Official Telegram</span>
            </a>

            <div className="pt-12 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-[10px] mb-2">Technical Issues</h3>
                <p className="text-zinc-500 text-sm">For API errors or account problems, provide your registered email and a screenshot.</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-[10px] mb-2">Billing Queries</h3>
                <p className="text-zinc-500 text-sm">Include your transaction ID for faster resolution of credit or subscription issues.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
