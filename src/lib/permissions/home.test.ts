import { describe, it, expect } from "vitest"
import { homePathFor } from "./home"
import { User, UserStatus, UserType } from "@/types/users"
import { WORK_ROLE_PERMISSIONS, WorkRole } from "@/types/workforce"

const person = (role: WorkRole, extra: Partial<User> = {}): User =>
  ({ id: `u-${role}`, name: role, role: "user", userType: UserType.USER, status: UserStatus.ACTIVE, permissions: WORK_ROLE_PERMISSIONS[role], ...extra }) as User

describe("home page after signing in (G-02)", () => {
  it("opens the overview for roles that see analytics", () => {
    expect(homePathFor({ id: "a", name: "Admin", role: "admin", userType: UserType.ADMIN, status: UserStatus.ACTIVE })).toBe("/dashboard/overview")
  })

  it("sends an employee to My work instead of a page they can't open", () => {
    expect(homePathFor(person(WorkRole.EMPLOYEE))).toBe("/dashboard/my-work")
  })

  it("gives every company role a page it can open", () => {
    for (const role of [WorkRole.ADMIN, WorkRole.MANAGER, WorkRole.ACCOUNTANT, WorkRole.EMPLOYEE]) {
      expect(homePathFor(person(role)), role).toMatch(/^\/dashboard\/(overview|my-work|timesheets|projects|clients)$/)
    }
  })

  it("sends the Nexora team to the console and client contacts to the portal", () => {
    expect(homePathFor({ ...person(WorkRole.ADMIN), platformOperator: true } as User)).toBe("/dashboard/console")
    expect(homePathFor({ ...person(WorkRole.CLIENT), clientId: "cli_helio" } as User)).toBe("/dashboard/portal")
  })
})
