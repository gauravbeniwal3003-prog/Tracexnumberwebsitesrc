const fs = require('fs');

let code = fs.readFileSync('supabase_setup.sql', 'utf8');

code = code.replace(/CREATE POLICY "Anyone can select api_keys" ON public\.api_keys FOR SELECT USING \(TRUE\);/g, 'CREATE POLICY "Anyone can select api_keys" ON public.api_keys FOR SELECT USING (FALSE);');

code = code.replace(/CREATE POLICY "Anyone can read cached aadhaar_pan_results" ON public\.aadhaar_pan_results FOR SELECT USING \(TRUE\);/g, 'CREATE POLICY "Anyone can read cached aadhaar_pan_results" ON public.aadhaar_pan_results FOR SELECT USING (FALSE);');

code = code.replace(/CREATE POLICY "Anyone can read cached telegrams" ON public\.telegram_search_results FOR SELECT USING \(TRUE\);/g, 'CREATE POLICY "Anyone can read cached telegrams" ON public.telegram_search_results FOR SELECT USING (FALSE);');

code = code.replace(/CREATE POLICY "Anyone can insert cached aadhaar_pan_results" ON public\.aadhaar_pan_results FOR INSERT WITH CHECK \(TRUE\);/g, 'CREATE POLICY "Anyone can insert cached aadhaar_pan_results" ON public.aadhaar_pan_results FOR INSERT WITH CHECK (FALSE);');


fs.writeFileSync('supabase_setup.sql', code);
console.log('Patched SQL RLS');
