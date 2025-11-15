/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 *
 * Shared TypeScript interfaces and types used across the API
 */

/**
 * Environment variables required for the worker
 * Set via: wrangler secret put <KEY>
 */
export interface Env {
	CLERK_SECRET_KEY: string;           // Clerk secret key (sk_test_...)
	CLERK_PUBLISHABLE_KEY: string;      // Clerk publishable key (pk_test_...)
	STRIPE_SECRET_KEY: string;          // Stripe secret key (sk_test_...)
	STRIPE_WEBHOOK_SECRET?: string;     // Stripe webhook signing secret (whsec_...)
	STRIPE_PRICE_ID_PRO?: string;       // Stripe price ID for Pro tier
	STRIPE_PRICE_ID_DEVELOPER?: string; // Stripe price ID for Developer tier
	STRIPE_PORTAL_CONFIG_ID?: string;   // OPTIONAL: Stripe portal configuration ID (bpc_...)
	ALLOWED_ORIGINS?: string;           // OPTIONAL: Comma-separated list of allowed origins
	                                     // Example: "https://app.example.com,https://staging.example.com"
	                                     // If not set, falls back to defaults (see CORS middleware)
	USAGE_KV: KVNamespace;              // KV namespace binding (set in wrangler.toml)
	CLERK_JWT_TEMPLATE: string;         // JWT template name (e.g., "pan-api")
}

/**
 * Usage data structure stored in KV
 * Key format: `usage:{userId}`
 * TTL: None (persists forever, resets monthly for free tier)
 */
export interface UsageData {
	usageCount: number;        // Number of requests made in current period
	plan: PlanTier;            // User's current plan (synced from Clerk metadata)
	lastUpdated: string;       // ISO timestamp of last update
	periodStart?: string;      // Billing period start (YYYY-MM-DD)
	periodEnd?: string;        // Billing period end (YYYY-MM-DD)
}

/**
 * Tier configuration - defines limits and pricing for all tiers
 */
export type PlanTier = 'free' | 'pro' | 'developer';

/**
 * Tier configuration object
 */
export interface TierConfig {
	name: string;
	price: number;
	limit: number;
}
