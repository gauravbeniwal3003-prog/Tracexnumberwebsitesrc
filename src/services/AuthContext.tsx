/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase.ts';
import { UserProfile } from '../types.ts';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(IS_TESTING_MODE ? dummyUser : null);
  const [profile, setProfile] = useState<UserProfile | null>(IS_TESTING_MODE ? dummyProfile : null);
  const [loading, setLoading] = useState(IS_TESTING_MODE ? false : true);

  const fetchProfile = async (userId: string) => {
    if (IS_TESTING_MODE) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const response = await fetch('/api/profile', {
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

    // Single listener for all auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log('Auth Event:', event, session?.user?.id);
      
      try {
        if (session) {
          setUser(session.user);
          // Don't let profile fetch block the master loading state clearing
          // specifically for SIGNED_IN/INITIAL_SESSION where we want to actually show the app
          fetchProfile(session.user.id).catch(err => console.error('Profile fetch error:', err));
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Error in auth event handler:', err);
      } finally {
        // Hide loading after initial state or sign in/out events
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setLoading(false);
        }

        // Cleanup PKCE codes from URL
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

  const signOut = async () => {
    if (IS_TESTING_MODE) {
      console.log("Sign-out disabled during active Testing Mode.");
      return;
    }
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signInWithGoogle, 
      signInWithEmail,
      signUpWithEmail,
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
