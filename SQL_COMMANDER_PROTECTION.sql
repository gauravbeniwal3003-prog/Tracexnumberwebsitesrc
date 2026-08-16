-- ====================================================================
-- TRACEXDATA Universal Record Protection & SQL Commander Script
-- ====================================================================
-- Run this script in your Supabase / PostgreSQL SQL Editor to provision
-- the unified protection tables and indexes for ALL site features.

-- 1. Create the unified protected_records table
CREATE TABLE IF NOT EXISTS public.protected_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    service_type VARCHAR(50) NOT NULL, -- 'phone', 'telegram', 'adhr', 'vehicle', 'veh_owner_num', 'email'
    record_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_protected_record_type_val UNIQUE (service_type, record_value)
);

-- 2. Create high-performance search indexes
CREATE INDEX IF NOT EXISTS idx_protected_records_lookup 
ON public.protected_records (service_type, record_value);

CREATE INDEX IF NOT EXISTS idx_protected_records_val 
ON public.protected_records (record_value);

-- 3. Provision legacy tables for backward compatibility
CREATE TABLE IF NOT EXISTS public.protected_numbers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.protected_telegrams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.protected_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_telegrams ENABLE ROW LEVEL SECURITY;

-- Allow public select permissions for real-time protection checks
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow public select on protected_records'
    ) THEN
        CREATE POLICY "Allow public select on protected_records" 
        ON public.protected_records FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow public select on protected_numbers'
    ) THEN
        CREATE POLICY "Allow public select on protected_numbers" 
        ON public.protected_numbers FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow public select on protected_telegrams'
    ) THEN
        CREATE POLICY "Allow public select on protected_telegrams" 
        ON public.protected_telegrams FOR SELECT USING (true);
    END IF;
END $$;

-- 5. Helper function to manually insert or protect a record via SQL:
-- SELECT public.protect_record('phone', '9876543210');
-- SELECT public.protect_record('adhr', '998877665544');
-- SELECT public.protect_record('email', 'user@gmail.com');
CREATE OR REPLACE FUNCTION public.protect_record(
    p_service_type VARCHAR,
    p_record_value VARCHAR
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.protected_records (service_type, record_value)
    VALUES (LOWER(p_service_type), TRIM(p_record_value))
    ON CONFLICT (service_type, record_value) DO NOTHING;

    IF LOWER(p_service_type) IN ('phone', 'mobile') THEN
        INSERT INTO public.protected_numbers (phone_number)
        VALUES (REGEXP_REPLACE(p_record_value, '\D', '', 'g'))
        ON CONFLICT (phone_number) DO NOTHING;
    ELSIF LOWER(p_service_type) = 'telegram' THEN
        INSERT INTO public.protected_telegrams (telegram_id)
        VALUES (REGEXP_REPLACE(p_record_value, '^@', ''))
        ON CONFLICT (telegram_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
