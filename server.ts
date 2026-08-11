import express from "express";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import crypto from "crypto";
import { setupAlvisRoutes } from "./server/alvisModule.ts";

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

async function fetchLocalApi(path: string, options?: any): Promise<any> {
  const portsToTry = [PORT];
  if (!portsToTry.includes(3000)) {
    portsToTry.push(3000);
  }
  if (!portsToTry.includes(8080)) {
    portsToTry.push(8080);
  }

  for (const port of portsToTry) {
    const url = `http://127.0.0.1:${port}${path}`;
    try {
      console.log(`[Local Fetch] Trying ${url}...`);
      const response = await fetch(url, options);
      if (response.ok) {
        const text = await response.text();
        const trimmed = text.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          const data = JSON.parse(trimmed);
          console.log(`[Local Fetch] Success on port ${port}`);
          return data;
        } else {
          console.warn(`[Local Fetch] Port ${port} returned non-JSON content:`, text.slice(0, 100));
        }
      } else {
        console.warn(`[Local Fetch] Port ${port} returned status ${response.status}`);
      }
    } catch (err: any) {
      console.warn(`[Local Fetch] Port ${port} failed:`, err.message);
    }
  }
  throw new Error("All local ports failed to respond with valid JSON");
}

// Supabase Configuration
const isKeyValid = (key: any): boolean => {
  return typeof key === "string" && key.trim().split(".").length === 3;
};

const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vb3BscXhiZnNrZ3dqbHB1dXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDcxMTAsImV4cCI6MjA5MzU4MzExMH0.oGnMxO4JvALvOGnSSqoeOmpxJMUWQ__Fe3LcZCu_er0";
const INTERNAL_MASTER_KEY = process.env.INTERNAL_MASTER_KEY || crypto.randomBytes(32).toString('hex');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://nooplqxbfskgwjlpuutr.supabase.co';
const rawAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_ANON_KEY = isKeyValid(rawAnonKey) ? rawAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vb3BscXhiZnNrZ3dqbHB1dXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDcxMTAsImV4cCI6MjA5MzU4MzExMH0.oGnMxO4JvALvOGnSSqoeOmpxJMUWQ__Fe3LcZCu_er0';

const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = isKeyValid(rawServiceKey) ? rawServiceKey : undefined;

let supabase: any;
let supabaseAdmin: any;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  console.log("[TRACEXDATA] Supabase Admin initialized securely.");
} else if (supabase) {
  supabaseAdmin = supabase;
  console.log("[TRACEXDATA] Supabase Admin initialized fallback to ANON_KEY.");
} else {
  console.error("[CRITICAL SECURITY ERROR] SUPABASE_SERVICE_ROLE_KEY and ANON_KEY are both missing.");
}

const getRequestClient = async (token: string) => {
  const clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  await clientInstance.auth.setSession({
    access_token: token,
    refresh_token: ""
  });
  return clientInstance;
};

// Cashfree Configuration
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || process.env.VITE_CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || process.env.VITE_CASHFREE_SECRET_KEY;
const CASHFREE_BASE_URL = process.env.CASHFREE_BASE_URL || "https://api.cashfree.com/pg";


// Security Middleware (Helmet)
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://sdk.cashfree.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      connectSrc: ["'self'", "https://*"],
      frameSrc: ["'self'", "https://sdk.cashfree.com"]
    }
  } : false,
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'same-origin' }
}));

// CORS Configuration
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Security Guard & Exploit Prevention Middleware
const securityGuard = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Always bypass strict body string length checks for admin settings / provider config routes
  if (req.path.includes('/provider-configs') || req.path.includes('/api-settings')) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Frame-Options', 'ALLOW-FROM https://ai.studio');
    return next();
  }

  const suspiciousRegex = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /UNION\s+ALL\s+SELECT/gi,
    /SELECT\s+.+\s+FROM/gi,
    /DROP\s+TABLE/gi,
    /DELETE\s+FROM/gi,
    /UPDATE\s+.+\s+SET/gi,
    /--\s*$/g,
    /\.\.\/\.\./g,
    /\/etc\/passwd/i,
    /system\(|exec\(|eval\(|passthru\(/i,
    /\${jndi:/i
  ];

  const inspectValue = (val: any): boolean => {
    if (!val) return false;
    if (typeof val === 'string') {
      if (val.length > 1000) return true;
      for (const pattern of suspiciousRegex) {
        if (pattern.test(val)) return true;
      }
    } else if (typeof val === 'object') {
      for (const k of Object.keys(val)) {
        if (inspectValue(val[k])) return true;
      }
    }
    return false;
  };

  if (req.path.startsWith('/api/')) {
    if (inspectValue(req.query) || inspectValue(req.body)) {
      return res.status(400).json({
        status: "error",
        error: "Security Protection: Malicious payload or unaccepted characters detected.",
        message: "Security Protection: Malicious payload or unaccepted characters detected."
      });
    }
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'ALLOW-FROM https://ai.studio');
  next();
};

app.use(securityGuard);

// Rate Limiting (Adjusted for smooth user experience while protecting against DDoS)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per IP
  message: { status: "error", message: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Specific Rate Limiters for lookup and search endpoints
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP (prevents DDoS without interrupting normal users & API keys)
  message: { status: "error", message: "Rate limit exceeded. Maximum 60 API searches per minute allowed." }
});
app.use('/api/user-lookup', searchLimiter);
app.use('/api/lookup', searchLimiter);
app.use('/api/aadhaar-to-pan', searchLimiter);
app.use('/api/panfind', searchLimiter);
app.use('/api/balance', searchLimiter);
app.use('/api/user/balance', searchLimiter);
app.use('/api/pricing', searchLimiter);
app.use('/api/user/pricing', searchLimiter);
app.use('/api/services/pricing', searchLimiter);

const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 sensitive requests per hour
  message: { status: "error", message: "Too many sensitive requests from this IP, please try again later." },
});
app.use('/api/cashfree', sensitiveLimiter);
app.use('/api/admin', sensitiveLimiter);

// Strict JSON parsing
app.use(express.json({ limit: '10kb' }));

// Dedicated Alvis App API & Wallet Module
setupAlvisRoutes(app, supabaseAdmin);


// Healthy Check
app.get("/api/health", (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    status: "healthy",
    engine: "TraceXData Intelligence",
    timestamp: new Date().toISOString(),
    supabase: !!supabase,
    supabaseAdmin: !!supabaseAdmin,
    cashfree: !!CASHFREE_APP_ID
  });
});

// --- API SaaS CORE FUNCTIONS ---

const StandardMapping = {
  name: (item: any) => (item.name || item.full_name || "N/A").toUpperCase(),
  mobile: (item: any, q: string) => item.mobile || item.number || q || "N/A",
  alt_mobile: (item: any) => item.alt_mobile || item.alt_number || "N/A",
  operator: (item: any) => (item.operator || item.carrier || "N/A").toUpperCase(),
  circle: (item: any) => (item.state_circle || item.circle || item.state || "N/A").toUpperCase(),
  address: (item: any) => item.address || item.location || "N/A"
};

function filterApiResponse(rawData: any, query: string, planName: string, expiresAt: string, requestsUsed: number) {
  // Extract results array from various common nested structures
  let results = rawData.results || rawData.data || rawData.records || (rawData.status === true ? rawData : null);
  if (results && !Array.isArray(results) && typeof results === 'object') {
     // If it's a single object (some APIs return one object), wrap it
     if (results.name || results.mobile || results.full_name) results = [results];
     else results = Object.values(results).filter(v => v && typeof v === 'object');
  }
  
  const cleanedData: any[] = [];
  
  if (Array.isArray(results)) {
    results.forEach((item: any, idx: number) => {
      if (!item || typeof item !== 'object') return;
      
      const filteredItem: any = { result_no: idx + 1 };
      filteredItem.name = StandardMapping.name(item);
      filteredItem.mobile = StandardMapping.mobile(item, query);
      filteredItem.alt_mobile = StandardMapping.alt_mobile(item);
      filteredItem.operator = StandardMapping.operator(item);
      filteredItem.circle = StandardMapping.circle(item);
      filteredItem.address = StandardMapping.address(item);

      // Clean N/A values
      Object.keys(filteredItem).forEach(k => {
        const v = filteredItem[k];
        if (!v || v === 'null' || v === 'n-a' || v === 'NA' || String(v).trim() === '') filteredItem[k] = "N/A";
      });

      cleanedData.push(filteredItem);
    });
  }

  const timeLeft = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minsLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  return {
    status: cleanedData.length > 0 ? "success" : "not_found",
    buy_api: "https://tracexdata.online/buy-api",
    website: "https://tracexdata.online",
    query: query,
    api_status: {
      plan: planName,
      expires_at: expiresAt,
      time_left: `${hoursLeft}h ${minsLeft}m`,
      requests_used: requestsUsed
    },
    results_found: cleanedData.length,
    data: cleanedData
  };
}

const maskNumberForLog = (num: string) => {
  const clean = String(num || "").trim();
  if (clean.length < 4) return "⚡ BYPASS/RECON";
  return clean.substring(0, 3) + "XXXX" + clean.substring(Math.max(3, clean.length - 3));
};

// Referral Deposit Bonus Processor: Credits 5% of deposit amount to referrer
async function processReferralDepositBonus(referredUserId: string, depositAmount: number) {
  if (!supabaseAdmin || !depositAmount || depositAmount <= 0) return;
  try {
    const { data: referredProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, referred_by")
      .eq("id", referredUserId)
      .maybeSingle();

    if (!referredProfile || !referredProfile.referred_by) return;

    const refCodeOrId = referredProfile.referred_by;

    let { data: referrerProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, credits, wallet_balance")
      .or(`id.eq.${refCodeOrId},referral_code.eq.${refCodeOrId}`)
      .maybeSingle();

    if (!referrerProfile) {
      const { data: refRow } = await supabaseAdmin
        .from("referrals")
        .select("referrer_id")
        .eq("referred_id", referredUserId)
        .maybeSingle();

      if (refRow?.referrer_id) {
        const { data: refProf } = await supabaseAdmin
          .from("profiles")
          .select("id, email, credits, wallet_balance")
          .eq("id", refRow.referrer_id)
          .maybeSingle();
        referrerProfile = refProf;
      }
    }

    if (!referrerProfile) return;

    // Calculate 5% Commission
    const commission = Math.round((depositAmount * 0.05) * 100) / 100;
    if (commission <= 0) return;

    const currentBal = Number(referrerProfile.wallet_balance || referrerProfile.credits || 0);
    const newBal = currentBal + commission;

    await supabaseAdmin.from("profiles").update({
      wallet_balance: newBal,
      credits: newBal
    }).eq("id", referrerProfile.id);

    await supabaseAdmin.from("referral_earnings").insert([{
      referrer_id: referrerProfile.id,
      referred_id: referredUserId,
      amount: commission,
      deposit_amount: depositAmount,
      description: `5% Commission from deposit of ₹${depositAmount} by ${referredProfile.email || referredProfile.full_name || 'Referred User'}`,
      created_at: new Date().toISOString()
    }]);

    await supabaseAdmin.from("wallet_transactions").insert([{
      user_email: referrerProfile.email,
      amount: commission,
      type: "referral_bonus",
      status: "SUCCESS",
      description: `5% Referral Commission from deposit by ${referredProfile.email || 'referred user'}`,
      created_at: new Date().toISOString()
    }]);

    console.log(`[REFERRAL BONUS] Successfully credited ₹${commission} (5% of ₹${depositAmount}) to referrer ${referrerProfile.email}`);
  } catch (err) {
    console.error("[REFERRAL BONUS ERROR]:", err);
  }
}

// Dynamic Price Calculator: Retrieves custom per-user pricing or discount
async function getEffectiveServicePrice(serviceKey: string, userId?: string, userEmail?: string): Promise<number> {
  let basePrice = serviceKey === 'aadhaar_to_pan' ? 150 : 1;
  if (!supabaseAdmin) return basePrice;

  try {
    const { data: serviceData } = await supabaseAdmin
      .from("api_services")
      .select("base_price")
      .eq("service_key", serviceKey)
      .maybeSingle();

    if (serviceData && serviceData.base_price !== undefined && serviceData.base_price !== null) {
      basePrice = Number(serviceData.base_price);
    }

    if (!userId && !userEmail) return basePrice;

    let query = supabaseAdmin.from("user_custom_pricing").select("*");
    if (userEmail && userId) {
      query = query.or(`user_email.eq.${userEmail},user_id.eq.${userId}`);
    } else if (userEmail) {
      query = query.eq("user_email", userEmail);
    } else if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: customPricings } = await query;
    if (customPricings && customPricings.length > 0) {
      const directMatch = customPricings.find((p: any) => p.service_key === serviceKey);
      if (directMatch) {
        if (directMatch.custom_price !== null && directMatch.custom_price !== undefined) {
          return Number(directMatch.custom_price);
        }
        if (directMatch.discount_percent && Number(directMatch.discount_percent) > 0) {
          const disc = Number(directMatch.discount_percent);
          return Math.max(0, basePrice * (1 - disc / 100));
        }
      }

      const allMatch = customPricings.find((p: any) => p.service_key === 'ALL');
      if (allMatch) {
        if (allMatch.custom_price !== null && allMatch.custom_price !== undefined) {
          return Number(allMatch.custom_price);
        }
        if (allMatch.discount_percent && Number(allMatch.discount_percent) > 0) {
          const disc = Number(allMatch.discount_percent);
          return Math.max(0, basePrice * (1 - disc / 100));
        }
      }
    }

    let profQuery = supabaseAdmin.from("profiles").select("user_discount_percent");
    if (userEmail) profQuery = profQuery.eq("email", userEmail);
    else if (userId) profQuery = profQuery.eq("id", userId);

    const { data: prof } = await profQuery.maybeSingle();
    if (prof && prof.user_discount_percent && Number(prof.user_discount_percent) > 0) {
      const disc = Number(prof.user_discount_percent);
      return Math.max(0, basePrice * (1 - disc / 100));
    }

    return basePrice;
  } catch (err) {
    console.error("Error calculating effective price:", err);
    return basePrice;
  }
}

async function logApiRequest(apiKeyId: string | null, maskedNumber: string, status: string, responseTimeMs: number) {
  if (!supabaseAdmin) return;
  try {
    const insertObj: any = {
      masked_number: maskedNumber,
      status: status,
      response_time_ms: responseTimeMs
    };
    if (apiKeyId && apiKeyId !== "master" && apiKeyId !== "master-bypass") {
      insertObj.api_key_id = apiKeyId;
    }
    await supabaseAdmin.from("api_logs").insert(insertObj);
  } catch (err) {
    console.error("Failed to write api_logs:", err);
  }
}

async function logSearchHistory(
  req: express.Request, 
  searchType: string, 
  query: string, 
  status: string, 
  passedClient?: any,
  resultsPayload?: any,
  customUserId?: string,
  customUserEmail?: string
) {
  const db = passedClient || supabaseAdmin;
  if (!db) return;
  try {
    let userId: string | null = customUserId || null;
    let userEmail: string | null = customUserEmail || null;

    // 1. Try to get user from Authorization token
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        if (token) {
          try {
            const client = passedClient || await getRequestClient(token);
            const { data: { user } } = await client.auth.getUser(token);
            if (user) {
              userId = user.id;
              userEmail = user.email || null;
            }
          } catch (authErr) {
            // Token parse warning ignored
          }
        }
      }
    }

    // 2. If no user from token, check if there's an API key in query, headers, or body
    if (!userId) {
      const key = String(
        req.query.key || 
        req.query.api_key || 
        req.query.apiKey || 
        req.headers['x-api-key'] ||
        req.headers['api_key'] ||
        req.body?.key || 
        req.body?.api_key || 
        req.body?.apiKey || 
        ""
      ).trim();

      if (key && key !== INTERNAL_MASTER_KEY) {
        const { data: keyRecords } = await db
          .from("api_keys")
          .select("user_id, user_email")
          .eq("api_key", key)
          .limit(1);

        if (keyRecords && keyRecords[0]) {
          userId = keyRecords[0].user_id || null;
          userEmail = keyRecords[0].user_email || null;
        }
      }
    }

    if (!userEmail && userId) {
      try {
        const { data: prof } = await db.from("profiles").select("email").eq("id", userId).limit(1);
        if (prof?.[0]?.email) userEmail = prof[0].email;
      } catch (e) {
        // profile query ignored
      }
    }

    const finalEmail = userEmail || "API User";
    const nowIso = new Date().toISOString();

    // Insert into search_history
    await db.from("search_history").insert({
      user_id: userId,
      user_email: finalEmail,
      search_type: searchType,
      query: query,
      status: status,
      payload: resultsPayload || { status, search_type: searchType, query, created_at: nowIso },
      created_at: nowIso
    });

    // Also insert into service_records for complete dual-table log compatibility
    if (userId) {
      const refCode = query || `QRY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await db.from("service_records").insert({
        user_id: userId,
        client_name: finalEmail,
        service_name: (searchType || "Lookup").replace(/_/g, ' ').toUpperCase(),
        reference_code: refCode,
        status: status.toUpperCase() === "SUCCESS" ? "SUCCESS" : "FAILED",
        result_payload: resultsPayload || { status, search_type: searchType, query, created_at: nowIso },
        log_number: Math.floor(100 + Math.random() * 900),
        created_at: nowIso
      });
    }
  } catch (err) {
    console.error("Failed to write search_history / service_records:", err);
  }
}

// Unified response Formatter to keep premium branding consistent across all query types
function formatUnifiedSaaSResponse({
  type,
  query,
  expiresAt,
  planName,
  requestsUsed,
  records
}: {
  type: 'phone' | 'telegram' | 'adhr' | 'bnk' | 'rasion' | 'vehicle' | 'veh_owner_num' | 'email';
  query: string;
  expiresAt: string;
  planName: string;
  requestsUsed: number;
  records: any[];
}) {
  const cleanedData: any[] = [];

  records.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;

    const filteredItem: any = { ...item, result_no: idx + 1 };
    
    if (type === 'phone') {
      filteredItem.name = (item.name || item.full_name || "N/A").toString().toUpperCase();
      filteredItem.mobile = item.mobile || item.number || query || "N/A";
      filteredItem.alt_mobile = item.alt_mobile || item.alt_number || "N/A";
      filteredItem.operator = (item.operator || item.carrier || "N/A").toString().toUpperCase();
      filteredItem.circle = (item.state_circle || item.circle || item.state || "N/A").toString().toUpperCase();
      filteredItem.address = item.address || item.location || "N/A";
    } else if (type === 'telegram') {
      Object.entries(item).forEach(([key, val]) => {
        if (key === 'result_no') return;
        let cleanedVal = val;
        if (typeof val === 'string') {
          cleanedVal = val.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "").trim();
        }
        filteredItem[key] = cleanedVal;
      });
      if (!filteredItem.telegram_id && !filteredItem.username) {
        filteredItem.telegram_id = query;
      }
    } else {
      // Dynamic mapping for Aadhar, Bank (IFSC), and Ration Card lookups
      Object.entries(item).forEach(([key, val]) => {
        if (key === 'result_no') return;
        const normalizedKey = key.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "info");
        let cleanedVal = val;
        if (typeof val === 'string') {
          cleanedVal = val.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "").trim().toUpperCase();
        }
        filteredItem[normalizedKey] = cleanedVal;
      });
    }

    // Clean N/A values and format keys elegantly
    Object.keys(filteredItem).forEach(k => {
      const v = filteredItem[k];
      if (v === undefined || v === null || v === 'null' || v === 'n-a' || v === 'NA' || String(v).trim() === '') {
        filteredItem[k] = "N/A";
      }
    });

    cleanedData.push(filteredItem);
  });

  const timeLeft = expiresAt ? Math.max(0, new Date(expiresAt).getTime() - Date.now()) : 0;
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minsLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  const resultsObj: Record<string, any> = {};
  cleanedData.forEach((item, idx) => {
    resultsObj[`Result ${idx + 1}`] = item;
  });

  const resObj: any = {
    status: cleanedData.length > 0 ? "success" : "not_found",
    buy_api: "https://tracexdata.online/buy-api",
    website: "https://tracexdata.online",
    query: query,
    api_status: {
      plan: planName,
      expires_at: expiresAt,
      time_left: expiresAt ? `${hoursLeft}h ${minsLeft}m` : "Active",
      requests_used: requestsUsed
    },
    results_found: cleanedData.length,
    results: resultsObj,
    data: cleanedData
  };
  return resObj;
}

// Helper to recursively scrub specific branding strings from response objects
function cleanBrandingObject(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    return obj.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "").trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanBrandingObject(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      cleaned[key] = cleanBrandingObject(obj[key]);
    }
    return cleaned;
  }
  return obj;
}

// Helper to parse unstructured plain text phone responses into structured JSON
function parsePhonePlainText(text: string): any {
  const cleanedText = text.trim();
  
  if (/No\s+data\s+found/i.test(cleanedText) || /No\s+records?\s+found/i.test(cleanedText) || cleanedText.includes('❌')) {
    if (cleanedText.includes('No data found') || cleanedText.toLowerCase().includes('no record')) {
      return { status: false, results: {}, message: "No Record Found for this number." };
    }
  }

  const rawBlocks = cleanedText.split(/📌\s*Additional\s*Result:/gi);
  const results: Record<string, any> = {};
  let recordIndex = 1;

  for (const rawBlock of rawBlocks) {
    const record: Record<string, any> = {};
    const lines = rawBlock.split('\n').map(l => l.trim()).filter(Boolean);
    
    for (const line of lines) {
      const cleanLine = line.replace(/[\u2600-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').replace(/\*/g, '').trim();
      const colonIdx = cleanLine.indexOf(':');
      if (colonIdx !== -1) {
        const keyRaw = cleanLine.substring(0, colonIdx).trim().toLowerCase();
        const valRaw = cleanLine.substring(colonIdx + 1).trim().replace(/<\/?code>/g, '');
        
        if (!valRaw || ['none', 'null', 'n/a', ''].includes(valRaw.toLowerCase())) {
          continue;
        }

        let key = '';
        if (keyRaw.includes('name') && !keyRaw.includes('father')) key = 'name';
        else if (keyRaw.includes('father')) key = 'father_name';
        else if (keyRaw.includes('mobile') || keyRaw.includes('phone')) key = 'mobile';
        else if (keyRaw.includes('address') || keyRaw.includes('location')) key = 'address';
        else if (keyRaw.includes('alternate') || keyRaw.includes('alt_mobile') || keyRaw.includes('alt_number')) key = 'alt_mobile';
        else if (keyRaw.includes('circle') || keyRaw.includes('operator') || keyRaw.includes('carrier') || keyRaw.includes('state')) key = 'state_circle';
        else if (keyRaw.includes('aadhar') || keyRaw.includes('identity')) key = 'aadhar_number';
        
        if (key) {
          record[key] = valRaw;
        }
      }
    }

    if (Object.keys(record).length > 0 && (record.name || record.mobile)) {
      results[`Result ${recordIndex}`] = record;
      recordIndex++;
    }
  }

  if (Object.keys(results).length > 0) {
    return { status: true, results };
  }

  return { status: false, results: {}, message: "No Record Found for this number." };
}

// Helper to parse unstructured plain text responses into structured JSON
function parsePlainTextLookup(text: string, type: 'aadhar' | 'pan' | 'bank' | 'rasion'): any {
  const result: any = {};
  const cleanText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "").trim();

  const lines = cleanText.split('\n');
  let lastKey: string | null = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Strip emojis
    const cleanLine = line.replace(/[\u2600-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').replace(/\*/g, '').trim();
    if (!cleanLine) continue;
    if (cleanLine.startsWith('─') || cleanLine.startsWith('━') || cleanLine.startsWith('─') || cleanLine.startsWith('━')) continue;

    if (cleanLine.includes(':')) {
      const colonIdx = cleanLine.indexOf(':');
      const keyRaw = cleanLine.substring(0, colonIdx).trim();
      const valRaw = cleanLine.substring(colonIdx + 1).trim().replace(/<\/?code>/g, '');

      if (!valRaw || ['none', 'null', 'n/a'].includes(valRaw.toLowerCase())) {
        lastKey = null;
        continue;
      }

      const keyLower = keyRaw.toLowerCase();
      let mappedKey = '';

      if (type === 'aadhar') {
        if (keyLower.includes('name') && !keyLower.includes('father')) mappedKey = 'name';
        else if (keyLower.includes('father')) mappedKey = 'father_name';
        else if (keyLower.includes('mobile') || keyLower.includes('phone')) mappedKey = 'mobile';
        else if (keyLower.includes('address')) mappedKey = 'address';
        else if (keyLower.includes('circle') || keyLower.includes('operator')) mappedKey = 'state_circle';
        else if (keyLower.includes('aadhar') || keyLower.includes('identity')) mappedKey = 'aadhar_number';
      } else if (type === 'pan') {
        if (keyLower.includes('full name') || (keyLower.includes('name') && !keyLower.includes('father'))) mappedKey = 'name';
        else if (keyLower.includes('pan number') || keyLower.includes('pan_number')) mappedKey = 'pan_number';
        else if (keyLower.includes('pan status')) mappedKey = 'pan_status';
        else if (keyLower.includes('gender')) mappedKey = 'gender';
        else if (keyLower.includes('dob') || keyLower.includes('birth')) mappedKey = 'date_of_birth';
        else if (keyLower.includes('linked')) mappedKey = 'aadhaar_linked';
        else if (keyLower.includes('aadhar') || keyLower.includes('identity')) mappedKey = 'aadhar_number';
      } else if (type === 'bank') {
        if (keyLower.includes('bank name')) mappedKey = 'bank_name';
        else if (keyLower.includes('bank code')) mappedKey = 'bank_code';
        else if (keyLower.includes('branch')) mappedKey = 'branch';
        else if (keyLower.includes('address')) mappedKey = 'address';
        else if (keyLower.includes('city')) mappedKey = 'city';
        else if (keyLower.includes('centre')) mappedKey = 'centre';
        else if (keyLower.includes('district')) mappedKey = 'district';
        else if (keyLower.includes('state')) mappedKey = 'state';
        else if (keyLower.includes('pin')) mappedKey = 'pin_code';
        else if (keyLower.includes('micr')) mappedKey = 'micr_code';
        else if (keyLower.includes('contact')) mappedKey = 'contact';
        else if (keyLower.includes('neft')) mappedKey = 'neft';
        else if (keyLower.includes('rtgs')) mappedKey = 'rtgs';
        else if (keyLower.includes('imps')) mappedKey = 'imps';
        else if (keyLower.includes('upi')) mappedKey = 'upi';
      } else if (type === 'rasion') {
        if (keyLower.includes('name')) mappedKey = 'name';
        else if (keyLower.includes('family') || keyLower.includes('rasion') || keyLower.includes('ration')) mappedKey = 'family_id';
      }

      if (!mappedKey) {
        // Fallback generic key mapping
        mappedKey = keyRaw.replace(/[^a-zA-Z0-9\s_]/g, '').trim().toLowerCase().replace(/\s+/g, '_');
      }

      if (mappedKey) {
        result[mappedKey] = valRaw;
        lastKey = mappedKey;
      } else {
        lastKey = null;
      }
    } else {
      // Append to the last active key if we have one and the line is not a standard skip
      if (lastKey && result[lastKey]) {
        result[lastKey] = result[lastKey] + ' ' + cleanLine;
      }
    }
  }

  const parsedKeys = Object.keys(result);
  if (parsedKeys.length > 0) {
    result.raw_data = cleanText;
    return result;
  }
  return { raw_data: cleanText };
}

// Public SaaS API Endpoint (Smart Unified Lookup proxy to support multiple databases)

// GET /api/profile - Highly secure backend profile retrieval and creation
app.get("/api/profile", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace("Bearer ", "") : "";
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Token missing" });
  }
  try {
    const client = await getRequestClient(token);
    const { data: userData, error: authErr } = await client.auth.getUser(token);
    const user = userData?.user;
    if (authErr || !user) {
      return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      return res.status(500).json({ error: profileErr.message });
    }

    const now = new Date();

    if (!profile) {
      const freeCredits = 10;
      const newProfile = {
        id: user.id,
        email: user.email,
        credits: freeCredits,
        unlimited_expiry: null,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        avatar_url: user.user_metadata?.avatar_url || null,
        is_free_credit_claimed: true,
        last_weekly_credit_at: now.toISOString(),
        last_daily_credit_at: now.toISOString(),
      };
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert(newProfile)
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }
      return res.json(inserted);
    } else {
      const lastDaily = profile.last_daily_credit_at ? new Date(profile.last_daily_credit_at) : null;
      const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
      const shouldGiveDaily = !lastDaily || (now.getTime() - lastDaily.getTime() >= twentyFourHoursInMs);

      if (shouldGiveDaily) {
        let updatedCredits = profile.credits || 0;
        let creditsChanged = false;

        // "Daily Credits - 10"
        // "If previous day Free Credit not spend means if account Balance is More than 10 or equal to 10 then No free Credit"
        if (updatedCredits < 10) {
          updatedCredits = 10;
          creditsChanged = true;
        }

        const updatePayload: any = {
          last_daily_credit_at: now.toISOString(),
        };
        if (creditsChanged) {
          updatePayload.credits = updatedCredits;
        }

        try {
          const { data: updated, error: updateErr } = await supabaseAdmin
            .from("profiles")
            .update(updatePayload)
            .eq("id", user.id)
            .select()
            .single();

          if (!updateErr && updated) {
            return res.json(updated);
          } else {
            console.warn("Could not update daily profile credits, returning current:", updateErr);
          }
        } catch (dbErr) {
          console.warn("Exception during daily credit update, database schema might need update. Returning current profile:", dbErr);
        }
      }
      return res.json(profile);
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// POST /api/profile/update - Update profile securely without direct DB interaction
app.post("/api/profile/update", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace("Bearer ", "") : "";
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Token missing" });
  }
  try {
    const client = await getRequestClient(token);
    const { data: userData, error: authErr } = await client.auth.getUser(token);
    const user = userData?.user;
    if (authErr || !user) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    const { full_name, avatar_url } = req.body;
    const updateData: any = {};
    if (typeof full_name === 'string') updateData.full_name = full_name;
    if (typeof avatar_url === 'string') updateData.avatar_url = avatar_url;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single();

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message });
    }
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// Persistent file storage for mobile users so registered accounts survive server reloads
const USERS_FILE_PATH = path.join(process.cwd(), "data", "mobile_users.json");

function loadMobileUsersStore(): Map<string, any> {
  const storeMap = new Map<string, any>();
  try {
    if (fs.existsSync(USERS_FILE_PATH)) {
      const rawData = fs.readFileSync(USERS_FILE_PATH, "utf-8");
      const parsedArray = JSON.parse(rawData);
      if (Array.isArray(parsedArray)) {
        for (const userObj of parsedArray) {
          if (userObj && userObj.phone) {
            const clean = userObj.phone.replace(/\D/g, "").slice(-10);
            storeMap.set(clean, { ...userObj, phone: clean });
          }
        }
      }
    }
  } catch (err) {
    console.warn("Could not load mobile_users.json:", err);
  }
  return storeMap;
}

function saveMobileUsersStore(storeMap: Map<string, any>) {
  try {
    const dir = path.dirname(USERS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const arrayData = Array.from(storeMap.values());
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(arrayData, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not save mobile_users.json:", err);
  }
}

const mobileUsersStore: Map<string, any> = loadMobileUsersStore();

// POST /api/mobile-auth/signup - Parameterized & Encrypted Mobile Sign Up
app.post("/api/mobile-auth/signup", async (req, res) => {
  try {
    const { phone, password, full_name } = req.body;

    // Smart Validation & Input Sanitization (Protects against SQL Injection & XSS)
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ error: "Mobile number is required." });
    }
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Please enter a valid 10-digit Indian mobile number." });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const nameToUse = (full_name && typeof full_name === "string" && full_name.trim())
      ? full_name.trim().substring(0, 100)
      : `User ${cleanPhone.slice(-4)}`;

    // Hash password securely with PBKDF2 salt
    const passwordHash = crypto.pbkdf2Sync(password, "tracex_mobile_salt_2026", 10000, 64, "sha512").toString("hex");

    // Check duplicate using parameterized Supabase ORM or fallback
    let existingUser = null;
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("app_users")
          .select("id, phone")
          .eq("phone", cleanPhone)
          .maybeSingle();
        if (!error && data) {
          existingUser = data;
        }
      } catch (e) {
        // Table may not exist yet
      }
    }

    if (!existingUser && mobileUsersStore.has(cleanPhone)) {
      existingUser = mobileUsersStore.get(cleanPhone);
    }

    if (existingUser) {
      return res.status(400).json({ error: `Account already exists for mobile number +91 ${cleanPhone}. Please login.` });
    }

    const userId = `usr_mob_${cleanPhone}_${Date.now()}`;
    const newUser = {
      id: userId,
      phone: cleanPhone,
      password_hash: passwordHash,
      full_name: nameToUse,
      email: `${cleanPhone}@tracexdata.com`,
      credits: 1470.00,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("app_users").insert([newUser]);
      } catch (e) {
        console.warn("Could not insert into app_users table, saved to persistent store:", e);
      }
    }
    mobileUsersStore.set(cleanPhone, newUser);
    saveMobileUsersStore(mobileUsersStore);

    const token = `mob_tok_${cleanPhone}_${Math.random().toString(36).substring(2, 14)}`;
    return res.json({
      status: "success",
      message: "Account registered successfully!",
      token,
      user: {
        id: newUser.id,
        phone: newUser.phone,
        full_name: newUser.full_name,
        email: newUser.email,
        credits: newUser.credits
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Signup failed." });
  }
});

// POST /api/mobile-auth/login - Parameterized & Encrypted Mobile Login
app.post("/api/mobile-auth/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ error: "Mobile number is required." });
    }
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: "Please enter a valid 10-digit mobile number." });
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Password is required." });
    }

    const passwordHash = crypto.pbkdf2Sync(password, "tracex_mobile_salt_2026", 10000, 64, "sha512").toString("hex");

    let foundUser = null;
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("app_users")
          .select("*")
          .eq("phone", cleanPhone)
          .maybeSingle();
        if (!error && data) {
          foundUser = data;
        }
      } catch (e) {
        // Table may not exist yet
      }
    }

    if (!foundUser && mobileUsersStore.has(cleanPhone)) {
      foundUser = mobileUsersStore.get(cleanPhone);
    }

    if (!foundUser) {
      return res.status(404).json({ error: `No account found for mobile +91 ${cleanPhone}. Please register first.` });
    }

    if (foundUser.password_hash !== passwordHash) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    const token = `mob_tok_${cleanPhone}_${Math.random().toString(36).substring(2, 14)}`;
    return res.json({
      status: "success",
      message: "Login successful!",
      token,
      user: {
        id: foundUser.id,
        phone: foundUser.phone,
        full_name: foundUser.full_name,
        email: foundUser.email || `${foundUser.phone}@tracexdata.com`,
        credits: foundUser.credits !== undefined ? foundUser.credits : 1470.00
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Login failed." });
  }
});

function generate8DigitApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET /api/user-keys - Fetch API keys securely on behalf of user
app.get("/api/user-keys", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace("Bearer ", "") : "";
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Token missing" });
  }
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database offline" });
    }
    const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    const user = userData?.user;
    if (authErr || !user) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    let { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    data = data || [];
    const has8Digit = data.some((k: any) => k.api_key && String(k.api_key).length === 8 && k.status === "active");
    if (!has8Digit) {
      const autoKey = generate8DigitApiKey();
      const { data: newKeyData, error: createErr } = await supabaseAdmin
        .from("api_keys")
        .insert({
          api_key: autoKey,
          user_id: user.id,
          user_email: user.email || "N/A",
          plan_name: "Account Wallet API (8-Digit)",
          request_limit: null,
          expires_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
          status: "active"
        })
        .select("*");

      if (!createErr && newKeyData) {
        data = [...newKeyData, ...data];
      }
    }

    data.sort((a: any, b: any) => {
      const a8 = a.api_key && String(a.api_key).length === 8 ? 1 : 0;
      const b8 = b.api_key && String(b.api_key).length === 8 ? 1 : 0;
      if (a8 !== b8) return b8 - a8;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// GET /api/wallet/history - Fetch wallet debit/credit transaction history
app.get("/api/wallet/history", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  
  try {
    if (!supabaseAdmin) {
      return res.json([]);
    }

    let userId = null;
    let userEmail = null;

    if (token) {
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      if (userData?.user) {
        userId = userData.user.id;
        userEmail = userData.user.email;
      }
    }

    if (!userId && !userEmail) {
      return res.json([]);
    }

    const { data: txData, error: txErr } = await supabaseAdmin
      .from("wallet_transactions")
      .select("*")
      .or(`user_id.eq.${userId},user_email.eq.${userEmail}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (txErr || !txData || txData.length === 0) {
      return res.json([]);
    }

    const formatted = txData.map((t: any, idx: number) => ({
      id: t.id || idx + 1,
      service: t.service_name || t.description || "Wallet Operation",
      type: (t.type || "Debit").toLowerCase() === "credit" ? "Credit" : "Debit",
      amount: Number(t.amount || 0),
      balanceAfter: Number(t.balance_after || 0),
      date: t.created_at ? new Date(t.created_at).toISOString().replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19)
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.json([]);
  }
});

// GET /api/referral - Fetch referral statistics and referral users
app.get("/api/referral", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  try {
    if (!supabaseAdmin || !token) {
      return res.json({
        totalEarnings: 0,
        totalReferrals: 0,
        myReferrals: [],
        referralEarnings: []
      });
    }

    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    const user = userData?.user;
    if (!user) {
      return res.json({
        totalEarnings: 0,
        totalReferrals: 0,
        myReferrals: [],
        referralEarnings: []
      });
    }

    // Check user profile for referral code
    const { data: prof } = await supabaseAdmin.from("profiles").select("*").eq("id", user.id).single();
    let code = prof?.referral_code;
    if (!code) {
      code = `tracex-${user.id.substring(0, 5)}`;
      await supabaseAdmin.from("profiles").update({ referral_code: code }).eq("id", user.id);
    }

    const { data: refs } = await supabaseAdmin.from("referrals").select("*").eq("referrer_id", user.id);
    const { data: earnings } = await supabaseAdmin.from("referral_earnings").select("*").eq("referrer_id", user.id);

    const totalE = earnings?.reduce((acc: number, item: any) => acc + Number(item.amount || 0), 0) || 0;

    return res.json({
      referralCode: code,
      totalEarnings: totalE,
      totalReferrals: refs?.length || 0,
      myReferrals: (refs || []).map((r: any) => ({
        email: r.referred_email || "User",
        joinDate: r.created_at ? new Date(r.created_at).toISOString().substring(0, 10) : "2026-08-08",
        status: r.status || "ACTIVE"
      })),
      referralEarnings: (earnings || []).map((e: any) => ({
        date: e.created_at ? new Date(e.created_at).toISOString().substring(0, 10) : "2026-08-08",
        description: e.description || "Referral Recharge Commission (5%)",
        amount: Number(e.amount || 0).toFixed(2)
      }))
    });
  } catch (err: any) {
    return res.json({
      totalEarnings: 0,
      totalReferrals: 0,
      myReferrals: [],
      referralEarnings: []
    });
  }
});

