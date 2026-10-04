import type { AuditLogCategory, AuditLogEntry } from "@/lib/demo-data/audit-logs"
import { createId, readCollection, writeCollection } from "./demo-store"

/**
 * Append-only audit trail of changes to money, rates, roles, approvals and
 * settings (PLT-12). Stored per workspace in the demo store; the backend will
 * write these itself and make them immutable.
 */

interface Actor {
  id: string
  name: string
  email: string
  role?: string
}

let actor: Actor = { id: "system", name: "System", email: "system@nexora.local" }

/** Called by the dashboard shell so entries carry who made the change. */
export function setAuditActor(next: Actor | null | undefined) {
  if (next) actor = next
}

const COLLECTION = "audit"
const MAX_ENTRIES = 500

export function recordAudit(
  workspaceId: string,
  entry: { action: string; actionKey: string; category: AuditLogCategory; target: string; before?: unknown; after?: unknown }
) {
  const details =
    entry.before !== undefined || entry.after !== undefined
      ? `${format(entry.before)} → ${format(entry.after)}`
      : undefined
  const row: AuditLogEntry = {
    id: createId("aud"),
    actor: { ...actor },
    action: entry.action,
    actionKey: entry.actionKey,
    category: entry.category,
    targetResource: entry.target,
    ipAddress: "—",
    location: "—",
    status: "success",
    details,
    createdAt: new Date().toISOString(),
  }
  const existing = readCollection<AuditLogEntry>(COLLECTION, workspaceId, () => [])
  writeCollection(COLLECTION, workspaceId, [row, ...existing].slice(0, MAX_ENTRIES))
}

export function listAudit(workspaceId: string): AuditLogEntry[] {
  return readCollection<AuditLogEntry>(COLLECTION, workspaceId, () => [])
}

function format(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—"
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${v ?? "—"}`)
      .join(", ")
  }
  return String(value)
}
