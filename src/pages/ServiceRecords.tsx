import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ListFilter, Eye, Check, Clock, X, Terminal, FileText, Search, RefreshCw } from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { getApiBaseUrl } from '../services/api';
import HeaderNavbar from '../components/HeaderNavbar';
import FormattedResponseCard from '../components/FormattedResponseCard';
import LiquidBackground from '../components/LiquidBackground';

interface ServiceRecordItem {
  id: string;
  logId: string;
  dateTime: string;
  client: string;
  serviceName: string;
  referenceCode: string;
  status: 'SUCCESS' | 'FAILED';
  payload: any;
}

export default function ServiceRecords() {
  const { user, profile } = useAuth();
  const baseDomain = getApiBaseUrl().replace(/\/$/, "");

  const [records, setRecords] = useState<ServiceRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecordItem | null>(null);

  const clientName = (profile as any)?.name || user?.email?.split('@')[0] || "User";

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token || "";
      const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
      
      const res = await fetch(`${baseDomain}/api/service-records${emailParam}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRecords(data);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("Error loading service records:", err);
    }

    setRecords([]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRecords();
  }, [user, profile, baseDomain]);

  const filteredRecords = records.filter(r => 
    !searchQuery || 
    r.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.referenceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      <LiquidBackground />
      {/* Universal Header Navbar */}
      <HeaderNavbar title="DIGI SEVA RECORDS" subtitle="SERVICE LOGS" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-6 space-y-6">
        
        {/* HEADER TITLE CARD (Matching Screenshot 5) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-indigo-600" />
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                Service Records & Search History
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Real-time log of portal searches and B2B API inquiries executed under your account.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter history..."
                className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              onClick={loadRecords}
              disabled={isLoading}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-xl text-indigo-600 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* RECORDS TABLE CARD (Matching Screenshot 5) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold">Fetching execution logs...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                <ListFilter className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">No Service Records Found</h3>
                <p className="text-xs text-slate-500 mt-1">Execute an API query or search to see your service logs history here.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="py-3 px-4">LOG ID</th>
                    <th className="py-3 px-4">DATE & TIME</th>
                    <th className="py-3 px-4">CLIENT</th>
                    <th className="py-3 px-4">SERVICE DETAILS</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs text-slate-700">
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-slate-500 text-[11px]">
                        {rec.logId}
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{rec.dateTime}</span>
                      </td>
                      <td className="py-4 px-4 font-extrabold text-slate-900">
                        {rec.client}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 block">{rec.serviceName}</span>
                        <span className="text-[10px] font-mono text-blue-600 font-semibold">
                          Ref: {rec.referenceCode}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{rec.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Result</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* VIEW RESULT MODAL */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase">
                      Execution Result ({selectedRecord.logId})
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">
                      {selectedRecord.serviceName} — Ref: {selectedRecord.referenceCode}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <FormattedResponseCard data={selectedRecord.payload} />

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="py-2 px-5 bg-slate-900 text-white font-extrabold text-xs uppercase rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
