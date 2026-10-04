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
  return `${PREFIX}:${collection}:${workspaceId}`
}

/** Reads a collection, seeding it when absent or unreadable. */
export function readCollection<T extends Identified>(
  collection: string,
  workspaceId: string,
  seed: () => T[]
): T[] {
  if (typeof window === "undefined") return seed()
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
  writeCollection(collection, workspaceId, seeded)
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
    // Storage full or blocked: keep working in memory for this session
  }
}

export function createId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${random}`
}

/** Small CRUD helper over one workspace-scoped collection. */
export function createCollection<T extends Identified & { workspaceId: string; createdAt: string; updatedAt: string }>(
  collection: string,
  idPrefix: string,
  seed: (workspaceId: string) => T[]
) {
  const read = (workspaceId: string) => readCollection<T>(collection, workspaceId, () => seed(workspaceId))

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
  writeDocument(name, workspaceId, seeded)
  return seeded
}

export function writeDocument<T extends object>(name: string, workspaceId: string, value: T) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(storageKey(name, workspaceId), JSON.stringify(value))
  } catch {
    // Storage full or blocked: keep working in memory for this session
  }
}
