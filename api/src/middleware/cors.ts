/**
 * ============================================================================
 * CORS MIDDLEWARE
 * ============================================================================
 *
 * Dynamic origin validation (no wildcard) with environment variable configuration
 */

import { Env } from '../types';
import { getSecurityHeaders } from './security';

/**
 * CORS STRATEGY: Dynamic origin validation (no wildcard)
 *
 * WHY NO WILDCARD:
 * - Wildcard ('*') allows ANY website to call your API
 * - This exposes user JWTs and data to malicious sites
 * - We use explicit origin allowlist + regex patterns instead
 *
 * TWO WAYS TO CONFIGURE:
 *
 * METHOD 1: ENV VARIABLE (Recommended for Production)
 * ------------------------------------------------
 * Set ALLOWED_ORIGINS as comma-separated list:
 *
 * wrangler secret put ALLOWED_ORIGINS
 * # Enter: https://clerk-frontend.pages.dev,https://app.panacea-tech.net
 *
 * This allows dynamic updates without code changes.
 *
 * METHOD 2: HARDCODED DEFAULTS (Development Fallback)
 * ------------------------------------------------
 * If ALLOWED_ORIGINS not set, uses defaults:
 * - localhost:5173 (Vite dev server)
 * - clerk-frontend.pages.dev (CF Pages production)
 * - app.panacea-tech.net (Custom domain)
 *
 * REGEX PATTERNS (Always Active):
 * ------------------------------------------------
 * These patterns match dynamically generated URLs:
 * - *.clerk-frontend.pages.dev (CF Pages preview branches)
 * - *.vercel.app (Vercel deployments, for testing)
 *
 * HOW TO ADD NEW ORIGIN:
 * ------------------------------------------------
 * Option A: Update env var (no code change)
 *   wrangler secret put ALLOWED_ORIGINS
 *   # Add new origin to comma-separated list
 *
 * Option B: Update defaults below (requires redeploy)
 *   defaultAllowedOrigins: ['https://new-domain.com', ...]
 *
 * Option C: Add regex pattern (for wildcard subdomains)
 *   /^https:\/\/[a-z0-9-]+\.myapp\.com$/.test(origin)
 *
 * SECURITY NOTES:
 * ------------------------------------------------
 * - Origins aren't "secrets" (visible in Network tab)
 * - BUT limiting them prevents unauthorized API access
 * - Preview URLs use regex to avoid hardcoding thousands of hashes
 * - Localhost only allowed in dev (remove for production if needed)
 */
export function getCorsHeaders(request: Request, env: Env): Record<string, string> {
	const origin = request.headers.get('Origin') || '';

	// Parse allowed origins from env var OR use defaults
	const defaultAllowedOrigins = [
		'http://localhost:5173',               // Vite dev (frontend-v2)
		'http://localhost:5174',               // Vite dev (fact-saas)
		'http://localhost:8787',               // Wrangler dev (api)
	];

	const allowedOrigins = env.ALLOWED_ORIGINS
		? env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) // Parse from env var
		: defaultAllowedOrigins;                             // Fall back to defaults

	// Check if origin is allowed (exact match OR regex pattern)
	const isAllowedOrigin =
		allowedOrigins.includes(origin) ||
		// CF Pages: frontendv2-5j1.pages.dev (production + preview branches)
		/^https:\/\/([a-z0-9]+\.)?frontendv2-5j1\.pages\.dev$/.test(origin);

	// Debug logging (only in dev - remove for production if needed)
	if (!isAllowedOrigin && origin) {
		console.warn(`[CORS] Rejected origin: ${origin}`);
		console.warn(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
	}

	// Build CORS headers with validated origin + security headers
	return {
		// If origin allowed, echo it back. Otherwise, use first allowed origin as safe fallback
		'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
		...getSecurityHeaders(), // Add security headers to all responses
	};
}

/**
 * Handle CORS preflight requests (OPTIONS)
 */
export function handlePreflight(corsHeaders: Record<string, string>): Response {
	return new Response(null, {
		status: 204, // No Content
		headers: corsHeaders
	});
}
