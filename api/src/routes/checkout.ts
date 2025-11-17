/**
 * ============================================================================
 * STRIPE CHECKOUT ROUTES
 * ============================================================================
 *
 * Endpoints for:
 * - Creating Stripe Checkout sessions (upgrade flow)
 * - Creating Stripe Customer Portal sessions (manage subscription)
 */

import { Env } from '../types';
import { getPriceIdMap } from '../config/configLoader';

/**
 * Handle /api/create-checkout - Create Stripe Checkout session
 *
 * WHAT THIS DOES:
 * 1. Gets user email from Clerk
 * 2. Gets target tier from request body (or defaults to first paid tier)
 * 3. Gets Stripe Price ID for target tier
 * 4. Creates Stripe Checkout session
 * 5. Returns checkout URL for redirect
 *
 * STRIPE CHECKOUT FLOW:
 * 1. User clicks "Upgrade to Pro"
 * 2. Frontend calls this endpoint
 * 3. Frontend redirects to Stripe Checkout URL
 * 4. User enters payment info on Stripe
 * 5. Stripe redirects back to success_url
 * 6. Stripe webhook updates Clerk metadata (see stripe-webhook.ts)
 */
export async function handleCreateCheckout(
	userId: string,
	clerkClient: any,
	env: Env,
	corsHeaders: Record<string, string>,
	origin: string,
	request: Request
): Promise<Response> {
	try {
		// Get user email from Clerk
		const user = await clerkClient.users.getUser(userId);
		const userEmail = user.emailAddresses[0]?.emailAddress || '';

		// Get target tier from request body
		const body = await request.json().catch((err) => {
			console.error('❌ Failed to parse request body:', err);
			return {};
		}) as { tier?: string };

		// Load price IDs from config
		const priceIdMap = await getPriceIdMap(env);

		// Default to first available paid tier (dynamic!)
		const firstPaidTier = Object.keys(priceIdMap).find(key => key !== 'free') || 'pro';
		const targetTier = body.tier || firstPaidTier;

		console.log(`🎯 Checkout requested for tier: ${targetTier}`);

		// Get the price ID for target tier
		const priceId = priceIdMap[targetTier] || '';

		console.log(`💳 Price ID for ${targetTier}: ${priceId}`);

		if (!priceId) {
			console.error(`❌ No price ID configured for tier: ${targetTier}`);
			throw new Error(`No price ID configured for tier: ${targetTier}`);
		}

		// Use origin from request for success/cancel URLs (handles changing hash URLs)
		const frontendUrl = origin || 'https://app.panacea-tech.net';

		// Create Stripe checkout session
		const checkoutSession = await fetch('https://api.stripe.com/v1/checkout/sessions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				'success_url': `${frontendUrl}/dashboard?success=true`,
				'cancel_url': `${frontendUrl}/dashboard?canceled=true`,
				'customer_email': userEmail,
				'client_reference_id': userId,
				'mode': 'subscription',
				'line_items[0][price]': priceId,
				'line_items[0][quantity]': '1',
				'metadata[userId]': userId,
				'metadata[tier]': targetTier,
				'subscription_data[metadata][userId]': userId,
				'subscription_data[metadata][tier]': targetTier,
			}).toString(),
		});

		const session = await checkoutSession.json() as { url?: string; error?: { message: string } };

		if (!checkoutSession.ok) {
			throw new Error(session.error?.message || 'Failed to create checkout session');
		}

		return new Response(
			JSON.stringify({ url: session.url }),
			{
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	} catch (error: any) {
		console.error('Checkout error:', error);
		return new Response(
			JSON.stringify({ error: error.message || 'Failed to create checkout' }),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	}
}

/**
 * Handle /api/customer-portal - Create Stripe Customer Portal session
 *
 * WHAT THIS DOES:
 * 1. Gets user's Stripe customer ID from Clerk metadata
 * 2. Creates Stripe Customer Portal session
 * 3. Returns portal URL for redirect
 *
 * CUSTOMER PORTAL ALLOWS:
 * - Update payment methods
 * - View invoices and payment history
 * - Cancel or pause subscriptions
 * - Update billing information
 */
export async function handleCustomerPortal(
	userId: string,
	clerkClient: any,
	env: Env,
	corsHeaders: Record<string, string>,
	origin: string
): Promise<Response> {
	try {
		// Get user from Clerk to retrieve Stripe customer ID
		const user = await clerkClient.users.getUser(userId);
		const stripeCustomerId = user.publicMetadata?.stripeCustomerId as string;

		if (!stripeCustomerId) {
			return new Response(
				JSON.stringify({ error: 'No active subscription found' }),
				{
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				}
			);
		}

		// Use origin from request for return URL
		const frontendUrl = origin || 'https://app.panacea-tech.net';

		// Build portal session params
		const portalParams: Record<string, string> = {
			'customer': stripeCustomerId,
			'return_url': `${frontendUrl}/dashboard`,
		};

		// Add portal configuration ID if provided in env
		if (env.STRIPE_PORTAL_CONFIG_ID) {
			portalParams['configuration'] = env.STRIPE_PORTAL_CONFIG_ID;
		}

		// Create Stripe billing portal session
		const portalSession = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams(portalParams).toString(),
		});

		const session = await portalSession.json() as { url?: string; error?: { message: string } };

		if (!portalSession.ok) {
			throw new Error(session.error?.message || 'Failed to create portal session');
		}

		return new Response(
			JSON.stringify({ url: session.url }),
			{
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	} catch (error: any) {
		console.error('Customer portal error:', error);
		return new Response(
			JSON.stringify({ error: error.message || 'Failed to create portal session' }),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		);
	}
}
