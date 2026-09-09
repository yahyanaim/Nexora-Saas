import { NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { middlewareAuth } from "@/lib/auth/guards"

const intlMiddleware = createMiddleware(routing)

// ─── API Routes ───
const protectedApiPaths = [
  "/api/admin",
  "/api/user",
  "/api/posts",
  "/api/roles",
  "/api/users",
]

const publicApiPaths = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/verify-otp",
  "/api/auth/resend-otp",
  "/api/auth/forgot-password",
  "/api/auth/verify-forgot-password",
  "/api/auth/reset-password",
  "/api/auth/logout",
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ─── API Routes: Auth Guard ───
  if (pathname.startsWith("/api/")) {
    // Public API → skip auth
    if (publicApiPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.next()
    }

    // Protected API → validate Bearer token
    if (protectedApiPaths.some((p) => pathname.startsWith(p))) {
      const result = await middlewareAuth(req)

      if (!result.success) {
        return result.response
      }

      // Pass user info to API handlers via headers
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set("x-user-id", result.user._id.toString())
      requestHeaders.set("x-user-type", result.user.userType)
      requestHeaders.set("x-session-id", result.sessionId)

      return NextResponse.next({
        request: { headers: requestHeaders },
      })
    }

    // Any other API route → pass through
    return NextResponse.next()
  }

  // ─── Page Routes: next-intl ───
  return intlMiddleware(req)
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
}
