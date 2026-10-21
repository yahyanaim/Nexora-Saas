import { beforeEach, describe, expect, it } from "vitest"
import {
  acceptClientRequestApi,
  createClientRequestApi,
  listClientRequestsApi,
  markRequestDuplicateApi,
  rejectClientRequestApi,
  reopenClientRequestApi,
  snoozeClientRequestApi,
} from "./client-requests-api"
import { decideChangeOrderForClientApi } from "./portal-api"
import { buildInbox } from "@/lib/workforce/inbox"
import { listChangeOrdersApi, sendChangeOrderApi } from "./change-orders-api"
import { listTasksApi } from "./work-projects-api"
import { clientView, nextRequestNumber, requestState, waitingRequests } from "@/lib/workforce/client-requests"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { ChangeOrderStatus, Priority, TaskStatus } from "@/types/work-projects"
import { RequestKind, RequestStatus } from "@/types/work-requests"

const WS = "ws_atlas"
const claire = { name: "Claire Petit" }
const accept = { projectId: "prj_orbit", title: "Shipments export", priority: Priority.HIGH, estimatedHours: 6, assigneeId: "emp_lina" }

describe("client requests (P3)", () => {
  beforeEach(() => localStorage.clear())

  it("numbers requests and keeps them to the client's own open projects", async () => {
    const r = await createClientRequestApi(WS, "cli_orbit", { title: "  Add a CSV export ", kind: RequestKind.CHANGE, urgent: true, projectId: "prj_orbit" }, claire)
    expect(r).toMatchObject({ number: "REQ-006", title: "Add a CSV export", status: RequestStatus.NEW, urgent: true, requestedBy: "Claire Petit" })
    await expect(createClientRequestApi(WS, "cli_orbit", { title: "Other client's project", kind: RequestKind.BUG, urgent: false, projectId: "prj_helio" }, claire)).rejects.toThrow(/not found/)
    await expect(createClientRequestApi(WS, "cli_orbit", { title: "Closed", kind: RequestKind.BUG, urgent: false, projectId: "prj_orbit_mvp" }, claire)).rejects.toThrow(/closed/)
    await expect(createClientRequestApi(WS, "cli_orbit", { title: "Hi", kind: RequestKind.BUG, urgent: false }, claire)).rejects.toThrow(/few words/)
    expect((await listClientRequestsApi(WS, "cli_helio")).map((x) => x.number)).toEqual(["REQ-005"])
  })

  it("accepts a request as a task, with a draft change order when outside the scope", async () => {
    const saved = await acceptClientRequestApi(WS, "req_1", { ...accept, changeOrder: { amount: 12000, hours: 10 } })
    expect(saved).toMatchObject({ status: RequestStatus.ACCEPTED, decidedBy: expect.any(String) })
    const task = (await listTasksApi(WS, "prj_orbit")).find((t) => t.id === saved.taskId)!
    expect(task).toMatchObject({ title: "Shipments export", status: TaskStatus.TODO, priority: Priority.HIGH, assigneeId: "emp_lina", estimatedHours: 6 })
    expect(task.description).toContain("REQ-001 by Claire Petit")
    const co = (await listChangeOrdersApi(WS, "prj_orbit")).find((o) => o.id === saved.changeOrderId)!
    expect(co).toMatchObject({ amount: 12000, hours: 10, status: ChangeOrderStatus.DRAFT, title: "Shipments export" })
    await expect(acceptClientRequestApi(WS, "req_1", accept)).rejects.toThrow(/already answered/)
    await expect(acceptClientRequestApi(WS, "req_2", { ...accept, changeOrder: { amount: 0, hours: 2 } })).rejects.toThrow(/price/)
  })

  it("declines with a reason, snoozes to a later day and marks duplicates", async () => {
    await expect(rejectClientRequestApi(WS, "req_2", "  ")).rejects.toThrow(/why/)
    expect((await rejectClientRequestApi(WS, "req_2", "Fixed in the next release")).reason).toBe("Fixed in the next release")
    await expect(snoozeClientRequestApi(WS, "req_5", todayIso())).rejects.toThrow(/after today/)
    expect((await snoozeClientRequestApi(WS, "req_5", addDays(todayIso(), 7))).status).toBe(RequestStatus.SNOOZED)
    await expect(markRequestDuplicateApi(WS, "req_1", "tsk_9")).rejects.toThrow(/not found/)
    expect((await markRequestDuplicateApi(WS, "req_1", "tsk_6")).duplicateOfTaskId).toBe("tsk_6")
    const back = await reopenClientRequestApi(WS, "req_2")
    expect(back).toMatchObject({ status: RequestStatus.NEW, reason: undefined })
  })

  it("lets the client decide a change order of its own project only", async () => {
    await sendChangeOrderApi(WS, "co_hel_1")
    await expect(decideChangeOrderForClientApi(WS, "cli_orbit", "co_hel_1", { approved: true, by: "Claire" })).rejects.toThrow(/not found/)
    await expect(decideChangeOrderForClientApi(WS, "cli_orbit", "co_orb_2", { approved: false, by: "Claire" })).rejects.toThrow(/what should change/)
    const ok = await decideChangeOrderForClientApi(WS, "cli_orbit", "co_orb_2", { approved: true, by: "Claire Petit" })
    expect(ok).toMatchObject({ status: ChangeOrderStatus.APPROVED, decidedBy: "Claire Petit" })
  })
})

