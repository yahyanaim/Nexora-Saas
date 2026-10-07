import { beforeEach, describe, expect, it } from "vitest"
import { closeProblem, noticesFor, overallState, stateFrom } from "./ops-rules"
import {
  listBackupsApi,
  listHealthApi,
  listIncidentsApi,
  listTenantErrorsApi,
  noticesForWorkspaceApi,
  notifyIncidentApi,
  resolveIncidentApi,
  restoreServiceApi,
  scheduleMaintenanceApi,
  simulateOutageApi,
  updateIncidentApi,
} from "@/lib/api/platform-ops-api"
import { listAuditApi, type ConsoleActor } from "@/lib/api/platform-console-api"
import { ConsoleRole as R } from "@/types/platform-console"
import type { Incident } from "@/types/platform-ops"

const amine: ConsoleActor = { id: "stf_amine", name: "Amine Lahlou", role: R.ENGINEERING }
const liam: ConsoleActor = { id: "stf_liam", name: "Liam O'Connor", role: R.SUPPORT }

describe("health and incident rules", () => {
  it("turns a tile amber or red from its measures (INC-01)", () => {
    expect(stateFrom(0.3, 200)).toBe("ok")
    expect(stateFrom(3, 200)).toBe("degraded")
    expect(stateFrom(0.3, 1600)).toBe("degraded")
    expect(stateFrom(25, 200)).toBe("down")
    expect(overallState([{ state: "ok" }, { state: "degraded" }])).toBe("degraded")
  })

  it("needs a resolution, and a post-mortem for severities 1 and 2 (INC-03)", () => {
    expect(closeProblem({ severity: "sev3" }, { resolution: "short" })).toBe("resolution")
    expect(closeProblem({ severity: "sev3" }, { resolution: "Restarted the mail relay." })).toBeNull()
    expect(closeProblem({ severity: "sev1" }, { resolution: "Restarted the mail relay." })).toBe("postmortem")
  })

  it("shows notices only to affected customers, until resolution or the end of the window (INC-04, INC-07)", () => {
    const base: Pick<Incident, "workspaceId" | "timeline" | "services" | "source" | "createdBy" | "createdAt" | "updatedAt" | "severity" | "startedAt"> = { workspaceId: "w", timeline: [], services: [], source: "manual", createdBy: "x", createdAt: "", updatedAt: "", severity: "sev2", startedAt: "2026-10-01T00:00:00Z" }
    const list: Incident[] = [
      { ...base, id: "a", number: "INC-1", kind: "incident", title: "A", status: "identified", customerIds: ["cus_atlas"], notice: "Slow", notifiedAt: "x" },
      { ...base, id: "b", number: "INC-2", kind: "incident", title: "B", status: "investigating", customerIds: [] },
      { ...base, id: "c", number: "MNT-1", kind: "maintenance", title: "C", status: "scheduled", customerIds: [], notice: "Upgrade", notifiedAt: "x", plannedEnd: "2026-10-10T00:00:00Z" },
    ]
    expect(noticesFor(list, "cus_atlas", new Date("2026-10-05T00:00:00Z")).map((n) => n.id)).toEqual(["a", "c"])
    expect(noticesFor(list, "cus_bina", new Date("2026-10-05T00:00:00Z")).map((n) => n.id)).toEqual(["c"])
    expect(noticesFor(list, "cus_bina", new Date("2026-10-11T00:00:00Z"))).toEqual([])
  })
})

describe("health, incidents and maintenance", () => {
  beforeEach(() => localStorage.clear())

  it("seeds six services, tenant errors without business data, backups and a last restore test (INC-01, INC-02, INC-06)", async () => {
    expect((await listHealthApi()).map((h) => h.service)).toEqual(["api", "database", "jobs", "storage", "email", "payments"])
    expect((await listHealthApi()).find((h) => h.service === "email")?.state).toBe("degraded")
    const tenants = await listTenantErrorsApi()
    expect(Object.keys(tenants[0]!).sort()).toEqual(["customerId", "customerName", "errors", "p95Ms", "requests"])
    expect(tenants.some((t) => t.customerId === "cus_fes")).toBe(false)
    expect((await listBackupsApi()).some((b) => b.kind === "restore_test")).toBe(true)
  })

  it("opens a draft when a service fails, then informs and resolves it (INC-03 to INC-05)", async () => {
    await expect(simulateOutageApi(liam, "api", "down")).rejects.toThrow(/does not allow/)
    const draft = await simulateOutageApi(amine, "api", "down")
    expect(draft).toMatchObject({ status: "draft", severity: "sev1", source: "monitoring", services: ["api"] })
    expect((await listHealthApi()).find((h) => h.service === "api")?.state).toBe("down")
    // a second failure on the same service adds to the same incident
    await simulateOutageApi(amine, "api", "degraded")
    expect((await listIncidentsApi()).filter((i) => i.kind === "incident" && i.services.includes("api") && i.status !== "resolved")).toHaveLength(1)

    await updateIncidentApi(amine, draft.id, { text: "Load balancer restarted", status: "identified", customerIds: ["cus_atlas"] })
    expect(await noticesForWorkspaceApi("ws_atlas")).toHaveLength(1) // the maintenance only
    await notifyIncidentApi(amine, draft.id, "Nexora is unavailable for some customers; we are on it.")
    expect((await noticesForWorkspaceApi("ws_atlas")).map((n) => n.kind)).toEqual(["incident", "maintenance"])
    expect((await noticesForWorkspaceApi("ws_northwind")).map((n) => n.kind)).toEqual(["maintenance"])

    await restoreServiceApi(amine, "api")
    await expect(resolveIncidentApi(amine, draft.id, { resolution: "Load balancer replaced." })).rejects.toThrow(/post-mortem/)
    await resolveIncidentApi(amine, draft.id, { resolution: "Load balancer replaced.", postmortem: "Cause: a full disk on the balancer. Action: disk alerts at 80%." })
    expect((await noticesForWorkspaceApi("ws_atlas")).map((n) => n.kind)).toEqual(["maintenance"])
    const actions = (await listAuditApi()).map((e) => e.action)
    expect(actions).toEqual(expect.arrayContaining(["health.outage_simulated", "incident.updated", "incident.notified", "health.service_restored", "incident.resolved"]))
  })

  it("announces maintenance at least 48 hours ahead (INC-07)", async () => {
    const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()
    const input = { title: "Mail relay upgrade", services: ["email" as const], customerIds: [], notice: "E-mails may be delayed by up to 30 minutes." }
    await expect(scheduleMaintenanceApi(amine, { ...input, plannedStart: inHours(24), plannedEnd: inHours(25) })).rejects.toThrow(/48 hours/)
    await expect(scheduleMaintenanceApi(amine, { ...input, plannedStart: inHours(72), plannedEnd: inHours(71) })).rejects.toThrow(/after the start/)
    const m = await scheduleMaintenanceApi(amine, { ...input, plannedStart: inHours(72), plannedEnd: inHours(73) })
    expect(m.number).toBe("MNT-0003")
    expect((await noticesForWorkspaceApi("ws_atlas")).map((n) => n.number)).toEqual(expect.arrayContaining(["MNT-0002", "MNT-0003"]))
  })
})
