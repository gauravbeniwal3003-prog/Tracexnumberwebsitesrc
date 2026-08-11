import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wallet, History, ArrowDownLeft, ArrowUpRight, Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { getApiBaseUrl } from '../services/api';
import HeaderNavbar from '../components/HeaderNavbar';
import LiquidBackground from '../components/LiquidBackground';

interface TransactionItem {
  id: number | string;
  service: string;
  type: 'Debit' | 'Credit';
  amount: number;
  balanceAfter: number;
  date: string;
}

export default function WalletHistory() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const baseDomain = getApiBaseUrl().replace(/\/$/, "");

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const balance = profile?.credits ?? 1470;

  useEffect(() => {
    async function loadWalletTransactions() {
      setIsLoading(true);
      try {
        const session = await supabase.auth.getSession();
        const token = session?.data?.session?.access_token || "";
        const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';

        const res = await fetch(`${baseDomain}/api/wallet/history${emailParam}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setTransactions(data);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Error loading wallet transactions:", err);
      }

      setTransactions([]);
      setIsLoading(false);
    }

    loadWalletTransactions();
  }, [user, profile, balance, baseDomain]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      <LiquidBackground />
      {/* Universal Header Navbar */}
      <HeaderNavbar title="DIGI SEVA WALLET" subtitle="WALLET HISTORY" />

      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-6 space-y-6">
        
        {/* GREEN WALLET BALANCE BANNER CARD (Matching Screenshot 4) */}
        <div className="bg-[#00a884] text-white rounded-2xl p-6 sm:p-8 shadow-md flex items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-1 relative z-10">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-emerald-100 block">
              Current Balance
            </span>
            <h1 className="text-3xl sm:text-5xl font-mono font-black tracking-tight">
              ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h1>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={() => navigate('/pricing')}
              className="bg-white text-[#00a884] hover:bg-emerald-50 font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Money</span>
            </button>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
              <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
          </div>
        </div>

        {/* TRANSACTION HISTORY TABLE CARD (Matching Screenshot 4) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <History className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-black text-slate-900 tracking-wide uppercase">
              Transaction History
            </h2>
          </div>

          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mx-auto">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">No Transaction Records</h3>
                <p className="text-xs text-slate-500 mt-1">Wallet recharge and usage logs will appear here once you perform transactions.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">SERVICE</th>
                    <th className="py-3 px-4">TYPE</th>
                    <th className="py-3 px-4">AMOUNT</th>
                    <th className="py-3 px-4">BALANCE AFTER</th>
                    <th className="py-3 px-4">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs text-slate-700">
                  {transactions.map((tx, idx) => (
                    <tr key={tx.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {tx.service}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            tx.type === "Debit"
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          - {tx.type}
                        </span>
                      </td>
                      <td
                        className={`py-3.5 px-4 font-mono font-extrabold text-sm ${
                          tx.type === "Debit" ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {tx.type === "Debit" ? `-₹${tx.amount.toFixed(2)}` : `+₹${tx.amount.toFixed(2)}`}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        ₹{tx.balanceAfter.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {tx.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
