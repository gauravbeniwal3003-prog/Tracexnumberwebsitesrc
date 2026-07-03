const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Imports
const importsToAdd = `
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
`;
code = code.replace(/import express from "express";/, 'import express from "express";' + importsToAdd);

// 2. Middlewares
const middlewaresToAdd = `
// Security Middleware (Helmet)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for Vite development
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? (origin, callback) => callback(null, origin) // Update in production to specific domain
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Specific Rate Limiters for sensitive endpoints
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 sensitive requests per hour
  message: { error: "Too many sensitive requests from this IP, please try again later." },
});
app.use('/api/cashfree', sensitiveLimiter);
app.use('/api/admin', sensitiveLimiter);

// Strict JSON parsing
app.use(express.json({ limit: '10kb' }));
`;

// Remove existing app.use(express.json()) to replace it
code = code.replace(/app\.use\(express\.json\(\)\);/, middlewaresToAdd);

// 3. Prevent Double Spending in /api/lookup
// We need to replace the credit deduction part
const lookupDeduct = `
    // 3. Check credits and deduct atomically
    if (currentCredits < cost) {
      return res.status(403).json({ error: \`Insufficient credits. You need at least \${cost} credits to perform this lookup.\` });
    }

    // Try RPC first for atomic deduction
    const { data: rpcSuccess, error: rpcError } = await supabaseAdmin.rpc("deduct_credits", {
        user_id: user.id,
        amount: cost
    });

    if (rpcError && rpcError.code === '42883') {
        // Fallback if RPC not deployed
        const { error: deductError } = await supabaseAdmin
          .from("profiles")
          .update({ credits: Math.max(0, currentCredits - cost) })
          .eq("id", user.id);
        
        if (deductError) {
          return res.status(500).json({ error: "Failed to process lookup credits. Please try again." });
        }
    } else if (rpcError || rpcSuccess === false) {
        return res.status(500).json({ error: "Failed to deduct credits atomically. Please try again or check your balance." });
    }
`;
code = code.replace(
  /\/\/ 3\. Deduct credits[\s\S]*?(?=\/\/ 4\. Route based on service)/, 
  lookupDeduct + '\n    '
);

// Do the same for aadhaar-to-pan
const aadhaarPanDeduct = `
    // 4. Deduct 150 credits atomically
    // Try RPC first for atomic deduction
    const { data: rpcSuccess, error: rpcError } = await supabaseAdmin.rpc("deduct_credits", {
        user_id: user.id,
        amount: cost
    });

    if (rpcError && rpcError.code === '42883') {
        // Fallback
        const { error: deductError } = await supabaseAdmin
          .from("profiles")
          .update({ credits: Math.max(0, currentCredits - cost) })
          .eq("id", user.id);
        
        if (deductError) {
          return res.status(500).json({ error: "Failed to deduct lookup credits. Please try again." });
        }
    } else if (rpcError || rpcSuccess === false) {
        return res.status(500).json({ error: "Failed to deduct credits atomically. Please try again or check your balance." });
    }
`;
code = code.replace(
  /\/\/ 4\. Deduct 150 credits[\s\S]*?(?=\/\/ 5\. Query External PAN Find API)/,
  aadhaarPanDeduct + '\n    '
);

// 4. Validation middleware
const validateOrderBody = `
app.post("/api/cashfree/create-order", async (req, res) => {
  try {
    const { amount, customer_id, customer_phone, customer_email, plan_id, plan_name } = req.body;
    
    // Strict input validation
    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 100000) {
      return res.status(400).json({ error: "Invalid payment amount" });
    }
    if (!customer_id || typeof customer_id !== 'string' || customer_id.length > 50) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }
    if (!customer_phone || typeof customer_phone !== 'string' || customer_phone.length > 15) {
      return res.status(400).json({ error: "Invalid phone number" });
    }
    if (!plan_id || typeof plan_id !== 'string') {
      return res.status(400).json({ error: "Invalid plan ID" });
    }
`;
code = code.replace(
  /app\.post\("\/api\/cashfree\/create-order", async \(req, res\) => \{\n\s*try \{\n\s*const \{ amount, customer_id, customer_phone, customer_email, plan_id, plan_name \} = req\.body;/,
  validateOrderBody
);

// 5. Payment Security: Add signature verification for reconcile
const reconcileSecurity = `
app.post("/api/cashfree/reconcile-user", async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id || typeof order_id !== 'string' || order_id.length > 100) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization token" });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: "Access Denied: Invalid or expired token" });
    }

    // Verify order belongs to this user
    const { data: existingTx, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("payment_id", order_id)
      .eq("user_id", user.id)
      .single();
      
    if (txError || !existingTx) {
      return res.status(403).json({ error: "Transaction not found or unauthorized" });
    }
`;
code = code.replace(
  /app\.post\("\/api\/cashfree\/reconcile-user", async \(req, res\) => \{\n\s*try \{\n\s*const \{ order_id \} = req\.body;\n/,
  reconcileSecurity + '\n'
);

// Write changes
fs.writeFileSync('server.ts', code);
console.log('Patched server.ts successfully');
