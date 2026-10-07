import { createCollection } from "@/lib/workforce/demo-store"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { assertDeal, isOpenDeal } from "@/lib/workforce/deals"
import { recordAudit } from "@/lib/workforce/audit"
import { DealStage, type Deal, type DealInput } from "@/types/work-sales"

/**
 * Sales pipeline (Phase 6g.2). Backed by the browser demo store for now;
 * replace the bodies with apiClient calls once the backend exists.
 */
const deals = createCollection<Deal>("deals", "deal", (workspaceId) => {
  if (workspaceId !== "ws_atlas") return []
  const today = todayIso()
  const d = (n: number) => addDays(today, n)
  const rows: Omit<Deal, "workspaceId" | "createdAt" | "updatedAt">[] = [
    { id: "deal_vela", title: "E-commerce rebuild", clientId: "cli_vela", amount: 420000, stage: DealStage.PROPOSAL, expectedClose: d(21), ownerId: "emp_emma", quoteId: "quo_1", note: "Quote DEV-2026-004 sent; decision after their board meeting" },
    { id: "deal_helio", title: "Energy dashboard phase 2", clientId: "cli_helio", amount: 260000, stage: DealStage.NEGOTIATION, probability: 80, expectedClose: d(10), ownerId: "emp_sara", quoteId: "quo_2" },
    { id: "deal_medica", title: "Patient mobile app", clientId: "cli_medica", amount: 680000, stage: DealStage.QUALIFIED, expectedClose: d(45), ownerId: "emp_emma" },
    { id: "deal_orbit", title: "Fleet tracking support contract", clientId: "cli_orbit", amount: 144000, stage: DealStage.LEAD, expectedClose: d(60), ownerId: "emp_emma" },
    { id: "deal_orbit_old", title: "Warehouse app audit", clientId: "cli_orbit", amount: 90000, stage: DealStage.NEGOTIATION, expectedClose: d(-5), ownerId: "emp_sara", note: "Waiting for the purchase order" },
    { id: "deal_won", title: "Orbit portal redesign", clientId: "cli_orbit", amount: 310000, stage: DealStage.WON, expectedClose: d(-40), closedAt: d(-42), ownerId: "emp_emma", quoteId: "quo_4" },
    { id: "deal_lost", title: "Kappa intranet", clientId: "cli_kappa", amount: 200000, stage: DealStage.LOST, expectedClose: d(-30), closedAt: d(-28), ownerId: "emp_sara", lostReason: "Chose a cheaper offer" },
  ]
  return rows.map((r) => ({ ...r, workspaceId, createdAt: `${d(-60)}T08:00:00.000Z`, updatedAt: `${d(-1)}T08:00:00.000Z` }))
})

const clean = (input: DealInput): DealInput => ({
  ...input,
  title: input.title.trim(),
  amount: Number(input.amount) || 0,
  probability: input.probability === undefined || Number.isNaN(input.probability) ? undefined : input.probability,
  ownerId: input.ownerId || undefined,
  quoteId: input.quoteId || undefined,
  lostReason: input.stage === DealStage.LOST ? input.lostReason?.trim() : undefined,
  note: input.note?.trim() || undefined,
})

/** closedAt follows the stage: set when a deal is won or lost, cleared when it is reopened. */
const closedAtFor = (stage: DealStage, previous?: Deal) => {
  if (stage !== DealStage.WON && stage !== DealStage.LOST) return undefined
  return previous && previous.stage === stage && previous.closedAt ? previous.closedAt : todayIso()
}

export async function listDealsApi(workspaceId: string): Promise<Deal[]> {
  return deals.list(workspaceId)
}

export async function saveDealApi(workspaceId: string, input: DealInput, id?: string): Promise<Deal> {
  const value = clean(input)
  assertDeal(value)
  if (id) {
    const previous = deals.get(workspaceId, id)
    if (!previous) throw new Error("Deal not found")
    if (previous.stage !== value.stage) audit(workspaceId, value.title, value.stage)
    // update() merges; list optional fields so clearing them sticks
    return deals.update(workspaceId, id, { ...value, probability: value.probability, ownerId: value.ownerId, quoteId: value.quoteId, lostReason: value.lostReason, note: value.note, closedAt: closedAtFor(value.stage, previous) })
  }
  const created = deals.create(workspaceId, { ...value, closedAt: closedAtFor(value.stage) })
  recordAudit(workspaceId, { action: "Deal created", actionKey: "deal.created", category: "Billing", target: value.title })
  return created
}

/** Moves a deal to another stage (drag on the board or the stage menu). */
export async function moveDealApi(workspaceId: string, id: string, stage: DealStage, lostReason?: string): Promise<Deal> {
  const d = deals.get(workspaceId, id)
  if (!d) throw new Error("Deal not found")
  const { id: _id, workspaceId: _ws, createdAt: _c, updatedAt: _u, closedAt: _cl, ...rest } = d
  // A custom chance belongs to the stage it was set for
  const probability = isOpenDeal({ stage }) && stage === d.stage ? d.probability : undefined
  return saveDealApi(workspaceId, { ...rest, stage, probability, lostReason: lostReason ?? d.lostReason }, id)
}

export async function deleteDealApi(workspaceId: string, id: string): Promise<void> {
  if (!deals.get(workspaceId, id)) throw new Error("Deal not found")
  deals.remove(workspaceId, id)
}

function audit(workspaceId: string, title: string, stage: DealStage) {
  if (stage === DealStage.WON) recordAudit(workspaceId, { action: "Deal won", actionKey: "deal.won", category: "Billing", target: title })
  else if (stage === DealStage.LOST) recordAudit(workspaceId, { action: "Deal lost", actionKey: "deal.lost", category: "Billing", target: title })
}
