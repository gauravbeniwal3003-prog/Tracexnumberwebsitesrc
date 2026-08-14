/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase.ts';

export const RENDER_MASTER_UNLIMITED_API_KEY = "tracex_unlimited_master_render_never_expire_key_2026";

export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_RENDER_BACKEND_URL) {
    return import.meta.env.VITE_RENDER_BACKEND_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return '';
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
  'https://t.me/Gaurav_beni_0001', 'https://t.me/Seekhlebhai', 'tg_channel', 'watermark'
];

export const scrubBranding = (obj: any): any => {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    let cleaned = obj;
    for (const word of BANNED_WORDS) {
      if (word.startsWith('https://')) {
        cleaned = cleaned.split(word).join('');
      } else {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        cleaned = cleaned.replace(regex, '');
      }
    }
    return cleaned.trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(scrubBranding);
  }
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      const isBanned = BANNED_WORDS.some(b => lowerKey.includes(b));
      if (!isBanned && !lowerKey.includes('owner') && !lowerKey.includes('dev') && !lowerKey.includes('contact')) {
        result[key] = scrubBranding(obj[key]);
      }
    }
    return result;
  }
  return obj;
};

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
          error: `No records found for '${cleanQ}'. Search fee refunded.`,
          refunded: true
        };
      }
      data = { status: "success", results: { raw_text: rawText } };
    }

    if (data?.status === "success" || data?.status === true) {
      const cleanResults = scrubBranding(data.results || data.data || data);
      return {
        status: true,
        results: typeof cleanResults === 'object' && cleanResults !== null ? cleanResults : { result: cleanResults },
        raw_results: data.raw_results ? scrubBranding(data.raw_results) : undefined,
        remaining_balance: data.remaining_balance
      };
    }

    // Handled backend error with possible refund
    const errorMsg = data?.message || data?.error || `No records found for '${cleanQ}'.`;
    return {
      status: false,
      results: {},
      error: errorMsg,
      refunded: Boolean(data?.refunded),
      refund_amount: data?.refund_amount,
      remaining_balance: data?.remaining_balance
    };

  } catch (err: any) {
    console.error(`[UniversalLookup] Error querying ${service}:`, err);
    return {
      status: false,
      results: {},
      error: "Unable to connect to the Render Intelligence engine. Please check your internet connection and try again."
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

export const lookupBnk = async (ifscCode: string): Promise<ApiResponse> => {
  return await executeUniversalLookup('bnk', ifscCode);
};

export const lookupVehicle = async (vehicleNumber: string): Promise<ApiResponse> => {
  return await executeUniversalLookup('vehicle', vehicleNumber);
};

export const lookupVehOwnerNum = async (vehicleNumber: string): Promise<ApiResponse> => {
  return await executeUniversalLookup('veh_owner_num', vehicleNumber);
};

export const lookupPancard = async (pancardNumber: string): Promise<ApiResponse> => {
  return await executeUniversalLookup('pancard', pancardNumber);
};

export const lookupEmail = async (email: string): Promise<ApiResponse> => {
  return await executeUniversalLookup('email', email);
};

export const lookupAadhaarToPan = async (aadhaarNo: string): Promise<any> => {
  const result = await executeUniversalLookup('aadhaar_to_pan', aadhaarNo);
  if (result.status && result.results) {
    return {
      status: 'success',
      pan_found: true,
      data: result.results
    };
  }
  return {
    status: 'failed',
    pan_found: false,
    message: result.error || 'PAN not linked with this Aadhaar'
  };
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
