import createNextIntlPlugin from "next-intl/plugin"
import "./src/env.ts"
import { buildApiProxyRewrites } from "./src/lib/api-proxy.ts"

// Build-time security guard: prevent demo mode auth bypass in production deployments
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

const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production"

// Content-Security-Policy is set per request (with a script nonce) in src/proxy.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      ...(!isProduction
        ? [
            {
              protocol: "http",
              hostname: "localhost",
            },
          ]
        : []),
    ],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async rewrites() {
    // Optional same-origin API proxy for API hosts on another domain
    return {
      beforeFiles: buildApiProxyRewrites(process.env.API_PROXY_TARGET),
      afterFiles: [],
      fallback: [],
    }
  },
  async headers() {
    return [
      // The service worker must always be fetched fresh, or updates never reach phones (Phase 6h.3)
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Origin-Agent-Cluster",
            value: "?1",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
}

const withNextIntl = createNextIntlPlugin()
export default withNextIntl(nextConfig)
