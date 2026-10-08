import { createCollection } from "@/lib/workforce/demo-store"
import { consoleCan } from "@/lib/platform/console-roles"
import { applyPlanContent, defaultPlanContent, planById, type NexoraPlanId, type PlanContent } from "@/lib/platform/nexora-catalog"
import { ConsoleCapability as C } from "@/types/platform-console"
import { PLATFORM_WS, audit, type ConsoleActor } from "./platform-console-api"

/**
 * What each plan contains (PLA-02, PLA-07): description, people included,
 * features and whether it is still sold. One copy for the console, the
 * customers' My subscription page and every seat check.
 */

const stamp = () => {
  const now = new Date().toISOString()
  return { workspaceId: PLATFORM_WS, createdAt: now, updatedAt: now }
}
const ERR_FORBIDDEN = "Your console role does not allow this"
const need = (actor: ConsoleActor, cap: C) => {
  if (!consoleCan(actor.role, cap)) throw new Error(ERR_FORBIDDEN)
}

const planContent = createCollection<PlanContent & { id: string; workspaceId: string; createdAt: string; updatedAt: string }>("platform-plan-content", "plc", () => defaultPlanContent().map((p) => ({ ...stamp(), id: `plc_${p.plan}`, ...p })))
/** Keeps the catalogue every page reads in line with the stored content. */
export function syncPlanContent() {
  applyPlanContent(planContent.list(PLATFORM_WS))
}

export async function listPlanContentApi() {
  syncPlanContent()
  return planContent.list(PLATFORM_WS)
}

/** Owners only, with their second factor: features, people included, description, retirement. The price changes through versions. */
export async function updatePlanContentApi(actor: ConsoleActor, plan: NexoraPlanId, input: { description: string; seats: number; features: string[]; retired: boolean }) {
  need(actor, C.CHANGE_PLANS)
  const features = input.features.map((f) => f.trim()).filter(Boolean)
  if (!input.description.trim() || features.length === 0) throw new Error("A plan needs a description and at least one feature")
  if (!(input.seats === -1 || (Number.isInteger(input.seats) && input.seats > 0))) throw new Error("People included is a whole number, or unlimited")
  const all = planContent.list(PLATFORM_WS)
  if (input.retired && all.filter((p) => p.plan !== plan && !p.retired).length === 0) throw new Error("At least one plan must stay on sale")
  const current = all.find((p) => p.plan === plan)!
  const updated = planContent.update(PLATFORM_WS, current.id, { description: input.description.trim(), seats: input.seats, features, retired: input.retired })
  syncPlanContent()
  const changes = [
    current.seats !== updated.seats && `people ${current.seats} → ${updated.seats}`,
    current.retired !== updated.retired && (updated.retired ? "retired from sale" : "back on sale"),
    current.description !== updated.description && "description",
    JSON.stringify(current.features) !== JSON.stringify(updated.features) && `${updated.features.length} features`,
  ].filter(Boolean).join(" · ")
  audit(actor, "plan.content_changed", "subscription", planById(plan).name, { after: changes || "no change" })
  return updated
}

