import { beforeEach, describe, expect, it } from "vitest"
import { CONSOLE_MATRIX, canManageStaff, canRevokeSessions, consoleCan, consoleGrant, needsStepUp } from "./console-roles"
import { ABSOLUTE_LIMIT_MS, IDLE_LIMIT_MS, inviteExpired, isValidStepUpCode, sessionState } from "./session-policy"
import {
  acceptInviteApi,
  changeStaffRoleApi,
  inviteStaffApi,
  listAuditApi,
  listSessionsApi,
  listStaffApi,
  recordAuditExportApi,
  removeStaffApi,
  revokeSessionApi,
  type ConsoleActor,
} from "@/lib/api/platform-console-api"
import { CONSOLE_ROLES, ConsoleCapability as C, ConsoleRole as R } from "@/types/platform-console"

const sophia: ConsoleActor = { id: "stf_sophia", name: "Sophia Vance", role: R.OWNER }
const liam: ConsoleActor = { id: "stf_liam", name: "Liam O'Connor", role: R.SUPPORT }
const admin: ConsoleActor = { id: "stf_x", name: "Ops Lead", role: R.ADMIN }

describe("console permission matrix (Table 23)", () => {
  it("covers every capability for the seven roles", () => {
    expect(CONSOLE_ROLES).toHaveLength(7)
    for (const row of Object.values(CONSOLE_MATRIX)) expect(Object.keys(row).sort()).toEqual([...CONSOLE_ROLES].sort())
  })

  it("follows the cahier des charges", () => {
    expect(consoleCan(R.SALES, C.CREATE_TRIAL)).toBe(true)
    expect(consoleCan(R.SALES, C.CHANGE_STATUS)).toBe(false)
    expect(consoleGrant(R.FINANCE, C.REFUND_LARGE)).toBe("2fa_2p")
    expect(needsStepUp(R.OWNER, C.CHANGE_PLANS)).toBe(true)
    expect(needsStepUp(R.ADMIN, C.CHANGE_STATUS)).toBe(false)
    expect(consoleCan(R.READ_ONLY, C.VIEW_CUSTOMERS)).toBe(true)
    expect(Object.values(C).filter((c) => c !== C.VIEW_CUSTOMERS).some((c) => consoleCan(R.READ_ONLY, c))).toBe(false)
    expect(consoleCan(undefined, C.VIEW_CUSTOMERS)).toBe(false)
  })

  it("lets admins manage staff but not owners", () => {
    expect(canManageStaff(R.OWNER, R.OWNER)).toBe(true)
    expect(canManageStaff(R.ADMIN, R.SUPPORT, R.FINANCE)).toBe(true)
    expect(canManageStaff(R.ADMIN, R.OWNER)).toBe(false)
    expect(canManageStaff(R.ADMIN, R.SUPPORT, R.OWNER)).toBe(false)
    expect(canManageStaff(R.SUPPORT, R.SALES)).toBe(false)
    expect(canRevokeSessions(R.ENGINEERING)).toBe(true)
    expect(canRevokeSessions(R.FINANCE)).toBe(false)
  })
})

describe("session and invitation policy", () => {
  const now = new Date("2026-10-08T12:00:00Z")
  const at = (ms: number) => new Date(now.getTime() - ms).toISOString()

  it("ends sessions after 30 minutes idle or 12 hours in total (STF-06)", () => {
    expect(sessionState({ startedAt: at(60_000), lastActivityAt: at(0) }, now)).toBe("active")
    expect(sessionState({ startedAt: at(60_000 * 60), lastActivityAt: at(IDLE_LIMIT_MS) }, now)).toBe("idle_expired")
    expect(sessionState({ startedAt: at(ABSOLUTE_LIMIT_MS), lastActivityAt: at(0) }, now)).toBe("expired")
    expect(sessionState({ startedAt: at(0), lastActivityAt: at(0), revokedAt: at(0) }, now)).toBe("revoked")
  })

  it("expires invitations after 72 hours and accepts six-digit codes", () => {
    expect(inviteExpired({ status: "invited", inviteExpiresAt: at(1) }, now)).toBe(true)
    expect(inviteExpired({ status: "invited", inviteExpiresAt: new Date(now.getTime() + 1000).toISOString() }, now)).toBe(false)
    expect(inviteExpired({ status: "active", inviteExpiresAt: at(1) }, now)).toBe(false)
    expect(isValidStepUpCode("123456")).toBe(true)
    expect(isValidStepUpCode("12345")).toBe(false)
  })
})

describe("team, sessions and audit trail", () => {
  beforeEach(() => localStorage.clear())

  it("invites, accepts and audits every change", async () => {
    const before = (await listAuditApi()).length
    const created = await inviteStaffApi(sophia, { name: "Karim Idrissi", email: "Karim@Nexora.io", role: R.FINANCE })
    expect(created).toMatchObject({ status: "invited", email: "karim@nexora.io", twoFactor: false })
    await expect(inviteStaffApi(sophia, { name: "Karim", email: "karim@nexora.io", role: R.SALES })).rejects.toThrow(/already/)
    await expect(inviteStaffApi(liam, { name: "X", email: "x@nexora.io", role: R.SALES })).rejects.toThrow(/does not allow/)
    await expect(inviteStaffApi(admin, { name: "X", email: "x@nexora.io", role: R.OWNER })).rejects.toThrow(/does not allow/)
    expect(await acceptInviteApi(created.id)).toMatchObject({ status: "active", twoFactor: true })

    await changeStaffRoleApi(sophia, created.id, R.SALES)
    const events = await listAuditApi()
    expect(events.length).toBe(before + 2)
    expect(events[0]).toMatchObject({ action: "staff.role_changed", before: R.FINANCE, after: R.SALES, actorName: "Sophia Vance" })
  })

  it("keeps one owner, refuses self-removal and revokes sessions on removal (STF-07)", async () => {
    await expect(changeStaffRoleApi(sophia, "stf_sophia", R.ADMIN)).rejects.toThrow(/at least one platform owner/)
    await expect(removeStaffApi(sophia, "stf_sophia")).rejects.toThrow(/yourself/)
    await removeStaffApi(sophia, "stf_liam")
    expect((await listStaffApi()).some((s) => s.id === "stf_liam")).toBe(false)
    expect((await listSessionsApi()).filter((s) => s.staffId === "stf_liam").every((s) => s.revokedAt)).toBe(true)
  })

  it("revokes sessions within the rules and records audit exports for owners only", async () => {
    await expect(revokeSessionApi(liam, "ses_1")).rejects.toThrow(/does not allow/)
    const revoked = await revokeSessionApi(sophia, "ses_2")
    expect(revoked.revokedBy).toBe("Sophia Vance")
    await expect(revokeSessionApi(sophia, "ses_2")).rejects.toThrow(/already ended/)
    await expect(recordAuditExportApi(liam, 3)).rejects.toThrow(/does not allow/)
    await recordAuditExportApi(sophia, 3)
    expect((await listAuditApi())[0]).toMatchObject({ action: "audit.exported", targetLabel: "3 events" })
  })
})
