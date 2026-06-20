/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase.ts';

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

export const validateLookupResponse = (data: any): boolean => {
  if (!data) return false;
  
  let results = data.results;
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

  let rawResults = data.results;
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

const parseRawTextToLayout = (text: string, queryNum: string): any => {
  const records: any[] = [];
  const cleanedText = text
    .replace(/💳\s+BUY\s+API\s*:\s*@?Cyb3rS0ldier/gi, "")
    .replace(/🆘\s+SUPPORT\s*:\s*@?Cyb3rS0ldier/gi, "")
    .trim();

  const blocks = cleanedText.split(/────────────────────────|━━━━━━━━━━━━━━━━━━━━━━━━━━━/);

  blocks.forEach(block => {
    const trimmed = block.trim();
    if (!trimmed) return;
    if (!trimmed.includes("Name:") && !trimmed.includes("Mobile:")) return;

    const nameMatch = trimmed.match(/👤\s*Name:\s*([^\n\r]+)/i) || trimmed.match(/Name:\s*([^\n\r]+)/i);
    const fatherMatch = trimmed.match(/(?:👨👦|👨|👦)?\s*Father\s*Name:\s*([^\n\r]+)/i) || trimmed.match(/Father\s*Name:\s*([^\n\r]+)/i);
    const mobileMatch = trimmed.match(/📱\s*Mobile:\s*([^\n\r]+)/i) || trimmed.match(/Mobile:\s*([^\n\r]+)/i);
    const altMatch = trimmed.match(/📞\s*Alternate:\s*([^\n\r]+)/i) || trimmed.match(/Alternate:\s*([^\n\r]+)/i);
    const addressMatch = trimmed.match(/🏠\s*Address:\s*([^\n\r]+)/i) || trimmed.match(/Address:\s*([^\n\r]+)/i);
    const circleMatch = trimmed.match(/📡\s*Circle:\s*([^\n\r]+)/i) || trimmed.match(/Circle:\s*([^\n\r]+)/i);
    const aadharMatch = trimmed.match(/🪪\s*Aadhaar:\s*([^\n\r]+)/i) || trimmed.match(/Aadhaar:\s*([^\n\r]+)/i);

    if (nameMatch || mobileMatch) {
      const name = nameMatch ? nameMatch[1].trim() : "N/A";
      const father_name = fatherMatch ? fatherMatch[1].trim() : "N/A";
      const mobile = mobileMatch ? mobileMatch[1].trim() : queryNum;
      const alt_mobile = altMatch ? altMatch[1].trim() : "N/A";
      const address = addressMatch ? addressMatch[1].trim() : "N/A";
      const circleText = circleMatch ? circleMatch[1].trim() : "N/A";
      const aadhar_number = aadharMatch ? aadharMatch[1].trim() : "N/A";

      let operator = "N/A";
      let state_circle = "N/A";
      if (circleText !== "N/A") {
        const parts = circleText.split(/\s+/);
        if (parts.length > 0) {
          operator = parts[0];
          state_circle = parts.slice(1).join(" ") || parts[0];
        }
      }

      records.push({
        name,
        father_name,
        mobile,
        alt_mobile,
        address,
        operator,
        circle: state_circle,
        state_circle,
        aadhar_number
      });
    }
  });

  const resultsObj: Record<string, any> = {};
  records.forEach((rec, idx) => {
    resultsObj[`Result ${idx + 1}`] = rec;
  });

  return {
    status: records.length > 0 ? "success" : "not_found",
    powered_by: "TraceXData Intelligence",
    owner: "@gaurav_beniwal_0001",
    buy_api: "https://tracexdata-api.onrender.com/buy-api",
    query: queryNum,
    api_status: {
      plan: "Internal Direct Proxy",
      expires_at: new Date(Date.now() + 365*24*3600000).toISOString(),
      time_left: "Active",
      requests_used: 1
    },
    results_found: records.length,
    results: resultsObj,
    data: records
  };
};

export const fetchLookupWithRetry = async (number: string): Promise<any> => {
  const maxAttempts = 5;
  const delays = [1000, 2000, 3000, 4000, 5000];
  
  const renderBackendUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tracexdata-api.onrender.com';
  const backendEndpoint = `${renderBackendUrl.replace(/\/$/, '')}/api/lookup?key=TX-SYSTEM-INTERNAL-ADMIN&query=${number}`;
  
  const targetUrl = `https://exploitsindia.site//osint-api/number.php?exploits=${number}`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const useDirectFallback = attempt > 2;
      const url = useDirectFallback ? proxyUrl : backendEndpoint;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 TraceX-Web/1.0',
          'Accept': 'application/json,text/plain,*/*'
        },
        mode: 'cors'
      });

      console.log("API TRY", attempt, "STATUS", response.status);

      if (!response.ok) {
        throw new Error(`HTTP Status ${response.status}`);
      }

      const rawText = await response.text();
      console.log("API RAW PREVIEW", rawText.slice(0, 300));

      const contentType = response.headers.get('content-type') || '';
      if (contentType.toLowerCase().includes('text/html') && !useDirectFallback) {
        throw new Error('Received HTML page instead of JSON');
      }

      // If it's a direct fallback text, parse it directly
      if (rawText.includes("NUMBER LOOKUP") || rawText.includes("Name:")) {
        const parsedLayout = parseRawTextToLayout(rawText, number);
        return parsedLayout;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        // If parsing fails but rawText has exploits indicators, parse it
        if (rawText.includes("NUMBER LOOKUP") || rawText.includes("Name:")) {
          const parsedLayout = parseRawTextToLayout(rawText, number);
          return parsedLayout;
        }
        throw new Error(`Failed to parse response JSON: ${parseErr}`);
      }

      let data = parsed;
      if (parsed && 'contents' in parsed) {
        const contentStr = String(parsed.contents || "").trim();
        if (contentStr.includes("NUMBER LOOKUP") || contentStr.includes("Name:")) {
          const parsedLayout = parseRawTextToLayout(contentStr, number);
          return parsedLayout;
        }
        try {
          data = typeof parsed.contents === 'string' ? JSON.parse(contentStr) : parsed.contents;
        } catch (e) {
          // Fallback parsing of contents text directly if JSON.parse fails
          if (contentStr.includes("NUMBER LOOKUP") || contentStr.includes("Name:")) {
            return parseRawTextToLayout(contentStr, number);
          }
          throw new Error('Failed to parse wrapped AllOrigins payload');
        }
      }

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
      console.warn(`API attempt ${attempt} error:`, err.message || err);
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
  const { data: cachedData, error: cacheError } = await supabase
    .from('search_results')
    .select('raw_data')
    .eq('mobile_number', number)
    .maybeSingle();

  if (cachedData && !cacheError && cachedData.raw_data && Object.keys(cachedData.raw_data).length > 0) {
    console.log('Serving from TRACEXDATA Cache...');
    return {
      status: true,
      results: cachedData.raw_data
    };
  }

  console.log('Searching TRACEXDATA Intelligence Engine...');
  
  try {
    const rawData = await fetchLookupWithRetry(number);
    
    const isValid = validateLookupResponse(rawData);
    if (rawData && isValid) {
      const parsed = parseLookupResults(rawData, number);
      
      const resultString = JSON.stringify(parsed.results).toLowerCase();
      const hasUnknown = resultString.includes('"unknown"') || 
                         resultString.includes('unknown') || 
                         resultString.includes('no result') || 
                         resultString.includes('no records') || 
                         resultString.includes('no record') || 
                         resultString.includes('api error') || 
                         resultString.includes('not found') || 
                         resultString.includes('error');

      if (parsed.status && Object.keys(parsed.results).length > 0 && !hasUnknown) {
        (async () => {
          try {
            await supabase.from('search_results').upsert({ 
              mobile_number: number, 
              raw_data: parsed.results 
            }, { onConflict: 'mobile_number' });
          } catch (e) {}
        })();
        return parsed;
      } else if (hasUnknown) {
        return {
          status: false,
          results: {},
          error: rawData?.message || 'No Records: The engine returned an empty or error state for this number.'
        };
      } else {
        return parsed;
      }
    }

    return {
      status: false,
      results: {},
      error: rawData?.message || 'No Record Found for this number.'
    };
  } catch (error: any) {
    console.error('TRACEXDATA Engine Critical Error:', error);
    return {
      status: false,
      results: {},
      error: error instanceof Error ? error.message : 'ServerDown: Data source unresponsive'
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
        // Background cache update
        (async () => {
          try {
            await supabase.from('search_results').upsert({ 
              mobile_number: number, 
              raw_data: normalizedResults 
            }, { onConflict: 'mobile_number' });
          } catch (e) {}
        })();

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
  // 1. Check Cache first
  try {
    const { data: cachedData, error: cacheError } = await supabase
      .from('telegram_search_results')
      .select('raw_data')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (cachedData && !cacheError && cachedData.raw_data && Object.keys(cachedData.raw_data).length > 0) {
      console.log('Serving Telegram from TRACEXDATA Cache...');
      return {
        status: true,
        results: cachedData.raw_data
      };
    }
  } catch (e) {
    console.error('Telegram cache read failure:', e);
  }

  // 2. Query SaaS proxy
  console.log('Searching TRACEXDATA Telegram Intelligence...');
  try {
    const renderBackendUrl = 'https://tracexdata-api.onrender.com';
    const endpoint = `${renderBackendUrl.replace(/\/$/, '')}/api/telegram?key=TX-SYSTEM-INTERNAL-ADMIN&query=${telegramId}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch (e) { errorData = { error: errorText }; }
      throw new Error(errorData.error || errorData.message || `Engine returned status ${response.status}`);
    }

    const apiData = await response.json();
    
    if (apiData.status === 'success' && apiData.results && Object.keys(apiData.results).length > 0) {
      // Save cache in background
      (async () => {
        try {
          await supabase.from('telegram_search_results').upsert({
            telegram_id: telegramId,
            raw_data: apiData.results
          }, { onConflict: 'telegram_id' });
        } catch (e) {
          console.error('Failed to cache Telegram result:', e);
        }
      })();

      return { status: true, results: apiData.results };
    } else {
      return {
        status: false,
        results: {},
        error: apiData.message || apiData.error || 'No records found for this Telegram ID.'
      };
    }
  } catch (error) {
    console.error('Telegram lookup error:', error);
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
      .replace(/(tech[\s\-_]*vishal|anish[\s\-_]*exploits|cyb3r[\s\-_]*s0ldier|@?cyb3rs0ldier|vishal[\s\-_]*boss)/gi, "")
      .replace(/💳\s+BUY\s+API\s*:\s*@?Cyb3rS0ldier/gi, "")
      .replace(/🆘\s+SUPPORT\s*:\s*@?Cyb3rS0ldier/gi, "")
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
      if (['branding', 'success', 'status', 'found', 'message', 'api_info', 'powered_by', 'owner', 'contact', 'buy_api', 'support', 'owner_telegram'].includes(lowerKey)) {
        continue;
      }
      cleaned[key] = scrubBranding(val);
    }
    return cleaned;
  }
  return obj;
};

export const lookupAdhr = async (aadharNo: string): Promise<ApiResponse> => {
  console.log('Searching TRACEXDATA Identity Card Intelligence...');
  try {
    const renderBackendUrl = 'https://tracexdata-api.onrender.com';
    const endpoint = `${renderBackendUrl.replace(/\/$/, '')}/api/identity?key=TX-SYSTEM-INTERNAL-ADMIN&query=${encodeURIComponent(aadharNo)}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Engine returned status ${response.status}`);
    }

    const apiData = await response.json();
    if (apiData.status === 'success' && (apiData.results || apiData.raw_results)) {
      return { 
        status: true, 
        results: scrubBranding(apiData.results || {}), 
        raw_results: apiData.raw_results ? scrubBranding(apiData.raw_results) : undefined 
      };
    } else {
      return {
        status: false,
        results: {},
        error: apiData.message || apiData.error || 'No records found for this Identity Card.'
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
    const renderBackendUrl = 'https://tracexdata-api.onrender.com';
    const endpoint = `${renderBackendUrl.replace(/\/$/, '')}/api/bank?key=TX-SYSTEM-INTERNAL-ADMIN&query=${encodeURIComponent(ifsc)}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Engine returned status ${response.status}`);
    }

    const apiData = await response.json();
    if (apiData.status === 'success' && (apiData.results || apiData.raw_results)) {
      return { 
        status: true, 
        results: scrubBranding(apiData.results || {}), 
        raw_results: apiData.raw_results ? scrubBranding(apiData.raw_results) : undefined 
      };
    } else {
      return {
        status: false,
        results: {},
        error: apiData.message || apiData.error || 'No records found for this Bank/IFSC.'
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
  
  // 1. Check Cache first
  try {
    const { data: cachedData, error: cacheError } = await supabase
      .from('vehicle_search_results')
      .select('raw_data')
      .eq('vehicle_number', cleanVehicleNo)
      .maybeSingle();

    if (cachedData && !cacheError && cachedData.raw_data && Object.keys(cachedData.raw_data).length > 0) {
      console.log('Serving Vehicle from TRACEXDATA Cache...');
      return {
        status: true,
        results: scrubBranding(cachedData.raw_data)
      };
    }
  } catch (e) {
    console.error('Vehicle cache read failure:', e);
  }

  // 2. Query SaaS proxy with 3-times smart retry system
  console.log('Searching TRACEXDATA Vehicle Intelligence with up to 3 smart retries...');
  const maxTries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxTries; attempt++) {
    try {
      console.log(`Vehicle RC lookup attempt ${attempt} of ${maxTries}...`);
      const renderBackendUrl = 'https://tracexdata-api.onrender.com';
      const endpoint = `${renderBackendUrl.replace(/\/$/, '')}/api/vehicle?key=TX-SYSTEM-INTERNAL-ADMIN&query=${cleanVehicleNo}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch (e) { errorData = { error: errorText }; }
        throw new Error(errorData.error || errorData.message || `Engine returned status ${response.status}`);
      }

      const apiData = await response.json();
      
      // Mirror the precise, flexible results / raw_results checking logic from Aadhaar identity lookup
      if (apiData.status === 'success' && (apiData.results || apiData.raw_results)) {
        const cleanResults = scrubBranding(apiData.results || {});
        const cleanRawResults = apiData.raw_results ? scrubBranding(apiData.raw_results) : undefined;

        // Save cache in background if cleanResults has entries
        if (cleanResults && Object.keys(cleanResults).length > 0) {
          (async () => {
            try {
              await supabase.from('vehicle_search_results').upsert({
                vehicle_number: cleanVehicleNo,
                raw_data: cleanResults
              }, { onConflict: 'vehicle_number' });
            } catch (e) {
              console.error('Failed to cache Vehicle result:', e);
            }
          })();
        }

        return { 
          status: true, 
          results: cleanResults, 
          raw_results: cleanRawResults 
        };
      } else {
        return {
          status: false,
          results: {},
          error: apiData.message || apiData.error || 'No records found for this Vehicle Number.'
        };
      }
    } catch (error: any) {
      console.error(`Vehicle lookup attempt ${attempt} error:`, error);
      lastError = error;
      
      if (attempt < maxTries) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }

  return {
    status: false,
    results: {},
    error: lastError instanceof Error ? lastError.message : 'Server down after 3 retry attempts. Please try again later.'
  };
};