describe("request rules (P3)", () => {
  const today = "2026-10-21"
  const base = { id: "r", workspaceId: "ws", number: "REQ-001", clientId: "c", title: "x", kind: RequestKind.CHANGE, urgent: false, requestedBy: "C", createdAt: "", updatedAt: "" }

  it("brings snoozed requests back on their day", () => {
    expect(requestState({ status: RequestStatus.SNOOZED, snoozedUntil: "2026-10-21" }, today)).toBe(RequestStatus.NEW)
    expect(requestState({ status: RequestStatus.SNOOZED, snoozedUntil: "2026-10-22" }, today)).toBe(RequestStatus.SNOOZED)
    expect(waitingRequests([{ status: RequestStatus.NEW }, { status: RequestStatus.SNOOZED, snoozedUntil: "2026-10-01" }, { status: RequestStatus.REJECTED }], today)).toHaveLength(2)
    expect(nextRequestNumber([{ number: "REQ-009" }, { number: "REQ-011" }])).toBe("REQ-012")
  })

  it("tells the client where its request is", () => {
    const tasks = [{ id: "t1", status: TaskStatus.IN_PROGRESS }, { id: "t2", status: TaskStatus.DONE }, { id: "t3", status: TaskStatus.TODO }]
    expect(clientView({ ...base, status: RequestStatus.NEW }, tasks, today)).toBe("received")
    expect(clientView({ ...base, status: RequestStatus.SNOOZED, snoozedUntil: "2026-11-01" }, tasks, today)).toBe("later")
    expect(clientView({ ...base, status: RequestStatus.ACCEPTED, taskId: "t3" }, tasks, today)).toBe("planned")
    expect(clientView({ ...base, status: RequestStatus.ACCEPTED, taskId: "t1" }, tasks, today)).toBe("working")
    expect(clientView({ ...base, status: RequestStatus.ACCEPTED, taskId: "t2" }, tasks, today)).toBe("done")
    expect(clientView({ ...base, status: RequestStatus.DUPLICATE, duplicateOfTaskId: "t3" }, tasks, today)).toBe("alreadyPlanned")
    expect(clientView({ ...base, status: RequestStatus.REJECTED }, tasks, today)).toBe("declined")
  })
})

describe("requests in the bell (P3)", () => {
  it("tells people who manage projects how many requests wait, and how many are urgent", () => {
    const base = { viewer: { employeeId: "emp_karim", isAdmin: false }, employees: [], reviews: [], entries: [], leave: [], expenses: [], invoices: [], documents: [], tasks: [], today: "2026-10-21" }
    const r = { workspaceId: "ws", number: "REQ-001", clientId: "c", title: "x", kind: RequestKind.CHANGE, requestedBy: "C", createdAt: "", updatedAt: "" }
    const requests = [
      { ...r, id: "a", urgent: true, status: RequestStatus.NEW },
      { ...r, id: "b", urgent: false, status: RequestStatus.SNOOZED, snoozedUntil: "2026-10-01" },
      { ...r, id: "c", urgent: false, status: RequestStatus.SNOOZED, snoozedUntil: "2026-11-01" },
      { ...r, id: "d", urgent: false, status: RequestStatus.ACCEPTED },
    ]
    const items = buildInbox({ ...base, rights: { approveTime: false, invoices: false, hr: false, projects: true }, requests })
    expect(items).toEqual([expect.objectContaining({ title: "inboxRequests", message: "inboxRequestsUrgent", values: { count: 2, urgent: 1 }, href: "/dashboard/requests" })])
    expect(buildInbox({ ...base, rights: { approveTime: false, invoices: false, hr: false }, requests })).toEqual([])
  })
})
