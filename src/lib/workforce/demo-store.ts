/**
 * Browser-only demo persistence for workforce data.
 *
 * Each collection is stored per workspace under `nexora:<collection>:<workspaceId>`
 * and seeded on first read. This stands in for the backend until a real API exists:
 * the api modules in src/lib/api are the only callers, so swapping them to HTTP
 * calls later doesn't touch any page.
 */

interface Identified {
  id: string
}

const PREFIX = "nexora"

function storageKey(collection: string, workspaceId: string) {
  ensureDataVersion()
  return `${PREFIX}:${collection}:${workspaceId}`
}

/**
 * Bumped when the shape of the demo data changes. A browser holding data from
 * an older version starts again from fresh demo data instead of mixing old
 * records with new rules (the workspace choice and UI preferences are kept).
 */
export const DEMO_DATA_VERSION = "2026-12-05"
const VERSION_KEY = `${PREFIX}:data-version`
const KEEP = new Set([VERSION_KEY, `${PREFIX}:workspace`, `${PREFIX}:guide-open`])
/** Every collection and its seed, so a tenant export can include collections never opened (AUD-04). */
const registry = new Map<string, (workspaceId: string) => unknown[]>()
let versionChecked = false

export function ensureDataVersion() {
  if (versionChecked || typeof window === "undefined") return
  versionChecked = true
  try {
    if (localStorage.getItem(VERSION_KEY) === DEMO_DATA_VERSION) return
    const stale: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`${PREFIX}:`) && !KEEP.has(key) && !key.startsWith(`${PREFIX}:inbox:`)) stale.push(key)
    }
    for (const key of stale) localStorage.removeItem(key)
    localStorage.setItem(VERSION_KEY, DEMO_DATA_VERSION)
  } catch {
    // Storage blocked: nothing to clean
  }
}

/** Clears every demo record so the next read starts from fresh demo data. */
export function resetDemoData() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(VERSION_KEY)
  } catch {
    // ignore
  }
  versionChecked = false
  ensureDataVersion()
}

/** CFG-05: clears one workspace's demo records so it starts again from its initial data. Returns how many collections were cleared. */
export function resetWorkspaceData(workspaceId: string) {
  if (typeof window === "undefined") return 0
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`${PREFIX}:`) && key.endsWith(`:${workspaceId}`)) keys.push(key)
    }
    for (const key of keys) localStorage.removeItem(key)
    return keys.length
  } catch {
    return 0
  }
}

const DELETED_KEY = `${PREFIX}:deleted-workspaces`
const deletedWorkspaces = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DELETED_KEY) ?? "[]")
  } catch {
    return []
  }
}

/** AUD-05: true once a workspace's data was deleted at its company's request; nothing is seeded again. */
export function isWorkspaceDeleted(workspaceId: string) {
  if (typeof window === "undefined") return false
  return deletedWorkspaces().includes(workspaceId)
}

/**
 * AUD-04: every record of one workspace, by collection, for the tenant export.
 * Collections the company never opened are seeded first, so the export is complete.
 */
export function exportWorkspaceData(workspaceId: string): Record<string, unknown[]> {
  const out: Record<string, unknown[]> = {}
  if (typeof window === "undefined" || isWorkspaceDeleted(workspaceId)) return out
  // the console's own collections live in its workspace, never in a company's
  for (const [name, seed] of registry) if (!name.startsWith("platform-")) readCollection(name, workspaceId, () => seed(workspaceId) as Identified[])
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(`${PREFIX}:`) || !key.endsWith(`:${workspaceId}`)) continue
      const name = key.slice(PREFIX.length + 1, -(workspaceId.length + 1))
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null")
      out[name] = Array.isArray(value) ? value : [value]
    }
  } catch {
    // unreadable storage: what was read so far
  }
  return out
}

/**
 * Points every record of one workspace that holds `field === from` at `to`
 * instead (CRM step 9: a merged client's deals, invoices, projects…).
 * Collections never opened are seeded first, so their seed can't bring the old
 * id back. Returns how many records moved.
 */
export function reassignReference(workspaceId: string, field: string, from: string, to: string, skip: readonly string[] = []) {
  if (typeof window === "undefined" || isWorkspaceDeleted(workspaceId)) return 0
  for (const [name, seed] of registry) if (!name.startsWith("platform-")) readCollection(name, workspaceId, () => seed(workspaceId) as Identified[])
  let moved = 0
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(`${PREFIX}:`) && key.endsWith(`:${workspaceId}`)) keys.push(key)
  }
  for (const key of keys) {
    const name = key.slice(PREFIX.length + 1, -(workspaceId.length + 1))
    if (skip.includes(name) || name.startsWith("platform-")) continue
    let items: unknown
    try {
      items = JSON.parse(localStorage.getItem(key) ?? "null")
    } catch {
      continue
    }
    if (!Array.isArray(items)) continue
    let changed = false
    const next = items.map((item) => {
      if (!item || typeof item !== "object") return item
      const row = item as Record<string, unknown>
      if (row[field] === from) {
        changed = true
        moved++
        return { ...row, [field]: to }
      }
      // one level down too: saved reports and views keep it in their filters (A4.4)
      for (const [key, value] of Object.entries(row)) {
        if (value && typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>)[field] === from) {
          changed = true
          moved++
          return { ...row, [key]: { ...(value as Record<string, unknown>), [field]: to } }
        }
      }
      return item
    })
    if (changed) writeCollection(name, workspaceId, next as Identified[])
  }
  return moved
}

function eachRegistered(workspaceId: string, names: readonly string[], change: (items: Identified[]) => Identified[] | null) {
  for (const name of names) {
    const seed = registry.get(name)
    if (!seed) continue
    const next = change(readCollection(name, workspaceId, () => seed(workspaceId) as Identified[]))
    if (next) writeCollection(name, workspaceId, next)
  }
}

