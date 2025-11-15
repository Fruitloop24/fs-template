/**
 * ============================================================================
 * APP ROUTER - MAIN APPLICATION ROUTES
 * ============================================================================
 *
 * PURPOSE:
 * Defines all routes for the application with authentication protection.
 * Uses Clerk's <SignedIn> and <SignedOut> components to guard routes.
 *
 * ROUTE TYPES:
 * - Public routes: Anyone can access (Landing, Sign In, Sign Up)
 * - Protected routes: Require authentication (Dashboard, Checkout, etc.)
 *
 * ============================================================================
 * AI MODIFICATION GUIDE
 * ============================================================================
 *
 * ✅ SAFE TO MODIFY:
 * - Landing page route path (currently "/")
 * - Add new public routes (blog, about, pricing page, etc.)
 * - Add new protected routes (settings, profile, etc.)
 * - Change redirect destinations (currently "/sign-up" and "/sign-in")
 *
 * ⚠️ BE CAREFUL:
 * - Don't remove <SignedIn> / <SignedOut> wrappers (breaks auth)
 * - Keep the <Navigate> fallbacks for protected routes
 * - Maintain the /sign-in/* and /sign-up/* wildcards (Clerk needs them)
 *
 * ❌ DON'T TOUCH:
 * - The <SignedIn> / <SignedOut> pattern for protected routes
 * - Clerk's authentication logic
 * - The Routes/Route structure (React Router v6)
 *
 * ============================================================================
 * HOW TO ADD NEW ROUTES
 * ============================================================================
 *
 * PUBLIC ROUTE (no auth required):
 * <Route path="/about" element={<AboutPage />} />
 *
 * PROTECTED ROUTE (requires sign-in):
 * <Route
 *   path="/settings"
 *   element={
 *     <>
 *       <SignedIn>
 *         <SettingsPage />
 *       </SignedIn>
 *       <SignedOut>
 *         <Navigate to="/sign-in" replace />
 *       </SignedOut>
 *     </>
 *   }
 * />
 *
 * ============================================================================
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { ConfigProvider } from './contexts/ConfigContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import CheckoutPage from './pages/CheckoutPage'
import ChoosePlanPage from './pages/ChoosePlanPage'

function App() {
  return (
    <ConfigProvider>
      <Routes>
      {/* ================================================================
          PUBLIC ROUTES - No authentication required
          ================================================================ */}
      <Route path="/" element={<Landing />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* ================================================================
          PROTECTED ROUTES - Authentication required
          - If signed in: Show the page
          - If signed out: Redirect to sign-up or sign-in
          ================================================================ */}
      <Route
        path="/choose-plan"
        element={
          <>
            <SignedIn>
              <ChoosePlanPage />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-up" replace />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/checkout"
        element={
          <>
            <SignedIn>
              <CheckoutPage />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/dashboard"
        element={
          <>
            <SignedIn>
              <Dashboard />
            </SignedIn>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
          </>
        }
      />
      </Routes>
    </ConfigProvider>
  )
}

export default App
