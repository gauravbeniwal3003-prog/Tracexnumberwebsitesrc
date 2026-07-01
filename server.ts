import express from "express";
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
const PORT = 3000;

// Supabase Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: any;
let supabaseAdmin: any;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  console.log("[TRACEXDATA] Supabase Admin initialized with SERVICE_ROLE_KEY");
} else if (supabase) {
  supabaseAdmin = supabase;
  console.log("[TRACEXDATA] Supabase Admin initialized fallback to ANON_KEY");
}

// Cashfree Configuration
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_BASE_URL = process.env.CASHFREE_BASE_URL || "https://api.cashfree.com/pg";

app.use(express.json());

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
    powered_by: "TraceXData Intelligence",
    owner: "@gaurav_beniwal_0001",
    buy_api: "https://tracexdata-api.onrender.com/buy-api",
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

// Unified response Formatter to keep premium branding consistent across all query types
function formatUnifiedSaaSResponse({
  type,
  query,
  expiresAt,
  planName,
  requestsUsed,
  records
}: {
  type: 'phone' | 'telegram' | 'adhr' | 'bnk' | 'rasion';
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
        const normalizedKey = key.replace(/(tech[\s\-_]*vishal|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "info");
        let cleanedVal = val;
        if (typeof val === 'string') {
          cleanedVal = val.replace(/(tech[\s\-_]*vishal|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "").trim().toUpperCase();
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
    powered_by: "TraceXData Intelligence",
    owner: "@gaurav_beniwal_0001",
    buy_api: "https://tracexdata-api.onrender.com/buy-api",
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
    return obj.replace(/(tech[\s\-_]*vishal|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "").trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanBrandingObject(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const cleanedKey = key.replace(/(tech[\s\-_]*vishal|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "info");
      cleaned[cleanedKey] = cleanBrandingObject(obj[key]);
    }
    return cleaned;
  }
  return obj;
}

// Public SaaS API Endpoint (Smart Unified Lookup proxy to support multiple databases)
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (!key) return res.status(401).json({ status: "error", message: "API key is required" });

  if (!supabaseAdmin) {
    return res.status(500).json({ status: "error", message: "Engine Offline: Internal connection failure" });
  }

  let keyRecord: any = null;
  let targetQuery = "";
  let lookupType: 'phone' | 'telegram' | 'adhr' | 'bnk' | 'rasion' = 'phone';

  try {
    // 1. Validate API Key from DB (or Master Key Bypass)
    const isMaster = key === "TX-SYSTEM-INTERNAL-ADMIN";

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
        console.error("[AUTH_FAIL]", keyErr, "Key:", key);
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
    }
    // Priority 2: Legacy or explicit service select
    else if (telegram || tg || service === 'telegram') {
      lookupType = 'telegram';
      targetQuery = String(telegram || tg || query || "").trim();
    } else if (service === 'adhr' || service === 'identity') {
      lookupType = 'adhr';
      targetQuery = String(query || req.query.aadhar || req.query.adhr || "").trim();
    } else if (service === 'bnk' || service === 'bank') {
      lookupType = 'bnk';
      targetQuery = String(query || req.query.ifsc || req.query.bnk || "").trim();
    } else if (service === 'rasion' || service === 'ration') {
      lookupType = 'rasion';
      targetQuery = String(query || req.query.family || req.query.rasion || "").trim();
    } else if (number || phone || service === 'phone' || service === 'number') {
      lookupType = 'phone';
      targetQuery = String(number || phone || query || "").trim();
    }
    // Priority 3: intelligent default
    else if (query !== undefined) {
      const planUpper = String(keyRecord.plan_name || "").toUpperCase();
      if (planUpper.includes("TELEGRAM")) {
        lookupType = 'telegram';
      } else if (planUpper.includes("ADHR") || planUpper.includes("IDENTITY")) {
        lookupType = 'adhr';
      } else if (planUpper.includes("BNK") || planUpper.includes("BANK")) {
        lookupType = 'bnk';
      } else if (planUpper.includes("RASION") || planUpper.includes("RATION")) {
        lookupType = 'rasion';
      } else {
        lookupType = 'phone';
      }
      targetQuery = String(query).trim();
    }

    // Normalize and clean queries depending on lookup service
    if (lookupType === 'bnk') {
      targetQuery = targetQuery.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    } else if (lookupType === 'adhr' || lookupType === 'rasion') {
      targetQuery = targetQuery.replace(/[^0-9]/g, '');
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
      } else if (lookupType === 'telegram') {
        isAuthorized = planUpper.includes("TELEGRAM");
      } else if (lookupType === 'adhr') {
        isAuthorized = planUpper.includes("ADHR") || planUpper.includes("IDENTITY") || planUpper.includes("AADH");
      } else if (lookupType === 'bnk') {
        isAuthorized = planUpper.includes("BNK") || planUpper.includes("BANK");
      } else if (lookupType === 'rasion') {
        isAuthorized = planUpper.includes("RASION") || planUpper.includes("RATION");
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

    // Safety and Privacy Shield Protection check (for mobile and telegram)
    let isProtected = false;
    if (lookupType === 'phone') {
      const { data: protectedData } = await supabaseAdmin
        .from('protected_numbers')
        .select('phone_number')
        .eq('phone_number', targetQuery)
        .maybeSingle();
      if (protectedData) isProtected = true;
    } else if (lookupType === 'telegram') {
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

      if (lookupType === 'telegram') {
        mockRecord.telegram_id = targetQuery;
      }

      const responsePayload = formatUnifiedSaaSResponse({
        type: lookupType === 'phone' ? 'phone' : 'telegram',
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
      const searchParams = new URLSearchParams();
      searchParams.set("key", String(key)); 
      searchParams.set("query", targetQuery);

      const target = `${renderUrl.replace(/\/$/, "")}/api/lookup?${searchParams.toString()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const response = await fetch(target, {
          headers: { "User-Agent": "TraceXData-SaaS-Proxy/4.5" },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const rawData = await response.json();
          const newCount = (keyRecord.requests_used || 0) + 1;
          
          if (!isMaster && keyRecord.id) {
            await supabaseAdmin.from("api_keys").update({ 
              requests_used: newCount,
              last_used_at: new Date().toISOString()
            }).eq("id", keyRecord.id);
          }

          const recordsRaw = rawData.results || rawData.data || rawData.records || (rawData.status === true ? rawData : []);
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
          return res.status(response.status).json(filtered);
        } else {
          await logApiRequest(keyRecord?.id || null, maskNumberForLog(targetQuery), "failed", Date.now() - startTime);
          return res.status(502).json({ 
            status: "error", 
            message: "Downstream Provider: Invalid JSON Response"
          });
        }
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        throw new Error(`Connection Timeout: Downstream provider failed to respond within 12s`);
      }
    } else if (lookupType === 'telegram') {
      const target_username = targetQuery.startsWith('@') ? targetQuery : `@${targetQuery}`;
      const api_url = `https://exploitsindia.site//osint-api/telegram.php?exploits=${encodeURIComponent(target_username)}`;
      const response = await fetch(api_url);
      if (!response.ok) {
        throw new Error(`Telegram Engine Offline: Status ${response.status}`);
      }

      const text = await response.text();
      const cleanedText = text.replace(/(tech[\s\-_]*vishal|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
      const lowerText = cleanedText.toLowerCase();

      if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim() || lowerText.includes("unknown")) {
         await logApiRequest(keyRecord?.id || null, `TG: ${targetQuery}`, "failed", Date.now() - startTime);
         return res.status(404).json({ status: "error", message: `No telegram records found for ${targetQuery}` });
      }

      const usernameMatch = cleanedText.match(/Username:\s*([^\s\n\r]+)/i);
      const idMatch = cleanedText.match(/Telegram ID:\s*(?:<code>)?(\d+)(?:<\/code>)?/i);
      const phoneMatch = cleanedText.match(/Phone Number:\s*(?:<code>)?(\d+)(?:<\/code>)?/i);

      const username = usernameMatch ? usernameMatch[1].trim() : target_username;
      const telegram_id = idMatch ? idMatch[1].trim() : "N/A";
      const phone = phoneMatch ? phoneMatch[1].trim() : "N/A";

      if (telegram_id === "N/A" && phone === "N/A") {
         await logApiRequest(keyRecord?.id || null, `TG: ${targetQuery}`, "failed", Date.now() - startTime);
         return res.status(404).json({ status: "error", message: "Lookup matched but profile contains no traceable ID or phone." });
      }

      const recordsList = [{
        name: "Telegram Registered Profile",
        telegram_id: telegram_id,
        username: username,
        mobile: phone || "N/A"
      }];

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
    } else if (lookupType === 'adhr' || lookupType === 'bnk' || lookupType === 'rasion') {
      let api_url = "";
      let logPrefix = "";
      
      if (lookupType === 'adhr') {
        api_url = `https://exploitsindia.site//osint-api/aadhar.php?exploits=${encodeURIComponent(targetQuery)}`;
        logPrefix = "ADHR";
      } else if (lookupType === 'bnk') {
        api_url = `https://exploitsindia.site//osint-api/ifsc.php?exploits=${encodeURIComponent(targetQuery)}`;
        logPrefix = "BNK";
      } else if (lookupType === 'rasion') {
        api_url = `https://exploitsindia.site//hdhddhjdjddjdjdjdndnddnnccndndhejdmdnnd/family.php?exploits=${encodeURIComponent(targetQuery)}`;
        logPrefix = "RASION";
      }

      const response = await fetch(api_url);
      if (!response.ok) {
        throw new Error(`OSINT Provider Offline: ${lookupType.toUpperCase()} status ${response.status}`);
      }

      const text = await response.text();
      const cleanedText = text.replace(/(tech\s*vishal|anish\s*exploits|@?cyb3rs0ldier)/gi, "");
      const lowerText = cleanedText.toLowerCase();

      if (lowerText.includes("no result") || lowerText.includes("no records") || lowerText.includes("error") || !text.trim() || lowerText.includes("unknown")) {
         await logApiRequest(keyRecord?.id || null, `${logPrefix}: ${targetQuery}`, "failed", Date.now() - startTime);
         return res.status(404).json({ status: "error", message: `No identity records found in ${logPrefix} database for ${targetQuery}` });
      }

      let parsedData: any;
      try {
        parsedData = JSON.parse(cleanedText);
      } catch (e) {
        parsedData = { raw_data: cleanedText };
      }

      const cleanedData = cleanBrandingObject(parsedData);
      const newCount = (keyRecord.requests_used || 0) + 1;
      if (!isMaster && keyRecord?.id) {
        await supabaseAdmin.from("api_keys").update({ 
          requests_used: newCount,
          last_used_at: new Date().toISOString()
        }).eq("id", keyRecord.id);
      }

      await logApiRequest(keyRecord?.id || null, `${logPrefix}: ${targetQuery}`, "success", Date.now() - startTime);

      const filtered = formatUnifiedSaaSResponse({
        type: lookupType,
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

    if (claimErr || !claim || claim.status === "success") return;

    const { plan_id, user_email } = claim;

    // Handle manual pgpay guest payments
    if (plan_id === "pgpay_manual" || plan_id === "panfind") {
      await supabaseAdmin.from("payment_claims").update({ status: "success" }).eq("payment_id", orderId);
      console.log(`[SaaS] Manual Guest Payment fulfilled successfully for ${orderId}`);
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
      let limit: number | null = null; // All only 1 Month Unlimited plans
      let planName = "Number Lookup (1 Month)";

      // Full ID Mapping
      if (plan_id === 'api_number') {
        planName = "Number Lookup (1 Month)";
      } else if (plan_id === 'api_telegram') {
        planName = "Telegram Lookup (1 Month)";
      } else if (plan_id === 'api_identity') {
        planName = "Identity Card Lookup (1 Month)";
      } else if (plan_id === 'api_bank') {
        planName = "BA&NK Lookup (1 Month)";
      } else if (plan_id === 'api_rasion') {
        planName = "Rasion Card Lookup (1 Month)";
      } else if (plan_id === 'api_vehicle') {
        planName = "Vehicle Lookup (1 Month)";
      } else if (plan_id === 'api_pancard') {
        planName = "PN Card Lookup (1 Month)";
      } else if (plan_id === 'api_combo') {
        planName = "All Combo Special (1 Month)";
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
        duration_days: days,
        request_limit: limit,
        expires_at: expiresAt.toISOString(),
        order_id: orderId
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
    
    if (['c10', 'credit_10'].includes(plan_id)) creditsToAdd = 10;
    else if (['c40', 'credit_40'].includes(plan_id)) creditsToAdd = 40;
    else if (['c50', 'credit_50'].includes(plan_id)) creditsToAdd = 50;
    else if (['c100', 'credit_100'].includes(plan_id)) creditsToAdd = 100;
    else if (['c150', 'credit_150'].includes(plan_id)) creditsToAdd = 150;
    else if (['c1000', 'credit_1000'].includes(plan_id)) creditsToAdd = 1000;
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
            'u1m': 720, 'unlimited_1m': 720
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
  if (!supabaseAdmin && !isPgPay) {
    return res.status(500).json({ error: "Backend not configured (Supabase Admin missing)" });
  }

  try {
    const { user_id, user_email, plan_id, amount, customer_phone, customer_name, return_url } = req.body;

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

// Telegram Lookup API Middleware Proxy
app.get("/api/telegram", async (req, res) => {
  const { query, telegram, api } = req.query;
  const key = String(req.query.key || req.headers['x-api-key'] || "").trim();
  const targetTelegramId = String(query || telegram || api || "").trim();
  const startTime = Date.now();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (!targetTelegramId) {
    return res.status(400).json({ status: "error", message: "Telegram query parameter is required" });
  }

  let keyRecord: any = null;

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ status: "error", message: "Engine Offline: Internal connection failure" });
    }

    const isMaster = key === "TX-SYSTEM-INTERNAL-ADMIN";

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

    const target_username = targetTelegramId.startsWith('@') ? targetTelegramId : `@${targetTelegramId}`;
    const api_url = `https://exploitsindia.site//osint-api/telegram.php?exploits=${encodeURIComponent(target_username)}`;
    const response = await fetch(api_url);
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "api error" });
    }

    const text = await response.text();
    const cleanedText = text.replace(/(tech[\s\-_]*vishal|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
    const lowerText = cleanedText.toLowerCase();

    if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim() || lowerText.includes("unknown")) {
       await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "api error" });
    }

    const usernameMatch = cleanedText.match(/Username:\s*([^\s\n\r]+)/i);
    const idMatch = cleanedText.match(/Telegram ID:\s*(?:<code>)?(\d+)(?:<\/code>)?/i);
    const phoneMatch = cleanedText.match(/Phone Number:\s*(?:<code>)?(\d+)(?:<\/code>)?/i);
    const countryMatch = cleanedText.match(/Country:\s*([^\n\r]+)/i);
    const codeMatch = cleanedText.match(/Country Code:\s*([^\n\r]+)/i);

    const username = usernameMatch ? usernameMatch[1].trim() : target_username;
    const telegram_id = idMatch ? idMatch[1].trim() : "N/A";
    const phone = phoneMatch ? phoneMatch[1].trim() : "N/A";
    const country = countryMatch ? countryMatch[1].trim() : "N/A";
    const country_code = codeMatch ? codeMatch[1].trim() : "N/A";

    if (telegram_id === "N/A" && phone === "N/A") {
       await logApiRequest(keyRecord?.id || null, `TG: ${targetTelegramId}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "api error" });
    }

    const results = {
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

  res.setHeader('Access-Control-Allow-Origin', '*');
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

    const isMaster = key === "TX-SYSTEM-INTERNAL-ADMIN";

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

    const api_url = `https://exploitsindia.site//osint-api/aadhar.php?exploits=${encodeURIComponent(targetQuery)}`;
    const response = await fetch(api_url);
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `ADHR: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "api error" });
    }

    const text = await response.text();
    const cleanedText = text.replace(/(tech[\s\-_]*vishal|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
    const lowerText = cleanedText.toLowerCase();

    if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim() || lowerText.includes("unknown")) {
       await logApiRequest(keyRecord?.id || null, `ADHR: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "api error" });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (e) {
      parsedData = { raw_data: cleanedText };
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

  res.setHeader('Access-Control-Allow-Origin', '*');
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

    const isMaster = key === "TX-SYSTEM-INTERNAL-ADMIN";

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

    const api_url = `https://exploitsindia.site//osint-api/ifsc.php?exploits=${encodeURIComponent(targetQuery)}`;
    const response = await fetch(api_url);
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `BNK: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "api error" });
    }

    const text = await response.text();
    const cleanedText = text.replace(/(tech[\s\-_]*vishal|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
    const lowerText = cleanedText.toLowerCase();

    if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim() || lowerText.includes("unknown")) {
       await logApiRequest(keyRecord?.id || null, `BNK: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "api error" });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (e) {
      parsedData = { raw_data: cleanedText };
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

  res.setHeader('Access-Control-Allow-Origin', '*');
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

    const isMaster = key === "TX-SYSTEM-INTERNAL-ADMIN";

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

    const api_url = `https://exploitsindia.site//hdhddhjdjddjdjdjdndnddnnccndndhejdmdnnd/family.php?exploits=${encodeURIComponent(targetQuery)}`;
    const response = await fetch(api_url);
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `RASION: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "api error" });
    }

    const text = await response.text();
    const cleanedText = text.replace(/(tech[\s\-_]*vishal|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
    const lowerText = cleanedText.toLowerCase();

    if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim() || lowerText.includes("unknown")) {
       await logApiRequest(keyRecord?.id || null, `RASION: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "api error" });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (e) {
      parsedData = { raw_data: cleanedText };
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

  res.setHeader('Access-Control-Allow-Origin', '*');
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

    const isMaster = key === "TX-SYSTEM-INTERNAL-ADMIN";

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

    const api_url = `https://exploitsindia.site//osint-api/vehicle.php?exploits=${encodeURIComponent(targetQuery)}`;
    const response = await fetch(api_url);
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `VEHICLE: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "api error" });
    }

    const text = await response.text();
    const cleanedText = text.replace(/(tech[\s\-_]*vishal|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
    const lowerText = cleanedText.toLowerCase();

    if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim() || lowerText.includes("unknown")) {
       await logApiRequest(keyRecord?.id || null, `VEHICLE: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "api error" });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (e) {
      parsedData = { raw_data: cleanedText };
    }

    const cleanedData = cleanBrandingObject(parsedData);

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

// PAN / PN Card Lookup API Middleware Proxy
app.get("/api/pancard", async (req, res) => {
  const { query, pan, pn, pancard, exploits } = req.query;
  const key = String(req.query.key || req.headers['x-api-key'] || "").trim();
  let targetQuery = String(query || pan || pn || pancard || exploits || "").trim();
  const startTime = Date.now();

  res.setHeader('Access-Control-Allow-Origin', '*');
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

    const isMaster = key === "TX-SYSTEM-INTERNAL-ADMIN";

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

    const api_url = `https://exploitsindia.site//osint-api/pancard.php?exploits=${encodeURIComponent(targetQuery)}`;
    const response = await fetch(api_url);
    if (!response.ok) {
       await logApiRequest(keyRecord?.id || null, `PANCARD: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(502).json({ status: "error", message: "api error" });
    }

    const text = await response.text();
    const cleanedText = text.replace(/(tech[\s\-_]*vishal|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier)/gi, "");
    const lowerText = cleanedText.toLowerCase();

    if (lowerText.includes("no result") || lowerText.includes("no records found") || lowerText.includes("error") || !text.trim() || lowerText.includes("unknown")) {
       await logApiRequest(keyRecord?.id || null, `PANCARD: ${maskNumberForLog(targetQuery)}`, "failed", Date.now() - startTime);
       return res.status(404).json({ status: "error", message: "api error" });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (e) {
      parsedData = { raw_data: cleanedText };
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
    let order_status = "";
    
    // 1. Verify payment status with Cashfree
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      console.log("[PANFIND] Local Cashfree credentials missing. Proxying status verification request to live Render backend...");
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

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
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
    next();
  } catch (err) {
    console.error("[ADMIN_MIDDLEWARE_FAIL]", err);
    return res.status(500).json({ error: "Server authentication failure" });
  }
};

app.get("/api/admin/profiles", verifyAdminToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("email", { ascending: true });
    
    if (error) {
      console.error("[GET_ADMIN_PROFILES_ERR]", error);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ status: "success", data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/profiles", verifyAdminToken, async (req, res) => {
  const { id, email, full_name, credits, unlimited_expiry } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const randId = id || crypto.randomUUID();
    const expiry = unlimited_expiry ? new Date(unlimited_expiry).toISOString() : null;

    const { data, error } = await supabaseAdmin
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
    return res.json({ status: "success", data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/profiles/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { full_name, credits, unlimited_expiry } = req.body;

  try {
    const expiry = unlimited_expiry ? new Date(unlimited_expiry).toISOString() : null;

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: full_name || "",
        credits: Number(credits || 0),
        unlimited_expiry: expiry
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error("[PUT_ADMIN_PROFILE_ERR]", error);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ status: "success", data: data?.[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/profiles/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[DELETE_ADMIN_PROFILE_ERR]", error);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ status: "success", message: "User profile deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- ADMIN BILLING STATS & EARNINGS ENDPOINT ---

app.get("/api/admin/earnings", verifyAdminToken, async (req, res) => {
  try {
    const { data: claims, error: claimsErr } = await supabaseAdmin
      .from("payment_claims")
      .select("*")
      .eq("status", "success")
      .order("created_at", { ascending: false });

    if (claimsErr) {
      console.error("[GET_ADMIN_EARNINGS_ERR]", claimsErr);
      return res.status(500).json({ error: claimsErr.message });
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

    const successfulTransactions: any[] = [];

    for (const claim of (claims || [])) {
      const claimAmount = Number(claim.amount || 0);
      const claimDate = new Date(claim.created_at);
      const claimDateStr = getISTDateString(claimDate);

      totalEarning += claimAmount;

      if (claimDateStr === todayStr) {
        todayEarning += claimAmount;
      } else if (claimDateStr === yesterdayStr) {
        yesterdayEarning += claimAmount;
      }

      if (claimDate >= sevenDaysAgo) {
        weekEarning += claimAmount;
      }

      successfulTransactions.push({
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
    const userIds = Array.from(new Set(successfulTransactions.map(t => t.user_id).filter(id => !!id)));
    let profilesByUserId: Record<string, any> = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
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

    const enrichedTransactions = successfulTransactions.map(t => ({
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
    return res.status(500).json({ error: err.message });
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
      return res.status(500).json({ error: claimsErr.message });
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
    return res.status(500).json({ error: err.message });
  }
});

// --- SINGLE MANUAL TRANSACTION CLAIM GATEWAY ---

app.post("/api/cashfree/claim-manual", async (req, res) => {
  const { order_id } = req.body;
  if (!order_id) {
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
    return res.status(500).json({ error: err.message });
  }
});

// Vite middleware for development
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
