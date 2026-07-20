import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

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
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per minute
  message: { error: 'Too many requests!' }
});
app.use('/api/user-lookup', searchLimiter);
app.use('/api/lookup', searchLimiter);
app.use('/api/aadhaar-to-pan', searchLimiter);
app.use('/api/panfind', searchLimiter);
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 sensitive requests per hour
  message: { error: "Too many sensitive requests from this IP, please try again later." },
});
app.use('/api/cashfree', sensitiveLimiter);
app.use('/api/admin', sensitiveLimiter);

// Strict JSON parsing
app.use(express.json({ limit: '10kb' }));


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

async function logSearchHistory(req: express.Request, searchType: string, query: string, status: string, passedClient?: any) {
  const db = passedClient || supabaseAdmin;
  if (!db) return;
  try {
    let userId: string | null = null;
    let userEmail: string | null = null;

    // 1. Try to get user from Authorization token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      if (token) {
        try {
          const client = passedClient || await getRequestClient(token);
          const { data: { user } } = await client.auth.getUser(token);
          if (user) {
            userId = user.id;
            userEmail = user.email || null;
          }
        } catch (authErr) {
          console.warn("Auth token resolve error in logSearchHistory:", authErr);
        }
      }
    }

    // 2. If no user from token, check if there's an api key
    if (!userId) {
      const key = String(req.query.key || req.body.key || "").trim();
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

    // Insert into search_history
    await db.from("search_history").insert({
      user_id: userId,
      user_email: userEmail || "Guest User",
      search_type: searchType,
      query: query,
      status: status
    });
  } catch (err) {
    console.error("Failed to write search_history:", err);
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
      filteredItem.name = (item.name || "Telegram Registered Profile").toString().toUpperCase();
      filteredItem.telegram_id = item.telegram_id || query;
      filteredItem.username = item.username || "N/A";
      filteredItem.mobile = item.mobile || "N/A";
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

  return {
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
      const cleanedKey = key.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "info");
      cleaned[cleanedKey] = cleanBrandingObject(obj[key]);
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

    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
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
      return res.status(200).json({
        status: "success",
        results: { error: "Authentication required. Please sign in to perform a search." }
      });
    }

    client = await getRequestClient(token);
    if (!client) {
      return res.status(200).json({
        status: "success",
        results: { error: "Database offline. Unable to process lookup." }
      });
    }

    const { data: userData, error: authErr } = await client.auth.getUser(token);
    user = userData?.user;
    if (authErr || !user) {
      return res.status(200).json({
        status: "success",
        results: { error: "Invalid or expired session. Please sign in again." }
      });
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

  let creditCost = 2;
  if (service === 'telegram') {
    creditCost = 8;
  } else if (service === 'adhr') {
    creditCost = 10;
  } else if (service === 'bnk') {
    creditCost = 10;
  } else if (service === 'vehicle') {
    creditCost = 5;
  } else if (service === 'veh_owner_num') {
    creditCost = 15;
  } else if (service === 'email') {
    creditCost = 20;
  } else if (service === 'pancard') {
    creditCost = 10;
  } else if (service === 'aadhaar_to_pan') {
    creditCost = 150;
  }
  const currentCredits = Number(profile.credits || 0);
  
  if (!isUnlimited && currentCredits < creditCost) {
    return res.status(200).json({
      status: "success",
      results: { error: `Insufficient credits. This search costs ${creditCost} CTR, but you only have ${currentCredits} CTR.` }
    });
  }

  // Deduct credits atomically with safety fallback
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
          results: { error: "Could not retrieve user profile to deduct credits." }
        });
      }

      const currentVal = Number(currentProfile.credits || 0);
      if (currentVal < creditCost) {
        return res.status(200).json({
          status: "success",
          results: { error: `Insufficient credits. This search costs ${creditCost} CTR, but you only have ${currentVal} CTR.` }
        });
      }

      const { error: updateErr } = await client
        .from("profiles")
        .update({ credits: currentVal - creditCost })
        .eq("id", user.id);

      if (updateErr) {
        return res.status(200).json({
          status: "success",
          results: { error: "Failed to deduct credits. Please try again." }
        });
      }
    } else if (rpcSuccess === false) {
      return res.status(200).json({
        status: "success",
        results: { error: `Insufficient credits. This search costs ${creditCost} CTR, but you only have ${currentCredits} CTR.` }
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
      let activeKey = "";
      if (supabaseAdmin) {
        try {
          const { data: keys } = await supabaseAdmin
            .from("api_keys")
            .select("api_key")
            .eq("status", "active")
            .limit(1);
          if (keys && keys.length > 0) {
            activeKey = keys[0].api_key;
          }
        } catch (dbErr) {
          console.warn("[DB WARNING] Failed to select active api_key, using master key fallback:", dbErr);
        }
      }
      if (!activeKey) {
        activeKey = process.env.INTERNAL_MASTER_KEY || INTERNAL_MASTER_KEY;
      }
      
      const newApiUrl = `https://exploitsindia.site//osint-api/number.php?exploits=${encodeURIComponent(cleanedQuery)}`;
      const target = `http://127.0.0.1:${PORT}/api/lookup?key=${activeKey}&query=${encodeURIComponent(cleanedQuery)}`;
      
      try {
        console.log(`Querying new phone API: ${newApiUrl}`);
        const response = await fetch(newApiUrl, { headers });
        if (response.ok) {
          const text = await response.text();
          console.log("New Phone API response preview:", text.slice(0, 300));
          let parsed: any = null;
          try {
            parsed = JSON.parse(text);
          } catch (e) {
            console.log("Failed to parse JSON from phone API, trying plaintext parser...");
            parsed = parsePhonePlainText(text);
          }
          if (parsed && typeof parsed === 'object') {
            let records = parsed.results || parsed.data || parsed.records;
            if (!records) {
              if (parsed.name || parsed.mobile || parsed.father_name || parsed.full_name) {
                records = { "1": parsed };
              } else {
                const hasNestedObject = Object.values(parsed).some(v => v && typeof v === 'object');
                if (hasNestedObject) {
                  records = parsed;
                }
              }
            }
            if (records) {
              if (Array.isArray(records)) {
                const map: Record<string, any> = {};
                records.forEach((rec, idx) => {
                  if (rec && typeof rec === 'object') {
                    map[`Result ${idx + 1}`] = rec;
                  }
                });
                responseData = { results: map };
              } else {
                responseData = { results: records };
              }
            } else {
              responseData = parsed;
            }
          }
        }
      } catch (err) {
        console.error("New phone API failed, falling back to old target:", err);
      }

      if (!responseData) {
        console.log(`Falling back to old phone target: ${target}`);
        const response = await fetch(target, { headers });
        if (response.ok) {
          const data = await response.json();
          responseData = data.results || data.data || data;
        } else {
          throw new Error(`Phone search status ${response.status}`);
        }
      }
    } else if (service === 'telegram') {
      let activeKey = "";
      if (supabaseAdmin) {
        try {
          const { data: keys } = await supabaseAdmin
            .from("api_keys")
            .select("api_key")
            .eq("status", "active")
            .limit(1);
          if (keys && keys.length > 0) {
            activeKey = keys[0].api_key;
          }
        } catch (dbErr) {
          console.warn("[DB WARNING] Failed to select active api_key:", dbErr);
        }
      }
      if (!activeKey) {
        activeKey = process.env.INTERNAL_MASTER_KEY || INTERNAL_MASTER_KEY;
      }
      
      const target = `http://127.0.0.1:${PORT}/api/telegram?key=${activeKey}&query=${encodeURIComponent(cleanedQuery)}`;
      
      try {
        console.log(`Querying internal telegram: ${target}`);
        const response = await fetch(target, { headers });
        if (response.ok) {
          const data = await response.json();
          if (data && data.status === "success" && data.results) {
            responseData = data.results;
          } else if (data && data.status === "error") {
            responseData = { error: data.message };
          } else {
            responseData = data;
          }
        } else {
          throw new Error(`Telegram search status ${response.status}`);
        }
      } catch (err) {
        console.error("Internal telegram API query failed:", err);
      }
    } else {
      let api_url = "";
      if (service === 'adhr') {
        const targetQuery = cleanedQuery.replace(/[^0-9]/g, '');
        api_url = `https://exploitsindia.site/osint-api/aadhar.php?exploits=${encodeURIComponent(targetQuery)}`;
      } else if (service === 'bnk') {
        const targetQuery = cleanedQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        api_url = `https://exploitsindia.site/osint-api/ifsc.php?exploits=${encodeURIComponent(targetQuery)}`;
      } else if (service === 'vehicle') {
        const targetQuery = cleanedQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        api_url = `https://techvishalboss.com/api/v1/lookup.php?key=TVB_SGL_BCFC1E32&service=vehicle&rc=${encodeURIComponent(targetQuery)}`;
      } else if (service === 'veh_owner_num') {
        const targetQuery = cleanedQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        api_url = `http://uersxinfo.in/api?key=498wlpajf&type=veh_numm&term=${encodeURIComponent(targetQuery)}`;
      } else if (service === 'email') {
        api_url = `http://uersxinfo.in/api?key=498wlpajf&type=mail&term=${encodeURIComponent(cleanedQuery)}`;
      } else if (service === 'pancard') {
        const targetQuery = cleanedQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        api_url = `https://exploitsindia.site/osint-api/pancard.php?exploits=${encodeURIComponent(targetQuery)}`;
      } else if (service === 'aadhaar_to_pan') {
        const targetQuery = cleanedQuery.replace(/[^0-9]/g, '');
        const apiKey = "c8117598aafa71238a4bf8377087b0ff";
        api_url = `https://techvishalboss.com/panfind/api.php?api_key=${apiKey}&aadhaar_number=${encodeURIComponent(targetQuery)}`;
      }

      if (api_url) {
        const response = await fetch(api_url, { headers });
        if (response.ok) {
          const text = await response.text();
          // Try to parse JSON first
          let parsed: any;
          try {
            parsed = JSON.parse(text);
          } catch (e) {
            // Parse plain text
            let parseType: 'aadhar' | 'pan' | 'bank' | 'rasion' = 'aadhar';
            if (service === 'bnk') parseType = 'bank';
            else if (service === 'pancard') parseType = 'pan';
            else if (service === 'aadhaar_to_pan') parseType = 'pan';
            parsed = parsePlainTextLookup(text, parseType);
          }
          responseData = parsed;
        } else {
          throw new Error(`API status ${response.status}`);
        }
      }
    }

    if (!responseData) {
      await logSearchHistory(req, service, cleanedQuery, 'not_found');
      return res.status(200).json({
        status: "success",
        results: { error: `No records found for query: ${cleanedQuery}` }
      });
    }

    // Clean brandings and watermarks
    const cleanedData = scrubAllBranding(responseData);

    // SECURE BACKEND CACHE SAVE
    const keys = Object.keys(cleanedData);
    const hasRealData = keys.some(k => !['error', 'message', 'status'].includes(k.toLowerCase()));
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
    const finalStatus = cleanedData.error ? 'not_found' : 'success';
    await logSearchHistory(req, service, cleanedQuery, finalStatus, client);

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

app.get("/api/lookup", async (req, res) => {
  const { 
    key, 
    query, 
    numquery, 
    tgquery, 
    vehiclequery, 
    number, 
    rc, 
    vehicle, 
    telegram, 
    tg, 
    phone, 
    service 
  } = req.query;
  const renderUrl = (process.env.VITE_RENDER_BACKEND_URL || "https://tracexdata-api.onrender.com").trim();
  const startTime = Date.now();

  // Basic CORS and Content-Type
  // Removed wildcard CORS
  res.setHeader('Content-Type', 'application/json');

  if (!key) return res.status(401).json({ status: "error", message: "API key is required" });

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
      targetQuery = String(telegram || tg || query || "").trim();
    } else if (service === 'aadhaar_to_pan') {
      lookupType = 'aadhaar_to_pan';
      targetQuery = String(query || req.query.aadhar || req.query.adhr || "").trim();
    } else if (service === 'adhr' || service === 'identity') {
      lookupType = 'adhr';
      targetQuery = String(query || req.query.aadhar || req.query.adhr || "").trim();
    } else if (service === 'bnk' || service === 'bank') {
      lookupType = 'bnk';
      targetQuery = String(query || req.query.ifsc || req.query.bnk || "").trim();
    } else if (service === 'rasion' || service === 'ration') {
      lookupType = 'rasion';
      targetQuery = String(query || req.query.family || req.query.rasion || "").trim();
    } else if (service === 'vehicle' || service === 'rc' || req.query.rc !== undefined || req.query.vehicle !== undefined) {
      lookupType = 'vehicle';
      targetQuery = String(query || req.query.rc || req.query.vehicle || "").trim();
    } else if (service === 'veh_owner_num' || service === 'veh_numm') {
      lookupType = 'veh_owner_num';
      targetQuery = String(query || req.query.rc || req.query.vehicle || "").trim();
    } else if (service === 'email' || service === 'mail') {
      lookupType = 'email';
      targetQuery = String(query || "").trim();
    } else if (number || phone || service === 'phone' || service === 'number') {
      lookupType = 'phone';
      targetQuery = String(number || phone || query || "").trim();
    }
    // Priority 3: intelligent default
    else if (query !== undefined) {
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
        const q = String(query).trim();
        if (/^[a-zA-Z]{4}0[a-zA-Z0-9]{6}$/.test(q)) lookupType = 'bnk';
        else if (/^[A-Za-z0-9]{4,11}$/.test(q) && /[A-Za-z]/.test(q) && /[0-9]/.test(q)) lookupType = 'vehicle';
        else if (q.startsWith('@') || (/[a-zA-Z_]/.test(q) && !/^\d+$/.test(q))) lookupType = 'telegram';
        else if (/^\d{12}$/.test(q)) lookupType = 'adhr';
        else lookupType = 'phone';
      }
      targetQuery = String(query).trim();
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
    const isMasterOrInternal = isMaster || planUpper.includes("MASTER") || planUpper.includes("INTERNAL") || planUpper.includes("COMBO");

    if (!isMasterOrInternal) {
      let isAuthorized = false;
      if (lookupType === 'phone') {
        isAuthorized = planUpper.includes("NUMBER");
      } else if ((lookupType as string) === 'telegram') {
        isAuthorized = planUpper.includes("TELEGRAM");
      } else if (lookupType === 'adhr') {
        isAuthorized = planUpper.includes("ADHR") || planUpper.includes("IDENTITY") || planUpper.includes("AADH");
      } else if (lookupType === 'bnk') {
        isAuthorized = planUpper.includes("BNK") || planUpper.includes("BANK");
      } else if (lookupType === 'rasion') {
        isAuthorized = planUpper.includes("RASION") || planUpper.includes("RATION");
      } else if (lookupType === 'vehicle') {
        isAuthorized = planUpper.includes("VEHICLE");
      } else if (lookupType === 'veh_owner_num') {
        isAuthorized = planUpper.includes("VEH_OWNER") || planUpper.includes("VEH_NUMM") || planUpper.includes("VEHICLE_TO_NUMBER") || planUpper.includes("VEHICLE");
      } else if (lookupType === 'email') {
        isAuthorized = planUpper.includes("EMAIL") || planUpper.includes("MAIL");
      } else if (lookupType === 'aadhaar_to_pan') {
        isAuthorized = planUpper.includes("AADHAAR_TO_PAN") || planUpper.includes("AADHAAR TO PAN");
      }

      if (!isAuthorized) {
        return res.status(403).json({
          status: "error",
          message: `Access Denied: Your API key is authorized for '${keyRecord.plan_name}' but you initiated a '${lookupType}' query.`
        });
      }
    }

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
      const newApiUrl = `https://exploitsindia.site//osint-api/number.php?exploits=${encodeURIComponent(targetQuery)}`;
      const searchParams = new URLSearchParams();
      searchParams.set("key", String(key)); 
      searchParams.set("query", targetQuery);

      const target = `https://exploitsindia.site//osint-api/number.php?exploits=${encodeURIComponent(targetQuery)}`;
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
      const api_url = `http://uersxinfo.in/api?key=498wlpajf&type=uers&term=${encodeURIComponent(target_username)}`;
      const response = await fetch(api_url);
      if (!response.ok) {
        throw new Error(`Telegram Engine Offline: Status ${response.status}`);
      }

      const text = await response.text();
      const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb(?:er|3r)[\s\-_]*s(?:oldier|0ldier)|@?cyb(?:er|3r)s(?:oldier|0ldier)|u(?:ers|ser)xinfo(?:\.in)?)/gi, "");
      const lowerText = cleanedText.toLowerCase();

      if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim() || lowerText.includes("unknown")) {
         await logApiRequest(keyRecord?.id || null, `TG: ${targetQuery}`, "failed", Date.now() - startTime);
         return res.status(404).json({ status: "error", message: `No telegram records found for ${targetQuery}` });
      }

      let recordsList: any[] = [];
      let isParsedAsJson = false;

      try {
        const parsed = JSON.parse(text);
        const cleaned_json = scrubAllBranding(parsed);
        if (cleaned_json && (cleaned_json.results || cleaned_json.data || cleaned_json.records)) {
          const items = cleaned_json.results || cleaned_json.data || cleaned_json.records;
          recordsList = Array.isArray(items) ? items : [items];
          isParsedAsJson = true;
        } else if (cleaned_json && typeof cleaned_json === 'object') {
          recordsList = [cleaned_json];
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

        recordsList = [{
          name: "Telegram Registered Profile",
          telegram_id: telegram_id,
          username: username,
          mobile: phone || "N/A"
        }];
      }

      const newCount = (keyRecord.requests_used || 0) + 1;
      if (!isMaster && keyRecord?.id) {
        await supabaseAdmin.from("api_keys").update({ 
          requests_used: newCount,
          last_used_at: new Date().toISOString()
        }).eq("id", keyRecord.id);
      }

      await logApiRequest(keyRecord?.id || null, `TG: ${targetQuery}`, "success", Date.now() - startTime);

      const filtered = formatUnifiedSaaSResponse({
        type: 'telegram',
        query: targetQuery,
        expiresAt: keyRecord.expires_at,
        planName: keyRecord.plan_name,
        requestsUsed: newCount,
        records: recordsList
      });

      return res.json(filtered);
    } else if (lookupType === 'adhr' || lookupType === 'bnk' || lookupType === 'rasion' || lookupType === 'vehicle' || lookupType === 'veh_owner_num' || lookupType === 'email' || lookupType === 'aadhaar_to_pan') {
      let api_url = "";
      let logPrefix = "";
      
      if (lookupType === 'adhr') {
        api_url = `https://exploitsindia.site/osint-api/aadhar.php?exploits=${encodeURIComponent(targetQuery)}`;
        logPrefix = "ADHR";
      } else if (lookupType === 'aadhaar_to_pan') {
        const apiKey = "c8117598aafa71238a4bf8377087b0ff";
        api_url = `https://techvishalboss.com/panfind/api.php?api_key=${apiKey}&aadhaar_number=${encodeURIComponent(targetQuery)}`;
        logPrefix = "AADHAAR_TO_PAN";
      } else if (lookupType === 'bnk') {
        api_url = `https://exploitsindia.site/osint-api/ifsc.php?exploits=${encodeURIComponent(targetQuery)}`;
        logPrefix = "BNK";
      } else if (lookupType === 'rasion') {
        api_url = `https://exploitsindia.site/hdhddhjdjddjdjdjdndnddnnccndndhejdmdnnd/family.php?exploits=${encodeURIComponent(targetQuery)}`;
        logPrefix = "RASION";
      } else if (lookupType === 'email') {
        api_url = `http://uersxinfo.in/api?key=498wlpajf&type=mail&term=${encodeURIComponent(targetQuery)}`;
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

        api_url = `http://uersxinfo.in/api?key=498wlpajf&type=veh_numm&term=${encodeURIComponent(targetQuery)}`;
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

        api_url = `https://techvishalboss.com/api/v1/lookup.php?key=TVB_SGL_BCFC1E32&service=vehicle&rc=${encodeURIComponent(targetQuery)}`;
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
      if (isJson && parsedData) {
        const statusStr = String(parsedData.status || parsedData.success || "").toLowerCase();
        const messageStr = String(parsedData.message || parsedData.error || "").toLowerCase();
        if (statusStr === "error" || statusStr === "fail" || statusStr === "failed" || messageStr.includes("no result") || messageStr.includes("no records found") || messageStr.includes("not found")) {
          isError = true;
        }
      } else {
        const lowerText = text.toLowerCase();
        if (lowerText.includes("no result") || lowerText.includes("no records") || lowerText.includes("error") || !text.trim()) {
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
    
    if (['c10', 'credit_10'].includes(plan_id)) creditsToAdd = 15;
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
      const match = strPlanId().match(/^(?:c|credit_?)(\d+)$/i);
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
    }
  } catch (err) {
    console.error("Fulfillment error:", err);
  }
}

// Cashfree Routes

app.post("/api/cashfree/create-order", async (req, res) => {
  const isPgPay = req.body?.plan_id === "pgpay_manual" || req.body?.plan_id === "panfind";
  
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
    if (plan_id !== "pgpay_manual" && plan_id !== "panfind") {
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

      // Check telegram permissions
      const planUpper = String(keyRecord.plan_name || "").toUpperCase();
      const isAllowed = planUpper.includes("TELEGRAM") || planUpper.includes("COMBO") || planUpper.includes("MASTER") || planUpper.includes("INTERNAL");
      if (!isAllowed) {
        return res.status(403).json({
          status: "error",
          message: `Access Denied: Your API key is authorized for '${keyRecord.plan_name}' but you initiated a 'telegram' query.`
        });
      }
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

    const api_url = `http://uersxinfo.in/api?key=498wlpajf&type=uers&term=${encodeURIComponent(target_username)}`;
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
       return res.status(200).json({ status: "success", results: {}, message: "no data found" });
    }

    let results: any = null;
    let isParsedAsJson = false;

    try {
      const parsed = JSON.parse(text);
      if (parsed && (parsed.success === false || parsed.success === "false")) {
        await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "failed", Date.now() - startTime);
        return res.status(200).json({ status: "success", results: {}, message: "no data found" });
      }

      const cleaned_json = cleanBrandingObject(parsed);
      if (cleaned_json) {
        const telegram_id = cleaned_json.tg_id || cleaned_json.telegram_id || target_username;
        const phone = cleaned_json.number || cleaned_json.mobile || cleaned_json.phone || "N/A";
        const username = cleaned_json.username || cleaned_json.name || target_username;
        const country = cleaned_json.country || "N/A";
        const country_code = cleaned_json.country_code || "N/A";

        if (telegram_id === "N/A" && phone === "N/A") {
          // Fallback to text parser
        } else {
          results = {
            "Telegram Match": {
              name: username,
              telegram_id: telegram_id,
              mobile: phone,
              father_name: "N/A",
              alt_mobile: country_code,
              email: "N/A",
              operator: country,
              state_circle: "N/A",
              address: "N/A",
              platform: "Telegram Lookup"
            }
          };
          isParsedAsJson = true;
        }
      }
    } catch (e) {
      // Fallback to text parsing
    }

    if (!isParsedAsJson) {
      const usernameMatch = cleanedText.match(/(?:Username|User):\s*([^\s\n\r]+)/i);
      const idMatch = cleanedText.match(/(?:Telegram ID|ID):\s*(?:<code>)?(\d+)(?:<\/code>)?/i);
      const phoneMatch = cleanedText.match(/(?:Phone Number|Mobile|Phone):\s*(?:<code>)?(\d+)(?:<\/code>)?/i);
      const countryMatch = cleanedText.match(/Country:\s*([^\n\r]+)/i);
      const codeMatch = cleanedText.match(/Country Code:\s*([^\n\r]+)/i);

      const username = usernameMatch ? usernameMatch[1].trim() : target_username;
      const telegram_id = idMatch ? idMatch[1].trim() : "N/A";
      const phone = phoneMatch ? phoneMatch[1].trim() : "N/A";
      const country = countryMatch ? countryMatch[1].trim() : "N/A";
      const country_code = codeMatch ? codeMatch[1].trim() : "N/A";

      if (telegram_id === "N/A" && phone === "N/A") {
         await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "failed", Date.now() - startTime);
         return res.status(200).json({ status: "success", results: {}, message: "no data found" });
      }

      results = {
        "Telegram Match": {
          name: username,
          telegram_id: telegram_id,
          mobile: phone,
          father_name: "N/A",
          alt_mobile: country_code,
          email: "N/A",
          operator: country,
          state_circle: "N/A",
          address: "N/A",
          platform: "Telegram Lookup"
        }
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

    return res.json({ status: "success", results: cleanBrandingObject(results) });
  } catch (err: any) {
    console.error("Telegram Proxy error:", err);
    await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "failed", Date.now() - startTime);
    return res.status(500).json({ status: "error", message: "api error" });
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

      // Check permissions
      const planUpper = String(keyRecord.plan_name || "").toUpperCase();
      const isAllowed = planUpper.includes("ADHR") || planUpper.includes("IDENTITY") || planUpper.includes("AADH") || planUpper.includes("COMBO") || planUpper.includes("MASTER") || planUpper.includes("INTERNAL");
      if (!isAllowed) {
        return res.status(403).json({
          status: "error",
          message: `Access Denied: Your API key is authorized for '${keyRecord.plan_name}' but you initiated an 'identity' query.`
        });
      }
    }

    const api_url = `https://exploitsindia.site/osint-api/aadhar.php?exploits=${encodeURIComponent(targetQuery)}`;
    const response = await fetch(api_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `ADHR: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "api error" });
    }

    const text = await response.text();
    const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
    const lowerText = cleanedText.toLowerCase();

    if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim() || lowerText.includes("unknown")) {
       await logApiRequest(keyRecord?.id || null, `ADHR: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "api error" });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (e) {
      parsedData = parsePlainTextLookup(cleanedText, 'aadhar');
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
    return res.status(500).json({ status: "error", message: "api error" });
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

      // Check permissions
      const planUpper = String(keyRecord.plan_name || "").toUpperCase();
      const isAllowed = planUpper.includes("BNK") || planUpper.includes("BANK") || planUpper.includes("COMBO") || planUpper.includes("MASTER") || planUpper.includes("INTERNAL");
      if (!isAllowed) {
        return res.status(403).json({
          status: "error",
          message: `Access Denied: Your API key is authorized for '${keyRecord.plan_name}' but you initiated a 'bank' query.`
        });
      }
    }

    const api_url = `https://exploitsindia.site/osint-api/ifsc.php?exploits=${encodeURIComponent(targetQuery)}`;
    const response = await fetch(api_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `BNK: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "api error" });
    }

    const text = await response.text();
    const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
    const lowerText = cleanedText.toLowerCase();

    if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim() || lowerText.includes("unknown")) {
       await logApiRequest(keyRecord?.id || null, `BNK: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "api error" });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (e) {
      parsedData = parsePlainTextLookup(cleanedText, 'bank');
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
    return res.status(500).json({ status: "error", message: "api error" });
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

      // Check permissions
      const planUpper = String(keyRecord.plan_name || "").toUpperCase();
      const isAllowed = planUpper.includes("RASION") || planUpper.includes("RATION") || planUpper.includes("COMBO") || planUpper.includes("MASTER") || planUpper.includes("INTERNAL");
      if (!isAllowed) {
        return res.status(403).json({
          status: "error",
          message: `Access Denied: Your API key is authorized for '${keyRecord.plan_name}' but you initiated a 'rasion' query.`
        });
      }
    }

    const api_url = `https://exploitsindia.site/hdhddhjdjddjdjdjdndnddnnccndndhejdmdnnd/family.php?exploits=${encodeURIComponent(targetQuery)}`;
    const response = await fetch(api_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `RASION: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "api error" });
    }

    const text = await response.text();
    const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
    const lowerText = cleanedText.toLowerCase();

    if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim() || lowerText.includes("unknown")) {
       await logApiRequest(keyRecord?.id || null, `RASION: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "api error" });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (e) {
      parsedData = parsePlainTextLookup(cleanedText, 'rasion');
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
    return res.status(500).json({ status: "error", message: "api error" });
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

      // Check permissions
      const planUpper = String(keyRecord.plan_name || "").toUpperCase();
      const isAllowed = planUpper.includes("VEHICLE") || planUpper.includes("COMBO") || planUpper.includes("MASTER") || planUpper.includes("INTERNAL");
      if (!isAllowed) {
        return res.status(403).json({
          status: "error",
          message: `Access Denied: Your API key is authorized for '${keyRecord.plan_name}' but you initiated a 'vehicle' query.`
        });
      }
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
    const api_url = `https://techvishalboss.com/api/v1/lookup.php?key=TVB_SGL_BCFC1E32&service=vehicle&rc=${encodeURIComponent(targetQuery)}`;
    const response = await fetch(api_url);
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `VEHICLE: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "api error" });
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
    if (isJson && parsedData) {
      const statusStr = String(parsedData.status || parsedData.success || "").toLowerCase();
      const messageStr = String(parsedData.message || parsedData.error || "").toLowerCase();
      if (statusStr === "error" || statusStr === "fail" || statusStr === "failed" || messageStr.includes("no result") || messageStr.includes("no records found") || messageStr.includes("not found")) {
        isError = true;
      }
    } else {
      const lowerText = text.toLowerCase();
      if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim()) {
        isError = true;
      }
    }

    if (isError) {
       await logApiRequest(keyRecord?.id || null, `VEHICLE: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "api error" });
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
    return res.status(500).json({ status: "error", message: "api error" });
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

      // Check permissions
      const planUpper = String(keyRecord.plan_name || "").toUpperCase();
      const isAllowed = planUpper.includes("VEH_OWNER") || planUpper.includes("VEH_NUMM") || planUpper.includes("VEHICLE_TO_NUMBER") || planUpper.includes("VEHICLE") || planUpper.includes("COMBO") || planUpper.includes("MASTER") || planUpper.includes("INTERNAL") || planUpper.includes("PRO") || planUpper.includes("INFINITY");
      if (!isAllowed) {
        return res.status(403).json({
          status: "error",
          message: `Access Denied: Your API key is authorized for '${keyRecord.plan_name}' but you initiated a 'vehicle to owner number' query.`
        });
      }
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
    const api_url = `http://uersxinfo.in/api?key=498wlpajf&type=veh_numm&term=${encodeURIComponent(targetQuery)}`;
    const response = await fetch(api_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 TraceX-Web/1.0',
        'Accept': 'application/json,text/plain,*/*'
      }
    });
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `VEH_OWNER: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "api error" });
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
    if (isJson && parsedData) {
      const statusStr = String(parsedData.status || parsedData.success || "").toLowerCase();
      const messageStr = String(parsedData.message || parsedData.error || "").toLowerCase();
      if (statusStr === "error" || statusStr === "fail" || statusStr === "failed" || messageStr.includes("no result") || messageStr.includes("no records found") || messageStr.includes("not found")) {
        isError = true;
      }
    } else {
      const lowerText = text.toLowerCase();
      if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim()) {
        isError = true;
      }
    }

    if (isError) {
       await logApiRequest(keyRecord?.id || null, `VEH_OWNER: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "api error" });
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
    return res.status(500).json({ status: "error", message: "api error" });
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

      // Check permissions
      const planUpper = String(keyRecord.plan_name || "").toUpperCase();
      const isAllowed = planUpper.includes("EMAIL") || planUpper.includes("MAIL") || planUpper.includes("COMBO") || planUpper.includes("MASTER") || planUpper.includes("INTERNAL") || planUpper.includes("PRO") || planUpper.includes("INFINITY");
      if (!isAllowed) {
        return res.status(403).json({
          status: "error",
          message: `Access Denied: Your API key is authorized for '${keyRecord.plan_name}' but you initiated an 'email' query.`
        });
      }
    }

    // Fetch from the external provider
    const api_url = `http://uersxinfo.in/api?key=498wlpajf&type=mail&term=${encodeURIComponent(targetQuery)}`;
    const response = await fetch(api_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 TraceX-Web/1.0',
        'Accept': 'application/json,text/plain,*/*'
      }
    });
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `EMAIL: ${targetQuery}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "api error" });
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
    if (isJson && parsedData) {
      const statusStr = String(parsedData.status || parsedData.success || "").toLowerCase();
      const messageStr = String(parsedData.message || parsedData.error || "").toLowerCase();
      if (statusStr === "error" || statusStr === "fail" || statusStr === "failed" || messageStr.includes("no result") || messageStr.includes("no records found") || messageStr.includes("not found")) {
        isError = true;
      }
    } else {
      const lowerText = text.toLowerCase();
      if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim()) {
        isError = true;
      }
    }

    if (isError) {
       await logApiRequest(keyRecord?.id || null, `EMAIL: ${targetQuery}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "api error" });
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
    return res.status(500).json({ status: "error", message: "api error" });
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

      // Check permissions
      const planUpper = String(keyRecord.plan_name || "").toUpperCase();
      const isAllowed = planUpper.includes("PAN") || planUpper.includes("PN") || planUpper.includes("COMBO") || planUpper.includes("MASTER") || planUpper.includes("INTERNAL");
      if (!isAllowed) {
        return res.status(403).json({
          status: "error",
          message: `Access Denied: Your API key is authorized for '${keyRecord.plan_name}' but you initiated a 'pancard' query.`
        });
      }
    }

    const api_url = `https://exploitsindia.site/osint-api/pancard.php?exploits=${encodeURIComponent(targetQuery)}`;
    const response = await fetch(api_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `PANCARD: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "api error" });
    }

    const text = await response.text();
    const cleanedText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
    const lowerText = cleanedText.toLowerCase();

    if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim() || lowerText.includes("unknown")) {
       await logApiRequest(keyRecord?.id || null, `PANCARD: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "api error" });
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
    return res.status(500).json({ status: "error", message: "api error" });
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
    const apiKey = "c8117598aafa71238a4bf8377087b0ff";
    const api_url = `https://techvishalboss.com/panfind/api.php?api_key=${apiKey}&aadhaar_number=${targetAadhaar}`;
    
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

