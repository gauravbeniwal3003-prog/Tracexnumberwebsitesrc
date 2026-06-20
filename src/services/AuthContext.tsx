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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    if (IS_TESTING_MODE) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!data) {
      // Profile doesn't exist, create it (Fallback if trigger fails)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const storageKey = `tracexdata_free_credit_${userId}`;
        const hasClaimed = localStorage.getItem(storageKey);
        const freeCredits = hasClaimed ? 0 : 10;

        if (!hasClaimed) {
          localStorage.setItem(storageKey, 'claimed');
        }

        const newProfile = {
          id: userId,
          email: currentUser.email,
          credits: freeCredits,
          unlimited_expiry: null,
          full_name: currentUser.user_metadata.full_name || currentUser.email?.split('@')[0],
          avatar_url: currentUser.user_metadata.avatar_url,
          is_free_credit_claimed: freeCredits > 0,
          last_weekly_credit_at: new Date().toISOString(),
        };
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile);
        
        if (!insertError) setProfile(newProfile as UserProfile);
      }
    } else if (data) {
      // Check for weekly credits (5 credits every 7 days)
      // Safely check if the column exists in the returned data to avoid 400 errors on update
      const hasWeeklyColumn = 'last_weekly_credit_at' in data;
      const lastWeekly = hasWeeklyColumn && (data as any).last_weekly_credit_at ? new Date((data as any).last_weekly_credit_at) : null;
      const now = new Date();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      if (hasWeeklyColumn && (!lastWeekly || (now.getTime() - lastWeekly.getTime() >= sevenDaysInMs))) {
        try {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              credits: (data.credits || 0) + 5,
              last_weekly_credit_at: now.toISOString(),
            } as any)
            .eq('id', userId);
          
          if (!updateError) {
            await fetchProfile(userId);
            return;
          } else {
            console.warn('Profile update skipped: Likely missing columns in database.');
          }
        } catch (e) {
          console.warn('Silent skip: Profile update failed.');
        }
      }
      setProfile(data);
    }
  };

  useEffect(() => {
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
