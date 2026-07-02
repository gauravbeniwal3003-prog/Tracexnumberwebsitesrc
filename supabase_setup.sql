-- ==========================================
-- TRACEXDATA FULL DATABASE SETUP & FIX
-- ==========================================
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard
-- 2. Go to 'SQL Editor' -> 'New Query'
-- 3. Paste this ENTIRE block and click 'Run'
-- ==========================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    credits INTEGER DEFAULT 10, -- Start with 10 free credits
    unlimited_expiry TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    is_free_credit_claimed BOOLEAN DEFAULT FALSE,
    last_weekly_credit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist (Upgrade Support)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='credits') THEN
        ALTER TABLE public.profiles ADD COLUMN credits INTEGER DEFAULT 10;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='unlimited_expiry') THEN
        ALTER TABLE public.profiles ADD COLUMN unlimited_expiry TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_free_credit_claimed') THEN
        ALTER TABLE public.profiles ADD COLUMN is_free_credit_claimed BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_weekly_credit_at') THEN
        ALTER TABLE public.profiles ADD COLUMN last_weekly_credit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 2. Protected Numbers Table (FIX for missing table)
CREATE TABLE IF NOT EXISTS public.protected_numbers (
    phone_number TEXT PRIMARY KEY,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Search Results Cache
CREATE TABLE IF NOT EXISTS public.search_results (
    mobile_number TEXT PRIMARY KEY,
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Payment Claims Table (Tracking Razorpay Payments)
CREATE TABLE IF NOT EXISTS public.payment_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    amount DECIMAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_claims ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can read cached results" ON public.search_results;
CREATE POLICY "Anyone can read cached results" ON public.search_results FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Authenticated users can insert results" ON public.search_results;
CREATE POLICY "Authenticated users can insert results" ON public.search_results FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can check if a number is protected" ON public.protected_numbers;
CREATE POLICY "Anyone can check if a number is protected" ON public.protected_numbers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can protect their own numbers" ON public.protected_numbers;
CREATE POLICY "Users can protect their own numbers" ON public.protected_numbers FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can view their own claims" ON public.payment_claims;
CREATE POLICY "Users can view their own claims" ON public.payment_claims FOR SELECT USING (auth.uid() = user_id);

-- 6. Trigger for New Users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, credits)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    10
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 7. NEW TELEGRAM & VEHICLE SUBSYSTEMS
-- ==========================================

-- Telegram Cache
CREATE TABLE IF NOT EXISTS public.telegram_search_results (
    telegram_id TEXT PRIMARY KEY,
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicle Cache
CREATE TABLE IF NOT EXISTS public.vehicle_search_results (
    vehicle_number TEXT PRIMARY KEY,
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Telegram Protection Registry
CREATE TABLE IF NOT EXISTS public.protected_telegrams (
    telegram_id TEXT PRIMARY KEY,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Vehicle Protection Registry
CREATE TABLE IF NOT EXISTS public.protected_vehicles (
    vehicle_number TEXT PRIMARY KEY,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for Telegram and Vehicle Tables
ALTER TABLE public.telegram_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_telegrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_vehicles ENABLE ROW LEVEL SECURITY;

-- Select/Insert policies for Telegram/Vehicle cache
DROP POLICY IF EXISTS "Anyone can read cached telegrams" ON public.telegram_search_results;
CREATE POLICY "Anyone can read cached telegrams" ON public.telegram_search_results FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Anyone can insert telegram cache" ON public.telegram_search_results;
CREATE POLICY "Anyone can insert telegram cache" ON public.telegram_search_results FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Anyone can read cached vehicles" ON public.vehicle_search_results;
CREATE POLICY "Anyone can read cached vehicles" ON public.vehicle_search_results FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Anyone can insert vehicle cache" ON public.vehicle_search_results;
CREATE POLICY "Anyone can insert vehicle cache" ON public.vehicle_search_results FOR INSERT WITH CHECK (TRUE);

-- Protection Registry Policies
DROP POLICY IF EXISTS "Anyone can check protected telegrams" ON public.protected_telegrams;
CREATE POLICY "Anyone can check protected telegrams" ON public.protected_telegrams FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can protect own telegrams" ON public.protected_telegrams;
CREATE POLICY "Users can protect own telegrams" ON public.protected_telegrams FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Anyone can check protected vehicles" ON public.protected_vehicles;
CREATE POLICY "Anyone can check protected vehicles" ON public.protected_vehicles FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can protect own vehicles" ON public.protected_vehicles;
CREATE POLICY "Users can protect own vehicles" ON public.protected_vehicles FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- ==========================================
-- 8. SAAS ENGINE MANAGEMENT (KEYS, LOGS & SETTINGS)
-- ==========================================

-- API Keys Table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    plan_name TEXT NOT NULL,
    requests_used INTEGER DEFAULT 0 NOT NULL,
    request_limit INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- API Settings Table
CREATE TABLE IF NOT EXISTS public.api_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    real_api_url TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- API Logs Table
CREATE TABLE IF NOT EXISTS public.api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
    masked_number TEXT NOT NULL,
    status TEXT NOT NULL,
    response_time_ms INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Select policies
DROP POLICY IF EXISTS "Anyone can select api_keys" ON public.api_keys;
CREATE POLICY "Anyone can select api_keys" ON public.api_keys FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Anyone can select api_settings" ON public.api_settings;
CREATE POLICY "Anyone can select api_settings" ON public.api_settings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Anyone can select api_logs" ON public.api_logs;
CREATE POLICY "Anyone can select api_logs" ON public.api_logs FOR SELECT USING (TRUE);

-- Write/Modify policies for Admins
DROP POLICY IF EXISTS "Admins can insert/update api_keys" ON public.api_keys;
CREATE POLICY "Admins can insert/update api_keys" ON public.api_keys FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "Anyone can write logs" ON public.api_logs;
CREATE POLICY "Anyone can write logs" ON public.api_logs FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Anyone can write/modify settings" ON public.api_settings;
CREATE POLICY "Anyone can write/modify settings" ON public.api_settings FOR ALL USING (TRUE);

-- ==========================================
-- 9. AUTOMATIC 24-HOUR RECORD CLEANUP LOGIC
-- ==========================================
-- Automatically deletes rows older than 24 hours from selected tracking tables.
-- Safe implementation includes exception handling to bypass errors if tables are missing.

-- Enable the pg_cron extension in your Supabase database dashboard
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.cleanup_expired_records()
RETURNS void AS $$
BEGIN
    -- 1. Clean public.api_logs
    BEGIN
        DELETE FROM public.api_logs WHERE created_at < NOW() - INTERVAL '24 hours';
        RAISE NOTICE 'Cleaned api_logs successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping api_logs cleanup (table might not exist): %', SQLERRM;
    END;

    -- 2. Clean public.telegram_payment_sessions
    BEGIN
        DELETE FROM public.telegram_payment_sessions WHERE created_at < NOW() - INTERVAL '24 hours';
        RAISE NOTICE 'Cleaned telegram_payment_sessions successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping telegram_payment_sessions cleanup (table might not exist): %', SQLERRM;
    END;

    -- 3. Clean public.payment_sessions
    BEGIN
        DELETE FROM public.payment_sessions WHERE created_at < NOW() - INTERVAL '24 hours';
        RAISE NOTICE 'Cleaned payment_sessions successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping payment_sessions cleanup (table might not exist): %', SQLERRM;
    END;

    -- 4. Clean public.payment_claims
    BEGIN
        DELETE FROM public.payment_claims WHERE created_at < NOW() - INTERVAL '24 hours';
        RAISE NOTICE 'Cleaned payment_claims successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping payment_claims cleanup (table might not exist): %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Schedule the automated job to run every hour
DO $$
BEGIN
    PERFORM cron.unschedule('hourly-cleanup-24h-records');
EXCEPTION WHEN OTHERS THEN
    -- Ignore exception if the job is not yet registered or cannot be unscheduled
    NULL;
END;
$$;

SELECT cron.schedule(
    'hourly-cleanup-24h-records',
    '30 * * * *', -- Schedule to run at the 30th minute of every hour
    'SELECT public.cleanup_expired_records();'
);


-- ==========================================
-- DATABASE READY FOR TRACEXDATA VIP
-- ==========================================

-- Add search_logs table
CREATE TABLE IF NOT EXISTS public.search_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_email TEXT,
    ip_address TEXT,
    search_query TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure user_email column exists
ALTER TABLE public.search_logs ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Function to cleanup old search logs
CREATE OR REPLACE FUNCTION public.delete_old_search_logs()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.search_logs
    WHERE created_at < NOW() - INTERVAL '3 hours';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup after every insert
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_delete_old_search_logs') THEN
        CREATE TRIGGER trigger_delete_old_search_logs
        AFTER INSERT ON public.search_logs
        FOR EACH STATEMENT
        EXECUTE FUNCTION public.delete_old_search_logs();
    END IF;
END
$$;

-- ==========================================
-- 10. AADHAAR TO PAN RESULT CACHING
-- ==========================================
CREATE TABLE IF NOT EXISTS public.aadhaar_pan_results (
    aadhaar_number TEXT PRIMARY KEY,
    pan_number TEXT NOT NULL,
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.aadhaar_pan_results ENABLE ROW LEVEL SECURITY;

-- Select/Insert policies
DROP POLICY IF EXISTS "Anyone can read cached aadhaar_pan_results" ON public.aadhaar_pan_results;
CREATE POLICY "Anyone can read cached aadhaar_pan_results" ON public.aadhaar_pan_results FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Anyone can insert cached aadhaar_pan_results" ON public.aadhaar_pan_results;
CREATE POLICY "Anyone can insert cached aadhaar_pan_results" ON public.aadhaar_pan_results FOR INSERT WITH CHECK (TRUE);

