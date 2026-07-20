/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase.ts';

export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_RENDER_BACKEND_URL) {
    return import.meta.env.VITE_RENDER_BACKEND_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If it's local development or AI Studio preview workspace, use window.location.origin
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.includes('ais-dev-') ||
      hostname.includes('ais-pre-') ||
      hostname.includes('gitpod.io')
    ) {
      return window.location.origin;
    }
  }
  // Default to the correct Render backend API URL for production
  return 'https://tracexdata-api.onrender.com';
};

export const safeFetchJson = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();
  
  if (
    contentType.toLowerCase().includes('text/html') ||
    rawText.trim().startsWith('<!DOCTYPE') ||
    rawText.trim().startsWith('<!doctype') ||
    rawText.trim().startsWith('<html')
  ) {
    const preview = rawText.trim().slice(0, 200).replace(/\s+/g, ' ');
    throw new Error(`Received HTML response instead of JSON. URL: ${response.url} (Status: ${response.status}). Preview: "${preview}"`);
  }
  
  try {
    return JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Failed to parse response JSON from ${response.url}: ${err instanceof Error ? err.message : String(err)}. Raw response: "${rawText.slice(0, 100)}"`);
  }
};

export interface LookupResult {
  name: string;
  father_name: string;
  mobile: string;
  alt_mobile: string;
  email: string;
  aadhar_number: string;
  operator: string;
  state_circle: string;
  address: string;
  // Custom fields
  platform?: string;
  vehicle_no?: string;
  telegram_id?: string;
}

export interface ApiResponse {
  status: boolean;
  results: {
    [key: string]: LookupResult;
  };
  raw_results?: string;
  error?: string;
  branding?: {
    provider: string;
    developer: string;
    website: string;
    telegram_support: string;
    updates_channel: string;
  };
}

export const parsePhonePlainText = (text: string): any => {
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
};

export const validateLookupResponse = (data: any): boolean => {
  if (!data) return false;
  
  // Normalize: if the data is a flat object containing record details directly, wrap it
  if (data && typeof data === 'object') {
    if (!data.results && !data.data && !data.records) {
      if (data.name || data.mobile || data.father_name || data.full_name) {
        data.results = { "1": data };
      }
    }
  }

  let results = data.results || data.records;
  if (!results && data.raw && data.raw.results) {
    results = data.raw.results;
  }
  if (!results && data.data) {
    results = data.data;
  }

  if (!results || typeof results === 'string') {
    return false;
  }

  let hasData = false;
  if (Array.isArray(results)) {
    hasData = results.length > 0;
  } else if (typeof results === 'object') {
    const validKeys = Object.keys(results).filter(key => 
      !['branding', 'success', 'status', 'found', 'message', 'API_Info', 'Powered_by', 'Owner', 'Contact', 'Buy_API', 'Timestamp'].includes(key)
    );
    hasData = validKeys.length > 0;
  }

  if (hasData) {
    return true;
  }

  const isOk = data.success === true || data.status === true || data.found === true;
  return isOk && hasData;
};

export const parseLookupResults = (data: any, number: string = ''): ApiResponse => {
  console.log("BACKEND RESPONSE", data);
  if (!data) {
    console.log("NORMALIZED RESULTS", {});
    return { status: false, results: {} };
  }

  // Normalize flat records
  if (data && typeof data === 'object') {
    if (!data.results && !data.data && !data.records) {
      if (data.name || data.mobile || data.father_name || data.full_name) {
        data.results = { "1": data };
      }
    }
  }

  let rawResults = data.results || data.records;
  if (!rawResults && data.raw && data.raw.results) {
    rawResults = data.raw.results;
  }
  if (!rawResults && data.data) {
    rawResults = data.data;
  }

  const normalizedResults: { [key: string]: LookupResult } = {};

  if (rawResults && typeof rawResults !== 'string') {
    if (Array.isArray(rawResults)) {
      const sliced = rawResults.slice(0, 20);
      sliced.forEach((entry: any, index: number) => {
        if (typeof entry !== 'object' || entry === null) return;
        normalizedResults[`Result ${index + 1}`] = {
          ...entry,
          name: String(entry?.name || entry?.full_name || 'N/A').toUpperCase(),
          father_name: String(entry?.father_name || entry?.fathername || 'N/A').toUpperCase(),
          mobile: String(entry?.mobile || entry?.number || number || 'N/A'),
          alt_mobile: String(entry?.alt_mobile || entry?.alt_number || 'N/A'),
          email: String(entry?.email || 'N/A'),
          aadhar_number: String(entry?.aadhar_number || entry?.aadhar || 'N/A'),
          operator: String(entry?.operator || entry?.carrier || 'N/A').toUpperCase(),
          state_circle: String(entry?.state_circle || entry?.circle || 'N/A').toUpperCase(),
          address: String(entry?.address || entry?.location || 'N/A')
        };
      });
    } else if (typeof rawResults === 'object') {
      const entries = Object.entries(rawResults).slice(0, 20);
      entries.forEach(([key, val]) => {
        if (typeof val !== 'object' || val === null) return;
        if (['branding', 'success', 'status', 'found', 'message', 'API_Info', 'Powered_by', 'Owner', 'Contact', 'Buy_API', 'Timestamp'].includes(key)) return;
        const entry = val as any;
        normalizedResults[key] = {
          ...entry,
          name: String(entry?.name || entry?.full_name || 'N/A').toUpperCase(),
          father_name: String(entry?.father_name || entry?.father_name || entry?.fathername || 'N/A').toUpperCase(),
          mobile: String(entry?.mobile || entry?.number || number || 'N/A'),
          alt_mobile: String(entry?.alt_mobile || entry?.alt_number || 'N/A'),
          email: String(entry?.email || 'N/A'),
          aadhar_number: String(entry?.aadhar_number || entry?.aadhar || 'N/A'),
          operator: String(entry?.operator || entry?.carrier || 'N/A').toUpperCase(),
          state_circle: String(entry?.state_circle || entry?.circle || 'N/A').toUpperCase(),
          address: String(entry?.address || entry?.location || 'N/A')
        };
      });
    }
  }

  console.log("NORMALIZED RESULTS", normalizedResults);

  return {
    status: Object.keys(normalizedResults).length > 0,
    results: normalizedResults,
    branding: data.branding || (data.raw && data.raw.branding)
  };
};

export const fetchLookupWithRetry = async (number: string): Promise<any> => {
  const maxAttempts = 3;
  const delays = [1000, 2000, 3000];
  
  const backendEndpoint = `${getApiBaseUrl()}/api/user-lookup?service=phone&query=${number}`;

  let lastError: any = null;

  // Retrieve active token for authorization with our secure backend proxy
  let token = '';
  try {
    const session = await supabase.auth.getSession();
    token = session.data.session?.access_token || '';
  } catch (e) {
    console.warn("Could not retrieve Supabase session token:", e);
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const url = backendEndpoint;
      
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 TraceX-Web/1.0',
        'Accept': 'application/json,text/plain,*/*'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        mode: 'cors'
      });

      console.log("API TRY", attempt, "URL", url, "STATUS", response.status);

      if (!response.ok) {
        throw new Error(`HTTP Status ${response.status}`);
      }

      const rawText = await response.text();
      console.log("API RAW PREVIEW", rawText.slice(0, 300));

      const contentType = response.headers.get('content-type') || '';
      if (contentType.toLowerCase().includes('text/html') || rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html')) {
        throw new Error(`Received HTML page instead of JSON from ${url}`);
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error(`Failed to parse response JSON: ${parseErr}`);
      }

      let data = parsed;

      if (data?.status === "error" || (typeof data?.message === 'string' && data.message.toLowerCase().includes('serverdown'))) {
        throw new Error(`Backend Engine Error: ${data?.message || 'ServerDown'}`);
      }

      const isValid = validateLookupResponse(data);
      if (isValid) {
        let count = 0;
        let results = data.results || (data.raw && data.raw.results) || data.data;
        if (Array.isArray(results)) {
          count = results.length;
        } else if (results && typeof results === 'object') {
          count = Object.keys(results).length;
        }
        console.log("API VALID RESULTS", count);
        return data;
      } else {
        console.log("API VALID RESULTS", 0);
        return { status: false, results: {}, message: data?.message || 'No Record Found' };
      }

    } catch (err: any) {
      console.warn(`API attempt ${attempt} error on backend:`, err.message || err);
      lastError = err;
      
      if (attempt < maxAttempts) {
        const delayMs = delays[attempt - 1];
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error("ServerDown: Data source unresponsive");
};

export const lookupNumber = async (number: string): Promise<ApiResponse> => {
  console.log('Searching TRACEXDATA Intelligence Engine...');
  try {
    const rawData = await fetchLookupWithRetry(number);
    const isValid = validateLookupResponse(rawData);
    if (rawData && isValid) {
      const parsed = parseLookupResults(rawData, number);
      return parsed;
    }
    return {
      status: false,
      results: {},
      error: rawData?.results?.error || rawData?.message || "No records found"
    };
  } catch (err: any) {
    console.error("Lookup number error:", err);
    return {
      status: false,
      results: {},
      error: err.message || "Failed to search record"
    };
  }
};

/**
 * Helper to process and normalize API results with maximum stability (NEVER-FAIL EDITION)
 */
const processApiData = async (apiData: any, number: string): Promise<ApiResponse> => {
  try {
    // 0. Parse if string (AllOrigins returns string)
    let data = apiData;
    if (typeof apiData === 'string') {
      try { data = JSON.parse(apiData.trim()); } catch (e) { data = { error: apiData }; }
    }

    // 1. Check for success status or existing results
    const hasStatus = data?.status === true || data?.success === true;
    const rawResults = data?.results || data?.data || (hasStatus ? data : null);

    // 2. Handle "No Record Found" early
    if (data?.message?.toLowerCase().includes('no record') || 
        data?.error?.toLowerCase().includes('no record') ||
        (hasStatus && !rawResults)) {
      return { status: false, results: {}, error: 'No Record Found for this number.' };
    }

    // 3. Dynamic Normalization (Fast Path)
    if (rawResults && typeof rawResults === 'object') {
      const normalizedResults: { [key: string]: LookupResult } = {};
      
      // Get all result objects dynamically
      const resultEntries = (rawResults.results || rawResults.data) 
        ? Object.entries(rawResults.results || rawResults.data) 
        : Object.entries(rawResults);

      for (const [key, val] of resultEntries) {
        if (typeof val !== 'object' || val === null) continue;
        
        const entry = val as any;
        // Skip metadata/branding keys
        if (['branding', 'Powered_by', 'Contact', 'Timestamp'].includes(key)) continue;

        normalizedResults[key] = {
          ...entry,
          name: entry?.name || entry?.full_name || 'N/A',
          father_name: entry?.father_name || entry?.fathername || 'N/A',
          mobile: entry?.mobile || entry?.number || number || 'N/A',
          alt_mobile: entry?.alt_mobile || entry?.alt_number || 'N/A',
          email: entry?.email || 'N/A',
          aadhar_number: entry?.aadhar_number || entry?.aadhar || 'N/A',
          operator: entry?.operator || entry?.carrier || 'N/A',
          state_circle: entry?.state_circle || entry?.circle || 'N/A',
          address: entry?.address || entry?.location || 'N/A'
        };
      }

      if (Object.keys(normalizedResults).length > 0) {
        return { status: true, results: normalizedResults };
      }
    }

    // 4. Final Fallback for recognized error patterns
    return {
      status: false,
      results: {},
      error: data?.message || data?.error || 'No Record Found for this number.'
    };
  } catch (error) {
    console.error('TRACEXDATA Parsing Error:', error);
    return { status: false, results: {}, error: 'Server busy, please try again later.' };
  }
};

export const lookupTelegram = async (telegramId: string): Promise<ApiResponse> => {
  const cleanTelegram = telegramId.trim().replace(/^@/, '');
  
  console.log('Searching TRACEXDATA Telegram Intelligence...');
  try {
    const endpoint = `${getApiBaseUrl()}/api/user-lookup?service=telegram&query=${encodeURIComponent(cleanTelegram)}`;

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';

    const apiData = await fetchWithFallback(endpoint, 'telegram', cleanTelegram, token);
    
    if (apiData && (apiData.status === 'success' || apiData.status === true) && (apiData.results || apiData.raw_results)) {
      const cleanResults = scrubBranding(apiData.results || {});
      const cleanRawResults = apiData.raw_results ? scrubBranding(apiData.raw_results) : undefined;

      return { 
        status: true, 
        results: cleanResults, 
        raw_results: cleanRawResults 
      };
    } else {
      return {
        status: false,
        results: {},
        error: apiData?.message || apiData?.error || 'No records found for this Telegram ID.'
      };
    }
  } catch (error: any) {
    console.error(`Telegram lookup error:`, error);
    return {
      status: false,
      results: {},
      error: error instanceof Error ? error.message : 'Server down, please try again later.'
    };
  }
};

// Deep recursive branding and promotional info scrubber
const scrubBranding = (obj: any): any => {
  if (!obj) return obj;
  if (typeof obj === 'string') {
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
    return obj.map(item => scrubBranding(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, val] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (['branding', 'api_info', 'powered_by', 'buy_api', 'owner_telegram', 'developer', 'provider', 'api_buy_link', 'website_link', 'buy'].includes(lowerKey)) {
        continue;
      }
      cleaned[key] = scrubBranding(val);
    }
    return cleaned;
  }
  return obj;
};

export const parsePlainTextLookup = (text: string, type: 'aadhar' | 'pan' | 'bank' | 'rasion'): any => {
  const result: any = {};
  const cleanText = text.replace(/(tech[\s\-_]*vishal(?:[\s\-_]*boss)?|anish[\s\-_]*exploits|cyb(?:er|3r)[\s\-_]*s(?:oldier|0ldier)|@?cyb(?:er|3r)s(?:oldier|0ldier)|u(?:ers|ser)xinfo(?:\.in)?)/gi, "").trim();

  const lines = cleanText.split('\n');
  let lastKey: string | null = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Strip emojis
    const cleanLine = line.replace(/[\u2600-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').replace(/\*/g, '').trim();
    if (!cleanLine) continue;
    if (cleanLine.startsWith('─') || cleanLine.startsWith('━')) continue;

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
};

export const fetchWithFallback = async (
  endpoint: string,
  serviceType: 'adhr' | 'bnk' | 'pancard' | 'vehicle' | 'email' | 'telegram' | 'veh_owner_num',
  query: string,
  token: string
): Promise<any> => {
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(endpoint, {
    method: 'GET',
    headers
  });
  
  if (!response.ok) {
    throw new Error(`Primary backend returned status ${response.status}`);
  }

  const rawText = await response.text();
  const contentType = response.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('text/html') || rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html')) {
    throw new Error("Backend responded with HTML page instead of JSON.");
  }

  try {
    return JSON.parse(rawText);
  } catch (e) {
    throw new Error("Failed to parse backend JSON response.");
  }
};

export const lookupAdhr = async (aadharNo: string): Promise<ApiResponse> => {
  console.log('Searching TRACEXDATA Identity Card Intelligence...');
  try {
    const endpoint = `${getApiBaseUrl()}/api/user-lookup?service=adhr&query=${encodeURIComponent(aadharNo)}`;

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';

    const apiData = await fetchWithFallback(endpoint, 'adhr', aadharNo, token);

    if (apiData && (apiData.status === 'success' || apiData.status === true) && (apiData.results || apiData.raw_results)) {
      return { 
        status: true, 
        results: scrubBranding(apiData.results || {}), 
        raw_results: apiData.raw_results ? scrubBranding(apiData.raw_results) : undefined 
      };
    } else {
      return {
        status: false,
        results: {},
        error: apiData?.message || apiData?.error || 'No records found for this Identity Card.'
      };
    }
  } catch (error) {
    console.error('Identity Card lookup error:', error);
    return {
      status: false,
      results: {},
      error: error instanceof Error ? error.message : 'Server down, please try again later.'
    };
  }
};

export const lookupBnk = async (ifsc: string): Promise<ApiResponse> => {
  console.log('Searching TRACEXDATA BA&NK Intelligence...');
  try {
    const endpoint = `${getApiBaseUrl()}/api/user-lookup?service=bnk&query=${encodeURIComponent(ifsc)}`;

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';

    const apiData = await fetchWithFallback(endpoint, 'bnk', ifsc, token);

    if (apiData && (apiData.status === 'success' || apiData.status === true) && (apiData.results || apiData.raw_results)) {
      return { 
        status: true, 
        results: scrubBranding(apiData.results || {}), 
        raw_results: apiData.raw_results ? scrubBranding(apiData.raw_results) : undefined 
      };
    } else {
      return {
        status: false,
        results: {},
        error: apiData?.message || apiData?.error || 'No records found for this Bank/IFSC.'
      };
    }
  } catch (error) {
    console.error('Bank lookup error:', error);
    return {
      status: false,
      results: {},
      error: error instanceof Error ? error.message : 'Server down, please try again later.'
    };
  }
};

export const lookupVehicle = async (vehicleNo: string): Promise<ApiResponse> => {
  const cleanVehicleNo = vehicleNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  console.log('Searching TRACEXDATA Vehicle Intelligence...');
  try {
    const endpoint = `${getApiBaseUrl()}/api/user-lookup?service=vehicle&query=${cleanVehicleNo}`;

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';

    const apiData = await fetchWithFallback(endpoint, 'vehicle', cleanVehicleNo, token);
    
    if (apiData && (apiData.status === 'success' || apiData.status === true) && (apiData.results || apiData.raw_results)) {
      const cleanResults = scrubBranding(apiData.results || {});
      const cleanRawResults = apiData.raw_results ? scrubBranding(apiData.raw_results) : undefined;

      return { 
        status: true, 
        results: cleanResults, 
        raw_results: cleanRawResults 
      };
    } else {
      return {
        status: false,
        results: {},
        error: apiData?.message || apiData?.error || apiData?.results?.error || 'No records found for this Vehicle Number.'
      };
    }
  } catch (error: any) {
    console.error(`Vehicle lookup error:`, error);
    return {
      status: false,
      results: {},
      error: error instanceof Error ? error.message : 'Server down, please try again later.'
    };
  }
};

export const lookupVehOwnerNum = async (vehicleNo: string): Promise<ApiResponse> => {
  const cleanVehicleNo = vehicleNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  console.log('Searching TRACEXDATA Vehicle To Owner Number Intelligence...');
  try {
    const endpoint = `${getApiBaseUrl()}/api/user-lookup?service=veh_owner_num&query=${cleanVehicleNo}`;

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';

    const apiData = await fetchWithFallback(endpoint, 'veh_owner_num', cleanVehicleNo, token);
    
    if (apiData && (apiData.status === 'success' || apiData.status === true) && (apiData.results || apiData.raw_results)) {
      const cleanResults = scrubBranding(apiData.results || {});
      const cleanRawResults = apiData.raw_results ? scrubBranding(apiData.raw_results) : undefined;

      return { 
        status: true, 
        results: cleanResults, 
        raw_results: cleanRawResults 
      };
    } else {
      return {
        status: false,
        results: {},
        error: apiData?.message || apiData?.error || apiData?.results?.error || 'No records found for this Vehicle Number.'
      };
    }
  } catch (error: any) {
    console.error(`Vehicle To Owner Number lookup error:`, error);
    return {
      status: false,
      results: {},
      error: error instanceof Error ? error.message : 'Server down, please try again later.'
    };
  }
};

export const lookupPancard = async (pancardNo: string): Promise<ApiResponse> => {
  const cleanPancardNo = pancardNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  console.log('Searching TRACEXDATA PN Card Intelligence...');
  try {
    const endpoint = `${getApiBaseUrl()}/api/user-lookup?service=pancard&query=${cleanPancardNo}`;

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';

    const apiData = await fetchWithFallback(endpoint, 'pancard', cleanPancardNo, token);
    
    if (apiData && (apiData.status === 'success' || apiData.status === true) && (apiData.results || apiData.raw_results)) {
      const cleanResults = scrubBranding(apiData.results || {});
      const cleanRawResults = apiData.raw_results ? scrubBranding(apiData.raw_results) : undefined;

      return { 
        status: true, 
        results: cleanResults, 
        raw_results: cleanRawResults 
      };
    } else {
      return {
        status: false,
        results: {},
        error: apiData?.message || apiData?.error || 'No records found for this PN Card.'
      };
    }
  } catch (error: any) {
    console.error(`PN Card lookup error:`, error);
    return {
      status: false,
      results: {},
      error: error instanceof Error ? error.message : 'Server down, please try again later.'
    };
  }
};

export const lookupEmail = async (email: string): Promise<ApiResponse> => {
  const cleanEmail = email.trim().toLowerCase();
  
  console.log('Searching TRACEXDATA Email Intelligence...');
  try {
    const endpoint = `${getApiBaseUrl()}/api/user-lookup?service=email&query=${encodeURIComponent(cleanEmail)}`;

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';

    const apiData = await fetchWithFallback(endpoint, 'email', cleanEmail, token);
    
    if (apiData && (apiData.status === 'success' || apiData.status === true) && (apiData.results || apiData.raw_results)) {
      const cleanResults = scrubBranding(apiData.results || {});
      const cleanRawResults = apiData.raw_results ? scrubBranding(apiData.raw_results) : undefined;

      return { 
        status: true, 
        results: cleanResults, 
        raw_results: cleanRawResults 
      };
    } else {
      return {
        status: false,
        results: {},
        error: apiData?.message || apiData?.error || 'No records found for this Email.'
      };
    }
  } catch (error: any) {
    console.error(`Email lookup error:`, error);
    return {
      status: false,
      results: {},
      error: error instanceof Error ? error.message : 'Server down, please try again later.'
    };
  }
};

export const lookupAadhaarToPan = async (aadhaarNo: string): Promise<any> => {
  try {
    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes.data.session?.access_token;
    
    const endpoint = `${getApiBaseUrl()}/api/aadhaar-to-pan`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ aadhaar_number: aadhaarNo })
    });

    if (response.ok) {
      return await safeFetchJson(response);
    }
    throw new Error(`Engine returned status ${response.status}`);
  } catch (error: any) {
    console.error('Aadhaar to PAN lookup error:', error);
    return {
      status: 'failed',
      pan_found: false,
      message: error.message || 'Verification failed. Please try again.'
    };
  }
};


