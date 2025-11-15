/**
 * ============================================================================
 * RATE LIMITING MIDDLEWARE
 * ============================================================================
 *
 * Per-user rate limiting using Cloudflare KV for distributed state
 */

import { Env } from '../types';
import { RATE_LIMIT_PER_MINUTE } from '../config/tiers';

/**
 * Rate limiting check using KV storage
 *
 * ALGORITHM:
 * - Uses per-minute buckets: ratelimit:{userId}:{minute}
 * - Minute calculated as: Math.floor(Date.now() / 60000)
 * - TTL of 2 minutes ensures cleanup without manual deletion
 *
 * HOW TO MODIFY RATE LIMITS:
 * - Change RATE_LIMIT_PER_MINUTE constant in config/tiers.ts
 * - Example: export const RATE_LIMIT_PER_MINUTE = 200; // 200 req/min
 *
 * HOW TO MAKE PER-TIER RATE LIMITS:
 * 1. Change RATE_LIMIT_PER_MINUTE to object in config/tiers.ts:
 *    { free: 60, pro: 200, developer: 500 }
 * 2. Add plan parameter to this function
 * 3. Use: const limit = RATE_LIMIT_PER_MINUTE[plan]
 *
 * HOW TO CHANGE TIME WINDOW:
 * - For per-hour: Math.floor(now / 3600000) + TTL 7200
 * - For per-day: Math.floor(now / 86400000) + TTL 172800
 *
 * @param userId - Clerk user ID from JWT
 * @param env - Environment (for KV access)
 * @returns allowed: boolean, remaining: number of requests left
 */
export async function checkRateLimit(
	userId: string,
	env: Env
): Promise<{ allowed: boolean; remaining: number }> {
	const now = Date.now();
	const minute = Math.floor(now / 60000); // Current minute bucket
	const rateLimitKey = `ratelimit:${userId}:${minute}`;

	// Get current count from KV
	const currentCount = await env.USAGE_KV.get(rateLimitKey);
	const count = currentCount ? parseInt(currentCount) : 0;

	// Check if limit exceeded
	if (count >= RATE_LIMIT_PER_MINUTE) {
		return { allowed: false, remaining: 0 };
	}

	// Increment counter with 2-minute TTL (current + next minute buffer)
	// This ensures automatic cleanup without manual deletion
	await env.USAGE_KV.put(rateLimitKey, (count + 1).toString(), { expirationTtl: 120 });

	return { allowed: true, remaining: RATE_LIMIT_PER_MINUTE - count - 1 };
}
