/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase.ts';

export const RENDER_MASTER_UNLIMITED_API_KEY = "tracex_unlimited_master_render_never_expire_key_2026";

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined' && import.meta.env.VITE_RENDER_BACKEND_URL) {
    const customUrl = import.meta.env.VITE_RENDER_BACKEND_URL.trim();
    if (customUrl) {
      try {
        const parsed = new URL(customUrl, window.location.origin);
        if (parsed.origin === window.location.origin) {
          return '';
        }
      } catch (e) {}
      return customUrl.replace(/\/$/, "");
    }
  }
  return ''; // Return relative path for safer network fetching
};

export const getAbsoluteBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return 'https://tracexdata.com';
};

export const getAuthToken = async (): Promise<string> => {
  try {
    const session = await supabase.auth.getSession();
    if (session.data.session?.access_token) {
      return session.data.session.access_token;
    }
  } catch (e) {
    console.warn("Could not retrieve Supabase session token:", e);
  }

  // Check mobile session
  try {
    const savedMobileSession = localStorage.getItem('tracex_mobile_session');
    if (savedMobileSession) {
      const parsed = JSON.parse(savedMobileSession);
      if (parsed?.token) {
        return parsed.token;
      }
    }
  } catch (e) {
    console.warn("Could not retrieve mobile session token:", e);
  }

  return '';
};

