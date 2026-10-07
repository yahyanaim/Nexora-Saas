import { createCollection } from "@/lib/workforce/demo-store"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { assertSatisfaction, LOW_RATING } from "@/lib/workforce/satisfaction"
import { recordAudit } from "@/lib/workforce/audit"
import { getProjectApi } from "./work-projects-api"
import type { SatisfactionInput, SatisfactionResponse } from "@/types/work-feedback"

/**
 * Client satisfaction answers (Phase 6h.2). Backed by the browser demo store
 * for now; replace the bodies with apiClient calls once the backend exists.
 */
const responses = createCollection<SatisfactionResponse>("satisfaction", "csat", (workspaceId) => {
  if (workspaceId !== "ws_atlas") return []
  const at = (n: number) => `${addDays(todayIso(), n)}T15:00:00.000Z`
  const rows: Omit<SatisfactionResponse, "workspaceId" | "createdAt" | "updatedAt">[] = [
    { id: "csat_medica_disc", clientId: "cli_medica", projectId: "prj_medica_disc", rating: 4, nps: 8, comment: "Useful prototypes; we would have liked one more user test.", respondentName: "Sofia Conti", answeredAt: at(-40) },
    { id: "csat_helio_audit", clientId: "cli_helio", projectId: "prj_helio_audit", rating: 2, nps: 5, comment: "The audit report came two weeks late.", respondentName: "Rachid Amrani", answeredAt: at(-9) },
    { id: "csat_orbit_design", clientId: "cli_orbit", projectId: "prj_orbit", milestoneId: "ms_orbit_design", rating: 5, nps: 9, comment: "Clear designs and quick changes. The team listened.", respondentName: "Claire Petit", answeredAt: at(-21) },
  ]
  return rows.map((r) => ({ ...r, workspaceId, createdAt: r.answeredAt, updatedAt: r.answeredAt }))
})

export async function listSatisfactionApi(workspaceId: string): Promise<SatisfactionResponse[]> {
  return responses.list(workspaceId).sort((a, b) => b.answeredAt.localeCompare(a.answeredAt))
}

export async function submitSatisfactionApi(workspaceId: string, input: SatisfactionInput): Promise<SatisfactionResponse> {
  const project = await getProjectApi(workspaceId, input.projectId)
  if (!project || project.clientId !== input.clientId) throw new Error("Project not found")
  assertSatisfaction(input, responses.list(workspaceId))
  const now = new Date().toISOString()
  const created = responses.create(workspaceId, { ...input, comment: input.comment?.trim() || undefined, answeredAt: now })
  recordAudit(workspaceId, {
    action: input.rating <= LOW_RATING ? "Low client rating" : "Client rating received",
    actionKey: "satisfaction.answered",
    category: "Approvals",
    target: `${project.code} ${input.rating}/5`,
  })
  return created
}
