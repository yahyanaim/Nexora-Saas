import { createCollection } from "@/lib/workforce/demo-store"
import { WorkRole } from "@/types/workforce"

/** A report with its filters, saved by a user and optionally shared with a role (RPT-5). */
export interface SavedReport {
  id: string
  workspaceId: string
  name: string
  reportId: string
  /** Period preset or custom range, and the filters, as the reports page stores them */
  filters: { preset: string; from?: string; to?: string; clientId?: string; projectId?: string; employeeId?: string; departmentId?: string }
  ownerId: string
  ownerName: string
  /** Everyone with this role sees it too; undefined = only the owner */
  sharedWith?: WorkRole | "all"
  createdAt: string
  updatedAt: string
}

const reports = createCollection<SavedReport>("saved-reports", "rep", () => [])

/** Reports the user owns, plus those shared with everyone or with their role. */
export async function listSavedReportsApi(workspaceId: string, viewer: { id: string; role?: WorkRole }) {
  return reports
    .list(workspaceId)
    .filter((r) => r.ownerId === viewer.id || r.sharedWith === "all" || (r.sharedWith && r.sharedWith === viewer.role))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function saveReportApi(workspaceId: string, input: Omit<SavedReport, "id" | "workspaceId" | "createdAt" | "updatedAt">) {
  if (!input.name.trim()) throw new Error("Give the report a name")
  const mine = reports.list(workspaceId).filter((r) => r.ownerId === input.ownerId)
  if (mine.some((r) => r.name.toLowerCase() === input.name.trim().toLowerCase())) throw new Error("You already have a report with this name")
  return reports.create(workspaceId, { ...input, name: input.name.trim() })
}

/** Only the owner can delete a saved report. */
export async function deleteSavedReportApi(workspaceId: string, id: string, viewerId: string) {
  const row = reports.get(workspaceId, id)
  if (!row) return
  if (row.ownerId !== viewerId) throw new Error("Only the person who saved this report can delete it")
  reports.remove(workspaceId, id)
}

export { WorkRole }
