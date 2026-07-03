const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

const keysEndpoints = `
// --- ADMIN API KEYS ---
app.get("/api/admin/api-keys", verifyAdminToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('api_keys').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/api-keys", verifyAdminToken, async (req, res) => {
  try {
    const { user_email, plan_name, days } = req.body;
    const apiKey = "tx_" + crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (days || 30));

    const { data, error } = await supabaseAdmin.from('api_keys').insert({
      user_email,
      api_key: apiKey,
      plan_name,
      requests_used: 0,
      request_limit: null,
      expires_at: expiresAt.toISOString(),
      status: 'active'
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/admin/api-keys/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from('api_keys').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ status: "success" });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
`;

// Insert the new endpoints right before // --- CLIENT AUTHENTICATED PAYMENT RECONCILIATION API ---
server = server.replace("// --- CLIENT AUTHENTICATED PAYMENT RECONCILIATION API ---", keysEndpoints + "\n// --- CLIENT AUTHENTICATED PAYMENT RECONCILIATION API ---");

fs.writeFileSync('server.ts', server);
console.log('Admin API Keys endpoints added to server.ts.');