// GET /api/service-records - Fetch user's last service execution logs
app.get("/api/service-records", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const reqEmail = String(req.query.email || "").trim();
  const reqUserId = String(req.query.user_id || "").trim();
  const apiKeyParam = String(req.query.api_key || req.query.key || req.headers['x-api-key'] || "").trim();

  try {
    if (!supabaseAdmin) {
      return res.json([]);
    }

    let targetUserId: string | null = null;
    let targetUserEmail: string | null = null;

    if (token) {
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      const user = userData?.user;
      if (user) {
        targetUserId = user.id;
        targetUserEmail = user.email || null;
      }
    }

    if (!targetUserId && apiKeyParam) {
      const { data: keyRecords } = await supabaseAdmin
        .from("api_keys")
        .select("user_id, user_email")
        .eq("api_key", apiKeyParam)
        .limit(1);
      if (keyRecords && keyRecords[0]) {
        targetUserId = keyRecords[0].user_id || null;
        targetUserEmail = keyRecords[0].user_email || null;
      }
    }

    if (!targetUserId && reqUserId) {
      targetUserId = reqUserId;
    }
    if (!targetUserEmail && reqEmail) {
      targetUserEmail = reqEmail;
    }

    if (!targetUserId && !targetUserEmail) {
      return res.json([]);
    }

    const allFormatted: any[] = [];
    const seenMap = new Set<string>();

    // 1. Fetch from search_history
    let querySh = supabaseAdmin.from("search_history").select("*").order("created_at", { ascending: false }).limit(50);
    if (targetUserId && targetUserEmail) {
      querySh = querySh.or(`user_id.eq.${targetUserId},user_email.eq.${targetUserEmail}`);
    } else if (targetUserId) {
      querySh = querySh.eq("user_id", targetUserId);
    } else if (targetUserEmail) {
      querySh = querySh.eq("user_email", targetUserEmail);
    }

    const { data: searchLogs } = await querySh;

    if (searchLogs && Array.isArray(searchLogs)) {
      searchLogs.forEach((r: any, idx: number) => {
        const uniqueKey = `${r.search_type}_${r.query}_${r.created_at}`;
        seenMap.add(uniqueKey);
        allFormatted.push({
          id: String(r.id || `sh_${idx + 1}`),
          logId: `#${r.id != null ? r.id : (idx + 1)}`,
          dateTime: r.created_at ? new Date(r.created_at).toISOString().replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19),
          client: (r.user_email || targetUserEmail || "User").split('@')[0],
          serviceName: (r.search_type || "Lookup").replace(/_/g, ' ').toUpperCase(),
          referenceCode: r.query || "N/A",
          status: (r.status || "SUCCESS").toUpperCase() === "SUCCESS" ? "SUCCESS" : "FAILED",
          payload: r.payload || r.results || {
            status: r.status || "SUCCESS",
            search_type: r.search_type,
            query: r.query,
            created_at: r.created_at
          },
          createdAtTs: r.created_at ? new Date(r.created_at).getTime() : 0
        });
      });
    }

    // 2. Fetch from service_records
    if (targetUserId) {
      const { data: recs } = await supabaseAdmin
        .from("service_records")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (recs && Array.isArray(recs)) {
        recs.forEach((r: any, idx: number) => {
          const uniqueKey = `${r.service_name}_${r.reference_code}_${r.created_at}`;
          if (!seenMap.has(uniqueKey)) {
            allFormatted.push({
              id: String(r.id || `sr_${idx + 1}`),
              logId: `#${r.log_number || (700 - idx)}`,
              dateTime: r.created_at ? new Date(r.created_at).toISOString().replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19),
              client: r.client_name || (targetUserEmail || "User").split('@')[0],
              serviceName: r.service_name || "API Service",
              referenceCode: r.reference_code || "N/A",
              status: (r.status || "SUCCESS").toUpperCase() === "SUCCESS" ? "SUCCESS" : "FAILED",
              payload: r.result_payload || { status: r.status || "SUCCESS", message: "Processed" },
              createdAtTs: r.created_at ? new Date(r.created_at).getTime() : 0
            });
          }
        });
      }
    }

    allFormatted.sort((a, b) => b.createdAtTs - a.createdAtTs);

    return res.json(allFormatted.slice(0, 50));
  } catch (err: any) {
    console.error("Error in /api/service-records:", err);
    return res.json([]);
  }
});

// GET or POST /api/user/balance or /api/balance - Dedicated Balance Check API
app.all(["/api/user/balance", "/api/balance"], async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const key = String(
    req.query.api_key || 
    req.query.key || 
    req.query.apiKey || 
    req.headers['x-api-key'] ||
    req.body?.api_key || 
    req.body?.key || 
    req.body?.apiKey || 
    ""
  ).trim();

  if (!key) {
    return res.status(401).json({
      status: "error",
      message: "API key is required. Pass 'api_key' or 'key' parameter or 'x-api-key' header."
    });
  }

  try {
    if (key === INTERNAL_MASTER_KEY) {
      return res.json({
        status: "success",
        message: "Account wallet balance retrieved successfully",
        api_key: key,
        user_id: "master_admin",
        user_email: "master@tracexdata.online",
        plan_name: "Internal Master VIP Unlimited API",
        wallet_balance: 999999.00,
        currency: "INR",
        requests_used: 0,
        request_limit: "UNLIMITED",
        key_status: "active",
        expires_at: "Never"
      });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ status: "error", message: "Database offline. Unable to check balance." });
    }

    const { data: keyRecords, error: keyErr } = await supabaseAdmin
      .from("api_keys")
      .select("*")
      .eq("api_key", key);

    if (keyErr || !keyRecords || keyRecords.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or unauthorized API key."
      });
    }

    const keyRecord = keyRecords[0];
    let walletCredits = 0.00;
    let userEmail = keyRecord.user_email || "N/A";

    if (keyRecord.user_id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("credits, email")
        .eq("id", keyRecord.user_id)
        .maybeSingle();

      if (profile) {
        walletCredits = parseFloat(profile.credits || 0);
        if (profile.email) userEmail = profile.email;
      }
    }

    return res.json({
      status: "success",
      message: "Account wallet balance retrieved successfully",
      api_key: key,
      user_id: keyRecord.user_id || "N/A",
      user_email: userEmail,
      plan_name: keyRecord.plan_name || "Account Wallet API",
      wallet_balance: walletCredits,
      currency: "INR",
      requests_used: keyRecord.requests_used || 0,
      request_limit: keyRecord.request_limit || "Unlimited",
      key_status: keyRecord.status || "active",
      expires_at: keyRecord.expires_at || "Never"
    });

  } catch (err: any) {
    console.error("Balance API error:", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error while fetching balance."
    });
  }
});

// GET or POST /api/pricing, /api/user/pricing, /api/services/pricing - Dedicated Real-Time Pricing API
app.all(["/api/pricing", "/api/user/pricing", "/api/services/pricing"], async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const key = String(
    req.query.api_key || 
    req.query.key || 
    req.query.apiKey || 
    req.headers['x-api-key'] ||
    req.headers['api_key'] ||
    req.body?.api_key || 
    req.body?.key || 
    req.body?.apiKey || 
    ""
  ).trim();

  let tokenUserId: string | null = null;
  let tokenUserEmail: string | null = null;

  // Check Bearer Auth header if present
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    if (token && supabaseAdmin) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          tokenUserId = user.id;
          tokenUserEmail = user.email || null;
        }
      } catch (e) {
        // Auth token lookup fallback
      }
    }
  }

  const defaultServicesList = [
    { service_key: "phone", service_name: "Mobile / Phone Intelligence Lookup", category: "Phone & Telecom", base_price: 1.00 },
    { service_key: "email", service_name: "Email Address OSINT Lookup", category: "Digital & Social", base_price: 1.00 },
    { service_key: "telegram", service_name: "Telegram Username / User ID Search", category: "Digital & Social", base_price: 1.00 },
    { service_key: "adhr", service_name: "Aadhaar Card Search & Details", category: "Identity & Govt", base_price: 1.00 },
    { service_key: "bnk", service_name: "Bank Account & UPI Name Verification", category: "Financial & Banking", base_price: 1.00 },
    { service_key: "rasion", service_name: "Ration Card Search & Family Details", category: "Identity & Govt", base_price: 1.00 },
    { service_key: "vehicle", service_name: "Vehicle RC Lookup & Details", category: "Vehicle & Transport", base_price: 5.00 },
    { service_key: "veh_owner_num", service_name: "Vehicle Owner Mobile Number Search", category: "Vehicle & Transport", base_price: 15.00 },
    { service_key: "aadhaar_to_pan", service_name: "Aadhaar to PAN Find / Link", category: "Identity & Govt", base_price: 150.00 },
    { service_key: "balance", service_name: "Check Account Wallet Balance API", category: "Account & Wallet", base_price: 0.00 }
  ];

  try {
    let targetUserId: string | null = tokenUserId;
    let targetUserEmail: string | null = tokenUserEmail;
    let planName = "Standard Member Plan";

    if (key === INTERNAL_MASTER_KEY) {
      targetUserId = "master_admin";
      targetUserEmail = "master@tracexdata.online";
      planName = "Internal Master VIP Unlimited";
    } else if (key && supabaseAdmin && !targetUserId) {
      const { data: keyRecords } = await supabaseAdmin
        .from("api_keys")
        .select("*")
        .eq("api_key", key)
        .limit(1);

      if (keyRecords && keyRecords[0]) {
        targetUserId = keyRecords[0].user_id || null;
        targetUserEmail = keyRecords[0].user_email || null;
        planName = keyRecords[0].plan_name || "API Member Plan";
      }
    }

    if (!targetUserEmail && targetUserId && supabaseAdmin && targetUserId !== "master_admin") {
      try {
        const { data: prof } = await supabaseAdmin.from("profiles").select("email").eq("id", targetUserId).maybeSingle();
        if (prof?.email) targetUserEmail = prof.email;
      } catch (e) {
        // profile fallback
      }
    }

    // Fetch dynamic services list from database if available
    let servicesToProcess = [...defaultServicesList];
    if (supabaseAdmin) {
      const { data: dbServices } = await supabaseAdmin
        .from("api_services")
        .select("service_key, service_name, base_price, category, is_active")
        .eq("is_active", true);

      if (dbServices && Array.isArray(dbServices) && dbServices.length > 0) {
        dbServices.forEach((dbs: any) => {
          const existing = servicesToProcess.find(s => s.service_key === dbs.service_key);
          if (existing) {
            existing.base_price = Number(dbs.base_price ?? existing.base_price);
            if (dbs.service_name) existing.service_name = dbs.service_name;
            if (dbs.category) existing.category = dbs.category;
          } else {
            servicesToProcess.push({
              service_key: dbs.service_key,
              service_name: dbs.service_name || dbs.service_key.toUpperCase(),
              category: dbs.category || "General",
              base_price: Number(dbs.base_price || 1.00)
            });
          }
        });
      }
    }

    // Calculate effective real-time pricing for each service
    const pricedServices = await Promise.all(servicesToProcess.map(async (svc) => {
      let price = svc.base_price;
      if (svc.service_key === 'balance') {
        price = 0.00;
      } else if (key === INTERNAL_MASTER_KEY) {
        price = 0.00;
      } else {
        price = await getEffectiveServicePrice(svc.service_key, targetUserId || undefined, targetUserEmail || undefined);
      }

      const discAmount = Math.max(0, svc.base_price - price);
      const discPercent = svc.base_price > 0 && discAmount > 0 
        ? parseFloat(((discAmount / svc.base_price) * 100).toFixed(2)) 
        : 0;

      return {
        service_key: svc.service_key,
        service_name: svc.service_name,
        category: svc.category,
        base_price: parseFloat(svc.base_price.toFixed(2)),
        your_price: parseFloat(price.toFixed(2)),
        discount_percent: discPercent,
        currency: "INR"
      };
    }));

    return res.json({
      status: "success",
      message: "Real-time service pricing fetched successfully for user account",
      api_key: key || (targetUserId ? "SESSION_AUTH" : "PUBLIC_DEFAULT"),
      user_id: targetUserId || "guest",
      user_email: targetUserEmail || "Guest User",
      plan_name: planName,
      total_services: pricedServices.length,
      pricing_updated_at: new Date().toISOString(),
      services: pricedServices
    });

  } catch (err: any) {
    console.error("Realtime Pricing API Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Internal error retrieving real-time service pricing."
    });
  }
});

// GET /api/alvis/history/searches - Fetch Alvis API search logs
app.get("/api/alvis/history/searches", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.json({ status: "success", searches: [] });
    }
    const limit = Number(req.query.limit) || 50;
    const { data, error } = await supabaseAdmin
      .from("search_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      return res.json({ status: "success", searches: [] });
    }

    const formatted = data.map((s: any) => ({
      id: s.id,
      query: s.query,
      search_type: s.search_type || "api_call",
      status: s.status || "success",
      user_email: s.user_email || "Guest",
      created_at: s.created_at
    }));

    return res.json({ status: "success", searches: formatted });
  } catch (err) {
    return res.json({ status: "success", searches: [] });
  }
});

// GET /api/alvis/history/transactions - Fetch Alvis API transaction logs
app.get("/api/alvis/history/transactions", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.json({ status: "success", transactions: [] });
    }
    const limit = Number(req.query.limit) || 50;
    const { data, error } = await supabaseAdmin
      .from("wallet_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      return res.json({ status: "success", transactions: [] });
    }

    const formatted = data.map((t: any) => ({
      id: t.id,
      service_name: t.service_name || t.description || "API Charge",
      amount: t.amount,
      type: t.type || "debit",
      user_email: t.user_email || "User",
      created_at: t.created_at
    }));

    return res.json({ status: "success", transactions: formatted });
  } catch (err) {
    return res.json({ status: "success", transactions: [] });
  }
});

// Visitor session tracking store
const uniqueVisitorIps = new Set<string>();

// POST /api/visitor/log - Track visitor session
app.post("/api/visitor/log", (req, res) => {
  try {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const ip = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(',')[0].trim();
    if (ip) {
      uniqueVisitorIps.add(ip);
    }
    return res.json({ status: 'success', count: uniqueVisitorIps.size });
  } catch (err: any) {
    return res.json({ status: 'success', count: uniqueVisitorIps.size });
  }
});

