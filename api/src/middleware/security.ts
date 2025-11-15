/**
 * ============================================================================
 * SECURITY MIDDLEWARE
 * ============================================================================
 *
 * Adds security headers to all responses to protect against common web attacks
 */

/**
 * Add security headers to all responses
 *
 * PERFORMANCE: Negligible overhead (~100 bytes added to response headers)
 *
 * HEADERS EXPLAINED:
 * - Content-Security-Policy: Controls which domains can load resources
 * - X-Frame-Options: Prevents clickjacking attacks
 * - X-Content-Type-Options: Prevents MIME-sniffing attacks
 * - Strict-Transport-Security: Forces HTTPS
 * - Referrer-Policy: Controls referrer information leakage
 * - Permissions-Policy: Disables unused browser features
 *
 * HOW TO MODIFY CSP:
 * - Add domain: Add to relevant directive (script-src, style-src, etc)
 * - Troubleshooting: Check browser console for CSP violations
 * - Testing: Use https://csp-evaluator.withgoogle.com/
 */
export function getSecurityHeaders(): Record<string, string> {
	return {
		// Content Security Policy - Allow Clerk auth and Stripe checkout
		'Content-Security-Policy': [
			"default-src 'self'",
			// Allow scripts from Clerk (auth widgets), Stripe (checkout), and inline scripts for Clerk
			"script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://js.stripe.com",
			// Allow styles from Clerk and inline styles
			"style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev",
			// Allow images from Clerk CDN and data URIs
			"img-src 'self' data: https://*.clerk.com https://*.clerk.accounts.dev",
			// Allow connections to Clerk API, Stripe, and your API worker
			"connect-src 'self' https://*.clerk.accounts.dev https://api.clerk.com https://api.stripe.com https://*.workers.dev",
			// Allow fonts from Clerk
			"font-src 'self' https://*.clerk.accounts.dev",
			// Allow Clerk iframes (for auth flows) and Stripe checkout
			"frame-src 'self' https://*.clerk.accounts.dev https://checkout.stripe.com https://js.stripe.com",
			// Disallow objects/embeds
			"object-src 'none'",
			// Restrict base tag
			"base-uri 'self'"
		].join('; '),

		// Prevent clickjacking - SAMEORIGIN allows Clerk components
		'X-Frame-Options': 'SAMEORIGIN',

		// Prevent MIME-sniffing
		'X-Content-Type-Options': 'nosniff',

		// Force HTTPS for 1 year
		'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

		// Control referrer information
		'Referrer-Policy': 'strict-origin-when-cross-origin',

		// Disable unused browser features
		'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
	};
}
