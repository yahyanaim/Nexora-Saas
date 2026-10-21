import { createCollection } from "@/lib/workforce/demo-store"
import { getAuditActor, recordAudit } from "@/lib/workforce/audit"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { MAX_REQUEST_DETAILS, MAX_REQUEST_TITLE, isOpenRequest, nextRequestNumber } from "@/lib/workforce/client-requests"
import { Priority, TaskStatus, WorkProjectStatus } from "@/types/work-projects"
import { RequestKind, RequestStatus, type AcceptRequestInput, type ClientRequest, type ClientRequestInput } from "@/types/work-requests"
import { ClientStatus } from "@/types/workforce"
import { listClientsApi } from "./clients-api"
import { saveChangeOrderApi } from "./change-orders-api"
import { createTaskApi, listProjectsApi, listTasksApi } from "./work-projects-api"

/**
 * Client requests (P3): sent from the portal (or logged by the team after a
 * call), then accepted as a task, billed with a change order when outside the
 * scope, declined, snoozed or marked as already planned. Browser demo store
 * for now; the server must check that a portal user only sees its own client.
 */
function seed(workspaceId: string): ClientRequest[] {
  if (workspaceId !== "ws_atlas") return []
  const today = todayIso()
  const at = (n: number) => `${addDays(today, n)}T09:30:00.000Z`
  const rows: Omit<ClientRequest, "workspaceId" | "updatedAt">[] = [
    { id: "req_1", number: "REQ-001", clientId: "cli_orbit", projectId: "prj_orbit", title: "Export shipments to Excel", description: "Our finance team needs the monthly list of shipments with their invoice numbers as an Excel file.", kind: RequestKind.CHANGE, urgent: false, requestedBy: "Claire Petit", status: RequestStatus.NEW, createdAt: at(-2) },
    { id: "req_2", number: "REQ-002", clientId: "cli_orbit", projectId: "prj_orbit", title: "Invoice PDF shows the wrong VAT rate", description: "Invoice INV-1043 shows 10% instead of 20%.", kind: RequestKind.BUG, urgent: true, requestedBy: "Claire Petit", status: RequestStatus.NEW, createdAt: at(-1) },
    { id: "req_3", number: "REQ-003", clientId: "cli_orbit", projectId: "prj_orbit", title: "Download invoices from the portal", kind: RequestKind.CHANGE, urgent: false, requestedBy: "Claire Petit", status: RequestStatus.DUPLICATE, duplicateOfTaskId: "tsk_5", decidedAt: at(-6), decidedBy: "Karim Haddad", createdAt: at(-8) },
    { id: "req_4", number: "REQ-004", clientId: "cli_orbit", projectId: "prj_orbit", title: "Dark mode for the tracking page", kind: RequestKind.CHANGE, urgent: false, requestedBy: "Claire Petit", status: RequestStatus.SNOOZED, snoozedUntil: addDays(today, 20), decidedAt: at(-4), decidedBy: "Karim Haddad", createdAt: at(-5) },
    { id: "req_5", number: "REQ-005", clientId: "cli_helio", projectId: "prj_helio", title: "Can we add a third solar site?", description: "We open a new site in Ouarzazate next month.", kind: RequestKind.QUESTION, urgent: false, requestedBy: "Rachid Amrani", status: RequestStatus.NEW, createdAt: at(-3) },
  ]
  return rows.map((r) => ({ ...r, workspaceId, updatedAt: r.createdAt }))
}

const requests = createCollection<ClientRequest>("client-requests", "req", seed)

