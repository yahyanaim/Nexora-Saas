import { createCollection } from "@/lib/workforce/demo-store"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { assertDeal, isOpenDeal, pipelineOf } from "@/lib/workforce/deals"
import { recordAudit } from "@/lib/workforce/audit"
import { DealStage, type Deal, type DealInput, type DealStageId, type PipelineSettings } from "@/types/work-sales"
import { BudgetType, Priority, WorkProjectStatus, type WorkProject } from "@/types/work-projects"
import { getSettingsApi, updatePipelineApi } from "./settings-api"
import { createProjectApi, listProjectsApi } from "./work-projects-api"

/**
 * Sales pipeline (Phase 6g.2). Backed by the browser demo store for now;
 * replace the bodies with apiClient calls once the backend exists.
 */
const deals = createCollection<Deal>("deals", "deal", (workspaceId) => {
  if (workspaceId !== "ws_atlas") return []
  const today = todayIso()
  const d = (n: number) => addDays(today, n)
  const rows: Omit<Deal, "workspaceId" | "createdAt" | "updatedAt">[] = [
    { id: "deal_vela", title: "E-commerce rebuild", clientId: "cli_vela", amount: 420000, stage: DealStage.PROPOSAL, stageSince: d(-6), expectedClose: d(21), contactId: "con_5", ownerId: "emp_emma", quoteId: "quo_1", note: "Quote DEV-2026-004 sent; decision after their board meeting" },
    { id: "deal_helio", title: "Energy dashboard phase 2", clientId: "cli_helio", amount: 260000, stage: DealStage.NEGOTIATION, stageSince: d(-3), probability: 80, expectedClose: d(10), contactId: "con_3", ownerId: "emp_sara", quoteId: "quo_2" },
    { id: "deal_medica", title: "Patient mobile app", clientId: "cli_medica", amount: 680000, stage: DealStage.QUALIFIED, stageSince: d(-25), expectedClose: d(45), contactId: "con_4", ownerId: "emp_emma" },
    { id: "deal_orbit", title: "Fleet tracking support contract", clientId: "cli_orbit", amount: 144000, stage: DealStage.LEAD, stageSince: d(-9), expectedClose: d(60), contactId: "con_1", ownerId: "emp_emma" },
    { id: "deal_orbit_old", title: "Warehouse app audit", clientId: "cli_orbit", amount: 90000, stage: DealStage.NEGOTIATION, stageSince: d(-20), expectedClose: d(-5), contactId: "con_2", ownerId: "emp_sara", note: "Waiting for the purchase order" },
    { id: "deal_won", title: "Orbit portal redesign", clientId: "cli_orbit", amount: 310000, stage: DealStage.WON, stageSince: d(-42), expectedClose: d(-40), closedAt: d(-42), ownerId: "emp_emma", quoteId: "quo_4" },
    { id: "deal_lost", title: "Kappa intranet", clientId: "cli_kappa", amount: 200000, stage: DealStage.LOST, stageSince: d(-28), expectedClose: d(-30), closedAt: d(-28), ownerId: "emp_sara", lostReason: "Chose a cheaper offer" },
  ]
  return rows.map((r) => ({ ...r, workspaceId, createdAt: `${d(-60)}T08:00:00.000Z`, updatedAt: `${d(-1)}T08:00:00.000Z` }))
})

const clean = (input: DealInput): DealInput => ({
  ...input,
  title: input.title.trim(),
  amount: Number(input.amount) || 0,
  probability: input.probability === undefined || Number.isNaN(input.probability) ? undefined : input.probability,
  ownerId: input.ownerId || undefined,
  contactId: input.contactId || undefined,
  quoteId: input.quoteId || undefined,
  lostReason: input.stage === DealStage.LOST ? input.lostReason?.trim() : undefined,
  note: input.note?.trim() || undefined,
})

/** closedAt follows the stage: set when a deal is won or lost, cleared when it is reopened. */
const closedAtFor = (stage: DealStageId, previous?: Deal) => {
  if (stage !== DealStage.WON && stage !== DealStage.LOST) return undefined
  return previous && previous.stage === stage && previous.closedAt ? previous.closedAt : todayIso()
}

export async function listDealsApi(workspaceId: string): Promise<Deal[]> {
  return deals.list(workspaceId)
}

