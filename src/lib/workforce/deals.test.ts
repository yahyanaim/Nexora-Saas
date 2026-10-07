import { describe, it, expect, beforeEach } from "vitest"
import { assertDeal, dealProbability, pipelineByStage, pipelineSummary, weightedValue } from "./deals"
import { listDealsApi, moveDealApi, saveDealApi } from "@/lib/api/deals-api"
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
    expect(pipelineByStage(rows).find((r) => r.stage === DealStage.PROPOSAL)).toEqual({ stage: DealStage.PROPOSAL, count: 1, amount: 100000, weighted: 50000 })
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
