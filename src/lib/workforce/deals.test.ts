import { describe, it, expect, beforeEach } from "vitest"
import { DEFAULT_PIPELINE, assertDeal, assertPipeline, daysInStage, dealProbability, isStale, pipelineByStage, pipelineSummary, weightedValue } from "./deals"
import { createProjectFromDealApi, listDealsApi, moveDealApi, saveDealApi, savePipelineApi } from "@/lib/api/deals-api"
import { getSettingsApi } from "@/lib/api/settings-api"
import { listProjectsApi } from "@/lib/api/work-projects-api"
import type { PipelineSettings } from "@/types/work-sales"
import { DealStage, type Deal } from "@/types/work-sales"

const deal = (over: Partial<Deal>): Deal => ({ id: "d", workspaceId: "ws", title: "Site", clientId: "c", amount: 100000, stage: DealStage.PROPOSAL, expectedClose: "2026-11-01", createdAt: "", updatedAt: "", ...over })

describe("deals pipeline (Phase 6g.2)", () => {
  beforeEach(() => localStorage.clear())

  it("uses the stage chance unless the deal has its own", () => {
    expect(dealProbability(deal({}))).toBe(50)
    expect(dealProbability(deal({ probability: 80 }))).toBe(80)
    expect(dealProbability(deal({ stage: DealStage.WON, probability: 30 }))).toBe(100)
    expect(dealProbability(deal({ stage: DealStage.LOST, probability: 30 }))).toBe(0)
    expect(weightedValue(deal({ stage: DealStage.NEGOTIATION, amount: 260000, probability: 80 }))).toBe(208000)
  })

  it("sums the open pipeline, win rate and overdue deals", () => {
    const rows = [
      deal({ id: "a", amount: 100000 }),
      deal({ id: "b", amount: 40000, stage: DealStage.LEAD, expectedClose: "2026-09-01" }),
      deal({ id: "c", amount: 300000, stage: DealStage.WON }),
      deal({ id: "d", amount: 50000, stage: DealStage.LOST, lostReason: "Price" }),
    ]
    const s = pipelineSummary(rows, "2026-10-07")
    expect(s).toMatchObject({ openCount: 2, openAmount: 140000, weighted: 54000, wonAmount: 300000, winRate: 50 })
    expect(s.overdue.map((d) => d.id)).toEqual(["b"])
    expect(pipelineByStage(rows).find((r) => r.stage === DealStage.PROPOSAL)).toEqual({ stage: DealStage.PROPOSAL, count: 1, amount: 100000, weighted: 50000, stale: 0 })
    expect(pipelineSummary([], "2026-10-07").winRate).toBeNull()
  })

  it("checks the deal before saving", () => {
    const ok = { title: "Site", clientId: "c", amount: 1, stage: DealStage.LEAD, expectedClose: "2026-11-01" }
    expect(() => assertDeal(ok)).not.toThrow()
    expect(() => assertDeal({ ...ok, title: " " })).toThrow("Give the deal a name")
    expect(() => assertDeal({ ...ok, clientId: "" })).toThrow("Choose a client")
    expect(() => assertDeal({ ...ok, amount: -1 })).toThrow("negative")
    expect(() => assertDeal({ ...ok, probability: 120 })).toThrow("between 0 and 100")
    expect(() => assertDeal({ ...ok, stage: DealStage.LOST })).toThrow("Say why the deal was lost")
  })

  it("dates closed deals and resets a custom chance when the stage changes", async () => {
    const ws = "ws_atlas"
    expect((await listDealsApi(ws)).length).toBeGreaterThan(5)
    const helio = await moveDealApi(ws, "deal_helio", DealStage.WON)
    expect(helio.closedAt).toBeTruthy()
    expect(helio.probability).toBeUndefined()
    const reopened = await moveDealApi(ws, "deal_helio", DealStage.PROPOSAL)
    expect(reopened.closedAt).toBeUndefined()
    await expect(moveDealApi(ws, "deal_vela", DealStage.LOST)).rejects.toThrow("Say why")
    const lost = await moveDealApi(ws, "deal_vela", DealStage.LOST, "Budget frozen")
    expect(lost.lostReason).toBe("Budget frozen")
    const created = await saveDealApi(ws, { title: "New", clientId: "cli_peak", amount: 5000, stage: DealStage.LEAD, expectedClose: "2026-12-01" })
    expect(created.closedAt).toBeUndefined()
  })
})

