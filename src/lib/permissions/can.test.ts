import { describe, it, expect } from "vitest"
import { can, canAll, canAny, isSuperUser } from "./can"
import { User, UserStatus, UserType } from "@/types/users"
import { AdminPermissionsPlatform } from "@/types/roles"

const regularUser: User = {
  id: "u1",
  name: "Regular User",
  role: "user",
  userType: UserType.USER,
  status: UserStatus.ACTIVE,
  permissions: [AdminPermissionsPlatform.USERS_READ],
  roles: [
    {
      id: "r1",
      name: "Project Viewer",
      permissions: [AdminPermissionsPlatform.PROJECTS_READ],
    },
  ],
}

const adminUser: User = {
  id: "u2",
  name: "Admin User",
  role: "admin",
  userType: UserType.ADMIN,
  status: UserStatus.ACTIVE,
}

const ownerUser: User = {
  id: "u3",
  name: "Owner User",
  role: "user",
  userType: UserType.USER,
  teamRole: "owner",
  status: UserStatus.ACTIVE,
}

const restrictedUser: User = {
  id: "u4",
  name: "Restricted",
  role: "user",
  userType: UserType.USER,
  status: UserStatus.ACTIVE,
  permissions: [],
  roles: [],
}

describe("isSuperUser", () => {
  it("recognizes admin userType as superuser", () => {
    expect(isSuperUser(adminUser)).toBe(true)
  })

  it("recognizes owner teamRole as superuser", () => {
    expect(isSuperUser(ownerUser)).toBe(true)
  })

  it("returns false for regular and restricted users", () => {
    expect(isSuperUser(regularUser)).toBe(false)
    expect(isSuperUser(restrictedUser)).toBe(false)
    expect(isSuperUser(undefined)).toBe(false)
  })
})

describe("can", () => {
  it("denies unauthenticated users", () => {
    expect(can(undefined, AdminPermissionsPlatform.USERS_READ)).toBe(false)
  })

  it("grants all permissions to superusers", () => {
    expect(can(adminUser, AdminPermissionsPlatform.USERS_DELETE)).toBe(true)
    expect(can(adminUser, AdminPermissionsPlatform.ROLES_DELETE)).toBe(true)
    expect(can(ownerUser, AdminPermissionsPlatform.INVOICES_DELETE)).toBe(true)
  })

  it("checks direct user permissions", () => {
    expect(can(regularUser, AdminPermissionsPlatform.USERS_READ)).toBe(true)
    expect(can(regularUser, AdminPermissionsPlatform.USERS_DELETE)).toBe(false)
  })

  it("checks active role permissions", () => {
    expect(can(regularUser, AdminPermissionsPlatform.PROJECTS_READ)).toBe(true)
    expect(can(regularUser, AdminPermissionsPlatform.PROJECTS_DELETE)).toBe(false)
  })

  it("supports canAll and canAny correctly", () => {
    expect(
      canAll(regularUser, [
        AdminPermissionsPlatform.USERS_READ,
        AdminPermissionsPlatform.PROJECTS_READ,
      ])
    ).toBe(true)

    expect(
      canAll(regularUser, [
        AdminPermissionsPlatform.USERS_READ,
        AdminPermissionsPlatform.USERS_DELETE,
      ])
    ).toBe(false)

    expect(
      canAny(regularUser, [
        AdminPermissionsPlatform.USERS_DELETE,
        AdminPermissionsPlatform.PROJECTS_READ,
      ])
    ).toBe(true)

    expect(
      canAny(regularUser, [
        AdminPermissionsPlatform.USERS_DELETE,
        AdminPermissionsPlatform.INVOICES_DELETE,
      ])
    ).toBe(false)
  })
})
