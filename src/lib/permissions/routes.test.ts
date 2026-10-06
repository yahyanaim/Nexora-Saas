import { describe, it, expect } from "vitest"
import { isRouteDenied, routePermission } from "./routes"
import { WORK_ROLE_PERMISSIONS, WorkRole } from "@/types/workforce"
import { AdminPermissionsPlatform as P } from "@/types/roles"

const has = (role: WorkRole) => (p: P) => WORK_ROLE_PERMISSIONS[role].includes(P.ALL) || WORK_ROLE_PERMISSIONS[role].includes(p)
const opens = (role: WorkRole, path: string) => !isRouteDenied(path, has(role))

describe("route permissions", () => {
  it("sub-pages inherit their parent's permission", () => {
    expect(routePermission("/dashboard/projects/prj_1")).toBe(P.PROJECTS_READ)
    expect(routePermission("/dashboard/unknown")).toBeUndefined()
  })

  it("keeps employees out of costs, finance, settings and HR pages typed by URL", () => {
    for (const path of ["/dashboard/profitability", "/dashboard/settings", "/dashboard/client-invoices", "/dashboard/receivables", "/dashboard/employees", "/dashboard/kpis", "/dashboard/time-approvals", "/dashboard/documents"]) {
      expect(opens(WorkRole.EMPLOYEE, path), path).toBe(false)
    }
    for (const path of ["/dashboard/my-work", "/dashboard/timesheets", "/dashboard/leave", "/dashboard/expenses", "/dashboard/reviews", "/dashboard/projects/prj_1"]) {
      expect(opens(WorkRole.EMPLOYEE, path), path).toBe(true)
    }
  })

  it("gives each role its own area", () => {
    expect(opens(WorkRole.ACCOUNTANT, "/dashboard/profitability")).toBe(true)
    expect(opens(WorkRole.ACCOUNTANT, "/dashboard/time-approvals")).toBe(false)
    expect(opens(WorkRole.MANAGER, "/dashboard/time-approvals")).toBe(true)
    expect(opens(WorkRole.MANAGER, "/dashboard/profitability")).toBe(false)
    expect(opens(WorkRole.MANAGER, "/dashboard/settings")).toBe(false)
    expect(opens(WorkRole.ADMIN, "/dashboard/settings")).toBe(true)
  })
})