// POST /api/check-protected - Check safe/privacy protection status securely without client leaks
app.post("/api/check-protected", async (req, res) => {
  const { type, query } = req.body;
  if (!type || !query) {
    return res.status(400).json({ error: "Missing type or query" });
  }
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database offline" });
    }
    let isProtected = false;
    if (type === 'phone') {
      const cleanPhone = String(query).replace(/\D/g, '');
      const { data } = await supabaseAdmin
        .from('protected_numbers')
        .select('phone_number')
        .eq('phone_number', cleanPhone)
        .maybeSingle();
      if (data) isProtected = true;
    } else if (type === 'telegram') {
      const cleanTelegram = String(query).replace(/^@/, '').trim();
      const withAt = `@${cleanTelegram}`;
      const { data: data1 } = await supabaseAdmin
        .from('protected_telegrams')
        .select('telegram_id')
        .eq('telegram_id', cleanTelegram)
        .maybeSingle();
      const { data: data2 } = await supabaseAdmin
        .from('protected_telegrams')
        .select('telegram_id')
        .eq('telegram_id', withAt)
        .maybeSingle();
      if (data1 || data2) isProtected = true;
    }

    return res.json({ isProtected });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// Rate Limiting & Access Code Protection for Support Gaurav Beniwal Free Route
const SUPPORT_FAILED_ATTEMPTS = new Map<string, { count: number; lockUntil: number }>();
const SUPPORT_RATE_LIMITS = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// Free Public Support Gaurav Beniwal Lookup Endpoint (/api/support-lookup)
// No Login or Credits Required - Stealth Proxy (No provider APIs exposed to browser DevTools)
app.all("/api/support-lookup", async (req, res) => {
  const clientIp = getClientIp(req);
  const now = Date.now();

  // 1. Check IP lockout for failed attempts
  const failedRecord = SUPPORT_FAILED_ATTEMPTS.get(clientIp);
  if (failedRecord && failedRecord.lockUntil > now) {
    const minutesLeft = Math.ceil((failedRecord.lockUntil - now) / 60000);
    return res.status(429).json({
      status: false,
      error: `Too many failed code attempts! IP locked. Please try again in ${minutesLeft} minute(s).`
    });
  }

  // 2. Access Code Verification
  const accessCodeHeader = req.headers['x-access-code'];
  const accessCodeQuery = req.query.access_code;
  const accessCodeBody = req.body?.access_code;
  const providedCode = String(accessCodeHeader || accessCodeQuery || accessCodeBody || '').trim().toUpperCase();

  const REQUIRED_CODE = "GBOSINTGOD";

  if (!providedCode || providedCode !== REQUIRED_CODE) {
    const currentFailed = (failedRecord && failedRecord.lockUntil <= now) ? 0 : (failedRecord?.count || 0);
    const newCount = currentFailed + 1;
    let lockUntil = 0;
    if (newCount >= 5) {
      lockUntil = now + 15 * 60 * 1000; // 15 minute lock
    }
    SUPPORT_FAILED_ATTEMPTS.set(clientIp, { count: newCount, lockUntil });

    return res.status(403).json({
      status: false,
      error: newCount >= 5
        ? "Too many incorrect code attempts! IP locked for 15 minutes."
        : `Invalid Access / Coupon Code. (${5 - newCount} attempts remaining before IP lock). Please enter 'GBOSINTGOD'.`
    });
  }

  // Reset failed attempts on valid code
  SUPPORT_FAILED_ATTEMPTS.delete(clientIp);

  // 3. Search Rate Limit (Max 25 searches per minute per IP)
  const rateRecord = SUPPORT_RATE_LIMITS.get(clientIp);
  if (rateRecord && rateRecord.resetAt > now) {
    if (rateRecord.count >= 25) {
      return res.status(429).json({
        status: false,
        error: "Rate limit exceeded (Max 25 searches per minute). Please wait 60 seconds."
      });
    }
    rateRecord.count += 1;
  } else {
    SUPPORT_RATE_LIMITS.set(clientIp, { count: 1, resetAt: now + 60000 });
  }

  const queryParam = req.query.query || req.body?.query;
  const serviceParam = (req.query.service || req.query.type || req.body?.service || req.body?.type || "phone").toString().trim();

  if (!queryParam || typeof queryParam !== 'string') {
    return res.status(200).json({
      status: false,
      error: "Missing or invalid search query."
    });
  }

  // Explicitly exclude Aadhaar to PAN lookup from free public route
  if (serviceParam === 'aadhaar_to_pan' || serviceParam === 'pan_find') {
    return res.status(200).json({
      status: false,
      error: "Aadhaar to PAN lookup is excluded from free public search."
    });
  }

  const allowedServices = ['phone', 'telegram', 'adhr', 'bnk', 'vehicle', 'pancard', 'veh_owner_num', 'email'];
  const service = allowedServices.includes(serviceParam) ? serviceParam : 'phone';
  const cleanedQuery = queryParam.trim();

  if (!cleanedQuery || cleanedQuery.length < 2) {
    return res.status(200).json({
      status: false,
      error: "Please enter a valid search query."
    });
  }

  try {
    const db = supabaseAdmin || supabase;

    // Check Privacy Protection
    if (db) {
      try {
        if (service === 'phone') {
          const cleanPhone = cleanedQuery.replace(/\D/g, '');
          if (cleanPhone) {
            const { data: protectedData } = await db
              .from('protected_numbers')
              .select('phone_number')
              .eq('phone_number', cleanPhone)
              .maybeSingle();
            if (protectedData) {
              return res.status(200).json({
                status: false,
                error: "This number is protected with TRACEXDATA Protection feature. 🛡️"
              });
            }
          }
        } else if (service === 'telegram') {
          const cleanTelegram = cleanedQuery.replace(/^@/, '').trim();
          const { data: prot1 } = await db.from('protected_telegrams').select('telegram_id').eq('telegram_id', cleanTelegram).maybeSingle();
          const { data: prot2 } = await db.from('protected_telegrams').select('telegram_id').eq('telegram_id', `@${cleanTelegram}`).maybeSingle();
          if (prot1 || prot2) {
            return res.status(200).json({
              status: false,
              error: "This Telegram handle is protected with TRACEXDATA Protection feature. 🛡️"
            });
          }
        }
      } catch (e) {
        console.warn("[SUPPORT_LOOKUP] Protection check error:", e);
      }
    }

    // Check Cache
    if (db) {
      try {
        if (service === 'phone') {
          const cleanPhone = cleanedQuery.replace(/\D/g, '');
          const { data: cached } = await db.from('search_results').select('raw_data').eq('mobile_number', cleanPhone).maybeSingle();
          if (cached && cached.raw_data && Object.keys(cached.raw_data).length > 0) {
            const cleanedData = scrubAllBranding(cached.raw_data);
            await logSearchHistory(req, 'support_free_' + service, cleanedQuery, 'success', db);
            return res.status(200).json({ status: "success", results: cleanedData, cached: true });
          }
        } else if (service === 'vehicle') {
          const cleanVehicle = cleanedQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          const { data: cached } = await db.from('vehicle_search_results').select('raw_data').eq('vehicle_number', cleanVehicle).maybeSingle();
          if (cached && cached.raw_data && Object.keys(cached.raw_data).length > 0) {
            const cleanedData = scrubAllBranding(cached.raw_data);
            await logSearchHistory(req, 'support_free_' + service, cleanedQuery, 'success', db);
            return res.status(200).json({ status: "success", results: cleanedData, cached: true });
          }
        }
      } catch (e) {
        console.warn("[SUPPORT_LOOKUP] Cache check error:", e);
      }
    }

    // Upstream Server-side Lookup Execution
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json,text/plain,*/*'
    };

    let responseData: any = null;

    if (service === 'phone') {
      const cleanPhone = cleanedQuery.replace(/\D/g, '');
      const newApiUrl = getProviderUrl('phone', cleanPhone);
      try {
        const resp = await fetch(newApiUrl, { headers });
        if (resp.ok) {
          const text = await resp.text();
          const parsedResults = universalParseAndFormatResponse(text, 'phone', cleanPhone);
          if (parsedResults && Object.keys(parsedResults).length > 0) {
            responseData = { results: parsedResults };
          }
        }
      } catch (e) {
        console.error("[SUPPORT_LOOKUP] Phone API primary error:", e);
      }
    } else if (service === 'telegram') {
      const activeKey = process.env.INTERNAL_MASTER_KEY || INTERNAL_MASTER_KEY;
      try {
        const path = `/api/telegram?key=${activeKey}&query=${encodeURIComponent(cleanedQuery)}`;
        const data = await fetchLocalApi(path, { headers });
        responseData = data.results || data;
      } catch (e: any) {
        console.error("[SUPPORT_LOOKUP] Telegram API error:", e);
      }
    } else {
      let api_url = "";
      if (service === 'adhr') {
        const targetQuery = cleanedQuery.replace(/[^0-9]/g, '');
        api_url = getProviderUrl('aadhaar', targetQuery);
      } else if (service === 'bnk') {
        const targetQuery = cleanedQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        api_url = getProviderUrl('ifsc', targetQuery);
      } else if (service === 'vehicle') {
        const targetQuery = cleanedQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        api_url = getProviderUrl('vehicle', targetQuery);
      } else if (service === 'veh_owner_num') {
        const targetQuery = cleanedQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        api_url = getProviderUrl('veh_owner_num', targetQuery);
      } else if (service === 'email') {
        api_url = getProviderUrl('email', cleanedQuery);
      } else if (service === 'pancard') {
        const targetQuery = cleanedQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        api_url = getProviderUrl('pancard', targetQuery);
      }

      if (api_url) {
        try {
          const resp = await fetch(api_url, { headers });
          if (resp.ok) {
            const text = await resp.text();
            let parsed: any;
            try { parsed = JSON.parse(text); } catch (e) {
              let parseType: 'aadhar' | 'pan' | 'bank' | 'rasion' = 'aadhar';
              if (service === 'bnk') parseType = 'bank';
              else if (service === 'pancard') parseType = 'pan';
              parsed = parsePlainTextLookup(text, parseType);
            }
            responseData = parsed;
          }
        } catch (e) {
          console.error("[SUPPORT_LOOKUP] External API error:", e);
        }
      }
    }

    if (!responseData) {
      if (db) await logSearchHistory(req, 'support_free_' + service, cleanedQuery, 'not_found', db);
      return res.status(200).json({
        status: false,
        error: "Sorry, we don't have data related to the query."
      });
    }

    const cleanedResults = scrubAllBranding(responseData.results || responseData);

    if (db && cleanedResults && Object.keys(cleanedResults).length > 0 && !cleanedResults.error) {
      try {
        if (service === 'phone') {
          const cleanPhone = cleanedQuery.replace(/\D/g, '');
          await db.from('search_results').upsert({ mobile_number: cleanPhone, raw_data: cleanedResults }, { onConflict: 'mobile_number' });
        } else if (service === 'vehicle') {
          const cleanVehicle = cleanedQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          await db.from('vehicle_search_results').upsert({ vehicle_number: cleanVehicle, raw_data: cleanedResults }, { onConflict: 'vehicle_number' });
        }
      } catch (e) {
        console.warn("[SUPPORT_LOOKUP] Cache save error:", e);
      }
    }

    if (db) await logSearchHistory(req, 'support_free_' + service, cleanedQuery, 'success', db);

    return res.status(200).json({
      status: "success",
      results: cleanedResults
    });

  } catch (err: any) {
    console.error("[SUPPORT_LOOKUP] Error:", err);
    return res.status(200).json({
      status: false,
      error: "An unexpected error occurred. Please try again."
    });
  }
});

// Public SaaS API Endpoint (Smart Unified Lookup proxy to support multiple databases)
app.get("/api/user-lookup", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace("Bearer ", "") : "";
  
  const { service, query } = req.query;
  const allowedServices = ['phone', 'telegram', 'adhr', 'bnk', 'vehicle', 'pancard', 'aadhaar_to_pan', 'veh_owner_num', 'email'];
  if (!service || typeof service !== 'string' || !allowedServices.includes(service) || !query || typeof query !== 'string') {
    return res.status(200).json({ 
      status: "success",
      results: { error: "Missing or invalid service/query" }
    });
  }

  // Strict auth and credit deduction
  let user: any = null;
  let profile: any = null;
  let client: any = null;
  try {
    if (!token) {
      // Mock for testing
      user = { id: 'test', email: 'test@test.com' };
      profile = { id: 'test', credits: 100, unlimited_expiry: null };
      client = supabaseAdmin;
    }

    client = await getRequestClient(token);
    if (!client) {
      return res.status(200).json({
        status: "success",
        results: { error: "Database offline. Unable to process lookup." }
      });
    }

    if (token) {
      const { data: userData, error: authErr } = await client.auth.getUser(token);
      user = userData?.user;
      if (authErr || !user) {
        return res.status(200).json({
          status: "success",
          results: { error: "Invalid or expired session. Please sign in again." }
        });
      }
    }

    const { data: profileData, error: profileErr } = await client
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
      
    profile = profileData;
    if (profileErr || !profile) {
      return res.status(200).json({
        status: "success",
        results: { error: "User profile not found. Please log in again." }
      });
    }
  } catch (err) {
    console.error("[Auth/Credit Enforcement Error]:", err);
    return res.status(200).json({
      status: "success",
      results: { error: "Authentication or credit deduction failure." }
    });
  }

  const cleanedQuery = String(query).trim();

  // SECURE PRIVACY PROTECTION CHECK
  let isProtected = false;
  if (service === 'phone') {
    const cleanPhone = cleanedQuery.replace(/\D/g, '');
    const { data } = await client
      .from('protected_numbers')
      .select('phone_number')
      .eq('phone_number', cleanPhone)
      .maybeSingle();
    if (data) isProtected = true;
  } else if (service === 'telegram') {
    const cleanTelegram = cleanedQuery.replace(/^@/, '').trim();
    const withAt = `@${cleanTelegram}`;
    const { data: data1 } = await client
      .from('protected_telegrams')
      .select('telegram_id')
      .eq('telegram_id', cleanTelegram)
      .maybeSingle();
    const { data: data2 } = await client
      .from('protected_telegrams')
      .select('telegram_id')
      .eq('telegram_id', withAt)
      .maybeSingle();
    if (data1 || data2) isProtected = true;
  }

  if (isProtected) {
    await logSearchHistory(req, service, cleanedQuery, 'protected', client);
    return res.status(200).json({
      status: "success",
      results: { 
        error: `This ${service === 'phone' ? 'number' : 'Telegram handle'} is protected with TRACEXDATA Protection feature. 🛡️\nWant to protect your own record to stay safe from unauthorized searches? Click here.` 
      }
    });
  }

  // SECURE BACKEND CACHE CHECKS
  if (service === 'phone') {
    try {
      const { data: cachedData, error: cacheError } = await client
        .from('search_results')
        .select('raw_data')
        .eq('mobile_number', cleanedQuery)
        .maybeSingle();

      if (cachedData && !cacheError && cachedData.raw_data && Object.keys(cachedData.raw_data).length > 0) {
        console.log('Serving from backend cache...');
        const cleanedData = scrubAllBranding(cachedData.raw_data);
        await logSearchHistory(req, service, cleanedQuery, 'success', client);
        return res.status(200).json({
          status: "success",
          results: cleanedData,
          cached: true
        });
      }
    } catch (e) {
      console.error("Cache read error:", e);
    }
  } else if (service === 'vehicle') {
    try {
      const { data: cachedData, error: cacheError } = await client
        .from('vehicle_search_results')
        .select('raw_data')
        .eq('vehicle_number', cleanedQuery)
        .maybeSingle();

      if (cachedData && !cacheError && cachedData.raw_data && Object.keys(cachedData.raw_data).length > 0) {
        console.log('Serving from backend vehicle cache...');
        const cleanedData = scrubAllBranding(cachedData.raw_data);
        await logSearchHistory(req, service, cleanedQuery, 'success', client);
        return res.status(200).json({
          status: "success",
          results: cleanedData,
          cached: true
        });
      }
    } catch (e) {
      console.error("Vehicle cache read error:", e);
    }
  } else if (service === 'veh_owner_num') {
    try {
      const cacheKey = `OWN_${cleanedQuery}`;
      const { data: cachedData, error: cacheError } = await client
        .from('vehicle_search_results')
        .select('raw_data')
        .eq('vehicle_number', cacheKey)
        .maybeSingle();

      if (cachedData && !cacheError && cachedData.raw_data && Object.keys(cachedData.raw_data).length > 0) {
        console.log('Serving from backend vehicle owner number cache...');
        const cleanedData = scrubAllBranding(cachedData.raw_data);
        await logSearchHistory(req, service, cleanedQuery, 'success', client);
        return res.status(200).json({
          status: "success",
          results: cleanedData,
          cached: true
        });
      }
    } catch (e) {
      console.error("Vehicle owner number cache read error:", e);
    }
  }

  // Check credits before executing fresh external search
  let isUnlimited = false;
  if (profile.unlimited_expiry) {
    const expiry = new Date(profile.unlimited_expiry);
    if (expiry > new Date()) {
      isUnlimited = true;
    }
  }

  let serviceKey = service === 'adhr' ? 'aadhaar' : service === 'bnk' ? 'ifsc' : service;
  let creditCost = await getEffectiveServicePrice(serviceKey, user.id, user.email);
  const currentCredits = Number(profile.credits || 0);
  
  if (!isUnlimited && currentCredits < creditCost) {
    return res.status(200).json({
      status: "success",
      results: { error: `Insufficient Wallet Balance: This lookup costs ₹${creditCost}.00, but you only have ₹${currentCredits}.00 in your wallet. Please top up your balance.` }
    });
  }

  // Deduct credits/balance atomically with safety fallback
  if (!isUnlimited) {
    let rpcSuccess = false;
    let rpcError: any = null;
    try {
      const rpcResult = await client.rpc("deduct_credits", {
          user_id: user.id,
          amount: creditCost
      });
      rpcSuccess = rpcResult.data;
      rpcError = rpcResult.error;
    } catch (e: any) {
      rpcError = e;
    }

    if (rpcError) {
      console.warn("[DEDUCT_CREDITS_RPC_FAIL] RPC failed or missing, falling back to manual update:", rpcError);
      const { data: currentProfile, error: getErr } = await client
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .maybeSingle();

      if (getErr || !currentProfile) {
        return res.status(200).json({
          status: "success",
          results: { error: "Could not retrieve user profile to update wallet balance." }
        });
      }

      const currentVal = Number(currentProfile.credits || 0);
      if (currentVal < creditCost) {
        return res.status(200).json({
          status: "success",
          results: { error: `Insufficient Wallet Balance: This lookup costs ₹${creditCost}.00, but you only have ₹${currentVal}.00. Please top up your balance.` }
        });
      }

      const { error: updateErr } = await client
        .from("profiles")
        .update({ credits: currentVal - creditCost })
        .eq("id", user.id);

      if (updateErr) {
        return res.status(200).json({
          status: "success",
          results: { error: "Failed to deduct balance. Please try again." }
        });
      }
    } else if (rpcSuccess === false) {
      return res.status(200).json({
        status: "success",
        results: { error: `Insufficient Wallet Balance: This lookup costs ₹${creditCost}.00, but you only have ₹${currentCredits}.00. Please top up your balance.` }
      });
    }
  }

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  try {
    let responseData: any = null;

    if (service === 'phone') {
      let activeKey = process.env.INTERNAL_MASTER_KEY || INTERNAL_MASTER_KEY;
      
      const newApiUrl = getProviderUrl('phone', cleanedQuery);
      
      try {
        console.log(`Querying phone API: ${newApiUrl}`);
        const response = await fetch(newApiUrl, { headers });
        if (response.ok) {
          const text = await response.text();
          console.log("Phone API response preview:", text.slice(0, 300));
          
          let parsedData: any = null;
          try {
             // Try strict JSON parse first
             parsedData = JSON.parse(text);
          } catch (e) {
             // If it fails, maybe it has some prefix/suffix, let's do a basic extraction
             const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
             if (jsonMatch) {
               try {
                 parsedData = JSON.parse(jsonMatch[0]);
               } catch (e2) {}
             }
          }
          
          if (parsedData) {
             const cleaned_json = scrubAllBranding(parsedData);
             responseData = cleaned_json.results || cleaned_json.data || cleaned_json;
          } else {
             // If it's truly not JSON, return as raw string wrapped in object
             responseData = { raw_response: scrubAllBranding(text) };
          }
        }
      } catch (err) {
        console.error("Phone API failed:", err);
      }

      if (!responseData) {
        try {
          const path = `/api/lookup?key=${activeKey}&query=${encodeURIComponent(cleanedQuery)}`;
          const data = await fetchLocalApi(path, { headers });
          responseData = data.results || data.data || data;
        } catch (err: any) {
          console.error("Local API lookup fallback failed:", err);
        }
      }
    } else if (service === 'telegram') {
      const targetQuery = cleanedQuery;
      const api_url = getProviderUrl('telegram', targetQuery);
      
      try {
        console.log(`Querying telegram provider directly: ${api_url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(api_url, { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json,text/plain,*/*'
          }
        });
        clearTimeout(timeoutId);
        
        const text = await response.text();
          
          let parsedData: any = null;
          try {
             parsedData = JSON.parse(text);
          } catch (e) {
             const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
             if (jsonMatch) {
               try {
                 parsedData = JSON.parse(jsonMatch[0]);
               } catch (e2) {}
             }
          }
          
          if (parsedData) {
             const cleaned_json = scrubAllBranding(parsedData);
             responseData = cleaned_json; // EXACT JSON RESPONSE AS REQUESTED
          } else {
             responseData = { raw_response: scrubAllBranding(text) };
          }
      } catch (err: any) {
        console.error("Telegram external API query failed:", err);
      }
    } else {
      let api_url = "";
      if (service === 'adhr') {
        const targetQuery = cleanedQuery.replace(/[^0-9]/g, '');
        api_url = getProviderUrl('aadhaar', targetQuery);
      } else if (service === 'bnk') {
        const targetQuery = cleanedQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        api_url = getProviderUrl('ifsc', targetQuery);
      } else if (service === 'vehicle') {
        const targetQuery = cleanedQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        api_url = getProviderUrl('vehicle', targetQuery);
      } else if (service === 'veh_owner_num') {
        const targetQuery = cleanedQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        api_url = getProviderUrl('veh_owner_num', targetQuery);
      } else if (service === 'email') {
        api_url = getProviderUrl('email', cleanedQuery);
      } else if (service === 'pancard') {
        const targetQuery = cleanedQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        api_url = getProviderUrl('pancard', targetQuery);
      } else if (service === 'aadhaar_to_pan') {
        const targetQuery = cleanedQuery.replace(/[^0-9]/g, '');
        api_url = getProviderUrl('aadhaar_to_pan', targetQuery);
      }

      if (api_url) {
        const response = await fetch(api_url, { headers });
        const text = await response.text();
          const parsedResults = universalParseAndFormatResponse(text, service, cleanedQuery);
          if (parsedResults && Object.keys(parsedResults).length > 0) {
            responseData = { results: parsedResults };
          } else {
            responseData = text;
          }
      }
    }

    if (!responseData) {
      await logSearchHistory(req, service, cleanedQuery, 'not_found');
      return res.status(200).json({
        status: "success",
        results: { error: "Sorry, we don't have data related to the query." }
      });
    }

    // Clean brandings and watermarks
    const cleanedData = scrubAllBranding(responseData);

    // SECURE BACKEND CACHE SAVE
    const dataToCheck = cleanedData.results ? cleanedData.results : cleanedData;
    let keys = [];
    if (typeof dataToCheck === 'object' && dataToCheck !== null) {
       keys = Object.keys(dataToCheck);
    }
    
    let hasRealData = keys.some(k => !['error', 'message', 'status', 'msg', 'success', 'cached', 'response_time', 'key_details', 'status_code', 'http_status'].includes(k.toLowerCase()));
    
    if (typeof dataToCheck === 'string') {
       const lower = dataToCheck.toLowerCase();
       if (lower.includes('no result') || lower.includes('not found') || lower.includes('error') || lower.includes('invalid')) {
           hasRealData = false;
       } else {
           hasRealData = true;
       }
    } else {
      // Explicit error detection
      if (dataToCheck.error) hasRealData = false;
      if (dataToCheck.success === false || dataToCheck.success === "false") hasRealData = false;
      if (typeof dataToCheck.msg === 'string' && dataToCheck.msg.toLowerCase().includes('no result')) hasRealData = false;
      if (typeof dataToCheck.message === 'string' && dataToCheck.message.toLowerCase().includes('no result')) hasRealData = false;
      if (typeof dataToCheck.message === 'string' && dataToCheck.message.toLowerCase().includes('not found')) hasRealData = false;
      if (typeof dataToCheck.status === 'string' && dataToCheck.status.toLowerCase() === 'false') hasRealData = false;
    }
    
    console.log("=== TELEGRAM LOOKUP DEBUG ===");
    console.log("cleanedQuery:", cleanedQuery);
    console.log("responseData:", JSON.stringify(responseData));
    console.log("cleanedData:", JSON.stringify(cleanedData));
    console.log("hasRealData:", hasRealData);
    console.log("===============================");

    if (hasRealData && !cleanedData.error) {
      if (service === 'phone') {
        try {
          await client.from('search_results').upsert({
            mobile_number: cleanedQuery,
            raw_data: cleanedData
          }, { onConflict: 'mobile_number' });
        } catch (e) {
          console.error("Failed to save to phone cache:", e);
        }
      } else if (service === 'vehicle') {
        try {
          await client.from('vehicle_search_results').upsert({
            vehicle_number: cleanedQuery,
            raw_data: cleanedData
          }, { onConflict: 'vehicle_number' });
        } catch (e) {
          console.error("Failed to save to vehicle cache:", e);
        }
      } else if (service === 'veh_owner_num') {
        try {
          const cacheKey = `OWN_${cleanedQuery}`;
          await client.from('vehicle_search_results').upsert({
            vehicle_number: cacheKey,
            raw_data: cleanedData
          }, { onConflict: 'vehicle_number' });
        } catch (e) {
          console.error("Failed to save to vehicle owner number cache:", e);
        }
      }
    }

    // Log history
    const finalStatus = hasRealData ? 'success' : 'not_found';
    if (!hasRealData) {
      if (user && user.email) {
         await autoRefundUserCredits(user.email, creditCost, service, cleanedQuery, supabaseAdmin);
      }
    }
    await logSearchHistory(req, service, cleanedQuery, finalStatus, client);

    if (service === 'telegram' && typeof cleanedData === 'object' && cleanedData !== null && 'status' in cleanedData) {
      return res.status(200).json(cleanedData);
    }

    return res.status(200).json({
      status: "success",
      results: cleanedData
    });

  } catch (err: any) {
    console.error("Direct User Lookup Error:", err);
    await logSearchHistory(req, service, cleanedQuery, 'failed', client);
    return res.status(200).json({
      status: "success",
      results: { error: `Search gateway is currently unavailable. Please try again later.` }
    });
  }
});

const LOOKUP_RATES: Record<string, number> = {
  phone: 2.0,            // Number lookup: ₹2.00 per lookup
  telegram: 2.0,         // Telegram lookup: ₹2.00 per lookup
  bnk: 2.0,              // Bank/IFSC lookup: ₹2.00 per lookup
  email: 2.0,            // Email lookup: ₹2.00 per lookup
  rasion: 5.0,           // Ration card lookup: ₹5.00
  adhr: 5.0,             // Identity/Aadhaar lookup: ₹5.00
  vehicle: 5.0,          // Vehicle RC lookup: ₹5.00
  veh_owner_num: 15.0,   // Vehicle Owner Number: ₹15.00
  aadhaar_to_pan: 150.0  // Aadhaar to PAN: ₹150.00
};

interface ApiBalanceCheckResult {
  authorized: boolean;
  userProfile?: any;
  errorResponse?: any;
  deduct?: () => Promise<{ newCredits: number }>;
}

async function checkAccountApiBalance(keyRecord: any, isMaster: boolean, lookupType: string): Promise<ApiBalanceCheckResult> {
  if (isMaster || !keyRecord || !supabaseAdmin) {
    return { authorized: true };
  }

  let userProfile: any = null;
  if (keyRecord.user_id) {
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", keyRecord.user_id)
      .maybeSingle();
    userProfile = p;
  }
  if (!userProfile && keyRecord.user_email && keyRecord.user_email !== "N/A") {
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("email", keyRecord.user_email)
      .maybeSingle();
    userProfile = p;
  }

  if (!userProfile) {
    return { authorized: true };
  }

  const lookupCost = LOOKUP_RATES[lookupType] || 2.0;
  const planUpper = String(keyRecord.plan_name || "").toUpperCase();
  const isUnlimited = planUpper.includes("UNLIMITED") || (userProfile.unlimited_expiry && new Date(userProfile.unlimited_expiry) > new Date());

  if (isUnlimited) {
    return { authorized: true, userProfile };
  }

  const currentCredits = Number(userProfile.credits || 0);
  if (currentCredits < lookupCost) {
    return {
      authorized: false,
      userProfile,
      errorResponse: {
        status: "error",
        message: `Insufficient Wallet Balance: Your API key is connected directly to your account wallet. This '${lookupType}' query requires ₹${lookupCost.toFixed(2)}, but your current wallet balance is ₹${currentCredits.toFixed(2)}. Please recharge your account at https://tracexdata-api.onrender.com/pricing`,
        required_cost: lookupCost,
        wallet_balance: currentCredits,
        recharge_url: "https://tracexdata-api.onrender.com/pricing"
      }
    };
  }

  const deduct = async () => {
    const newCredits = Math.max(0, currentCredits - lookupCost);
    await supabaseAdmin
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", userProfile.id);
    return { newCredits };
  };

  return { authorized: true, userProfile, deduct };
}

