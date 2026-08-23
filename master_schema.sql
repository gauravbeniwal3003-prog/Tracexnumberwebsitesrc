-- =============================================================
-- TRACEXDATA MASTER DATABASE SCHEMA & DYNAMIC CONFIGURATION SETUP
-- Run this SQL in your Supabase SQL Editor to initialize or repair
-- all required tables, columns, indexes, functions, triggers & RLS.
-- =============================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. PROFILES TABLE (Core User Accounts & Balances)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    full_name text,
    phone text,
    credits numeric(12,2) DEFAULT 10.00,
    wallet_balance numeric(12,2) DEFAULT 10.00,
    unlimited_expiry timestamp with time zone,
    plan_type text DEFAULT 'FREE',
    referral_code text,
    referred_by text,
    user_discount_percent numeric(5,2) DEFAULT 0.00,
    is_admin boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Ensure all required columns exist in profiles (for existing databases)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='wallet_balance') THEN
        ALTER TABLE public.profiles ADD COLUMN wallet_balance numeric(12,2) DEFAULT 10.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='referral_code') THEN
        ALTER TABLE public.profiles ADD COLUMN referral_code text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='referred_by') THEN
        ALTER TABLE public.profiles ADD COLUMN referred_by text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='user_discount_percent') THEN
        ALTER TABLE public.profiles ADD COLUMN user_discount_percent numeric(5,2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='is_admin') THEN
        ALTER TABLE public.profiles ADD COLUMN is_admin boolean DEFAULT false;
    END IF;
    -- Remove strict foreign key constraint if it prevents mobile users from being created directly
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'profiles' 
        AND constraint_name = 'profiles_id_fkey'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
    END IF;
END $$;

-- 3. APP USERS TABLE (Mobile & Custom User Records)
CREATE TABLE IF NOT EXISTS public.app_users (
    id text PRIMARY KEY,
    phone text UNIQUE,
    email text,
    password_hash text,
    full_name text,
    credits numeric(12,2) DEFAULT 10.00,
    wallet_balance numeric(12,2) DEFAULT 10.00,
    unlimited_expiry timestamp with time zone,
    user_discount_percent numeric(5,2) DEFAULT 0.00,
    referred_by text,
    referral_code text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Ensure columns exist in app_users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_users' AND column_name='unlimited_expiry') THEN
        ALTER TABLE public.app_users ADD COLUMN unlimited_expiry timestamp with time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_users' AND column_name='user_discount_percent') THEN
        ALTER TABLE public.app_users ADD COLUMN user_discount_percent numeric(5,2) DEFAULT 0.00;
    END IF;
END $$;

-- 4. REFERRALS TABLE
CREATE TABLE IF NOT EXISTS public.referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id text NOT NULL,
    referred_id text NOT NULL,
    referred_email text,
    status text DEFAULT 'ACTIVE',
    created_at timestamp with time zone DEFAULT now()
);

-- Ensure all required columns exist in referrals (for existing databases)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='referrals' AND column_name='referrer_id') THEN
        ALTER TABLE public.referrals ADD COLUMN referrer_id text NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='referrals' AND column_name='referred_id') THEN
        ALTER TABLE public.referrals ADD COLUMN referred_id text NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='referrals' AND column_name='referred_email') THEN
        ALTER TABLE public.referrals ADD COLUMN referred_email text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='referrals' AND column_name='status') THEN
        ALTER TABLE public.referrals ADD COLUMN status text DEFAULT 'ACTIVE';
    END IF;
END $$;

-- 5. REFERRAL EARNINGS TABLE
CREATE TABLE IF NOT EXISTS public.referral_earnings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id text NOT NULL,
    referred_id text NOT NULL,
    amount numeric(12,2) NOT NULL DEFAULT 0.00,
    deposit_amount numeric(12,2) DEFAULT 0.00,
    description text DEFAULT '5% Referral Deposit Bonus',
    created_at timestamp with time zone DEFAULT now()
);

-- Ensure all required columns exist in referral_earnings (for existing databases)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='referral_earnings' AND column_name='referrer_id') THEN
        ALTER TABLE public.referral_earnings ADD COLUMN referrer_id text NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='referral_earnings' AND column_name='referred_id') THEN
        ALTER TABLE public.referral_earnings ADD COLUMN referred_id text NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='referral_earnings' AND column_name='amount') THEN
        ALTER TABLE public.referral_earnings ADD COLUMN amount numeric(12,2) NOT NULL DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='referral_earnings' AND column_name='deposit_amount') THEN
        ALTER TABLE public.referral_earnings ADD COLUMN deposit_amount numeric(12,2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='referral_earnings' AND column_name='description') THEN
        ALTER TABLE public.referral_earnings ADD COLUMN description text DEFAULT '5% Referral Deposit Bonus';
    END IF;
END $$;

