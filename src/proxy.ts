import { NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { buildCsp, createNonce } from "./lib/security/csp"

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

/** Attaches the per-request CSP to an outgoing response. */
function withCsp(response: Response, csp: string): Response {
  response.headers.set("Content-Security-Policy", csp)
  return response
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  const nonce = createNonce()
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL,
  })

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
    return withCsp(NextResponse.redirect(loginUrl, 302), csp)
  }

  // Next.js reads the nonce from the request's CSP header during rendering;
  // next-intl forwards these request headers on its rewrite/next responses.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", csp)

  const response = await intlMiddleware(new NextRequest(req, { headers: requestHeaders }))
  return withCsp(response, csp)
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/"],
}
