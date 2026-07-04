/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vb3BscXhiZnNrZ3dqbHB1dXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDcxMTAsImV4cCI6MjA5MzU4MzExMH0.oGnMxO4JvALvOGnSSqoeOmpxJMUWQ__Fe3LcZCu_er0';

const isKeyValid = (key: any): boolean => {
  return typeof key === 'string' && key.trim().split('.').length === 3;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nooplqxbfskgwjlpuutr.supabase.co';
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseAnonKey = isKeyValid(envAnonKey) ? envAnonKey : DEFAULT_ANON_KEY;

if (!import.meta.env.VITE_SUPABASE_URL || !isKeyValid(import.meta.env.VITE_SUPABASE_ANON_KEY)) {
  console.warn('Supabase credentials missing or invalid in environment. Using default fallback project.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});
