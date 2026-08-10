/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  credits: 1470,
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

  const fetchProfile = async (userId: string) => {
    if (IS_TESTING_MODE) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const response = await fetch(`${getApiBaseUrl()}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
      } else {
        console.error('Failed to fetch secure profile:', await response.text());
      }
    } catch (err) {
      console.error('Error fetching secure profile:', err);
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
            credits: parsed.user.credits || 1470.00,
            avatar_url: '',
            is_free_credit_claimed: true,
            last_weekly_credit_at: new Date().toISOString()
          } as UserProfile);
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
          // Don't let profile fetch block the master loading state clearing
          fetchProfile(session.user.id).catch(err => console.error('Profile fetch error:', err));
        } else if (!localStorage.getItem('tracex_mobile_session')) {
          setUser(null);
          setProfile(null);
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

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
      const data = await res.json();
      if (!res.ok || data.status === 'error' || data.error) {
        // Fallback: Check local storage registry if backend server was reloaded or unreachable
        try {
          const localReg = localStorage.getItem(`tracex_reg_user_${cleanPhone}`);
          if (localReg) {
            const parsedReg = JSON.parse(localReg);
            if (parsedReg.password === password && parsedReg.user) {
              localStorage.setItem('tracex_mobile_session', JSON.stringify({ token: 'local_tok_' + Date.now(), user: parsedReg.user }));
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
                credits: parsedReg.user.credits || 1470.00,
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
        credits: data.user.credits || 1470.00,
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
            localStorage.setItem('tracex_mobile_session', JSON.stringify({ token: 'local_tok_' + Date.now(), user: parsedReg.user }));
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
              credits: parsedReg.user.credits || 1470.00,
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
      const data = await res.json();
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
        credits: data.user.credits || 1470.00,
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
    if (realUser) await fetchProfile(realUser.id);
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
      refreshProfile 
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
