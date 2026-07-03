-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_settings ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read and update only their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Payment Claims: Users can read and insert their own claims
CREATE POLICY "Users can view own claims" ON payment_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own claims" ON payment_claims FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Search History: Users can view and insert their own history
CREATE POLICY "Users can view own history" ON search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON search_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service Role (Backend) can bypass RLS completely. 
-- Note: Supabase Service Role Key bypasses RLS automatically by default, so no explicit policy is needed for the backend.
