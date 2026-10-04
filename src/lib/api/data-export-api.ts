/**
 * Full export and deletion of a workspace's data (PLT-14). In demo mode the
 * data lives in browser storage under `nexora:<collection>:<workspaceId>`;
 * the backend will produce the same shape from the database.
 */

const PREFIX = "nexora:"

function workspaceKeys(workspaceId: string) {
  if (typeof window === "undefined") return []
  const suffix = `:${workspaceId}`
  return Object.keys(localStorage).filter((k) => k.startsWith(PREFIX) && k.endsWith(suffix))
}

const collectionOf = (key: string, workspaceId: string) => key.slice(PREFIX.length, -(workspaceId.length + 1))

/** Every collection of the workspace, keyed by name. */
export async function exportWorkspaceDataApi(workspaceId: string): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {}
  for (const key of workspaceKeys(workspaceId)) {
    try {
      out[collectionOf(key, workspaceId)] = JSON.parse(localStorage.getItem(key) ?? "null")
    } catch {
      // Skip unreadable entries rather than failing the whole export
    }
  }
  return { workspaceId, exportedAt: new Date().toISOString(), data: out }
}

/** Removes every stored record of the workspace. Demo data is re-seeded on next load. */
export async function deleteWorkspaceDataApi(workspaceId: string): Promise<number> {
  const keys = workspaceKeys(workspaceId)
  for (const key of keys) localStorage.removeItem(key)
  return keys.length
}