export async function saveDealApi(workspaceId: string, input: DealInput, id?: string): Promise<Deal> {
  const value = clean(input)
  assertDeal(value, pipelineOf(await getSettingsApi(workspaceId)))
  if (id) {
    const previous = deals.get(workspaceId, id)
    if (!previous) throw new Error("Deal not found")
    const moved = previous.stage !== value.stage
    if (moved) audit(workspaceId, value.title, value.stage)
    // update() merges; list optional fields so clearing them sticks
    return deals.update(workspaceId, id, {
      ...value,
      probability: value.probability,
      ownerId: value.ownerId,
      contactId: value.contactId,
      quoteId: value.quoteId,
      lostReason: value.lostReason,
      note: value.note,
      closedAt: closedAtFor(value.stage, previous),
      // the time-in-stage clock restarts only when the stage changes (CRM step 8)
      stageSince: moved ? todayIso() : previous.stageSince,
    })
  }
  const created = deals.create(workspaceId, { ...value, stageSince: todayIso(), closedAt: closedAtFor(value.stage) })
  recordAudit(workspaceId, { action: "Deal created", actionKey: "deal.created", category: "Billing", target: value.title })
  return created
}

/** Moves a deal to another stage (drag on the board or the stage menu). */
export async function moveDealApi(workspaceId: string, id: string, stage: DealStageId, lostReason?: string): Promise<Deal> {
  const d = deals.get(workspaceId, id)
  if (!d) throw new Error("Deal not found")
  const { id: _id, workspaceId: _ws, createdAt: _c, updatedAt: _u, closedAt: _cl, stageSince: _s, projectId: _p, ...rest } = d
  // A custom chance belongs to the stage it was set for
  const probability = isOpenDeal({ stage }) && stage === d.stage ? d.probability : undefined
  return saveDealApi(workspaceId, { ...rest, stage, probability, lostReason: lostReason ?? d.lostReason }, id)
}

export async function deleteDealApi(workspaceId: string, id: string): Promise<void> {
  if (!deals.get(workspaceId, id)) throw new Error("Deal not found")
  deals.remove(workspaceId, id)
}

/**
 * Saves the pipeline (CRM step 8). Deals in a stage that is removed move to
 * the stage chosen for them first, so no deal is left outside the pipeline.
 */
export async function savePipelineApi(workspaceId: string, pipeline: PipelineSettings, moves: Record<string, DealStageId> = {}): Promise<PipelineSettings> {
  const keep = new Set(pipeline.stages.map((s) => s.id))
  const orphans = deals.list(workspaceId).filter((d) => isOpenDeal(d) && !keep.has(d.stage))
  for (const d of orphans) {
    const target = moves[d.stage]
    if (!target || !keep.has(target)) throw new Error("Choose where the deals of a removed stage go")
  }
  // validate the whole pipeline before touching any deal
  const saved = pipelineOf(await updatePipelineApi(workspaceId, pipeline))
  for (const d of orphans) deals.update(workspaceId, d.id, { stage: moves[d.stage]!, stageSince: todayIso(), probability: undefined })
  return saved
}

/** Starts the project for a won deal: name, client and fixed budget come from the deal (CRM step 8). */
export async function createProjectFromDealApi(workspaceId: string, id: string, input: { code: string; managerId?: string }): Promise<WorkProject> {
  const deal = deals.get(workspaceId, id)
  if (!deal) throw new Error("Deal not found")
  if (deal.stage !== DealStage.WON) throw new Error("Only a won deal can start a project")
  if (deal.projectId) throw new Error("This deal already has a project")
  const code = input.code.trim().toUpperCase()
  if (code.length < 2) throw new Error("Give the project a code")
  if ((await listProjectsApi(workspaceId)).some((p) => p.code.toUpperCase() === code)) throw new Error("This project code is already used")
  const project = await createProjectApi(workspaceId, {
    code,
    name: deal.title.slice(0, 80),
    description: deal.note,
    clientId: deal.clientId,
    managerId: input.managerId,
    memberIds: input.managerId ? [input.managerId] : [],
    status: WorkProjectStatus.PLANNING,
    priority: Priority.MEDIUM,
    startDate: todayIso(),
    budgetType: BudgetType.FIXED,
    budgetAmount: deal.amount,
  })
  deals.update(workspaceId, id, { projectId: project.id })
  recordAudit(workspaceId, { action: "Project created from deal", actionKey: "deal.project", category: "Billing", target: deal.title, after: project.code })
  return project
}

function audit(workspaceId: string, title: string, stage: DealStageId) {
  if (stage === DealStage.WON) recordAudit(workspaceId, { action: "Deal won", actionKey: "deal.won", category: "Billing", target: title })
  else if (stage === DealStage.LOST) recordAudit(workspaceId, { action: "Deal lost", actionKey: "deal.lost", category: "Billing", target: title })
}
