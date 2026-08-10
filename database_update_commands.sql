-- ====================================================================
-- TRACEXDATA / DIGI SEVA DATABASE SCHEMA UPDATE COMMANDS
-- Run these SQL statements in your Supabase SQL Editor
-- ====================================================================

-- 1. Ensure service_records table exists for tracking API call history and responses
CREATE TABLE IF NOT EXISTS public.service_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    client_name TEXT,
    service_name TEXT,
    reference_code TEXT,
    status TEXT DEFAULT 'SUCCESS',
    result_payload JSONB,
    log_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user history lookup
CREATE INDEX IF NOT EXISTS idx_service_records_user_id ON public.service_records(user_id);
CREATE INDEX IF NOT EXISTS idx_service_records_created_at ON public.service_records(created_at DESC);

-- 2. Ensure wallet_transactions table exists for financial tracing
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    user_email TEXT,
    service TEXT,
    type TEXT CHECK (type IN ('Credit', 'Debit', 'manual_adjustment')),
    amount NUMERIC(10,2) NOT NULL,
    balance_after NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for financial transaction tracing
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created_at ON public.wallet_transactions(created_at DESC);

-- 3. Ensure api_keys table has necessary columns for auto pre-generation
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_email TEXT,
    api_key TEXT UNIQUE NOT NULL,
    plan_name TEXT DEFAULT 'Standard API Plan',
    duration_days INTEGER DEFAULT 30,
    request_limit INTEGER DEFAULT 1000,
    requests_used INTEGER DEFAULT 0,
    whitelisted_ips JSONB DEFAULT '[]'::jsonb,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON public.api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);

-- 4. Enable RLS (Row Level Security) safely with read/write access policies
ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own records
DROP POLICY IF EXISTS "Users can read own service records" ON public.service_records;
CREATE POLICY "Users can read own service records" ON public.service_records
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can read own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can read own wallet transactions" ON public.wallet_transactions
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users can read own api keys" ON public.api_keys;
CREATE POLICY "Users can read own api keys" ON public.api_keys
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Allow service role full management
DROP POLICY IF EXISTS "Service role full access service_records" ON public.service_records;
CREATE POLICY "Service role full access service_records" ON public.service_records
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access wallet_transactions" ON public.wallet_transactions;
CREATE POLICY "Service role full access wallet_transactions" ON public.wallet_transactions
    FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role full access api_keys" ON public.api_keys;
CREATE POLICY "Service role full access api_keys" ON public.api_keys
    FOR ALL USING (true);
