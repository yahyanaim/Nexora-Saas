/**
 * @fileoverview Optional same-origin API proxy (Next.js rewrites).
 *
 * When API_PROXY_TARGET is set (e.g. https://api.other-domain.com), requests
 * to /api/* on the frontend are forwarded to `${API_PROXY_TARGET}/api/*`.
 * Session cookies set by the backend then belong to the frontend's own
 * domain, so the edge guard in src/proxy.ts can see them even when the
 * API lives on an unrelated domain, and no CORS setup is needed.
 *
 * Rewrites are resolved at build time: set API_PROXY_TARGET for `next build`.
 * WebSockets are not proxied; Socket.io keeps using NEXT_PUBLIC_SOCKET_URL.
 */

export interface Rewrite {
  source: string
  destination: string
}

/**
 * Returns the `beforeFiles` rewrites for the API proxy, or an empty list
 * when no target is configured. `beforeFiles` is required so the proxy
 * takes precedence over the 410 catch-all route in src/app/api.
 */
export function buildApiProxyRewrites(target: string | undefined): Rewrite[] {
  if (!target) return []

  let url: URL
  try {
    url = new URL(target)
  } catch {
    throw new Error(`API_PROXY_TARGET must be an absolute URL, received "${target}"`)
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`API_PROXY_TARGET must use http(s), received "${url.protocol}"`)
  }

  const base = `${url.origin}${url.pathname.replace(/\/$/, "")}`
  return [{ source: "/api/:path*", destination: `${base}/api/:path*` }]
}
