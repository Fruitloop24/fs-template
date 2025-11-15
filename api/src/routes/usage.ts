/**
 * ============================================================================
 * USAGE TRACKING ROUTES
 * ============================================================================
 *
 * Endpoints for:
 * - Processing requests and tracking usage
 * - Checking current usage and limits
 */

import { Env, PlanTier, UsageData } from '../types';
import { TIER_CONFIG } from '../config/tiers';
import { getCurrentPeriod, shouldResetUsage } from '../services/kv';

/**
 * Handle /api/data - Process request and track usage
 *
 * WHAT THIS DOES:
 * 1. Gets current usage from KV
 * 2. Resets usage if new billing period (for limited tiers)
 * 3. Checks if tier limit exceeded
 * 4. Increments usage counter
 * 5. Returns success response with usage info
 *
 * THIS IS WHERE YOUR PRODUCT LOGIC GOES:
 * Replace the placeholder "Request processed successfully" with your actual
 * business logic (document processing, API call, etc.)
 */
export async function handleDataRequest(
	userId: string,
	plan: PlanTier,
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	// Get current usage
	const usageKey = `usage:${userId}`;
	const usageDataRaw = await env.USAGE_KV.get(usageKey);

	const currentPeriod = getCurrentPeriod();

	let usageData: UsageData = usageDataRaw
		? JSON.parse(usageDataRaw)
		: {
				usageCount: 0,
				plan,
				lastUpdated: new Date().toISOString(),
				periodStart: currentPeriod.start,
				periodEnd: currentPeriod.end,
		  };

	// Get tier limit from config
	const tierLimit = TIER_CONFIG[plan]?.limit || 0;

	// Reset usage if new billing period (for limited tiers)
	if (tierLimit !== Infinity && shouldResetUsage(usageData)) {
		usageData.usageCount = 0;
		usageData.periodStart = currentPeriod.start;
		usageData.periodEnd = currentPeriod.end;
	}

	// Update plan if changed
	usageData.plan = plan;

	// Check if tier limit exceeded
	if (tierLimit !== Infinity && usageData.usageCount >= tierLimit) {
		return new Response(
			JSON.stringify({
				error: 'Tier limit reached',
				usageCount: usageData.usageCount,
				limit: tierLimit,
				message: 'Please upgrade to unlock more requests',
			}),
			{
				status: 403,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	}

	// ========================================================================
	// YOUR PRODUCT LOGIC GOES HERE
	// ========================================================================
	// Replace this placeholder with your actual business logic:
	// - Process documents
	// - Make API calls
	// - Run AI models
	// - Generate reports
	// etc.
	//
	// Example:
	// const result = await processDocument(userId, plan, requestBody);
	// ========================================================================

	// Increment usage count
	usageData.usageCount++;
	usageData.lastUpdated = new Date().toISOString();
	await env.USAGE_KV.put(usageKey, JSON.stringify(usageData));

	// Return success response
	return new Response(
		JSON.stringify({
			success: true,
			data: { message: 'Request processed successfully' },
			usage: {
				count: usageData.usageCount,
				limit: tierLimit === Infinity ? 'unlimited' : tierLimit,
				plan,
			},
		}),
		{
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		}
	);
}

/**
 * Handle /api/usage - Get current usage and limits
 *
 * WHAT THIS RETURNS:
 * - Current usage count
 * - Tier limit
 * - Remaining requests
 * - Billing period dates
 * - User's current plan
 */
export async function handleUsageCheck(
	userId: string,
	plan: PlanTier,
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	const usageKey = `usage:${userId}`;
	const usageDataRaw = await env.USAGE_KV.get(usageKey);

	const currentPeriod = getCurrentPeriod();

	const usageData: UsageData = usageDataRaw
		? JSON.parse(usageDataRaw)
		: {
				usageCount: 0,
				plan,
				lastUpdated: new Date().toISOString(),
				periodStart: currentPeriod.start,
				periodEnd: currentPeriod.end,
		  };

	// Get tier limit from config
	const tierLimit = TIER_CONFIG[plan]?.limit || 0;

	return new Response(
		JSON.stringify({
			userId,
			plan,
			usageCount: usageData.usageCount,
			limit: tierLimit === Infinity ? 'unlimited' : tierLimit,
			remaining: tierLimit === Infinity ? 'unlimited' : Math.max(0, tierLimit - usageData.usageCount),
			periodStart: usageData.periodStart,
			periodEnd: usageData.periodEnd,
		}),
		{
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		}
	);
}
