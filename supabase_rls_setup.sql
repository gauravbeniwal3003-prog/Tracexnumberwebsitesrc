-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read and update only their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Profiles: Admins can do anything
DROP POLICY IF EXISTS "Admins can select all profiles" ON public.profiles;
CREATE POLICY "Admins can select all profiles" ON public.profiles FOR SELECT 
  USING ( (auth.jwt() ->> 'email') IN ('yashwinderbeniwaldm@gmail.com', 'gauravbeniwal30003@gmail.com', 'gaurav_beniwal_0001@example.com') );

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE 
  USING ( (auth.jwt() ->> 'email') IN ('yashwinderbeniwaldm@gmail.com', 'gauravbeniwal30003@gmail.com', 'gaurav_beniwal_0001@example.com') );

DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;
CREATE POLICY "Admins can delete all profiles" ON public.profiles FOR DELETE 
  USING ( (auth.jwt() ->> 'email') IN ('yashwinderbeniwaldm@gmail.com', 'gauravbeniwal30003@gmail.com', 'gaurav_beniwal_0001@example.com') );

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT 
  WITH CHECK ( (auth.jwt() ->> 'email') IN ('yashwinderbeniwaldm@gmail.com', 'gauravbeniwal30003@gmail.com', 'gaurav_beniwal_0001@example.com') );


-- API Keys: Logged-in Admins can select/all
DROP POLICY IF EXISTS "Anyone can select api_keys" ON public.api_keys;
CREATE POLICY "Anyone can select api_keys" ON public.api_keys FOR SELECT USING (FALSE);

DROP POLICY IF EXISTS "Admins can select all api_keys" ON public.api_keys;
CREATE POLICY "Admins can select all api_keys" ON public.api_keys FOR SELECT 
  USING ( (auth.jwt() ->> 'email') IN ('yashwinderbeniwaldm@gmail.com', 'gauravbeniwal30003@gmail.com', 'gaurav_beniwal_0001@example.com') );

DROP POLICY IF EXISTS "Admins can insert/update api_keys" ON public.api_keys;
CREATE POLICY "Admins can insert/update api_keys" ON public.api_keys FOR ALL 
  USING ( (auth.jwt() ->> 'email') IN ('yashwinderbeniwaldm@gmail.com', 'gauravbeniwal30003@gmail.com', 'gaurav_beniwal_0001@example.com') );


-- Payment Claims: Users can read and insert their own claims
DROP POLICY IF EXISTS "Users can view own claims" ON public.payment_claims;
CREATE POLICY "Users can view own claims" ON public.payment_claims FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own claims" ON public.payment_claims;
CREATE POLICY "Users can insert own claims" ON public.payment_claims FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payment Claims: Admins can do anything
DROP POLICY IF EXISTS "Admins can view all claims" ON public.payment_claims;
CREATE POLICY "Admins can view all claims" ON public.payment_claims FOR SELECT 
  USING ( (auth.jwt() ->> 'email') IN ('yashwinderbeniwaldm@gmail.com', 'gauravbeniwal30003@gmail.com', 'gaurav_beniwal_0001@example.com') );

DROP POLICY IF EXISTS "Admins can update all claims" ON public.payment_claims;
CREATE POLICY "Admins can update all claims" ON public.payment_claims FOR UPDATE 
  USING ( (auth.jwt() ->> 'email') IN ('yashwinderbeniwaldm@gmail.com', 'gauravbeniwal30003@gmail.com', 'gaurav_beniwal_0001@example.com') );

DROP POLICY IF EXISTS "Admins can delete all claims" ON public.payment_claims;
CREATE POLICY "Admins can delete all claims" ON public.payment_claims FOR DELETE 
  USING ( (auth.jwt() ->> 'email') IN ('yashwinderbeniwaldm@gmail.com', 'gauravbeniwal30003@gmail.com', 'gaurav_beniwal_0001@example.com') );


-- Search History: Users can view and insert their own history
DROP POLICY IF EXISTS "Users can view own history" ON public.search_history;
CREATE POLICY "Users can view own history" ON public.search_history FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own history" ON public.search_history;
CREATE POLICY "Users can insert own history" ON public.search_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Search History: Admins can do anything
DROP POLICY IF EXISTS "Admins can view all history" ON public.search_history;
CREATE POLICY "Admins can view all history" ON public.search_history FOR SELECT 
  USING ( (auth.jwt() ->> 'email') IN ('yashwinderbeniwaldm@gmail.com', 'gauravbeniwal30003@gmail.com', 'gaurav_beniwal_0001@example.com') );

DROP POLICY IF EXISTS "Admins can delete all history" ON public.search_history;
CREATE POLICY "Admins can delete all history" ON public.search_history FOR DELETE 
  USING ( (auth.jwt() ->> 'email') IN ('yashwinderbeniwaldm@gmail.com', 'gauravbeniwal30003@gmail.com', 'gaurav_beniwal_0001@example.com') );


-- API Logs: Admins can view and write
DROP POLICY IF EXISTS "Anyone can select api_logs" ON public.api_logs;
CREATE POLICY "Anyone can select api_logs" ON public.api_logs FOR SELECT 
  USING ( (auth.jwt() ->> 'email') IN ('yashwinderbeniwaldm@gmail.com', 'gauravbeniwal30003@gmail.com', 'gaurav_beniwal_0001@example.com') );

DROP POLICY IF EXISTS "Anyone can write logs" ON public.api_logs;
CREATE POLICY "Anyone can write logs" ON public.api_logs FOR INSERT WITH CHECK (TRUE);


-- API Settings: Admins can do anything
DROP POLICY IF EXISTS "Anyone can select api_settings" ON public.api_settings;
CREATE POLICY "Anyone can select api_settings" ON public.api_settings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Anyone can write/modify settings" ON public.api_settings;
CREATE POLICY "Anyone can write/modify settings" ON public.api_settings FOR ALL 
  USING ( (auth.jwt() ->> 'email') IN ('yashwinderbeniwaldm@gmail.com', 'gauravbeniwal30003@gmail.com', 'gaurav_beniwal_0001@example.com') );