/** Removes, in the named collections, the records whose `field` is one of `values` (they only exist for a deleted parent). Returns how many went. */
export function removeByReference(workspaceId: string, names: readonly string[], field: string, values: readonly string[]) {
  if (typeof window === "undefined" || !values.length) return 0
  const gone = new Set(values)
  let removed = 0
  eachRegistered(workspaceId, names, (items) => {
    const keep = items.filter((item) => !gone.has((item as unknown as Record<string, string>)[field]!))
    removed += items.length - keep.length
    return keep.length === items.length ? null : keep
  })
  return removed
}

/** Drops the link to a deleted parent in the named collections: `field` (and `alsoClear`) are removed where `field` equals `value`. */
export function clearReference(workspaceId: string, names: readonly string[], field: string, value: string, alsoClear: readonly string[] = []) {
  if (typeof window === "undefined") return 0
  let cleared = 0
  eachRegistered(workspaceId, names, (items) => {
    let changed = false
    const next = items.map((item) => {
      const record = item as unknown as Record<string, unknown>
      if (record[field] !== value) return item
      changed = true
      cleared++
      const copy = { ...record }
      for (const key of [field, ...alsoClear]) delete copy[key]
      return copy as unknown as Identified
    })
    return changed ? next : null
  })
  return cleared
}

/** AUD-05: removes every record of one workspace and keeps it empty. Returns how many collections were deleted. */
export function deleteWorkspaceData(workspaceId: string) {
  if (typeof window === "undefined") return 0
  const n = resetWorkspaceData(workspaceId)
  try {
    localStorage.setItem(DELETED_KEY, JSON.stringify([...new Set([...deletedWorkspaces(), workspaceId])]))
  } catch {
    throw new Error(STORAGE_FULL)
  }
  return n
}

/** Reads a collection, seeding it when absent or unreadable. */
export function readCollection<T extends Identified>(
  collection: string,
  workspaceId: string,
  seed: () => T[]
): T[] {
  if (typeof window === "undefined") return seed()
  if (isWorkspaceDeleted(workspaceId)) return []
  const key = storageKey(collection, workspaceId)
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "object" && item !== null && typeof item.id === "string")
      ) {
        return parsed as T[]
      }
    }
  } catch {
    // Unreadable storage falls through to a fresh seed
  }
  const seeded = seed()
  try {
    writeCollection(collection, workspaceId, seeded)
  } catch {
    // A seed that can't be stored is still shown; changes to it will report the failure
  }
  return seeded
}

export function writeCollection<T extends Identified>(
  collection: string,
  workspaceId: string,
  items: T[]
) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(storageKey(collection, workspaceId), JSON.stringify(items))
  } catch {
    // Storage full or blocked: say so, so the screen shows a failure instead of a false success (H4)
    throw new Error(STORAGE_FULL)
  }
}

/** Thrown when the browser refuses to store a change. */
export const STORAGE_FULL = "Storage is full; this change was not saved"

/** Prefixed ids with a full UUID, so ids never collide even in large collections (M7). */
export function createId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
  return `${prefix}_${random}`
}

/** Small CRUD helper over one workspace-scoped collection. */
export function createCollection<T extends Identified & { workspaceId: string; createdAt: string; updatedAt: string }>(
  collection: string,
  idPrefix: string,
  seed: (workspaceId: string) => T[]
) {
  const read = (workspaceId: string) => readCollection<T>(collection, workspaceId, () => seed(workspaceId))
  registry.set(collection, seed)

  return {
    list: (workspaceId: string) => read(workspaceId),

    get: (workspaceId: string, id: string) => read(workspaceId).find((item) => item.id === id),

    create: (workspaceId: string, input: Omit<T, "id" | "workspaceId" | "createdAt" | "updatedAt">): T => {
      const now = new Date().toISOString()
      const item = { ...input, id: createId(idPrefix), workspaceId, createdAt: now, updatedAt: now } as T
      writeCollection(collection, workspaceId, [item, ...read(workspaceId)])
      return item
    },

    update: (workspaceId: string, id: string, input: Partial<T>): T => {
      const items = read(workspaceId)
      const index = items.findIndex((item) => item.id === id)
      if (index === -1) throw new Error(`${collection}: ${id} not found`)
      const updated = {
        ...items[index],
        ...input,
        id,
        workspaceId,
        updatedAt: new Date().toISOString(),
      } as T
      items[index] = updated
      writeCollection(collection, workspaceId, items)
      return updated
    },

    remove: (workspaceId: string, id: string) => {
      writeCollection(
        collection,
        workspaceId,
        read(workspaceId).filter((item) => item.id !== id)
      )
    },
  }
}

/** Reads a single per-workspace document (settings), seeding it when absent. */
export function readDocument<T extends object>(name: string, workspaceId: string, seed: () => T): T {
  if (typeof window === "undefined") return seed()
  if (isWorkspaceDeleted(workspaceId)) return seed()
  const key = storageKey(name, workspaceId)
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        // Keys added after the document was first saved fall back to the seed
        return { ...seed(), ...(parsed as Partial<T>) }
      }
    }
  } catch {
    // Unreadable storage falls through to a fresh seed
  }
  const seeded = seed()
  try {
    writeDocument(name, workspaceId, seeded)
  } catch {
    // Shown from memory; the next change reports the failure
  }
  return seeded
}

export function writeDocument<T extends object>(name: string, workspaceId: string, value: T) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(storageKey(name, workspaceId), JSON.stringify(value))
  } catch {
    throw new Error(STORAGE_FULL)
  }
}
