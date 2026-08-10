import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Gift, Copy, Check, Users, DollarSign, FolderOpen, Receipt } from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { getApiBaseUrl } from '../services/api';
import HeaderNavbar from '../components/HeaderNavbar';

export default function ReferralPage() {
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const baseDomain = getApiBaseUrl().replace(/\/$/, "");

  // Generate or obtain referral code
  const referralCode = (profile as any)?.referral_code || `tracex-${user?.id?.substring(0, 5) || 'a3e7a'}`;
  const referralLink = `${baseDomain}/register?ref=${referralCode}`;

  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [totalReferrals, setTotalReferrals] = useState<number>(0);
  const [myReferrals, setMyReferrals] = useState<any[]>([]);
  const [referralEarningsList, setReferralEarningsList] = useState<any[]>([]);

  useEffect(() => {
    async function loadReferralStats() {
      if (!user) return;
      try {
        const session = await supabase.auth.getSession();
        const token = session?.data?.session?.access_token || "";
        const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';

        const res = await fetch(`${baseDomain}/api/referral${emailParam}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setTotalEarnings(data.totalEarnings || 0);
          setTotalReferrals(data.totalReferrals || 0);
          setMyReferrals(data.myReferrals || []);
          setReferralEarningsList(data.referralEarnings || []);
        }
      } catch (err) {
        console.error("Error loading referral stats:", err);
      }
    }
    loadReferralStats();
  }, [user, baseDomain]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      {/* Universal Header Navbar */}
      <HeaderNavbar title="REFER & EARN" subtitle="COMMISSION PORTAL" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-6 space-y-6">
        
        {/* TOP CARDS GRID (Matching Screenshot 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT BLUE HERO CARD (8 Cols) */}
          <div className="lg:col-span-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-2xl p-6 sm:p-8 shadow-lg flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="space-y-2 relative z-10">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
                Invite Friends & Earn 5%!
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
                Get an instant 5% commission in your wallet every time your referred friend makes a recharge on the portal.
              </p>
            </div>

            {/* REFERRAL LINK BOX */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 sm:p-3 flex items-center justify-between gap-3 relative z-10">
              <span className="text-xs font-mono font-bold text-white truncate pl-2 select-all flex-1">
                {referralLink}
              </span>
              <button
                onClick={handleCopyLink}
                className="py-2.5 px-5 bg-white text-blue-700 hover:bg-blue-50 font-black text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>

          {/* RIGHT STATS CARD (4 Cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center space-y-6 text-center">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                TOTAL EARNINGS
              </span>
              <h2 className="text-3xl sm:text-4xl font-mono font-black text-emerald-600">
                ₹{totalEarnings.toFixed(2)}
              </h2>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Total Referrals</span>
              <span className="font-mono text-slate-900 font-extrabold text-sm">{totalReferrals}</span>
            </div>
          </div>
        </div>

        {/* BOTTOM TABLES GRID (Matching Screenshot 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT TABLE: MY REFERRALS */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-black text-slate-900 tracking-wide uppercase">
                My Referrals
              </h3>
            </div>

            {myReferrals.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-500 font-bold">
                  You haven't referred anyone yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-3">USER DETAILS</th>
                      <th className="py-2.5 px-3">JOIN DATE</th>
                      <th className="py-2.5 px-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {myReferrals.map((ref, idx) => (
                      <tr key={idx}>
                        <td className="py-3 px-3 font-bold">{ref.email}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{ref.joinDate}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {ref.status || 'ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT TABLE: REFERRAL EARNINGS */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Gift className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900 tracking-wide uppercase">
                Referral Earnings
              </h3>
            </div>

            {referralEarningsList.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Receipt className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-500 font-bold">
                  No referral earnings yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-3">DATE</th>
                      <th className="py-2.5 px-3">DESCRIPTION</th>
                      <th className="py-2.5 px-3">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {referralEarningsList.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{item.date}</td>
                        <td className="py-3 px-3 font-bold">{item.description}</td>
                        <td className="py-3 px-3 font-mono text-emerald-600 font-extrabold">+₹{item.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
