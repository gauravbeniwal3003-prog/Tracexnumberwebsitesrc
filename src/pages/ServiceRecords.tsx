import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ListFilter, Eye, Check, Clock, X, Terminal, Search, RefreshCw, ArrowLeft, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import {  getApiBaseUrl, getAbsoluteBaseUrl, getAuthToken  } from '../services/api';
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
  status: 'SUCCESS' | 'REFUNDED' | 'FAILED' | 'PROCESSING';
  payload: any;
  createdAtTs?: number;
}

export default function ServiceRecords() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const baseDomain = getApiBaseUrl().replace(/\/$/, "");

  const [records, setRecords] = useState<ServiceRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecordItem | null>(null);
  const isPollingRef = useRef(false);

  const clientName = (profile as any)?.name || user?.email?.split('@')[0] || "User";

  const loadRecords = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    const combinedList: ServiceRecordItem[] = [];
    const seenMap = new Set<string>();

    // 1. Fetch from server API
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams();
      if (user?.email) params.append('email', user.email);
      if (user?.id) params.append('user_id', user.id);
      if ((user as any)?.phone) params.append('phone', (user as any).phone);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${baseDomain}/api/service-records${queryString}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach(item => {
            const key = `${item.serviceName}_${item.referenceCode}_${item.dateTime}`;
            if (!seenMap.has(key)) {
              seenMap.add(key);
              const statusStr = String(item.status || "SUCCESS").toUpperCase();
              combinedList.push({
                ...item,
                status: statusStr.includes("REFUND") ? 'REFUNDED' : (statusStr.includes("PROCESSING") ? 'PROCESSING' : (statusStr === 'SUCCESS' ? 'SUCCESS' : 'FAILED'))
              });
            }
          });
        }
      }
    } catch (err) {
      console.error("Error loading remote service records:", err);
    }

    // 2. Merge local storage backup logs (tracex_user_history_${user?.id})
    try {
      const localKey = user?.id ? `tracex_user_history_${user.id}` : 'tracex_user_history_guest';
      const localData = localStorage.getItem(localKey);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any, idx: number) => {
            const dateStr = item.dateTime || (item.created_at ? new Date(item.created_at).toISOString().replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19));
            const key = `${item.serviceName || item.service}_${item.referenceCode || item.query}_${dateStr}`;
            if (!seenMap.has(key)) {
              seenMap.add(key);
              const statusStr = String(item.status || "SUCCESS").toUpperCase();
              combinedList.push({
                id: item.id || `loc_${idx + 1}`,
                logId: item.logId || `#${900 - idx}`,
                dateTime: dateStr,
                client: item.client || clientName,
                serviceName: (item.serviceName || item.service || "Lookup").toUpperCase(),
                referenceCode: item.referenceCode || item.query || "N/A",
                status: statusStr.includes("REFUND") ? 'REFUNDED' : (statusStr === "SUCCESS" ? 'SUCCESS' : 'FAILED'),
                payload: item.payload || item.results || { status: "SUCCESS" },
                createdAtTs: item.createdAtTs || (item.created_at ? new Date(item.created_at).getTime() : Date.now())
              });
            }
          });
        }
      }
    } catch (localErr) {
      console.warn("Could not read local backup history:", localErr);
    }

    combinedList.sort((a, b) => (b.createdAtTs || 0) - (a.createdAtTs || 0));
    setRecords(combinedList);
    if (showLoading) setIsLoading(false);
  };

  useEffect(() => {
    loadRecords(true);

    // Set up Real-Time polling every 5 seconds so any search made in the dashboard or via API appears instantly
    const interval = setInterval(() => {
      if (!isPollingRef.current) {
        isPollingRef.current = true;
        loadRecords(false).finally(() => {
          isPollingRef.current = false;
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.id, user?.email, baseDomain]);

  const filteredRecords = records.filter(r => 
    !searchQuery || 
    r.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.referenceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      <LiquidBackground />
      {/* Universal Header Navbar */}
      <HeaderNavbar title="TRACEXDATA" subtitle="REAL-TIME HISTORY" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-6 space-y-6">
        {/* HEADER TITLE CARD */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                Service Records & Search History
              </h1>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Real-time synchronization for manual dashboard searches and B2B API inquiries.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter search history..."
                className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              onClick={() => loadRecords(true)}
              disabled={isLoading}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-xl text-blue-600 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* RECORDS TABLE CARD */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold">Fetching real-time search records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
                <ListFilter className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">No Search Records Found</h3>
                <p className="text-xs text-slate-500 mt-1">Execute any search query or API call to see your history logged here in real time.</p>
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
                      <td className="py-4 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{rec.dateTime}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-extrabold text-slate-900">
                        {rec.client}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 block">{rec.serviceName}</span>
                        <span className="text-[10px] font-mono text-blue-600 font-semibold">
                          Query: {rec.referenceCode}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {rec.status === 'REFUNDED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                            <RotateCcw className="w-3 h-3 text-amber-600" />
                            <span>REFUNDED</span>
                          </span>
                        ) : rec.status === 'PROCESSING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                            <span>PROCESSING</span>
                          </span>
                        ) : rec.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>SUCCESS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                            <X className="w-3 h-3 text-rose-600" />
                            <span>FAILED</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-extrabold text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View JSON</span>
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

      {/* VIEW RESULT MODAL (JSON Printed Format) */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="text-sm font-black text-slate-100 uppercase">
                      API Response JSON ({selectedRecord.logId})
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      {selectedRecord.serviceName} — Query: {selectedRecord.referenceCode}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <FormattedResponseCard data={selectedRecord.payload} serviceType={selectedRecord.serviceName} />

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="py-2 px-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-extrabold text-xs uppercase rounded-xl cursor-pointer"
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