-- 6. DYNAMIC API SERVICES TABLE (Managed from Admin Panel & Database)
CREATE TABLE IF NOT EXISTS public.api_services (
    service_key text PRIMARY KEY,
    service_name text NOT NULL,
    base_price numeric(10,2) NOT NULL DEFAULT 1.00,
    category text DEFAULT 'OSINT',
    is_active boolean DEFAULT true,
    provider_url text DEFAULT '',
    updated_at timestamp with time zone DEFAULT now()
);

-- Seed default API services if empty
INSERT INTO public.api_services (service_key, service_name, base_price, category, provider_url)
VALUES 
    ('phone', 'Mobile Number OSINT Lookup', 1.00, 'MOBILE', 'https://exploitsindia.site/osintcallerbot/number.php?exploits={query}'),
    ('aadhaar', 'Aadhaar Card Intelligence', 1.00, 'IDENTITY', 'https://exploitsindia.site/osintcallerbot/aadhar.php?exploits={query}'),
    ('ifsc', 'Bank IFSC Details Lookup', 1.00, 'BANKING', 'https://ifsc.razorpay.com/{query}'),
    ('vehicle', 'Vehicle RC Information', 1.00, 'VEHICLE', 'https://exploitsindia.site/osintcallerbot/vehicle-rc.php?exploits={query}'),
    ('email', 'Email OSINT Intelligence', 1.00, 'DIGITAL', 'https://exploitsindia.site/osintcallerbot/email.php?exploits={query}'),
    ('telegram', 'Telegram Account Intelligence', 1.00, 'SOCIAL', 'https://exploitsindia.site/osintcallerbot/telegram.php?exploits={query}'),
    ('family', 'Ration Card / Family Tree Lookup', 1.00, 'GOVT', 'https://exploitsindia.site/hdhddhjdjddjdjdjdndnddnnccndndhejdmdnnd/family.php?exploits={query}')
ON CONFLICT (service_key) DO UPDATE 
SET service_name = EXCLUDED.service_name;

-- 7. CUSTOM USER PRICING & DISCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.user_custom_pricing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text,
    user_email text,
    service_key text NOT NULL DEFAULT 'ALL',
    custom_price numeric(10,2),
    discount_percent numeric(5,2) DEFAULT 0.00,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Ensure all required columns exist in user_custom_pricing (for existing databases)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_custom_pricing' AND column_name='user_id') THEN
        ALTER TABLE public.user_custom_pricing ADD COLUMN user_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_custom_pricing' AND column_name='user_email') THEN
        ALTER TABLE public.user_custom_pricing ADD COLUMN user_email text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_custom_pricing' AND column_name='service_key') THEN
        ALTER TABLE public.user_custom_pricing ADD COLUMN service_key text NOT NULL DEFAULT 'ALL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_custom_pricing' AND column_name='custom_price') THEN
        ALTER TABLE public.user_custom_pricing ADD COLUMN custom_price numeric(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_custom_pricing' AND column_name='discount_percent') THEN
        ALTER TABLE public.user_custom_pricing ADD COLUMN discount_percent numeric(5,2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_custom_pricing' AND column_name='notes') THEN
        ALTER TABLE public.user_custom_pricing ADD COLUMN notes text;
    END IF;
END $$;

-- 8. API PROVIDER ROUTING CONFIGURATIONS
CREATE TABLE IF NOT EXISTS public.api_provider_configs (
    service_key text PRIMARY KEY,
    provider_url text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- 9. WALLET TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email text NOT NULL,
    amount numeric(12,2) NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'SUCCESS',
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- 10. PAYMENT CLAIMS TABLE
CREATE TABLE IF NOT EXISTS public.payment_claims (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id text UNIQUE NOT NULL,
    user_id text,
    user_email text,
    amount numeric(12,2),
    status text DEFAULT 'pending',
    plan_id text,
    created_at timestamp with time zone DEFAULT now()
);

-- 11. API KEYS / DEVELOPER API SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key text UNIQUE NOT NULL,
    user_id text NOT NULL,
    user_email text,
    plan_name text DEFAULT 'Standard API Plan',
    request_limit integer DEFAULT 1000,
    used_requests integer DEFAULT 0,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- 12. RPC STORED PROCEDURE: DEDUCT CREDITS ATOMICALLY
CREATE OR REPLACE FUNCTION public.deduct_credits(user_id uuid, amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_credits numeric;
BEGIN
    SELECT credits INTO current_credits
    FROM public.profiles
    WHERE id = user_id
    FOR UPDATE;

    IF current_credits IS NULL OR current_credits < amount THEN
        RETURN false;
    END IF;

    UPDATE public.profiles
    SET credits = credits - amount,
        wallet_balance = GREATEST(0, COALESCE(wallet_balance, credits) - amount),
        updated_at = now()
    WHERE id = user_id;

    RETURN true;
END;
$$;

-- 13. INDEXES FOR HIGH-PERFORMANCE SEARCHES
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON public.referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_pricing_user ON public.user_custom_pricing(user_id, user_email);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_email ON public.wallet_transactions(user_email);

-- 14. DISABLE ROW LEVEL SECURITY (RLS) FOR FULL API FUNCTIONALITY
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_provider_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