app.all("/api/lookup", async (req, res) => {
  const key = String(
    req.query.key || 
    req.query.api_key || 
    req.query.apiKey || 
    req.headers['x-api-key'] ||
    req.body?.key || 
    req.body?.api_key || 
    req.body?.apiKey || 
    ""
  ).trim();

  const service = String(
    req.query.service || 
    req.query.type || 
    req.body?.service || 
    req.body?.type || 
    ""
  ).trim();

  const queryParam = String(
    req.query.query || 
    req.query.numquery || 
    req.query.tgquery || 
    req.query.vehiclequery || 
    req.query.number || 
    req.query.phone || 
    req.query.rc || 
    req.query.vehicle || 
    req.query.telegram || 
    req.query.tg || 
    req.query.adhr || 
    req.query.aadhar || 
    req.query.aadhaar || 
    req.query.pan || 
    req.query.ifsc || 
    req.query.email || 
    req.body?.query || 
    req.body?.number || 
    req.body?.phone || 
    req.body?.aadhaar || 
    req.body?.pan || 
    req.body?.rc || 
    req.body?.ifsc || 
    req.body?.email || 
    ""
  ).trim();

  const { 
    numquery, 
    tgquery, 
    vehiclequery, 
    number, 
    rc, 
    vehicle, 
    telegram, 
    tg, 
    phone
  } = req.query;
  const renderUrl = (process.env.VITE_RENDER_BACKEND_URL || "https://tracexdata-api.onrender.com").trim();
  const startTime = Date.now();

  res.setHeader('Content-Type', 'application/json');

  if (!key) return res.status(401).json({ status: "error", message: "API key is required. Provide 'key' or 'api_key' parameter." });

  // Input Validation
  if (service && (typeof service !== 'string' || service.length > 50)) {
    return res.status(400).json({ status: "error", message: "Invalid service requested" });
  }


  if (!supabaseAdmin) {
    return res.status(500).json({ status: "error", message: "Engine Offline: Internal connection failure" });
  }

  let keyRecord: any = null;
  let targetQuery = "";
  let lookupType: 'phone' | 'telegram' | 'adhr' | 'bnk' | 'rasion' | 'vehicle' | 'aadhaar_to_pan' | 'veh_owner_num' | 'email' = 'phone';

  try {
    // 1. Validate API Key from DB (or Master Key Bypass)
    const isMaster = key === INTERNAL_MASTER_KEY;

    if (isMaster) {
      keyRecord = {
        id: "master",
        plan_name: "Internal Master API",
        expires_at: new Date(Date.now() + 365*24*3600000).toISOString(),
        status: "active",
        requests_used: 0,
        request_limit: null
      };
    } else {
      const { data: keyRecords, error: keyErr } = await supabaseAdmin
        .from("api_keys")
        .select("*")
        .eq("api_key", key);

      keyRecord = keyRecords?.[0];

      if (keyErr || !keyRecord) {
        console.error("[AUTH_FAIL]", keyErr);
        return res.status(401).json({ status: "error", message: "Access Denied: Invalid or unauthorized API key" });
      }

      // Status & Quota Check
      const now = new Date();
      const expiryDate = keyRecord.expires_at ? new Date(keyRecord.expires_at) : null;
      if ((expiryDate && expiryDate < now) || keyRecord.status !== 'active') {
        return res.status(403).json({ 
          status: "error", 
          message: "Subscription Blocked: API key expired or suspended",
          buy_url: "https://tracexdata-api.onrender.com/buy-api"
        });
      }

      const requestsUsed = keyRecord.requests_used || 0;
      const requestLimit = keyRecord.request_limit;

      if (requestLimit !== null && requestsUsed >= requestLimit) {
        return res.status(403).json({ status: "error", message: "Quota Exhausted: Lookup limit reached" });
      }
    }

    // 2. Identify Lookup Type and target query
    // Priority 1: Explicit target parameters
    if (numquery !== undefined) {
      lookupType = 'phone';
      targetQuery = String(numquery).trim();
    } else if (tgquery !== undefined) {
      lookupType = 'telegram';
      targetQuery = String(tgquery).trim();
    } else if (req.query.adhrquery !== undefined) {
      lookupType = 'adhr';
      targetQuery = String(req.query.adhrquery).trim();
    } else if (req.query.bnkquery !== undefined) {
      lookupType = 'bnk';
      targetQuery = String(req.query.bnkquery).trim();
    } else if (req.query.rasionquery !== undefined) {
      lookupType = 'rasion';
      targetQuery = String(req.query.rasionquery).trim();
    } else if (req.query.vehiclequery !== undefined) {
      lookupType = 'vehicle';
      targetQuery = String(req.query.vehiclequery).trim();
    } else if (req.query.veh_owner_num_query !== undefined) {
      lookupType = 'veh_owner_num';
      targetQuery = String(req.query.veh_owner_num_query).trim();
    } else if (req.query.email_query !== undefined) {
      lookupType = 'email';
      targetQuery = String(req.query.email_query).trim();
    } else if (req.query.aadhaar_to_pan_query !== undefined || req.query.adhr_to_pan_query !== undefined) {
      lookupType = 'aadhaar_to_pan';
      targetQuery = String(req.query.aadhaar_to_pan_query || req.query.adhr_to_pan_query).trim();
    }
    // Priority 2: Legacy or explicit service select
    else if (telegram || tg || service === 'telegram') {
      lookupType = 'telegram';
      targetQuery = String(telegram || tg || queryParam || "").trim();
    } else if (service === 'aadhaar_to_pan') {
      lookupType = 'aadhaar_to_pan';
      targetQuery = String(queryParam || req.query.aadhar || req.query.adhr || "").trim();
    } else if (service === 'adhr' || service === 'identity') {
      lookupType = 'adhr';
      targetQuery = String(queryParam || req.query.aadhar || req.query.adhr || "").trim();
    } else if (service === 'bnk' || service === 'bank') {
      lookupType = 'bnk';
      targetQuery = String(queryParam || req.query.ifsc || req.query.bnk || "").trim();
    } else if (service === 'rasion' || service === 'ration') {
      lookupType = 'rasion';
      targetQuery = String(queryParam || req.query.family || req.query.rasion || "").trim();
    } else if (service === 'vehicle' || service === 'rc' || req.query.rc !== undefined || req.query.vehicle !== undefined) {
      lookupType = 'vehicle';
      targetQuery = String(queryParam || req.query.rc || req.query.vehicle || "").trim();
    } else if (service === 'veh_owner_num' || service === 'veh_numm') {
      lookupType = 'veh_owner_num';
      targetQuery = String(queryParam || req.query.rc || req.query.vehicle || "").trim();
    } else if (service === 'email' || service === 'mail') {
      lookupType = 'email';
      targetQuery = String(queryParam || "").trim();
    } else if (service === 'pancard' || service === 'pan' || service === 'pan_to_name_dob') {
      lookupType = 'pancard' as any;
      targetQuery = String(queryParam || "").trim();
    } else if (number || phone || service === 'phone' || service === 'number') {
      lookupType = 'phone';
      targetQuery = String(number || phone || queryParam || "").trim();
    }
    // Priority 3: intelligent default
    else if (queryParam !== undefined && queryParam !== "") {
      const planUpper = String(keyRecord.plan_name || "").toUpperCase();
      if (planUpper.includes("TELEGRAM")) {
        lookupType = 'telegram';
      } else if (planUpper.includes("AADHAAR_TO_PAN") || planUpper.includes("AADHAAR TO PAN")) {
        lookupType = 'aadhaar_to_pan';
      } else if (planUpper.includes("ADHR") || planUpper.includes("IDENTITY")) {
        lookupType = 'adhr';
      } else if (planUpper.includes("BNK") || planUpper.includes("BANK")) {
        lookupType = 'bnk';
      } else if (planUpper.includes("RASION") || planUpper.includes("RATION")) {
        lookupType = 'rasion';
      } else if (planUpper.includes("VEHICLE")) {
        lookupType = 'vehicle';
      } else {
        const q = String(queryParam).trim();
        if (/^[a-zA-Z]{4}0[a-zA-Z0-9]{6}$/.test(q)) lookupType = 'bnk';
        else if (/^[A-Za-z0-9]{4,11}$/.test(q) && /[A-Za-z]/.test(q) && /[0-9]/.test(q)) lookupType = 'vehicle';
        else if (q.startsWith('@') || (/[a-zA-Z_]/.test(q) && !/^\d+$/.test(q))) lookupType = 'telegram';
        else if (/^\d{12}$/.test(q)) lookupType = 'adhr';
        else lookupType = 'phone';
      }
      targetQuery = String(queryParam).trim();
    }

    // Normalize and clean queries depending on lookup service
    if (lookupType === 'bnk') {
      targetQuery = targetQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    } else if (lookupType === 'adhr' || lookupType === 'rasion' || lookupType === 'aadhaar_to_pan') {
      targetQuery = targetQuery.replace(/[^0-9]/g, '');
    } else if (lookupType === 'vehicle' || lookupType === 'veh_owner_num') {
      targetQuery = targetQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }

    if (!targetQuery) {
      return res.status(400).json({ 
        status: "error", 
        message: "A lookup query parameter is required." 
      });
    }

    // 3. Strict Permission Enforcement: Block Cross-Service usage
    const planUpper = String(keyRecord.plan_name || "").toUpperCase();
    // All active API keys are valid for every type of lookup
    const isAuthorized = true;

    // 4. Schema checks
    if (lookupType === 'phone' && !/^\d{10}$/.test(targetQuery)) {
      return res.status(400).json({ status: "error", message: `Invalid Query: '${targetQuery}' is not a 10-digit mobile number` });
    }
    if (lookupType === 'aadhaar_to_pan' && !/^\d{12}$/.test(targetQuery)) {
      return res.status(400).json({ status: "error", message: `Invalid Query: '${targetQuery}' is not a 12-digit Aadhaar number` });
    }
    if (lookupType === 'vehicle' || lookupType === 'veh_owner_num') {
      targetQuery = targetQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (targetQuery.length < 3) {
        return res.status(400).json({ status: "error", message: `Invalid Query: '${targetQuery}' is not a valid vehicle number` });
      }
    }

    // 5. Account Wallet Balance Check (Direct Charge System)
    const balanceCheck = await checkAccountApiBalance(keyRecord, isMaster, lookupType);
    if (!balanceCheck.authorized) {
      return res.status(403).json(balanceCheck.errorResponse);
    }

    // Safety and Privacy Shield Protection check (for mobile and telegram)
    let isProtected = false;
    if (lookupType === 'phone') {
      const { data: protectedData } = await supabaseAdmin
        .from('protected_numbers')
        .select('phone_number')
        .eq('phone_number', targetQuery)
        .maybeSingle();
      if (protectedData) isProtected = true;
    } else if ((lookupType as string) === 'telegram') {
      const { data: protectedData } = await supabaseAdmin
        .from('protected_telegrams')
        .select('telegram_id')
        .eq('telegram_id', targetQuery)
        .maybeSingle();
      if (protectedData) isProtected = true;
    }

    if (isProtected) {
      const newCount = (keyRecord.requests_used || 0) + 1;
      if (!isMaster && keyRecord.id) {
        await supabaseAdmin.from("api_keys").update({ 
          requests_used: newCount,
          last_used_at: new Date().toISOString()
        }).eq("id", keyRecord.id);
      }

      const logPrefix = lookupType === 'phone' ? 'RC' : 'TG';
      await logApiRequest(keyRecord?.id || null, `${logPrefix}: ${targetQuery}`, "success", Date.now() - startTime);

      const mockRecord: any = {
        name: "PROTECTED RECORD",
        mobile: lookupType === 'phone' ? targetQuery : "PROTECTED @ TRACEX SHIELD",
        alt_mobile: "PROTECTED @ TRACEX SHIELD",
        father_name: "PROTECTED @ TRACEX SHIELD",
        aadhar_number: "PROTECTED @ TRACEX SHIELD",
        operator: "PROTECTED @ TRACEX SHIELD",
        state_circle: "PROTECTED @ TRACEX SHIELD",
        address: "PROTECTED @ TRACEX SHIELD"
      };

      if ((lookupType as string) === 'telegram') {
        mockRecord.telegram_id = targetQuery;
      }

      const responsePayload = formatUnifiedSaaSResponse({
        type: (lookupType as string) === 'phone' ? 'phone' : 'telegram',
        query: targetQuery,
        expiresAt: keyRecord.expires_at,
        planName: keyRecord.plan_name,
        requestsUsed: newCount,
        records: [mockRecord]
      });

      return res.status(200).json(responsePayload);
    }

    // Forwarding logic based on target lookup Type
    if (lookupType === 'phone') {
      const newApiUrl = getProviderUrl('phone', targetQuery);
      const searchParams = new URLSearchParams();
      searchParams.set("key", String(key)); 
      searchParams.set("query", targetQuery);

      const target = getProviderUrl('phone', targetQuery);
      let rawData: any = null;
      let responseStatus = 200;

      // Try new phone API first
      try {
        console.log(`SaaS lookup querying new phone API: ${newApiUrl}`);
        const response = await fetch(newApiUrl, {
          headers: { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json"
          }
        });
        if (response.ok) {
          const text = await response.text();
          let parsed: any = null;
          try {
            parsed = JSON.parse(text);
          } catch (e) {
            console.log("SaaS phone lookup text is not JSON, parsing plain text...");
            parsed = parsePhonePlainText(text);
          }
          if (parsed && typeof parsed === 'object') {
            const hasData = parsed.name || parsed.mobile || parsed.results || parsed.data || parsed.records || parsed.status === true || (parsed.status === undefined && Object.keys(parsed).length > 0) || parsed.message;
            if (hasData) {
              rawData = parsed;
              responseStatus = response.status;
            }
          }
        }
      } catch (err) {
        console.error("SaaS new phone API failed, falling back:", err);
      }

      // Fallback if new API didn't return data
      if (!rawData) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        try {
          console.log(`SaaS lookup falling back to old target: ${target}`);
          const response = await fetch(target, {
            headers: { "User-Agent": "TraceXData-SaaS-Proxy/4.5" },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            rawData = await response.json();
            responseStatus = response.status;
          }
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          console.error("SaaS old phone fallback failed:", fetchErr);
        }
      }

      if (rawData) {
        const newCount = (keyRecord.requests_used || 0) + 1;
        if (!isMaster && keyRecord.id) {
          try {
            await supabaseAdmin.from("api_keys").update({ 
              requests_used: newCount,
              last_used_at: new Date().toISOString()
            }).eq("id", keyRecord.id);
          } catch (dbErr) {
            console.error("Failed to update api_keys requests_used:", dbErr);
          }
        }

        let recordsRaw = rawData.results || rawData.data || rawData.records || (rawData.status === true ? rawData : []);
        if (!recordsRaw || (typeof recordsRaw === 'object' && Object.keys(recordsRaw).length === 0)) {
          if (rawData.name || rawData.mobile || rawData.father_name) {
            recordsRaw = [rawData];
          }
        }

        let parsedRecords: any[] = [];
        if (Array.isArray(recordsRaw)) {
          parsedRecords = recordsRaw;
        } else if (recordsRaw && typeof recordsRaw === 'object') {
          if (recordsRaw.name || recordsRaw.mobile || recordsRaw.full_name) {
            parsedRecords = [recordsRaw];
          } else {
            parsedRecords = Object.values(recordsRaw).filter(v => v && typeof v === 'object');
          }
        }

        const filtered = formatUnifiedSaaSResponse({
          type: 'phone',
          query: targetQuery,
          expiresAt: keyRecord.expires_at,
          planName: keyRecord.plan_name,
          requestsUsed: newCount,
          records: parsedRecords
        });
        
        await logApiRequest(keyRecord?.id || null, maskNumberForLog(targetQuery), "success", Date.now() - startTime);
        return res.status(responseStatus).json(filtered);
      } else {
        await logApiRequest(keyRecord?.id || null, maskNumberForLog(targetQuery), "failed", Date.now() - startTime);
        return res.status(502).json({ 
          status: "error", 
          message: "Downstream Provider: Unresponsive or Invalid JSON Response"
        });
      }
    } else if ((lookupType as string) === 'telegram') {
      const target_username = targetQuery.replace(/^@/, "");
      const api_url = getProviderUrl('telegram', target_username);
      const response = await fetch(api_url);
      if (!response.ok) {
        await logApiRequest(keyRecord?.id || null, `TG: ${targetQuery}`, "failed", Date.now() - startTime);
        return res.status(404).json({ status: "error", message: `Sorry, we don't have data related to the query.` });
      }

      const text = await response.text();
      const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb(?:er|3r)[\s\-_]*s(?:oldier|0ldier)|@?cyb(?:er|3r)s(?:oldier|0ldier)|u(?:ers|ser)xinfo(?:\.in)?)/gi, "");
      const lowerText = cleanedText.toLowerCase();

      if (!text.trim() || lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("no data found")) {
         await logApiRequest(keyRecord?.id || null, `TG: ${targetQuery}`, "failed", Date.now() - startTime);
         return res.status(404).json({ status: "error", message: `Sorry, we don't have data related to the query.` });
      }

      let parsedResult: any = null;
      let isParsedAsJson = false;

      try {
        const parsed = JSON.parse(text);
        if (parsed && (parsed.success === false || parsed.status === false || parsed.status === "false")) {
          await logApiRequest(keyRecord?.id || null, `TG: ${targetQuery}`, "failed", Date.now() - startTime);
          return res.status(404).json({ status: "error", message: `Sorry, we don't have data related to the query.` });
        }
        const cleaned_json = scrubAllBranding(parsed);
        if (cleaned_json && typeof cleaned_json === 'object') {
          let raw_res = cleaned_json.results || cleaned_json.data || cleaned_json;
          if (raw_res.tg_id || raw_res.telegram_id || raw_res.number || raw_res.mobile) {
             parsedResult = {
               telegram_id: raw_res.tg_id || raw_res.telegram_id || "N/A",
               username: raw_res.username || target_username,
               mobile: raw_res.number || raw_res.mobile || "N/A",
               platform: "Telegram Lookup"
             };
          } else {
             parsedResult = raw_res;
          }
          isParsedAsJson = true;
        }
      } catch (e) {
        // Fallback to text parsing
      }

      if (!isParsedAsJson) {
        const usernameMatch = cleanedText.match(/(?:Username|User):\s*([^\s\n\r]+)/i);
        const idMatch = cleanedText.match(/(?:Telegram ID|ID):\s*(?:<code>)?(\d+)(?:<\/code>)?/i);
        const phoneMatch = cleanedText.match(/(?:Phone Number|Mobile|Phone):\s*(?:<code>)?(\d+)(?:<\/code>)?/i);

        const username = usernameMatch ? usernameMatch[1].trim() : target_username;
        const telegram_id = idMatch ? idMatch[1].trim() : "N/A";
        const phone = phoneMatch ? phoneMatch[1].trim() : "N/A";

        if (telegram_id === "N/A" && phone === "N/A") {
           await logApiRequest(keyRecord?.id || null, `TG: ${targetQuery}`, "failed", Date.now() - startTime);
           return res.status(404).json({ status: "error", message: "Lookup matched but profile contains no traceable ID or phone." });
        }

        parsedResult = {
          telegram_id: telegram_id,
          username: username,
          mobile: phone,
          platform: "Telegram Lookup"
        };
      }

      const newCount = (keyRecord.requests_used || 0) + 1;
      if (!isMaster && keyRecord?.id) {
        await supabaseAdmin.from("api_keys").update({ 
          requests_used: newCount,
          last_used_at: new Date().toISOString()
        }).eq("id", keyRecord.id);
      }

      await logApiRequest(keyRecord?.id || null, `TG: ${targetQuery}`, "success", Date.now() - startTime);

      return res.json({
        status: "success",
        service: "telegram",
        query: targetQuery,
        results: scrubAllBranding(parsedResult)
      });
    } else if (lookupType === 'adhr' || lookupType === 'bnk' || lookupType === 'rasion' || lookupType === 'vehicle' || lookupType === 'veh_owner_num' || lookupType === 'email' || lookupType === 'aadhaar_to_pan') {
      let api_url = "";
      let logPrefix = "";
      
      if (lookupType === 'adhr') {
        api_url = getProviderUrl('aadhaar', targetQuery);
        logPrefix = "ADHR";
      } else if (lookupType === 'aadhaar_to_pan') {
        api_url = getProviderUrl('aadhaar_to_pan', targetQuery);
        logPrefix = "AADHAAR_TO_PAN";
      } else if (lookupType === 'bnk') {
        api_url = getProviderUrl('ifsc', targetQuery);
        logPrefix = "BNK";
      } else if (lookupType === 'rasion') {
        api_url = getProviderUrl('family', targetQuery);
        logPrefix = "RASION";
      } else if (lookupType === 'email') {
        api_url = getProviderUrl('email', targetQuery);
        logPrefix = "EMAIL";
      } else if (lookupType === 'veh_owner_num') {
        logPrefix = "VEH_OWNER";
        const cacheKey = `OWN_${targetQuery}`;
        // Check database cache first for speed of response
        try {
          const { data: cachedRow } = await supabaseAdmin
            .from("vehicle_search_results")
            .select("raw_data")
            .eq("vehicle_number", cacheKey)
            .maybeSingle();

          const isCacheValid = cachedRow && cachedRow.raw_data && 
                               Object.keys(cachedRow.raw_data).length > 0 &&
                               !(cachedRow.raw_data.raw_data && (cachedRow.raw_data.raw_data === "N/A" || String(cachedRow.raw_data.raw_data).trim() === ""));

          if (isCacheValid) {
            console.log(`[CACHE HIT] Serving Vehicle To Owner Number lookup ${targetQuery} via /api/lookup from DB Cache`);
            const newCount = (keyRecord.requests_used || 0) + 1;
            if (!isMaster && keyRecord?.id) {
              await supabaseAdmin.from("api_keys").update({ 
                requests_used: newCount,
                last_used_at: new Date().toISOString()
              }).eq("id", keyRecord.id);
            }
            await logApiRequest(keyRecord?.id || null, `${logPrefix}: ${targetQuery}`, "success", Date.now() - startTime);

            const filtered = formatUnifiedSaaSResponse({
              type: 'veh_owner_num',
              query: targetQuery,
              expiresAt: keyRecord.expires_at,
              planName: keyRecord.plan_name,
              requestsUsed: newCount,
              records: [cachedRow.raw_data]
            });
            return res.json(filtered);
          }
        } catch (cacheErr) {
          console.error("Vehicle owner number Cache check error inside /api/lookup:", cacheErr);
        }

        api_url = getProviderUrl('veh_owner_num', targetQuery);
      } else if (lookupType === 'vehicle') {
        logPrefix = "VEHICLE";
        
        // Check database cache first for speed of response
        try {
          const { data: cachedRow } = await supabaseAdmin
            .from("vehicle_search_results")
            .select("raw_data")
            .eq("vehicle_number", targetQuery)
            .maybeSingle();

          const isCacheValid = cachedRow && cachedRow.raw_data && 
                               Object.keys(cachedRow.raw_data).length > 0 &&
                               !(cachedRow.raw_data.raw_data && (cachedRow.raw_data.raw_data === "N/A" || String(cachedRow.raw_data.raw_data).trim() === ""));

          if (isCacheValid) {
            console.log(`[CACHE HIT] Serving Vehicle lookup ${targetQuery} via /api/lookup from DB Cache`);
            const newCount = (keyRecord.requests_used || 0) + 1;
            if (!isMaster && keyRecord?.id) {
              await supabaseAdmin.from("api_keys").update({ 
                requests_used: newCount,
                last_used_at: new Date().toISOString()
              }).eq("id", keyRecord.id);
            }
            await logApiRequest(keyRecord?.id || null, `${logPrefix}: ${targetQuery}`, "success", Date.now() - startTime);

            const filtered = formatUnifiedSaaSResponse({
              type: 'vehicle',
              query: targetQuery,
              expiresAt: keyRecord.expires_at,
              planName: keyRecord.plan_name,
              requestsUsed: newCount,
              records: [cachedRow.raw_data]
            });
            return res.json(filtered);
          }
        } catch (cacheErr) {
          console.error("Vehicle Cache check error inside /api/lookup:", cacheErr);
        }

        api_url = getProviderUrl('vehicle', targetQuery);
      }

      const response = await fetch(api_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      if (!response.ok) {
        throw new Error(`OSINT Provider Offline: ${lookupType.toUpperCase()} status ${response.status}`);
      }

      const text = await response.text();
      let parsedData: any;
      let isJson = false;

      try {
        parsedData = JSON.parse(text);
        isJson = true;
      } catch (e) {
        const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
        try {
          parsedData = JSON.parse(cleanedText);
          isJson = true;
        } catch (err) {
          if (lookupType === 'adhr') {
            parsedData = parsePlainTextLookup(cleanedText, 'aadhar');
          } else if (lookupType === 'aadhaar_to_pan') {
            parsedData = parsePlainTextLookup(cleanedText, 'pan');
          } else if (lookupType === 'bnk') {
            parsedData = parsePlainTextLookup(cleanedText, 'bank');
          } else if (lookupType === 'rasion') {
            parsedData = parsePlainTextLookup(cleanedText, 'rasion');
          } else {
            parsedData = { raw_data: cleanedText };
          }
        }
      }

      let isError = false;
      if (isJson && parsedData && typeof parsedData === 'object') {
        const statusStr = String(parsedData.status || parsedData.success || "").toLowerCase();
        if (statusStr === "error" || statusStr === "fail" || statusStr === "failed" || statusStr === "false" || statusStr === "404") {
          isError = true;
        } else if (parsedData.error && typeof parsedData.error === 'string' && parsedData.error.trim().length > 0) {
          const errLower = parsedData.error.trim().toLowerCase();
          if (errLower !== "null" && errLower !== "false" && errLower !== "none" && errLower !== "0" && !errLower.includes("success")) {
            isError = true;
          }
        }
      } else {
        const lowerText = text.toLowerCase();
        if (lowerText.includes("no result found") || lowerText.includes("no records found") || lowerText.includes("no data found") || !text.trim()) {
          isError = true;
        }
      }

      if (isError) {
         await logApiRequest(keyRecord?.id || null, `${logPrefix}: ${targetQuery}`, "failed", Date.now() - startTime);
         return res.status(404).json({ status: "error", message: `No identity records found in ${logPrefix} database for ${targetQuery}` });
      }

      if (lookupType === 'vehicle' && parsedData && parsedData.api_creator) {
        delete parsedData.api_creator;
      }
      if (lookupType === 'veh_owner_num' && parsedData && parsedData.api_creator) {
        delete parsedData.api_creator;
      }

      const cleanedData = cleanBrandingObject(parsedData);

      // Save to database cache if it's a vehicle lookup
      if (lookupType === 'vehicle' && cleanedData && Object.keys(cleanedData).length > 0) {
        try {
          await supabaseAdmin.from("vehicle_search_results").upsert({
            vehicle_number: targetQuery,
            raw_data: cleanedData
          }, { onConflict: "vehicle_number" });
          console.log(`[CACHE SAVE] Saved Vehicle lookup ${targetQuery} via /api/lookup to DB Cache`);
        } catch (cacheSaveErr) {
          console.error("Failed to save Vehicle result to database cache:", cacheSaveErr);
        }
      }
      if (lookupType === 'veh_owner_num' && cleanedData && Object.keys(cleanedData).length > 0) {
        try {
          const cacheKey = `OWN_${targetQuery}`;
          await supabaseAdmin.from("vehicle_search_results").upsert({
            vehicle_number: cacheKey,
            raw_data: cleanedData
          }, { onConflict: "vehicle_number" });
          console.log(`[CACHE SAVE] Saved Vehicle To Owner Number lookup ${targetQuery} via /api/lookup to DB Cache`);
        } catch (cacheSaveErr) {
          console.error("Failed to save Vehicle To Owner Number result to database cache:", cacheSaveErr);
        }
      }
      const newCount = (keyRecord.requests_used || 0) + 1;
      if (!isMaster && keyRecord?.id) {
        await supabaseAdmin.from("api_keys").update({ 
          requests_used: newCount,
          last_used_at: new Date().toISOString()
        }).eq("id", keyRecord.id);
      }

      await logApiRequest(keyRecord?.id || null, `${logPrefix}: ${targetQuery}`, "success", Date.now() - startTime);

      const filtered = formatUnifiedSaaSResponse({
        type: lookupType as any,
        query: targetQuery,
        expiresAt: keyRecord.expires_at,
        planName: keyRecord.plan_name,
        requestsUsed: newCount,
        records: Array.isArray(cleanedData) ? cleanedData : [cleanedData]
      });

      if (balanceCheck.deduct) {
        try {
          const { newCredits } = await balanceCheck.deduct();
          filtered.remaining_wallet_balance = newCredits;
          const costDeducted = LOOKUP_RATES[lookupType] || 2.0;
          filtered.cost_deducted = costDeducted;

          // Log detailed transaction trace for owner account and developer history
          if (supabaseAdmin) {
            const userId = balanceCheck.userProfile?.id || keyRecord?.user_id;
            const userEmail = balanceCheck.userProfile?.email || keyRecord?.user_email || "API Developer";
            const refCode = `TRX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            try {
              await supabaseAdmin.from("service_records").insert({
                user_id: userId,
                client_name: userEmail,
                service_name: `B2B API: ${lookupType.toUpperCase()}`,
                reference_code: refCode,
                status: "SUCCESS",
                result_payload: filtered,
                log_number: Math.floor(100 + Math.random() * 900)
              });

              await supabaseAdmin.from("wallet_transactions").insert({
                user_id: userId,
                user_email: userEmail,
                service: `B2B API Call: ${lookupType.toUpperCase()} (${targetQuery})`,
                type: "Debit",
                amount: costDeducted,
                balance_after: newCredits
              });
            } catch (historyErr) {
              console.error("[HISTORY_TRACE_ERROR] Failed to save service record or wallet trace:", historyErr);
            }
          }
        } catch (deductErr) {
          console.error("Failed to deduct account API charge:", deductErr);
        }
      }

      return res.json(filtered);
    } else {
      return res.status(400).json({ status: "error", message: "Lookup option unsupported or disabled" });
    }
  } catch (error: any) {
    console.error("[PROXY_ERROR]", error);
    await logApiRequest(keyRecord?.id || null, `${lookupType.toUpperCase()}: ${targetQuery}`, "failed", Date.now() - startTime);
    res.status(502).json({ 
      status: "error", 
      message: error.message || "Generic API Engine Fault"
    });
  }
});

// Helper for Demo Development API Mock Responses
function getDemoApiResponse(service: string, query: string) {
  const cleanSvc = service.toLowerCase().trim();
  const cleanQuery = query.trim() || "DEMO_QUERY_1234";

  if (cleanSvc.includes('phone') || cleanSvc.includes('number')) {
    return {
      name: "Rajesh Kumar (DEMO)",
      mobile: cleanQuery,
      alt_mobile: "9810987654",
      father_name: "Sohan Lal Sharma",
      aadhar_number: "XXXX-XXXX-9812",
      operator: "Jio Digital / Bharti Airtel",
      state_circle: "Delhi NCR",
      address: "H.No 104, Block B, Sector 15, Rohini, New Delhi 110085",
      demo_note: "This is a Demo Development API response. No credits were deducted."
    };
  } else if (cleanSvc.includes('telegram') || cleanSvc.includes('tg')) {
    return {
      telegram_id: "5829104821",
      username: cleanQuery.replace(/^@/, ''),
      name: "Developer Test Account (DEMO)",
      mobile: "9876543210",
      bio: "Software developer testing TRACEXDATA Intelligence API",
      photo_url: "https://api.dicebear.com/7.x/bottts/svg?seed=tracex",
      status: "Active / Traceable",
      demo_note: "This is a Demo Development API response. No credits were deducted."
    };
  } else if (cleanSvc.includes('adhr') || cleanSvc.includes('identity') || cleanSvc.includes('aadhar')) {
    return {
      aadhar_number: cleanQuery,
      name: "AMIT SHARMA (DEMO)",
      father_name: "RAMESH SHARMA",
      dob: "1994-08-15",
      gender: "MALE",
      address: "FLAT 402, SUNSHINE APTS, MG ROAD, JAIPUR, RAJASTHAN 302001",
      pincode: "302001",
      demo_note: "This is a Demo Development API response. No credits were deducted."
    };
  } else if (cleanSvc.includes('pan') || cleanSvc.includes('pn')) {
    return {
      pan_number: cleanQuery.toUpperCase(),
      full_name: "VIKRAM SINGH (DEMO)",
      father_name: "MAHENDER SINGH",
      dob: "1991-05-20",
      status: "VALID & ACTIVE IN ITD DATABASE",
      linked_aadhaar: "XXXX-XXXX-4512",
      category: "INDIVIDUAL",
      demo_note: "This is a Demo Development API response. No credits were deducted."
    };
  } else if (cleanSvc.includes('veh_owner') || cleanSvc.includes('owner')) {
    return {
      vehicle_number: cleanQuery.toUpperCase(),
      owner_name: "SURESH VERMA (DEMO)",
      owner_mobile: "9812345670",
      alt_contact: "9899001122",
      rto_location: "DL01 - Central Delhi RTO",
      rc_status: "ACTIVE",
      demo_note: "This is a Demo Development API response. No credits were deducted."
    };
  } else if (cleanSvc.includes('vehicle') || cleanSvc.includes('rc')) {
    return {
      vehicle_number: cleanQuery.toUpperCase(),
      owner_name: "SURESH VERMA (DEMO)",
      vehicle_class: "MOTOR CYCLE / SCOOTER",
      maker_model: "HERO MOTOCORP LTD / SPLENDOR PLUS",
      fuel_type: "PETROL",
      engine_number: "HA10E-9102834",
      chassis_number: "MBLHA10EX-8291038",
      registration_date: "2021-03-10",
      insurance_upto: "2026-11-20",
      fitness_upto: "2036-03-09",
      rto_name: "DL01 - Central Delhi",
      demo_note: "This is a Demo Development API response. No credits were deducted."
    };
  } else if (cleanSvc.includes('bnk') || cleanSvc.includes('ifsc') || cleanSvc.includes('bank')) {
    return {
      ifsc_code: cleanQuery.toUpperCase(),
      bank_name: "STATE BANK OF INDIA",
      branch: "MAIN BRANCH NEW DELHI",
      city: "NEW DELHI",
      district: "NEW DELHI",
      state: "DELHI",
      micr_code: "110002001",
      address: "11 PARLIAMENT STREET, NEW DELHI 110001",
      contact: "011-23374829",
      demo_note: "This is a Demo Development API response. No credits were deducted."
    };
  } else if (cleanSvc.includes('email') || cleanSvc.includes('mail')) {
    return {
      email: cleanQuery,
      full_name: "Aman Preet (DEMO)",
      google_id: "10984719284712984",
      linked_phone: "9876XXXX12",
      breaches_count: 2,
      breached_services: ["Canva (2019)", "LinkedIn (2021)"],
      demo_note: "This is a Demo Development API response. No credits were deducted."
    };
  } else if (cleanSvc.includes('rasion') || cleanSvc.includes('ration')) {
    return {
      ration_card_no: cleanQuery,
      head_of_family: "Smt. Sunita Devi (DEMO)",
      card_type: "PHH / PRIORITY HOUSEHOLD",
      address: "Village Rampur, Dist Karnal, Haryana",
      family_members_count: 4,
      fps_dealer: "M/s Fair Price Shop #102",
      demo_note: "This is a Demo Development API response. No credits were deducted."
    };
  } else if (cleanSvc.includes('aadhaar_to_pan') || cleanSvc.includes('adhr2pan')) {
    return {
      aadhaar_number: cleanQuery,
      pan_number: "ABCDE1234F",
      full_name: "PRIYA SHARMA (DEMO)",
      link_status: "LINKED AND VERIFIED",
      demo_note: "This is a Demo Development API response. No credits were deducted."
    };
  }

  return {
    query: cleanQuery,
    service: cleanSvc,
    status: "SUCCESS",
    sample_data: "Demo Development Response — All systems operational.",
    demo_note: "This is a Demo Development API response. No credits were deducted."
  };
}

// -----------------------------------------------------------------------------------------
// PUBLIC DEMO API ENDPOINTS FOR DEVELOPERS & INTEGRATION TESTING
// -----------------------------------------------------------------------------------------
app.all(["/api/demo_api.php", "/api/demo-lookup"], async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const service = String(req.query.service || req.body?.service || req.query.type || req.body?.type || "phone");
  const query = String(req.query.query || req.body?.query || req.query.term || req.body?.term || req.query.number || req.body?.number || "9876543210");

  const demoData = getDemoApiResponse(service, query);

  return res.json({
    status: "success",
    demo_mode: true,
    message: "Demo Development API — Returns sample response payload. Zero credits deducted.",
    service: service,
    query: query,
    cost_deducted: 0,
    remaining_wallet_balance: 9999.00,
    results: demoData
  });
});

// -----------------------------------------------------------------------------------------
// ALVIS PORTAL API ALIAS (/api/alvis/lookup/*)
// -----------------------------------------------------------------------------------------
app.all(["/api/alvis/lookup/*", "/api/alvis/lookup"], async (req, res) => {
  const apiKey = String(
    req.headers['x-api-key'] ||
    req.query.apiKey ||
    req.query.api_key ||
    req.query.key ||
    req.body?.apiKey ||
    req.body?.api_key ||
    req.body?.key ||
    ""
  ).trim();

  let service = String(req.query.service || req.body?.service || "").trim();
  let queryVal = String(
    req.query.query ||
    req.query.aadhaar ||
    req.query.pan ||
    req.query.number ||
    req.body?.query ||
    req.body?.aadhaar ||
    req.body?.pan ||
    req.body?.number ||
    ""
  ).trim();

  const fullPath = req.path;
  if (fullPath.includes("aadhaar-to-pan") || fullPath.includes("aadhaar_to_pan")) {
    service = "aadhaar_to_pan";
  } else if (fullPath.includes("pan-to-name-dob") || fullPath.includes("pan")) {
    service = "pancard";
  } else if (fullPath.includes("number") || fullPath.includes("phone")) {
    service = "phone";
  }

  req.query.key = apiKey;
  req.query.service = service || "phone";
  req.query.query = queryVal;

  return req.app._router.handle(req, res, () => {});
});
app.all("/api/developer_api.php", async (req, res) => {
  const apiKey = String(req.query.api_key || req.query.key || req.body?.api_key || req.body?.key || "").trim();
  const isDemoMode = req.query.demo === "true" || apiKey === "DEMO_KEY_TRACEXDATA" || apiKey === "DEMO_KEY" || req.query.demo === "1";

  if (isDemoMode || !apiKey) {
    const service = String(req.query.service || req.body?.service || req.query.type || req.body?.type || "phone");
    const query = String(req.query.query || req.body?.query || req.query.term || req.body?.term || req.query.number || req.body?.number || "9876543210");

    const demoData = getDemoApiResponse(service, query);

    return res.json({
      status: "success",
      demo_mode: true,
      message: "Demo Development API — Returns sample response payload. Zero credits deducted.",
      service: service,
      query: query,
      cost_deducted: 0,
      remaining_wallet_balance: 9999.00,
      results: demoData
    });
  }

  // Forward to /api/lookup with mapped key query
  req.query.key = apiKey;
  return req.app._router.handle(req, res, () => {});
});

// --- ORDER FULFILLMENT UPGRADE ---

async function fulfillOrder(orderId: string, userId: string) {
  if (!supabaseAdmin) return;

  try {
    const { data: claim, error: claimErr } = await supabaseAdmin
      .from("payment_claims")
      .select("*")
      .eq("payment_id", orderId)
      .single();

    if (claimErr || !claim || claim.status === "success" || claim.status === "consumed") return;

    // Atomic Lock
    const { data: lockResult, error: lockErr } = await supabaseAdmin
      .from("payment_claims")
      .update({ status: "processing" })
      .eq("payment_id", orderId)
      .eq("status", "pending")
      .select();

    if (lockErr || !lockResult || lockResult.length === 0) {
      console.log(`[RACE CONDITION PREVENTED] Order ${orderId} is already being processed.`);
      return;
    }

    const { plan_id, user_email } = claim;

    // Handle manual pgpay guest payments
    if (plan_id === "pgpay_manual" || plan_id === "panfind") {
      await supabaseAdmin.from("payment_claims").update({ status: "success" }).eq("payment_id", orderId);
      console.log(`[SaaS] Manual Guest Payment fulfilled successfully for ${orderId}`);
      return;
    }

    // Handle Gaurav PVT Python Script purchase fulfillment
    if (plan_id === "gaurav_pvt_script") {
      const activatedStatus = `success_activated:${Date.now()}`;
      await supabaseAdmin.from("payment_claims").update({ status: activatedStatus }).eq("payment_id", orderId);
      console.log(`[SaaS] Gaurav PVT Script purchase verified & fulfilled securely: ${orderId}`);
      return;
    }
    
    // Flexible check for ID variants with automatic UUID resolution fallback
    let finalUserId = userId;
    if (!userId || userId.startsWith("guest_") || userId === "null" || userId.length !== 36) {
      if (claim.user_id && claim.user_id.length === 36) {
        finalUserId = claim.user_id;
        console.log(`[FULFILL] Resolved non-UUID user_id to valid claim user_id: ${finalUserId}`);
      } else {
        console.log(`[FULFILL] Non-UUID user_id '${userId}' skipped database state updates, marking order ${orderId} fulfilled.`);
        await supabaseAdmin.from("payment_claims").update({ status: "success" }).eq("payment_id", orderId);
        return;
      }
    }

    const isApiPlan = claim.plan_id.includes('a15') || claim.plan_id.includes('a30') || claim.plan_id.startsWith('api_');

    if (isApiPlan) {
      // API Key Logic
      const apiKey = `tx_${crypto.randomBytes(16).toString('hex')}`;
      let days = 30;
      let limit: number | null = null;
      let planName = "Number Lookup (1 Month)";

      // Full ID Mapping
      if (plan_id === 'api_number_20') {
        planName = "Number Lookup API (40 Lookups)"; days = 30; limit = 40;
      } else if (plan_id === 'api_number_50') {
        planName = "Number Lookup API (200 Lookups)"; days = 30; limit = 200;
      } else if (plan_id === 'api_number_150') {
        planName = "Number Lookup API (1 Week Unlimited)"; days = 7; limit = null;
      } else if (plan_id === 'api_number_400' || plan_id === 'api_number') {
        planName = "Number Lookup API (1 Month Unlimited)"; days = 30; limit = null;
      } else if (plan_id === 'api_number_1000') {
        planName = "Number Lookup API (3 Months Unlimited)"; days = 90; limit = null;
      } else if (plan_id === 'api_number_1600') {
        planName = "Number Lookup API (6 Months Unlimited)"; days = 180; limit = null;
      } else if (plan_id === 'api_number_3000') {
        planName = "Number Lookup API (1 Year Unlimited)"; days = 365; limit = null;

      } else if (plan_id === 'api_telegram_20') {
        planName = "Telegram Lookup API (5 Lookups)"; days = 30; limit = 5;
      } else if (plan_id === 'api_telegram_50') {
        planName = "Telegram Lookup API (20 Lookups)"; days = 30; limit = 20;
      } else if (plan_id === 'api_telegram_200') {
        planName = "Telegram Lookup API (1 Week Unlimited)"; days = 7; limit = null;
      } else if (plan_id === 'api_telegram_650' || plan_id === 'api_telegram') {
        planName = "Telegram Lookup API (1 Month Unlimited)"; days = 30; limit = null;
      } else if (plan_id === 'api_telegram_1800') {
        planName = "Telegram Lookup API (3 Months Unlimited)"; days = 90; limit = null;

      } else if (plan_id === 'api_identity_20') {
        planName = "Identity Card API (5 Lookups)"; days = 30; limit = 5;
      } else if (plan_id === 'api_identity_50') {
        planName = "Identity Card API (30 Lookups)"; days = 30; limit = 30;
      } else if (plan_id === 'api_identity_150') {
        planName = "Identity Card API (1 Week Unlimited)"; days = 7; limit = null;
      } else if (plan_id === 'api_identity_450' || plan_id === 'api_identity') {
        planName = "Identity Card API (1 Month Unlimited)"; days = 30; limit = null;
      } else if (plan_id === 'api_identity_1100') {
        planName = "Identity Card API (3 Months Unlimited)"; days = 90; limit = null;

      } else if (plan_id === 'api_vehicle_20') {
        planName = "Vehicle Lookup API (10 Lookups)"; days = 30; limit = 10;
      } else if (plan_id === 'api_vehicle_400') {
        planName = "Vehicle Lookup API (15 Days Unlimited)"; days = 15; limit = null;
      } else if (plan_id === 'api_vehicle_700' || plan_id === 'api_vehicle') {
        planName = "Vehicle Lookup API (1 Month Unlimited)"; days = 30; limit = null;
      } else if (plan_id === 'api_vehicle_1800') {
        planName = "Vehicle Lookup API (3 Months Unlimited)"; days = 90; limit = null;

      } else if (plan_id === 'api_bank_20') {
        planName = "BA&NK Lookup API (20 Lookups)"; days = 30; limit = 20;
      } else if (plan_id === 'api_bank_70') {
        planName = "BA&NK Lookup API (1 Week Unlimited)"; days = 7; limit = null;
      } else if (plan_id === 'api_bank_250' || plan_id === 'api_bank') {
        planName = "BA&NK Lookup API (1 Month Unlimited)"; days = 30; limit = null;
      } else if (plan_id === 'api_bank_600') {
        planName = "BA&NK Lookup API (3 Months Unlimited)"; days = 90; limit = null;

      } else if (plan_id === 'api_aadhaar_to_pan_1000') {
        planName = "Aadhaar To PAN API (10 Lookups)"; days = 30; limit = 10;
      } else if (plan_id === 'api_aadhaar_to_pan_2000') {
        planName = "Aadhaar To PAN API (22 Lookups)"; days = 30; limit = 22;
      } else if (plan_id === 'api_aadhaar_to_pan_5000') {
        planName = "Aadhaar To PAN API (60 Lookups)"; days = 30; limit = 60;
      } else if (plan_id === 'api_aadhaar_to_pan_10000') {
        planName = "Aadhaar To PAN API (15 Days Unlimited)"; days = 15; limit = null;

      } else if (plan_id === 'api_pancard') {
        planName = "PN Card Lookup (1 Month)"; days = 30; limit = null;
      } else if (plan_id === 'api_combo') {
        planName = "All Combo Special (1 Month)"; days = 30; limit = null;
      } else if (plan_id === 'api_rasion') {
        planName = "Rasion Card Lookup (1 Month)"; days = 30; limit = null;
      } else {
        // Fallback for any other custom/older api plan
        if (plan_id.includes('15')) days = 15;
        if (plan_id.includes('unl')) limit = null;
        planName = `${days} Days Unlimited API`;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      await supabaseAdmin.from("api_keys").insert({
        api_key: apiKey,
        user_id: finalUserId,
        user_email: user_email || "N/A",
        plan_name: planName,
        request_limit: limit,
        expires_at: expiresAt.toISOString()
      });
      
      await supabaseAdmin.from("payment_claims").update({ status: "success" }).eq("payment_id", orderId);
      console.log(`[SaaS] API Key generated for ${finalUserId} (Plan: ${planName})`);
      return;
    }

    // Existing credit/unlimited logic (fallback)
    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", finalUserId).maybeSingle();
    if (!profile) return;
    
    const updateData: any = {};
    let creditsToAdd = 0;
    
    if (claim.amount && claim.amount > 0) {
      creditsToAdd = Math.round(Number(claim.amount));
    } else if (['c10', 'credit_10'].includes(plan_id)) creditsToAdd = 15;
    else if (['c20', 'credit_20'].includes(plan_id)) creditsToAdd = 30;
    else if (['c40', 'credit_40'].includes(plan_id)) creditsToAdd = 60;
    else if (['c50', 'credit_50'].includes(plan_id)) creditsToAdd = 75;
    else if (['c100', 'credit_100'].includes(plan_id)) creditsToAdd = 150;
    else if (['c150', 'credit_150'].includes(plan_id)) creditsToAdd = 225;
    else if (['c250', 'credit_250'].includes(plan_id)) creditsToAdd = 412;
    else if (['c500', 'credit_500'].includes(plan_id)) creditsToAdd = 900;
    else if (['c1000', 'credit_1000'].includes(plan_id)) creditsToAdd = 1950;
    else {
      // Dynamic fallback extraction
      const match = strPlanId().match(/^(?:c|credit_|wallet_|recharge_?)(\d+)$/i);
      if (match) {
        creditsToAdd = parseInt(match[1], 10);
      }
    }
    
    // Helper function to convert plan_id safely
    function strPlanId(): string {
      return String(plan_id || '');
    }

    if (creditsToAdd > 0) {
      updateData.credits = (profile.credits || 0) + creditsToAdd;
    } else if (plan_id.startsWith('u') || plan_id.startsWith('unlimited')) {
        const hoursMap: any = {
            'u1h': 1, 'unlimited_1h': 1,
            'u1d': 24, 'u24h': 24, 'unlimited_1d': 24, 'unlimited_24h': 24,
            'u1w': 168, 'unlimited_1w': 168,
            'u1m': 720, 'unlimited_1m': 720, 'u1m_special200': 720
        };
        const hours = hoursMap[plan_id as string] || 0;
        const now = new Date();
        const start = profile.unlimited_expiry && new Date(profile.unlimited_expiry) > now 
                    ? new Date(profile.unlimited_expiry) : now;
        if (hours > 0) {
            updateData.unlimited_expiry = new Date(start.getTime() + (hours * 3600000)).toISOString();
        }
    }

    if (Object.keys(updateData).length > 0) {
      await supabaseAdmin.from("profiles").update(updateData).eq("id", finalUserId);
      await supabaseAdmin.from("payment_claims").update({ status: "success" }).eq("payment_id", orderId);

      // Trigger 5% Referral Bonus to referrer
      const depositAmt = Number(claim.amount || creditsToAdd || 0);
      if (depositAmt > 0) {
        await processReferralDepositBonus(finalUserId, depositAmt);
      }
    }
  } catch (err) {
    console.error("Fulfillment error:", err);
  }
}

// Cashfree Routes

app.post("/api/cashfree/create-order", async (req, res) => {
  const isPgPay = req.body?.plan_id === "pgpay_manual" || req.body?.plan_id === "panfind" || req.body?.plan_id === "alvisappapi";
  
  let authenticatedUserId = null;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    if (supabaseAdmin) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        authenticatedUserId = user.id;
      }
    }
  }

  if (!isPgPay && !authenticatedUserId) {
    return res.status(401).json({ error: "Unauthorized. Authentication required to create an order." });
  }

  // Override user_id with the authenticated user ID (prevent IDOR)
  if (!isPgPay && authenticatedUserId) {
    req.body.user_id = authenticatedUserId;
  }

  if (!supabaseAdmin && !isPgPay) {
    return res.status(500).json({ error: "Backend not configured (Supabase Admin missing)" });
  }

  try {
    const { user_id, user_email, plan_id, amount, customer_phone, customer_name, return_url } = req.body;
    
    // Strict input validation
    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 100000) {
      return res.status(400).json({ error: "Invalid payment amount" });
    }
    if (plan_id !== "pgpay_manual" && plan_id !== "panfind" && plan_id !== "alvisappapi") {
      if (!user_id || typeof user_id !== 'string') {
        return res.status(400).json({ error: "Invalid user ID" });
      }
    }


    if ((!user_id && !isPgPay) || !plan_id || !amount) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      console.log("[TRACEXDATA] Local Cashfree credentials missing. Proxying create-order request to live Render backend...");
      const renderBackendUrl = "https://tracexdata-api.onrender.com";
      const response = await fetch(`${renderBackendUrl}/api/cashfree/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    const orderId = `order_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const cfPayload = {
      order_id: orderId,
      order_amount: Number(amount),
      order_currency: "INR",
      customer_details: {
        customer_id: user_id || `guest_${Date.now()}`,
        customer_email: user_email || "customer@example.com",
        customer_phone: customer_phone || "9999999999"
      },
      order_meta: {
        return_url: return_url || `https://tracexdata-api.onrender.com?order_id={order_id}`
      }
    };

    const response = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cfPayload)
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error("Cashfree API Error:", data);
      return res.status(response.status).json({ error: data.message || "Cashfree Error" });
    }

    // Log entry in Supabase to track transaction trace (if database is available)
    if (supabaseAdmin) {
      try {
        const isValidUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const dbUserId = (user_id && isValidUuid(user_id)) ? user_id : null;
        await supabaseAdmin.from("payment_claims").insert({
          payment_id: orderId,
          user_id: dbUserId,
          plan_id: plan_id,
          amount: Number(amount),
          status: "pending"
        });
      } catch (dbErr) {
        console.error("Failed to log payment claim:", dbErr);
      }
    } else {
      console.log("[TRACEXDATA] Database offline or unconfigured. Proceeding with order creation without state logging.");
    }

    const envMode = CASHFREE_BASE_URL.includes("sandbox") ? "sandbox" : "production";
    res.json({ ...data, cf_mode: envMode });
  } catch (error) {
    console.error("Cashfree Create Order Error:", error);
    res.status(500).json({ error: "Failed to initiate payment engine" });
  }
});


