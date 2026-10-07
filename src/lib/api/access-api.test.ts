import { beforeEach, describe, expect, it } from "vitest"
import { AccountStatus } from "@/types/work-access"
import { WorkRole } from "@/types/workforce"
import { AdminPermissionsPlatform } from "@/types/roles"
import { changeAccessRoleApi, findAccountForSignInApi, inviteEmployeeApi, listAccountsApi, setAccountEnabledApi } from "./access-api"
import { changeWorkspacePlanApi, getWorkspaceSubscriptionApi, listSubscriptionInvoicesApi, planPrice, ERP_PLANS } from "./workspace-subscription-api"
import { permissionsFor, seatsUsed } from "@/lib/workforce/access"
import { isPlatformPath } from "@/lib/permissions/platform"
import { can, isPlatformOperator } from "@/lib/permissions/can"

const WS = "ws_atlas"

describe("team access and subscription", () => {
  beforeEach(() => localStorage.clear())

  it("gives access, signs in, and uses the role's permissions", async () => {
    expect(seatsUsed(await listAccountsApi(WS))).toBe(6)
    const account = await inviteEmployeeApi(WS, "emp_noah")
    expect(account).toMatchObject({ status: AccountStatus.INVITED, email: "noah@atlas.example" })
    await expect(inviteEmployeeApi(WS, "emp_noah")).rejects.toThrow(/already/)
    const found = await findAccountForSignInApi("NOAH@atlas.example", ["ws_northwind", WS])
    expect(found?.workspaceId).toBe(WS)
    expect((await listAccountsApi(WS)).find((a) => a.employeeId === "emp_noah")?.status).toBe(AccountStatus.ACTIVE)
    expect(permissionsFor(found!.employee)).toEqual([AdminPermissionsPlatform.PROJECTS_READ, AdminPermissionsPlatform.FILES_READ, AdminPermissionsPlatform.FILES_CREATE, AdminPermissionsPlatform.TIME_TRACK])
  })

  it("blocks disabled accounts and keeps one administrator", async () => {
    await setAccountEnabledApi(WS, "emp_lina", false)
    expect(await findAccountForSignInApi("lina@atlas.example", [WS])).toBeNull()
    await expect(setAccountEnabledApi(WS, "emp_sara", false)).rejects.toThrow(/administrator/)
    await expect(changeAccessRoleApi(WS, "emp_sara", WorkRole.MANAGER)).rejects.toThrow(/administrator/)
    expect((await changeAccessRoleApi(WS, "emp_lina", WorkRole.MANAGER)).role).toBe(WorkRole.MANAGER)
  })

  it("enforces plan seats and refuses a downgrade below the users in place", async () => {
    await changeWorkspacePlanApi(WS, "starter", "monthly", 5)
    await expect(inviteEmployeeApi(WS, "emp_noah")).rejects.toThrow(/seats/)
    await expect(changeWorkspacePlanApi(WS, "starter", "monthly", 6)).rejects.toThrow(/allows 5/)
    const next = await changeWorkspacePlanApi(WS, "enterprise", "yearly", 6)
    expect(next).toMatchObject({ planId: "enterprise", cycle: "yearly" })
    expect((await getWorkspaceSubscriptionApi(WS)).plan.seats).toBe(-1)
    expect(planPrice(ERP_PLANS[2]!, "yearly")).toBe(39900) // 3 990 MAD a month × 10
    const invoices = await listSubscriptionInvoicesApi(WS)
    expect(invoices.length).toBeGreaterThan(0)
    expect(invoices[0]).toMatchObject({ planId: "enterprise", subtotal: 39900, tax: 7980, total: 47880 })
  })

  it("keeps the platform console for the Nexora team", () => {
    expect(isPlatformPath("/en/dashboard/plans")).toBe(true)
    expect(isPlatformPath("/dashboard/users/abc")).toBe(true)
    expect(isPlatformPath("/fr/dashboard/client-invoices")).toBe(false)
    const companyAdmin = { id: "1", name: "A", email: "a", role: "admin" } as never
    const operator = { ...(companyAdmin as object), platformOperator: true } as never
    const employee = { id: "2", name: "E", email: "e", role: "user", userType: "user", employeeId: "emp_lina", permissions: [AdminPermissionsPlatform.TIME_TRACK] } as never
    expect(isPlatformOperator(companyAdmin)).toBe(false)
    expect(isPlatformOperator(operator)).toBe(true)
    expect(can(employee, AdminPermissionsPlatform.TIME_TRACK)).toBe(true)
    expect(can(employee, AdminPermissionsPlatform.INVOICES_READ)).toBe(false)
  })
})
