/**
 * @fileoverview Content Security Policy builder.
 *
 * Scripts are allowed by per-request nonce ('strict-dynamic'), so injected
 * inline or third-party scripts cannot run. Network access is limited to the
 * app itself and the configured API / socket origins.
 *
 * Styles keep 'unsafe-inline': Radix, motion and the chart component rely on
 * inline style attributes and <style> tags, and adding a nonce to style-src
 * would make browsers ignore 'unsafe-inline'.
 */

export interface CspOptions {
  nonce: string
  isDev: boolean
  apiUrl?: string
  socketUrl?: string
}

/** Returns the origin of `url`, or null when it is missing or invalid. */
function originOf(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

/** Maps an http(s) origin to its ws(s) counterpart. */
function toWebSocketOrigin(origin: string): string {
  return origin.replace(/^http/, "ws")
}

export function buildCsp({ nonce, isDev, apiUrl, socketUrl }: CspOptions): string {
  const connectSrc = new Set<string>(["'self'"])
  for (const origin of [originOf(apiUrl), originOf(socketUrl)]) {
    if (!origin) continue
    connectSrc.add(origin)
    connectSrc.add(toWebSocketOrigin(origin))
  }
  if (isDev) {
    connectSrc.add("http://localhost:*")
    connectSrc.add("ws://localhost:*")
  }

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-eval' is only needed by React's dev tooling
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "media-src": ["'self'", "blob:", "https:"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "connect-src": [...connectSrc],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  }

  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ")

  return isDev ? policy : `${policy}; upgrade-insecure-requests`
}

/** Generates a fresh, unpredictable nonce for one request. */
export function createNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}