export async function listClientRequestsApi(workspaceId: string, clientId?: string): Promise<ClientRequest[]> {
  const all = requests.list(workspaceId)
  return (clientId ? all.filter((r) => r.clientId === clientId) : all).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** The client's open projects: requests can only be about those. */
async function assertProjectOfClient(workspaceId: string, clientId: string, projectId?: string) {
  if (!projectId) return
  const project = (await listProjectsApi(workspaceId)).find((p) => p.id === projectId)
  if (!project || project.clientId !== clientId) throw new Error("Project not found")
  if (project.status === WorkProjectStatus.COMPLETED || project.status === WorkProjectStatus.CANCELLED) throw new Error("This project is closed")
}

/**
 * A client sends a request from the portal, or a team member logs one for it.
 * Archived clients can't send requests.
 */
export async function createClientRequestApi(
  workspaceId: string,
  clientId: string,
  input: ClientRequestInput,
  by: { name: string; team?: boolean }
): Promise<ClientRequest> {
  const client = (await listClientsApi(workspaceId)).find((c) => c.id === clientId)
  if (!client) throw new Error("Client not found")
  if (client.status === ClientStatus.ARCHIVED) throw new Error("Archived clients can't send requests")
  const title = input.title.trim()
  if (title.length < 3) throw new Error("Say in a few words what you need")
  if (title.length > MAX_REQUEST_TITLE) throw new Error("Keep the title under 120 characters")
  const description = input.description?.trim() || undefined
  if (description && description.length > MAX_REQUEST_DETAILS) throw new Error("Keep the details under 2,000 characters")
  if (!Object.values(RequestKind).includes(input.kind)) throw new Error("Say what kind of request it is")
  await assertProjectOfClient(workspaceId, clientId, input.projectId)
  const saved = requests.create(workspaceId, {
    number: nextRequestNumber(requests.list(workspaceId)),
    clientId,
    projectId: input.projectId || undefined,
    title,
    description,
    kind: input.kind,
    urgent: !!input.urgent,
    requestedBy: by.name,
    loggedByTeam: by.team || undefined,
    status: RequestStatus.NEW,
  })
  recordAudit(workspaceId, { action: "Client request received", actionKey: "request.created", category: "Approvals", target: `${saved.number} ${title} (${client.name})` })
  return saved
}

function openRequest(workspaceId: string, id: string) {
  const r = requests.get(workspaceId, id)
  if (!r) throw new Error("This request no longer exists")
  if (!isOpenRequest(r)) throw new Error("This request was already answered")
  return r
}

const decided = () => ({ decidedAt: new Date().toISOString(), decidedBy: getAuditActor().name })

/**
 * Accepts a request: it becomes a task on the project and, when it is
 * outside the agreed scope, a draft change order to send to the client.
 */
export async function acceptClientRequestApi(workspaceId: string, id: string, input: AcceptRequestInput): Promise<ClientRequest> {
  const r = openRequest(workspaceId, id)
  await assertProjectOfClient(workspaceId, r.clientId, input.projectId)
  if (input.changeOrder && !(input.changeOrder.amount > 0)) throw new Error("Give the price of the extra work")
  const task = await createTaskApi(workspaceId, {
    projectId: input.projectId,
    title: input.title.trim() || r.title,
    description: [r.description, `From client request ${r.number} by ${r.requestedBy}.`].filter(Boolean).join("\n\n"),
    status: TaskStatus.TODO,
    priority: Object.values(Priority).includes(input.priority) ? input.priority : Priority.MEDIUM,
    assigneeId: input.assigneeId || undefined,
    dueDate: input.dueDate || undefined,
    estimatedHours: Math.max(0, Number(input.estimatedHours) || 0),
    subtasks: [],
  })
  const changeOrder = input.changeOrder
    ? await saveChangeOrderApi(workspaceId, { projectId: input.projectId, title: task.title, description: r.description, amount: input.changeOrder.amount, hours: input.changeOrder.hours, milestoneId: input.changeOrder.milestoneId })
    : undefined
  recordAudit(workspaceId, { action: "Client request accepted", actionKey: "request.accepted", category: "Approvals", target: `${r.number} ${r.title}` })
  return requests.update(workspaceId, id, { status: RequestStatus.ACCEPTED, projectId: input.projectId, taskId: task.id, changeOrderId: changeOrder?.id, snoozedUntil: undefined, ...decided() })
}

/** Declines a request; the reason is shown to the client. */
export async function rejectClientRequestApi(workspaceId: string, id: string, reason: string): Promise<ClientRequest> {
  const r = openRequest(workspaceId, id)
  if (!reason.trim()) throw new Error("Tell the client why")
  recordAudit(workspaceId, { action: "Client request declined", actionKey: "request.rejected", category: "Approvals", target: `${r.number} ${r.title}` })
  return requests.update(workspaceId, id, { status: RequestStatus.REJECTED, reason: reason.trim(), snoozedUntil: undefined, ...decided() })
}

/** Puts a request aside until a later day, when it comes back as new. */
export async function snoozeClientRequestApi(workspaceId: string, id: string, until: string): Promise<ClientRequest> {
  openRequest(workspaceId, id)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until) || until <= todayIso()) throw new Error("Pick a day after today")
  return requests.update(workspaceId, id, { status: RequestStatus.SNOOZED, snoozedUntil: until, ...decided() })
}

/** Marks a request as already covered by a task of the same project. */
export async function markRequestDuplicateApi(workspaceId: string, id: string, taskId: string): Promise<ClientRequest> {
  const r = openRequest(workspaceId, id)
  const task = (await listTasksApi(workspaceId)).find((t) => t.id === taskId)
  const project = task && (await listProjectsApi(workspaceId)).find((p) => p.id === task.projectId)
  if (!task || !project || project.clientId !== r.clientId) throw new Error("Task not found")
  return requests.update(workspaceId, id, { status: RequestStatus.DUPLICATE, duplicateOfTaskId: taskId, projectId: r.projectId ?? task.projectId, snoozedUntil: undefined, ...decided() })
}

/** Brings a declined, snoozed or duplicate request back to the inbox; accepted ones have a task. */
export async function reopenClientRequestApi(workspaceId: string, id: string): Promise<ClientRequest> {
  const r = requests.get(workspaceId, id)
  if (!r) throw new Error("This request no longer exists")
  if (r.status === RequestStatus.ACCEPTED) throw new Error("This request was already answered")
  return requests.update(workspaceId, id, { status: RequestStatus.NEW, reason: undefined, snoozedUntil: undefined, duplicateOfTaskId: undefined, decidedAt: undefined, decidedBy: undefined })
}
