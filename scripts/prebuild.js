#!/usr/bin/env node

/**
 * Prebuild security verification script.
 * Halts production builds if demo mode is enabled.
 */
if (
  process.env.VERCEL_ENV === "production" &&
  process.env.NEXT_PUBLIC_DEMO_MODE === "true"
) {
  throw new Error(
    "SECURITY VIOLATION: NEXT_PUBLIC_DEMO_MODE cannot be 'true' in production (VERCEL_ENV=production). Please unset or set NEXT_PUBLIC_DEMO_MODE=false."
  )
}