export const lookupPancard = async (pancardNo: string): Promise<ApiResponse> => {
  const cleanPancardNo = pancardNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  // Query SaaS proxy with 3-times smart retry system
  console.log('Searching TRACEXDATA PN Card Intelligence with up to 3 smart retries...');
  const maxTries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxTries; attempt++) {
    try {
      console.log(`PN Card lookup attempt ${attempt} of ${maxTries}...`);
      const renderBackendUrl = 'https://tracexdata-api.onrender.com';
      const endpoint = `${renderBackendUrl.replace(/\/$/, '')}/api/pancard?key=TX-SYSTEM-INTERNAL-ADMIN&query=${cleanPancardNo}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try { errorData = JSON.parse(errorText); } catch (e) { errorData = { error: errorText }; }
        throw new Error(errorData.error || errorData.message || `Engine returned status ${response.status}`);
      }

      const apiData = await response.json();
      
      // Mirror the precise, flexible results / raw_results checking logic from Aadhaar identity lookup
      if (apiData.status === 'success' && (apiData.results || apiData.raw_results)) {
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
          error: apiData.message || apiData.error || 'No records found for this PN Card.'
        };
      }
    } catch (error: any) {
      console.error(`PN Card lookup attempt ${attempt} error:`, error);
      lastError = error;
      
      if (attempt < maxTries) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }

  return {
    status: false,
    results: {},
    error: lastError instanceof Error ? lastError.message : 'Server down after 3 retry attempts. Please try again later.'
  };
};


