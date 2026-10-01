import { NextRequest } from "next/server"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

const intlMiddleware = createMiddleware(routing)

/**
 * Auth-aware Next.js Edge Proxy / Middleware (Next.js 16 convention).
 *
 * Composes next-intl locale routing with server-side auth guards:
 * - Unauthenticated requests to /dashboard/* are redirected to /auth
 * - All other requests pass through to the intl middleware
 *
 * SECURITY & ARCHITECTURE:
 * In production, session tokens are managed via HttpOnly, Secure, SameSite cookies
 * set directly by the authentication backend.
 *
 * Edge Guarding Limitation:
 * The Edge proxy checks solely for the PRESENCE of the "token" cookie to quickly
 * protect dashboard routes from unauthenticated navigation. It does NOT perform
 * cryptographic JWT signature verification or expiration checks at the edge runtime
 * (to avoid bundling heavy crypto dependencies and secrets at the edge).
 * Strict cryptographic signature, expiry, and revocation validation are enforced
 * downstream by backend API handlers on every authenticated request.
 *
 * Note: In local demo mode (NEXT_PUBLIC_DEMO_MODE=true), the cookie may be set client-side
 * for mock demonstration.
 */
const localePattern = routing.locales.join("|")
const LOCALE_PREFIX = new RegExp(`^/(${localePattern})(?=/|$)`)
const DASHBOARD_ROUTE = new RegExp(`^(?:/(?:${localePattern}))?/dashboard(?:/|$)`)

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Check for auth cookie presence (HttpOnly in production; fallback in demo mode)
  const token = req.cookies.get("token")?.value

  // Guard dashboard routes: redirect to login if no session cookie
  if (DASHBOARD_ROUTE.test(pathname) && !token) {
    // Only known locales are honored; anything else falls back to the default
    const localeMatch = pathname.match(LOCALE_PREFIX)
    const locale = localeMatch?.[1] ?? routing.defaultLocale
    const returnTo = (localeMatch ? pathname.slice(localeMatch[0].length) : pathname) + search

    const loginUrl = new URL(`/${locale}/auth`, req.url)
    loginUrl.searchParams.set("next", returnTo)
    return Response.redirect(loginUrl)
  }

  return intlMiddleware(req)
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/"],
}