describe("pipeline+ (CRM step 8)", () => {
  beforeEach(() => localStorage.clear())

  const custom: PipelineSettings = {
    staleDays: 10,
    stages: [
      { id: "lead", probability: 10 },
      { id: "demo", name: "Demo booked", probability: 40 },
      { id: "negotiation", name: "Contract", probability: 85 },
    ],
  }

  it("weights deals with the company's own stage chances", () => {
    expect(dealProbability(deal({ stage: "demo" }), custom)).toBe(40)
    expect(weightedValue(deal({ stage: "demo", amount: 50000 }), custom)).toBe(20000)
    expect(dealProbability(deal({ stage: "demo", probability: 70 }), custom)).toBe(70)
    // a stage that is not in the pipeline counts as 0 rather than guessing
    expect(dealProbability(deal({ stage: "gone" }), custom)).toBe(0)
    const rows = [deal({ id: "a", stage: "demo", amount: 50000 }), deal({ id: "b", stage: "demo", amount: 10000, probability: 50 })]
    const demo = pipelineByStage(rows, custom).find((r) => r.stage === "demo")!
    expect(demo).toMatchObject({ count: 2, amount: 60000, weighted: 25000 })
    expect(pipelineByStage(rows, custom).map((r) => r.stage)).toEqual(["lead", "demo", "negotiation", "won", "lost"])
  })

  it("counts days in stage and flags stale open deals", () => {
    const d = deal({ stageSince: "2026-10-01", createdAt: "2026-09-01T08:00:00.000Z" })
    expect(daysInStage(d, "2026-10-12")).toBe(11)
    expect(daysInStage(deal({ createdAt: "2026-10-05T08:00:00.000Z" }), "2026-10-12")).toBe(7)
    expect(isStale(d, "2026-10-12", custom)).toBe(true)
    expect(isStale(d, "2026-10-12")).toBe(false) // default limit is 14 days
    expect(isStale({ ...d, stage: DealStage.WON }, "2026-12-31", custom)).toBe(false)
    expect(pipelineSummary([d], "2026-10-12", custom).stale).toHaveLength(1)
    expect(pipelineByStage([d], DEFAULT_PIPELINE, "2026-10-30").find((r) => r.stage === DealStage.PROPOSAL)?.stale).toBe(1)
  })

  it("checks the pipeline before saving it", () => {
    expect(() => assertPipeline(custom)).not.toThrow()
    expect(() => assertPipeline(DEFAULT_PIPELINE)).not.toThrow()
    expect(() => assertPipeline({ ...custom, stages: [] })).toThrow("at least one")
    expect(() => assertPipeline({ ...custom, stages: [...custom.stages, { id: "x", probability: 10 }] })).toThrow("name")
    expect(() => assertPipeline({ ...custom, stages: [...custom.stages, { id: "x", name: "contract", probability: 10 }] })).toThrow("same name")
    expect(() => assertPipeline({ ...custom, stages: [{ id: "won", name: "Won", probability: 100 }] })).toThrow("own id")
    expect(() => assertPipeline({ ...custom, stages: [{ id: "lead", probability: 120 }] })).toThrow("between 0 and 100")
    expect(() => assertPipeline({ ...custom, staleDays: 0 })).toThrow("1 to 365")
    expect(() => assertDeal({ title: "A", clientId: "c", amount: 1, stage: "proposal", expectedClose: "2026-11-01" }, custom)).toThrow("not part of the pipeline")
  })

  it("restarts the stage clock only when the stage changes", async () => {
    const ws = "ws_atlas"
    const before = (await listDealsApi(ws)).find((d) => d.id === "deal_medica")!
    expect(before.stageSince).toBeTruthy()
    const same = await moveDealApi(ws, "deal_medica", before.stage)
    expect(same.stageSince).toBe(before.stageSince)
    const moved = await moveDealApi(ws, "deal_medica", DealStage.PROPOSAL)
    expect(moved.stageSince).not.toBe(before.stageSince)
  })

  it("moves the deals of a removed stage before saving the pipeline", async () => {
    const ws = "ws_atlas"
    // qualified holds deal_medica; dropping it without a target is refused
    const next: PipelineSettings = { staleDays: 21, stages: DEFAULT_PIPELINE.stages.filter((s) => s.id !== "qualified") }
    await expect(savePipelineApi(ws, next)).rejects.toThrow("removed stage")
    await savePipelineApi(ws, next, { qualified: "proposal" })
    expect((await listDealsApi(ws)).find((d) => d.id === "deal_medica")?.stage).toBe("proposal")
    expect((await getSettingsApi(ws)).pipeline?.staleDays).toBe(21)
  })

  it("starts a project from a won deal, once", async () => {
    const ws = "ws_atlas"
    await expect(createProjectFromDealApi(ws, "deal_vela", { code: "VEL-01" })).rejects.toThrow("won deal")
    const project = await createProjectFromDealApi(ws, "deal_won", { code: "orb-02", managerId: "emp_emma" })
    expect(project).toMatchObject({ code: "ORB-02", clientId: "cli_orbit", budgetAmount: 310000, name: "Orbit portal redesign" })
    expect((await listDealsApi(ws)).find((d) => d.id === "deal_won")?.projectId).toBe(project.id)
    expect((await listProjectsApi(ws)).some((p) => p.id === project.id)).toBe(true)
    await expect(createProjectFromDealApi(ws, "deal_won", { code: "ORB-03" })).rejects.toThrow("already has a project")
  })
})
