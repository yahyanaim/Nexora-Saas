/**
 * @fileoverview Single source of truth for demo-mode detection.
 *
 * Evaluates to true only when NEXT_PUBLIC_DEMO_MODE is explicitly "true"
 * and the environment is not production (VERCEL_ENV !== "production").
 */

export const isDemoMode = (): boolean => {
  if (typeof process !== "undefined" && process.env.VERCEL_ENV === "production") {
    return false
  }
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true"
}
