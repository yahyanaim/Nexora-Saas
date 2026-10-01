/**
 * @fileoverview Single source of truth for demo-mode detection.
 *
 * Evaluates to true only when NEXT_PUBLIC_DEMO_MODE is explicitly "true" and
 * the build is not a production build. A production build may opt in to demo
 * mode (e.g. a public showcase deployment) only by also setting
 * NEXT_PUBLIC_ALLOW_DEMO_BUILD="true".
 *
 * Only NEXT_PUBLIC_* and NODE_ENV are inlined into the client bundle, so
 * the check must not rely on server-only variables such as VERCEL_ENV.
 *
 * Never read NEXT_PUBLIC_DEMO_MODE anywhere else (enforced by ESLint).
 */

export const isDemoMode = (): boolean => {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return false
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ALLOW_DEMO_BUILD !== "true"
  ) {
    return false
  }
  return true
}
