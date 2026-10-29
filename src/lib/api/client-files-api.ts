import type { ClientFile, ClientFileCategory } from "@/types/work-crm"
import { createCollection } from "@/lib/workforce/demo-store"
import { getAuditActor, recordAudit } from "@/lib/workforce/audit"

/**
 * Files kept on a client (CRM step 10). The browser demo keeps small files as
 * data URLs; the server will store them and take larger ones.
 */
const files = createCollection<ClientFile>("client-files", "cf", () => [])

/** Biggest file the browser demo keeps, and how many per client */
export const MAX_CLIENT_FILE_BYTES = 500 * 1024
export const MAX_CLIENT_FILES = 20

/** A client's files, newest first. */
export async function listClientFilesApi(workspaceId: string, clientId: string): Promise<ClientFile[]> {
  return files
    .list(workspaceId)
    .filter((f) => f.clientId === clientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function addClientFileApi(
  workspaceId: string,
  clientId: string,
  file: Pick<ClientFile, "name" | "type" | "size" | "dataUrl">,
  category: ClientFileCategory
): Promise<ClientFile> {
  if (file.size > MAX_CLIENT_FILE_BYTES) throw new Error("Files are limited to 500 KB for now")
  if ((await listClientFilesApi(workspaceId, clientId)).length >= MAX_CLIENT_FILES) throw new Error("A client can hold 20 files")
  if (!/^data:[\w.+/-]*;base64,/.test(file.dataUrl)) throw new Error("This file could not be read")
  const saved = files.create(workspaceId, { clientId, name: file.name.slice(0, 200), type: file.type || "application/octet-stream", size: file.size, dataUrl: file.dataUrl, category, addedBy: getAuditActor().name })
  recordAudit(workspaceId, { action: "Client file added", actionKey: "client.file_added", category: "Team", target: saved.name })
  return saved
}

export async function setClientFileCategoryApi(workspaceId: string, id: string, category: ClientFileCategory): Promise<ClientFile> {
  if (!files.get(workspaceId, id)) throw new Error("This file no longer exists")
  return files.update(workspaceId, id, { category })
}

export async function removeClientFileApi(workspaceId: string, id: string) {
  const file = files.get(workspaceId, id)
  if (!file) return
  files.remove(workspaceId, id)
  recordAudit(workspaceId, { action: "Client file removed", actionKey: "client.file_removed", category: "Team", target: file.name })
}

/** Removes every file of a client, when it is deleted for good. */
export async function removeClientFilesApi(workspaceId: string, clientId: string) {
  for (const f of files.list(workspaceId)) if (f.clientId === clientId) files.remove(workspaceId, f.id)
}
