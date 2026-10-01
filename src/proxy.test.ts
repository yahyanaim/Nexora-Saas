import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { proxy } from "./proxy"
import { routing } from "./i18n/routing"

// Mock next-intl/middleware
vi.mock("next-intl/middleware", () => {
  return {
    default: () => vi.fn((req: NextRequest) => new Response(null, {
      status: 200,
      headers: { "x-middleware-matched": "intl", "x-url": req.url },
    })),
  }
})

describe("Edge Proxy Middleware (src/proxy.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createMockRequest(url: string, cookies: Record<string, string> = {}) {
    const parsedUrl = new URL(url, "http://localhost:3000")
    const req = new NextRequest(parsedUrl)
    for (const [key, value] of Object.entries(cookies)) {
      req.cookies.set(key, value)
    }
    return req
  }

  describe("Dashboard Route Guarding", () => {
    it("falls back to the default locale for unknown locale prefixes", async () => {
      const res = await proxy(createMockRequest("http://localhost:3000/zz/dashboard"))
      // /zz/dashboard is not a dashboard route for a known locale, so it is not guarded here
      expect(res.headers.get("x-middleware-matched")).toBe("intl")
    })

    it("preserves the query string in the next parameter", async () => {
      const res = await proxy(createMockRequest("http://localhost:3000/en/dashboard/users?page=2"))
      const location = new URL(res.headers.get("location")!)
      expect(location.pathname).toBe("/en/auth")
      expect(location.searchParams.get("next")).toBe("/dashboard/users?page=2")
    })

    it("does not guard routes that merely start with 'dashboard'", async () => {
      const res = await proxy(createMockRequest("http://localhost:3000/en/dashboards-info"))
      expect(res.headers.get("x-middleware-matched")).toBe("intl")
    })

    it("redirects unauthenticated access to /en/dashboard to /en/auth", async () => {
      const req = createMockRequest("http://localhost:3000/en/dashboard")
      const res = await proxy(req)

      expect(res.status).toBe(302)
      const location = res.headers.get("location")
      expect(location).toBe("http://localhost:3000/en/auth?next=%2Fdashboard")
    })

    it("redirects unauthenticated access to /dashboard (no locale prefix) to defaultLocale /auth", async () => {
      const req = createMockRequest("http://localhost:3000/dashboard")
      const res = await proxy(req)

      expect(res.status).toBe(302)
      const location = res.headers.get("location")
      expect(location).toBe(`http://localhost:3000/${routing.defaultLocale}/auth?next=%2Fdashboard`)
    })

    it("redirects unauthenticated nested dashboard routes with specific locale (/ar/dashboard/overview)", async () => {
      const req = createMockRequest("http://localhost:3000/ar/dashboard/overview")
      const res = await proxy(req)

      expect(res.status).toBe(302)
      const location = res.headers.get("location")
      expect(location).toBe("http://localhost:3000/ar/auth?next=%2Fdashboard%2Foverview")
    })

    it("redirects unauthenticated access to /fr/dashboard/invoices to /fr/auth", async () => {
      const req = createMockRequest("http://localhost:3000/fr/dashboard/invoices")
      const res = await proxy(req)

      expect(res.status).toBe(302)
      const location = res.headers.get("location")
      expect(location).toBe("http://localhost:3000/fr/auth?next=%2Fdashboard%2Finvoices")
    })

    it("allows authenticated request with token cookie to pass through to intlMiddleware", async () => {
      const req = createMockRequest("http://localhost:3000/en/dashboard", {
        token: "valid-session-jwt-token",
      })
      const res = await proxy(req)

      expect(res.status).toBe(200)
      expect(res.headers.get("x-middleware-matched")).toBe("intl")
      expect(res.headers.get("location")).toBeNull()
    })
  })

  describe("Public Routes and Int-Middleware Passthrough", () => {
    it("allows access to public auth route /en/auth without token", async () => {
      const req = createMockRequest("http://localhost:3000/en/auth")
      const res = await proxy(req)

      expect(res.status).toBe(200)
      expect(res.headers.get("x-middleware-matched")).toBe("intl")
    })

    it("allows access to root route / without token", async () => {
      const req = createMockRequest("http://localhost:3000/")
      const res = await proxy(req)

      expect(res.status).toBe(200)
      expect(res.headers.get("x-middleware-matched")).toBe("intl")
    })

    it("allows access to public marketing/billing route without token", async () => {
      const req = createMockRequest("http://localhost:3000/en/billing")
      const res = await proxy(req)

      expect(res.status).toBe(200)
      expect(res.headers.get("x-middleware-matched")).toBe("intl")
    })
  })
})
