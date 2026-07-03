const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

const systemEndpoint = `
// --- COMPREHENSIVE ADMIN DATA ENDPOINT ---
app.get("/api/admin/system", verifyAdminToken, async (req, res) => {
  try {
    const [
      { data: apiKeys },
      { data: apiLogs },
      { data: settings },
      { count: totalKeysCount },
      { count: activeKeysCount },
      { count: totalLogsCount },
      { count: userCount },
      { data: revenueData }
    ] = await Promise.all([
      supabaseAdmin.from('api_keys').select('*').order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('api_logs').select('*, api_keys(user_email)').order('created_at', { ascending: false }).limit(50),
      supabaseAdmin.from('api_settings').select('*').limit(1).maybeSingle(),
      supabaseAdmin.from('api_keys').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('api_keys').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('api_logs').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('api_keys').select('plan_name')
    ]);

    const pricing: Record<string, number> = {
      'Unified Pro API (15 Days)': 299,
      'Unified Pro API (30 Days)': 599,
      'Identity Lookup (1 Month)': 499,
      'Bank/IFSC Lookup (1 Month)': 499,
      'Vehicle Lookup (1 Month)': 499,
      'PN Card Lookup (1 Month)': 999,
      'PAN Card Lookup (1 Month)': 999,
      'All Combo Special (1 Month)': 1499
    };
    const revenue = (revenueData || []).reduce((acc: number, curr: any) => acc + (pricing[curr.plan_name] || 0), 0);

    return res.json({
      status: 'success',
      data: {
        apiKeys: apiKeys || [],
        apiLogs: apiLogs || [],
        settings: settings || null,
        stats: {
          totalKeys: totalKeysCount || 0,
          totalRequests: totalLogsCount || 0,
          activeKeys: activeKeysCount || 0,
          revenue: revenue,
          totalUsers: userCount || 0
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
`;

server = server.replace("// --- CLIENT AUTHENTICATED PAYMENT RECONCILIATION API ---", systemEndpoint + "\n// --- CLIENT AUTHENTICATED PAYMENT RECONCILIATION API ---");
fs.writeFileSync('server.ts', server);

let admin = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Replace the direct DB fetching logic
const replaceLogic = `    // Fetch Comprehensive Admin Data
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const sysRes = await fetch('/api/admin/system', { headers: { 'Authorization': \`Bearer \${token}\` } });
        const sysJson = await sysRes.json();
        if (sysRes.ok && sysJson.status === 'success') {
          setStats(sysJson.data.stats);
          setKeys(sysJson.data.apiKeys);
          setLogs(sysJson.data.apiLogs);
          if (sysJson.data.settings) setSettings(sysJson.data.settings);
        }
      }
    } catch (e) {
      console.error(e);
    }`;

// Wait, the AdminDashboard has a lot of lines. Let's just use string replace.
admin = admin.replace(/\/\/ Stats counts[\s\S]*?\/\/ Fetch Registered User Profiles via Secure Admin Service Proxy/, replaceLogic + "\n    // Fetch Registered User Profiles via Secure Admin Service Proxy");

// Replace Create Key
admin = admin.replace(/const { error } = await supabase\.from\('api_keys'\)\.insert\([\s\S]*?\}\);/,
`      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      let error = null;
      if (token) {
        const res = await fetch('/api/admin/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
          body: JSON.stringify({ user_email: newKeyData.user_email, plan_name: newKeyData.plan_name, days })
        });
        const json = await res.json();
        if (!res.ok) error = { message: json.error };
      }`);

// Replace Delete Key
admin = admin.replace(/const { error } = await supabase\.from\('api_keys'\)\.delete\(\)\.eq\('id', id\);/,
`      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      let error = null;
      if (token) {
        const res = await fetch(\`/api/admin/api-keys/\${id}\`, {
          method: 'DELETE',
          headers: { 'Authorization': \`Bearer \${token}\` }
        });
        if (!res.ok) {
          const json = await res.json();
          error = { message: json.error };
        }
      }`);

fs.writeFileSync('src/pages/AdminDashboard.tsx', admin);
console.log('Fixed AdminDashboard direct DB queries.');
