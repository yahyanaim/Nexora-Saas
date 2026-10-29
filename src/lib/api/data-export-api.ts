/**
 * Full export and deletion of a workspace's data (PLT-14). In demo mode the
 * data lives in browser storage under `nexora:<collection>:<workspaceId>`;
 * the backend will produce the same shape from the database.
 */

import { recordAudit } from "@/lib/workforce/audit"

const PREFIX = "nexora:"
/** The audit trail outlives a "delete all": who wiped the data stays on record. */
const KEPT = new Set(["audit"])

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
  recordAudit(workspaceId, { action: "Workspace data exported", actionKey: "settings.data_exported", category: "Security", target: `${Object.keys(out).length} collections` })
  return { workspaceId, exportedAt: new Date().toISOString(), data: out }
}

/** Removes every stored record of the workspace. Demo data is re-seeded on next load. */
export async function deleteWorkspaceDataApi(workspaceId: string): Promise<number> {
  const keys = workspaceKeys(workspaceId).filter((k) => !KEPT.has(collectionOf(k, workspaceId)))
  for (const key of keys) localStorage.removeItem(key)
  recordAudit(workspaceId, { action: "Workspace data deleted", actionKey: "settings.data_deleted", category: "Security", target: `${keys.length} collections` })
  return keys.length
}
