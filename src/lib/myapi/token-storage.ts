/**
 * @fileoverview Cookie-Only Token Storage for Volix SaaS.
 *
 * In production, session tokens are managed exclusively as HttpOnly, Secure,
 * SameSite cookies by the backend. Client JavaScript does not and cannot read
 * or set session tokens.
 *
 * This module is maintained solely for local offline preview/demo mode
 * (NEXT_PUBLIC_DEMO_MODE=true) where client-side token simulation is needed.
 *
 * @deprecated In production, rely exclusively on server-managed HttpOnly cookies.
 */

import { isDemoMode } from "@/lib/auth/demo-mode"

const TOKEN_KEY = "token"

export const tokenStorage = {
  /**
   * Reads the token from document.cookie.
   * Strictly returns null unless isDemoMode() is true.
   *
   * @deprecated Session tokens are HttpOnly in production and inaccessible via document.cookie.
   */
  get: (): string | null => {
    if (typeof window === "undefined" || !isDemoMode()) return null

    const match = document.cookie.match(new RegExp(`(^| )${TOKEN_KEY}=([^;]+)`))
    return match && match[2] ? decodeURIComponent(match[2]) : null
  },

  /**
   * Sets the token as a SameSite=Lax cookie.
   * Strictly no-ops unless isDemoMode() is true.
   *
   * @deprecated Production relies exclusively on server-set HttpOnly cookies.
   */
  set: (token: string): void => {
    if (typeof window === "undefined" || !isDemoMode()) return

    const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days
    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`
  },

  /**
   * Clears the token cookie upon logout.
   */
  clear: (): void => {
    if (typeof window === "undefined") return

    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax${secure}`
  },
}
