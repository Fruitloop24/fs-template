/**
 * ============================================================================
 * CHOOSE PLAN PAGE - PRICING SELECTION (Protected Route)
 * ============================================================================
 *
 * PURPOSE:
 * Shows all available pricing tiers. User can upgrade/change plans.
 * Fetches tiers from API, creates Stripe checkout for paid plans.
 *
 * FLOW:
 * 1. User clicks "Upgrade" from dashboard
 * 2. This page shows all tiers
 * 3. User selects paid tier → Stripe Checkout
 * 4. After payment → redirected to dashboard with success message
 *
 * ✅ AI CAN MODIFY: Text, colors, layout, card styling
 * ❌ DON'T TOUCH: Auth logic, API calls, Stripe checkout flow
 *
 * ============================================================================
 */

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';

interface Tier {
  id: string;
  name: string;
  price: number;
  limit: number | 'unlimited';
  hasPriceId: boolean;
}

export default function ChoosePlanPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // Load configuration for primary color
  const { config } = useConfig();
  const primaryColor = config?.branding?.primaryColor || '#0f172a';

  const API_URL = config?.apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:8787';
  const currentPlan = (user?.publicMetadata?.plan as string) || 'free';

  // Load tiers from config.json (has price IDs baked in!)
  useEffect(() => {
    if (config?.tiers) {
      const tiersData = config.tiers.map((tier: any) => ({
        id: tier.name,
        name: tier.displayName,
        price: tier.price,
        limit: tier.limit === null ? 'unlimited' : tier.limit,
        hasPriceId: !!tier.stripePriceId,
        stripePriceId: tier.stripePriceId, // Keep for checkout!
      }));
      setTiers(tiersData as any);
      setLoading(false);
    }
  }, [config]);

  /**
   * handleSelectPlan: Initiates upgrade/downgrade
   * - Free tier: Just go to dashboard
   * - Paid tier: Create Stripe checkout session
   */
  const handleSelectPlan = async (tierId: string) => {
    if (tierId === 'free') {
      navigate('/dashboard');
      return;
    }

    setUpgrading(tierId);
    try {
      // Find the tier to get its priceId
      const selectedTier = tiers.find(t => t.id === tierId);
      const priceId = (selectedTier as any)?.stripePriceId;

      const token = await getToken({ template: 'pan-api' });
      const response = await fetch(`${API_URL}/api/create-checkout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier: tierId, priceId }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url; // Redirect to Stripe
      } else {
        setError('Failed to create checkout session');
        setUpgrading(null);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Something went wrong. Please try again.');
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading pricing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <Link to="/dashboard" className="text-slate-600 hover:text-slate-900 no-underline">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-16">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Choose Your Plan</h1>
          <p className="text-xl text-slate-600">Upgrade or change your subscription</p>
          {currentPlan && (
            <p className="mt-2 text-sm text-slate-500">
              Current plan: <span className="font-semibold">{currentPlan.toUpperCase()}</span>
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-center">{error}</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => {
            const isCurrentPlan = tier.id === currentPlan;
            const isUpgrading = upgrading === tier.id;

            return (
              <div
                key={tier.id}
                className={`bg-white p-8 rounded-2xl border-2 transition-all ${
                  isCurrentPlan
                    ? 'border-slate-900 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                }`}
              >
                {/* Current plan badge - Uses primary color */}
                {isCurrentPlan && (
                  <div className="mb-4 inline-block px-3 py-1 text-white text-xs font-bold rounded" style={{ backgroundColor: primaryColor }}>
                    CURRENT PLAN
                  </div>
                )}

                {/* Tier Name */}
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{tier.name}</h3>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-5xl font-bold text-slate-900">${tier.price}</span>
                  <span className="text-slate-600">/month</span>
                </div>

                {/* Limit */}
                <p className="text-slate-600 mb-6 text-lg">
                  {tier.limit === 'unlimited' ? 'Unlimited requests' : `${tier.limit} requests/month`}
                </p>

                {/* CTA Button - Primary color for paid tiers */}
                <button
                  onClick={() => handleSelectPlan(tier.id)}
                  disabled={isCurrentPlan || isUpgrading}
                  className={`w-full py-3 rounded-lg font-semibold transition-opacity ${
                    isCurrentPlan
                      ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                      : isUpgrading
                      ? 'bg-slate-300 text-slate-600 cursor-wait'
                      : tier.id === 'free'
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300'
                      : 'text-white hover:opacity-90'
                  }`}
                  style={!isCurrentPlan && !isUpgrading && tier.id !== 'free' ? { backgroundColor: primaryColor } : undefined}
                >
                  {isCurrentPlan
                    ? 'Current Plan'
                    : isUpgrading
                    ? 'Processing...'
                    : tier.id === 'free'
                    ? 'Select Free'
                    : 'Upgrade'}
                </button>

                {/* Features */}
                <ul className="mt-8 space-y-3">
                  <li className="flex items-start text-slate-600 text-sm">
                    <span className="mr-2">✓</span>
                    <span>Feature one</span>
                  </li>
                  <li className="flex items-start text-slate-600 text-sm">
                    <span className="mr-2">✓</span>
                    <span>Feature two</span>
                  </li>
                  <li className="flex items-start text-slate-600 text-sm">
                    <span className="mr-2">✓</span>
                    <span>Feature three</span>
                  </li>
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm">
            All plans include access to core features • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
