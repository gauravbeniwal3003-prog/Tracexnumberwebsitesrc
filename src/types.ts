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
  { id: 'c40', name: '40 Lookups', price: 20, type: 'credits', value: 40 },
  { id: 'c150', name: '150 Lookups', price: 50, type: 'credits', value: 150 },
  { id: 'c1000', name: '1000 Lookups', price: 250, type: 'credits', value: 1000 },
];

export const UNLIMITED_PLANS: PricingPlan[] = [
  { id: 'u1h', name: '1 Hour Unlimited', price: 49, type: 'unlimited', value: 1 },
  { id: 'u1d', name: '1 Day Unlimited', price: 79, type: 'unlimited', value: 24 },
  { id: 'u1w', name: '1 Week Unlimited', price: 449, type: 'unlimited', value: 168 },
  { id: 'u1m', name: '1 Month Unlimited', price: 1199, type: 'unlimited', value: 720 },
];

export const API_PLANS: PricingPlan[] = [
  { id: 'api_number', name: 'Number Lookup Plan', price: 400, type: 'unlimited', value: 720 },
  { id: 'api_telegram', name: 'Telegram Lookup Plan', price: 550, type: 'unlimited', value: 720 },
  { id: 'api_identity', name: 'Identity Card Lookup Plan', price: 500, type: 'unlimited', value: 720 },
  { id: 'api_bank', name: 'BA&NK Lookup Plan', price: 600, type: 'unlimited', value: 720 },
  { id: 'api_vehicle', name: 'Vehicle Lookup Plan', price: 499, type: 'unlimited', value: 720 },
  { id: 'api_pancard', name: 'PN Card Lookup Plan', price: 999, type: 'unlimited', value: 720 },
  { id: 'api_combo', name: 'All Combo Special', price: 1499, type: 'unlimited', value: 720 },
];

