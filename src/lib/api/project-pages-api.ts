import type { ProjectPage, ProjectPageInput } from "@/types/work-projects"
import { createCollection } from "@/lib/workforce/demo-store"
import { getAuditActor } from "@/lib/workforce/audit"
import { MAX_PAGE_LENGTH, sortPages } from "@/lib/workforce/project-pages"

/** Project wiki pages and meeting notes (P5). Browser demo store for now. */
const pages = createCollection<ProjectPage>("project-pages", "pg", seedPages)

function seedPages(workspaceId: string): ProjectPage[] {
  if (workspaceId !== "ws_atlas") return []
  const at = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
  const day = (days: number) => at(days).slice(0, 10)
  const row = (o: Omit<ProjectPage, "workspaceId" | "createdAt" | "updatedAt">, days: number): ProjectPage => ({ ...o, workspaceId, createdAt: at(days), updatedAt: at(days) })
  return [
    row({ id: "pg_orbit_brief", projectId: "prj_orbit", kind: "page", title: "Project brief", pinned: true, updatedBy: "Karim Haddad", body: "## Goal\nGive Orbit's customers one place to **track shipments** and download invoices.\n\n## Scope\n- Tracking pages for parcels and pallets\n- Invoice history and PDF download\n- Arabic and French from day one\n\n## Contacts\n- Claire Petit (CTO) — product decisions\n- Marc Leroy — finance and invoices" }, 30),
    row({ id: "pg_orbit_kickoff", projectId: "prj_orbit", kind: "meeting", title: "Beta planning", meetingDate: day(3), attendeeIds: ["emp_karim", "emp_lina", "emp_omar"], updatedBy: "Karim Haddad", body: "## Agenda\n- Beta scope\n- Load testing plan\n\n## Notes\nClaire wants carrier webhooks live before the beta. Load test with 2,000 parcels per minute.\n\n## Action items\n- [x] Share the beta checklist with Claire ORB-01#3\n- [ ] Write the load test scenarios @Omar Idrissi\n- [ ] Draft the status page copy @Lina Moreau" }, 3),
  ]
}

/** A project's pages, or every page of the workspace when no project is given (Ctrl+K search). */
export async function listProjectPagesApi(workspaceId: string, projectId?: string): Promise<ProjectPage[]> {
  return sortPages(pages.list(workspaceId).filter((p) => !projectId || p.projectId === projectId))
}

function clean(input: ProjectPageInput): ProjectPageInput {
  const title = input.title.trim()
  if (!title) throw new Error("Give the page a title")
  if (input.body.length > MAX_PAGE_LENGTH) throw new Error("A page is limited to 20,000 characters")
  if (input.kind === "meeting" && !/^\d{4}-\d{2}-\d{2}$/.test(input.meetingDate ?? "")) throw new Error("Pick the meeting date")
  return { ...input, title: title.slice(0, 120), attendeeIds: input.kind === "meeting" ? [...new Set(input.attendeeIds ?? [])] : undefined, meetingDate: input.kind === "meeting" ? input.meetingDate : undefined }
}

export async function saveProjectPageApi(workspaceId: string, input: ProjectPageInput, id?: string): Promise<ProjectPage> {
  const value = { ...clean(input), updatedBy: getAuditActor().name }
  if (id) {
    if (!pages.get(workspaceId, id)) throw new Error("This page no longer exists")
    return pages.update(workspaceId, id, value)
  }
  return pages.create(workspaceId, value)
}

/** Changes the body only, e.g. when an action item becomes a task. */
export async function setProjectPageBodyApi(workspaceId: string, id: string, body: string): Promise<ProjectPage> {
  const page = pages.get(workspaceId, id)
  if (!page) throw new Error("This page no longer exists")
  if (body.length > MAX_PAGE_LENGTH) throw new Error("A page is limited to 20,000 characters")
  return pages.update(workspaceId, id, { body, updatedBy: getAuditActor().name })
}

export async function setProjectPagePinnedApi(workspaceId: string, id: string, pinned: boolean): Promise<ProjectPage> {
  if (!pages.get(workspaceId, id)) throw new Error("This page no longer exists")
  return pages.update(workspaceId, id, { pinned })
}

export async function deleteProjectPageApi(workspaceId: string, id: string) {
  pages.remove(workspaceId, id)
}
