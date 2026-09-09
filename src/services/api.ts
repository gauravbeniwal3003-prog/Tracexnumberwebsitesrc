/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase.ts';

export const RENDER_MASTER_UNLIMITED_API_KEY = "tracex_unlimited_master_render_never_expire_key_2026";
export const RENDER_BACKEND_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_RENDER_BACKEND_URL) || 
  "https://tracexdata-api.onrender.com"
).trim().replace(/\/$/, "");

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // When running in AI Studio preview, pre-production, Cloud Run, localhost, or standard web origins
    if (
      hostname.includes('ais-dev') ||
      hostname.includes('ais-pre') ||
      hostname.includes('run.app') ||
      hostname.includes('aistudio') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      !hostname
    ) {
      return '';
    }
  }
  // Default to relative root (the full-stack app server on port 3000)
  return '';
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
      if (parsed?.user) {
        return `local_tok_${parsed.user.phone || parsed.user.id || 'user'}_${Date.now()}`;
      }
    }
  } catch (e) {
    console.warn("Could not retrieve mobile session token:", e);
  }

  try {
    const loginTime = localStorage.getItem('tracex_login_time');
    if (loginTime) {
      return `local_tok_user_${loginTime}`;
    }
  } catch (e) {}

  return 'local_tok_guest_session';
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
  'vishal', 'boss', 'vishal boss', 'techvishalboss', '👑', 'brand', 'digiseva', 'digisevapoint',
  'https://t.me/Gaurav_beni_0001', 'https://t.me/Seekhlebhai', 'https://digisevapoint.com', '@Techvishalboss', 'tg_channel', 'watermark'
];

export const scrubBranding = (obj: any): any => {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    let cleaned = obj
      .replace(/(while\s+result\s*(?:-\s*)?(?:https?:\/\/(?:www\.)?)?digisevapoint\.com)/gi, '')
      .replace(/while\s+result\s*(?:-\s*)?/gi, '')
      .replace(/(vishal[\s\-_]*boss(?:\s*👑)?|tech[\s\-_]*vishal(?:[\s\-_]*boss)?|techvishalboss(?:\.com)?|digi[\s\-_]*seva(?:point)?(?:\.in|\.com)?|@?digiseva(?:point)?|👑|\ud83d\udc51)/gi, '')
      .replace(/(gaurav[\s\-_]*beniwal|seekhlebhai(?:\.in)?|exploitsindia(?:\.site)?|osintcaller(?:bot)?)/gi, '');
    for (const word of BANNED_WORDS) {
      if (word.startsWith('https://') || word.startsWith('@')) {
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
      if (!isBanned && !lowerKey.includes('owner') && !lowerKey.includes('dev') && !lowerKey.includes('contact') && !lowerKey.includes('brand') && !lowerKey.includes('branding')) {
        result[key] = scrubBranding(obj[key]);
      }
    }
    return result;
  }
  return obj;
};

/**
 * Direct High-Speed Provider Fallback Engine
 * Queries verified upstream providers directly if backend is cold, slow, or challenged.
 */
