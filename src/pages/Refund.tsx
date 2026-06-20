import React from 'react';
import { motion } from 'motion/react';
import { Receipt, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';

export default function Refund() {
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
          className="glass-card p-8 md:p-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Receipt size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Refund Policy</h1>
          </div>

          <div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/10 mb-8 border-l-4 border-l-orange-500">
            <div className="flex items-start gap-4">
              <AlertTriangle className="text-orange-400 shrink-0 mt-1" size={20} />
              <p className="text-sm text-orange-200/80 font-medium leading-relaxed">
                Important: By purchasing credits or a subscription on TRACEXDATA, you acknowledge that you are gaining immediate access to premium features and digital intel feeds.
              </p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-zinc-400 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-zinc-200 mb-2 underline decoration-orange-500/20">Strict No-Refund Policy</h2>
              <p>
                Due to the digital nature of our services and the immediate availability of intelligence credits upon purchase, <strong>we maintain a strict NO REFUND policy under any circumstances.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-200 mb-2">Technical Issues</h2>
              <p>
                If your search results fail to load due to a system error, your credits are not deducted. If a deduction occurs without data delivery, please contact our support channel via Telegram within 24 hours with your transaction proof for manual credit reconciliation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-200 mb-2">Subscription Cancellations</h2>
              <p>
                You may cancel your subscription renewal at any time. However, partial refunds for the remaining period of an active subscription will not be issued. You will continue to have access until the end of your billing cycle.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-200 mb-2">Abuse Penalties</h2>
              <p>
                Accounts flagged for scraping, automated searching, or bot behavior will be terminated without a refund. Credits remaining in banned accounts are permanently forfeited.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
