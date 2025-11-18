/**
 * ============================================================================
 * DASHBOARD - MAIN APPLICATION PAGE
 * ============================================================================
 *
 * CONFIGURABLE DESIGN - Reads branding from config.json
 * App name, colors, and description come from ConfigContext
 *
 * LAYOUT:
 * - Nav: Logo (config.branding.appName) + Upgrade + Billing + User menu
 * - Sidebar: Usage stats (subtle)
 * - Main Area: YOUR PRODUCT GOES HERE
 * - Footer: Upgrade CTA (free tier only, uses primary color)
 *
 * ✅ WHAT'S CONFIGURABLE:
 * - App name (config.branding.appName)
 * - Primary color (config.branding.primaryColor) for buttons
 * - Description (config.branding.description)
 *
 * ❌ DON'T TOUCH: Auth logic, API calls, usage tracking
 *
 * ============================================================================
 */

import { useAuth, useUser } from '@clerk/clerk-react';
import { useEffect, useState, useCallback } from 'react'; // Added useCallback
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';

interface UsageData {
  userId: string;
  plan: string;
  usageCount: number;
  limit: number | string;
  remaining: number | string;
}

interface ApiResponse {
  success: boolean;
  data?: { message?: string }; // Changed 'any' to a more specific type
  usage?: { count: number; limit: number | string; plan: string };
  error?: string;
  message?: string;
}

