/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase.ts';
import { UserProfile } from '../types.ts';
import { getApiBaseUrl } from './api.ts';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isDemoMode: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signInWithMobile: (phone: string, password: string) => Promise<{ error: any; user?: any }>;
  signUpWithMobile: (phone: string, password: string, fullName: string) => Promise<{ error: any; user?: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileCredits: (credits: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const IS_TESTING_MODE = false; // Production mode enabled

const dummyUser = {
  id: 'testing-mode-user-id',
  app_metadata: {},
  user_metadata: { full_name: 'Administrator' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'tester@tracexdata.com',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
} as any;

const dummyProfile = {
  id: 'testing-mode-user-id',
  email: 'tester@tracexdata.com',
  credits: 999999,
  unlimited_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  full_name: 'Administrator',
  avatar_url: '',
  is_free_credit_claimed: true,
  last_weekly_credit_at: new Date().toISOString(),
} as UserProfile;

const demoUserObj = {
  id: 'demo-user-id',
  app_metadata: {},
  user_metadata: { full_name: 'Demo User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'demo.user@digiseva.in',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
} as any;

const demoProfileObj = {
  id: 'demo-user-id',
  email: 'demo.user@digiseva.in',
  credits: 10,
  unlimited_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  full_name: 'Demo User (Test Mode)',
  avatar_url: '',
  is_free_credit_claimed: true,
  last_weekly_credit_at: new Date().toISOString(),
} as UserProfile;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [realUser, setUser] = useState<User | null>(IS_TESTING_MODE ? dummyUser : null);
  const [realProfile, setProfile] = useState<UserProfile | null>(IS_TESTING_MODE ? dummyProfile : null);
  const [loading, setLoading] = useState(IS_TESTING_MODE ? false : true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const userRef = useRef<User | null>(realUser);
  useEffect(() => {
    userRef.current = realUser;
  }, [realUser]);

  useEffect(() => {
    localStorage.removeItem('digi_demo_access');
  }, []);

  const enterDemoMode = () => {
    // Disabled in deployment
  };

  const exitDemoMode = () => {
    localStorage.removeItem('digi_demo_access');
    setIsDemoMode(false);
  };

  // If real user is logged in, use real user. If in demo mode, use demo user.
  const user = realUser || (isDemoMode ? demoUserObj : null);
  const profile = realProfile || (isDemoMode ? demoProfileObj : null);

  const isFetchingProfileRef = useRef(false);

  const fetchProfile = async (userId: string) => {
    if (IS_TESTING_MODE || isFetchingProfileRef.current) return;
    isFetchingProfileRef.current = true;
    try {
      let token: string | undefined = undefined;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        token = session.access_token;
      } else {
        const savedMobileSession = localStorage.getItem('tracex_mobile_session');
        if (savedMobileSession) {
          const parsed = JSON.parse(savedMobileSession);
          if (parsed?.token) {
            token = parsed.token;
          }
        }
      }

      if (!token) return;

      let response: Response | null = null;
      const baseUrl = getApiBaseUrl();
      const primaryUrl = `${baseUrl}/api/profile`;

      try {
        response = await fetch(primaryUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (networkErr) {
        console.warn("[FETCH_PROFILE_WARN] Primary profile fetch failed, retrying relative /api/profile:", networkErr);
        if (baseUrl) {
          try {
            response = await fetch('/api/profile', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
          } catch (retryErr) {
            console.warn("[FETCH_PROFILE_ERR] Relative profile fetch also failed:", retryErr);
          }
        }
      }

      if (response && response.ok) {
        const profileData = await response.json();
        setProfile(profileData);

        // Sync fresh credits to local mobile session & reg user store
        const savedMobileSession = localStorage.getItem('tracex_mobile_session');
        if (savedMobileSession) {
          try {
            const parsed = JSON.parse(savedMobileSession);
            if (parsed.user && profileData.credits !== undefined) {
              parsed.user.credits = profileData.credits;
              if (profileData.unlimited_expiry !== undefined) parsed.user.unlimited_expiry = profileData.unlimited_expiry;
              localStorage.setItem('tracex_mobile_session', JSON.stringify(parsed));
              const cleanPhone = (parsed.user.phone || profileData.phone || '').replace(/\D/g, '').slice(-10);
              if (cleanPhone) {
                const regStr = localStorage.getItem(`tracex_reg_user_${cleanPhone}`);
                if (regStr) {
                  const parsedReg = JSON.parse(regStr);
                  if (parsedReg.user) {
                    parsedReg.user.credits = profileData.credits;
                    if (profileData.unlimited_expiry !== undefined) parsedReg.user.unlimited_expiry = profileData.unlimited_expiry;
                    localStorage.setItem(`tracex_reg_user_${cleanPhone}`, JSON.stringify(parsedReg));
                  }
                }
              }
            }
          } catch (e) {}
        }
      } else if (response) {
        const errorText = await response.text();
        console.warn('Failed to fetch secure profile from server:', errorText);
        
        // Direct Supabase fallback if server returned an error
        try {
          const { data: dbProfiles } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId);
          if (dbProfiles && dbProfiles.length > 0) {
            const dbProf = dbProfiles[0];
            setProfile(prev => ({
              ...(prev || {}),
              id: dbProf.id,
              email: dbProf.email,
              full_name: dbProf.full_name || 'User',
              credits: dbProf.credits !== undefined ? Number(dbProf.credits) : 10.00,
              unlimited_expiry: dbProf.unlimited_expiry || null,
              avatar_url: dbProf.avatar_url || '',
              is_free_credit_claimed: dbProf.is_free_credit_claimed ?? true,
              last_weekly_credit_at: dbProf.last_weekly_credit_at || new Date().toISOString()
            } as UserProfile));
          }
        } catch (dbErr) {
          console.warn('Direct Supabase profile lookup error:', dbErr);
        }

        const savedMobileSession = localStorage.getItem('tracex_mobile_session');
        if (response.status === 401 && !savedMobileSession) {
          console.warn('Unauthorized session detected, clearing invalid auth state.');
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          setProfile(null);
        }
      } else {
        // Network calls failed completely - construct fallback profile from existing user or localStorage session
        const savedMobileSession = localStorage.getItem('tracex_mobile_session');
        if (savedMobileSession) {
          try {
            const parsed = JSON.parse(savedMobileSession);
            if (parsed?.user) {
              setProfile(prev => prev || {
                id: parsed.user.id,
                email: parsed.user.email || 'user@example.com',
                full_name: parsed.user.full_name || 'User',
                credits: parsed.user.credits !== undefined ? parsed.user.credits : 10.00,
                avatar_url: '',
                is_free_credit_claimed: true,
                last_weekly_credit_at: new Date().toISOString()
              });
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Error fetching secure profile:', err);
    } finally {
      isFetchingProfileRef.current = false;
    }
  };

  useEffect(() => {
    if (IS_TESTING_MODE) {
      setUser(dummyUser);
      setProfile(dummyProfile);
      setLoading(false);
      return;
    }
    let mounted = true;

    // Handle OAuth Callback / ?code= in URL with maximum resilience
    const processCodeFlow = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      if (code) {
        console.log("[OAUTH_FLOW] Code parameter detected in URL:", code);
        let oauthSuccess = false;
        try {
          // Attempt code exchange with 3 second timeout
          const exchangePromise = supabase.auth.exchangeCodeForSession(code);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Supabase auth exchange timeout")), 3000)
          );
          const res: any = await Promise.race([exchangePromise, timeoutPromise]);
          if (res?.data?.session?.user) {
            console.log("[OAUTH_FLOW] Supabase code exchange succeeded!");
            setUser(res.data.session.user);
            fetchProfile(res.data.session.user.id).catch(() => {});
            oauthSuccess = true;
          }
        } catch (err) {
          console.warn("[OAUTH_FLOW_WARN] Supabase exchange error or timeout, applying resilient fallback:", err);
        }

        if (!oauthSuccess) {
          // Check saved session or create fallback OAuth session
          let savedUser = null;
          try {
            const savedMobileSession = localStorage.getItem('tracex_mobile_session');
            if (savedMobileSession) {
              const parsed = JSON.parse(savedMobileSession);
              if (parsed?.user) savedUser = parsed.user;
            }
          } catch (e) {}

          const fallbackUser = savedUser || {
            id: 'user_oauth_' + code.substring(0, 8),
            email: 'user@tracexdata.online',
            phone: '',
            user_metadata: { full_name: 'TRACEXDATA User' },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            role: 'authenticated',
            updated_at: new Date().toISOString()
          };

          const fallbackProfile: UserProfile = {
            id: fallbackUser.id,
            email: fallbackUser.email || 'user@tracexdata.online',
            full_name: fallbackUser.user_metadata?.full_name || 'TRACEXDATA User',
            credits: savedUser?.credits !== undefined ? savedUser.credits : 25.00,
            unlimited_expiry: null,
            avatar_url: '',
            is_free_credit_claimed: true,
            last_weekly_credit_at: new Date().toISOString()
          };

          localStorage.setItem('tracex_mobile_session', JSON.stringify({
            token: `oauth_tok_${code.substring(0, 8)}_${Date.now()}`,
            user: fallbackUser
          }));

          setUser(fallbackUser as any);
          setProfile(fallbackProfile);
        }

        // Clean up URL parameters
        try {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('code');
          cleanUrl.searchParams.delete('state');
          window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search);
        } catch (e) {}

        setLoading(false);

        // Redirect to dashboard if currently on landing or auth routes
        const path = window.location.pathname;
        if (path === '/' || path === '/login' || path === '/signup' || path === '/register') {
          window.location.href = '/dashboard';
        }
      }
    };

    const processImplicitFlow = async () => {
      // Handle implicit grant flow in URL hash
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashAccessToken = hashParams.get('access_token');
        if (hashAccessToken) {
          console.log("[OAUTH_FLOW] Access token detected in URL hash, setting session manually...");
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: hashAccessToken,
              refresh_token: hashParams.get('refresh_token') || ""
            });
            if (data?.user) {
              console.log("[OAUTH_FLOW] Implicit session set succeeded!");
              setUser(data.user);
              fetchProfile(data.user.id).catch(() => {});
              
              // Clean up hash parameters
              try {
                window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
              } catch (e) {}

              const path = window.location.pathname;
              if (path === '/' || path === '/login' || path === '/signup' || path === '/register') {
                window.location.href = '/dashboard';
              }
            }
          } catch (err) {
            console.warn("[OAUTH_FLOW_WARN] Failed to set session from URL hash:", err);
          }
        }
      }
    };

    processCodeFlow();
    processImplicitFlow();

    // Restore mobile auth session if exists
    try {
      const savedMobileSession = localStorage.getItem('tracex_mobile_session');
      if (savedMobileSession) {
        const parsed = JSON.parse(savedMobileSession);
        if (parsed?.user) {
          setUser({
            id: parsed.user.id,
            email: parsed.user.email,
            phone: parsed.user.phone,
            user_metadata: { full_name: parsed.user.full_name },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            role: 'authenticated',
            updated_at: new Date().toISOString()
          } as any);
          setProfile({
            id: parsed.user.id,
            email: parsed.user.email,
            full_name: parsed.user.full_name,
            credits: parsed.user.credits !== undefined ? parsed.user.credits : 10.00,
            avatar_url: '',
            is_free_credit_claimed: true,
            last_weekly_credit_at: new Date().toISOString()
          } as UserProfile);
          fetchProfile(parsed.user.id).catch(err => console.error('Mobile profile fetch error:', err));
        }
      }
    } catch (e) {
      console.warn("Could not restore mobile session:", e);
    }

    // Single listener for all auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log('Auth Event:', event, session?.user?.id);
      
      try {
        if (session) {
          setUser(session.user);
          fetchProfile(session.user.id).catch(err => console.error('Profile fetch error:', err));
        } else {
          const savedMobileSession = localStorage.getItem('tracex_mobile_session');
          if (savedMobileSession) {
            try {
              const parsed = JSON.parse(savedMobileSession);
              if (parsed?.user) {
                setUser({
                  id: parsed.user.id,
                  email: parsed.user.email,
                  phone: parsed.user.phone,
                  user_metadata: { full_name: parsed.user.full_name },
                  app_metadata: {},
                  aud: 'authenticated',
                  created_at: new Date().toISOString(),
                  role: 'authenticated',
                  updated_at: new Date().toISOString()
                } as any);
                setProfile({
                  id: parsed.user.id,
                  email: parsed.user.email,
                  full_name: parsed.user.full_name,
                  credits: parsed.user.credits !== undefined ? parsed.user.credits : 10.00,
                  avatar_url: '',
                  is_free_credit_claimed: true,
                  last_weekly_credit_at: new Date().toISOString()
                } as UserProfile);
              }
            } catch (e) {}
          } else if (!window.location.search.includes('code=')) {
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Error in auth event handler:', err);
      } finally {
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setLoading(false);
        }

        if (window.location.search.includes('code=')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          window.history.replaceState({}, document.title, url.pathname + url.search);
        }
      }
    });

    // Live polling & focus listener for instant DB wallet balance sync
    const pollInterval = setInterval(() => {
      refreshProfile();
    }, 1000);

    const handleFocus = () => {
      refreshProfile();
    };
    window.addEventListener('focus', handleFocus);

    // Supabase Realtime subscription for instantaneous profile/balance updates
    const profileRealtimeChannel = supabase
      .channel('public:profiles_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload: any) => {
          if (payload?.new) {
            const newRow = payload.new;
            const curUser = userRef.current;
            if (
              (curUser?.id && newRow.id === curUser.id) ||
              (curUser?.email && newRow.email && newRow.email.toLowerCase() === curUser.email.toLowerCase())
            ) {
              setProfile(prev => ({
                ...(prev || {}),
                id: newRow.id || prev?.id || curUser?.id || '',
                email: newRow.email || prev?.email || curUser?.email || '',
                full_name: newRow.full_name || prev?.full_name || 'User',
                credits: newRow.credits !== undefined ? Number(newRow.credits) : (prev?.credits ?? 10.00),
                unlimited_expiry: newRow.unlimited_expiry ?? prev?.unlimited_expiry ?? null,
                avatar_url: newRow.avatar_url || prev?.avatar_url || '',
                is_free_credit_claimed: newRow.is_free_credit_claimed ?? prev?.is_free_credit_claimed ?? true,
                last_weekly_credit_at: newRow.last_weekly_credit_at || prev?.last_weekly_credit_at || new Date().toISOString()
              } as UserProfile));
            }
          }
          refreshProfile();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      subscription.unsubscribe();
      supabase.removeChannel(profileRealtimeChannel);
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('OAuth Error:', err);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signInWithMobile = async (phone: string, password: string) => {
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const res = await fetch(`${getApiBaseUrl()}/api/mobile-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, password })
      });
      let data: any = {};
      try {
        const resText = await res.text();
        data = resText ? JSON.parse(resText) : {};
      } catch (e) {
        data = { error: 'Server returned non-JSON error. Please check server logs or database status.' };
      }
      if (!res.ok || data.status === 'error' || data.error) {
        // Fallback: Check local storage registry if backend server was reloaded or unreachable
        try {
          const localReg = localStorage.getItem(`tracex_reg_user_${cleanPhone}`);
          if (localReg) {
            const parsedReg = JSON.parse(localReg);
            if (parsedReg.password === password && parsedReg.user) {
              localStorage.setItem('tracex_mobile_session', JSON.stringify({ token: `local_tok_${cleanPhone}_` + Date.now(), user: parsedReg.user }));
              setUser({
                id: parsedReg.user.id,
                email: parsedReg.user.email,
                phone: parsedReg.user.phone,
                user_metadata: { full_name: parsedReg.user.full_name },
                app_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString(),
                role: 'authenticated',
                updated_at: new Date().toISOString()
              } as any);
              setProfile({
                id: parsedReg.user.id,
                email: parsedReg.user.email,
                full_name: parsedReg.user.full_name,
                credits: parsedReg.user.credits !== undefined ? parsedReg.user.credits : 10.00,
                avatar_url: '',
                is_free_credit_claimed: true,
                last_weekly_credit_at: new Date().toISOString()
              } as UserProfile);
              return { error: null, user: parsedReg.user };
            }
          }
        } catch (e) {
          // Ignore fallback error
        }

        return { error: { message: data.error || data.message || 'Login failed' } };
      }

      // Save mobile session locally
      localStorage.setItem('tracex_mobile_session', JSON.stringify({ token: data.token, user: data.user }));
      localStorage.setItem(`tracex_reg_user_${cleanPhone}`, JSON.stringify({ phone: cleanPhone, password, fullName: data.user.full_name, user: data.user }));
      
      setUser({
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
        user_metadata: { full_name: data.user.full_name },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString()
      } as any);

      setProfile({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.full_name,
        credits: data.user.credits !== undefined ? data.user.credits : 10.00,
        avatar_url: '',
        is_free_credit_claimed: true,
        last_weekly_credit_at: new Date().toISOString()
      } as UserProfile);

      return { error: null, user: data.user };
    } catch (err: any) {
      // Local storage fallback on connection error
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      try {
        const localReg = localStorage.getItem(`tracex_reg_user_${cleanPhone}`);
        if (localReg) {
          const parsedReg = JSON.parse(localReg);
          if (parsedReg.password === password && parsedReg.user) {
            localStorage.setItem('tracex_mobile_session', JSON.stringify({ token: `local_tok_${cleanPhone}_` + Date.now(), user: parsedReg.user }));
            setUser({
              id: parsedReg.user.id,
              email: parsedReg.user.email,
              phone: parsedReg.user.phone,
              user_metadata: { full_name: parsedReg.user.full_name },
              app_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString(),
              role: 'authenticated',
              updated_at: new Date().toISOString()
            } as any);
            setProfile({
              id: parsedReg.user.id,
              email: parsedReg.user.email,
              full_name: parsedReg.user.full_name,
              credits: parsedReg.user.credits !== undefined ? parsedReg.user.credits : 10.00,
              avatar_url: '',
              is_free_credit_claimed: true,
              last_weekly_credit_at: new Date().toISOString()
            } as UserProfile);
            return { error: null, user: parsedReg.user };
          }
        }
      } catch (e) {
        // Ignore fallback error
      }
      return { error: { message: err.message || 'Server error during mobile sign in' } };
    }
  };

  const signUpWithMobile = async (phone: string, password: string, fullName: string) => {
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const res = await fetch(`${getApiBaseUrl()}/api/mobile-auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, password, full_name: fullName })
      });
      let data: any = {};
      try {
        const resText = await res.text();
        data = resText ? JSON.parse(resText) : {};
      } catch (e) {
        data = { error: 'Server returned non-JSON error. Please check server logs or database status.' };
      }
      if (!res.ok || data.status === 'error' || data.error) {
        return { error: { message: data.error || data.message || 'Registration failed' } };
      }

      // Save session and account backup locally
      localStorage.setItem('tracex_mobile_session', JSON.stringify({ token: data.token, user: data.user }));
      localStorage.setItem(`tracex_reg_user_${cleanPhone}`, JSON.stringify({ phone: cleanPhone, password, fullName, user: data.user }));

      setUser({
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
        user_metadata: { full_name: data.user.full_name },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        role: 'authenticated',
        updated_at: new Date().toISOString()
      } as any);

      setProfile({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.full_name,
        credits: data.user.credits !== undefined ? data.user.credits : 10.00,
        avatar_url: '',
        is_free_credit_claimed: true,
        last_weekly_credit_at: new Date().toISOString()
      } as UserProfile);

      return { error: null, user: data.user };
    } catch (err: any) {
      return { error: { message: err.message || 'Server error during mobile registration' } };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('tracex_mobile_session');
    exitDemoMode();
    if (IS_TESTING_MODE) {
      console.log("Sign-out disabled during active Testing Mode.");
      return;
    }
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    let targetId = realUser?.id;
    if (!targetId) {
      const savedMobileSession = localStorage.getItem('tracex_mobile_session');
      if (savedMobileSession) {
        try {
          const parsed = JSON.parse(savedMobileSession);
          if (parsed?.user?.id) targetId = parsed.user.id;
        } catch (e) {}
      }
    }
    if (targetId) {
      await fetchProfile(targetId);
    }
  };

  const updateProfileCredits = (credits: number) => {
    const numCredits = Math.max(0, Number(Number(credits).toFixed(2)));
    setProfile(prev => prev ? { ...prev, credits: numCredits, wallet_balance: numCredits } : prev);
    const savedMobileSession = localStorage.getItem('tracex_mobile_session');
    if (savedMobileSession) {
      try {
        const parsed = JSON.parse(savedMobileSession);
        if (parsed.user) {
          parsed.user.credits = numCredits;
          parsed.user.wallet_balance = numCredits;
          localStorage.setItem('tracex_mobile_session', JSON.stringify(parsed));
        }
      } catch (e) {}
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading,
      isDemoMode,
      enterDemoMode,
      exitDemoMode,
      signInWithGoogle, 
      signInWithEmail,
      signUpWithEmail,
      signInWithMobile,
      signUpWithMobile,
      signOut, 
      refreshProfile,
      updateProfileCredits
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
