import { describe, it, expect, beforeEach } from "vitest"
import { assertSatisfaction, lowRatingsFor, pendingSurveys, satisfactionStats } from "./satisfaction"
import { listSatisfactionApi, submitSatisfactionApi } from "@/lib/api/satisfaction-api"
import { buildInbox } from "./inbox"
import { Priority, WorkProjectStatus, type Milestone, type WorkProject } from "@/types/work-projects"
import type { SatisfactionResponse } from "@/types/work-feedback"

const prj = (id: string, over: Partial<WorkProject> = {}): WorkProject => ({ id, workspaceId: "ws", code: id, name: id, clientId: "c", managerId: "m1", memberIds: [], status: WorkProjectStatus.ACTIVE, priority: Priority.MEDIUM, startDate: "2026-01-01", budgetType: "fixed" as never, createdAt: "", updatedAt: "", ...over })
const ms = (id: string, projectId: string, approvedAt?: string): Milestone => ({ id, workspaceId: "ws", projectId, title: id, dueDate: "2026-06-01", requiresApproval: true, approvedAt, createdAt: "", updatedAt: "" })
const ans = (over: Partial<SatisfactionResponse>): SatisfactionResponse => ({ id: "r", workspaceId: "ws", clientId: "c", projectId: "a", rating: 5, nps: 10, respondentName: "X", answeredAt: "", createdAt: "", updatedAt: "", ...over })

describe("client satisfaction (Phase 6h.2)", () => {
  beforeEach(() => localStorage.clear())

  it("asks after approved milestones and finished projects, once each", () => {
    const projects = [prj("a"), prj("b", { status: WorkProjectStatus.COMPLETED }), prj("other", { clientId: "x", status: WorkProjectStatus.COMPLETED })]
    const milestones = [ms("m1", "a", "2026-05-01T10:00:00Z"), ms("m2", "a"), ms("m3", "b", "2026-04-01T10:00:00Z")]
    const asks = pendingSurveys("c", projects, milestones, [ans({ projectId: "b", milestoneId: "m3" })])
    expect(asks.map((a) => `${a.project.id}:${a.milestone?.id ?? "-"}`)).toEqual(["a:m1", "b:-"])
  })

  it("computes the average, the NPS and who sees low ratings", () => {
    const rows = [ans({ rating: 5, nps: 10 }), ans({ rating: 4, nps: 9 }), ans({ rating: 2, nps: 3, projectId: "a" }), ans({ rating: 3, nps: 7 })]
    expect(satisfactionStats(rows)).toEqual({ count: 4, average: 3.5, nps: 25, promoters: 2, detractors: 1 })
    expect(satisfactionStats([]).average).toBeNull()
    const projects = [prj("a")]
    expect(lowRatingsFor(rows, projects, { employeeId: "m1", isAdmin: false })).toHaveLength(1)
    expect(lowRatingsFor(rows, projects, { employeeId: "m2", isAdmin: false })).toHaveLength(0)
    expect(lowRatingsFor(rows, projects, { isAdmin: true })).toHaveLength(1)
    const inbox = buildInbox({ viewer: { employeeId: "m1", isAdmin: false }, rights: { approveTime: false, invoices: false, hr: false }, employees: [], reviews: [], entries: [], leave: [], expenses: [], invoices: [], documents: [], tasks: [], feedback: rows, projects, today: "2026-10-07" })
    expect(inbox).toEqual([expect.objectContaining({ title: "inboxLowRating", values: { count: 1, project: "a" }, href: "/dashboard/projects/a" })])
    expect(() => assertSatisfaction({ clientId: "c", projectId: "a", rating: 0, nps: 5, respondentName: "X" }, [])).toThrow("1 to 5")
    expect(() => assertSatisfaction({ clientId: "c", projectId: "a", rating: 3, nps: 11, respondentName: "X" }, [])).toThrow("0 to 10")
    expect(() => assertSatisfaction({ clientId: "c", projectId: "a", rating: 3, nps: 5, respondentName: "X" }, [ans({ projectId: "a" })])).toThrow("already")
  })

  it("stores an answer for the client's own project only", async () => {
    const ws = "ws_atlas"
    const before = (await listSatisfactionApi(ws)).length
    await submitSatisfactionApi(ws, { clientId: "cli_orbit", projectId: "prj_orbit_mvp", rating: 4, nps: 9, respondentName: "Claire Petit", comment: "  Good  " })
    const all = await listSatisfactionApi(ws)
    expect(all.length).toBe(before + 1)
    expect(all[0]).toMatchObject({ projectId: "prj_orbit_mvp", comment: "Good" })
    await expect(submitSatisfactionApi(ws, { clientId: "cli_helio", projectId: "prj_orbit_mvp", rating: 4, nps: 9, respondentName: "X" })).rejects.toThrow("Project not found")
  })
})
