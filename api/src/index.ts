/**
 * ============================================================================
 * PLUG SAAS - CLOUDFLARE WORKER API
 * ============================================================================
 *
 * A stateless, JWT-only SaaS API with:
 * - Clerk authentication (JWT validation)
 * - Stripe subscription billing with webhook handling
 * - Usage tracking with monthly billing periods (stored in KV)
 * - Rate limiting (100 req/min per user)
 * - Dynamic CORS handling for multiple deployment environments
 *
 * ARCHITECTURE: Modular (split into routes, middleware, services, config)
 * - Easier to maintain and extend
 * - Clear separation of concerns
 * - All files bundle into one at deploy time (no performance penalty)
 *
 * ============================================================================
 */

import { createClerkClient } from '@clerk/backend';
import { handleStripeWebhook } from './stripe-webhook';

// Type definitions
import { Env, PlanTier } from './types';

// Configuration
import { TIER_CONFIG, PRICE_ID_MAP, RATE_LIMIT_PER_MINUTE } from './config/tiers';

// Middleware
import { getCorsHeaders, handlePreflight } from './middleware/cors';
import { checkRateLimit } from './middleware/rateLimit';

// Routes
import { handleDataRequest, handleUsageCheck } from './routes/usage';
import { handleCreateCheckout, handleCustomerPortal } from './routes/checkout';

// Utilities
import { validateEnv } from './utils';

// ============================================================================
// MAIN FETCH HANDLER
// ============================================================================

export default {
	/**
	 * Main request handler for Cloudflare Worker
	 *
	 * FLOW:
	 * 1. Validate environment variables (fails fast if misconfigured)
	 * 2. Handle CORS preflight (OPTIONS requests)
	 * 3. Check health endpoint (no auth required)
	 * 4. Handle Stripe webhook (signature verification, no JWT)
	 * 5. Verify JWT token for protected routes
	 * 6. Check rate limiting (100 req/min per user)
	 * 7. Route to appropriate handler
	 *
	 * SECURITY:
	 * - Security headers on all responses (CSP, HSTS, X-Frame-Options, etc)
	 * - Dynamic CORS validation (no wildcard)
	 * - JWT verification on every protected request
	 * - Rate limiting per user
	 * - Stripe webhook signature verification
	 */
	async fetch(request: Request, env: Env): Promise<Response> {
		// ====================================================================
		// STEP 1: VALIDATE ENVIRONMENT (Fast Fail)
		// ====================================================================
		const envCheck = validateEnv(env);
		if (!envCheck.valid) {
			console.error('Environment validation failed:', envCheck.missing);
			return new Response(
				JSON.stringify({
					error: 'Server configuration error',
					message: 'Missing required environment variables',
					missing: envCheck.missing,
				}),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		// ====================================================================
		// STEP 2: CORS HANDLING (Dynamic Origin Validation)
		// ====================================================================
		const corsHeaders = getCorsHeaders(request, env);

		// Handle CORS preflight (OPTIONS requests)
		if (request.method === 'OPTIONS') {
			return handlePreflight(corsHeaders);
		}

		const url = new URL(request.url);

		// ====================================================================
		// STEP 3: PUBLIC ENDPOINTS (No Auth Required)
		// ====================================================================

		// Health check endpoint
		if (url.pathname === '/health') {
			return new Response(JSON.stringify({ status: 'ok' }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// Get available tiers (public pricing info)
		if (url.pathname === '/api/tiers' && request.method === 'GET') {
			const tiers = Object.entries(TIER_CONFIG)
				.map(([key, config]) => ({
					id: key,
					name: config.name,
					price: config.price,
					limit: config.limit === Infinity ? 'unlimited' : config.limit,
					hasPriceId: !!PRICE_ID_MAP[key],
				}))
				.sort((a, b) => a.price - b.price); // Sort by price: lowest to highest

			return new Response(JSON.stringify({ tiers }), {
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// Stripe webhook (signature verification inside handler)
		if (url.pathname === '/webhook/stripe' && request.method === 'POST') {
			return await handleStripeWebhook(request, env);
		}

		// ====================================================================
		// STEP 4: JWT AUTHENTICATION (Protected Routes)
		// ====================================================================
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
				status: 401,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		try {
			// Create Clerk client (used for API calls like getting user email)
			const clerkClient = createClerkClient({
				secretKey: env.CLERK_SECRET_KEY,
				publishableKey: env.CLERK_PUBLISHABLE_KEY,
			});

			// Authenticate the request
			const { toAuth } = await clerkClient.authenticateRequest(request, {
				secretKey: env.CLERK_SECRET_KEY,
				publishableKey: env.CLERK_PUBLISHABLE_KEY,
			});

			const auth = toAuth();

			if (!auth || !auth.userId) {
				throw new Error('Unauthorized');
			}

			const userId = auth.userId;

			// ====================================================================
			// STEP 5: RATE LIMITING (100 req/min per user)
			// ====================================================================
			const rateCheck = await checkRateLimit(userId, env);
			if (!rateCheck.allowed) {
				return new Response(
					JSON.stringify({
						error: 'Rate limit exceeded',
						message: `Maximum ${RATE_LIMIT_PER_MINUTE} requests per minute`,
						retryAfter: 60,
					}),
					{
						status: 429,
						headers: {
							...corsHeaders,
							'Content-Type': 'application/json',
							'Retry-After': '60',
						},
					}
				);
			}

			// ====================================================================
			// STEP 6: GET PLAN FROM JWT CLAIMS (SSOT - No extra API call!)
			// ====================================================================
			/**
			 * Plan is already in the JWT from Clerk's "pan-api" template
			 * Template config: { "plan": "{{user.public_metadata.plan}}" }
			 *
			 * WHY NOT call clerkClient.users.getUser()?
			 * - JWT is already verified and decoded
			 * - Plan is in sessionClaims.plan (from JWT template)
			 * - No extra network call to Clerk API
			 * - Faster response time
			 * - True "JWT-only" stateless architecture
			 *
			 * When does plan update?
			 * - Stripe webhook updates Clerk publicMetadata
			 * - User gets new JWT on next sign-in/token refresh
			 * - New JWT includes updated plan automatically
			 */
			const plan = ((auth.sessionClaims as any)?.plan as PlanTier) || 'free';
			console.log(`✅ User ${userId} authenticated with plan: ${plan} (from JWT)`);

			// ====================================================================
			// STEP 7: ROUTE TO HANDLERS
			// ====================================================================

			// Process request and track usage
			if (url.pathname === '/api/data' && request.method === 'POST') {
				return await handleDataRequest(userId, plan, env, corsHeaders);
			}

			// Get current usage and limits
			if (url.pathname === '/api/usage' && request.method === 'GET') {
				return await handleUsageCheck(userId, plan, env, corsHeaders);
			}

			// Create Stripe Checkout session (upgrade flow)
			if (url.pathname === '/api/create-checkout' && request.method === 'POST') {
				const origin = request.headers.get('Origin') || '';
				return await handleCreateCheckout(userId, clerkClient, env, corsHeaders, origin, request);
			}

			// Create Stripe Customer Portal session (manage subscription)
			if (url.pathname === '/api/customer-portal' && request.method === 'POST') {
				const origin = request.headers.get('Origin') || '';
				return await handleCustomerPortal(userId, clerkClient, env, corsHeaders, origin);
			}

			// 404 - Route not found
			return new Response(JSON.stringify({ error: 'Not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} catch (error) {
			console.error('Token verification failed:', error);
			return new Response(JSON.stringify({ error: 'Invalid token' }), {
				status: 401,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};
