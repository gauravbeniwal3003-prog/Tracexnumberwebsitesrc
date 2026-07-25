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
 * - Always active for all users (50% off on All Plans).
 */
export function getOfferStatus(): OfferStatus {
  return {
    isActive: true,
    expiryTime: Date.now() + 86400000 * 7, // 7 days rolling
    label: "50% OFF SPECIAL OFFER"
  };
}

/**
 * Returns the price of a plan after applying any active discounts.
 * Calculates 50% discount (half price) for all plans.
 */
export function getPlanPrice(plan: { id: string; price: number } | PricingPlan): number {
  const status = getOfferStatus();
  if (status.isActive) {
    return Math.round(plan.price * 0.5);
  }
  return plan.price;
}

