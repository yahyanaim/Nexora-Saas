import { createCollection } from "@/lib/workforce/demo-store"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { assertChangeOrder, nextChangeNumber } from "@/lib/workforce/phase-budgets"
import { recordAudit } from "@/lib/workforce/audit"
import { getProjectApi } from "./work-projects-api"
import { ChangeOrderStatus, type ChangeOrder, type ChangeOrderInput } from "@/types/work-projects"

/**
 * Change orders (Phase 6g.4). Backed by the browser demo store for now;
 * replace the bodies with apiClient calls once the backend exists.
 */
const orders = createCollection<ChangeOrder>("change-orders", "co", (workspaceId) => {
  if (workspaceId !== "ws_atlas") return []
  const today = todayIso()
  const d = (n: number) => addDays(today, n)
  const at = (n: number) => `${d(n)}T10:00:00.000Z`
  const rows: Omit<ChangeOrder, "workspaceId" | "createdAt" | "updatedAt">[] = [
    { id: "co_orb_1", projectId: "prj_orbit", milestoneId: "ms_orbit_launch", number: "CO-ORB-01-01", title: "Arabic interface", description: "Right-to-left layout and Arabic translations for the customer portal.", amount: 60000, hours: 60, status: ChangeOrderStatus.APPROVED, sentAt: at(-15), decidedAt: at(-12), decidedBy: "Karim Haddad" },
    { id: "co_orb_2", projectId: "prj_orbit", milestoneId: "ms_orbit_beta", number: "CO-ORB-01-02", title: "Driver mobile view", description: "A simplified tracking page for drivers on phones.", amount: 45000, hours: 40, status: ChangeOrderStatus.SENT, sentAt: at(-3) },
    { id: "co_hel_1", projectId: "prj_helio", number: "CO-HEL-02-01", title: "Two extra site connectors", amount: 30000, hours: 24, status: ChangeOrderStatus.DRAFT },
  ]
  return rows.map((r) => ({ ...r, workspaceId, createdAt: at(-20), updatedAt: at(-3) }))
})

const clean = (input: ChangeOrderInput): ChangeOrderInput => ({
  ...input,
  title: input.title.trim(),
  amount: Number(input.amount) || 0,
  hours: Number(input.hours) || 0,
  milestoneId: input.milestoneId || undefined,
  description: input.description?.trim() || undefined,
})

export async function listChangeOrdersApi(workspaceId: string, projectId?: string): Promise<ChangeOrder[]> {
  const all = orders.list(workspaceId)
  return (projectId ? all.filter((o) => o.projectId === projectId) : all).sort((a, b) => a.number.localeCompare(b.number))
}

function editable(workspaceId: string, id: string) {
  const o = orders.get(workspaceId, id)
  if (!o) throw new Error("Change order not found")
  if (o.status === ChangeOrderStatus.APPROVED || o.status === ChangeOrderStatus.REJECTED) throw new Error("A decided change order can't be changed")
  return o
}

export async function saveChangeOrderApi(workspaceId: string, input: ChangeOrderInput, id?: string): Promise<ChangeOrder> {
  const value = clean(input)
  assertChangeOrder(value)
  if (id) {
    const o = editable(workspaceId, id)
    // A sent change goes back to draft when its terms change, so the client sees the new version
    const terms = o.amount !== value.amount || o.hours !== value.hours
    return orders.update(workspaceId, id, { ...value, milestoneId: value.milestoneId, description: value.description, ...(terms ? { status: ChangeOrderStatus.DRAFT, sentAt: undefined } : {}) })
  }
  const project = await getProjectApi(workspaceId, value.projectId)
  if (!project) throw new Error("Project not found")
  const number = nextChangeNumber(project.code, orders.list(workspaceId).filter((o) => o.projectId === value.projectId))
  const created = orders.create(workspaceId, { ...value, number, status: ChangeOrderStatus.DRAFT })
  recordAudit(workspaceId, { action: "Change order created", actionKey: "changeOrder.created", category: "Approvals", target: `${number} ${value.title}` })
  return created
}

/** Marks the change as sent to the client for approval. */
export async function sendChangeOrderApi(workspaceId: string, id: string): Promise<ChangeOrder> {
  editable(workspaceId, id)
  return orders.update(workspaceId, id, { status: ChangeOrderStatus.SENT, sentAt: new Date().toISOString() })
}

/** Records the client's decision; an approved change adds to the budget. */
export async function decideChangeOrderApi(workspaceId: string, id: string, approved: boolean, by: string, reason?: string): Promise<ChangeOrder> {
  const o = editable(workspaceId, id)
  if (o.status !== ChangeOrderStatus.SENT) throw new Error("Send the change to the client first")
  if (!approved && !reason?.trim()) throw new Error("Say why the client declined")
  recordAudit(workspaceId, { action: approved ? "Change order approved" : "Change order declined", actionKey: approved ? "changeOrder.approved" : "changeOrder.rejected", category: "Approvals", target: `${o.number} ${o.title}` })
  return orders.update(workspaceId, id, {
    status: approved ? ChangeOrderStatus.APPROVED : ChangeOrderStatus.REJECTED,
    decidedAt: new Date().toISOString(),
    decidedBy: by,
    rejectionReason: approved ? undefined : reason?.trim(),
  })
}

export async function deleteChangeOrderApi(workspaceId: string, id: string): Promise<void> {
  const o = orders.get(workspaceId, id)
  if (!o) throw new Error("Change order not found")
  if (o.status !== ChangeOrderStatus.DRAFT) throw new Error("Only a draft change order can be deleted")
  orders.remove(workspaceId, id)
}
