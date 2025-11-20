/**
 * ============================================================================
 * CHECKOUT PAGE - STRIPE REDIRECT HANDLER (Protected Route)
 * ============================================================================
 *
 * PURPOSE:
 * Intermediate page that creates Stripe checkout session and redirects.
 * User never really "sees" this page - it's a loading state.
 *
 * FLOW:
 * 1. User signs up with ?plan=pro in URL
 * 2. Clerk redirects here after signup
 * 3. This page calls /api/create-checkout
 * 4. Immediately redirects to Stripe
 * 5. After payment, Stripe redirects to /dashboard?success=true
 *
 * ✅ AI CAN MODIFY: Loading text, error messages, colors
 * ❌ DON'T TOUCH: Auth logic, API calls, redirect flow
 *
 * NOTE: Most users see Stripe's checkout page, not this one
 *
 * ============================================================================
 */

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';

export default function CheckoutPage() {
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { config } = useConfig();

  useEffect(() => {
    const initiateCheckout = async () => {
      // Wait for auth to load
      if (!authLoaded || !userLoaded) return;

      // Must be signed in
      if (!user) {
        console.error('No user found, redirecting to signup');
        navigate('/sign-up');
        return;
      }

      const plan = searchParams.get('plan');

      // If no plan or free plan, go to dashboard
      if (!plan || plan === 'free') {
        navigate('/dashboard');
        return;
      }

      console.log(`Initiating checkout for ${plan} tier...`);

      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        // Send platform user ID for multi-tenant config lookup
        if (config?.userId) {
          headers['X-Platform-User-Id'] = config.userId;
        }

        const token = await getToken({ template: 'pan-api' });
        headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_URL}/api/create-checkout`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ tier: plan }),
        });

        const data = await response.json();

        if (response.ok && data.url) {
          console.log('Redirecting to Stripe:', data.url);
          window.location.href = data.url;
        } else {
          console.error('Failed to create checkout session:', data);
          setError('Failed to create checkout session. Please try again.');
        }
      } catch (err) {
        console.error('Checkout error:', err);
        setError('Something went wrong. Please try again.');
      }
    };

    initiateCheckout();
  }, [authLoaded, userLoaded, user, searchParams, getToken, navigate]);

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50 px-4">
      {error ? (
        /* Error State */
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold mb-3 text-red-700">Checkout Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white border-none rounded-lg font-semibold cursor-pointer transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        /* Loading State */
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold mb-3 text-slate-900">Preparing checkout...</h2>
          <p className="text-slate-600">Redirecting to Stripe securely</p>
        </div>
      )}
    </div>
  );
}