export const queryDirectProviderFallback = async (service: string, query: string): Promise<any> => {
  const sKey = (service || '').trim().toLowerCase();
  const cleanQ = query.trim();

  // 1. Phone / Number / Mobile
  if (sKey === 'phone' || sKey === 'mobile' || sKey === 'number') {
    const directUrl = `https://techvishalboss.com/api/v1/lookup.php?key=TVB_SGL_EBB13EBC&service=number&number=${encodeURIComponent(cleanQ)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const resp = await fetch(directUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) return null;
      const text = await resp.text();
      try {
        const json = JSON.parse(text);
        return json;
      } catch {
        return null;
      }
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  // 2. IFSC / Bank
  if (sKey === 'ifsc' || sKey === 'bnk' || sKey === 'bank') {
    const directUrl = `https://ifsc.razorpay.com/${encodeURIComponent(cleanQ)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const resp = await fetch(directUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) return null;
      const json = await resp.json();
      return { status: "success", results: json };
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  return null;
};

/**
 * Universal Core Lookup Dispatcher
 * Resilient multi-tier query engine with strict timeout protection and zero-stall guarantee.
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
  const primaryUrl = `${baseUrl.replace(/\/$/, "")}/api/user-lookup`;
  const renderFallbackUrl = `${RENDER_BACKEND_URL}/api/user-lookup`;

  const headers: Record<string, string> = {
    'Accept': 'application/json,text/plain,*/*',
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const performFetch = async (targetUrl: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9500); // 9.5-second strict timeout

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ service, query: cleanQ }),
        mode: 'cors',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const rawText = await response.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        // If HTML or error page was returned from static host or proxy failure
        if (
          rawText.toLowerCase().includes('<!doctype') || 
          rawText.toLowerCase().includes('<html') || 
          rawText.toLowerCase().includes('error: page not found') ||
          rawText.toLowerCase().includes('404 page not found') ||
          rawText.toLowerCase().includes('just a moment') ||
          rawText.toLowerCase().includes('cloudflare')
        ) {
          throw new Error(`Endpoint returned non-JSON/Challenge response from ${targetUrl}`);
        }
        if (rawText.toLowerCase().includes('no data') || rawText.toLowerCase().includes('no record')) {
          return {
            status: false,
            results: {},
            error: `Sorry, we don't have data related to the query.`
          };
        }
        data = { status: "success", results: { raw_text: rawText } };
      }

      if (!response.ok && (data?.error || data?.message)) {
        return {
          status: false,
          results: {},
          error: data.message || data.error || "Lookup request could not be completed. Please try again."
        };
      }

      return data;
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      throw fetchErr;
    }
  };

  try {
    let data: any = null;

    // 1. Try primary endpoint first (with 9.5s timeout)
    try {
      data = await performFetch(primaryUrl);
    } catch (primaryErr) {
      console.warn(`[UniversalLookup] Primary endpoint (${primaryUrl}) failed/timed out:`, primaryErr);
      // If primary endpoint failed and fallback URL is different, try fallback
      if (primaryUrl !== renderFallbackUrl) {
        try {
          console.log(`[UniversalLookup] Seamlessly falling back to Render server: ${renderFallbackUrl}`);
          data = await performFetch(renderFallbackUrl);
        } catch (fallbackErr) {
          console.warn(`[UniversalLookup] Render fallback server also failed/timed out:`, fallbackErr);
        }
      }
    }

    // 2. If backend was slow, unresponsive, failed, returned non-JSON, or rate-limited:
    // ENGAGE DIRECT HIGH-SPEED PROVIDER RESCUE IMMEDIATELY!
    if (!data || data.status === false || data.status === "error") {
      try {
        console.log(`[UniversalLookup] Backend slow or challenged. Engaging fast direct provider rescue...`);
        const directData = await queryDirectProviderFallback(service, cleanQ);
        if (directData && (directData.status === "success" || directData.status === true || directData.results)) {
          data = directData;
        }
      } catch (rescueErr) {
        console.warn(`[UniversalLookup] Direct rescue failed:`, rescueErr);
      }
    }

    if (data?.status === "success" || data?.status === true || data?.results || data?.result) {
      let extractedResults = data.results || data.data || data.result || data;
      if (extractedResults?.status === "success" && extractedResults?.results) {
        extractedResults = extractedResults.results;
      }
      const cleanResults = scrubBranding(extractedResults);

      if (data?.results_found === 0 || !cleanResults || (Array.isArray(cleanResults) && cleanResults.length === 0)) {
        return {
          status: false,
          results: {},
          error: data.message || "Sorry, we don't have data related to the query.",
          remaining_balance: data.remaining_balance
        };
      }

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

      // If remaining_balance was not provided (e.g. rescued directly via direct provider fallback),
      // asynchronously inform the backend to log transaction and deduct wallet credits in database
      let resolvedRemainingBalance = data.remaining_balance;
      if (resolvedRemainingBalance === undefined && token) {
        try {
          fetch('/api/wallet/deduct-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ service, query: cleanQ, cost: 2.0 })
          }).then(res => res.json()).then(deductRes => {
            if (deductRes && deductRes.remaining_balance !== undefined) {
              // Dispatched deduction
            }
          }).catch(() => {});
        } catch (e) {}
      }

      return {
        status: true,
        results: typeof cleanResults === 'object' && cleanResults !== null ? cleanResults : { result: cleanResults },
        raw_results: data.raw_results ? scrubBranding(data.raw_results) : (typeof cleanResults === 'string' ? cleanResults : undefined),
        remaining_balance: resolvedRemainingBalance
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
    console.error(`[UniversalLookup] Query failed:`, err);
    try {
      const rescueData = await queryDirectProviderFallback(service, cleanQ);
      if (rescueData) {
        const cleanResults = scrubBranding(rescueData.results || rescueData);
        return {
          status: true,
          results: typeof cleanResults === 'object' && cleanResults !== null ? cleanResults : { result: cleanResults },
          raw_results: rescueData.raw_results ? scrubBranding(rescueData.raw_results) : undefined
        };
      }
    } catch {}

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

export const lookupIfsc = async (ifscCode: string): Promise<ApiResponse> => {
  return await executeUniversalLookup('bnk', ifscCode);
};

export const lookupBank = async (ifscCode: string): Promise<ApiResponse> => {
  return await executeUniversalLookup('bnk', ifscCode);
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

export interface CashfreeOrderParams {
  userId?: string;
  userEmail?: string;
  planId: string;
  amount: number;
  customerPhone?: string;
  customerName?: string;
  returnUrl: string;
}

export const ensureCashfreeSdkLoaded = async (): Promise<any> => {
  if (typeof window === 'undefined') return null;
  if ((window as any).Cashfree) return (window as any).Cashfree;

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="cashfree.js"]');
    if (existingScript) {
      if ((window as any).Cashfree) {
        return resolve((window as any).Cashfree);
      }
      existingScript.addEventListener('load', () => resolve((window as any).Cashfree));
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Cashfree Payment SDK.')));
      setTimeout(() => {
        if ((window as any).Cashfree) resolve((window as any).Cashfree);
      }, 700);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve((window as any).Cashfree);
    script.onerror = () => reject(new Error('Failed to load Cashfree Payment SDK. Please check your internet connection.'));
    document.head.appendChild(script);
  });
};

export const initiateCashfreeCheckout = async (params: CashfreeOrderParams): Promise<{ order_id: string; payment_session_id: string; [key: string]: any }> => {
  const rawPhone = params.customerPhone || '';
  const cleanPhoneDigits = String(rawPhone).replace(/\D/g, '').slice(-10);
  const cleanPhone = cleanPhoneDigits.length === 10 ? cleanPhoneDigits : '9999999999';

  const cleanEmail = (params.userEmail && params.userEmail.includes('@')) 
    ? params.userEmail.trim() 
    : `${cleanPhone}@tracexdata.online`;

  const cleanName = params.customerName?.trim() || cleanEmail.split('@')[0] || 'Customer';

  const numAmount = Number(params.amount);
  if (isNaN(numAmount) || numAmount < 50) {
    throw new Error('Minimum recharge amount is ₹50.');
  }

  const payload = {
    user_id: params.userId || `user_${cleanPhone}`,
    user_email: cleanEmail,
    plan_id: params.planId,
    amount: numAmount,
    customer_phone: cleanPhone,
    customer_name: cleanName,
    return_url: params.returnUrl
  };

  const token = await getAuthToken().catch(() => '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let orderData: any = null;
  let lastError = '';

  // Step 1: Try current origin endpoint first
  try {
    const localRes = await fetch('/api/cashfree/create-order', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const rawText = await localRes.text();
    try {
      orderData = JSON.parse(rawText);
    } catch (e) {
      lastError = `Server response: ${rawText.slice(0, 150)}`;
    }

    if (!localRes.ok || !orderData?.payment_session_id) {
      if (orderData?.error) lastError = orderData.error;
      orderData = null; // trigger fallback
    }
  } catch (err: any) {
    lastError = err.message;
  }

  // Step 2: Fallback seamlessly to the live Render backend if local server had an issue
  if (!orderData || !orderData.payment_session_id) {
    try {
      const fallbackRes = await fetch('https://tracexdata-api.onrender.com/api/cashfree/create-order', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const rawText = await fallbackRes.text();
      try {
        orderData = JSON.parse(rawText);
      } catch (e) {
        throw new Error(lastError || `Payment gateway gateway temporarily unavailable (${fallbackRes.status})`);
      }
      if (!fallbackRes.ok || !orderData?.payment_session_id) {
        throw new Error(orderData?.error || orderData?.detail || lastError || `Payment gateway response error (${fallbackRes.status})`);
      }
    } catch (fallbackErr: any) {
      throw new Error(fallbackErr.message || lastError || 'Payment gateway connection error. Please try again.');
    }
  }

  if (!orderData?.payment_session_id) {
    throw new Error(orderData?.error || 'Payment gateway session could not be established. Please try again.');
  }

  // Save pending order locally for recovery/auto-reconciliation
  if (orderData.order_id) {
    try {
      localStorage.setItem('tracex_last_pending_order', JSON.stringify({
        orderId: orderData.order_id,
        amount: numAmount,
        planId: params.planId,
        createdAt: Date.now()
      }));
    } catch (e) {}
  }

  // Ensure Cashfree SDK is loaded
  const CashfreeSdk = await ensureCashfreeSdkLoaded();
  if (!CashfreeSdk) {
    throw new Error('Cashfree Payment Gateway SDK failed to initialize. Please check your internet connection and refresh.');
  }

  const cashfreeMode = orderData.cf_mode || 'production';
  const cashfreeInstance = CashfreeSdk({
    mode: cashfreeMode
  });

  await cashfreeInstance.checkout({
    paymentSessionId: orderData.payment_session_id,
    redirectTarget: '_self'
  });

  return orderData;
};

export const checkCashfreeOrderStatus = async (orderId: string): Promise<any> => {
  if (!orderId) throw new Error("Order ID is required");
  
  // Try current host endpoint first
  try {
    const res = await fetch(`/api/cashfree/status/${encodeURIComponent(orderId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.order_status || data.status)) return data;
    }
  } catch (e) {}

  // Fallback directly to Render backend
  const fallbackRes = await fetch(`https://tracexdata-api.onrender.com/api/cashfree/status/${encodeURIComponent(orderId)}`);
  if (!fallbackRes.ok) {
    const err = await fallbackRes.json().catch(() => ({}));
    throw new Error(err.error || `Status check failed: ${fallbackRes.status}`);
  }
  return await fallbackRes.json();
};

