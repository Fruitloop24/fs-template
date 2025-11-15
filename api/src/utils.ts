/**
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 *
 * General helper functions used across the API
 */

import { Env } from './types';

/**
 * Validates that all required environment variables are set
 *
 * IMPORTANT: Cloudflare Workers don't have a "startup" phase like traditional
 * servers. Validation runs on first request. If you need to validate earlier,
 * use a test script that hits /health endpoint after deployment.
 *
 * @param env - Environment variables passed to fetch handler
 * @returns Object with validation status and list of missing variables
 *
 * HOW TO ADD NEW REQUIRED ENV VAR:
 * 1. Add to Env interface in types.ts
 * 2. Add to 'required' array below
 * 3. Set via: wrangler secret put NEW_VAR_NAME
 */
export function validateEnv(env: Env): { valid: boolean; missing: string[] } {
	const required = [
		'CLERK_SECRET_KEY',
		'CLERK_PUBLISHABLE_KEY',
		'STRIPE_SECRET_KEY',
		'CLERK_JWT_TEMPLATE',
	];

	const missing = required.filter((key) => !env[key as keyof Env]);

	// Check KV binding (set in wrangler.toml, not via secrets)
	if (!env.USAGE_KV) {
		missing.push('USAGE_KV');
	}

	return { valid: missing.length === 0, missing };
}
