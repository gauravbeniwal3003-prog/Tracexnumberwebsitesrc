import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, Key, Settings, Activity, ShieldAlert, 
  Search, RefreshCcw, Save, Trash2, 
  TrendingUp, DollarSign, Clock, Hash,
  ChevronRight, AlertTriangle, ShieldCheck,
  PlusCircle, Edit2, X, Calendar, UserPlus, CreditCard
} from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { getApiBaseUrl } from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';
import { AnimatePresence } from 'motion/react';

// IMPORTANT: Replace with real admin emails or use DB property
const ADMIN_EMAILS = [
  'yashwinderbeniwaldm@gmail.com', 
  'gaurav_beniwal_0001@example.com',
  'gauravbeniwal30003@gmail.com'
];

export default function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'stats') as 'stats' | 'keys' | 'settings' | 'logs' | 'users' | 'transactions' | 'history';
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [isServiceRoleActive, setIsServiceRoleActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Stats State
  const [keys, setKeys] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ real_api_url: '' });

  // Users State
  const [profiles, setProfiles] = useState<any[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Earnings & Live Transactions State
  const [earnings, setEarnings] = useState<any>({
    today: 0,
    yesterday: 0,
    week: 0,
    total: 0
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  
  const [newUserProfileData, setNewUserProfileData] = useState({
    email: '',
    full_name: '',
    credits: 10,
    unlimited_expiry: ''
  });

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<any>(null);
  const [newKeyData, setNewKeyData] = useState({
    user_email: '',
    plan_name: 'Unified Pro API (15 Days)',
    request_limit: null as number | null,
    days_expiry: 15,
    custom_key: ''
  });

  useEffect(() => {
    // Wait for AuthContext to finish loading the session
    console.log('Admin Access Check:', { authLoading, hasUser: !!user, email: user?.email });
    
    if (authLoading) return;

    if (!user) {
      console.log('No user found, redirecting...');
      // Small timeout to allow session to settle if it's flickering
      const timeout = setTimeout(() => {
        if (!user) navigate('/');
      }, 500);
      return () => clearTimeout(timeout);
    }
    
    const checkAdmin = async () => {
      // Normalize email check to lowercase
      const userEmail = (user?.email || '').toLowerCase();
      console.log('Checking Admin for:', userEmail);
      
      const isAuthorized = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);
      
      if (isAuthorized) {
        console.log('Admin access granted');
        setIsAdmin(true);
        await fetchData();
      } else {
        console.log('Admin access denied - email not in list');
        setIsAdmin(false);
      }
      setLoading(false);
    };

    checkAdmin();
  }, [user, authLoading]);

  // Real-time subscription
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase.channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'api_keys' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'api_logs' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (token) {
        // 1. Fetch Comprehensive Admin System Stats, Keys, Logs, Settings via Secure Proxy
        try {
          const sysResponse = await fetch(`${getApiBaseUrl()}/api/admin/system`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const sysJson = await sysResponse.json();
          if (sysResponse.ok && sysJson.status === 'success') {
            const sysData = sysJson.data;
            setIsServiceRoleActive(sysData.isServiceRoleActive);
            setStats(sysData.stats || {
              totalKeys: 0,
              totalRequests: 0,
              activeKeys: 0,
              revenue: 0,
              totalUsers: 0
            });
            setKeys(sysData.apiKeys || []);
            setLogs(sysData.apiLogs || []);
            if (sysData.settings) {
              setSettings(sysData.settings);
            }
          } else {
            console.error("Failed to load admin system data:", sysJson.error);
          }
        } catch (sysErr) {
          console.error("Error fetching admin system data:", sysErr);
        }

        // 2. Fetch Registered User Profiles via Secure Admin Service Proxy
        try {
          const response = await fetch(`${getApiBaseUrl()}/api/admin/profiles`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const resJson = await response.json();
          if (response.ok && resJson.status === 'success') {
            setProfiles(resJson.data || []);
          } else {
            console.error("Failed to load profiles:", resJson.error);
          }
        } catch (profileErr) {
          console.error("Error fetching profiles:", profileErr);
        }

        // 3. Fetch earnings data
        try {
          const earningsResponse = await fetch(`${getApiBaseUrl()}/api/admin/earnings`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const earningsJson = await earningsResponse.json();
          if (earningsResponse.ok && earningsJson.status === 'success') {
            setEarnings(earningsJson.summary || { today: 0, yesterday: 0, week: 0, total: 0 });
            setTransactions(earningsJson.transactions || []);
          } else {
            console.error("Failed to load earnings stats:", earningsJson.error);
          }
        } catch (earningsErr) {
          console.error("Error fetching admin earnings:", earningsErr);
        }

        // 4. Fetch Search History Logs
        try {
          const historyResponse = await fetch(`${getApiBaseUrl()}/api/admin/history`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const historyJson = await historyResponse.json();
          if (historyResponse.ok && historyJson.status === 'success') {
            setHistoryLogs(historyJson.data || []);
          } else {
            console.error("Failed to load search history logs:", historyJson.error);
          }
        } catch (historyErr) {
          console.error("Error fetching admin search history:", historyErr);
        }

      } else {
        console.warn("No active session token when loading profiles.");
      }
    } catch (profileErr) {
      console.error("Error fetching profiles:", profileErr);
    }

    setLoading(false);
  };

  const handleGenerateKey = async () => {
    if (!newKeyData.user_email || !newKeyData.user_email.trim()) {
      alert("Please enter a valid Customer Email.");
      return;
    }

    if (newKeyData.custom_key && /\s/.test(newKeyData.custom_key)) {
      alert("Custom Secret cannot contain whitespace.");
      return;
    }

    const apiKey = newKeyData.custom_key || `TX-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    const expiresAt = new Date();
    const days = newKeyData.plan_name.includes("15 Days") ? 15 : 30;
    expiresAt.setDate(expiresAt.getDate() + days);

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    let error = null;
    if (token) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/admin/api-keys`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ 
            user_email: newKeyData.user_email.trim(), 
            plan_name: newKeyData.plan_name, 
            days,
            custom_key: newKeyData.custom_key.trim() || undefined
          })
        });
        const json = await res.json();
        if (!res.ok) {
          error = { message: json.error || json.message || "Unknown server error" };
        }
      } catch (e: any) {
        error = { message: e.message || "Failed to connect to the server." };
      }
    } else {
      error = { message: "No active session found. Please login again." };
    }

    if (error) {
      alert("Error creating key: " + error.message);
    } else {
      setIsAddModalOpen(false);
      fetchData();
      setNewKeyData({
        user_email: '',
        plan_name: 'Unified Pro API (15 Days)',
        request_limit: null,
        days_expiry: 15,
        custom_key: ''
      });
    }
  };

  const handleUpdateKey = async () => {
    if (!selectedKey) return;

    const { error } = await supabase.from('api_keys').update({
      plan_name: selectedKey.plan_name,
      request_limit: null, // Force null for unlimited request plans
      status: selectedKey.status,
      expires_at: selectedKey.expires_at,
      user_email: selectedKey.user_email
    }).eq('id', selectedKey.id);

    if (error) {
      alert("Error updating key: " + error.message);
    } else {
      setIsEditModalOpen(false);
      fetchData();
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this key? Access will be revoked immediately.")) return;
    
          const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      let error = null;
      if (token) {
        const res = await fetch(`${getApiBaseUrl()}/api/admin/api-keys/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          const json = await res.json();
          error = { message: json.error };
        }
      }
    if (!error) fetchData();
  };

  const handleUpdateSettings = async () => {
    const { error } = await supabase.from('api_settings').upsert({
      id: settings.id || undefined,
      real_api_url: settings.real_api_url,
      updated_at: new Date().toISOString(),
      updated_by: user?.id
    });
    if (!error) alert("Settings Saved Successfully!");
  };

  const handleCreateUser = async () => {
    if (!newUserProfileData.email) {
      alert("Email is required!");
      return;
    }
    const randId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    
    const expiry = newUserProfileData.unlimited_expiry ? new Date(newUserProfileData.unlimited_expiry).toISOString() : null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert("Session token not found. Please log in again.");
        return;
      }

      const response = await fetch(`${getApiBaseUrl()}/api/admin/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: randId,
          email: newUserProfileData.email.trim().toLowerCase(),
          full_name: newUserProfileData.full_name?.trim() || newUserProfileData.email.split('@')[0],
          credits: Number(newUserProfileData.credits || 0),
          unlimited_expiry: expiry
        })
      });

      const resJson = await response.json();
      if (response.ok && resJson.status === 'success') {
        setIsAddUserModalOpen(false);
        setNewUserProfileData({
          email: '',
          full_name: '',
          credits: 10,
          unlimited_expiry: ''
        });
        fetchData();
        alert("User profile added successfully!");
      } else {
        alert("Error adding user profile: " + (resJson.error || "Unknown server error"));
      }
    } catch (err: any) {
      alert("Network or Server error adding user profile: " + err.message);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    const expiry = selectedUser.unlimited_expiry ? new Date(selectedUser.unlimited_expiry).toISOString() : null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert("Session token not found. Please log in again.");
        return;
      }

      const response = await fetch(`${getApiBaseUrl()}/api/admin/profiles/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: selectedUser.email,
          full_name: selectedUser.full_name || '',
          credits: Number(selectedUser.credits || 0),
          unlimited_expiry: expiry
        })
      });

      const resJson = await response.json();
      if (response.ok && resJson.status === 'success') {
        setIsEditUserModalOpen(false);
        setSelectedUser(null);
        fetchData();
        alert("User updated successfully!");
      } else {
        alert("Error updating user: " + (resJson.error || "Unknown server error"));
      }
    } catch (err: any) {
      alert("Network error updating user: " + err.message);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete profile for user ${email}?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert("Session token not found. Please log in again.");
        return;
      }

      const response = await fetch(`${getApiBaseUrl()}/api/admin/profiles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const resJson = await response.json();
      if (response.ok && resJson.status === 'success') {
        fetchData();
        alert("User profile deleted successfully!");
      } else {
        alert("Error deleting user: " + (resJson.error || "Unknown server error"));
      }
    } catch (err: any) {
      alert("Network error deleting user: " + err.message);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#030303] flex items-center justify-center"><RefreshCcw className="animate-spin text-cyan-500" /></div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center p-4">
        <ShieldAlert size={64} className="text-red-500 mb-6" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-zinc-500 text-center max-w-sm mb-8">This area is restricted to TraceXData administrators only.</p>
        <button onClick={() => navigate('/')} className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold">Return Home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 pb-20">
      <LiquidBackground />
      
      {/* Admin Sidebar */}
      <nav className="fixed left-0 top-0 bottom-0 w-64 bg-black/40 border-r border-white/5 backdrop-blur-3xl hidden lg:flex flex-col p-6 z-[70]">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-zinc-950">
            <ShieldCheck size={20} />
          </div>
          <span className="font-bold tracking-tighter text-lg">Admin Core</span>
        </div>

        <div className="space-y-1">
          {[
            { id: 'stats', label: 'Dashboard', icon: TrendingUp },
            { id: 'users', label: 'User Manager', icon: Users },
            { id: 'keys', label: 'Key Manager', icon: Key },
            { id: 'transactions', label: 'Transactions', icon: CreditCard },
            { id: 'history', label: 'Search History', icon: Clock },
            { id: 'settings', label: 'Engine Settings', icon: Settings },
            { id: 'logs', label: 'Trace Logs', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-auto">
           <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-600 hover:text-white text-sm font-bold transition-all">
             <ChevronRight size={18} />
             Exit Panel
           </button>
        </div>
      </nav>

      {/* Mobile Top Nav with Tab Swapper */}
      <div className="lg:hidden fixed top-0 left-0 right-0 border-b border-white/5 bg-[#030303]/90 backdrop-blur-2xl z-[60]">
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <span className="font-bold text-xs uppercase tracking-widest text-cyan-500">TraceX Admin Control</span>
          <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-white flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
            Exit Panel
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex gap-2 p-3 overflow-x-auto scrollbar-none bg-[#050505]/50">
          {[
            { id: 'stats', label: 'Stats', icon: TrendingUp },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'keys', label: 'Keys', icon: Key },
            { id: 'transactions', label: 'Txns', icon: CreditCard },
            { id: 'history', label: 'History', icon: Clock },
            { id: 'settings', label: 'Gateway', icon: Settings },
            { id: 'logs', label: 'Traces', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === tab.id ? 'bg-cyan-500 text-zinc-950 font-extrabold shadow-lg shadow-cyan-500/20' : 'text-zinc-400 hover:text-white bg-white/2 border border-white/5'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="lg:ml-64 pt-36 lg:pt-12 px-6 max-w-6xl">
        {isServiceRoleActive === false && (
          <div className="mb-8 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-4 text-amber-200">
            <div className="text-amber-400 shrink-0 mt-0.5">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-400">Database Warning: Supabase Service Role Key is Missing!</h4>
              <p className="text-xs text-amber-200/70 mt-1 leading-relaxed">
                Your backend server is running in fallback mode using the Public Anon Key. While some actions work,
                Supabase Row Level Security (RLS) is active and prevents reading full profiles, api keys, and transaction ledgers.
                To resolve this and load all system statistics correctly:
              </p>
              <ul className="list-disc list-inside text-xs text-amber-200/60 mt-2.5 space-y-1">
                <li>Go to your <strong className="text-amber-300">Supabase Dashboard</strong> &rarr; <strong className="text-amber-300">Project Settings</strong> &rarr; <strong className="text-amber-300">API</strong>.</li>
                <li>Locate the <code className="bg-amber-500/20 px-1 py-0.5 rounded text-amber-300">service_role</code> private secret key.</li>
                <li>Add <code className="bg-amber-500/20 px-1 py-0.5 rounded text-amber-300">SUPABASE_SERVICE_ROLE_KEY</code> as an Environment Variable in your <strong className="text-amber-300">Render</strong> (or Firebase hosting) dashboard and redeploy.</li>
              </ul>
            </div>
          </div>
        )}

        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold capitalize">{activeTab} Control</h1>
            <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest font-bold">TraceXData Intelligence System</p>
          </div>
          <div className="flex gap-3">
             {activeTab === 'users' ? (
               <button 
                 onClick={() => setIsAddUserModalOpen(true)}
                 className="px-6 py-3 rounded-xl bg-cyan-500 text-zinc-950 font-bold text-xs hover:bg-cyan-400 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
               >
                 <UserPlus size={16} />
                 Add User Profile
               </button>
             ) : (
               <button 
                 onClick={() => setIsAddModalOpen(true)}
                 className="px-6 py-3 rounded-xl bg-cyan-500 text-zinc-950 font-bold text-xs hover:bg-cyan-400 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
               >
                 <PlusCircle size={16} />
                 Manual Key
               </button>
             )}
             <button onClick={fetchData} className="p-3 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition-all">
               <RefreshCcw size={18} />
             </button>
          </div>
        </header>

        {/* --- STATS VIEW --- */}
        {activeTab === 'stats' && (
          <div className="space-y-8">
            {/* Live Cash Earning Stats Trio (Today, Yesterday, Full Week) */}
            <div className="p-6 rounded-[32px] bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 border border-emerald-500/10 shadow-2xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-1.5 font-sans">
                <TrendingUp size={14} className="animate-pulse" />
                Live Payment Cashflow Revenue Ledger
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-[#0b0b0b]/80 border border-emerald-500/10 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Today's Earnings</span>
                    <div className="text-3xl font-extrabold text-emerald-400 mt-2 font-mono font-sans">₹{earnings.today || 0}</div>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-3 font-medium uppercase font-sans">Updated just now</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#0b0b0b]/80 border border-white/5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Yesterday's Earnings</span>
                    <div className="text-3xl font-extrabold text-[#f59e0b] mt-2 font-mono font-sans">₹{earnings.yesterday || 0}</div>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-3 font-medium uppercase font-sans">Standard 24h cycle</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#0b0b0b]/80 border border-cyan-500/10 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Full Week Earnings</span>
                    <div className="text-3xl font-extrabold text-cyan-400 mt-2 font-mono font-sans">₹{earnings.week || 0}</div>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-3 font-medium uppercase font-sans">Rolling 7-day total</p>
                </div>
              </div>
            </div>

            {/* Core Platform Counters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Cumulative Cashflow', value: `₹${earnings.total || stats.revenue || 0}`, icon: DollarSign, color: 'text-emerald-400' },
                { label: 'Platform Keys', value: stats.totalKeys, icon: Key, color: 'text-cyan-400' },
                { label: 'Live Traces', value: stats.totalRequests, icon: Activity, color: 'text-orange-400' },
                { label: 'Cloud Users', value: stats.totalUsers, icon: Users, color: 'text-purple-400' }
              ].map(card => (
                <div key={card.label} className="p-6 rounded-[24px] bg-[#090909] border border-white/5">
                  <div className={`p-2 w-fit rounded-lg bg-white/2 mb-4 ${card.color}`}>
                     <card.icon size={20} />
                  </div>
                  <div className="text-2xl font-bold text-white font-sans">{card.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-1 font-sans">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Grid of Logs & Successful Payments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Recent System Logs */}
              <div className="p-6 rounded-3xl bg-[#080808] border border-white/5 flex flex-col h-[480px]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2 shrink-0 font-sans">
                  <Clock size={14} className="text-zinc-500" />
                  Recent Trace API Logs (Last 24h)
                </h3>
                <div className="overflow-y-auto pr-1 flex-grow space-y-3 custom-scrollbar">
                  {logs.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4 uppercase tracking-widest font-bold font-sans">No activity registered today</p>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${log.status === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
                          <div>
                             <div className="text-xs text-white font-bold font-mono">{log.masked_number}</div>
                             <div className="text-[9px] text-zinc-600 mt-0.5 font-sans">{new Date(log.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 font-bold bg-white/5 px-2 py-0.5 rounded">{log.response_time_ms}ms</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Latest Successful Transactions */}
              <div className="p-6 rounded-3xl bg-[#080808] border border-white/5 flex flex-col h-[480px]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-6 flex items-center gap-2 shrink-0 font-sans">
                  <CreditCard size={14} />
                  Last Successful Transactions
                </h3>
                <div className="overflow-y-auto pr-1 flex-grow space-y-3 custom-scrollbar">
                  {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                      <CreditCard size={32} className="mb-2 text-zinc-700 opacity-50" />
                      <p className="text-[10px] uppercase font-bold tracking-widest font-sans">No transaction claims found in server ledger</p>
                    </div>
                  ) : (
                    transactions.map((tx, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-emerald-500/2 border border-emerald-500/10 hover:border-emerald-500/20 transition-all flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold block text-white truncate max-w-[200px] font-sans">{tx.user_email || 'Guest Profile'}</span>
                            <span className="text-[9px] font-mono font-bold text-zinc-500">REF: {tx.payment_id}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-extrabold text-emerald-400 block">+₹{tx.amount || 0}</span>
                            <span className="text-[8px] uppercase tracking-widest text-zinc-600 font-bold font-sans">{tx.plan_id.replace('credit_', '')} Credits</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/2 pt-2 text-[8px] font-bold uppercase tracking-wider text-zinc-500 font-sans">
                          <span>Verified OK</span>
                          <span className="text-[9px] font-mono text-zinc-600 normal-case font-bold">{new Date(tx.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- USER MANAGER --- */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Users size={14} />
                Registered Platform Users ({profiles.length})
              </h3>
              <button 
                onClick={() => setIsAddUserModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs hover:bg-cyan-500/20 transition-all flex items-center gap-2"
              >
                <UserPlus size={14} />
                Register New Profile
              </button>
            </div>

            {/* Powerful Unified Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text"
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                placeholder="Search by Email, User ID, or Name..."
                className="w-full h-12 bg-[#090909]/80 border border-white/5 rounded-xl pl-12 pr-4 outline-none focus:border-cyan-500/50 transition-all text-xs md:text-sm text-white placeholder:text-zinc-500"
              />
              {searchUserQuery && (
                <button 
                  onClick={() => setSearchUserQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold font-sans bg-white/5 hover:bg-white/10 px-2 py-1 rounded"
                >
                  Clear
                </button>
              )}
            </div>

            {/* List and Table definitions filtered by query */}
            {(() => {
              const query = (searchUserQuery || '').trim().toLowerCase();
              const filteredProfiles = profiles.filter(p => {
                if (!query) return true;
                const email = (p.email || '').toLowerCase();
                const id = (p.id || '').toLowerCase();
                const fullName = (p.full_name || '').toLowerCase();
                return email.includes(query) || id.includes(query) || fullName.includes(query);
              });

              return (
                <>
                  {/* MOBILE INTERFACE (Optimized for Mobile/Touch) */}
                  <div className="block md:hidden space-y-4">
                    {filteredProfiles.length === 0 ? (
                      <div className="glass-card p-12 text-center">
                        <Users size={32} className="text-zinc-600 mx-auto mb-2" />
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">No matching users found</p>
                      </div>
                    ) : (
                      filteredProfiles.map(p => {
                        const hasUnlimited = p.unlimited_expiry && new Date(p.unlimited_expiry) > new Date();
                        const isUserAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === (p.email || '').toLowerCase());
                        
                        return (
                          <div key={p.id} className="p-5 rounded-[24px] bg-white/2 border border-white/5 space-y-3">
                            <div className="flex justify-between items-start gap-4">
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                                  <span>{p.full_name || 'No Name'}</span>
                                  {isUserAdmin && (
                                    <span className="text-[9px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.2 rounded-full font-bold">Admin</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-zinc-400 mt-0.5 truncate">{p.email}</div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => {
                                    setSelectedUser(JSON.parse(JSON.stringify(p))); // deep copy
                                    setIsEditUserModalOpen(true);
                                  }}
                                  className="p-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/10 transition-all"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(p.id, p.email)}
                                  className="p-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-500 border border-red-500/10 transition-all"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 py-2.5 border-t border-b border-white/5 text-[11px]">
                              <div>
                                <span className="text-zinc-600 block uppercase font-bold text-[8px] tracking-wider">Credits Balance</span>
                                <span className="text-zinc-300 font-mono font-bold block bg-cyan-500/5 px-2 py-0.5 rounded w-fit mt-1 border border-cyan-500/10">
                                  {p.credits || 0} Lookups
                                </span>
                              </div>
                              <div>
                                <span className="text-zinc-600 block uppercase font-bold text-[8px] tracking-wider">Unlimited Days</span>
                                {hasUnlimited ? (
                                  <span className="text-emerald-400 block font-bold mt-1 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded w-fit truncate" title={p.unlimited_expiry}>
                                    Expires {new Date(p.unlimited_expiry!).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span className="text-zinc-500 block mt-1">Inactive</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">User ID</span>
                              <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[200px]" title={p.id}>
                                {p.id}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* DESKTOP INTERFACE (Wide screen layout) */}
                  <div className="hidden md:block glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-white/2 border-b border-white/5">
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">User Context</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">User ID</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Credits Remaining</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Unlimited Tier</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredProfiles.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-xs uppercase font-bold tracking-widest">
                                No registered users found
                              </td>
                            </tr>
                          ) : (
                            filteredProfiles.map(p => {
                              const hasUnlimited = p.unlimited_expiry && new Date(p.unlimited_expiry) > new Date();
                              const isUserAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === (p.email || '').toLowerCase());
                              
                              return (
                                <tr key={p.id} className="hover:bg-white/2 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                      <span>{p.full_name || 'No Name'}</span>
                                      {isUserAdmin && (
                                        <span className="text-[9px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.2 rounded-full font-bold">Admin</span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-zinc-500 mt-0.5">{p.email}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-[10px] font-mono text-zinc-500 select-all" title={p.id}>
                                      {p.id}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-xs font-mono font-bold text-cyan-400">
                                      {p.credits || 0} credits
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    {hasUnlimited ? (
                                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold uppercase" title={p.unlimited_expiry}>
                                        Expires: {new Date(p.unlimited_expiry!).toLocaleDateString()}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-zinc-600 font-bold uppercase tracking-wider">No active plan</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <button 
                                        onClick={() => {
                                          setSelectedUser(JSON.parse(JSON.stringify(p))); // deep copy
                                          setIsEditUserModalOpen(true);
                                        }}
                                        className="text-cyan-400 hover:text-cyan-300 transition-colors p-2"
                                        title="Edit User Profile"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteUser(p.id, p.email)}
                                        className="text-red-500 hover:text-red-400 transition-colors p-2"
                                        title="Delete User"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* --- TRANSACTIONS VIEW --- */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <CreditCard size={14} />
                Payment Gateway Transactions
              </h3>
              <button 
                onClick={fetchData} 
                className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs hover:bg-cyan-500/20 transition-all flex items-center gap-2"
              >
                <RefreshCcw size={14} />
                Refresh Logs
              </button>
            </div>

            {/* MOBILE INTERFACE (Optimized for Mobile/Touch) */}
            <div className="block md:hidden space-y-4">
              {transactions.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <CreditCard size={32} className="text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">No transactions logged</p>
                </div>
              ) : (
                transactions.map(tx => {
                  const statusColors: Record<string, string> = {
                    'success': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    'pending': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    'failed': 'bg-red-500/10 text-red-400 border-red-500/20'
                  };
                  const statusColor = statusColors[tx.status?.toLowerCase()] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

                  return (
                    <div key={tx.id} className="p-5 rounded-[24px] bg-white/2 border border-white/5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-bold text-white truncate max-w-[180px]">
                            {tx.user_email || 'Guest User'}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            Order ID: {tx.payment_id}
                          </div>
                        </div>
                        <span className={`text-[9px] border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusColor}`}>
                          {tx.status || 'PENDING'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 py-2.5 border-t border-b border-white/5 text-[11px]">
                        <div>
                          <span className="text-zinc-600 block uppercase font-bold text-[8px] tracking-wider">Amount Paid</span>
                          <span className="text-emerald-400 font-mono font-bold block mt-0.5">
                            ₹{tx.amount}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-600 block uppercase font-bold text-[8px] tracking-wider">Plan Assigned</span>
                          <span className="text-zinc-300 font-mono text-[10px] font-bold block mt-0.5 truncate max-w-[100px]" title={tx.plan_id}>
                            {tx.plan_id}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[9px] font-mono text-zinc-500">
                        <span>{new Date(tx.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* DESKTOP INTERFACE (Wide screen layout) */}
            <div className="hidden md:block glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/2 border-b border-white/5">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">User Email</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Order & Payment ID</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Plan Code</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Amount</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Gateway Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 text-xs uppercase font-bold tracking-widest">
                          No transaction records found
                        </td>
                      </tr>
                    ) : (
                      transactions.map(tx => {
                        const statusColors: Record<string, string> = {
                          'success': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                          'pending': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                          'failed': 'bg-red-500/10 text-red-400 border-red-500/20'
                        };
                        const statusColor = statusColors[tx.status?.toLowerCase()] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

                        return (
                          <tr key={tx.id} className="hover:bg-white/2 transition-colors">
                            <td className="px-6 py-4">
                              <div className="text-xs font-bold text-white">{tx.user_email || 'Guest User'}</div>
                              {tx.user_name && <div className="text-[10px] text-zinc-500 mt-0.5">{tx.user_name}</div>}
                            </td>
                            <td className="px-6 py-4 font-mono text-[10px] text-zinc-400">
                              {tx.payment_id}
                            </td>
                            <td className="px-6 py-4 font-mono text-[10px] text-zinc-300">
                              {tx.plan_id}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs font-bold text-emerald-400">
                              ₹{tx.amount}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[9px] border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusColor}`}>
                                {tx.status || 'PENDING'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-mono text-zinc-500">
                              {new Date(tx.created_at).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- SEARCH HISTORY VIEW --- */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Clock size={14} />
                Global Search Query Logs
              </h3>
              <button 
                onClick={fetchData} 
                className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs hover:bg-cyan-500/20 transition-all flex items-center gap-2"
              >
                <RefreshCcw size={14} />
                Refresh Traces
              </button>
            </div>

            {/* MOBILE INTERFACE (Optimized for Mobile/Touch) */}
            <div className="block md:hidden space-y-4">
              {historyLogs.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Clock size={32} className="text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">No search history logs found</p>
                </div>
              ) : (
                historyLogs.map((log, index) => {
                  const searchStatusColors: Record<string, string> = {
                    'success': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    'not_found': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    'failed': 'bg-red-500/10 text-red-400 border-red-500/20'
                  };
                  const statusColor = searchStatusColors[log.status?.toLowerCase()] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

                  return (
                    <div key={log.id || index} className="p-5 rounded-[24px] bg-white/2 border border-white/5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-bold text-white truncate max-w-[180px]">
                            {log.user_email || 'Guest User'}
                          </div>
                          <span className="text-[10px] text-cyan-400 font-mono mt-0.5 bg-cyan-500/5 border border-cyan-500/10 px-2 py-0.5 rounded uppercase tracking-wider inline-block">
                            {log.search_type}
                          </span>
                        </div>
                        <span className={`text-[9px] border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusColor}`}>
                          {log.status === 'success' ? 'SUCCESS' : log.status === 'not_found' ? 'NOT FOUND' : 'FAILED'}
                        </span>
                      </div>

                      <div className="py-2.5 border-t border-b border-white/5 text-[11px] space-y-1">
                        <span className="text-zinc-600 block uppercase font-bold text-[8px] tracking-wider">Searched Query</span>
                        <span className="text-zinc-300 font-mono font-bold block bg-white/5 px-2 py-1 rounded select-all break-all">
                          {log.query}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[9px] font-mono text-zinc-500">
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* DESKTOP INTERFACE (Wide screen layout) */}
            <div className="hidden md:block glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/2 border-b border-white/5">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Who (User)</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Search Type</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Searched Query</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Result Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {historyLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-xs uppercase font-bold tracking-widest">
                          No search logs found
                        </td>
                      </tr>
                    ) : (
                      historyLogs.map((log, index) => {
                        const searchStatusColors: Record<string, string> = {
                          'success': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                          'not_found': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                          'failed': 'bg-red-500/10 text-red-400 border-red-500/20'
                        };
                        const statusColor = searchStatusColors[log.status?.toLowerCase()] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

                        return (
                          <tr key={log.id || index} className="hover:bg-white/2 transition-colors">
                            <td className="px-6 py-4">
                              <div className="text-xs font-bold text-white">{log.user_email || 'Guest User'}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/5 border border-cyan-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                                {log.search_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-white select-all break-all max-w-[250px]">
                              {log.query}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[9px] border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusColor}`}>
                                {log.status === 'success' ? 'SUCCESS' : log.status === 'not_found' ? 'NOT FOUND' : 'FAILED'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-mono text-zinc-500">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- KEY MANAGER --- */}
        {activeTab === 'keys' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                 <Key size={14} />
                 Active Platform Keys
               </h3>
               <button 
                 onClick={() => setIsAddModalOpen(true)}
                 className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-xs hover:bg-cyan-500/20 transition-all flex items-center gap-2"
               >
                 <PlusCircle size={14} />
                 Generate New Key
               </button>
            </div>

            {/* Mobile Cards for Keys */}
            <div className="block md:hidden space-y-4">
              {keys.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Key size={32} className="text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">No API keys found</p>
                </div>
              ) : (
                keys.map(key => {
                  const keyString = key.api_key || "";
                  const displayKey = keyString ? (keyString.length > 8 ? `${keyString.substring(0, 8)}...` : keyString) : "N/A";
                  const expiryString = key.expires_at ? new Date(key.expires_at).toLocaleDateString() : "Never";
                  return (
                    <div key={key.id} className="p-5 rounded-[24px] bg-white/2 border border-white/5 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{key.user_email || "No Email"}</div>
                          <div className="text-[10px] font-mono text-zinc-500 mt-1 bg-black/40 px-2 py-0.5 rounded w-fit">
                            {displayKey}
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          key.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-red-500/10 text-red-400 border border-red-500/25'
                        }`}>
                          {key.status || "inactive"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 py-1.5 border-t border-b border-white/5 text-[11px]">
                        <div>
                          <span className="text-zinc-600 block uppercase font-bold text-[8px]">Plan</span>
                          <span className="text-zinc-300 font-bold block truncate">{key.plan_name || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-zinc-600 block uppercase font-bold text-[8px]">Expiry</span>
                          <span className="text-zinc-300 block">{expiryString}</span>
                        </div>
                      </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs font-bold text-cyan-400 bg-cyan-400/5 px-2.5 py-1 rounded-lg">
                        {key.requests_used} Traces
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            const planUpper = String(key.plan_name || "").toUpperCase();
                            const baseDomain = getApiBaseUrl().replace(/\/$/, "");
                            let targetUrl = "";
                            if (planUpper.includes("TELEGRAM")) {
                              targetUrl = `${baseDomain}/api/telegram?key=${key.api_key}&api=gaurav_beniwal_0001`;
                            } else if (planUpper.includes("VEHICLE")) {
                              targetUrl = `${baseDomain}/api/vehicle?key=${key.api_key}&query=BR07PB6268`;
                            } else if (planUpper.includes("PAN") || planUpper.includes("PN")) {
                              targetUrl = `${baseDomain}/api/pancard?key=${key.api_key}&query=NTEPK1628C`;
                            } else if (planUpper.includes("ADHR") || planUpper.includes("IDENTITY") || planUpper.includes("AADH")) {
                              targetUrl = `${baseDomain}/api/identity?key=${key.api_key}&query=381933049732`;
                            } else if (planUpper.includes("BNK") || planUpper.includes("BANK") || planUpper.includes("BA&NK")) {
                              targetUrl = `${baseDomain}/api/bank?key=${key.api_key}&query=ABCD0001325`;
                            } else {
                              targetUrl = `${baseDomain}/api/lookup?key=${key.api_key}&number=9879712345`;
                            }
                            navigator.clipboard.writeText(targetUrl);
                            alert('Full API URL Copied!');
                          }}
                          className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/10 transition-colors"
                          title="Copy Full API URL"
                        >
                          <PlusCircle size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedKey(key);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/10 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteKey(key.id)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-500 border border-red-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )})
              )}
            </div>

            {/* Desktop Table for Keys */}
            <div className="hidden md:block glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/2 border-b border-white/5">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Owner</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Key Context</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Plan</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Expiry</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Usage</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {keys.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                             <Key size={32} className="text-zinc-600 mb-2" />
                             <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">No API keys found in the system</p>
                             <button 
                               onClick={() => setIsAddModalOpen(true)}
                               className="mt-2 px-6 py-3 rounded-xl bg-cyan-500 text-zinc-950 font-bold text-xs"
                             >
                               Create First Key
                             </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      keys.map(key => {
                        const keyString = key.api_key || "";
                        const displayKey = keyString ? (keyString.length > 8 ? `${keyString.substring(0, 8)}...` : keyString) : "N/A";
                        const expiryString = key.expires_at ? new Date(key.expires_at).toLocaleDateString() : "Never";
                        return (
                          <tr key={key.id} className="hover:bg-white/2 transition-colors">
                            <td className="px-6 py-4">
                              <div className="text-xs font-bold text-white max-w-[150px] truncate">{key.user_email || "No Email"}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-[10px] font-mono text-zinc-500 bg-black/40 px-2 py-1 rounded w-fit">
                                {displayKey}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-zinc-400">{key.plan_name || "N/A"}</td>
                            <td className="px-6 py-4 text-xs text-zinc-400">{expiryString}</td>
                            <td className="px-6 py-4">
                               <div className="text-xs font-bold text-cyan-400">{key.requests_used || 0} reqs</div>
                             </td>
                           <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => {
                                   const planUpper = String(key.plan_name || "").toUpperCase();
                                   const baseDomain = getApiBaseUrl().replace(/\/$/, "");
                                    const targetUrl = planUpper.includes("TELEGRAM") ? `${baseDomain}/api/telegram?key=${key.api_key}&api=gaurav_beniwal_0001` : planUpper.includes("VEHICLE") ? `${baseDomain}/api/vehicle?key=${key.api_key}&query=BR07PB6268` : (planUpper.includes("PAN") || planUpper.includes("PN")) ? `${baseDomain}/api/pancard?key=${key.api_key}&query=NTEPK1628C` : (planUpper.includes("ADHR") || planUpper.includes("IDENTITY") || planUpper.includes("AADH")) ? `${baseDomain}/api/identity?key=${key.api_key}&query=381933049732` : (planUpper.includes("BNK") || planUpper.includes("BANK") || planUpper.includes("BA&NK")) ? `${baseDomain}/api/bank?key=${key.api_key}&query=ABCD0001325` : `${baseDomain}/api/lookup?key=${key.api_key}&number=9879712345`;
                                   navigator.clipboard.writeText(targetUrl);
                                   alert('Full API URL Copied!');
                                 }}
                                 className="text-emerald-400 hover:text-emerald-300 transition-colors p-2"
                                 title="Copy Full API URL"
                               >
                                 <PlusCircle size={14} />
                               </button>
                               <button 
                                 onClick={() => {
                                   setSelectedKey(key);
                                   setIsEditModalOpen(true);
                                 }}
                                 className="text-cyan-400 hover:text-cyan-300 transition-colors p-2"
                               >
                                 <Edit2 size={14} />
                               </button>
                               <button 
                                 onClick={() => handleDeleteKey(key.id)}
                                 className="text-red-500 hover:text-red-400 transition-colors p-2"
                               >
                                 <Trash2 size={14} />
                               </button>
                             </div>
                           </td>
                        </tr>
                      )})
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TRACE LOGS VIEW --- */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
             <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2 mb-4">
               <Activity size={14} />
               Trace Logs Registry
             </h3>
             
             {/* Mobile Friendly logs list */}
             <div className="block md:hidden space-y-3">
               {logs.length === 0 ? (
                 <div className="glass-card p-12 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
                   No log records found
                 </div>
               ) : (
                 logs.map((log, i) => (
                   <div key={i} className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-3">
                     <div className="flex justify-between items-center">
                       <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                         log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                       }`}>
                         {log.status}
                       </span>
                       <span className="text-[10px] font-mono text-zinc-500">
                         {log.response_time_ms}ms
                       </span>
                     </div>
                     <div className="text-xs text-white font-bold font-mono">
                       Result: {log.masked_number}
                     </div>
                     <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[10px] text-zinc-400">
                       <div className="truncate max-w-[140px]">
                         {log.api_keys?.user_email || 'Bypass / Internal'}
                       </div>
                       <div>
                         {new Date(log.created_at).toLocaleTimeString()}
                       </div>
                     </div>
                   </div>
                 ))
               )}
             </div>

             {/* Desktop friendly logs table */}
             <div className="hidden md:block glass-card overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-white/2 border-b border-white/5">
                       <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Timestamp</th>
                       <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Query Target</th>
                       <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">SaaS Email</th>
                       <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status</th>
                       <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Latency</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {logs.length === 0 ? (
                       <tr>
                         <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
                           No log records found
                         </td>
                       </tr>
                     ) : (
                       logs.map((log, i) => (
                         <tr key={i} className="hover:bg-white/2 transition-colors">
                           <td className="px-6 py-4 text-xs text-zinc-400 bg-transparent">
                             {new Date(log.created_at).toLocaleString()}
                           </td>
                           <td className="px-6 py-4 font-mono text-xs text-white bg-transparent">
                             {log.masked_number}
                           </td>
                           <td className="px-6 py-4 text-xs text-zinc-400 bg-transparent">
                             {log.api_keys?.user_email || 'Bypass / Internal'}
                           </td>
                           <td className="px-6 py-4 bg-transparent">
                             <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                               log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                             }`}>
                               <span className={`w-1 h-1 rounded-full ${log.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                               {log.status}
                             </span>
                           </td>
                           <td className="px-6 py-4 text-xs font-mono text-zinc-500 bg-transparent">
                             {log.response_time_ms}ms
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
          </div>
        )}

        {/* --- SETTINGS --- */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-8">
            <div className="glass-card p-8 space-y-6">
               <div className="flex items-center gap-3 text-orange-400 mb-2">
                 <AlertTriangle size={20} />
                 <h3 className="font-bold">Engine Gateway Settings</h3>
               </div>
               <p className="text-zinc-500 text-sm leading-relaxed pb-4">
                 Changing this URL affects all API lookups instantly. Ensure the target API supports the 
                 <code className="text-cyan-400 mx-1">ENTER_TARGET_HERE</code> placeholder.
               </p>

               <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Master Real API URL</label>
                   <div className="relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                     <input 
                       type="text" 
                       value={settings.real_api_url}
                       onChange={(e) => setSettings({ ...settings, real_api_url: e.target.value })}
                       className="w-full glass-input pl-12 pr-6 h-14 text-sm font-mono"
                       placeholder="https://api.example.com?query=ENTER_TARGET_HERE"
                     />
                   </div>
                 </div>

                 <button 
                   onClick={handleUpdateSettings}
                   className="w-full py-4 rounded-xl bg-cyan-500 text-zinc-950 font-bold text-sm hover:bg-cyan-400 flex items-center justify-center gap-2"
                 >
                   <Save size={18} />
                   Deploy Engine Update
                 </button>
               </div>
            </div>

            <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
               <h4 className="text-red-400 font-bold flex items-center gap-2 mb-2 uppercase tracking-widest text-[10px]">
                 <ShieldAlert size={14} />
                 Emergency Controls
               </h4>
               <p className="text-zinc-600 text-[10px] mb-4 uppercase tracking-[0.05em]">Sensitive actions affecting platform availability.</p>
               <div className="flex gap-2">
                  <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold rounded-lg border border-red-500/20 uppercase tracking-widest">Wipe Request Logs</button>
                  <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold rounded-lg border border-red-500/20 uppercase tracking-widest">Disable Gateway</button>
               </div>
            </div>
          </div>
        )}

      </main>

      {/* --- ADD KEY MODAL --- */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[32px] p-8 overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl font-bold">Manual Key Generation</h2>
                  <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">TraceX Forge Module</p>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Customer Email</label>
                  <div className="relative">
                    <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                    <input 
                      type="email" 
                      value={newKeyData.user_email}
                      onChange={(e) => setNewKeyData({...newKeyData, user_email: e.target.value})}
                      className="w-full h-14 bg-white/2 border border-white/5 rounded-xl pl-12 pr-6 outline-none focus:border-cyan-500/50 transition-all text-sm"
                      placeholder="customer@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Access Plan</label>
                  <select 
                    value={newKeyData.plan_name}
                    onChange={(e) => setNewKeyData({...newKeyData, plan_name: e.target.value})}
                    className="w-full h-14 bg-white/2 border border-white/5 rounded-xl px-4 outline-none focus:border-cyan-500/50 transition-all text-sm appearance-none cursor-pointer"
                  >
                    <option value="Unified Pro API (15 Days)">Unified Pro API (15 Days)</option>
                    <option value="Unified Infinity API (30 Days)">Unified Infinity API (30 Days)</option>
                    <option value="Number Lookup (1 Month)">Number Lookup (1 Month)</option>
                    <option value="Telegram Lookup (1 Month)">Telegram Lookup (1 Month)</option>
                    <option value="Identity Card Lookup (1 Month)">Identity Card Lookup (1 Month)</option>
                    <option value="BA&NK Lookup (1 Month)">BA&NK Lookup (1 Month)</option>
                    <option value="Vehicle Lookup (1 Month)">Vehicle Lookup (1 Month)</option>
                    <option value="PN Card Lookup (1 Month)">PN Card Lookup (1 Month)</option>
                    <option value="All Combo Special (1 Month)">All Combo Special (1 Month)</option>
                  </select>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.1em] px-1 block mt-1">
                    ✨ Selected option includes unlimited request limits and auto-assigned validity period.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Custom Secret (Optional)</label>
                  <input 
                    type="text" 
                    value={newKeyData.custom_key}
                    onChange={(e) => setNewKeyData({...newKeyData, custom_key: e.target.value})}
                    className="w-full h-14 bg-white/2 border border-white/5 rounded-xl px-4 outline-none focus:border-cyan-500/50 transition-all text-sm font-mono placeholder:font-sans"
                    placeholder="Auto-generated if empty"
                  />
                </div>

                <button 
                  onClick={handleGenerateKey}
                  className="w-full py-4 rounded-xl bg-cyan-500 text-zinc-950 font-bold text-sm hover:bg-cyan-400 transition-all mt-4 flex items-center justify-center gap-2"
                >
                  <Key size={18} />
                  Authorize Key Generation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT KEY MODAL --- */}
      <AnimatePresence>
        {isEditModalOpen && selectedKey && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[32px] p-8 overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl font-bold text-emerald-400 truncate max-w-[280px]">Edit: {selectedKey.api_key}</h2>
                  <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">Permission Control Logic</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Assigned Email</label>
                  <input 
                    type="email" 
                    value={selectedKey.user_email}
                    onChange={(e) => setSelectedKey({...selectedKey, user_email: e.target.value})}
                    className="w-full h-14 bg-white/2 border border-white/5 rounded-xl px-4 outline-none focus:border-cyan-500/50 transition-all text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Update Plan</label>
                    <select 
                      value={selectedKey.plan_name}
                      onChange={(e) => {
                        const nextPlan = e.target.value;
                        const days = nextPlan.includes("15 Days") ? 15 : 30;
                        const date = new Date();
                        date.setDate(date.getDate() + days);
                        setSelectedKey({
                          ...selectedKey,
                          plan_name: nextPlan,
                          expires_at: date.toISOString()
                        });
                      }}
                      className="w-full h-14 bg-white/2 border border-white/5 rounded-xl px-4 outline-none focus:border-cyan-500/50 transition-all text-sm appearance-none cursor-pointer"
                    >
                      <option value="Unified Pro API (15 Days)">Unified Pro API (15 Days)</option>
                      <option value="Unified Infinity API (30 Days)">Unified Infinity API (30 Days)</option>
                      <option value="Number Lookup (1 Month)">Number Lookup (1 Month)</option>
                      <option value="Telegram Lookup (1 Month)">Telegram Lookup (1 Month)</option>
                      <option value="Identity Card Lookup (1 Month)">Identity Card Lookup (1 Month)</option>
                      <option value="BA&NK Lookup (1 Month)">BA&NK Lookup (1 Month)</option>
                      <option value="Vehicle Lookup (1 Month)">Vehicle Lookup (1 Month)</option>
                      <option value="PN Card Lookup (1 Month)">PN Card Lookup (1 Month)</option>
                      <option value="All Combo Special (1 Month)">All Combo Special (1 Month)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Status</label>
                    <select 
                      value={selectedKey.status}
                      onChange={(e) => setSelectedKey({...selectedKey, status: e.target.value})}
                      className="w-full h-14 bg-white/2 border border-white/5 rounded-xl px-4 outline-none focus:border-cyan-500/50 transition-all text-sm appearance-none cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="revoked">Revoked</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.1em] px-1 block mt-1">
                    ✨ Selected option includes unlimited request limits and auto-updates validity period.
                  </span>
                </div>

                <button 
                  onClick={handleUpdateKey}
                  className="w-full py-4 rounded-xl bg-cyan-500 text-zinc-950 font-bold text-sm hover:bg-cyan-400 transition-all mt-4 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Update Access Rules
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD USER MODAL --- */}
      <AnimatePresence>
        {isAddUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddUserModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[32px] p-8 overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl font-bold">Register User Profile</h2>
                  <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">TraceX Directory Ledger</p>
                </div>
                <button onClick={() => setIsAddUserModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Email ID</label>
                  <input 
                    type="email" 
                    value={newUserProfileData.email}
                    onChange={(e) => setNewUserProfileData({...newUserProfileData, email: e.target.value})}
                    className="w-full h-14 bg-white/2 border border-white/5 rounded-xl px-4 outline-none focus:border-cyan-500/50 transition-all text-sm text-white"
                    placeholder="user@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Full Name</label>
                  <input 
                    type="text" 
                    value={newUserProfileData.full_name}
                    onChange={(e) => setNewUserProfileData({...newUserProfileData, full_name: e.target.value})}
                    className="w-full h-14 bg-white/2 border border-white/5 rounded-xl px-4 outline-none focus:border-cyan-500/50 transition-all text-sm text-white"
                    placeholder="e.g. Gaurav Beniwal"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Starting Credits</label>
                    <input 
                      type="number" 
                      value={newUserProfileData.credits}
                      onChange={(e) => setNewUserProfileData({...newUserProfileData, credits: Number(e.target.value)})}
                      className="w-full h-14 bg-white/2 border border-white/5 rounded-xl px-4 outline-none focus:border-cyan-500/50 transition-all text-sm font-mono text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Unlimited Expiry (Optional)</label>
                    <input 
                      type="datetime-local" 
                      value={newUserProfileData.unlimited_expiry}
                      onChange={(e) => setNewUserProfileData({...newUserProfileData, unlimited_expiry: e.target.value})}
                      className="w-full h-14 bg-white/2 border border-white/5 rounded-xl px-4 outline-none focus:border-cyan-500/50 transition-all text-xs text-zinc-400 cursor-pointer"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleCreateUser}
                  className="w-full py-4 rounded-xl bg-cyan-500 text-zinc-950 font-bold text-sm hover:bg-cyan-400 transition-all mt-4 flex items-center justify-center gap-2"
                >
                  <UserPlus size={18} />
                  Provision User Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT USER MODAL --- */}
      <AnimatePresence>
        {isEditUserModalOpen && selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditUserModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[32px] p-8 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold truncate max-w-[280px]">Edit Profile</h2>
                  <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold truncate">{selectedUser.email}</p>
                </div>
                <button onClick={() => setIsEditUserModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Full Name</label>
                  <input 
                    type="text" 
                    value={selectedUser.full_name || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, full_name: e.target.value})}
                    className="w-full h-12 bg-white/2 border border-white/5 rounded-xl px-4 outline-none focus:border-cyan-500/50 transition-all text-sm text-white"
                  />
                </div>

                {/* Credits Manager Block */}
                <div className="space-y-2.5 p-4 rounded-2xl bg-white/2 border border-white/5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Adjust Trace Credits</label>
                    <span className="text-xs font-mono font-bold text-white bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      Current: {selectedUser.credits || 0}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={selectedUser.credits || 0}
                      onChange={(e) => setSelectedUser({...selectedUser, credits: Number(e.target.value)})}
                      className="w-full h-11 bg-black/40 border border-white/5 rounded-xl px-3 outline-none focus:border-cyan-500/50 transition-all text-sm font-mono text-white"
                    />
                  </div>

                  {/* Predefined Quick Increments */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1.5">
                    {[
                      { label: '+10', value: 10 },
                      { label: '+50', value: 50 },
                      { label: '+100', value: 100 },
                      { label: 'Reset', value: 0, reset: true }
                    ].map((btn, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const currentVal = Number(selectedUser.credits || 0);
                          const nextVal = btn.reset ? 0 : currentVal + btn.value;
                          setSelectedUser({
                            ...selectedUser,
                            credits: nextVal
                          });
                        }}
                        className="py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/10 hover:text-cyan-400 border border-white/5 hover:border-cyan-500/20 font-mono text-[10px] text-zinc-400 font-bold transition-all"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Unlimited Days Tier Plan */}
                <div className="space-y-2.5 p-4 rounded-2xl bg-white/2 border border-white/5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Unlimited Plan Validity</label>
                    {selectedUser.unlimited_expiry && new Date(selectedUser.unlimited_expiry) > new Date() ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md uppercase">
                        Active Access
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500 uppercase bg-white/5 px-2 py-0.5 rounded-md">
                        No Active Plan
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <input 
                      type="datetime-local" 
                      value={selectedUser.unlimited_expiry ? new Date(new Date(selectedUser.unlimited_expiry).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedUser({
                          ...selectedUser,
                          unlimited_expiry: val ? new Date(val).toISOString() : null
                        });
                      }}
                      className="w-full h-11 bg-black/40 border border-white/5 rounded-xl px-3 outline-none focus:border-cyan-500/50 transition-all text-xs text-zinc-300 cursor-pointer"
                    />
                  </div>

                  {/* Predefined Quick Increments */}
                  <div className="grid grid-cols-5 gap-1 pt-1">
                    {[
                      { label: '+1 Hr', value: 1, unit: 'hour' },
                      { label: '+1 Day', value: 1, unit: 'day' },
                      { label: '+7 Days', value: 7, unit: 'day' },
                      { label: '+30 Days', value: 30, unit: 'day' },
                      { label: 'Clear', value: 0, clear: true }
                    ].map((btn, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (btn.clear) {
                            setSelectedUser({
                              ...selectedUser,
                              unlimited_expiry: null
                            });
                            return;
                          }
                          const base = selectedUser.unlimited_expiry && new Date(selectedUser.unlimited_expiry) > new Date() 
                            ? new Date(selectedUser.unlimited_expiry) 
                            : new Date();
                          
                          if (btn.unit === 'hour') {
                            base.setHours(base.getHours() + btn.value);
                          } else {
                            base.setDate(base.getDate() + btn.value);
                          }

                          setSelectedUser({
                            ...selectedUser,
                            unlimited_expiry: base.toISOString()
                          });
                        }}
                        className="py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/20 text-[9px] text-zinc-400 font-bold transition-all"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {selectedUser.unlimited_expiry && (
                    <div className="text-[10px] text-zinc-500 bg-black/30 p-2 rounded-lg font-bold uppercase tracking-wider text-center">
                      ⏱️ Expiry: {new Date(selectedUser.unlimited_expiry).toLocaleDateString()} {new Date(selectedUser.unlimited_expiry).toLocaleTimeString()}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleUpdateUser}
                    className="w-full py-4 rounded-xl bg-cyan-500 text-zinc-950 font-bold text-sm hover:bg-cyan-400 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Commit User Settings
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