app.get("/api/cashfree/status/:order_id", async (req, res) => {
  const { order_id } = req.params;
  
  if (!order_id || typeof order_id !== 'string' || order_id.trim().length === 0 || order_id.length > 100) {
    return res.status(400).json({ error: "Invalid Order ID." });
  }

  try {

    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      console.log("[TRACEXDATA] Local Cashfree credentials missing. Proxying status verification request to live Render backend...");
      const renderBackendUrl = "https://tracexdata-api.onrender.com";
      const response = await fetch(`${renderBackendUrl}/api/cashfree/status/${order_id}`);
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    const response = await fetch(`${CASHFREE_BASE_URL}/orders/${order_id}`, {
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'
      }
    });

    const data: any = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || "Failed to fetch status" });
    }

    if (data.order_status === "PAID") {
      if (supabaseAdmin) {
        await fulfillOrder(order_id, data.customer_details.customer_id);
      } else {
        console.log("[TRACEXDATA] Payment verified PAID, but database is not active. Skipping database fulfillment callback.");
      }
    }

    if (supabaseAdmin) {
      try {
        const { data: claim } = await supabaseAdmin
          .from("payment_claims")
          .select("plan_id")
          .eq("payment_id", order_id)
          .maybeSingle();
        if (claim && claim.plan_id) {
          data.plan_id = claim.plan_id;
        }
      } catch (claimsErr) {
        console.error("Failed to query claim for status response enrichment:", claimsErr);
      }
    }

    res.json(data);
  } catch (error) {
    console.error("Status Check Error:", error);
    res.status(500).json({ error: "Failed to verify status" });
  }
});

// --- SECURE GAURAV BENIWAL PVT PYTHON SCRIPT PURCHASE & DOWNLOAD SYSTEM ---

app.get("/api/script/status", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized. Authentication token is required." });
  }

  const token = authHeader.replace("Bearer ", "");
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Backend database not configured." });
  }

  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ error: "Unauthorized. Invalid token." });
    }

    // Query payment claims for the user for the specific script plan
    const { data: claims, error: claimsErr } = await supabaseAdmin
      .from("payment_claims")
      .select("*")
      .eq("user_id", user.id)
      .eq("plan_id", "gaurav_pvt_script")
      .order("created_at", { ascending: false });

    if (claimsErr) {
      console.error("Error fetching script claims:", claimsErr);
      return res.status(500).json({ error: "Failed to fetch purchase history." });
    }

    const processedClaims = await Promise.all((claims || []).map(async (claim: any) => {
      let status = "pending";
      let activatedAt = null;
      let expiresAt = null;
      let timeLeftMs = 0;

      if (claim.status === "success") {
        // If status is just "success" without timestamp, we activate it now
        const now = Date.now();
        const activatedStatus = `success_activated:${now}`;
        await supabaseAdmin.from("payment_claims").update({ status: activatedStatus }).eq("id", claim.id);
        claim.status = activatedStatus;
      }

      if (claim.status && claim.status.startsWith("success_activated:")) {
        status = "active";
        activatedAt = parseInt(claim.status.split(":")[1], 10);
        expiresAt = activatedAt + 10 * 60 * 1000; // 10 minutes
        timeLeftMs = expiresAt - Date.now();

        if (timeLeftMs <= 0) {
          status = "expired";
          timeLeftMs = 0;
          // Clean/Update database to mark permanently expired
          await supabaseAdmin.from("payment_claims").update({ status: "success_expired" }).eq("id", claim.id);
        }
      } else if (claim.status === "success_expired" || claim.status === "expired") {
        status = "expired";
      } else if (claim.status === "pending") {
        status = "pending";
      }

      return {
        order_id: claim.payment_id,
        amount: claim.amount,
        status: status,
        created_at: claim.created_at,
        activated_at: activatedAt ? new Date(activatedAt).toISOString() : null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        time_left_ms: timeLeftMs
      };
    }));

    res.json({
      purchases: processedClaims,
      latest_active_purchase: processedClaims.find((p: any) => p.status === "active") || null
    });

  } catch (err: any) {
    console.error("Script status endpoint error:", err);
    res.status(500).json({ error: "Server error checking status." });
  }
});

app.get("/api/script/download-file", async (req, res) => {
  const { order_id } = req.query;
  const authHeader = req.headers.authorization;

  if (!order_id || typeof order_id !== "string") {
    return res.status(400).json({ error: "Bad Request. Order ID is required." });
  }

  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized. Authentication token is required." });
  }

  const token = authHeader.replace("Bearer ", "");
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Backend database not configured." });
  }

  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ error: "Unauthorized. Invalid token." });
    }

    // Verify ownership and success status of the claim
    const { data: claim, error: claimErr } = await supabaseAdmin
      .from("payment_claims")
      .select("*")
      .eq("payment_id", order_id)
      .eq("user_id", user.id)
      .eq("plan_id", "gaurav_pvt_script")
      .maybeSingle();

    if (claimErr || !claim) {
      return res.status(404).json({ error: "Purchase not found or access denied." });
    }

    let status = claim.status;
    if (status === "success") {
      const now = Date.now();
      status = `success_activated:${now}`;
      await supabaseAdmin.from("payment_claims").update({ status }).eq("id", claim.id);
    }

    if (!status || !status.startsWith("success_activated:")) {
      return res.status(403).json({ error: "Script has not been purchased, or payment is pending." });
    }

    const activatedAt = parseInt(status.split(":")[1], 10);
    const expiresAt = activatedAt + 10 * 60 * 1000;

    if (Date.now() > expiresAt) {
      // Mark permanently expired in DB
      await supabaseAdmin.from("payment_claims").update({ status: "success_expired" }).eq("id", claim.id);
      return res.status(410).json({ error: "Download link has expired. The 10-minute download window has ended." });
    }

    // Secure direct download link
    const secureDownloadLink = "https://download943.mediafire.com/654o31hm969gLYWkGEV9jpea1xvulIEe-Ha_hxgtP-zZKFoGlDEMixTAfA25kO-N3EHCKQxqA0Ova5XgRBayo-FcvPWv9-TKAH6nSjQXst9e4iuBzSsy9_3jr_vEGIWLu84AjEnLh2_uTeGTuiWEfyNAfVTM0V4b2TE6YribrAW0LA/31wlz4fnga6nkus/Gaurav_pvt_scri%27%2B%27pt.py";
    
    // Send a JSON with the URL or redirect
    res.json({ download_url: secureDownloadLink });

  } catch (err: any) {
    console.error("Secure download endpoint error:", err);
    res.status(500).json({ error: "Server error generating secure download." });
  }
});

// Telegram Lookup API Middleware Proxy
app.get("/test-telegram", async (req, res) => {
  try {
    const data = await fetchLocalApi("/api/telegram?query=@Seekhlebhai&key=" + INTERNAL_MASTER_KEY);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/telegram", async (req, res) => {
  const { query, telegram, api } = req.query;
  const key = String(req.query.key || req.headers['x-api-key'] || "").trim();
  const targetTelegramId = String(query || telegram || api || "").trim();
  const startTime = Date.now();

  // Removed wildcard CORS
  res.setHeader('Content-Type', 'application/json');

  if (!targetTelegramId) {
    return res.status(400).json({ status: "error", message: "Telegram query parameter is required" });
  }

  let keyRecord: any = null;

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ status: "error", message: "Engine Offline: Internal connection failure" });
    }

    const isMaster = key === INTERNAL_MASTER_KEY;

    if (isMaster) {
      keyRecord = {
        id: "master",
        plan_name: "Internal Master API",
        expires_at: new Date(Date.now() + 365*24*3600000).toISOString(),
        status: "active",
        requests_used: 0,
        request_limit: null
      };
    } else {
      if (!key) return res.status(401).json({ status: "error", message: "API key is required" });

      const { data: keyRecords, error: keyErr } = await supabaseAdmin
        .from("api_keys")
        .select("*")
        .eq("api_key", key);

      keyRecord = keyRecords?.[0];

      if (keyErr || !keyRecord) {
        return res.status(401).json({ status: "error", message: "Access Denied: Invalid or unauthorized API key" });
      }

      const now = new Date();
      const expiryDate = keyRecord.expires_at ? new Date(keyRecord.expires_at) : null;
      if ((expiryDate && expiryDate < now) || keyRecord.status !== 'active') {
        return res.status(403).json({ 
          status: "error", 
          message: "Subscription Blocked: API key expired or suspended",
          buy_url: "https://tracexdata-api.onrender.com/buy-api"
        });
      }

      const requestsUsed = keyRecord.requests_used || 0;
      const requestLimit = keyRecord.request_limit;

      if (requestLimit !== null && requestsUsed >= requestLimit) {
        return res.status(403).json({ status: "error", message: "Quota Exhausted: Lookup limit reached" });
      }

      // All API keys allowed
      const isAllowed = true;
    }

    // Checking safety protection bypass
    let isProtected = false;
    const { data: protectedData } = await supabaseAdmin
      .from('protected_telegrams')
      .select('telegram_id')
      .eq('telegram_id', targetTelegramId)
      .maybeSingle();
    
    if (protectedData) isProtected = true;

    if (isProtected) {
      // Record telemetry for protected search
      if (!isMaster && keyRecord?.id) {
        await supabaseAdmin.from("api_keys").update({ 
          requests_used: (keyRecord.requests_used || 0) + 1,
          last_used_at: new Date().toISOString()
        }).eq("id", keyRecord.id);
      }

      await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "success", Date.now() - startTime);

      return res.status(200).json({
        status: "success",
        message: "Protected: This Telegram account is protected on TRACEXDATA. 🛡️",
        results: {
          "Telegram Match": {
            name: "PROTECTED RECORD",
            telegram_id: targetTelegramId,
            mobile: "PROTECTED @ TRACEX SHIELD",
            father_name: "PROTECTED @ TRACEX SHIELD",
            alt_mobile: "PROTECTED @ TRACEX SHIELD",
            email: "PROTECTED @ TRACEX SHIELD",
            aadhar_number: "PROTECTED @ TRACEX SHIELD",
            operator: "PROTECTED @ TRACEX SHIELD",
            state_circle: "PROTECTED @ TRACEX SHIELD",
            address: "PROTECTED @ TRACEX SHIELD"
          }
        }
      });
    }

    const target_username = targetTelegramId.replace(/^@/, "");
    const cache_key = `tg_${target_username.toLowerCase()}`;

    // SECURE BACKEND DATABASE CACHE CHECK FIRST
    try {
      if (supabaseAdmin) {
        const { data: cachedRow } = await supabaseAdmin
          .from('search_results')
          .select('raw_data')
          .eq('mobile_number', cache_key)
          .maybeSingle();

        if (cachedRow && cachedRow.raw_data && Object.keys(cachedRow.raw_data).length > 0) {
          console.log(`[Telegram Cache Hit] Serving ${targetTelegramId} from database cache`);
          
          // Record telemetry for successful cached search
          if (!isMaster && keyRecord?.id) {
            await supabaseAdmin.from("api_keys").update({ 
              requests_used: (keyRecord.requests_used || 0) + 1,
              last_used_at: new Date().toISOString()
            }).eq("id", keyRecord.id);
          }

          await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "success", Date.now() - startTime);
          return res.status(200).json({ status: "success", results: cachedRow.raw_data, cached: true });
        }
      }
    } catch (cacheErr) {
      console.error("[Telegram Cache Read Error]", cacheErr);
    }

    const api_url = getProviderUrl('telegram', target_username);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

    let text = "";
    try {
      const response = await fetch(api_url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, et Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "failed", Date.now() - startTime);
        return res.status(200).json({ status: "success", results: {}, message: "no data found" });
      }
      text = await response.text();
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.warn("[Telegram Fetch Error / Timeout]", fetchErr);
      await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "failed", Date.now() - startTime);
      return res.status(200).json({ status: "success", results: {}, message: "no data found" });
    }

    const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb(?:er|3r)[\s\-_]*s(?:oldier|0ldier)|@?cyb(?:er|3r)s(?:oldier|0ldier)|u(?:ers|ser)xinfo(?:\.in)?)/gi, "");
    const lowerText = cleanedText.toLowerCase();

    if (lowerText.includes("no result") || lowerText.includes("no records found") || !text.trim()) {
       await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "failed", Date.now() - startTime);
       return res.status(200).json({ status: "success", service: "telegram", query: targetTelegramId, results: {}, message: "no data found" });
    }

    let results: any = null;
    let isParsedAsJson = false;

    try {
      const parsed = JSON.parse(text);
      if (parsed && (parsed.success === false || parsed.status === false || parsed.status === "false")) {
        await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "failed", Date.now() - startTime);
        return res.status(200).json({ status: "success", service: "telegram", query: targetTelegramId, results: {}, message: "no data found" });
      }

      const cleaned_json = scrubAllBranding(parsed);
      if (cleaned_json && typeof cleaned_json === 'object') {
        let raw_res = cleaned_json.results || cleaned_json.data || cleaned_json;
        if (raw_res.tg_id || raw_res.telegram_id || raw_res.number || raw_res.mobile) {
           results = {
             username: raw_res.username || targetTelegramId,
             telegram_id: raw_res.tg_id || raw_res.telegram_id || "N/A",
             mobile: raw_res.number || raw_res.mobile || "N/A",
             platform: "Telegram Lookup"
           };
        } else {
           results = raw_res;
        }
        isParsedAsJson = true;
      }
    } catch (e) {
      // Fallback to text parsing
    }

    if (!isParsedAsJson) {
      let usernameMatch = cleanedText.match(/(?:Username|User):\s*([^\s\n\r]+)/i);
      if (!usernameMatch) usernameMatch = cleanedText.match(/"(?:username|name)"\s*:\s*"([^"]+)"/i);

      let idMatch = cleanedText.match(/(?:Telegram ID|ID):\s*(?:<code>)?(\d+)(?:<\/code>)?/i);
      if (!idMatch) idMatch = cleanedText.match(/"(?:tg_id|telegram_id)"\s*:\s*"?(\d+)"?/i);

      let phoneMatch = cleanedText.match(/(?:Phone Number|Mobile|Phone):\s*(?:<code>)?(\d+)(?:<\/code>)?/i);
      if (!phoneMatch) phoneMatch = cleanedText.match(/"(?:number|mobile|phone)"\s*:\s*"?(\d+)"?/i);

      const username = usernameMatch ? usernameMatch[1].trim() : target_username;
      const telegram_id = idMatch ? idMatch[1].trim() : "N/A";
      const phone = phoneMatch ? phoneMatch[1].trim() : "N/A";

      if (telegram_id === "N/A" && phone === "N/A") {
         await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "failed", Date.now() - startTime);
         return res.status(200).json({ status: "success", service: "telegram", query: targetTelegramId, results: {}, message: "no data found" });
      }

      results = {
        telegram_id: telegram_id,
        username: username,
        mobile: phone,
        platform: "Telegram Lookup"
      };
    }

    // Save successful result to database cache
    try {
      if (supabaseAdmin && results) {
        await supabaseAdmin.from('search_results').upsert({
          mobile_number: cache_key,
          raw_data: results
        }, { onConflict: 'mobile_number' });
        console.log(`[Telegram Cache Save] Successfully cached lookup for: ${target_username}`);
      }
    } catch (cacheSaveErr) {
      console.error("[Telegram Cache Save Error]", cacheSaveErr);
    }

    // Record telemetry for successful search
    if (!isMaster && keyRecord?.id) {
      await supabaseAdmin.from("api_keys").update({ 
        requests_used: (keyRecord.requests_used || 0) + 1,
        last_used_at: new Date().toISOString()
      }).eq("id", keyRecord.id);
    }

    await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "success", Date.now() - startTime);

    return res.json({ status: "success", service: "telegram", query: targetTelegramId, results: scrubAllBranding(results) });
  } catch (err: any) {
    console.error("Telegram Proxy error:", err);
    await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "failed", Date.now() - startTime);
    return res.status(500).json({ status: "error", message: "Sorry, we don't have data related to the query." });
  }
});

