/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  id: string;
  email: string;
  credits: number;
  unlimited_expiry: string | null; // ISO timestamp
  full_name?: string;
  avatar_url?: string;
  is_free_credit_claimed?: boolean;
  last_weekly_credit_at?: string | null; // ISO timestamp
  last_daily_credit_at?: string | null; // ISO timestamp
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  type: 'credits' | 'unlimited';
  value: number; // For credits, count; for unlimited, duration in hours
}

export const PROTECTION_PRICES = {
  mobile: 69,
  telegram: 79
};

export const CREDIT_PLANS: PricingPlan[] = [
  { id: 'c20', name: '30 Lookups (1.5X Offer!)', price: 20, type: 'credits', value: 30 },
  { id: 'c50', name: '75 Lookups (1.5X Offer!)', price: 50, type: 'credits', value: 75 },
  { id: 'c100', name: '150 Lookups (1.5X Offer!)', price: 100, type: 'credits', value: 150 },
  { id: 'c250', name: '412 Lookups (1.5X Offer!)', price: 250, type: 'credits', value: 412 },
  { id: 'c500', name: '900 Lookups (1.5X Offer!)', price: 500, type: 'credits', value: 900 },
  { id: 'c1000', name: '1950 Lookups (1.5X Offer!)', price: 1000, type: 'credits', value: 1950 },
];

export const UNLIMITED_PLANS: PricingPlan[] = [
  { id: 'u1h', name: '1 Hour Unlimited', price: 49, type: 'unlimited', value: 1 },
  { id: 'u1d', name: '1 Day Unlimited', price: 79, type: 'unlimited', value: 24 },
  { id: 'u1w', name: '1 Week Unlimited', price: 449, type: 'unlimited', value: 168 },
  { id: 'u1m', name: '1 Month Unlimited', price: 1199, type: 'unlimited', value: 720 },
];

export const API_PLANS: PricingPlan[] = [
  // Number lookup
  { id: 'api_number_20', name: 'Number Lookup (40 Lookups)', price: 20, type: 'credits', value: 40 },
  { id: 'api_number_50', name: 'Number Lookup (200 Lookups)', price: 50, type: 'credits', value: 200 },
  { id: 'api_number_150', name: 'Number Lookup (1 Week)', price: 150, type: 'unlimited', value: 168 },
  { id: 'api_number_400', name: 'Number Lookup (1 Month)', price: 400, type: 'unlimited', value: 720 },
  { id: 'api_number_1000', name: 'Number Lookup (3 Months)', price: 1000, type: 'unlimited', value: 2160 },
  { id: 'api_number_1600', name: 'Number Lookup (6 Months)', price: 1600, type: 'unlimited', value: 4320 },
  { id: 'api_number_3000', name: 'Number Lookup (1 Year)', price: 3000, type: 'unlimited', value: 8640 },

  // Telegram
  { id: 'api_telegram_20', name: 'Telegram Lookup (5 Lookups)', price: 20, type: 'credits', value: 5 },
  { id: 'api_telegram_50', name: 'Telegram Lookup (20 Lookups)', price: 50, type: 'credits', value: 20 },
  { id: 'api_telegram_200', name: 'Telegram Lookup (1 Week)', price: 200, type: 'unlimited', value: 168 },
  { id: 'api_telegram_650', name: 'Telegram Lookup (1 Month)', price: 650, type: 'unlimited', value: 720 },
  { id: 'api_telegram_1800', name: 'Telegram Lookup (3 Months)', price: 1800, type: 'unlimited', value: 2160 },

  // Identity
  { id: 'api_identity_20', name: 'Identity Card (5 Lookups)', price: 20, type: 'credits', value: 5 },
  { id: 'api_identity_50', name: 'Identity Card (30 Lookups)', price: 50, type: 'credits', value: 30 },
  { id: 'api_identity_150', name: 'Identity Card (1 Week)', price: 150, type: 'unlimited', value: 168 },
  { id: 'api_identity_450', name: 'Identity Card (1 Month)', price: 450, type: 'unlimited', value: 720 },
  { id: 'api_identity_1100', name: 'Identity Card (3 Months)', price: 1100, type: 'unlimited', value: 2160 },

  // Vehicle
  { id: 'api_vehicle_20', name: 'Vehicle Lookup (10 Lookups)', price: 20, type: 'credits', value: 10 },
  { id: 'api_vehicle_400', name: 'Vehicle Lookup (15 Days)', price: 400, type: 'unlimited', value: 360 },
  { id: 'api_vehicle_700', name: 'Vehicle Lookup (1 Month)', price: 700, type: 'unlimited', value: 720 },
  { id: 'api_vehicle_1800', name: 'Vehicle Lookup (3 Months)', price: 1800, type: 'unlimited', value: 2160 },

  // Bank
  { id: 'api_bank_20', name: 'BA&NK Lookup (20 Lookups)', price: 20, type: 'credits', value: 20 },
  { id: 'api_bank_70', name: 'BA&NK Lookup (1 Week)', price: 70, type: 'unlimited', value: 168 },
  { id: 'api_bank_250', name: 'BA&NK Lookup (1 Month)', price: 250, type: 'unlimited', value: 720 },
  { id: 'api_bank_600', name: 'BA&NK Lookup (3 Months)', price: 600, type: 'unlimited', value: 2160 },

  // Aadhaar to PAN
  { id: 'api_aadhaar_to_pan_1000', name: 'Aadhaar To PAN (10 Lookups)', price: 1000, type: 'credits', value: 10 },
  { id: 'api_aadhaar_to_pan_2000', name: 'Aadhaar To PAN (22 Lookups)', price: 2000, type: 'credits', value: 22 },
  { id: 'api_aadhaar_to_pan_5000', name: 'Aadhaar To PAN (60 Lookups)', price: 5000, type: 'credits', value: 60 },
  { id: 'api_aadhaar_to_pan_10000', name: 'Aadhaar To PAN (15 Days)', price: 10000, type: 'unlimited', value: 360 },

  // Email
  { id: 'api_email_20', name: 'Email Lookup (40 Lookups)', price: 20, type: 'credits', value: 40 },
  { id: 'api_email_50', name: 'Email Lookup (200 Lookups)', price: 50, type: 'credits', value: 200 },
  { id: 'api_email_350', name: 'Email Lookup (1 Month)', price: 350, type: 'unlimited', value: 720 },
];

export const SPECIAL_DEAL_PLAN: PricingPlan = {
  id: 'u1m_special200',
  name: 'Special Deal: 1 Month Unlimited',
  price: 200,
  type: 'unlimited',
  value: 720
};

