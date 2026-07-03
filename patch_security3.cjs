const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. claim-manual IDOR fix
const claimManualIdor = `
    if (claim && claim.status === "success") {
      return res.status(400).json({ error: "This reference has already been successfully claimed and posted." });
    }

    // IDOR Protection: Verify ownership
    if (claim && claim.user_id && claim.user_id !== user.id) {
      return res.status(403).json({ error: "Unauthorized. This order does not belong to your account." });
    }
`;
code = code.replace(
  /\s*if \(claim && claim\.status === "success"\) \{\n\s*return res\.status\(400\)\.json\(\{ error: "This reference has already been successfully claimed and posted\." \}\);\n\s*\}/,
  claimManualIdor
);

// 2. Fix create-order body validation
const createOrderSecurity = `
app.post("/api/cashfree/create-order", async (req, res) => {
  const isPgPay = req.body?.plan_id === "pgpay_manual" || req.body?.plan_id === "panfind";
  if (!supabaseAdmin && !isPgPay) {
    return res.status(500).json({ error: "Backend not configured (Supabase Admin missing)" });
  }

  try {
    const { user_id, user_email, plan_id, amount, customer_phone, customer_name, return_url } = req.body;
    
    // Strict input validation
    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 100000) {
      return res.status(400).json({ error: "Invalid payment amount" });
    }
    if (plan_id !== "pgpay_manual" && plan_id !== "panfind") {
      if (!user_id || typeof user_id !== 'string') {
        return res.status(400).json({ error: "Invalid user ID" });
      }
    }
`;
code = code.replace(
  /app\.post\("\/api\/cashfree\/create-order", async \(req, res\) => \{\n\s*const isPgPay = req\.body\?\.plan_id === "pgpay_manual" \|\| req\.body\?\.plan_id === "panfind";\n\s*if \(\!supabaseAdmin && \!isPgPay\) \{\n\s*return res\.status\(500\)\.json\(\{ error: "Backend not configured \(Supabase Admin missing\)" \}\);\n\s*\}\n\s*try \{\n\s*const \{ user_id, user_email, plan_id, amount, customer_phone, customer_name, return_url \} = req\.body;/,
  createOrderSecurity
);


// 3. Prevent SQL injection / ensure proper types in all query endpoints
// Admin /api/admin/profiles - already uses req.headers.authorization and next()
// /api/admin/earnings
// /api/admin/history

fs.writeFileSync('server.ts', code);
console.log('Patched third set');
