/**
 * @fileoverview Validation for post-login return paths (`?next=`).
 *
 * Only same-origin, locale-less app paths are accepted so the parameter
 * cannot be abused as an open redirect.
 */

const DEFAULT_AFTER_LOGIN = "/dashboard/overview"

/** True when `pathname` is `segment` itself or nested under it. */
export function isUnderPath(pathname: string | null | undefined, segment: string): boolean {
  if (!pathname) return false
  return pathname === segment || pathname.startsWith(`${segment}/`)
}

/**
 * Returns `raw` when it is a safe relative app path, otherwise null.
 * Rejects absolute URLs, protocol-relative (`//host`) and backslash tricks,
 * and paths pointing back at the auth pages.
 */
export function getSafeNextPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 2048) return null
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null
  // Reject control characters, which some browsers strip before resolving
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null

  try {
    const base = "http://internal.invalid"
    const url = new URL(raw, base)
    if (url.origin !== base) return null
    if (isUnderPath(url.pathname, "/auth")) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

/** Resolves where to send the user after a successful login. */
export function resolveAfterLoginPath(search: string | null | undefined): string {
  const next = new URLSearchParams(search ?? "").get("next")
  return getSafeNextPath(next) ?? DEFAULT_AFTER_LOGIN
}
