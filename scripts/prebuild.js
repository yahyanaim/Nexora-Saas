#!/usr/bin/env node

/**
 * Prebuild security verification script.
 * Halts production builds if demo mode is enabled.
 */
const isProductionBuild =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production"
if (
  isProductionBuild &&
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
  process.env.NEXT_PUBLIC_ALLOW_DEMO_BUILD !== "true"
) {
  throw new Error(
    "SECURITY VIOLATION: NEXT_PUBLIC_DEMO_MODE=true is not allowed in a production build. Unset it, or set NEXT_PUBLIC_ALLOW_DEMO_BUILD=true for an intentional public demo deployment."
  )
}
