/**
 * ============================================================================
 * KV STORAGE & BILLING PERIOD UTILITIES
 * ============================================================================
 *
 * Helper functions for:
 * - Getting/updating usage data in Cloudflare KV
 * - Calculating billing periods (monthly by default)
 * - Determining when to reset usage counters
 */

import { UsageData } from '../types';

/**
 * Get current billing period (calendar month by default)
 *
 * BILLING PERIOD: First day of month 00:00 UTC → Last day of month 23:59 UTC
 *
 * HOW TO CHANGE BILLING PERIOD:
 *
 * FOR WEEKLY BILLING:
 *   const now = new Date();
 *   const dayOfWeek = now.getUTCDay();
 *   const start = new Date(now);
 *   start.setUTCDate(now.getUTCDate() - dayOfWeek); // Go to Sunday
 *   const end = new Date(start);
 *   end.setUTCDate(start.getUTCDate() + 6); // Go to Saturday
 *
 * FOR QUARTERLY BILLING:
 *   const quarter = Math.floor(month / 3);
 *   const start = new Date(Date.UTC(year, quarter * 3, 1));
 *   const end = new Date(Date.UTC(year, (quarter + 1) * 3, 0, 23, 59, 59));
 *
 * FOR ANNUAL BILLING:
 *   const start = new Date(Date.UTC(year, 0, 1));
 *   const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
 *
 * @returns { start: YYYY-MM-DD, end: YYYY-MM-DD }
 */
export function getCurrentPeriod(): { start: string; end: string } {
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = now.getUTCMonth();

	// First day of current month at 00:00 UTC
	const start = new Date(Date.UTC(year, month, 1));

	// Last day of current month at 23:59:59.999 UTC
	// (month + 1, 0) gives last day of current month
	const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

	return {
		start: start.toISOString().split('T')[0], // YYYY-MM-DD
		end: end.toISOString().split('T')[0],     // YYYY-MM-DD
	};
}

/**
 * Check if usage data needs reset for new billing period
 *
 * LOGIC:
 * - If no period tracked → needs reset (first time user)
 * - If periodStart doesn't match current period start → needs reset (new month)
 *
 * APPLIES TO: Free tier only (Pro tier has unlimited usage)
 *
 * @param usageData - Current usage data from KV
 * @returns true if usage should be reset to 0
 */
export function shouldResetUsage(usageData: UsageData): boolean {
	const currentPeriod = getCurrentPeriod();

	// If no period tracked, needs reset (first time user)
	if (!usageData.periodStart || !usageData.periodEnd) {
		return true;
	}

	// If current date is after period end, needs reset (new billing period)
	return currentPeriod.start !== usageData.periodStart;
}
