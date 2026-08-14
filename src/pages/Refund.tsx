import React from 'react';
import { motion } from 'motion/react';
import { Receipt, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';
import HeaderNavbar from '../components/HeaderNavbar';

export default function Refund() {
  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      <LiquidBackground />
      <HeaderNavbar title="TRACEXDATA" subtitle="REFUND POLICY" />
      
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-12 rounded-[32px] border border-sky-200 bg-white shadow-sm"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700">
              <Receipt size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Refund Policy</h1>
          </div>

          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 mb-8 border-l-4 border-l-amber-500 shadow-sm">
            <div className="flex items-start gap-4">
              <AlertTriangle className="text-amber-600 shrink-0 mt-1" size={20} />
              <p className="text-sm text-amber-900 font-semibold leading-relaxed">
                Important: By purchasing credits or a subscription on TRACEXDATA, you acknowledge that you are gaining immediate access to premium features and digital intel feeds.
              </p>
            </div>
          </div>

          <div className="space-y-6 text-slate-600 leading-relaxed font-medium">
            <section>
              <h2 className="text-xl font-black text-slate-900 mb-2">Strict No-Refund Policy</h2>
              <p>
                Due to the digital nature of our services and the immediate availability of intelligence credits upon purchase, <strong className="text-slate-900 font-black">we maintain a strict NO REFUND policy under any circumstances.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-2">Technical Issues</h2>
              <p>
                If your search results fail to load due to a system error, your credits are not deducted. If a deduction occurs without data delivery, please contact our support channel via Telegram within 24 hours with your transaction proof for manual credit reconciliation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-2">Subscription Cancellations</h2>
              <p>
                You may cancel your subscription renewal at any time. However, partial refunds for the remaining period of an active subscription will not be issued. You will continue to have access until the end of your billing cycle.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-2">Abuse Penalties</h2>
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
