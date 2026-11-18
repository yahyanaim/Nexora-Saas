/**
 * Realm and version prefixes of the server's paths (API contract §2, cahier
 * ARC-07, decision E2). The API helpers write paths without them
 * (`/auth/login`, `/me/workspaces`, `/workspaces/:wid/members`); the client
 * adds the prefix of the realm the path belongs to:
 *
 * - `/portal/…`   → `/portal/v1/…`   (client contacts)
 * - `/platform/…` → `/platform/v1/…` (the Nexora console)
 * - anything else → `/app/v1/…`      (company members)
 *
 * A path that already carries a realm and version is left as it is, so the
 * mapping can run twice (a replayed request) without doubling the prefix.
 */

export type Realm = "app" | "portal" | "platform"

const VERSIONED = /^\/(app|portal|platform)\/v\d+(\/|$)/

/** The realm a path (without prefix) belongs to. */
export function realmOf(path: string): Realm {
  if (path === "/portal" || path.startsWith("/portal/")) return "portal"
  if (path === "/platform" || path.startsWith("/platform/")) return "platform"
  return "app"
}

/** The server path of an API helper's path: realm and version added once. */
export function realmPath(url: string): string {
  if (/^https?:\/\//.test(url)) return url
  const path = url.startsWith("/") ? url : `/${url}`
  if (VERSIONED.test(path)) return path
  const realm = realmOf(path)
  if (realm === "app") return `/app/v1${path}`
  return `/${realm}/v1${path.slice(realm.length + 1)}`
}

/** A workspace record's path: `/workspaces/:wid/…` (the server checks the membership, TEN-01). */
export function workspacePath(workspaceId: string, path: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}${path.startsWith("/") ? path : `/${path}`}`
}
