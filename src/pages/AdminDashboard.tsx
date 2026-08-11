import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Key, Settings, Activity, ShieldAlert, 
  Search, RefreshCcw, Save, Trash2, 
  TrendingUp, DollarSign, Clock, Hash,
  ChevronRight, AlertTriangle, ShieldCheck,
  PlusCircle, Edit2, X, Calendar, UserPlus, CreditCard, Eye, Layers, Database, CheckCircle, Globe,
  Gift, Percent, Tag, Sparkles, Wallet, Copy, Check
} from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabase';
import { getApiBaseUrl } from '../services/api';
import { getApiServices, updateApiServiceConfig, ApiServiceConfig } from '../services/apiServices';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';

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
  const activeTab = (searchParams.get('tab') || 'stats') as 'stats' | 'keys' | 'settings' | 'logs' | 'users' | 'transactions' | 'history' | 'services' | 'pricing' | 'referrals';
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [isServiceRoleActive, setIsServiceRoleActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // API Services & Rates State
  const [servicesList, setServicesList] = useState<ApiServiceConfig[]>([]);
  const [editingService, setEditingService] = useState<ApiServiceConfig | null>(null);
  const [isSavingService, setIsSavingService] = useState(false);
  const [serviceToast, setServiceToast] = useState<string | null>(null);

  // Custom User Pricing Rules State
  const [customPricingList, setCustomPricingList] = useState<any[]>([]);
  const [isAddPricingModalOpen, setIsAddPricingModalOpen] = useState(false);
  const [newCustomPricing, setNewCustomPricing] = useState({
    user_id: '',
    service_code: 'ALL',
    custom_price: '',
    discount_percent: '0'
  });

  // Referral Program State
  const [referralsList, setReferralsList] = useState<any[]>([]);
  const [referralEarningsList, setReferralEarningsList] = useState<any[]>([]);

  // Stats State
  const [keys, setKeys] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ real_api_url: '' });

  // Dynamic Provider API Mappings State
  const [providerConfigs, setProviderConfigs] = useState<Record<string, string>>({
    phone: "https://exploitsindia.site/anish-private-api/number.php?exploits={query}",
    aadhaar: "https://exploitsindia.site/anish-private-api/aadhar.php?exploits={query}",
    aadhaar_to_pan: "https://techvishalboss.com/panfind/api.php?api_key=c8117598aafa71238a4bf8377087b0ff&aadhaar_number={query}",
    pancard: "https://exploitsindia.site/osint-api/pancard.php?exploits={query}",
    ifsc: "https://exploitsindia.site/osint-api/ifsc.php?exploits={query}",
    vehicle: "https://techvishalboss.com/api/v1/lookup.php?key=TVB_SGL_BCFC1E32&service=vehicle&rc={query}",
    veh_owner_num: "http://uersxinfo.in/api?key=498wlpajf&type=veh_numm&term={query}",
    email: "http://uersxinfo.in/api?key=498wlpajf&type=mail&term={query}",
    telegram: "http://uersxinfo.in/api?key=498wlpajf&type=uers&term={query}",
    family: "https://exploitsindia.site/hdhddhjdjddjdjdjdndnddnnccndndhejdmdnnd/family.php?exploits={query}"
  });
  const [isSavingProviders, setIsSavingProviders] = useState(false);

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
    wallet_balance: 0,
    user_discount_percent: 0,
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
    if (authLoading) return;

    if (!user) {
      const timeout = setTimeout(() => {
        if (!user) navigate('/');
      }, 500);
      return () => clearTimeout(timeout);
    }
    
    const checkAdmin = async () => {
      const userEmail = (user?.email || '').toLowerCase();
      const isAuthorized = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);
      setIsAdmin(isAuthorized);
      setLoading(false);
    };

    checkAdmin();
  }, [user, authLoading]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

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
    const isFirstLoad = keys.length === 0 && profiles.length === 0 && logs.length === 0;
    if (isFirstLoad) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (token) {
        // 1. Fetch System Stats
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
              totalUsers: 0,
              uniqueVisitors: 0
            });
            setKeys(sysData.apiKeys || []);
            setLogs(sysData.apiLogs || []);
            if (sysData.settings) {
              setSettings(sysData.settings);
            }
          }
        } catch (sysErr) {
          console.error("Error fetching admin system data:", sysErr);
        }

        // 2. Fetch User Profiles
        try {
          const response = await fetch(`${getApiBaseUrl()}/api/admin/profiles`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const resJson = await response.json();
          if (response.ok && resJson.status === 'success') {
            setProfiles(resJson.data || []);
          }
        } catch (profileErr) {
          console.error("Error fetching profiles:", profileErr);
        }

        // 3. Fetch API Services
        try {
          const svcs = await getApiServices();
          setServicesList(svcs);
        } catch (svcErr) {
          console.error("Error fetching api services:", svcErr);
        }

        // 4. Fetch Custom Pricing Rules
        try {
          const cpRes = await fetch(`${getApiBaseUrl()}/api/admin/user-custom-pricing`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const cpJson = await cpRes.json();
          if (cpRes.ok && cpJson.status === 'success') {
            setCustomPricingList(cpJson.customPricings || []);
          }
        } catch (cpErr) {
          console.error("Error fetching custom pricing list:", cpErr);
        }

        // 5. Fetch Referrals & Commission Earnings
        try {
          const refRes = await fetch(`${getApiBaseUrl()}/api/admin/referrals`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const refJson = await refRes.json();
          if (refRes.ok && refJson.status === 'success') {
            setReferralsList(refJson.referrals || []);
            setReferralEarningsList(refJson.earnings || []);
          }
        } catch (refErr) {
          console.error("Error fetching referrals:", refErr);
        }

        // 6. Fetch Earnings & Transactions
        try {
          const earningsResponse = await fetch(`${getApiBaseUrl()}/api/admin/earnings`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const earningsJson = await earningsResponse.json();
          if (earningsResponse.ok && earningsJson.status === 'success') {
            setEarnings(earningsJson.summary || { today: 0, yesterday: 0, week: 0, total: 0 });
            setTransactions(earningsJson.transactions || []);
          }
        } catch (earningsErr) {
          console.error("Error fetching admin earnings:", earningsErr);
        }

        // 7. Fetch Search History Logs
        try {
          const historyResponse = await fetch(`${getApiBaseUrl()}/api/admin/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const historyJson = await historyResponse.json();
          if (historyResponse.ok && historyJson.status === 'success') {
            setHistoryLogs(historyJson.data || []);
          }
        } catch (historyErr) {
          console.error("Error fetching admin search history:", historyErr);
        }

        // 8. Fetch Provider Configurations
        try {
          const providerRes = await fetch(`${getApiBaseUrl()}/api/admin/provider-configs`);
          const providerJson = await providerRes.json();
          if (providerRes.ok && providerJson.status === 'success' && providerJson.configs) {
            setProviderConfigs(providerJson.configs);
          }
        } catch (providerErr) {
          console.error("Error fetching provider configs:", providerErr);
        }

      }
    } catch (err) {
      console.error("Data load error:", err);
    }

    setLoading(false);
    setIsRefreshing(false);
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

    const days = newKeyData.plan_name.includes("15 Days") ? 15 : 30;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    let error = null;
    if (token) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/admin/api-keys`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}`
          },
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
      error = { message: "No active session found." };
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

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    let error = null;

    if (token) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/admin/api-keys/${selectedKey.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            plan_name: selectedKey.plan_name,
            status: selectedKey.status,
            expires_at: selectedKey.expires_at,
            user_email: selectedKey.user_email
          })
        });
        if (!res.ok) {
          const json = await res.json();
          error = { message: json.error || json.message || "Failed to update API Key." };
        }
      } catch (e: any) {
        error = { message: e.message || "Network error updating API Key." };
      }
    } else {
      error = { message: "No active session found." };
    }

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
    if (token) {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/api-keys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    }
  };

  const handleCreateCustomPricing = async () => {
    if (!newCustomPricing.user_id) {
      alert("Please select or enter a User ID!");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert("Session token not found. Please log in again.");
        return;
      }

      const res = await fetch(`${getApiBaseUrl()}/api/admin/user-custom-pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: newCustomPricing.user_id,
          service_code: newCustomPricing.service_code,
          custom_price: newCustomPricing.custom_price !== '' ? Number(newCustomPricing.custom_price) : null,
          discount_percent: Number(newCustomPricing.discount_percent || 0)
        })
      });

      const resJson = await res.json();
      if (res.ok && resJson.status === 'success') {
        setIsAddPricingModalOpen(false);
        setNewCustomPricing({ user_id: '', service_code: 'ALL', custom_price: '', discount_percent: '0' });
        fetchData();
        alert("Custom pricing override created successfully!");
      } else {
        alert("Error saving rule: " + (resJson.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error creating custom pricing: " + err.message);
    }
  };

  const handleDeleteCustomPricing = async (id: string) => {
    if (!confirm("Are you sure you want to remove this custom pricing override?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`${getApiBaseUrl()}/api/admin/user-custom-pricing/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resJson = await res.json();
      if (res.ok && resJson.status === 'success') {
        fetchData();
        alert("Custom pricing override removed!");
      } else {
        alert("Failed to delete override: " + (resJson.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error deleting override: " + err.message);
    }
  };

  const handleUpdateSettings = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    let error = null;

    if (token) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/admin/api-settings`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id: settings.id || undefined,
            real_api_url: settings.real_api_url
          })
        });
        if (!res.ok) {
          const json = await res.json();
          error = { message: json.error || json.message || "Failed to update settings." };
        }
      } catch (e: any) {
        error = { message: e.message || "Network error saving settings." };
      }
    } else {
      error = { message: "No active session found." };
    }

    if (error) {
      alert("Error saving settings: " + error.message);
    } else {
      alert("Settings Saved Successfully!");
    }
  };

  const handleSaveProviderConfigs = async () => {
    setIsSavingProviders(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${getApiBaseUrl()}/api/admin/provider-configs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ configs: providerConfigs })
      });
      const json = await res.json().catch(() => ({ error: 'Invalid JSON response from server' }));
      if (res.ok && (json.status === 'success' || json.configs)) {
        alert("Provider API Routing Configurations updated successfully! All live lookups will now use the updated provider endpoints.");
        fetchData();
      } else {
        const errMsg = json.error || json.message || json.detail || (res.statusText ? `${res.status} ${res.statusText}` : 'Unknown error');
        alert("Failed to update provider configurations: " + errMsg);
      }
    } catch (err: any) {
      alert("Error updating provider configs: " + (err.message || err));
    } finally {
      setIsSavingProviders(false);
    }
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
          wallet_balance: Number(newUserProfileData.wallet_balance || 0),
          user_discount_percent: Number(newUserProfileData.user_discount_percent || 0),
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
          wallet_balance: 0,
          user_discount_percent: 0,
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
          wallet_balance: Number(selectedUser.wallet_balance || 0),
          user_discount_percent: Number(selectedUser.user_discount_percent || 0),
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
        headers: { 'Authorization': `Bearer ${token}` }
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

  if (loading) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <LiquidBackground />
      <RefreshCcw className="animate-spin text-indigo-600" size={32} />
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col items-center justify-center p-4">
      <LiquidBackground />
      <ShieldAlert size={64} className="text-rose-500 mb-6" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-slate-600 text-center max-w-sm mb-8 font-medium">This area is restricted to TraceXData administrators only.</p>
        <button onClick={() => navigate('/')} className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all cursor-pointer">Return Home</button>
      </div>
    );
  }

  const tabs = [
    { id: 'stats', label: 'Dashboard', icon: TrendingUp },
    { id: 'services', label: 'APIs & Rates', icon: Layers },
    { id: 'pricing', label: 'Custom Pricing', icon: Tag },
    { id: 'users', label: 'User Manager', icon: Users },
    { id: 'referrals', label: 'Referral Program', icon: Gift },
    { id: 'keys', label: 'Key Manager', icon: Key },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'history', label: 'Search History', icon: Clock },
    { id: 'settings', label: 'Gateway Settings', icon: Settings },
    { id: 'logs', label: 'Trace Logs', icon: Activity }
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      <LiquidBackground />
      
      {/* Admin Sidebar */}
      <nav className="fixed left-0 top-0 bottom-0 w-64 bg-white/90 border-r border-slate-200/80 backdrop-blur-3xl hidden lg:flex flex-col p-6 z-[70] shadow-sm">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/20">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-lg text-slate-900 block">TraceX Core</span>
            <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-widest block">Admin Control Panel</span>
          </div>
        </div>

        <div className="space-y-1 overflow-y-auto custom-scrollbar pr-1 flex-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-600/20' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <tab.icon size={17} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-200">
           <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 text-xs font-bold transition-all">
             <ChevronRight size={17} />
             Exit Admin Panel
           </button>
        </div>
      </nav>

      {/* Mobile Navigation Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 border-b border-slate-200 bg-white/90 backdrop-blur-2xl z-[60] shadow-sm">
        <div className="p-4 flex items-center justify-between border-b border-slate-200/60">
          <span className="font-extrabold text-xs uppercase tracking-widest text-indigo-600 flex items-center gap-2">
            <ShieldCheck size={16} /> TraceX Admin Core
          </span>
          <button onClick={() => navigate('/')} className="text-slate-600 hover:text-slate-900 flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
            Exit
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex gap-2 p-3 overflow-x-auto scrollbar-none bg-slate-50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === tab.id ? 'bg-indigo-600 text-white font-extrabold shadow-sm shadow-indigo-600/20' : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="lg:ml-64 pt-36 lg:pt-10 px-4 md:px-8 max-w-7xl mx-auto">
        {isServiceRoleActive === false && (
          <div className="mb-8 p-5 rounded-2xl bg-amber-50 border border-amber-200 flex gap-4 text-amber-900 shadow-xs">
            <div className="text-amber-600 shrink-0 mt-0.5">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Database Warning: Supabase Service Role Key Missing</h4>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Your backend server is running in fallback mode using the Public Anon Key. While some actions work,
                Supabase Row Level Security (RLS) is active and prevents reading full profiles, api keys, and transaction ledgers.
              </p>
            </div>
          </div>
        )}

        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-black capitalize text-slate-900 flex items-center gap-3">
              {tabs.find(t => t.id === activeTab)?.label || 'Admin'} Panel
            </h1>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">TraceX Realtime SaaS Control Center</p>
          </div>
          <div className="flex gap-3">
             {activeTab === 'users' && (
               <button 
                 onClick={() => setIsAddUserModalOpen(true)}
                 className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
               >
                 <UserPlus size={16} />
                 Register User Profile
               </button>
             )}
             {activeTab === 'pricing' && (
               <button 
                 onClick={() => setIsAddPricingModalOpen(true)}
                 className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
               >
                 <PlusCircle size={16} />
                 Add Custom Price / Discount
               </button>
             )}
             {activeTab === 'keys' && (
               <button 
                 onClick={() => setIsAddModalOpen(true)}
                 className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
               >
                 <PlusCircle size={16} />
                 Generate Key
               </button>
             )}
             <button 
               onClick={fetchData} 
               disabled={isRefreshing}
               className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
               title="Refresh Data"
             >
               <RefreshCcw size={18} className={isRefreshing ? "animate-spin text-indigo-600" : ""} />
             </button>
          </div>
        </header>

        {/* --- STATS DASHBOARD VIEW --- */}
        {activeTab === 'stats' && (
          <div className="space-y-8">
            {/* Live Cashflow Revenue Summary */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-800 mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="animate-pulse text-emerald-600" />
                Live Revenue Cashflow Ledger
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Today's Revenue</span>
                    <div className="text-3xl font-black text-emerald-600 mt-2 font-mono">₹{earnings.today || 0}</div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 font-semibold uppercase">Updated live</p>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Yesterday's Revenue</span>
                    <div className="text-3xl font-black text-amber-600 mt-2 font-mono">₹{earnings.yesterday || 0}</div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 font-semibold uppercase">24h cycle</p>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-indigo-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rolling 7 Days</span>
                    <div className="text-3xl font-black text-indigo-600 mt-2 font-mono">₹{earnings.week || 0}</div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 font-semibold uppercase">Full week total</p>
                </div>
              </div>
            </div>

            {/* Core Platform Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Cumulative Revenue', value: `₹${earnings.total || stats.revenue || 0}`, icon: DollarSign, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
                { label: 'Active API Keys', value: stats.totalKeys || keys.length, icon: Key, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
                { label: 'Total API Traces', value: stats.totalRequests || logs.length, icon: Activity, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                { label: 'Registered Users', value: stats.totalUsers || profiles.length, icon: Users, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
                { label: 'Unique Visitors', value: stats.uniqueVisitors ?? 0, icon: Eye, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' }
              ].map(card => (
                <div key={card.label} className="p-5 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5">
                  <div className={`p-2.5 w-fit rounded-xl border ${card.bg} ${card.color} mb-3`}>
                     <card.icon size={18} />
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono">{card.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Recent Logs & Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent System API Logs */}
              <div className="p-6 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 flex flex-col h-[480px]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-4 flex items-center gap-2 shrink-0">
                  <Clock size={14} className="text-indigo-600" />
                  Recent Trace API Calls
                </h3>
                <div className="overflow-y-auto pr-1 flex-grow space-y-2.5 custom-scrollbar">
                  {logs.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 uppercase tracking-widest font-bold">No activity registered today</p>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/80 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${log.status === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500'}`}></div>
                          <div>
                             <div className="text-xs text-slate-900 font-bold font-mono">{log.masked_number}</div>
                             <div className="text-[9px] text-slate-400 mt-0.5">{new Date(log.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{log.response_time_ms}ms</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Latest Transactions */}
              <div className="p-6 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 flex flex-col h-[480px]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-4 flex items-center gap-2 shrink-0">
                  <CreditCard size={14} className="text-emerald-600" />
                  Latest Successful Deposits & Claims
                </h3>
                <div className="overflow-y-auto pr-1 flex-grow space-y-2.5 custom-scrollbar">
                  {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <CreditCard size={32} className="mb-2 opacity-50 text-slate-300" />
                      <p className="text-[10px] uppercase font-bold tracking-widest">No transaction claims found</p>
                    </div>
                  ) : (
                    transactions.map((tx, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 hover:bg-emerald-50 transition-all flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold block text-slate-900 truncate max-w-[200px]">{tx.user_email || 'Guest User'}</span>
                            <span className="text-[9px] font-mono font-bold text-slate-500">REF: {tx.payment_id}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-black text-emerald-600 block">+₹{tx.amount || 0}</span>
                            <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">{tx.plan_id}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center border-t border-emerald-200/50 pt-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">
                          <span className="text-emerald-700">Verified & Added</span>
                          <span className="text-[9px] font-mono text-slate-400 normal-case">{new Date(tx.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- CUSTOM USER PRICING & DISCOUNTS TAB --- */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs font-bold uppercase tracking-wider mb-1">
                  <Tag size={14} />
                  Admin Rate Controller
                </div>
                <h2 className="text-xl font-bold text-slate-900">Custom User Pricing & Individual API Discounts</h2>
                <p className="text-xs text-slate-500 mt-1">Provide special discounted API prices or flat percentage discounts to specific user accounts.</p>
              </div>
              <button
                onClick={() => setIsAddPricingModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition-all w-fit cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <PlusCircle size={16} />
                Create Custom Override
              </button>
            </div>

            <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      <th className="px-6 py-4">User Email / ID</th>
                      <th className="px-6 py-4">Target Service</th>
                      <th className="px-6 py-4">Custom Price</th>
                      <th className="px-6 py-4">Discount %</th>
                      <th className="px-6 py-4">Created At</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                    {customPricingList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 uppercase font-bold tracking-widest">
                          No custom pricing rules configured yet.
                        </td>
                      </tr>
                    ) : (
                      customPricingList.map(rule => (
                        <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{rule.user_email || rule.profiles?.email || 'N/A'}</div>
                            <div className="text-[10px] font-mono text-slate-400">{rule.user_id}</div>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                            {rule.service_code === 'ALL' ? '🌟 ALL SERVICES' : rule.service_code}
                          </td>
                          <td className="px-6 py-4 font-mono text-emerald-600 font-extrabold">
                            {rule.custom_price !== null && rule.custom_price !== undefined ? `₹${rule.custom_price}` : 'Default Fee'}
                          </td>
                          <td className="px-6 py-4 font-mono text-amber-600 font-bold">
                            {rule.discount_percent ? `${rule.discount_percent}% OFF` : '0%'}
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                            {new Date(rule.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleDeleteCustomPricing(rule.id)}
                              className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-all"
                              title="Delete Override"
                            >
                              <Trash2 size={16} />
                            </button>
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

        {/* --- REFERRAL PROGRAM & COMMISSIONS TAB --- */}
        {activeTab === 'referrals' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-600 font-mono text-xs font-bold uppercase tracking-wider mb-1">
                  <Gift size={14} />
                  Affiliate & Referral System
                </div>
                <h2 className="text-xl font-bold text-slate-900">Referral Network & 5% Deposit Commission Ledger</h2>
                <p className="text-xs text-slate-500 mt-1">Track referrer accounts, referred registrations, and automatic 5% wallet deposit commissions.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-5 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Active Referrers</div>
                <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  {referralsList.length} Accounts
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">5% Commissions Paid Out</div>
                <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                  ₹{referralEarningsList.reduce((sum, item) => sum + (Number(item.commission_amount) || 0), 0).toFixed(2)}
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Referred User Deposits</div>
                <div className="text-2xl font-black text-indigo-600 mt-1 font-mono">
                  ₹{referralEarningsList.reduce((sum, item) => sum + (Number(item.deposit_amount) || 0), 0).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 font-extrabold text-xs uppercase text-slate-700 tracking-wider bg-slate-50">
                Recent 5% Referral Commission Earnings Log
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      <th className="px-6 py-4">Referrer (Owner)</th>
                      <th className="px-6 py-4">Referred Depositor</th>
                      <th className="px-6 py-4">Deposit Amount</th>
                      <th className="px-6 py-4">5% Commission</th>
                      <th className="px-6 py-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                    {referralEarningsList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 uppercase font-bold tracking-widest">
                          No referral commission logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      referralEarningsList.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {item.referrer_email || item.referrer_id}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {item.referred_email || item.referred_id}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-900 font-bold">
                            ₹{item.deposit_amount}
                          </td>
                          <td className="px-6 py-4 font-mono text-emerald-600 font-black">
                            +₹{item.commission_amount} (5%)
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                            {new Date(item.created_at).toLocaleString()}
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

        {/* --- API SERVICES & RATES MANAGER TAB --- */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            {serviceToast && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 animate-bounce shadow-xs">
                <CheckCircle size={18} className="text-emerald-600" />
                {serviceToast}
              </div>
            )}

            <div className="p-6 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs font-bold uppercase tracking-wider mb-1">
                  <Database size={14} />
                  Supabase Live Sync
                </div>
                <h2 className="text-xl font-bold text-slate-900">API Services & Rate Management</h2>
                <p className="text-xs text-slate-500 mt-1">Manage base lookup fees, descriptions, and active status across all API routes.</p>
              </div>
              <button
                onClick={async () => {
                  setIsRefreshing(true);
                  const data = await getApiServices();
                  setServicesList(data);
                  setIsRefreshing(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all w-fit cursor-pointer border border-slate-200"
              >
                <RefreshCcw size={14} className={isRefreshing ? "animate-spin text-indigo-600" : ""} />
                Sync Rates
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {servicesList.map((service) => (
                <div 
                  key={service.id} 
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {service.service_code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        service.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {service.is_active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base mb-1">{service.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">{service.description}</p>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between mb-4">
                      <span className="text-xs font-medium text-slate-500">Rate per Lookup</span>
                      <span className="text-lg font-black text-indigo-600 font-mono">₹{service.fee}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingService({ ...service })}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                  >
                    <Edit2 size={14} />
                    Modify Rate / Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- USER MANAGER VIEW --- */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Users size={14} className="text-indigo-600" />
                Registered Platform Users ({profiles.length})
              </h3>
              <button 
                onClick={() => setIsAddUserModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <UserPlus size={14} />
                Register New Profile
              </button>
            </div>

            {/* Unified Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                placeholder="Search by Email, Referral Code, or Name..."
                className="w-full h-12 bg-white border border-slate-200 rounded-xl pl-12 pr-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-xs md:text-sm text-slate-900 placeholder:text-slate-400 shadow-xs"
              />
              {searchUserQuery && (
                <button 
                  onClick={() => setSearchUserQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 text-xs font-bold bg-slate-100 px-2 py-1 rounded"
                >
                  Clear
                </button>
              )}
            </div>

            {(() => {
              const query = (searchUserQuery || '').trim().toLowerCase();
              const filteredProfiles = profiles.filter(p => {
                if (!query) return true;
                const email = (p.email || '').toLowerCase();
                const id = (p.id || '').toLowerCase();
                const fullName = (p.full_name || '').toLowerCase();
                const refCode = (p.referral_code || '').toLowerCase();
                return email.includes(query) || id.includes(query) || fullName.includes(query) || refCode.includes(query);
              });

              return (
                <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                          <th className="px-6 py-4">User Context</th>
                          <th className="px-6 py-4">Wallet Balance</th>
                          <th className="px-6 py-4">Discount</th>
                          <th className="px-6 py-4">Credits</th>
                          <th className="px-6 py-4">Unlimited Plan</th>
                          <th className="px-6 py-4">Referral Code</th>
                          <th className="px-6 py-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                        {filteredProfiles.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">
                              No registered users found
                            </td>
                          </tr>
                        ) : (
                          filteredProfiles.map(p => {
                            const hasUnlimited = p.unlimited_expiry && new Date(p.unlimited_expiry) > new Date();
                            const isUserAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === (p.email || '').toLowerCase());
                            
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{p.full_name || 'No Name'}</span>
                                    {isUserAdmin && (
                                      <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded-full font-bold">Admin</span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">{p.email}</div>
                                </td>
                                <td className="px-6 py-4 font-mono font-black text-emerald-600">
                                  ₹{p.wallet_balance || 0}
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-amber-600">
                                  {p.user_discount_percent ? `${p.user_discount_percent}% OFF` : '0%'}
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                                  {p.credits || 0} credits
                                </td>
                                <td className="px-6 py-4">
                                  {hasUnlimited ? (
                                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase">
                                      Expires: {new Date(p.unlimited_expiry!).toLocaleDateString()}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">No active plan</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 font-mono text-indigo-600 text-[11px]">
                                  {p.referral_code || 'N/A'}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => {
                                        setSelectedUser(JSON.parse(JSON.stringify(p)));
                                        setIsEditUserModalOpen(true);
                                      }}
                                      className="text-indigo-600 hover:text-indigo-800 transition-colors p-2 cursor-pointer"
                                      title="Edit Profile"
                                    >
                                      <Edit2 size={15} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteUser(p.id, p.email)}
                                      className="text-rose-600 hover:text-rose-800 transition-colors p-2 cursor-pointer"
                                      title="Delete Profile"
                                    >
                                      <Trash2 size={15} />
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
              );
            })()}
          </div>
        )}

        {/* --- TRANSACTIONS VIEW --- */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <CreditCard size={14} className="text-emerald-600" />
                Payment Gateway Transactions
              </h3>
              <button 
                onClick={fetchData} 
                disabled={isRefreshing}
                className="px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <RefreshCcw size={14} className={isRefreshing ? "animate-spin text-indigo-600" : ""} />
                Refresh Logs
              </button>
            </div>

            <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      <th className="px-6 py-4">User Email</th>
                      <th className="px-6 py-4">Order / Ref ID</th>
                      <th className="px-6 py-4">Plan Code</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 uppercase font-bold tracking-widest">
                          No transaction records found
                        </td>
                      </tr>
                    ) : (
                      transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {tx.user_email || 'Guest User'}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-500 text-[11px]">
                            {tx.payment_id}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-700">
                            {tx.plan_id}
                          </td>
                          <td className="px-6 py-4 font-mono text-emerald-600 font-bold">
                            ₹{tx.amount}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[9px] border border-emerald-200 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold uppercase">
                              {tx.status || 'SUCCESS'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                            {new Date(tx.created_at).toLocaleString()}
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

        {/* --- SEARCH HISTORY VIEW --- */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Clock size={14} className="text-indigo-600" />
                Global Search Query Logs
              </h3>
            </div>

            <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Search Type</th>
                      <th className="px-6 py-4">Searched Query</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                    {historyLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 uppercase font-bold tracking-widest">
                          No search history logs found
                        </td>
                      </tr>
                    ) : (
                      historyLogs.map((log, index) => (
                        <tr key={log.id || index} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {log.user_email || 'Guest User'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] text-indigo-700 font-mono bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded uppercase font-bold">
                              {log.search_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-900 select-all break-all max-w-[250px] font-medium">
                            {log.query}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[9px] border px-2 py-0.5 rounded-full font-bold uppercase ${
                              log.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {log.status || 'SUCCESS'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                            {new Date(log.created_at).toLocaleString()}
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

        {/* --- KEY MANAGER VIEW --- */}
        {activeTab === 'keys' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                 <Key size={14} className="text-indigo-600" />
                 Active Platform API Keys
               </h3>
               <button 
                 onClick={() => setIsAddModalOpen(true)}
                 className="px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
               >
                 <PlusCircle size={14} />
                 Generate New Key
               </button>
            </div>

            <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                      <th className="px-6 py-4">Owner Email</th>
                      <th className="px-6 py-4">API Key Secret</th>
                      <th className="px-6 py-4">Plan Name</th>
                      <th className="px-6 py-4">Expiry Date</th>
                      <th className="px-6 py-4">Total Usage</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                    {keys.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">
                          No API keys found
                        </td>
                      </tr>
                    ) : (
                      keys.map(key => {
                        const keyString = key.api_key || "";
                        const displayKey = keyString ? (keyString.length > 12 ? `${keyString.substring(0, 12)}...` : keyString) : "N/A";
                        const expiryString = key.expires_at ? new Date(key.expires_at).toLocaleDateString() : "Never";
                        
                        return (
                          <tr key={key.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900">
                              {key.user_email || "No Email"}
                            </td>
                            <td className="px-6 py-4 font-mono text-indigo-600 text-xs">
                              <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-bold">{displayKey}</span>
                            </td>
                            <td className="px-6 py-4 text-slate-700 font-medium">
                              {key.plan_name || "N/A"}
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                              {expiryString}
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-emerald-600">
                              {key.requests_used || 0} reqs
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => {
                                    const baseDomain = getApiBaseUrl().replace(/\/$/, "");
                                    const targetUrl = `${baseDomain}/api/lookup?key=${key.api_key}&number=9879712345`;
                                    navigator.clipboard.writeText(targetUrl);
                                    alert('API URL Copied!');
                                  }}
                                  className="text-emerald-600 hover:text-emerald-800 transition-colors p-2 cursor-pointer"
                                  title="Copy URL"
                                >
                                  <Copy size={15} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedKey(key);
                                    setIsEditModalOpen(true);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-800 transition-colors p-2 cursor-pointer"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteKey(key.id)}
                                  className="text-rose-600 hover:text-rose-800 transition-colors p-2 cursor-pointer"
                                >
                                  <Trash2 size={15} />
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
          </div>
        )}

        {/* --- SETTINGS VIEW --- */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-8">
            <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 rounded-3xl p-8 space-y-6">
               <div className="flex items-center gap-3 text-amber-600 mb-2">
                 <AlertTriangle size={20} />
                 <h3 className="font-bold text-slate-900 text-lg">Engine Gateway Configuration</h3>
               </div>
               <p className="text-slate-500 text-xs leading-relaxed pb-2">
                 Update the upstream real API URL. Use 
                 <code className="text-indigo-600 mx-1 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold">ENTER_TARGET_HERE</code> for target placeholder.
               </p>

               <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Master Real API URL</label>
                   <input 
                     type="text" 
                     value={settings.real_api_url}
                     onChange={(e) => setSettings({ ...settings, real_api_url: e.target.value })}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-xs font-mono text-slate-900 focus:border-indigo-500 outline-none"
                     placeholder="https://api.example.com?query=ENTER_TARGET_HERE"
                   />
                 </div>

                 <button 
                   onClick={handleUpdateSettings}
                   className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 transition-all"
                 >
                   <Save size={16} />
                   Save Gateway Settings
                 </button>
               </div>
            </div>

            <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 rounded-3xl p-8 space-y-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3 text-indigo-600">
                   <Globe size={20} />
                   <h3 className="font-bold text-slate-900 text-lg">Upstream Provider Routing Mappings</h3>
                 </div>
               </div>

               <div className="grid grid-cols-1 gap-4">
                 {[
                   { key: 'phone', label: 'Mobile Number OSINT Provider', icon: '📱' },
                   { key: 'aadhaar', label: 'Aadhaar Card Lookup Provider', icon: '🆔' },
                   { key: 'aadhaar_to_pan', label: 'Aadhaar to PAN Find Provider', icon: '💳' },
                   { key: 'pancard', label: 'PAN Card Details Provider', icon: '📄' },
                   { key: 'ifsc', label: 'Bank IFSC Details Provider', icon: '🏦' },
                   { key: 'vehicle', label: 'Vehicle RC Information Provider', icon: '🚗' },
                   { key: 'veh_owner_num', label: 'Vehicle Owner Number Lookup', icon: '🏎️' },
                   { key: 'email', label: 'Email Intelligence OSINT Provider', icon: '📧' },
                   { key: 'telegram', label: 'Telegram Account OSINT Provider', icon: '✈️' },
                   { key: 'family', label: 'Ration / Family Tree Provider', icon: '🌾' }
                 ].map(item => (
                   <div key={item.key} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                     <div className="flex items-center justify-between text-xs">
                       <span className="font-bold text-slate-700 flex items-center gap-2">
                         <span>{item.icon}</span>
                         {item.label}
                       </span>
                       <code className="text-[10px] text-slate-400 font-mono font-bold">[{item.key}]</code>
                     </div>
                     <input 
                       type="text" 
                       value={providerConfigs[item.key] || ''}
                       onChange={(e) => setProviderConfigs({ ...providerConfigs, [item.key]: e.target.value })}
                       className="w-full bg-white border border-slate-200 px-3 py-2 text-xs font-mono text-indigo-700 rounded-lg focus:border-indigo-500 outline-none"
                       placeholder="https://provider.com/api?term={query}"
                     />
                   </div>
                 ))}
               </div>

               <button 
                 onClick={handleSaveProviderConfigs}
                 disabled={isSavingProviders}
                 className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-600/20 transition-all"
               >
                 <Save size={16} />
                 {isSavingProviders ? "Saving Provider Configurations..." : "Save Provider API Mappings"}
               </button>
            </div>
          </div>
        )}

        {/* --- TRACE LOGS VIEW --- */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
             <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-4">
               <Activity size={14} className="text-indigo-600" />
               Trace Logs Audit Registry
             </h3>
             
             <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 rounded-2xl overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                       <th className="px-6 py-4">Timestamp</th>
                       <th className="px-6 py-4">Query Target</th>
                       <th className="px-6 py-4">API Email</th>
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4">Latency</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                     {logs.length === 0 ? (
                       <tr>
                         <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">
                           No log records found
                         </td>
                       </tr>
                     ) : (
                       logs.map((log, i) => (
                         <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                           <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                             {new Date(log.created_at).toLocaleString()}
                           </td>
                           <td className="px-6 py-4 font-mono text-slate-900 font-bold">
                             {log.masked_number}
                           </td>
                           <td className="px-6 py-4 text-slate-600">
                             {log.api_keys?.user_email || 'Internal / Proxy'}
                           </td>
                           <td className="px-6 py-4">
                             <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                               log.status === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                             }`}>
                               {log.status}
                             </span>
                           </td>
                           <td className="px-6 py-4 text-xs font-mono text-indigo-600 font-bold">
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

      </main>

      {/* --- ADD CUSTOM PRICING MODAL --- */}
      <AnimatePresence>
        {isAddPricingModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddPricingModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-8 overflow-hidden shadow-2xl z-10 text-slate-900 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-bold">Add Custom User Price / Discount</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Assign special rates or discounts to specific users.</p>
                </div>
                <button onClick={() => setIsAddPricingModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Target User</label>
                  <select 
                    value={newCustomPricing.user_id}
                    onChange={(e) => setNewCustomPricing({ ...newCustomPricing, user_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Select User Account --</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.email} ({p.full_name || 'No Name'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Target API Service</label>
                  <select 
                    value={newCustomPricing.service_code}
                    onChange={(e) => setNewCustomPricing({ ...newCustomPricing, service_code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">🌟 ALL SERVICES (Flat Override)</option>
                    {servicesList.map(s => (
                      <option key={s.service_code} value={s.service_code}>{s.title} ({s.service_code})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-indigo-600 font-bold uppercase mb-1">Fixed Price Override (₹)</label>
                    <input 
                      type="number"
                      step="0.5"
                      placeholder="e.g. 2.0"
                      value={newCustomPricing.custom_price}
                      onChange={(e) => setNewCustomPricing({ ...newCustomPricing, custom_price: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-amber-600 font-bold uppercase mb-1">Discount %</label>
                    <input 
                      type="number"
                      placeholder="e.g. 20"
                      value={newCustomPricing.discount_percent}
                      onChange={(e) => setNewCustomPricing({ ...newCustomPricing, discount_percent: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleCreateCustomPricing}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all mt-4 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Save size={16} />
                  Save Custom Rule
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-8 overflow-hidden shadow-2xl z-10 text-slate-900 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-bold">Register User Profile</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Create a user profile directly in the database.</p>
                </div>
                <button onClick={() => setIsAddUserModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Email ID</label>
                  <input 
                    type="email" 
                    value={newUserProfileData.email}
                    onChange={(e) => setNewUserProfileData({...newUserProfileData, email: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={newUserProfileData.full_name}
                    onChange={(e) => setNewUserProfileData({...newUserProfileData, full_name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                    placeholder="e.g. Gaurav Beniwal"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-indigo-600 font-bold uppercase mb-1">Credits</label>
                    <input 
                      type="number" 
                      value={newUserProfileData.credits}
                      onChange={(e) => setNewUserProfileData({...newUserProfileData, credits: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-emerald-600 font-bold uppercase mb-1">Wallet ₹</label>
                    <input 
                      type="number" 
                      value={newUserProfileData.wallet_balance}
                      onChange={(e) => setNewUserProfileData({...newUserProfileData, wallet_balance: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-amber-600 font-bold uppercase mb-1">Discount %</label>
                    <input 
                      type="number" 
                      value={newUserProfileData.user_discount_percent}
                      onChange={(e) => setNewUserProfileData({...newUserProfileData, user_discount_percent: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleCreateUser}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all mt-4 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <UserPlus size={16} />
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-8 overflow-hidden shadow-2xl z-10 text-slate-900 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-bold">Edit Profile & Account Balances</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedUser.email}</p>
                </div>
                <button onClick={() => setIsEditUserModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={selectedUser.full_name || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, full_name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-emerald-600 font-bold uppercase mb-1">Wallet Balance (₹ INR)</label>
                    <input 
                      type="number" 
                      value={selectedUser.wallet_balance || 0}
                      onChange={(e) => setSelectedUser({...selectedUser, wallet_balance: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-amber-600 font-bold uppercase mb-1">User Discount (%)</label>
                    <input 
                      type="number" 
                      value={selectedUser.user_discount_percent || 0}
                      onChange={(e) => setSelectedUser({...selectedUser, user_discount_percent: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-indigo-600 font-bold uppercase mb-1">Trace Credits Balance</label>
                  <input 
                    type="number" 
                    value={selectedUser.credits || 0}
                    onChange={(e) => setSelectedUser({...selectedUser, credits: Number(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono"
                  />
                  <div className="flex gap-2 mt-2">
                    {[10, 50, 100, 500].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSelectedUser({ ...selectedUser, credits: (Number(selectedUser.credits) || 0) + amt })}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-indigo-50 text-indigo-700 font-mono text-[10px] border border-slate-200 font-bold"
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Unlimited Expiry Date</label>
                  <input 
                    type="datetime-local" 
                    value={selectedUser.unlimited_expiry ? new Date(new Date(selectedUser.unlimited_expiry).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, unlimited_expiry: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-700 font-mono text-xs"
                  />
                  <div className="flex gap-2 mt-2">
                    {[
                      { label: '+1 Day', days: 1 },
                      { label: '+7 Days', days: 7 },
                      { label: '+30 Days', days: 30 },
                      { label: 'Clear', clear: true }
                    ].map((b, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (b.clear) {
                            setSelectedUser({ ...selectedUser, unlimited_expiry: null });
                            return;
                          }
                          const next = new Date();
                          next.setDate(next.getDate() + b.days);
                          setSelectedUser({ ...selectedUser, unlimited_expiry: next.toISOString() });
                        }}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-slate-200"
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleUpdateUser}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all mt-4 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Save size={16} />
                  Save & Commit Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD KEY MODAL --- */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-8 overflow-hidden shadow-2xl z-10 text-slate-900 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-bold">Generate API Key</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Authorize a new developer API key.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Customer Email</label>
                  <input 
                    type="email" 
                    value={newKeyData.user_email}
                    onChange={(e) => setNewKeyData({...newKeyData, user_email: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                    placeholder="customer@example.com"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Access Plan</label>
                  <select 
                    value={newKeyData.plan_name}
                    onChange={(e) => setNewKeyData({...newKeyData, plan_name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                  >
                    <option value="Unified Pro API (15 Days)">Unified Pro API (15 Days)</option>
                    <option value="Unified Infinity API (30 Days)">Unified Infinity API (30 Days)</option>
                    <option value="Number Lookup (1 Month)">Number Lookup (1 Month)</option>
                    <option value="Telegram Lookup (1 Month)">Telegram Lookup (1 Month)</option>
                    <option value="Identity Card Lookup (1 Month)">Identity Card Lookup (1 Month)</option>
                    <option value="BA&NK Lookup (1 Month)">BA&NK Lookup (1 Month)</option>
                    <option value="Vehicle Lookup (1 Month)">Vehicle Lookup (1 Month)</option>
                    <option value="Vehicle To Owner Lookup (1 Month)">Vehicle To Owner Lookup (1 Month)</option>
                    <option value="PN Card Lookup (1 Month)">PN Card Lookup (1 Month)</option>
                    <option value="Email Lookup (1 Month)">Email Lookup (1 Month)</option>
                    <option value="All Combo Special (1 Month)">All Combo Special (1 Month)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Custom Key Secret (Optional)</label>
                  <input 
                    type="text" 
                    value={newKeyData.custom_key}
                    onChange={(e) => setNewKeyData({...newKeyData, custom_key: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-mono"
                    placeholder="Leave empty for auto-generated secret"
                  />
                </div>

                <button 
                  onClick={handleGenerateKey}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all mt-4 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Key size={16} />
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-8 overflow-hidden shadow-2xl z-10 text-slate-900 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-bold">Edit API Key Rules</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedKey.api_key}</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Owner Email</label>
                  <input 
                    type="email" 
                    value={selectedKey.user_email}
                    onChange={(e) => setSelectedKey({...selectedKey, user_email: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 font-bold uppercase mb-1">Plan</label>
                    <select 
                      value={selectedKey.plan_name}
                      onChange={(e) => setSelectedKey({...selectedKey, plan_name: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                    >
                      <option value="Unified Pro API (15 Days)">Unified Pro API (15 Days)</option>
                      <option value="Unified Infinity API (30 Days)">Unified Infinity API (30 Days)</option>
                      <option value="Number Lookup (1 Month)">Number Lookup (1 Month)</option>
                      <option value="Telegram Lookup (1 Month)">Telegram Lookup (1 Month)</option>
                      <option value="Identity Card Lookup (1 Month)">Identity Card Lookup (1 Month)</option>
                      <option value="BA&NK Lookup (1 Month)">BA&NK Lookup (1 Month)</option>
                      <option value="Vehicle Lookup (1 Month)">Vehicle Lookup (1 Month)</option>
                      <option value="PN Card Lookup (1 Month)">PN Card Lookup (1 Month)</option>
                      <option value="Email Lookup (1 Month)">Email Lookup (1 Month)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold uppercase mb-1">Status</label>
                    <select 
                      value={selectedKey.status}
                      onChange={(e) => setSelectedKey({...selectedKey, status: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="revoked">Revoked</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleUpdateKey}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all mt-4 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Save size={16} />
                  Update Access Rules
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT API SERVICE RATE MODAL --- */}
      <AnimatePresence>
        {editingService && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingService(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-slate-900 shadow-2xl z-10 space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Database className="text-indigo-600" size={20} />
                  <h3 className="font-bold text-lg">Modify Service Rate & Rules</h3>
                </div>
                <button 
                  onClick={() => setEditingService(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Service Title</label>
                  <input 
                    type="text" 
                    value={editingService.title}
                    onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Service Code (Read-only)</label>
                  <input 
                    type="text" 
                    disabled
                    value={editingService.service_code}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-indigo-600 font-bold uppercase mb-1">Lookup Fee (₹ INR per Call)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">₹</span>
                    <input 
                      type="number" 
                      min="0"
                      step="0.5"
                      value={editingService.fee}
                      onChange={(e) => setEditingService({ ...editingService, fee: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-indigo-200 rounded-xl pl-9 pr-4 py-3 text-slate-900 font-mono font-bold text-base outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Description</label>
                  <textarea 
                    rows={2}
                    value={editingService.description}
                    onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">Active Status</div>
                    <div className="text-[10px] text-slate-500">If disabled, users cannot perform lookups with this API.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingService({ ...editingService, is_active: !editingService.is_active })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      editingService.is_active ? 'bg-emerald-600 text-white font-extrabold shadow-sm' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {editingService.is_active ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="w-1/3 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingService}
                  onClick={async () => {
                    if (!editingService) return;
                    setIsSavingService(true);
                    await updateApiServiceConfig(editingService);
                    const updated = await getApiServices();
                    setServicesList(updated);
                    setIsSavingService(false);
                    setEditingService(null);
                    setServiceToast(`Updated ${editingService.title} fee to ₹${editingService.fee}`);
                    setTimeout(() => setServiceToast(null), 3500);
                  }}
                  className="w-2/3 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {isSavingService ? (
                    <RefreshCcw size={16} className="animate-spin text-white" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save & Commit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