// Deep Case-Insensitive Branding and Provider Info Scrubber
function scrubAllBranding(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === "string") {
    return obj
      .replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb(?:er|3r)[\s\-_]*s(?:oldier|0ldier)|@?cyb(?:er|3r)s(?:oldier|0ldier)|vishal[\s\-_]*boss|developer|provider|api_buy_link|website_link|buy_api|contact|support|exploitsindia\.site|techvishalboss\.com|exploitsindia|techvishal|cyber|Cyb3r|S0ldier|u(?:ers|ser)xinfo(?:\.in)?)/gi, "")
      .replace(/(💳\s*BUY\s*API\s*:\s*@?\w+|🆘\s*SUPPORT\s*:\s*@?\w+)/gi, "")
      .replace(/(t\.me\/\w+|https?:\/\/(?:www\.)?\w+\.\w+(?:\/\S*)?)/gi, "")
      .replace(/Powered_by/gi, "")
      .replace(/Contact/gi, "")
      .replace(/Buy_API/gi, "")
      .trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(item => scrubAllBranding(item));
  }
  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const [key, val] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if ([
        "branding", "api_info", "powered_by", 
        "buy_api", "owner_telegram", "developer", 
        "provider", "api_buy_link", "website_link", "buy"
      ].includes(lowerKey)) {
        continue;
      }
      cleaned[key] = scrubAllBranding(val);
    }
    return cleaned;
  }
  return obj;
}

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
      const cost = 150;

      if (currentCredits < cost) {
        return res.status(403).json({ error: "Insufficient credits. You need at least 150 credits to perform Aadhaar to PAN lookup. Note: Aadhaar to PAN is not included in unlimited plans." });
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

    // 5. Query External PAN Find API
    const apiKey = "c8117598aafa71238a4bf8377087b0ff";
    const api_url = `https://techvishalboss.com/panfind/api.php?api_key=${apiKey}&aadhaar_number=${targetAadhaar}`;
    
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

    if (!panFound) {
      return res.json({
        status: "failed",
        pan_found: false,
        message: isGuest ? "No PAN number found for this Aadhaar number." : "No PAN number found for this Aadhaar number. 150 credits deducted.",
        credits_deducted: isGuest ? 0 : 150,
        results: apiData ? scrubAllBranding(apiData) : null
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
  const { email, full_name, credits, unlimited_expiry } = req.body;

  try {
    const db = (req as any).adminClient || supabaseAdmin;
    const expiry = unlimited_expiry ? new Date(unlimited_expiry).toISOString() : null;

    const { data, error } = await db
      .from("profiles")
      .upsert({
        id: id,
        email: email,
        full_name: full_name || "",
        credits: Number(credits || 0),
        unlimited_expiry: expiry
      }, { onConflict: 'id' })
      .select();

    if (error) {
      console.error("[PUT_ADMIN_PROFILE_ERR]", error);
      return res.status(500).json({ error: error.message });
    }
    const profileObj = (data && data.length > 0) ? data[0] : {
      id: id,
      email: email,
      full_name: full_name || "",
      credits: Number(credits || 0),
      unlimited_expiry: expiry
    };
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
          totalUsers: userCount || 0
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
  });
});

export default app;