import { createClerkClient } from '@clerk/backend';
import Stripe from 'stripe';

interface Env {
	CLERK_SECRET_KEY: string;
	STRIPE_SECRET_KEY: string;
	STRIPE_WEBHOOK_SECRET?: string;
	USAGE_KV: KVNamespace;  // For webhook idempotency tracking
}

export async function handleStripeWebhook(
	request: Request,
	env: Env
): Promise<Response> {
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		return new Response(JSON.stringify({ error: 'No signature' }), { status: 400 });
	}

	// Verify webhook signature
	const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
		apiVersion: '2025-09-30.clover',
	});

	let event: Stripe.Event;
	try {
		// Require webhook secret in production (fail hard if missing)
		if (!env.STRIPE_WEBHOOK_SECRET) {
			console.error('❌ STRIPE_WEBHOOK_SECRET required - webhook signature verification mandatory');
			return new Response(
				JSON.stringify({ error: 'Webhook secret not configured' }),
				{ status: 500 }
			);
		}

		// Verify the webhook signature (ASYNC for Cloudflare Workers)
		// Cloudflare Workers use SubtleCrypto which requires async context
		event = await stripe.webhooks.constructEventAsync(
			body,
			signature,
			env.STRIPE_WEBHOOK_SECRET
		);
		console.log('✅ Webhook signature verified');
	} catch (err: any) {
		console.error('❌ Webhook signature verification failed:', err.message);
		return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), { status: 400 });
	}

	// ============================================================================
	// IDEMPOTENCY CHECK
	// ============================================================================
	/**
	 * Prevent duplicate webhook processing using KV storage
	 *
	 * WHY: Stripe may send the same event multiple times (network retries, etc)
	 * Without idempotency, this could cause:
	 * - Duplicate plan upgrades
	 * - Double charges (if we added billing logic)
	 * - Inconsistent user metadata
	 *
	 * PATTERN: Store processed event IDs in KV with 30-day TTL
	 * - Event IDs are unique per Stripe event
	 * - 30 days matches Stripe's webhook retention period
	 * - KV eventually consistent is fine (Stripe retries are seconds apart)
	 */
	const idempotencyKey = `webhook:stripe:${event.id}`;
	const alreadyProcessed = await env.USAGE_KV.get(idempotencyKey);

	if (alreadyProcessed) {
		console.log(`⏭️ Event ${event.id} already processed (idempotent), returning success`);
		return new Response(JSON.stringify({ received: true, idempotent: true }), { status: 200 });
	}

	const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

	// Handle different event types
	switch (event.type) {
		case 'checkout.session.completed':
			// For checkout, userId is in client_reference_id
			const session = event.data.object as Stripe.Checkout.Session;
			const userId = session.client_reference_id || session.metadata?.userId;

			if (!userId) {
				console.error('No userId in checkout session');
				return new Response(JSON.stringify({ error: 'No userId' }), { status: 400 });
			}

			// Get tier from session metadata (sent during checkout)
			// IMPORTANT: Should always be present - if not, fail explicitly
			const tier = session.metadata?.tier;
			if (!tier) {
				console.error('❌ No tier metadata in checkout session');
				return new Response(JSON.stringify({ error: 'Missing tier metadata' }), { status: 400 });
			}

			// Update Clerk user metadata with purchased tier
			try {
				await clerkClient.users.updateUser(userId, {
					publicMetadata: {
						plan: tier,
						stripeCustomerId: session.customer as string,
					},
				});
				console.log(`✅ Updated user ${userId} to ${tier} plan after checkout`);
			} catch (err: any) {
				console.error(`❌ Failed to update user ${userId}:`, err.message);
				return new Response(
					JSON.stringify({ error: 'Failed to update user metadata' }),
					{ status: 500 }
				);
			}
			break;

		case 'customer.subscription.created':
		case 'customer.subscription.updated':
			// Extract customer metadata (should include userId)
			const subscription = event.data.object as Stripe.Subscription;
			const subUserId = subscription.metadata?.userId;

			if (!subUserId) {
				console.error('No userId in subscription metadata');
				return new Response(JSON.stringify({ error: 'No userId' }), { status: 400 });
			}

			// Get tier from subscription metadata
			// IMPORTANT: Should always be present - if not, fail explicitly
			const subTier = subscription.metadata?.tier;
			if (!subTier) {
				console.error('❌ No tier metadata in subscription');
				return new Response(JSON.stringify({ error: 'Missing tier metadata' }), { status: 400 });
			}

			// Update Clerk user metadata with subscription tier
			try {
				await clerkClient.users.updateUser(subUserId, {
					publicMetadata: {
						plan: subTier,
						stripeCustomerId: subscription.customer as string,
						subscriptionId: subscription.id,
					},
				});
				console.log(`✅ Updated user ${subUserId} to ${subTier} plan`);
			} catch (err: any) {
				console.error(`❌ Failed to update user ${subUserId}:`, err.message);
				return new Response(
					JSON.stringify({ error: 'Failed to update user metadata' }),
					{ status: 500 }
				);
			}
			break;

		case 'customer.subscription.deleted':
			const deletedSubscription = event.data.object as Stripe.Subscription;
			const deletedUserId = deletedSubscription.metadata?.userId;

			if (!deletedUserId) {
				console.error('No userId in deleted subscription metadata');
				return new Response(JSON.stringify({ error: 'No userId' }), { status: 400 });
			}

			// Downgrade user back to free
			try {
				await clerkClient.users.updateUser(deletedUserId, {
					publicMetadata: {
						plan: 'free',
					},
				});
				console.log(`✅ Downgraded user ${deletedUserId} to free plan`);
			} catch (err: any) {
				console.error(`❌ Failed to downgrade user ${deletedUserId}:`, err.message);
				return new Response(
					JSON.stringify({ error: 'Failed to update user metadata' }),
					{ status: 500 }
				);
			}
			break;

		default:
			console.log(`Unhandled event type: ${event.type}`);
	}

	// ============================================================================
	// MARK EVENT AS PROCESSED (Idempotency)
	// ============================================================================
	/**
	 * Store event ID in KV to prevent duplicate processing
	 *
	 * TTL: 2592000 seconds = 30 days (matches Stripe's webhook retention)
	 * Value: timestamp when processed (for debugging)
	 *
	 * This ensures if Stripe retries the same event, we return success immediately
	 * without re-processing (updating Clerk metadata, etc)
	 */
	await env.USAGE_KV.put(
		idempotencyKey,
		new Date().toISOString(),
		{ expirationTtl: 2592000 }  // 30 days
	);

	return new Response(JSON.stringify({ received: true }), { status: 200 });
}
