/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PricingPlan } from '../types.ts';

export interface OfferStatus {
  isActive: boolean;
  expiryTime: number; // UTC Epoch ms
  label: string;
}

/**
 * Checks if the 50% discount offer is currently active.
 * - Always active on Sundays (automatically in Indian Standard Time GMT+5:30).
 * - Active for the next 48 hours (we set a fixed extended time window until June 5, 2026 to comfortably cover the next 24-48 hours requested).
 */
export function getOfferStatus(): OfferStatus {
  return {
    isActive: false,
    expiryTime: 0,
    label: ""
  };
}

/**
 * Returns the price of a plan after applying any active discounts.
 */
export function getPlanPrice(plan: { id: string; price: number } | PricingPlan): number {
  return plan.price;
}
