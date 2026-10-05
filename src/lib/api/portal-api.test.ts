import { describe, it, expect, beforeEach } from "vitest"
import { decideMilestoneApi, findPortalAccountForSignInApi, invitePortalContactApi, listPortalAccessApi, revokePortalAccessApi } from "./portal-api"
import { listMilestonesApi, listTasksApi, updateTaskApi } from "./work-projects-api"
import { portalStatus, isPortalPath } from "@/lib/workforce/portal"
import { PortalAccessStatus } from "@/types/work-portal"
import { TaskStatus } from "@/types/work-projects"

const WS = "ws_atlas"

describe("portal rules", () => {
  it("expires logins unused for too long and keeps revoked ones revoked", () => {
    const now = new Date("2026-06-01T00:00:00Z")
    expect(portalStatus({ status: PortalAccessStatus.ACTIVE, invitedAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-05-20T00:00:00Z" }, now, 90)).toBe("active")
    expect(portalStatus({ status: PortalAccessStatus.ACTIVE, invitedAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-02-01T00:00:00Z" }, now, 90)).toBe("expired")
    expect(portalStatus({ status: PortalAccessStatus.INVITED, invitedAt: "2026-01-01T00:00:00Z" }, now, 90)).toBe("expired")
    expect(portalStatus({ status: PortalAccessStatus.REVOKED, invitedAt: "2026-05-30T00:00:00Z" }, now, 90)).toBe("revoked")
  })
  it("knows portal paths with or without a locale", () => {
    expect(isPortalPath("/fr/dashboard/portal")).toBe(true)
    expect(isPortalPath("/dashboard/portal")).toBe(true)
    expect(isPortalPath("/en/dashboard/clients")).toBe(false)
  })
})

describe("portal access and decisions", () => {
  beforeEach(() => localStorage.clear())

  it("signs in invited and active contacts, refuses expired and revoked ones", async () => {
    const found = await findPortalAccountForSignInApi("Rachid@helio.example", [WS])
    expect(found?.client.id).toBe("cli_helio")
    expect(found?.access.status).toBe(PortalAccessStatus.ACTIVE)
    expect(await findPortalAccountForSignInApi("sofia@medica.example", [WS])).toBeUndefined() // 120 days unused
    const claire = (await listPortalAccessApi(WS)).find((a) => a.email === "claire@orbit.example")!
    await revokePortalAccessApi(WS, claire.id)
    expect(await findPortalAccountForSignInApi("claire@orbit.example", [WS])).toBeUndefined()
    await invitePortalContactApi(WS, "cli_orbit", "con_1")
    expect((await findPortalAccountForSignInApi("claire@orbit.example", [WS]))?.client.id).toBe("cli_orbit")
  })

  it("lets a client decide only its own finished milestones, with a comment to reject", async () => {
    const beta = (await listMilestonesApi(WS)).find((m) => m.id === "ms_orbit_beta")!
    await expect(decideMilestoneApi(WS, "cli_helio", beta.id, { approved: true, by: "X" })).rejects.toThrow(/not found/)
    const own = (await listTasksApi(WS, beta.projectId)).filter((t) => t.milestoneId === beta.id)
    if (own.some((t) => t.status !== TaskStatus.DONE)) {
      await expect(decideMilestoneApi(WS, "cli_orbit", beta.id, { approved: true, by: "Claire" })).rejects.toThrow(/isn't waiting/)
      for (const t of own) await updateTaskApi(WS, t.id, { status: TaskStatus.DONE })
    }
    await expect(decideMilestoneApi(WS, "cli_orbit", beta.id, { approved: false, by: "Claire" })).rejects.toThrow(/what should change/)
    const rejected = await decideMilestoneApi(WS, "cli_orbit", beta.id, { approved: false, comment: "Fix the export", by: "Claire" })
    expect(rejected.rejectedAt).toBeTruthy()
    expect(rejected.decisionComment).toBe("Fix the export")
    const approved = await decideMilestoneApi(WS, "cli_orbit", beta.id, { approved: true, by: "Claire" })
    expect(approved.approvedAt).toBeTruthy()
    expect(approved.rejectedAt).toBeUndefined()
    await expect(decideMilestoneApi(WS, "cli_orbit", beta.id, { approved: true, by: "Claire" })).rejects.toThrow(/isn't waiting/)
  })
})