export default function Dashboard() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchParams] = useSearchParams();

  // ============================================================================
  // LOAD CONFIGURATION
  // Get branding from ConfigContext (loaded from /config.json)
  // ============================================================================
  const { config } = useConfig();

  const API_URL = config?.apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:8787';

  // Extract branding for easy access
  const appName = config?.branding?.appName || 'YourApp';
  const primaryColor = config?.branding?.primaryColor || '#0f172a';
  const description = config?.branding?.description || 'Your product description goes here';

  const fetchUsage = useCallback(async (forceRefresh = false) => { // Wrapped in useCallback
    try {
      const headers: Record<string, string> = {};

      // Use platform user ID for preview mode (no auth required)
      if (config?.platformUserId) {
        headers['X-Platform-User-Id'] = config.platformUserId;
        console.log('[Dashboard] Preview mode - using platformUserId:', config.platformUserId);
      } else {
        // Production mode - use Clerk JWT
        const token = await getToken({ template: 'pan-api', ...(forceRefresh && { skipCache: true }) });
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/usage`, {
        headers,
      });
      const data = await response.json();
      setUsage(data);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  }, [getToken, API_URL, config]); // Added config to dependencies

  const makeRequest = async () => {
    setLoading(true);
    setMessage('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // Use platform user ID for preview mode
      if (config?.platformUserId) {
        headers['X-Platform-User-Id'] = config.platformUserId;
      } else {
        // Production mode - use Clerk JWT
        const token = await getToken({ template: 'pan-api' });
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/data`, {
        method: 'POST',
        headers,
      });
      const data: ApiResponse = await response.json();

      if (response.ok) {
        setMessage(`✓ ${data.data?.message || 'Success!'}`);
        await fetchUsage();
      } else {
        setMessage(`✗ ${data.error || 'Failed'}`);
      }
    } catch (error) {
      setMessage('✗ Request failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = () => navigate('/choose-plan');

  const handleManageBilling = async () => {
    try {
      const token = await getToken({ template: 'pan-api' });
      const response = await fetch(`${API_URL}/api/customer-portal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok && data.url) window.location.href = data.url;
      else alert(data.error || 'Failed to open billing portal');
    } catch (error) {
      console.error('Billing portal error:', error);
      alert('Failed to open billing portal');
    }
  };

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      setMessage('🎉 Upgrade successful! Refreshing...');
      const refresh = async () => {
        try {
          await getToken({ template: 'pan-api', skipCache: true });
          await new Promise(r => setTimeout(r, 500));
          window.location.href = '/dashboard';
        } catch (error) { // Log the error to make it "used"
          console.error("Error during refresh after upgrade:", error);
          window.location.href = '/dashboard';
        }
      };
      const timer = setTimeout(refresh, 2000);
      return () => clearTimeout(timer);
    } else if (isLoaded && user) {
      fetchUsage();
    }
  }, [isLoaded, user, searchParams, getToken, fetchUsage]); // Added fetchUsage to dependencies

  const plan = (user?.publicMetadata?.plan as string) || 'free';

  // Derive the limit from config.json based on the current plan
  const currentTier = config?.tiers.find(t => t.name.toLowerCase() === plan.toLowerCase());
  const derivedLimit = currentTier?.limit || usage?.limit || 'unlimited';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation - App name and primary color from config */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <Link to="/" className="no-underline text-slate-900 text-2xl font-bold hover:text-slate-700">
          {appName}
        </Link>
        <div className="flex gap-4 items-center">
          <button
            onClick={handleChangePlan}
            className="px-6 py-2 text-white border-none rounded-lg cursor-pointer font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            {plan === 'free' ? 'Upgrade' : 'Change Plan'}
          </button>
          {plan !== 'free' && (
            <button onClick={handleManageBilling} className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg cursor-pointer font-semibold text-sm transition-colors">
              Manage Billing
            </button>
          )}
          <UserButton />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header - Description from config */}
        <div className="mb-12">
          <h1 className="text-4xl mb-2 text-slate-900 font-bold">Welcome back</h1>
          <p className="text-slate-600 text-lg">{description}</p>
        </div>

        {/* Main Grid: Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-8 mb-8">
          {/* Usage Sidebar - Subtle */}
          {usage && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 h-fit">
              <h2 className="text-xs mb-4 text-slate-500 font-semibold uppercase tracking-wider">Usage</h2>
              <div className="mb-4">
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {usage.usageCount}
                  {derivedLimit !== 'unlimited' && <span className="text-lg text-slate-400"> / {derivedLimit}</span>}
                </div>
                <p className="text-slate-600 text-sm">requests</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                <p className="m-0 text-slate-700 text-sm font-medium">
                  {derivedLimit === 'unlimited' ? 'Unlimited' : `${usage.remaining} remaining`}
                </p>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="inline-block px-3 py-1 rounded text-xs font-bold tracking-wider bg-slate-900 text-white">
                  {plan.toUpperCase()}
                </div>
              </div>
            </div>
          )}

          {/* Action Area - YOUR PRODUCT */}
          <div className="bg-white p-8 rounded-xl border border-gray-200">
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 mb-6">
              <p className="text-slate-800 text-sm font-semibold mb-1">💡 Replace this with YOUR product</p>
              <p className="text-slate-600 text-xs">Button below shows pattern: call API, track usage, show results</p>
            </div>

            <h2 className="text-2xl mb-3 text-slate-900 font-bold">Your Feature</h2>
            <p className="text-slate-600 mb-6">Describe what your product does. Usage tracking is handled.</p>

            <button
              onClick={makeRequest}
              disabled={loading}
              className={`px-8 py-3 text-sm text-white border-none rounded-lg font-semibold transition-opacity ${
                loading ? 'bg-slate-300 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'
              }`}
              style={!loading ? { backgroundColor: primaryColor } : undefined}
            >
              {loading ? 'Processing...' : 'Try Demo'}
            </button>

            {message && (
              <div className="mt-6 px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-sm">
                {message}
              </div>
            )}

            <div className="mt-8 p-6 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-slate-500 text-sm text-center">Your product output goes here</p>
            </div>
          </div>
        </div>

        {/* Upgrade CTA (free only) - Uses primary color */}
        {plan === 'free' && (
          <div className="p-12 rounded-2xl text-white text-center" style={{ backgroundColor: primaryColor }}>
            <h3 className="text-3xl mb-3 font-bold">Upgrade to Pro</h3>
            <p className="text-lg mb-8 opacity-90">Get unlimited access and more features</p>
            <button onClick={handleChangePlan} className="px-12 py-3 bg-white border-none rounded-lg cursor-pointer font-bold text-base transition-opacity hover:opacity-90" style={{ color: primaryColor }}>
              View Plans
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