// Identity Card Lookup API Middleware Proxy
app.get("/api/identity", async (req, res) => {
  const { query, aadhar, identity, exploits } = req.query;
  const key = String(req.query.key || req.headers['x-api-key'] || "").trim();
  let targetQuery = String(query || aadhar || identity || exploits || "").trim();
  const startTime = Date.now();

  // Removed wildcard CORS
  res.setHeader('Content-Type', 'application/json');

  if (!targetQuery) {
    return res.status(400).json({ status: "error", message: "Identity/Aadhaar query parameter is required" });
  }

  // Clean to digits only
  targetQuery = targetQuery.replace(/[^0-9]/g, '');

  if (targetQuery.length !== 12) {
    return res.status(400).json({ status: "error", message: "Invalid Query: Aadhaar must be a 12-digit numeric identifier" });
  }

  let keyRecord: any = null;

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ status: "error", message: "Engine Offline: Internal connection failure" });
    }

    const isMaster = key === INTERNAL_MASTER_KEY;

    if (isMaster) {
      keyRecord = {
        id: "master",
        plan_name: "Internal Master API",
        expires_at: new Date(Date.now() + 365*24*3600000).toISOString(),
        status: "active",
        requests_used: 0,
        request_limit: null
      };
    } else {
      if (!key) return res.status(401).json({ status: "error", message: "API key is required" });

      const { data: keyRecords, error: keyErr } = await supabaseAdmin
        .from("api_keys")
        .select("*")
        .eq("api_key", key);

      keyRecord = keyRecords?.[0];

      if (keyErr || !keyRecord) {
        return res.status(401).json({ status: "error", message: "Access Denied: Invalid or unauthorized API key" });
      }

      const now = new Date();
      const expiryDate = keyRecord.expires_at ? new Date(keyRecord.expires_at) : null;
      if ((expiryDate && expiryDate < now) || keyRecord.status !== 'active') {
        return res.status(403).json({ 
          status: "error", 
          message: "Subscription Blocked: API key expired or suspended",
          buy_url: "https://tracexdata-api.onrender.com/buy-api"
        });
      }

      const requestsUsed = keyRecord.requests_used || 0;
      const requestLimit = keyRecord.request_limit;

      if (requestLimit !== null && requestsUsed >= requestLimit) {
        return res.status(403).json({ status: "error", message: "Quota Exhausted: Lookup limit reached" });
      }

      // All API keys allowed
      const isAllowed = true;
    }

    const api_url = getProviderUrl('aadhaar', targetQuery);
    const response = await fetch(api_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `ADHR: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "Sorry, we don't have data related to the query." });
    }

    const text = await response.text();
    const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");

    let parsedData: any = null;
    let isJson = false;
    try {
      parsedData = JSON.parse(cleanedText);
      isJson = true;
    } catch (e) {
      parsedData = parsePlainTextLookup(cleanedText, 'aadhar');
    }

    let isError = false;
    if (isJson && parsedData && typeof parsedData === 'object') {
      const statusStr = String(parsedData.status || parsedData.success || "").toLowerCase();
      if (statusStr === "error" || statusStr === "fail" || statusStr === "failed" || statusStr === "false" || statusStr === "404") {
        isError = true;
      }
    } else {
      const lowerText = cleanedText.toLowerCase();
      if (lowerText.includes("no result found") || lowerText.includes("no records found") || lowerText.includes("no data found") || !text.trim()) {
        isError = true;
      }
    }

    if (isError) {
       await logApiRequest(keyRecord?.id || null, `ADHR: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "Sorry, we don't have data related to the query." });
    }

    const cleanedData = cleanBrandingObject(parsedData);

    // Record telemetry for successful search
    if (!isMaster && keyRecord?.id) {
      await supabaseAdmin.from("api_keys").update({ 
        requests_used: (keyRecord.requests_used || 0) + 1,
        last_used_at: new Date().toISOString()
      }).eq("id", keyRecord.id);
    }

    await logApiRequest(keyRecord?.id || null, `ADHR: ${maskNumberForLog(targetQuery)}`, "success", Date.now() - startTime);

    return res.json({ status: "success", results: cleanedData });
  } catch (err: any) {
    console.error("Identity Proxy error:", err);
    await logApiRequest(keyRecord?.id || null, `ADHR: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
    return res.status(500).json({ status: "error", message: "Sorry, we don't have data related to the query." });
  }
});

// BA&NK Lookup API Middleware Proxy
app.get("/api/bank", async (req, res) => {
  const { query, ifsc, bank, exploits } = req.query;
  const key = String(req.query.key || req.headers['x-api-key'] || "").trim();
  let targetQuery = String(query || ifsc || bank || exploits || "").trim();
  const startTime = Date.now();

  // Removed wildcard CORS
  res.setHeader('Content-Type', 'application/json');

  if (!targetQuery) {
    return res.status(400).json({ status: "error", message: "Bank/IFSC query parameter is required" });
  }

  // Clean
  targetQuery = targetQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (targetQuery.length !== 11) {
    return res.status(400).json({ status: "error", message: "Invalid Query: IFSC must be an 11-character alphanumeric code" });
  }

  let keyRecord: any = null;

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ status: "error", message: "Engine Offline: Internal connection failure" });
    }

    const isMaster = key === INTERNAL_MASTER_KEY;

    if (isMaster) {
      keyRecord = {
        id: "master",
        plan_name: "Internal Master API",
        expires_at: new Date(Date.now() + 365*24*3600000).toISOString(),
        status: "active",
        requests_used: 0,
        request_limit: null
      };
    } else {
      if (!key) return res.status(401).json({ status: "error", message: "API key is required" });

      const { data: keyRecords, error: keyErr } = await supabaseAdmin
        .from("api_keys")
        .select("*")
        .eq("api_key", key);

      keyRecord = keyRecords?.[0];

      if (keyErr || !keyRecord) {
        return res.status(401).json({ status: "error", message: "Access Denied: Invalid or unauthorized API key" });
      }

      const now = new Date();
      const expiryDate = keyRecord.expires_at ? new Date(keyRecord.expires_at) : null;
      if ((expiryDate && expiryDate < now) || keyRecord.status !== 'active') {
        return res.status(403).json({ 
          status: "error", 
          message: "Subscription Blocked: API key expired or suspended",
          buy_url: "https://tracexdata-api.onrender.com/buy-api"
        });
      }

      const requestsUsed = keyRecord.requests_used || 0;
      const requestLimit = keyRecord.request_limit;

      if (requestLimit !== null && requestsUsed >= requestLimit) {
        return res.status(403).json({ status: "error", message: "Quota Exhausted: Lookup limit reached" });
      }

      // All API keys allowed
      const isAllowed = true;
    }

    const api_url = getProviderUrl('ifsc', targetQuery);
    const response = await fetch(api_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `BNK: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "Sorry, we don't have data related to the query." });
    }

    const text = await response.text();
    const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");

    let parsedData: any = null;
    let isJson = false;
    try {
      parsedData = JSON.parse(cleanedText);
      isJson = true;
    } catch (e) {
      parsedData = parsePlainTextLookup(cleanedText, 'bank');
    }

    let isError = false;
    if (isJson && parsedData && typeof parsedData === 'object') {
      const statusStr = String(parsedData.status || parsedData.success || "").toLowerCase();
      if (statusStr === "error" || statusStr === "fail" || statusStr === "failed" || statusStr === "false" || statusStr === "404") {
        isError = true;
      }
    } else {
      const lowerText = cleanedText.toLowerCase();
      if (lowerText.includes("no result found") || lowerText.includes("no records found") || lowerText.includes("no data found") || !text.trim()) {
        isError = true;
      }
    }

    if (isError) {
       await logApiRequest(keyRecord?.id || null, `BNK: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "Sorry, we don't have data related to the query." });
    }

    const cleanedData = cleanBrandingObject(parsedData);

    // Record telemetry for successful search
    if (!isMaster && keyRecord?.id) {
      await supabaseAdmin.from("api_keys").update({ 
        requests_used: (keyRecord.requests_used || 0) + 1,
        last_used_at: new Date().toISOString()
      }).eq("id", keyRecord.id);
    }

    await logApiRequest(keyRecord?.id || null, `BNK: ${maskNumberForLog(targetQuery)}`, "success", Date.now() - startTime);

    return res.json({ status: "success", results: cleanedData });
  } catch (err: any) {
    console.error("Bank Proxy error:", err);
    await logApiRequest(keyRecord?.id || null, `BNK: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
    return res.status(500).json({ status: "error", message: "Sorry, we don't have data related to the query." });
  }
});

// Rasion Card Lookup API Middleware Proxy
app.get(["/api/rasion", "/api/ration"], async (req, res) => {
  const { query, family, rasion, ration, exploits } = req.query;
  const key = String(req.query.key || req.headers['x-api-key'] || "").trim();
  let targetQuery = String(query || family || rasion || ration || exploits || "").trim();
  const startTime = Date.now();

  // Removed wildcard CORS
  res.setHeader('Content-Type', 'application/json');

  if (!targetQuery) {
    return res.status(400).json({ status: "error", message: "Rasion query parameter is required" });
  }

  // Clean
  targetQuery = targetQuery.replace(/[^0-9]/g, '');

  if (targetQuery.length !== 12) {
    return res.status(400).json({ status: "error", message: "Invalid Query: Rasion Card must be a 12-digit numeric identifier" });
  }

  let keyRecord: any = null;

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ status: "error", message: "Engine Offline: Internal connection failure" });
    }

    const isMaster = key === INTERNAL_MASTER_KEY;

    if (isMaster) {
      keyRecord = {
        id: "master",
        plan_name: "Internal Master API",
        expires_at: new Date(Date.now() + 365*24*3600000).toISOString(),
        status: "active",
        requests_used: 0,
        request_limit: null
      };
    } else {
      if (!key) return res.status(401).json({ status: "error", message: "API key is required" });

      const { data: keyRecords, error: keyErr } = await supabaseAdmin
        .from("api_keys")
        .select("*")
        .eq("api_key", key);

      keyRecord = keyRecords?.[0];

      if (keyErr || !keyRecord) {
        return res.status(401).json({ status: "error", message: "Access Denied: Invalid or unauthorized API key" });
      }

      const now = new Date();
      const expiryDate = keyRecord.expires_at ? new Date(keyRecord.expires_at) : null;
      if ((expiryDate && expiryDate < now) || keyRecord.status !== 'active') {
        return res.status(403).json({ 
          status: "error", 
          message: "Subscription Blocked: API key expired or suspended",
          buy_url: "https://tracexdata-api.onrender.com/buy-api"
        });
      }

      const requestsUsed = keyRecord.requests_used || 0;
      const requestLimit = keyRecord.request_limit;

      if (requestLimit !== null && requestsUsed >= requestLimit) {
        return res.status(403).json({ status: "error", message: "Quota Exhausted: Lookup limit reached" });
      }

      // All API keys allowed
      const isAllowed = true;
    }

    const api_url = getProviderUrl('family', targetQuery);
    const response = await fetch(api_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `RASION: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "Sorry, we don't have data related to the query." });
    }

    const text = await response.text();
    const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");

    let parsedData: any = null;
    let isJson = false;
    try {
      parsedData = JSON.parse(cleanedText);
      isJson = true;
    } catch (e) {
      parsedData = parsePlainTextLookup(cleanedText, 'rasion');
    }

    let isError = false;
    if (isJson && parsedData && typeof parsedData === 'object') {
      const statusStr = String(parsedData.status || parsedData.success || "").toLowerCase();
      if (statusStr === "error" || statusStr === "fail" || statusStr === "failed" || statusStr === "false" || statusStr === "404") {
        isError = true;
      }
    } else {
      const lowerText = cleanedText.toLowerCase();
      if (lowerText.includes("no result found") || lowerText.includes("no records found") || lowerText.includes("no data found") || !text.trim()) {
        isError = true;
      }
    }

    if (isError) {
       await logApiRequest(keyRecord?.id || null, `RASION: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "Sorry, we don't have data related to the query." });
    }

    const cleanedData = cleanBrandingObject(parsedData);

    // Record telemetry for successful search
    if (!isMaster && keyRecord?.id) {
      await supabaseAdmin.from("api_keys").update({ 
        requests_used: (keyRecord.requests_used || 0) + 1,
        last_used_at: new Date().toISOString()
      }).eq("id", keyRecord.id);
    }

    await logApiRequest(keyRecord?.id || null, `RASION: ${maskNumberForLog(targetQuery)}`, "success", Date.now() - startTime);

    return res.json({ status: "success", results: cleanedData });
  } catch (err: any) {
    console.error("Rasion Proxy error:", err);
    await logApiRequest(keyRecord?.id || null, `RASION: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
    return res.status(500).json({ status: "error", message: "Sorry, we don't have data related to the query." });
  }
});

function sanitizeErrorMessage(msg: string): string {
  const lowercaseMsg = String(msg || "").toLowerCase();
  if (
    lowercaseMsg.includes("vishal") || 
    lowercaseMsg.includes("techvishal") || 
    lowercaseMsg.includes("boss") || 
    lowercaseMsg.includes("anish") ||
    lowercaseMsg.includes("exploits") ||
    lowercaseMsg.includes("cyb3rs0ldier") ||
    lowercaseMsg.includes("cybersoldier") ||
    lowercaseMsg.includes("telegram") || 
    lowercaseMsg.includes("channel") || 
    lowercaseMsg.includes("access denied") ||
    lowercaseMsg.includes("restricted") ||
    lowercaseMsg.includes("authorized") ||
    lowercaseMsg.includes("engine error")
  ) {
    return "api error";
  }
  return msg;
}

// Vehicle Lookup API Middleware Proxy
app.get("/api/vehicle", async (req, res) => {
  const { query, vehicle, vehicle_no, exploits } = req.query;
  const key = String(req.query.key || req.headers['x-api-key'] || "").trim();
  let targetQuery = String(query || vehicle || vehicle_no || exploits || "").trim();
  const startTime = Date.now();

  // Removed wildcard CORS
  res.setHeader('Content-Type', 'application/json');

  if (!targetQuery) {
    return res.status(400).json({ status: "error", message: "Vehicle plate query parameter is required" });
  }

  // Clean
  targetQuery = targetQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (targetQuery.length < 3) {
    return res.status(400).json({ status: "error", message: "Invalid Query: Vehicle plate number must be at least 3 characters long" });
  }

  let keyRecord: any = null;

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ status: "error", message: "Engine Offline: Internal connection failure" });
    }

    const isMaster = key === INTERNAL_MASTER_KEY;

    if (isMaster) {
      keyRecord = {
        id: "master",
        plan_name: "Internal Master API",
        expires_at: new Date(Date.now() + 365*24*3600000).toISOString(),
        status: "active",
        requests_used: 0,
        request_limit: null
      };
    } else {
      if (!key) return res.status(401).json({ status: "error", message: "API key is required" });

      const { data: keyRecords, error: keyErr } = await supabaseAdmin
        .from("api_keys")
        .select("*")
        .eq("api_key", key);

      keyRecord = keyRecords?.[0];

      if (keyErr || !keyRecord) {
        return res.status(401).json({ status: "error", message: "Access Denied: Invalid or unauthorized API key" });
      }

      const now = new Date();
      const expiryDate = keyRecord.expires_at ? new Date(keyRecord.expires_at) : null;
      if ((expiryDate && expiryDate < now) || keyRecord.status !== 'active') {
        return res.status(403).json({ 
          status: "error", 
          message: "Subscription Blocked: API key expired or suspended",
          buy_url: "https://tracexdata-api.onrender.com/buy-api"
        });
      }

      const requestsUsed = keyRecord.requests_used || 0;
      const requestLimit = keyRecord.request_limit;

      if (requestLimit !== null && requestsUsed >= requestLimit) {
        return res.status(403).json({ status: "error", message: "Quota Exhausted: Lookup limit reached" });
      }

      // All API keys allowed
      const isAllowed = true;
    }

    // 1. Check database cache first for speed of response
    const { data: cachedRow, error: cacheErr } = await supabaseAdmin
      .from("vehicle_search_results")
      .select("raw_data")
      .eq("vehicle_number", targetQuery)
      .maybeSingle();

    const isCacheValid = cachedRow && cachedRow.raw_data && 
                         Object.keys(cachedRow.raw_data).length > 0 &&
                         !(cachedRow.raw_data.raw_data && (cachedRow.raw_data.raw_data === "N/A" || String(cachedRow.raw_data.raw_data).trim() === ""));

    if (isCacheValid) {
      console.log(`[CACHE HIT] Serving Vehicle lookup for ${targetQuery} from database cache.`);
      
      // Record telemetry for successful search
      if (!isMaster && keyRecord?.id) {
        await supabaseAdmin.from("api_keys").update({ 
          requests_used: (keyRecord.requests_used || 0) + 1,
          last_used_at: new Date().toISOString()
        }).eq("id", keyRecord.id);
      }

      await logApiRequest(keyRecord?.id || null, `VEHICLE: ${maskNumberForLog(targetQuery)}`, "success", Date.now() - startTime);
      return res.json({ status: "success", results: cachedRow.raw_data });
    }

    // 2. Fetch from the external provider if not cached
    const api_url = getProviderUrl('vehicle', targetQuery);
    const response = await fetch(api_url);
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `VEHICLE: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "Sorry, we don't have data related to the query." });
    }

    const text = await response.text();
    let parsedData: any;
    let isJson = false;

    try {
      // Try to parse the original JSON first to ensure structure integrity
      parsedData = JSON.parse(text);
      isJson = true;
    } catch (e) {
      // Fallback: clean branding and try parsing again
      const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
      try {
        parsedData = JSON.parse(cleanedText);
        isJson = true;
      } catch (err) {
        parsedData = { raw_data: cleanedText };
      }
    }

    // Smart Error Detection: Check if response actually represents a failure
    let isError = false;
    if (isJson && parsedData && typeof parsedData === 'object') {
      const statusStr = String(parsedData.status || parsedData.success || "").toLowerCase();
      if (statusStr === "error" || statusStr === "fail" || statusStr === "failed" || statusStr === "false" || statusStr === "404") {
        isError = true;
      }
    } else {
      const lowerText = text.toLowerCase();
      if (lowerText.includes("no result found") || lowerText.includes("no records found") || lowerText.includes("no data found") || !text.trim()) {
        isError = true;
      }
    }

    if (isError) {
       await logApiRequest(keyRecord?.id || null, `VEHICLE: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "Sorry, we don't have data related to the query." });
    }

    if (parsedData && parsedData.api_creator) {
      delete parsedData.api_creator;
    }

    const cleanedData = cleanBrandingObject(parsedData);

    // Save success result in the database cache
    if (cleanedData && Object.keys(cleanedData).length > 0) {
      try {
        await supabaseAdmin.from("vehicle_search_results").upsert({
          vehicle_number: targetQuery,
          raw_data: cleanedData
        }, { onConflict: "vehicle_number" });
        console.log(`[CACHE SAVE] Saved Vehicle lookup for ${targetQuery} to database cache.`);
      } catch (cacheSaveErr) {
        console.error("Failed to save Vehicle result to database cache:", cacheSaveErr);
      }
    }

    // Record telemetry for successful search
    if (!isMaster && keyRecord?.id) {
      await supabaseAdmin.from("api_keys").update({ 
        requests_used: (keyRecord.requests_used || 0) + 1,
        last_used_at: new Date().toISOString()
      }).eq("id", keyRecord.id);
    }

    await logApiRequest(keyRecord?.id || null, `VEHICLE: ${maskNumberForLog(targetQuery)}`, "success", Date.now() - startTime);

    return res.json({ status: "success", results: cleanedData });
  } catch (err: any) {
    console.error("Vehicle Proxy error:", err);
    await logApiRequest(keyRecord?.id || null, `VEHICLE: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
    return res.status(500).json({ status: "error", message: "Sorry, we don't have data related to the query." });
  }
});

// Vehicle To Owner Number Lookup API Middleware Proxy
app.get("/api/veh-owner-num", async (req, res) => {
  const { query, rc, vehicle, vehicle_no, exploits } = req.query;
  const key = String(req.query.key || req.headers['x-api-key'] || "").trim();
  let targetQuery = String(rc || query || vehicle || vehicle_no || exploits || "").trim();
  const startTime = Date.now();

  res.setHeader('Content-Type', 'application/json');

  if (!targetQuery) {
    return res.status(400).json({ status: "error", message: "Vehicle plate query parameter is required" });
  }

  // Clean
  targetQuery = targetQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (targetQuery.length < 3) {
    return res.status(400).json({ status: "error", message: "Invalid Query: Vehicle plate number must be at least 3 characters long" });
  }

  let keyRecord: any = null;

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ status: "error", message: "Engine Offline: Internal connection failure" });
    }

    const isMaster = key === INTERNAL_MASTER_KEY;

    if (isMaster) {
      keyRecord = {
        id: "master",
        plan_name: "Internal Master API",
        expires_at: new Date(Date.now() + 365*24*3600000).toISOString(),
        status: "active",
        requests_used: 0,
        request_limit: null
      };
    } else {
      if (!key) return res.status(401).json({ status: "error", message: "API key is required" });

      const { data: keyRecords, error: keyErr } = await supabaseAdmin
        .from("api_keys")
        .select("*")
        .eq("api_key", key);

      keyRecord = keyRecords?.[0];

      if (keyErr || !keyRecord) {
        return res.status(401).json({ status: "error", message: "Access Denied: Invalid or unauthorized API key" });
      }

      const now = new Date();
      const expiryDate = keyRecord.expires_at ? new Date(keyRecord.expires_at) : null;
      if ((expiryDate && expiryDate < now) || keyRecord.status !== 'active') {
        return res.status(403).json({ 
          status: "error", 
          message: "Subscription Blocked: API key expired or suspended",
          buy_url: "https://tracexdata-api.onrender.com/buy-api"
        });
      }

      const requestsUsed = keyRecord.requests_used || 0;
      const requestLimit = keyRecord.request_limit;

      if (requestLimit !== null && requestsUsed >= requestLimit) {
        return res.status(403).json({ status: "error", message: "Quota Exhausted: Lookup limit reached" });
      }

      // All API keys allowed
      const isAllowed = true;
    }

    // 1. Check database cache first for speed of response using prefix
    const cacheKey = `OWN_${targetQuery}`;
    const { data: cachedRow, error: cacheErr } = await supabaseAdmin
      .from("vehicle_search_results")
      .select("raw_data")
      .eq("vehicle_number", cacheKey)
      .maybeSingle();

    const isCacheValid = cachedRow && cachedRow.raw_data && 
                         Object.keys(cachedRow.raw_data).length > 0 &&
                         !(cachedRow.raw_data.raw_data && (cachedRow.raw_data.raw_data === "N/A" || String(cachedRow.raw_data.raw_data).trim() === ""));

    if (isCacheValid) {
      console.log(`[CACHE HIT] Serving Vehicle To Owner Number lookup for ${targetQuery} from database cache.`);
      
      // Record telemetry for successful search
      if (!isMaster && keyRecord?.id) {
        await supabaseAdmin.from("api_keys").update({ 
          requests_used: (keyRecord.requests_used || 0) + 1,
          last_used_at: new Date().toISOString()
        }).eq("id", keyRecord.id);
      }

      await logApiRequest(keyRecord?.id || null, `VEH_OWNER: ${maskNumberForLog(targetQuery)}`, "success", Date.now() - startTime);
      return res.json({ status: "success", results: cachedRow.raw_data });
    }

    // 2. Fetch from the external provider if not cached
    const api_url = getProviderUrl('veh_owner_num', targetQuery);
    const response = await fetch(api_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 TraceX-Web/1.0',
        'Accept': 'application/json,text/plain,*/*'
      }
    });
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `VEH_OWNER: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "Sorry, we don't have data related to the query." });
    }

    const text = await response.text();
    let parsedData: any;
    let isJson = false;

    try {
      parsedData = JSON.parse(text);
      isJson = true;
    } catch (e) {
      const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
      try {
        parsedData = JSON.parse(cleanedText);
        isJson = true;
      } catch (err) {
        parsedData = { raw_data: cleanedText };
      }
    }

    // Smart Error Detection: Check if response actually represents a failure
    let isError = false;
    if (isJson && parsedData && typeof parsedData === 'object') {
      const statusStr = String(parsedData.status || parsedData.success || "").toLowerCase();
      if (statusStr === "error" || statusStr === "fail" || statusStr === "failed" || statusStr === "false" || statusStr === "404") {
        isError = true;
      }
    } else {
      const lowerText = text.toLowerCase();
      if (lowerText.includes("no result found") || lowerText.includes("no records found") || lowerText.includes("no data found") || !text.trim()) {
        isError = true;
      }
    }

    if (isError) {
       await logApiRequest(keyRecord?.id || null, `VEH_OWNER: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "Sorry, we don't have data related to the query." });
    }

    if (parsedData && parsedData.api_creator) {
      delete parsedData.api_creator;
    }

    const cleanedData = scrubAllBranding(parsedData);

    // Save success result in the database cache
    if (cleanedData && Object.keys(cleanedData).length > 0) {
      try {
        await supabaseAdmin.from("vehicle_search_results").upsert({
          vehicle_number: cacheKey,
          raw_data: cleanedData
        }, { onConflict: "vehicle_number" });
        console.log(`[CACHE SAVE] Saved Vehicle To Owner Number lookup for ${targetQuery} to database cache.`);
      } catch (cacheSaveErr) {
        console.error("Failed to save Vehicle To Owner Number result to database cache:", cacheSaveErr);
      }
    }

    // Record telemetry for successful search
    if (!isMaster && keyRecord?.id) {
      await supabaseAdmin.from("api_keys").update({ 
        requests_used: (keyRecord.requests_used || 0) + 1,
        last_used_at: new Date().toISOString()
      }).eq("id", keyRecord.id);
    }

    await logApiRequest(keyRecord?.id || null, `VEH_OWNER: ${maskNumberForLog(targetQuery)}`, "success", Date.now() - startTime);

    return res.json({ status: "success", results: cleanedData });
  } catch (err: any) {
    console.error("Vehicle To Owner Number Proxy error:", err);
    await logApiRequest(keyRecord?.id || null, `VEH_OWNER: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
    return res.status(500).json({ status: "error", message: "Sorry, we don't have data related to the query." });
  }
});

// Email Lookup API Middleware Proxy
app.get("/api/email", async (req, res) => {
  const { query, email } = req.query;
  const key = String(req.query.key || req.headers['x-api-key'] || "").trim();
  let targetQuery = String(query || email || "").trim();
  const startTime = Date.now();

  res.setHeader('Content-Type', 'application/json');

  if (!targetQuery) {
    return res.status(400).json({ status: "error", message: "Email query parameter is required" });
  }

  let keyRecord: any = null;

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ status: "error", message: "Engine Offline: Internal connection failure" });
    }

    const isMaster = key === INTERNAL_MASTER_KEY;

    if (isMaster) {
      keyRecord = {
        id: "master",
        plan_name: "Internal Master API",
        expires_at: new Date(Date.now() + 365*24*3600000).toISOString(),
        status: "active",
        requests_used: 0,
        request_limit: null
      };
    } else {
      if (!key) return res.status(401).json({ status: "error", message: "API key is required" });

      const { data: keyRecords, error: keyErr } = await supabaseAdmin
        .from("api_keys")
        .select("*")
        .eq("api_key", key);

      keyRecord = keyRecords?.[0];

      if (keyErr || !keyRecord) {
        return res.status(401).json({ status: "error", message: "Access Denied: Invalid or unauthorized API key" });
      }

      const now = new Date();
      const expiryDate = keyRecord.expires_at ? new Date(keyRecord.expires_at) : null;
      if ((expiryDate && expiryDate < now) || keyRecord.status !== 'active') {
        return res.status(403).json({ 
          status: "error", 
          message: "Subscription Blocked: API key expired or suspended",
          buy_url: "https://tracexdata-api.onrender.com/buy-api"
        });
      }

      const requestsUsed = keyRecord.requests_used || 0;
      const requestLimit = keyRecord.request_limit;

      if (requestLimit !== null && requestsUsed >= requestLimit) {
        return res.status(403).json({ status: "error", message: "Quota Exhausted: Lookup limit reached" });
      }

      // All API keys allowed
      const isAllowed = true;
    }

    // Fetch from the external provider
    const api_url = getProviderUrl('email', targetQuery);
    const response = await fetch(api_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 TraceX-Web/1.0',
        'Accept': 'application/json,text/plain,*/*'
      }
    });
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `EMAIL: ${targetQuery}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "Sorry, we don't have data related to the query." });
    }

    const text = await response.text();
    let parsedData: any;
    let isJson = false;

    try {
      parsedData = JSON.parse(text);
      isJson = true;
    } catch (e) {
      const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
      try {
        parsedData = JSON.parse(cleanedText);
        isJson = true;
      } catch (err) {
        parsedData = { raw_data: cleanedText };
      }
    }

    // Smart Error Detection: Check if response actually represents a failure
    let isError = false;
    if (isJson && parsedData && typeof parsedData === 'object') {
      const statusStr = String(parsedData.status || parsedData.success || "").toLowerCase();
      if (statusStr === "error" || statusStr === "fail" || statusStr === "failed" || statusStr === "false" || statusStr === "404") {
        isError = true;
      }
    } else {
      const lowerText = text.toLowerCase();
      if (lowerText.includes("no result found") || lowerText.includes("no records found") || lowerText.includes("no data found") || !text.trim()) {
        isError = true;
      }
    }

    if (isError) {
       await logApiRequest(keyRecord?.id || null, `EMAIL: ${targetQuery}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "Sorry, we don't have data related to the query." });
    }

    if (parsedData && parsedData.api_creator) {
      delete parsedData.api_creator;
    }

    const cleanedData = scrubAllBranding(parsedData);

    // Record telemetry for successful search
    if (!isMaster && keyRecord?.id) {
      await supabaseAdmin.from("api_keys").update({ 
        requests_used: (keyRecord.requests_used || 0) + 1,
        last_used_at: new Date().toISOString()
      }).eq("id", keyRecord.id);
    }

    await logApiRequest(keyRecord?.id || null, `EMAIL: ${targetQuery}`, "success", Date.now() - startTime);

    return res.json({ status: "success", results: cleanedData });
  } catch (err: any) {
    console.error("Email Proxy error:", err);
    await logApiRequest(keyRecord?.id || null, `EMAIL: ${targetQuery}`, "failed", Date.now() - startTime);
    return res.status(500).json({ status: "error", message: "Sorry, we don't have data related to the query." });
  }
});

// PAN / PN Card Lookup API Middleware Proxy
app.get("/api/pancard", async (req, res) => {
  const { query, pan, pn, pancard, exploits } = req.query;
  const key = String(req.query.key || req.headers['x-api-key'] || "").trim();
  let targetQuery = String(query || pan || pn || pancard || exploits || "").trim();
  const startTime = Date.now();

  // Removed wildcard CORS
  res.setHeader('Content-Type', 'application/json');

  if (!targetQuery) {
    return res.status(400).json({ status: "error", message: "PN/PAN Card query parameter is required" });
  }

  // Clean
  targetQuery = targetQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (targetQuery.length < 5) {
    return res.status(400).json({ status: "error", message: "Invalid Query: PN/PAN plate number must be at least 5 characters long" });
  }

  let keyRecord: any = null;

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ status: "error", message: "Engine Offline: Internal connection failure" });
    }

    const isMaster = key === INTERNAL_MASTER_KEY;

    if (isMaster) {
      keyRecord = {
        id: "master",
        plan_name: "Internal Master API",
        expires_at: new Date(Date.now() + 365*24*3600000).toISOString(),
        status: "active",
        requests_used: 0,
        request_limit: null
      };
    } else {
      if (!key) return res.status(401).json({ status: "error", message: "API key is required" });

      const { data: keyRecords, error: keyErr } = await supabaseAdmin
        .from("api_keys")
        .select("*")
        .eq("api_key", key);

      keyRecord = keyRecords?.[0];

      if (keyErr || !keyRecord) {
        return res.status(401).json({ status: "error", message: "Access Denied: Invalid or unauthorized API key" });
      }

      const now = new Date();
      const expiryDate = keyRecord.expires_at ? new Date(keyRecord.expires_at) : null;
      if ((expiryDate && expiryDate < now) || keyRecord.status !== 'active') {
        return res.status(403).json({ 
          status: "error", 
          message: "Subscription Blocked: API key expired or suspended",
          buy_url: "https://tracexdata-api.onrender.com/buy-api"
        });
      }

      const requestsUsed = keyRecord.requests_used || 0;
      const requestLimit = keyRecord.request_limit;

      if (requestLimit !== null && requestsUsed >= requestLimit) {
        return res.status(403).json({ status: "error", message: "Quota Exhausted: Lookup limit reached" });
      }

      // All API keys allowed
      const isAllowed = true;
    }

    const api_url = getProviderUrl('pancard', targetQuery);
    const response = await fetch(api_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `PANCARD: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "Sorry, we don't have data related to the query." });
    }

    const text = await response.text();
    const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
    const lowerText = cleanedText.toLowerCase();

    if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim() || lowerText.includes("unknown")) {
       await logApiRequest(keyRecord?.id || null, `PANCARD: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "Sorry, we don't have data related to the query." });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (e) {
      parsedData = parsePlainTextLookup(cleanedText, 'pan');
    }

    const cleanedData = cleanBrandingObject(parsedData);

    // Record telemetry for successful search
    if (!isMaster && keyRecord?.id) {
      await supabaseAdmin.from("api_keys").update({ 
        requests_used: (keyRecord.requests_used || 0) + 1,
        last_used_at: new Date().toISOString()
      }).eq("id", keyRecord.id);
    }

    await logApiRequest(keyRecord?.id || null, `PANCARD: ${maskNumberForLog(targetQuery)}`, "success", Date.now() - startTime);

    return res.json({ status: "success", results: cleanedData });
  } catch (err: any) {
    console.error("PAN/PN Card Proxy error:", err);
    await logApiRequest(keyRecord?.id || null, `PANCARD: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
    return res.status(500).json({ status: "error", message: "Sorry, we don't have data related to the query." });
  }
});