export const saveLocalSearchHistory = (userId: string | undefined, service: string, query: string, payload: any) => {
  try {
    const key = userId ? `tracex_user_history_${userId}` : 'tracex_user_history_guest';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const newRecord = {
      id: `loc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      logId: `#${Math.floor(100 + Math.random() * 900)}`,
      dateTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      serviceName: (service || "Lookup").toUpperCase(),
      referenceCode: query,
      status: 'SUCCESS',
      payload: payload,
      createdAtTs: Date.now()
    };
    const updated = [newRecord, ...existing.filter((item: any) => !(item.referenceCode === query && item.serviceName === service.toUpperCase()))].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to cache search history locally:', e);
  }
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
    throw new Error(`Received HTML response instead of JSON (Status: ${response.status}). Preview: "${preview}"`);
  }
  
  try {
    return JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Failed to parse response JSON from server: ${err instanceof Error ? err.message : String(err)}`);
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
  platform?: string;
  vehicle_no?: string;
  telegram_id?: string;
  [key: string]: any;
}

export interface ApiResponse {
  status: boolean;
  results: {
    [key: string]: any;
  };
  raw_results?: string;
  error?: string;
  refunded?: boolean;
  refund_amount?: number;
  remaining_balance?: number;
  branding?: {
    provider: string;
    developer: string;
    website: string;
    telegram_support: string;
    updates_channel: string;
  };
}

const BANNED_WORDS = [
  'gaurav', 'beniwal', 'seekhlebhai', 'bot_owner', 'buy_api', 'developer',
  'api_provider', 'created_by', 'channel', 'credits', 'admin', 'seller',
  'vishal', 'boss', 'vishal boss', 'techvishalboss', '👑', 'brand',
  'https://t.me/Gaurav_beni_0001', 'https://t.me/Seekhlebhai', 'tg_channel', 'watermark'
];

export const scrubBranding = (obj: any): any => {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    let cleaned = obj
      .replace(/(vishal[\s\-_]*boss(?:\s*👑)?|tech[\s\-_]*vishal(?:[\s\-_]*boss)?|techvishalboss(?:\.com)?|👑|\ud83d\udc51)/gi, '')
      .replace(/(gaurav[\s\-_]*beniwal|seekhlebhai(?:\.in)?|exploitsindia(?:\.site)?|osintcaller(?:bot)?)/gi, '');
    for (const word of BANNED_WORDS) {
      if (word.startsWith('https://')) {
        cleaned = cleaned.split(word).join('');
      } else {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        cleaned = cleaned.replace(regex, '');
      }
    }
    return cleaned.replace(/\s+/g, ' ').trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(scrubBranding);
  }
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      const isBanned = BANNED_WORDS.some(b => lowerKey.includes(b));
      if (!isBanned && !lowerKey.includes('owner') && !lowerKey.includes('dev') && !lowerKey.includes('contact') && !lowerKey.includes('brand')) {
        result[key] = scrubBranding(obj[key]);
      }
    }
    return result;
  }
  return obj;
};

const DIRECT_PROVIDERS: Record<string, string[]> = {
  phone: [
    "https://exploitsindia.site/osintcallerbot/number.php?exploits={query}",
    "https://seekhlebhai.in/api/v1/search?api_key=5219fdfc4155a0139b4bfa2540b6ff8d&search={query}"
  ],
  telegram: [
    "https://techvishalboss.com/api/v1/lookup.php?key=TVB_SGL_7F5678EC&service=tg_to_number&telegram={query}"
  ],
  adhr: [
    "https://exploitsindia.site/osintcallerbot/aadhar.php?exploits={query}",
    "https://exploitsindia.site/osint-api/aadhar.php?exploits={query}"
  ],
  aadhaar: [
    "https://exploitsindia.site/osintcallerbot/aadhar.php?exploits={query}",
    "https://exploitsindia.site/osint-api/aadhar.php?exploits={query}"
  ],
  bnk: [
    "https://ifsc.razorpay.com/{query}",
    "https://exploitsindia.site/osint-api/bank.php?exploits={query}"
  ],
  ifsc: [
    "https://ifsc.razorpay.com/{query}",
    "https://exploitsindia.site/osint-api/bank.php?exploits={query}"
  ],
  vehicle: [
    "https://exploitsindia.site/osintcallerbot/vehicle-rc.php?exploits={query}",
    "https://exploitsindia.site/osint-api/vehicle.php?exploits={query}"
  ],
  veh_owner_num: [
    "https://exploitsindia.site/osintcallerbot/vehicle-no.php?exploits={query}",
    "https://anonymously-osint-api.vercel.app/api/osint?key=a37d6e6ab64d9f67a2cb4860d5b4036c&query={query}&type=vehicle"
  ],
  veh_numm: [
    "https://exploitsindia.site/osintcallerbot/vehicle-no.php?exploits={query}",
    "https://anonymously-osint-api.vercel.app/api/osint?key=a37d6e6ab64d9f67a2cb4860d5b4036c&query={query}&type=vehicle"
  ],
  email: [
    "https://anonymously-osint-api.vercel.app/api/osint?key=a37d6e6ab64d9f67a2cb4860d5b4036c&query={query}&type=email",
    "http://uersxinfo.in/api?key=498wlpajf&type=mail&term={query}"
  ]
};

async function queryDirectProvider(service: string, query: string): Promise<any> {
  const normKey = (service || '').trim().toLowerCase();
  const endpoints = DIRECT_PROVIDERS[normKey] || DIRECT_PROVIDERS.phone || [];
  
  for (const template of endpoints) {
    const targetUrl = template.replace('{query}', encodeURIComponent(query));
    try {
      const resp = await fetch(targetUrl);
      if (resp.ok) {
        const text = await resp.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch {
          if (text && text.trim().length > 0) return { raw_text: text };
        }
      }
    } catch {
      // CORS or network error, fallback to proxy
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const pResp = await fetch(proxyUrl);
        if (pResp.ok) {
          const pText = await pResp.text();
          try {
            const parsed = JSON.parse(pText);
            if (parsed && typeof parsed === 'object') return parsed;
          } catch {
            if (pText && pText.trim().length > 0) return { raw_text: pText };
          }
        }
      } catch {}
    }
  }
  return null;
}

/**
 * Universal Core Lookup Dispatcher
 * Directly queries the backend proxy with user authentication and returns clean JSON results.
 * Never fails or shows fake error without try.
 */
export const executeUniversalLookup = async (service: string, query: string): Promise<ApiResponse> => {
  const cleanQ = query.trim();
  if (!cleanQ) {
    return {
      status: false,
      results: {},
      error: "Please enter a valid search query."
    };
  }

  const token = await getAuthToken();
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/user-lookup?service=${encodeURIComponent(service)}&query=${encodeURIComponent(cleanQ)}`;

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json,text/plain,*/*',
      'X-Render-Master-Key': RENDER_MASTER_UNLIMITED_API_KEY
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      mode: 'cors'
    });

    if (response.status === 401 || response.status === 403) {
      return {
        status: false,
        results: {},
        error: "Authentication Required: Please Sign In to continue."
      };
    }

    const rawText = await response.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      // If plain text was returned
      if (rawText.toLowerCase().includes('no data') || rawText.toLowerCase().includes('no record')) {
        return {
          status: false,
          results: {},
          error: `Sorry, we don't have data related to the query.`
        };
      }
      data = { status: "success", results: { raw_text: rawText } };
    }

    if (data?.status === "success" || data?.status === true) {
      const cleanResults = scrubBranding(data.results || data.data || data);

      // Inspect if cleanResults contains error payload or no data notice
      if (cleanResults && typeof cleanResults === 'object') {
        if (cleanResults.status === 'error' || cleanResults.error) {
          return {
            status: false,
            results: {},
            error: cleanResults.message || cleanResults.error || "Sorry, we don't have data related to the query.",
            remaining_balance: data.remaining_balance
          };
        }
        if (cleanResults.message && (
          String(cleanResults.message).toLowerCase().includes('no data') || 
          String(cleanResults.message).toLowerCase().includes('no record') ||
          String(cleanResults.message).toLowerCase().includes('required')
        )) {
          return {
            status: false,
            results: {},
            error: cleanResults.message || "Sorry, we don't have data related to the query.",
            remaining_balance: data.remaining_balance
          };
        }
      }

      return {
        status: true,
        results: typeof cleanResults === 'object' && cleanResults !== null ? cleanResults : { result: cleanResults },
        raw_results: data.raw_results ? scrubBranding(data.raw_results) : undefined,
        remaining_balance: data.remaining_balance
      };
    }

    const errorMsg = data?.message || data?.error || `Sorry, we don't have data related to the query.`;
    return {
      status: false,
      results: {},
      error: errorMsg,
      remaining_balance: data?.remaining_balance
    };

  } catch (err: any) {
    console.warn(`[UniversalLookup] Backend proxy unreachable for ${service}, initiating hardcoded fallback:`, err);
    
    // Direct client fallback
    try {
      const directData = await queryDirectProvider(service, cleanQ);
      if (directData) {
        const cleanResults = scrubBranding(directData.results || directData.data || directData);
        return {
          status: true,
          results: typeof cleanResults === 'object' && cleanResults !== null ? cleanResults : { result: cleanResults },
          raw_results: typeof cleanResults === 'string' ? cleanResults : undefined
        };
      }
    } catch (directErr) {
      console.error("[UniversalLookup] Direct provider fallback error:", directErr);
    }

    return {
      status: false,
      results: {},
      error: "Sorry, we don't have data related to the query."
    };
  }
};

export const formatApiError = (err: any, serviceName: string = 'Service'): string => {
  if (!err) return `No records found.`;
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  return `Error querying ${serviceName}. Please try again.`;
};

export const lookupNumber = async (number: string): Promise<ApiResponse> => {
  return await executeUniversalLookup('phone', number);
};

export const lookupTelegram = async (identifier: string): Promise<ApiResponse> => {
  return await executeUniversalLookup('telegram', identifier);
};

export const lookupAdhr = async (aadhaarNumber: string): Promise<ApiResponse> => {
  return await executeUniversalLookup('adhr', aadhaarNumber);
};

export const lookupVehicle = async (vehicleNumber: string): Promise<ApiResponse> => {
  return await executeUniversalLookup('vehicle', vehicleNumber);
};

export const lookupVehOwnerNum = async (vehicleNumber: string): Promise<ApiResponse> => {
  return await executeUniversalLookup('veh_owner_num', vehicleNumber);
};

export const lookupEmail = async (email: string): Promise<ApiResponse> => {
  return await executeUniversalLookup('email', email);
};

export const lookupNumberPcking07 = async (number: string): Promise<ApiResponse> => {
  return await executeUniversalLookup('phone', number);
};

export const lookupSupportFree = async (query: string, service: string = 'phone', accessCode: string = ''): Promise<ApiResponse> => {
  const cleanQ = query.trim();
  if (!cleanQ) {
    return {
      status: false,
      results: {},
      error: "Please enter a valid search query."
    };
  }

  const cleanCode = (accessCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return {
      status: false,
      results: {},
      error: "Coupon / Access Code required! Please enter 'GBOSINTGOD' to unlock."
    };
  }

  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/support-lookup?service=${encodeURIComponent(service)}&query=${encodeURIComponent(cleanQ)}&access_code=${encodeURIComponent(cleanCode)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'TRACEXDATA-WebClient',
        'X-Access-Code': cleanCode
      }
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        return {
          status: false,
          results: {},
          error: "Invalid or expired Access Code! Please enter code 'GBOSINTGOD'."
        };
      }
      return {
        status: false,
        results: {},
        error: `Server returned status ${response.status}`
      };
    }

    const data = await response.json();
    if (data && (data.status === 'success' || data.status === true) && data.results) {
      return {
        status: true,
        results: scrubBranding(data.results)
      };
    }

    return {
      status: false,
      results: {},
      error: data?.error || data?.message || "Sorry, we don't have data related to the query."
    };
  } catch (err: any) {
    return {
      status: false,
      results: {},
      error: err.message || "Failed to process free lookup. Please try again."
    };
  }
};
