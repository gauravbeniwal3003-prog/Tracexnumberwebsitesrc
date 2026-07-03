const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const userLookupCode = `
app.get("/api/user-lookup", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Session token missing" });
  }
  const token = authHeader.replace("Bearer ", "");
  
  const { service, query } = req.query;
  if (!service || typeof service !== 'string' || !query || typeof query !== 'string') {
    return res.status(400).json({ error: "Missing service or query" });
  }

  if (!supabaseAdmin) return res.status(500).json({ error: "Database offline" });

  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ error: "Session invalid or expired" });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
      
    if (profileErr || !profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    let isUnlimited = false;
    if (profile.unlimited_expiry) {
      const expiry = new Date(profile.unlimited_expiry);
      if (expiry > new Date()) {
        isUnlimited = true;
      }
    }

    const creditCost = 1;
    const currentCredits = Number(profile.credits || 0);
    
    if (!isUnlimited) {
      if (currentCredits < creditCost) {
        return res.status(403).json({ error: "Insufficient credits." });
      }

      // Try RPC first for atomic deduction
      const { data: rpcSuccess, error: rpcError } = await supabaseAdmin.rpc("deduct_credits", {
          user_id: user.id,
          amount: creditCost
      });

      if (rpcError && rpcError.code === '42883') {
          // Fallback
          const { error: deductError } = await supabaseAdmin
            .from("profiles")
            .update({ credits: Math.max(0, currentCredits - creditCost) })
            .eq("id", user.id);
          
          if (deductError) {
            return res.status(500).json({ error: "Failed to deduct credits." });
          }
      } else if (rpcError || rpcSuccess === false) {
          return res.status(500).json({ error: "Failed to deduct credits atomically." });
      }
    }

    const renderBackendUrl = (process.env.VITE_RENDER_BACKEND_URL || "https://tracexdata-api.onrender.com").trim();
    const endpoint = \`\${renderBackendUrl.replace(/\\/$/, '')}/api/\${service}?key=TX-SYSTEM-INTERNAL-ADMIN&query=\${encodeURIComponent(query)}\`;
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (err: any) {
    console.error("User lookup error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
`;

code = code.replace(
  /app\.get\("\/api\/lookup", async \(req, res\) => \{/,
  userLookupCode + '\napp.get("/api/lookup", async (req, res) => {'
);

fs.writeFileSync('server.ts', code);
console.log('Added /api/user-lookup');