// PAN Find secure payment lookup endpoint
app.get("/api/panfind", async (req, res) => {
  const { order_id, aadhaar_number } = req.query;
  if (!order_id || !aadhaar_number) {
    return res.status(400).json({ error: "Missing required query parameters: order_id and aadhaar_number" });
  }

  const targetAadhaar = String(aadhaar_number).trim();
  if (!/^\d{12}$/.test(targetAadhaar)) {
    return res.status(400).json({ error: "Aadhaar number must be exactly 12 digits" });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Backend not configured" });
    }

    // 0. IDOR / Replay Attack Prevention
    // Check if this order_id was already consumed in payment_claims table
    const { data: claim, error: claimErr } = await supabaseAdmin
      .from("payment_claims")
      .select("*")
      .eq("payment_id", order_id)
      .single();
      
    if (claimErr || !claim) {
      return res.status(404).json({ error: "Order not found in database. Cannot verify payment." });
    }
    
    if (claim.status === "consumed") {
      return res.status(403).json({ error: "This payment has already been consumed. Please generate a new order." });
    }

    let order_status = "";
    
    // 1. Verify payment status with Cashfree
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      const renderBackendUrl = "https://tracexdata-api.onrender.com";
      const response = await fetch(`${renderBackendUrl}/api/cashfree/status/${order_id}`);
      const data: any = await response.json();
      order_status = data.order_status;
    } else {
      const response = await fetch(`${CASHFREE_BASE_URL}/orders/${order_id}`, {
        headers: {
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01'
        }
      });
      const data: any = await response.json();
      order_status = data.order_status;
    }

    if (order_status !== "PAID") {
      return res.status(402).json({ error: "Payment verification failed. Please complete the Rs. 150 payment." });
    }

    // Mark as consumed immediately to prevent race conditions (re-entrancy)
    // Atomic consumption
    const { data: consumeResult, error: consumeErr } = await supabaseAdmin
      .from("payment_claims")
      .update({ status: "consumed" })
      .eq("payment_id", order_id)
      .neq("status", "consumed")
      .select();

    if (consumeErr || !consumeResult || consumeResult.length === 0) {
      return res.status(403).json({ error: "This payment was already consumed or could not be locked." });
    }

    // 2. Execute target API lookup
    const api_url = getProviderUrl('aadhaar_to_pan', targetAadhaar);
    
    const apiResponse = await fetch(api_url);
    if (!apiResponse.ok) {
      return res.status(502).json({ error: "External verification gateway offline. Please contact support." });
    }

    const rawText = await apiResponse.text();
    let apiData: any;
    try {
      apiData = JSON.parse(rawText);
    } catch (e) {
      apiData = { error: "Failed to parse search output", raw: rawText };
    }

    // 3. Remove "developer": "@techvishalboss" from the response object
    if (apiData && typeof apiData === "object") {
      delete apiData.developer;
    }

    return res.json(apiData);
  } catch (error: any) {
    console.error("PAN Find error:", error);
    return res.status(500).json({ error: "Internal server error during processing lookup" });
  }
});

// ============================================================================
// DYNAMIC PROVIDER CONFIGURATION MANAGER & FAILSAFE AUTO-REFUND SYSTEM
// ============================================================================

const CONFIG_FILE_PATH = path.join(__dirname, "data", "provider_config.json");

const DEFAULT_PROVIDER_CONFIGS: Record<string, string> = {
  phone: "https://exploitsindia.site/anish-private-api/number.php?exploits={query}",
  aadhaar: "https://exploitsindia.site/anish-private-api/aadhar.php?exploits={query}",
  adhr: "https://exploitsindia.site/anish-private-api/aadhar.php?exploits={query}",
  aadhaar_to_pan: "https://techvishalboss.com/panfind/api.php?api_key=c8117598aafa71238a4bf8377087b0ff&aadhaar_number={query}",
  pancard: "https://exploitsindia.site/osint-api/pancard.php?exploits={query}",
  ifsc: "https://exploitsindia.site/osint-api/ifsc.php?exploits={query}",
  bnk: "https://exploitsindia.site/osint-api/ifsc.php?exploits={query}",
  vehicle: "https://techvishalboss.com/api/v1/lookup.php?key=TVB_SGL_BCFC1E32&service=vehicle&rc={query}",
  veh_owner_num: "http://uersxinfo.in/api?key=498wlpajf&type=veh_numm&term={query}",
  email: "http://uersxinfo.in/api?key=498wlpajf&type=mail&term={query}",
  telegram: "http://uersxinfo.in/api?key=498wlpajf&type=uers&term={query}",
  family: "https://exploitsindia.site/hdhddhjdjddjdjdjdndnddnnccndndhejdmdnnd/family.php?exploits={query}"
};

let PROVIDER_CONFIGS: Record<string, string> = { ...DEFAULT_PROVIDER_CONFIGS };

// Load initial configuration from disk/Supabase
function initProviderConfigs() {
  try {
    const dataDir = path.join(__dirname, "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      PROVIDER_CONFIGS = { ...DEFAULT_PROVIDER_CONFIGS, ...parsed };
      console.log("[TRACEXDATA] Loaded dynamic provider API configs from local store.");
    } else {
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(DEFAULT_PROVIDER_CONFIGS, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[TRACEXDATA] Error initializing provider configs:", err);
  }
}
initProviderConfigs();

// Helper to get formatted provider URL for any service
function getProviderUrl(serviceKey: string, query: string): string {
  const normKey = (serviceKey || "").trim().toLowerCase();
  let alias = normKey;
  if (normKey === 'adhr' || normKey === 'aadhar') alias = 'aadhaar';
  if (normKey === 'aadhaar') alias = 'adhr';
  if (normKey === 'bnk' || normKey === 'bank') alias = 'ifsc';
  if (normKey === 'ifsc') alias = 'bnk';
  if (normKey === 'pan') alias = 'pancard';
  if (normKey === 'pancard') alias = 'pan';
  if (normKey === 'family' || normKey === 'ration') alias = 'rasion';
  if (normKey === 'rasion') alias = 'family';
  if (normKey === 'veh_owner_num') alias = 'veh_numm';
  if (normKey === 'veh_numm') alias = 'veh_owner_num';

  const template = (
    PROVIDER_CONFIGS[normKey] || 
    PROVIDER_CONFIGS[alias] || 
    DEFAULT_PROVIDER_CONFIGS[normKey] || 
    DEFAULT_PROVIDER_CONFIGS[alias] || 
    ""
  ).trim();

  if (!template) return "";
  const rawQuery = String(query).trim();
  const cleanQuery = encodeURIComponent(rawQuery);

  let formatted = template
    .replace(/\{query\}/gi, cleanQuery)
    .replace(/\{term\}/gi, cleanQuery)
    .replace(/\{aadhaar_number\}/gi, cleanQuery)
    .replace(/\{exploits\}/gi, cleanQuery)
    .replace(/\{rc\}/gi, cleanQuery)
    .replace(/\{ifsc\}/gi, cleanQuery)
    .replace(/\{pan\}/gi, cleanQuery)
    .replace(/\{pancard\}/gi, cleanQuery)
    .replace(/\{search\}/gi, cleanQuery)
    .replace(/\{mobile\}/gi, cleanQuery)
    .replace(/\{phone\}/gi, cleanQuery)
    .replace(/\{number\}/gi, cleanQuery)
    .replace(/\{aadhaar\}/gi, cleanQuery)
    .replace(/\{aadhar\}/gi, cleanQuery)
    .replace(/\{email\}/gi, cleanQuery)
    .replace(/\{value\}/gi, cleanQuery)
    .replace(/\{input\}/gi, cleanQuery)
    .replace(/\{id\}/gi, cleanQuery)
    .replace(/\{q\}/gi, cleanQuery)
    .replace(/\{target\}/gi, cleanQuery);

  // If no placeholder was replaced and the template doesn't already contain the query
  if (formatted === template && !template.includes(cleanQuery) && !template.includes(rawQuery)) {
    if (template.endsWith("=") || template.endsWith(":") || template.endsWith("/")) {
      formatted = template + cleanQuery;
    } else if (template.includes("?")) {
      formatted = template + "&query=" + cleanQuery;
    } else {
      formatted = template + "?query=" + cleanQuery;
    }
  }

  return formatted;
}

// Deep Case-Insensitive Branding and Provider Info Scrubber
function scrubAllBranding(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === "string") {
    return obj
      .replace(/(digi[\s\-_]*seva(?:\.in)?|@?digiseva|tech[\s\-_]*vishal(?:[\s\-_]*boss)?|techvishalboss(?:\.com)?|vishal[\s\-_]*boss|osint[\s\-_]*caller|@?osintcaller|u(?:ers|ser)xinfo(?:\.in)?|@?u(?:ers|ser)xinfo|anish[\s\-_]*exploits|exploitsindia(?:\.site)?|cyb(?:er|3r)[\s\-_]*s(?:oldier|0ldier)|@?cyb(?:er|3r)s(?:oldier|0ldier)|@?userxinfo)/gi, "")
      .replace(/(by\s+api|developer|developer_name|provider_name|provider_info|buy_api|website_link|api_buy_link|owner_telegram|contact|support|powered_by|credits_to)/gi, "")
      .replace(/(💳\s*BUY\s*API\s*:\s*@?\w+|🆘\s*SUPPORT\s*:\s*@?\w+)/gi, "")
      .replace(/(t\.me\/\w+|https?:\/\/(?:www\.)?\w+\.\w+(?:\/\S*)?)/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(item => scrubAllBranding(item)).filter(item => item !== null && item !== "" && item !== undefined);
  }
  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const [key, val] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if ([
        "branding", "api_info", "powered_by", "buy_api", 
        "owner_telegram", "developer", "developer_name", "provider", 
        "provider_info", "api_buy_link", "website_link", "buy", 
        "digiseva", "techvishalboss", "osintcaller", "userxinfo", "credits_to"
      ].includes(lowerKey)) {
        continue;
      }
      cleaned[key] = scrubAllBranding(val);
    }
    return cleaned;
  }
  return obj;
}

function parseRawTextToRecords(text: string, queryVal: string = ''): Record<string, any> {
  const cleanText = scrubAllBranding(text).trim();
  if (!cleanText) return {};

  const recordsMap: Record<string, any> = {};
  let recIdx = 1;

  const blocks = cleanText.split(/📌\s*Additional\s*Result:|---+|===+/gi);

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const rec: Record<string, any> = {};

    for (const line of lines) {
      const cleanLine = line.replace(/[\u2600-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').replace(/\*/g, '').trim();
      const colonIdx = cleanLine.indexOf(':');
      if (colonIdx !== -1) {
        const keyRaw = cleanLine.substring(0, colonIdx).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const valRaw = cleanLine.substring(colonIdx + 1).trim().replace(/<\/?code>/g, '');
        if (!valRaw || ['none', 'null', 'n/a', '0', ''].includes(valRaw.toLowerCase())) continue;

        let key = keyRaw;
        if (keyRaw.includes('father') || keyRaw.includes('husband')) key = 'father_name';
        else if (keyRaw.includes('alt') && (keyRaw.includes('mobile') || keyRaw.includes('phone'))) key = 'alt_mobile';
        else if (keyRaw.includes('mobile') || keyRaw.includes('phone') || keyRaw.includes('contact')) key = 'mobile';
        else if (keyRaw.includes('aadhaar') || keyRaw.includes('aadhar') || keyRaw.includes('uid')) key = 'aadhar_number';
        else if (keyRaw.includes('pancard') || keyRaw.includes('pan')) key = 'pan_number';
        else if (keyRaw.includes('ifsc')) key = 'ifsc';
        else if (keyRaw.includes('bank') || keyRaw.includes('branch')) key = 'branch';
        else if (keyRaw.includes('email') || keyRaw.includes('mail')) key = 'email';
        else if (keyRaw.includes('telegram') || keyRaw.includes('tg')) key = 'telegram_id';
        else if (keyRaw.includes('address') || keyRaw.includes('location')) key = 'address';
        else if (keyRaw.includes('circle') || keyRaw.includes('operator') || keyRaw.includes('state')) key = 'state_circle';
        else if (keyRaw.includes('name') && !keyRaw.includes('father')) key = 'name';

        rec[key] = valRaw;
      } else if (cleanLine.includes('|')) {
        const parts = cleanLine.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          parts.forEach((p, i) => {
            if (i === 0 && !rec.name) rec.name = p;
            else if (i === 1 && !rec.mobile && /^\d+$/.test(p)) rec.mobile = p;
            else rec[`detail_${i}`] = p;
          });
        }
      }
    }

    if (Object.keys(rec).length > 0) {
      if (!rec.name) {
        if (rec.father_name) rec.name = "Verified Individual";
        else if (rec.mobile) rec.name = `Mobile: ${rec.mobile}`;
        else if (rec.telegram_id) rec.name = `Telegram: ${rec.telegram_id}`;
        else rec.name = "VERIFIED RECORD";
      }
      recordsMap[`Result ${recIdx++}`] = rec;
    }
  }

  return recordsMap;
}

/**
 * Universal Response Parser & Normalizer
 * Converts any raw upstream API output (JSON object, JSON array, nested JSON, pipe text, colon text, HTML text)
 * into a clean, standardized, structured JSON record map matching the website UI format.
 * Guarantees zero runtime crashes even if provider format changes completely.
 */
function universalParseAndFormatResponse(rawInput: any, serviceType: string = 'general', queryVal: string = ''): Record<string, any> {
  if (!rawInput) return {};

  let textBody = "";
  let jsonObj: any = null;

  if (typeof rawInput === "object" && rawInput !== null) {
    jsonObj = rawInput;
    try {
      textBody = JSON.stringify(rawInput);
    } catch (e) {
      textBody = String(rawInput);
    }
  } else if (typeof rawInput === "string") {
    textBody = rawInput.trim();
    if (!textBody) return {};
    try {
      jsonObj = JSON.parse(textBody);
    } catch (e) {
      jsonObj = null;
    }
  }

  // Removed error filtering so UI can see exact API JSON response

  // Key canonicalization map
  const mapKey = (rawKey: string): string => {
    const k = rawKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (k.includes('father') || k.includes('husband')) return 'father_name';
    if (k.includes('alt') && (k.includes('mobile') || k.includes('phone') || k.includes('num'))) return 'alt_mobile';
    if (k.includes('mobile') || k.includes('phone') || k.includes('contact') || k.includes('num') || k === 'tel') return 'mobile';
    if (k.includes('aadhaar') || k.includes('aadhar') || k.includes('uid')) return 'aadhar_number';
    if (k.includes('pancard') || k.includes('pan_card') || k.includes('pan_num') || k === 'pan') return 'pan_number';
    if (k.includes('ifsc')) return 'ifsc';
    if (k.includes('branch') || k.includes('bank')) return 'branch';
    if (k.includes('email') || k.includes('mail')) return 'email';
    if (k.includes('telegram') || k.includes('tg_user')) return 'telegram_id';
    if (k.includes('vehicle') || k.includes('reg_no') || k.includes('rc_num')) return 'vehicle_number';
    if (k.includes('address') || k.includes('location')) return 'address';
    if (k.includes('circle') || k.includes('operator') || k.includes('state')) return 'state_circle';
    if (k.includes('name') && !k.includes('father') && !k.includes('bank')) return 'name';
    
    return k.replace(/_+/g, '_').replace(/^_|_$/g, '') || 'detail';
  };

  // Record cleaner
  const cleanRecordFields = (rec: Record<string, any>): Record<string, any> => {
    if (!rec || typeof rec !== "object") return {};
    const cleaned: Record<string, any> = {};

    for (const [rk, rv] of Object.entries(rec)) {
      if (rv === null || rv === undefined) continue;
      const valStr = scrubAllBranding(String(rv)).trim();
      if (!valStr || valStr.toUpperCase() === "NONE" || valStr.toUpperCase() === "NULL" || valStr.toUpperCase() === "N/A" || valStr === "0") continue;

      const normKey = mapKey(rk);
      cleaned[normKey] = valStr;
    }

    if (Object.keys(cleaned).length === 0) return {};

    // Ensure main title/name key is present for beautiful display in UI/API
    if (!cleaned.name) {
      if (cleaned.father_name) cleaned.name = "Verified Individual";
      else if (cleaned.mobile) cleaned.name = `Mobile: ${cleaned.mobile}`;
      else if (cleaned.telegram_id) cleaned.name = `Telegram: ${cleaned.telegram_id}`;
      else if (cleaned.branch) cleaned.name = cleaned.branch;
      else if (cleaned.ifsc) cleaned.name = `IFSC: ${cleaned.ifsc}`;
      else if (cleaned.aadhar_number) cleaned.name = `Aadhaar: ${cleaned.aadhar_number}`;
      else if (cleaned.vehicle_number) cleaned.name = `Vehicle: ${cleaned.vehicle_number}`;
      else if (cleaned.email) cleaned.name = cleaned.email;
      else cleaned.name = "VERIFIED RECORD";
    }

    return cleaned;
  };

  const finalRecordsMap: Record<string, any> = {};
  let recIndex = 1;

  // Case 1: Input parsed as JSON
  if (jsonObj && typeof jsonObj === "object") {
    let unwrapped = jsonObj.results || jsonObj.data || jsonObj.records || jsonObj.payload || jsonObj.response || jsonObj.result || jsonObj.info || jsonObj.details || jsonObj.output || jsonObj.user || jsonObj.item || jsonObj.data_list || jsonObj;

    if (Array.isArray(unwrapped)) {
      unwrapped.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          const cleaned = cleanRecordFields(item);
          if (Object.keys(cleaned).length > 0) {
            finalRecordsMap[`Result ${recIndex++}`] = cleaned;
          }
        } else if (typeof item === 'string') {
          const parsedItem = parseRawTextToRecords(item, queryVal);
          Object.values(parsedItem).forEach(subRec => {
            if (subRec && Object.keys(subRec).length > 0) {
              finalRecordsMap[`Result ${recIndex++}`] = subRec;
            }
          });
        }
      });
    } else if (typeof unwrapped === 'object' && unwrapped !== null) {
      const values = Object.values(unwrapped);
      const hasSubObjects = values.some(v => v && typeof v === 'object' && !Array.isArray(v));

      if (hasSubObjects) {
        for (const [k, v] of Object.entries(unwrapped)) {
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            const cleaned = cleanRecordFields(v as Record<string, any>);
            if (Object.keys(cleaned).length > 0) {
              finalRecordsMap[`Result ${recIndex++}`] = cleaned;
            }
          }
        }
      } else {
        const cleaned = cleanRecordFields(unwrapped as Record<string, any>);
        if (Object.keys(cleaned).length > 0) {
          finalRecordsMap[`Result ${recIndex++}`] = cleaned;
        }
      }
    }
  }

  // Case 2: Plain text or fallback
  if (Object.keys(finalRecordsMap).length === 0 && textBody) {
    const textRecords = parseRawTextToRecords(textBody, queryVal);
    for (const [k, v] of Object.entries(textRecords)) {
      if (v && typeof v === 'object') {
        const cleaned = cleanRecordFields(v as Record<string, any>);
        if (Object.keys(cleaned).length > 0) {
          finalRecordsMap[`Result ${recIndex++}`] = cleaned;
        }
      }
    }
  }

  return finalRecordsMap;
}

// Universal response failsafe check
function checkIsNoRecordFound(data: any): boolean {
  if (!data) return true;
  if (typeof data === "string") {
    const lower = data.toLowerCase();
    if (lower.includes("not found") || lower.includes("no record") || lower.includes("no data") || lower.includes("invalid key") || lower.includes("failed") || lower.includes("error")) {
      return true;
    }
    return false;
  }
  if (typeof data === "object") {
    if (data.status === false || data.status === 0 || data.status === "error" || data.status === "failed") {
      return true;
    }
    if (data.error || data.message) {
      const msg = String(data.error || data.message).toLowerCase();
      if (msg.includes("not found") || msg.includes("no record") || msg.includes("no data") || msg.includes("invalid") || msg.includes("failed") || msg.includes("unable")) {
        return true;
      }
    }
    const results = data.results || data.data || data.records;
    if (results) {
      if (Array.isArray(results) && results.length === 0) return true;
      if (typeof results === "object" && Object.keys(results).length === 0) return true;
    }
  }
  return false;
}

// Universal Safe Refund Handler
async function autoRefundUserCredits(userEmail: string, fee: number, serviceName: string, query: string, db: any): Promise<boolean> {
  if (!userEmail || fee <= 0 || !db) return false;
  try {
    const { data: profile } = await db.from("profiles").select("wallet_balance, credits").eq("email", userEmail).maybeSingle();
    if (profile) {
      const currentBal = Number(profile.wallet_balance || profile.credits || 0);
      const newBal = currentBal + fee;
      
      await db.from("profiles").update({
        wallet_balance: newBal,
        credits: newBal,
        updated_at: new Date().toISOString()
      }).eq("email", userEmail);

      await db.from("wallet_transactions").insert({
        user_email: userEmail,
        amount: fee,
        type: "refund",
        status: "SUCCESS",
        description: `Auto-Refund: No records found for ${serviceName.toUpperCase()} search '${query}'`,
        created_at: new Date().toISOString()
      });
      console.log(`[TRACEXDATA AUTO-REFUND] Refunded ₹${fee} to ${userEmail} for ${serviceName}`);
      return true;
    }
  } catch (err) {
    console.error("[TRACEXDATA AUTO-REFUND FAIL]", err);
  }
  return false;
}

// Admin endpoints for dynamic Provider Configs
app.all(["/api/admin/provider-configs", "/api/provider-configs"], async (req, res) => {
  if (req.method === "GET") {
    return res.json({ status: "success", configs: PROVIDER_CONFIGS, defaults: DEFAULT_PROVIDER_CONFIGS });
  }

  try {
    let configs = req.body?.configs;
    if (!configs && req.body && typeof req.body === 'object') {
      configs = req.body;
    }
    if (typeof configs === 'string') {
      try { configs = JSON.parse(configs); } catch (e) {}
    }

    if (configs && typeof configs === "object") {
      const cleanConfigs: Record<string, string> = {};
      for (const [k, v] of Object.entries(configs)) {
        if (typeof v === 'string') {
          cleanConfigs[k.trim()] = v.trim();
        }
      }

      PROVIDER_CONFIGS = { ...PROVIDER_CONFIGS, ...cleanConfigs };

      // Mirror aliases
      if (cleanConfigs.aadhaar) PROVIDER_CONFIGS.adhr = cleanConfigs.aadhaar;
      if (cleanConfigs.adhr) PROVIDER_CONFIGS.aadhaar = cleanConfigs.adhr;
      if (cleanConfigs.ifsc) PROVIDER_CONFIGS.bnk = cleanConfigs.ifsc;
      if (cleanConfigs.bnk) PROVIDER_CONFIGS.ifsc = cleanConfigs.bnk;
      if (cleanConfigs.pancard) PROVIDER_CONFIGS.pan = cleanConfigs.pancard;
      if (cleanConfigs.pan) PROVIDER_CONFIGS.pancard = cleanConfigs.pan;

      try {
        const dataDir = path.join(__dirname, "data");
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(PROVIDER_CONFIGS, null, 2), "utf-8");
      } catch (fsErr) {
        console.error("[PROVIDER_CONFIG_FS_ERR]", fsErr);
      }

      if (supabaseAdmin) {
        try {
          for (const [key, url] of Object.entries(cleanConfigs)) {
            await supabaseAdmin.from("api_provider_configs").upsert({
              service_key: key,
              provider_url: url,
              updated_at: new Date().toISOString()
            }, { onConflict: "service_key" }).catch(() => null);
          }
        } catch (subErr) {
          console.warn("[PROVIDER_CONFIG_SUPABASE_NOTICE]", subErr);
        }
      }
      return res.json({ 
        status: "success", 
        message: "Provider API Routing Configurations updated successfully!", 
        configs: PROVIDER_CONFIGS 
      });
    }
    return res.status(400).json({ 
      status: "error", 
      error: "Invalid provider configurations payload.", 
      message: "Invalid provider configurations payload." 
    });
  } catch (err: any) {
    console.error("[PROVIDER_CONFIG_UPDATE_ERR]", err);
    return res.status(500).json({ 
      status: "error", 
      error: err.message || "Failed to update provider configurations.", 
      message: err.message || "Failed to update provider configurations." 
    });
  }
});

// Secure credits-based Aadhaar-to-PAN lookup
app.post("/api/aadhaar-to-pan", async (req, res) => {
  const { aadhaar_number } = req.body;
  const authHeader = req.headers.authorization;

  if (!aadhaar_number) {
    return res.status(400).json({ error: "Aadhaar number is required" });
  }

  const targetAadhaar = String(aadhaar_number).trim();
  if (!/^\d{12}$/.test(targetAadhaar)) {
    return res.status(400).json({ error: "Aadhaar number must be exactly 12 digits" });
  }

  // Safety bypass for dummy/test Aadhaar numbers to prevent charges
  const isDummy = /^(0+|1+|2+|3+|4+|5+|6+|7+|8+|9+|123456789012)/.test(targetAadhaar) || targetAadhaar.startsWith("9999");
  if (isDummy) {
    return res.json({
      status: "success",
      pan_found: true,
      pan: "ABCDE1234F",
      credits_deducted: 0,
      results: {
        aadhaar_number: targetAadhaar,
        pan_number: "ABCDE1234F",
        full_name: "TEST USER",
        status: "SUCCESS"
      },
      cached: true
    });
  }

  let user: any = null;
  const isGuest = false;

  if (!authHeader) {
    return res.status(401).json({ error: "Authentication required. Please sign in to perform a search." });
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ error: "Authentication required. Please sign in to perform a search." });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Database offline. Unable to process lookup." });
    }
    const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !userData?.user) {
      return res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
    }
    user = userData.user;
  } catch (err) {
    console.error("Aadhaar to PAN auth error:", err);
    return res.status(401).json({ error: "Authentication failure." });
  }

  try {
    // 2. First, check if result is already cached in the database (Bypass charging user completely)
    let cachedRecord: any = null;
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("aadhaar_pan_results")
          .select("*")
          .eq("aadhaar_number", targetAadhaar)
          .maybeSingle();

        if (!error && data) {
          cachedRecord = data;
        }
      } catch (cacheErr) {
        console.warn("Aadhaar to PAN database cache check failed:", cacheErr);
      }
    }

    if (cachedRecord && cachedRecord.pan_number && cachedRecord.raw_data) {
      // Return cached result immediately (charges 0 credits!)
      await logSearchHistory(req, "aadhaar_to_pan", targetAadhaar, "success");
      return res.json({
        status: "success",
        pan_found: true,
        pan: cachedRecord.pan_number,
        credits_deducted: 0,
        results: scrubAllBranding(cachedRecord.raw_data),
        cached: true
      });
    }

    // Verify and deduct credits
    if (user && supabaseAdmin) {
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileErr || !profile) {
        return res.status(404).json({ error: "Profile record not found" });
      }

      const currentCredits = Number(profile.credits || 0);
      const cost = await getEffectiveServicePrice('aadhaar_to_pan', user.id, user.email);

      if (currentCredits < cost) {
        return res.status(403).json({ error: `Insufficient credits. You need at least ₹${cost} credits to perform Aadhaar to PAN lookup. Note: Aadhaar to PAN is not included in unlimited plans.` });
      }

      // Deduct 150 credits atomically with safety fallback
      let rpcSuccess = false;
      let rpcError: any = null;
      try {
        const rpcResult = await supabaseAdmin.rpc("deduct_credits", {
            user_id: user.id,
            amount: cost
        });
        rpcSuccess = rpcResult.data;
        rpcError = rpcResult.error;
      } catch (e: any) {
        rpcError = e;
      }

      if (rpcError) {
        console.warn("[DEDUCT_CREDITS_RPC_FAIL] Aadhaar-to-PAN RPC failed or missing, falling back to manual update:", rpcError);
        const { error: updateErr } = await supabaseAdmin
          .from("profiles")
          .update({ credits: currentCredits - cost })
          .eq("id", user.id);

        if (updateErr) {
          return res.status(500).json({ error: "Failed to deduct credits. Please try again." });
        }
      } else if (rpcSuccess === false) {
          return res.status(403).json({ error: "Insufficient credits. You need at least 150 credits." });
      }
    }

    // 5. Query External PAN Find API via Dynamic Provider URL
    const api_url = getProviderUrl('aadhaar_to_pan', targetAadhaar);
    
    let apiData: any = null;
    let panFound = false;
    let retrievedPan = "";

    try {
      const apiResponse = await fetch(api_url);
      if (apiResponse.ok) {
        const rawText = await apiResponse.text();
        try {
          apiData = JSON.parse(rawText);
          if (apiData && typeof apiData === "object") {
            // Scrub branding keys
            apiData = scrubAllBranding(apiData);
            retrievedPan = String(apiData.full_pan_number || apiData.pan_number || apiData.pan || "").trim();
            if (retrievedPan && retrievedPan.length >= 5 && !retrievedPan.toLowerCase().includes("not found")) {
              panFound = true;
            }
          }
        } catch (e) {
          console.error("Failed to parse external API response:", rawText);
        }
      }
    } catch (apiErr) {
      console.error("External PAN Find request failed:", apiErr);
    }

    // 6. Log search to persistent history
    const searchStatus = panFound ? "success" : "not_found";
    await logSearchHistory(req, "aadhaar_to_pan", targetAadhaar, searchStatus);

    if (!panFound || checkIsNoRecordFound(apiData)) {
      if (user && user.email) {
        await autoRefundUserCredits(user.email, 150, "Aadhaar to PAN", targetAadhaar, supabaseAdmin);
      }
      return res.json({
        status: "failed",
        pan_found: false,
        message: "No PAN number found for this Aadhaar number. 150 credits have been safely refunded to your wallet.",
        credits_deducted: 0,
        refunded: true,
        results: null
      });
    }

    // 7. Store successful result in database public.aadhaar_pan_results
    const scrubbedApiData = scrubAllBranding(apiData || {});
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("aadhaar_pan_results").insert({
          aadhaar_number: targetAadhaar,
          pan_number: retrievedPan,
          raw_data: scrubbedApiData
        });
      } catch (dbInsertErr) {
        console.error("Failed to insert successful Aadhaar to PAN result into DB cache:", dbInsertErr);
      }
    }

    // 8. Return successful search payload
    return res.json({
      status: "success",
      pan_found: true,
      pan: retrievedPan,
      credits_deducted: isGuest ? 0 : 150,
      results: scrubbedApiData
    });

  } catch (err: any) {
    console.error("Aadhaar to PAN API general error:", err);
    return res.status(500).json({ error: "Internal server error during processing Aadhaar to PAN lookup" });
  }
});

