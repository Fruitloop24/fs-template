/**
 * ============================================================================
 * LANDING PAGE - PUBLIC HOMEPAGE
 * ============================================================================
 *
 * CONFIGURABLE DESIGN - Reads branding from config.json
 * All text, colors, and branding come from the ConfigContext
 *
 * SECTIONS:
 * - Hero: Headline + subtitle + CTA (from config.branding)
 * - Pricing: Tier cards (fetched from API)
 * - Footer: Simple links (app name from config)
 *
 * ✅ WHAT'S CONFIGURABLE:
 * - App name (config.branding.appName)
 * - Primary color (config.branding.primaryColor)
 * - Value proposition (config.branding.valueProp)
 * - Description (config.branding.description)
 *
 * ❌ DON'T TOUCH: Auth logic, tier fetching, routing
 *
 * ============================================================================
 */

import { SignedIn, SignedOut, useUser, UserButton } from '@clerk/clerk-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import type { Tier as ConfigTier } from '../contexts/config-context.types'; // Type-only import

interface Tier {
  id: string;
  name: string;
  price: number;
  limit: number | 'unlimited';
  hasPriceId: boolean;
  features: string[]; // Added features to local Tier interface
}

export default function Landing() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [tiers, setTiers] = useState<Tier[]>([]);

  // ============================================================================
  // LOAD CONFIGURATION
  // Get branding from ConfigContext (loaded from /config.json)
  // ============================================================================
  const { config, loading: configLoading } = useConfig();

  const plan = (user?.publicMetadata?.plan as string) || 'free';

  // Extract branding for easy access
  const appName = config?.branding?.appName || 'YourApp';
  const logoUrl = config?.branding?.logoUrl || '';
  const heroImageUrl = config?.branding?.heroImageUrl || '';
  const primaryColor = config?.branding?.primaryColor || '#0f172a';
  const valueProp = config?.branding?.valueProp || 'Your Product Headline';
  const description = config?.branding?.description || 'Describe what your product does in one compelling sentence.';

  useEffect(() => {
    // Use tiers from config.json (already has user's configured tiers)
    if (config?.tiers) {
      const tiersData = config.tiers.map((tier: ConfigTier) => ({
        id: tier.name,
        name: tier.displayName,
        price: tier.price,
        limit: (tier.limit === null || tier.limit === undefined) ? 'unlimited' : tier.limit as number | 'unlimited',
        hasPriceId: !!tier.stripePriceId,
        features: Array.isArray(tier.features) ? tier.features : [], // Features already an array from GitHub Action
      }));
      setTiers(tiersData);
    }
  }, [config]);

  const handleGetStarted = (tierId: string) => {
    if (user) {
      if (tierId === 'free' || tierId === plan) {
        navigate('/dashboard');
      } else {
        navigate('/choose-plan');
      }
    } else {
      navigate('/sign-up');
    }
  };

  // Show loading state while config is being fetched
  if (configLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ================================================================
          NAVIGATION
          Logo and app name from config.branding
          Primary color applied to buttons via inline styles
          ================================================================ */}
      <nav className="border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 no-underline hover:opacity-80 transition-opacity">
          {logoUrl && (
            <img src={logoUrl} alt={`${appName} logo`} className="h-10 w-auto" />
          )}
          <span className="text-slate-900 text-2xl font-bold">{appName}</span>
        </Link>
        <div className="flex gap-8 items-center">
          {/* Menu Links - Add/remove as needed */}
          <div className="hidden md:flex gap-8">
            <a href="#features" className="text-slate-700 hover:text-slate-900 no-underline font-medium">
              Features
            </a>
            <a href="#pricing" className="text-slate-700 hover:text-slate-900 no-underline font-medium">
              Pricing
            </a>
            <a href="#about" className="text-slate-700 hover:text-slate-900 no-underline font-medium">
              About
            </a>
          </div>
          {/* Auth Buttons - Primary color applied dynamically */}
          <div className="flex gap-4 items-center">
            <SignedOut>
              <Link to="/sign-in" className="px-6 py-2 text-slate-700 hover:text-slate-900 no-underline font-semibold">
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="px-6 py-2 text-white no-underline rounded-lg font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Get Started
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                to="/dashboard"
                className="px-6 py-2 text-white no-underline rounded-lg font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Dashboard
              </Link>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* ================================================================
          HERO SECTION
          Headline and description from config.branding
          Hero image displayed if provided
          Primary color applied to CTA buttons
          ================================================================ */}
      <div className="max-w-7xl mx-auto px-8 py-24">
        <div className={`grid ${heroImageUrl ? 'md:grid-cols-2' : 'grid-cols-1'} gap-12 items-center`}>
          {/* Hero Text */}
          <div className={heroImageUrl ? 'text-left' : 'text-center mx-auto max-w-5xl'}>
            <h1 className="text-6xl font-bold text-slate-900 mb-6 leading-tight">
              {valueProp}
            </h1>
            <p className="text-2xl text-slate-600 mb-12 leading-relaxed">
              {description}
            </p>
            <div className="flex gap-4 items-center">
              <SignedOut>
                <Link
                  to="/sign-up"
                  className="inline-block px-12 py-4 text-white no-underline rounded-lg font-bold text-lg transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Start Free Trial
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="inline-block px-12 py-4 text-white no-underline rounded-lg font-bold text-lg transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  Go to Dashboard
                </Link>
              </SignedIn>
            </div>
            <p className="mt-6 text-slate-500 text-sm">No credit card required • Free tier available</p>
          </div>

          {/* Hero Image */}
          {heroImageUrl && (
            <div className="relative">
              <img
                src={heroImageUrl}
                alt="Product hero"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          FEATURES SECTION
          Shows the top features from the tiers
          Automatically pulls from tier features for visual display
          ================================================================ */}
      {tiers.length > 0 && (
        <div id="features" className="max-w-7xl mx-auto px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Everything You Need</h2>
            <p className="text-xl text-slate-600">Powerful features to help you succeed</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature cards generated from tier features */}
            {tiers
              .flatMap(tier => tier.features || [])
              .filter((feature, index, self) => feature && self.indexOf(feature) === index)
              .slice(0, 6)
              .map((feature, index) => (
                <div key={index} className="bg-white p-8 rounded-xl border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-white text-2xl font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    ✓
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{feature}</h3>
                  <p className="text-slate-600">
                    Get access to {feature.toLowerCase()} and more with our platform.
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ================================================================
          PRICING SECTION
          Tiers are fetched from API (/api/tiers)
          Modify: Section title, card styling, feature text
          Don't touch: Tier fetching logic, pricing data
          ================================================================ */}
      <div id="pricing" className="max-w-7xl mx-auto px-8 py-24 bg-slate-50">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-slate-600">Choose the plan that fits your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <div key={tier.id} className="bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all">
              {/* Tier Name */}
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{tier.name}</h3>

              {/* Price */}
              <div className="mb-6">
                <span className="text-5xl font-bold text-slate-900">${tier.price}</span>
                <span className="text-slate-600">/month</span>
              </div>

              {/* Main Feature */}
              <p className="text-slate-600 mb-6 text-lg font-medium">
                {tier.limit === 'unlimited' ? 'Unlimited requests' : `${tier.limit} requests/month`}
              </p>

              {/* CTA Button - Primary color for paid tiers */}
              <button
                onClick={() => handleGetStarted(tier.id)}
                className={`w-full py-3 rounded-lg font-semibold transition-opacity ${
                  tier.id === plan
                    ? 'bg-slate-200 text-slate-600 cursor-default'
                    : tier.id === 'free'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300'
                    : 'text-white hover:opacity-90'
                }`}
                style={tier.id !== plan && tier.id !== 'free' ? { backgroundColor: primaryColor } : undefined}
                disabled={tier.id === plan}
              >
                {tier.id === plan ? 'Current Plan' : tier.id === 'free' ? 'Start Free' : 'Get Started'}
              </button>

              {/* Features List */}
              <ul className="mt-8 space-y-3">
                {tier.features?.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start text-slate-600">
                    <span className="mr-2">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ================================================================
          FOOTER
          App name from config.branding
          ================================================================ */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-8 text-center text-slate-600 text-sm">
          <p>© 2025 {appName}. Built with the Fact-SaaS Platform.</p>
        </div>
      </footer>
    </div>
  );
}
