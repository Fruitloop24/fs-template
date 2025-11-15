/**
 * ============================================================================
 * PRICING TIER CONFIGURATION
 * ============================================================================
 *
 * Defines limits, pricing, and Stripe price IDs for all subscription tiers
 */

import { Env, TierConfig } from '../types';

/**
 * Tier configuration - defines limits and pricing for all tiers
 *
 * HOW TO ADD A NEW TIER:
 * 1. Add tier name to PlanTier type in types.ts
 * 2. Add configuration here with name, price, and limit
 * 3. Create Stripe price in dashboard for new tier
 * 4. Add price ID mapping to PRICE_ID_MAP below
 * 5. Update frontend tier displays (Landing.tsx, ChoosePlanPage.tsx, Dashboard.tsx)
 *
 * EXAMPLE:
 * starter: {
 *   name: 'Starter',
 *   price: 19,
 *   limit: 50  // 50 requests/month
 * }
 */
export const TIER_CONFIG: Record<string, TierConfig> = {
	free: {
		name: 'Free',
		price: 0,
		limit: 6          // 6 requests/month
	},
	pro: {
		name: 'Pro',
		price: 29,
		limit: 10         // 10 requests/month
	},
	developer: {
		name: 'Developer',
		price: 50,
		limit: Infinity   // Unlimited requests
	}
};

/**
 * Map tier names to Stripe Price IDs from environment variables
 *
 * WHY THIS EXISTS:
 * - Price IDs are secrets (set via wrangler secret put)
 * - Different environments (dev/prod) use different price IDs
 * - This maps tier name → env variable → actual Stripe price ID
 *
 * HOW TO ADD NEW TIER PRICE ID:
 * 1. Add mapping here: tierName: (env) => env.STRIPE_PRICE_ID_TIERNAME
 * 2. Add env variable to Env interface in types.ts
 * 3. Set secret: wrangler secret put STRIPE_PRICE_ID_TIERNAME
 *
 * NOTE: Free tier doesn't need a price ID (no payment required)
 */
export const PRICE_ID_MAP: Record<string, (env: Env) => string> = {
	pro: (env) => env.STRIPE_PRICE_ID_PRO || '',
	developer: (env) => env.STRIPE_PRICE_ID_DEVELOPER || ''
};

/**
 * Rate limit (requests per minute, applies to ALL users)
 *
 * WHAT THIS PREVENTS:
 * - Abuse (scrapers, bots)
 * - DDoS attempts from authenticated users
 * - Accidental infinite loops in client code
 *
 * HOW TO CHANGE:
 * - Modify this constant
 * - Example: export const RATE_LIMIT_PER_MINUTE = 200; // 200 req/min
 *
 * HOW TO MAKE PER-TIER RATE LIMITS:
 * 1. Change to object: { free: 60, pro: 200, developer: 500 }
 * 2. Update checkRateLimit in services/rateLimit.ts to accept plan parameter
 * 3. Use: const limit = RATE_LIMIT_PER_MINUTE[plan]
 */
export const RATE_LIMIT_PER_MINUTE = 100;