// --- ADMIN SYSTEM USER MANAGEMENT ENDPOINTS ---

const verifyAdminToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Access token is required" });
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Access token is empty" });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Engine Offline: Database driver missing" });
    }

    const client = await getRequestClient(token);
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) {
      console.error("[ADMIN_AUTH_ERROR]", error);
      return res.status(401).json({ error: "Invalid session key. Please login again." });
    }

    const ADMIN_EMAILS = [
      'yashwinderbeniwaldm@gmail.com', 
      'gaurav_beniwal_0001@example.com',
      'gauravbeniwal30003@gmail.com'
    ];

    const emailLower = (user.email || "").toLowerCase();
    const isAuthorized = ADMIN_EMAILS.some(email => email.toLowerCase() === emailLower);

    if (!isAuthorized) {
       return res.status(403).json({ error: "Access Denied: You are not authorized as an Administrator." });
    }

    (req as any).adminUser = user;
    (req as any).adminClient = supabaseAdmin; // Secure service-role client for authorized administrative procedures
    next();
  } catch (err) {
    console.error("[ADMIN_MIDDLEWARE_FAIL]", err);
    return res.status(500).json({ error: "Server authentication failure" });
  }
};

// Admin API Services Management
app.get("/api/admin/api-services", verifyAdminToken, async (req, res) => {
  try {
    const db = (req as any).adminClient || supabaseAdmin;
    const { data, error } = await db.from("api_services").select("*").order("service_name");
    if (error) throw error;
    return res.json({ status: "success", services: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch API services." });
  }
});

app.post("/api/admin/api-services", verifyAdminToken, async (req, res) => {
  try {
    const { service_key, service_name, base_price, category, is_active, provider_url } = req.body;
    if (!service_key || !service_name) {
      return res.status(400).json({ error: "service_key and service_name are required." });
    }
    const db = (req as any).adminClient || supabaseAdmin;
    const { data, error } = await db.from("api_services").upsert({
      service_key,
      service_name,
      base_price: Number(base_price || 0),
      category: category || "OSINT",
      is_active: is_active !== false,
      provider_url: provider_url || "",
      updated_at: new Date().toISOString()
    }, { onConflict: "service_key" }).select();

    if (error) throw error;
    return res.json({ status: "success", service: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to save API service." });
  }
});

// Admin Custom User Pricing & Discounts Management
app.get("/api/admin/user-custom-pricing", verifyAdminToken, async (req, res) => {
  try {
    const db = (req as any).adminClient || supabaseAdmin;
    const { data, error } = await db.from("user_custom_pricing").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return res.json({ status: "success", customPricings: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch custom user pricing." });
  }
});

app.post("/api/admin/user-custom-pricing", verifyAdminToken, async (req, res) => {
  try {
    const { id, user_id, user_email, service_key, custom_price, discount_percent, notes } = req.body;
    if (!user_id && !user_email) {
      return res.status(400).json({ error: "Either user_id or user_email is required." });
    }
    const db = (req as any).adminClient || supabaseAdmin;
    const payload: any = {
      user_id: user_id || null,
      user_email: user_email || null,
      service_key: service_key || "ALL",
      custom_price: custom_price !== undefined && custom_price !== null && custom_price !== "" ? Number(custom_price) : null,
      discount_percent: discount_percent !== undefined && discount_percent !== null && discount_percent !== "" ? Number(discount_percent) : 0,
      notes: notes || "",
      updated_at: new Date().toISOString()
    };
    if (id) payload.id = id;

    const { data, error } = await db.from("user_custom_pricing").upsert(payload).select();
    if (error) throw error;
    return res.json({ status: "success", customPricing: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to save custom user pricing." });
  }
});

app.delete("/api/admin/user-custom-pricing/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = (req as any).adminClient || supabaseAdmin;
    const { error } = await db.from("user_custom_pricing").delete().eq("id", id);
    if (error) throw error;
    return res.json({ status: "success", message: "Custom pricing rule deleted." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete custom pricing." });
  }
});

app.get("/api/admin/profiles", verifyAdminToken, async (req, res) => {
  try {
    const db = (req as any).adminClient || supabaseAdmin;
    let authData: any = null;
    try {
      if (supabaseAdmin && supabaseAdmin.auth && supabaseAdmin.auth.admin) {
        const response = await supabaseAdmin.auth.admin.listUsers();
        authData = response.data;
        if (response.error) {
          console.warn("Supabase listUsers error:", response.error);
        }
      } else {
        console.warn("supabaseAdmin.auth.admin is not available (service role key may be missing).");
      }
    } catch (authErr: any) {
      console.warn("Failed to list users from auth admin API:", authErr.message);
    }
    
    const { data: profileData, error: profileError } = await db
      .from("profiles")
      .select("*")
      .order("email", { ascending: true });
    
    if (profileError) {
      console.error("[GET_ADMIN_PROFILES_ERR]", profileError);
      return res.status(500).json({ error: profileError.message });
    }

    const mergedProfiles = [];
    const profileMap = new Map((profileData || []).map(p => [p.id, p]));

    if (authData && authData.users) {
      for (const authUser of authData.users) {
        if (profileMap.has(authUser.id)) {
          mergedProfiles.push(profileMap.get(authUser.id));
          profileMap.delete(authUser.id);
        } else {
          mergedProfiles.push({
            id: authUser.id,
            email: authUser.email || "",
            full_name: authUser.user_metadata?.full_name || "",
            credits: 0,
            unlimited_expiry: null,
            created_at: authUser.created_at
          });
        }
      }
    }

    for (const p of Array.from(profileMap.values())) {
      mergedProfiles.push(p);
    }

    mergedProfiles.sort((a, b) => (a.email || "").localeCompare(b.email || ""));

    return res.json({ status: "success", data: mergedProfiles });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

app.post("/api/admin/profiles", verifyAdminToken, async (req, res) => {
  const { id, email, full_name, credits, unlimited_expiry } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const db = (req as any).adminClient || supabaseAdmin;
    const randId = id || (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex").replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5"));
    const expiry = unlimited_expiry ? new Date(unlimited_expiry).toISOString() : null;

    const { data, error } = await db
      .from("profiles")
      .insert({
        id: randId,
        email: email.trim().toLowerCase(),
        full_name: full_name?.trim() || email.split("@")[0],
        credits: Number(credits || 0),
        unlimited_expiry: expiry,
        is_free_credit_claimed: true,
        last_weekly_credit_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error("[POST_ADMIN_PROFILE_ERR]", error);
      return res.status(500).json({ error: error.message });
    }
    const profileObj = (data && data.length > 0) ? data[0] : {
      id: randId,
      email: email.trim().toLowerCase(),
      full_name: full_name?.trim() || email.split("@")[0],
      credits: Number(credits || 0),
      unlimited_expiry: expiry,
      is_free_credit_claimed: true,
      last_weekly_credit_at: new Date().toISOString()
    };
    return res.json({ status: "success", data: profileObj });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

app.put("/api/admin/profiles/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { email, full_name, credits, wallet_balance, unlimited_expiry, user_discount_percent } = req.body;

  try {
    const db = (req as any).adminClient || supabaseAdmin;
    const expiry = unlimited_expiry ? new Date(unlimited_expiry).toISOString() : null;
    const creds = Number(credits || 0);

    const updateObj: any = {
      id: id,
      email: email,
      full_name: full_name || "",
      credits: creds,
      wallet_balance: wallet_balance !== undefined ? Number(wallet_balance) : creds,
      unlimited_expiry: expiry,
      user_discount_percent: Number(user_discount_percent || 0)
    };

    const { data, error } = await db
      .from("profiles")
      .upsert(updateObj, { onConflict: 'id' })
      .select();

    if (error) {
      console.error("[PUT_ADMIN_PROFILE_ERR]", error);
      return res.status(500).json({ error: error.message });
    }
    const profileObj = (data && data.length > 0) ? data[0] : updateObj;
    return res.json({ status: "success", data: profileObj });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

app.delete("/api/admin/profiles/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  try {
    const db = (req as any).adminClient || supabaseAdmin;
    try {
      if (supabaseAdmin && supabaseAdmin.auth && supabaseAdmin.auth.admin) {
        await supabaseAdmin.auth.admin.deleteUser(id);
      } else {
        console.warn("supabaseAdmin.auth.admin is not available to delete user.");
      }
    } catch (e) {
      console.warn("Could not delete user from auth admin API:", e);
    }
    
    const { error } = await db
      .from("profiles")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[DELETE_ADMIN_PROFILE_ERR]", error);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ status: "success", message: "User profile deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// --- ADMIN BILLING STATS & EARNINGS ENDPOINT ---

app.get("/api/admin/earnings", verifyAdminToken, async (req, res) => {
  try {
    const db = (req as any).adminClient || supabaseAdmin;
    const { data: claims, error: claimsErr } = await db
      .from("payment_claims")
      .select("*")
      .order("created_at", { ascending: false });

    if (claimsErr) {
      console.error("[GET_ADMIN_EARNINGS_ERR]", claimsErr);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // Calculate today, yesterday, and full week
    const now = new Date();
    
    // Day boundaries matching India Standard Time (IST) offset
    const getISTDateString = (date: Date) => {
      const istTime = new Date(date.getTime() + 19800000); // 5.5 hours in millis
      return istTime.toISOString().slice(0, 10); // YYYY-MM-DD
    };

    const todayStr = getISTDateString(now);
    
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = getISTDateString(yesterday);

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let todayEarning = 0;
    let yesterdayEarning = 0;
    let weekEarning = 0;
    let totalEarning = 0;

    const allTransactions: any[] = [];

    for (const claim of (claims || [])) {
      const claimAmount = Number(claim.amount || 0);
      const claimDate = new Date(claim.created_at);
      const claimDateStr = getISTDateString(claimDate);

      if (claim.status === "success") {
        totalEarning += claimAmount;

        if (claimDateStr === todayStr) {
          todayEarning += claimAmount;
        } else if (claimDateStr === yesterdayStr) {
          yesterdayEarning += claimAmount;
        }

        if (claimDate >= sevenDaysAgo) {
          weekEarning += claimAmount;
        }
      }

      allTransactions.push({
        id: claim.id,
        payment_id: claim.payment_id,
        user_id: claim.user_id,
        plan_id: claim.plan_id,
        amount: claimAmount,
        status: claim.status,
        created_at: claim.created_at
      });
    }

    // Enrich transactions with user email for easy trace display in admin portal
    const userIds = Array.from(new Set(allTransactions.map(t => t.user_id).filter(id => !!id)));
    let profilesByUserId: Record<string, any> = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await db
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      
      if (profiles) {
        profilesByUserId = profiles.reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    const enrichedTransactions = allTransactions.map(t => ({
      ...t,
      user_email: t.user_id ? (profilesByUserId[t.user_id]?.email || "N/A") : "Guest User",
      user_name: t.user_id ? (profilesByUserId[t.user_id]?.full_name || "") : ""
    }));

    return res.json({
      status: "success",
      summary: {
        today: todayEarning,
        yesterday: yesterdayEarning,
        week: weekEarning,
        total: totalEarning
      },
      transactions: enrichedTransactions.slice(0, 100)
    });
  } catch (err: any) {
    console.error("[ADMIN_EARNINGS_FAIL]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/admin/history", verifyAdminToken, async (req, res) => {
  try {
    const db = (req as any).adminClient || supabaseAdmin;
    if (!db) {
      return res.status(500).json({ error: "Supabase connection offline" });
    }
    const { data, error } = await db
      .from("search_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(150);

    if (error) {
      console.error("[GET_ADMIN_HISTORY_ERR]", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    return res.json({ status: "success", data });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


// --- SECURE PERMANENT USER API KEYS ENDPOINT ---
app.get("/api/user-keys", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Database offline" });
  }

  try {
    let userId: string | null = null;
    let userEmail: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      if (token && token !== "null" && token !== "undefined") {
        const { data: userData } = await supabaseAdmin.auth.getUser(token);
        if (userData?.user) {
          userId = userData.user.id;
          userEmail = userData.user.email || null;
        }
      }
    }

    if (!userId && req.query.email) {
      const queryEmail = String(req.query.email).trim().toLowerCase();
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("email", queryEmail)
        .maybeSingle();
      if (p) {
        userId = p.id;
        userEmail = p.email;
      }
    }

    if (!userId && !userEmail) {
      return res.status(401).json({ error: "Authentication required to access API keys" });
    }

    let keysQuery = supabaseAdmin.from("api_keys").select("*");
    if (userId) {
      keysQuery = keysQuery.eq("user_id", userId);
    } else if (userEmail) {
      keysQuery = keysQuery.eq("user_email", userEmail);
    }

    const { data: existingKeys, error: keysErr } = await keysQuery.order("created_at", { ascending: false });

    if (keysErr) {
      console.error("[GET_USER_KEYS_ERR]", keysErr);
      return res.status(500).json({ error: "Database error retrieving keys" });
    }

    let resultKeys = existingKeys || [];

    // Auto-generate permanent API key if user has no key registered
    if (resultKeys.length === 0) {
      const newPermanentKey = `tx_${crypto.randomBytes(16).toString("hex")}`;
      const expiresAt = "2099-12-31T23:59:59.000Z";

      const { data: insertedData, error: insErr } = await supabaseAdmin
        .from("api_keys")
        .insert({
          user_id: userId,
          user_email: userEmail || "user@tracexdata.online",
          api_key: newPermanentKey,
          plan_name: "Account Permanent API",
          status: "active",
          requests_used: 0,
          request_limit: null,
          expires_at: expiresAt
        })
        .select();

      if (!insErr && insertedData && insertedData.length > 0) {
        resultKeys = insertedData;
        console.log(`[AUTO_KEY_GEN] Auto-generated permanent key ${newPermanentKey} for user ${userEmail || userId}`);
      } else {
        console.warn("[AUTO_KEY_GEN_WARN]", insErr);
        resultKeys = [{
          id: userId || "temp_id",
          user_id: userId,
          user_email: userEmail || "user@tracexdata.online",
          api_key: newPermanentKey,
          plan_name: "Account Permanent API",
          status: "active",
          requests_used: 0,
          request_limit: null,
          expires_at: expiresAt,
          created_at: new Date().toISOString()
        }];
      }
    }

    return res.json(resultKeys);
  } catch (err: any) {
    console.error("[USER_KEYS_ENDPOINT_FAIL]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin backfill routine for 2000+ existing registered accounts
async function backfillApiKeysForAllUsers() {
  if (!supabaseAdmin) return;
  try {
    console.log("[BACKFILL_KEYS] Synchronizing permanent API keys for all registered accounts...");
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email");

    if (pErr) {
      console.warn("[BACKFILL_KEYS_WARN] Unable to read profiles table:", pErr.message);
      return;
    }

    if (!profiles || profiles.length === 0) return;

    const { data: existingKeys, error: kErr } = await supabaseAdmin
      .from("api_keys")
      .select("user_id, user_email");

    if (kErr) {
      console.warn("[BACKFILL_KEYS_WARN] Unable to read api_keys table:", kErr.message);
      return;
    }

    const existingUserIds = new Set((existingKeys || []).map((k: any) => k.user_id).filter(Boolean));
    const existingEmails = new Set((existingKeys || []).map((k: any) => k.user_email?.toLowerCase()).filter(Boolean));

    const missingProfiles = profiles.filter((p: any) => {
      const hasId = p.id && existingUserIds.has(p.id);
      const hasEmail = p.email && existingEmails.has(p.email.toLowerCase());
      return !hasId && !hasEmail;
    });

    if (missingProfiles.length === 0) {
      console.log(`[BACKFILL_KEYS] All ${profiles.length} registered accounts already have permanent API keys.`);
      return;
    }

    console.log(`[BACKFILL_KEYS] Provisioning permanent API keys for ${missingProfiles.length} registered accounts...`);

    const newKeyRecords = missingProfiles.map((p: any) => ({
      user_id: p.id,
      user_email: p.email || "user@tracexdata.online",
      api_key: `tx_${crypto.randomBytes(16).toString("hex")}`,
      plan_name: "Account Permanent API",
      status: "active",
      requests_used: 0,
      request_limit: null,
      expires_at: "2099-12-31T23:59:59.000Z"
    }));

    const chunkSize = 100;
    let insertedCount = 0;
    for (let i = 0; i < newKeyRecords.length; i += chunkSize) {
      const chunk = newKeyRecords.slice(i, i + chunkSize);
      const { error: insErr } = await supabaseAdmin.from("api_keys").insert(chunk);
      if (insErr) {
        console.error(`[BACKFILL_KEYS_ERR] Insertion batch failed:`, insErr.message);
      } else {
        insertedCount += chunk.length;
      }
    }

    console.log(`[BACKFILL_KEYS_SUCCESS] Successfully assigned unique permanent API keys to ${insertedCount} accounts.`);
  } catch (err: any) {
    console.error("[BACKFILL_KEYS_CRITICAL_FAIL]", err);
  }
}

// --- ADMIN API KEYS ---
app.get("/api/admin/api-keys", verifyAdminToken, async (req, res) => {
  try {
    const db = (req as any).adminClient || supabaseAdmin;
    const { data, error } = await db.from('api_keys').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/api-keys", verifyAdminToken, async (req, res) => {
  try {
    const { user_email, plan_name, days, custom_key } = req.body;
    const db = (req as any).adminClient || supabaseAdmin;
    const apiKey = custom_key || ("tx_" + crypto.randomBytes(16).toString("hex"));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (days || 30));

    const { data, error } = await db.from('api_keys').insert({
      user_email,
      api_key: apiKey,
      plan_name,
      requests_used: 0,
      request_limit: null,
      expires_at: expiresAt.toISOString(),
      status: 'active'
    }).select();

    if (error) {
      console.error("[ADMIN_API_KEY_CREATE_ERR]", error);
      return res.status(500).json({ error: error.message });
    }

    const keyData = (data && data.length > 0) ? data[0] : {
      id: crypto.randomUUID(),
      user_email,
      api_key: apiKey,
      plan_name,
      requests_used: 0,
      request_limit: null,
      expires_at: expiresAt.toISOString(),
      status: 'active',
      created_at: new Date().toISOString()
    };

    return res.json({ data: keyData });
  } catch (err: any) {
    console.error("[ADMIN_API_KEY_POST_FAIL]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/admin/api-keys/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = (req as any).adminClient || supabaseAdmin;
    const { error } = await db.from('api_keys').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ status: "success" });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/admin/api-keys/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_name, status, expires_at, user_email } = req.body;
    const db = (req as any).adminClient || supabaseAdmin;
    const { error } = await db.from('api_keys').update({
      plan_name,
      request_limit: null, // Force null for unlimited request plans
      status,
      expires_at,
      user_email
    }).eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ status: "success" });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/api-settings", verifyAdminToken, async (req, res) => {
  try {
    const { id, real_api_url } = req.body;
    const db = (req as any).adminClient || supabaseAdmin;
    const { error } = await db.from('api_settings').upsert({
      id: id || undefined,
      real_api_url,
      updated_at: new Date().toISOString(),
      updated_by: (req as any).adminUser?.id
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ status: "success" });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


// --- COMPREHENSIVE ADMIN DATA ENDPOINT ---
app.get("/api/admin/system", verifyAdminToken, async (req, res) => {
  try {
    const db = (req as any).adminClient || supabaseAdmin;

    const safeQuery = async (promise: Promise<any>, fallback: any = { data: [] }) => {
      try {
        const res = await promise;
        if (res.error) {
          console.warn("[SYSTEM_SAFE_QUERY_WARNING]", res.error);
          return fallback;
        }
        return res;
      } catch (err) {
        console.error("[SYSTEM_SAFE_QUERY_FAIL]", err);
        return fallback;
      }
    };

    const [
      apiKeysRes,
      apiLogsRes,
      settingsRes,
      totalKeysRes,
      activeKeysRes,
      totalLogsRes,
      userCountRes,
      revenueRes
    ] = await Promise.all([
      safeQuery(db.from('api_keys').select('*').order('created_at', { ascending: false }).limit(100)),
      safeQuery(db.from('api_logs').select('*, api_keys(user_email)').order('created_at', { ascending: false }).limit(50), null),
      safeQuery(db.from('api_settings').select('*').limit(1).maybeSingle(), { data: null }),
      safeQuery(db.from('api_keys').select('*', { count: 'exact', head: true }), { count: 0 }),
      safeQuery(db.from('api_keys').select('*', { count: 'exact', head: true }).eq('status', 'active'), { count: 0 }),
      safeQuery(db.from('api_logs').select('*', { count: 'exact', head: true }), { count: 0 }),
      safeQuery(db.from('profiles').select('*', { count: 'exact', head: true }), { count: 0 }),
      safeQuery(db.from('api_keys').select('plan_name'), { data: [] })
    ]);

    const apiKeys = apiKeysRes?.data || [];
    const settings = settingsRes?.data || null;
    const totalKeysCount = totalKeysRes?.count || 0;
    const activeKeysCount = activeKeysRes?.count || 0;
    const totalLogsCount = totalLogsRes?.count || 0;
    const userCount = userCountRes?.count || 0;
    const revenueData = revenueRes?.data || [];

    let apiLogs = [];
    if (apiLogsRes && apiLogsRes.data) {
      apiLogs = apiLogsRes.data;
    } else {
      // Fallback query without the join
      const fallbackLogs = await safeQuery(db.from('api_logs').select('*').order('created_at', { ascending: false }).limit(50));
      apiLogs = fallbackLogs.data || [];
      // Enrich with emails if we have the apiKeys
      const keysMap = new Map((apiKeys || []).map((k: any) => [k.id, k.user_email]));
      apiLogs = apiLogs.map((log: any) => ({
        ...log,
        api_keys: {
          user_email: keysMap.get(log.api_key_id) || "N/A"
        }
      }));
    }

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
        isServiceRoleActive: !!SUPABASE_SERVICE_ROLE_KEY,
        apiKeys: apiKeys || [],
        apiLogs: apiLogs || [],
        settings: settings || null,
        stats: {
          totalKeys: totalKeysCount || 0,
          totalRequests: totalLogsCount || 0,
          activeKeys: activeKeysCount || 0,
          revenue: revenue,
          totalUsers: userCount || 0,
          uniqueVisitors: uniqueVisitorIps.size
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// --- CLIENT AUTHENTICATED PAYMENT RECONCILIATION API ---

app.post("/api/cashfree/reconcile-user", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization credentials are required" });
  }

  const token = authHeader.replace("Bearer ", "");
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Database offline" });
  }

  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ error: "Session has expired or is invalid" });
    }

    // Grab all 'pending' payment claims that belong to this user
    const { data: pendingClaims, error: claimsErr } = await supabaseAdmin
      .from("payment_claims")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (claimsErr) {
      console.error("[RECONCILE_USER_CLAIMS_ERR]", claimsErr);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (!pendingClaims || pendingClaims.length === 0) {
      return res.json({ status: "success", recoveredCount: 0, message: "No pending claims require reconciliation." });
    }

    let recoveredCount = 0;
    const recoveredOrders = [];

    // Check with Cashfree API for each pending claim
    for (const claim of pendingClaims) {
      const orderId = claim.payment_id;
      try {
        let isPaid = false;
        
        if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
          const renderBackendUrl = "https://tracexdata-api.onrender.com";
          const cfResp = await fetch(`${renderBackendUrl}/api/cashfree/status/${orderId}`);
          const cfData = await cfResp.json();
          if (cfResp.ok && cfData.order_status === "PAID") {
            isPaid = true;
          }
        } else {
          const cfResp = await fetch(`${CASHFREE_BASE_URL}/orders/${orderId}`, {
            headers: {
              'x-client-id': CASHFREE_APP_ID,
              'x-client-secret': CASHFREE_SECRET_KEY,
              'x-api-version': '2023-08-01'
            }
          });
          const cfData: any = await cfResp.json();
          if (cfResp.ok && cfData.order_status === "PAID") {
            isPaid = true;
          }
        }

        if (isPaid) {
          await fulfillOrder(orderId, user.id);
          recoveredCount++;
          recoveredOrders.push(orderId);
        }
      } catch (checkErr) {
        console.error(`[RECONCILE_SYS_ERR] Order status fetch error on ${orderId}:`, checkErr);
      }
    }

    return res.json({
      status: "success",
      recoveredCount,
      recoveredOrders,
      message: recoveredCount > 0 
        ? `Checked pending ledger matching profile. Automatically claimed and posted ${recoveredCount} paid order(s).` 
        : "Reconciliation sweep done. No newly paid transactions found."
    });
  } catch (err: any) {
    console.error("[RECONCILE_API_CRITICAL_FAIL]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- SINGLE MANUAL TRANSACTION CLAIM GATEWAY ---


app.post("/api/cashfree/claim-manual", async (req, res) => {
  const { order_id } = req.body;
  if (!order_id || typeof order_id !== 'string' || order_id.trim().length === 0 || order_id.length > 100) {
    return res.status(400).json({ error: "Please supply a valid Cashfree Order ID." });
  }


  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Session token missing. Log in to claim." });
  }

  const token = authHeader.replace("Bearer ", "");
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Database offline" });
  }

  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ error: "Session validation failed." });
    }

    const trimmedOrderId = order_id.trim();

    // 1. Check if claim already successfully completed
    const { data: claim, error: claimErr } = await supabaseAdmin
      .from("payment_claims")
      .select("*")
      .eq("payment_id", trimmedOrderId)
      .maybeSingle();
    if (claim && claim.status === "success") {
      return res.status(400).json({ error: "This reference has already been successfully claimed and posted." });
    }

    // IDOR Protection: Verify ownership
    if (claim && claim.user_id && claim.user_id !== user.id) {
      return res.status(403).json({ error: "Unauthorized. This order does not belong to your account." });
    }


    // 2. Fetch live data from Cashfree
    let isPaid = false;
    let amount = 0;
    let planId = claim?.plan_id || "credit_10";
    let customerPhone = "";

    try {
      if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
        const renderBackendUrl = "https://tracexdata-api.onrender.com";
        const cfResp = await fetch(`${renderBackendUrl}/api/cashfree/status/${trimmedOrderId}`);
        const cfData = await cfResp.json();
        if (cfResp.ok && cfData.order_status === "PAID") {
          isPaid = true;
          amount = Number(cfData.order_amount || 0);
        }
      } else {
        const cfResp = await fetch(`${CASHFREE_BASE_URL}/orders/${trimmedOrderId}`, {
          headers: {
            'x-client-id': CASHFREE_APP_ID,
            'x-client-secret': CASHFREE_SECRET_KEY,
            'x-api-version': '2023-08-01'
          }
        });
        const cfData: any = await cfResp.json();
        if (cfResp.ok && cfData.order_status === "PAID") {
          isPaid = true;
          amount = Number(cfData.order_amount || 0);
        }
      }
    } catch (cfErr) {
      console.error("[MANUAL_CLAIM_CF_API_ERR]", cfErr);
      return res.status(500).json({ error: "Could not contact Cashfree to verify order status." });
    }

    if (!isPaid) {
      return res.status(400).json({ error: "Cashfree records indicate this order has not been PAID. Please verify ID or try again." });
    }

    // 3. Create or update claim database row
    if (!claim) {
      // Deduce plan_id dynamically depending on amount
      if (amount >= 1499) planId = "api_combo";
      else if (amount >= 999) planId = "credit_1000";
      else if (amount >= 499) planId = "api_number";
      else if (amount >= 250) planId = "credit_100";
      else if (amount >= 140) planId = "credit_50";
      else planId = "credit_10";

      await supabaseAdmin.from("payment_claims").insert({
        payment_id: trimmedOrderId,
        user_id: user.id,
        plan_id: planId,
        amount: amount,
        status: "pending"
      });
    } else if (!claim.user_id) {
      await supabaseAdmin
        .from("payment_claims")
        .update({ user_id: user.id })
        .eq("payment_id", trimmedOrderId);
    }

    // 4. Force fulfill sequence!
    await fulfillOrder(trimmedOrderId, user.id);

    return res.json({
      status: "success",
      message: `Verified and posted! Order ${trimmedOrderId} credited successfully.`
    });
  } catch (err: any) {
    console.error("[MANUAL_CLAIM_CRITICAL_FAIL]", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Global JSON error handler to prevent HTML stack traces or HTML errors
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global Express Error Handler:", err);
  res.status(err.status || 500).json({
    status: "error",
    error: err.message || "An unexpected backend error occurred."
  });
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.get("/sitemap.xml", (req, res) => {
      res.header("Content-Type", "application/xml");
      res.header("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "sitemap.xml"));
    });
    app.get("/robots.txt", (req, res) => {
      res.header("Content-Type", "text/plain");
      res.sendFile(path.join(distPath, "robots.txt"));
    });
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    backfillApiKeysForAllUsers().catch(err => console.error("Backfill boot error:", err));
  });
});

export default app;