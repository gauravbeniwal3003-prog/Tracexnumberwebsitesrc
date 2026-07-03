import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Zap, CheckCircle2, ShieldAlert, Flame, Lock, UserCheck } from 'lucide-react';
import { useAuth } from '../services/AuthContext.tsx';

interface PromoDealModalProps {
  onClose?: () => void;
}

export default function PromoDealModal({ onClose }: PromoDealModalProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show on primary search pages
    const allowedPaths = ['/', '/telegram', '/identity', '/bank', '/vehicle', '/pancard', '/panfind'];
    const currentPath = window.location.pathname;
    if (!allowedPaths.includes(currentPath)) return;

    // Check session-level limits
    const hasShownThisVisit = sessionStorage.getItem('promo_popup_shown_this_visit');
    if (hasShownThisVisit) return;

    // Check global/local limit of 3 times max
    const totalShows = parseInt(localStorage.getItem('promo_popup_total_shows') || '0', 10);
    if (totalShows >= 3) return;

    // Wait 4 seconds after page load to show the exclusive offer
    const timer = setTimeout(() => {
      setIsOpen(true);
      sessionStorage.setItem('promo_popup_shown_this_visit', 'true');
      localStorage.setItem('promo_popup_total_shows', (totalShows + 1).toString());
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleClaim = () => {
    setIsOpen(false);
    if (onClose) onClose();

    if (!user) {
      // Prompt user to sign in
      alert("Please Sign In or Sign Up first to claim this exclusive personal deal to your account!");
      window.dispatchEvent(new CustomEvent('open-login'));
    } else {
      // Launch Cashfree directly using our custom SPECIAL_DEAL_PLAN ID
      window.dispatchEvent(
        new CustomEvent('launch-payment', {
          detail: { planId: 'u1m_special200' },
        })
      );
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            id="promo-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            className="relative z-10 w-full max-w-[340px] bg-zinc-950/95 border border-amber-500/30 rounded-2xl p-4 shadow-[0_0_40px_rgba(245,158,11,0.15)] overflow-hidden"
            id="promo-modal"
          >
            {/* Glowing amber header border */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

            {/* Close Button Top-Right (Optional auxiliary close) */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white transition-all z-20 cursor-pointer"
              id="promo-close-btn"
            >
              <X size={14} />
            </button>

            {/* Exclusive Personal Badge */}
            <div className="flex justify-center mb-2.5">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-extrabold uppercase tracking-[0.12em] animate-pulse">
                <Sparkles size={9} />
                PERSONAL OFFER ONLY FOR YOU
              </div>
            </div>

            {/* Title & Offer Headings */}
            <div className="text-center mb-3">
              <h2 className="text-lg font-black uppercase tracking-tight text-white mb-0.5 leading-tight">
                Get <span className="text-amber-400">1 Month Unlimited</span>
              </h2>
              <div className="flex items-center justify-center gap-2">
                <span className="text-zinc-500 line-through text-xs font-mono">₹1,199</span>
                <span className="px-1.5 py-0.2 bg-red-500/20 border border-red-500/30 text-red-400 text-[9px] font-black rounded uppercase tracking-wider">
                  Save 83%
                </span>
              </div>
              <div className="text-2xl font-extrabold text-amber-400 font-mono tracking-tighter mt-0.5">
                At Just ₹200
              </div>
            </div>

            {/* Notice regarding Personal Offer Exclusion */}
            <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-center mb-3">
              <p className="text-[10px] text-amber-300/95 font-medium leading-relaxed">
                🎯 <span className="font-bold">Confidential Deal:</span> Custom-allocated personal offer. <span className="underline decoration-amber-400/50">Other users cannot view this pricing</span>.
              </p>
            </div>

            {/* Plan Benefits */}
            <div className="space-y-2 mb-3.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={13} className="text-amber-400 mt-0.5 shrink-0" />
                <span className="text-[11px] text-zinc-300 font-medium leading-normal">
                  <strong className="text-white font-semibold">Unlimited Lookups</strong> for 30 Days (Phone, Identity, etc.)
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Zap size={13} className="text-amber-400 mt-0.5 shrink-0" />
                <span className="text-[11px] text-zinc-300 font-medium leading-normal">
                  No query limitations, trace instantly at ultra-high priority
                </span>
              </div>
              
              {/* EXCLUSION NOTE */}
              <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                <ShieldAlert size={12} className="text-red-400 mt-0.5 shrink-0 animate-pulse" />
                <span className="text-[9px] text-zinc-400 leading-normal font-medium">
                  <strong className="text-red-400 block mb-0.5 font-bold uppercase tracking-wider">Aadhaar to PAN Lookup Not Included</strong>
                  Requires manual queries to government portals, strictly excluded from unlimited packages.
                </span>
              </div>
            </div>

            {/* Interactive Buttons */}
            <div className="space-y-2.5">
              <div className="flex gap-2">
                {/* Cross Button alongside Claim Offer button */}
                <button
                  onClick={handleClose}
                  className="px-3.5 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all flex items-center justify-center active:scale-[0.98] cursor-pointer"
                  id="promo-decline-btn"
                  title="Close & Decline"
                >
                  <X size={15} />
                </button>
                {/* Main Claim Button */}
                <button
                  onClick={handleClaim}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black tracking-widest uppercase text-[9.5px] transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
                  id="promo-buy-btn"
                >
                  <Flame size={11} className="animate-pulse" />
                  Claim Deal & Buy
                </button>
              </div>

              <div className="flex items-center justify-center gap-3.5 text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Lock size={8} />
                  Secure checkout
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <UserCheck size={8} />
                  Instant Activation
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
