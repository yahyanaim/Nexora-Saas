import { describe, expect, it } from "vitest"
import { realmOf, realmPath, workspacePath } from "./realm"

describe("realm paths (API contract §2)", () => {
  it("puts company paths under /app/v1", () => {
    expect(realmPath("/auth/login")).toBe("/app/v1/auth/login")
    expect(realmPath("/me/workspaces")).toBe("/app/v1/me/workspaces")
    expect(realmPath("auth/me")).toBe("/app/v1/auth/me")
    expect(realmPath("/workspaces/ws_1/members?page=2")).toBe("/app/v1/workspaces/ws_1/members?page=2")
  })

  it("puts portal and console paths under their own realm", () => {
    expect(realmPath("/portal/auth/link")).toBe("/portal/v1/auth/link")
    expect(realmPath("/platform/auth/login")).toBe("/platform/v1/auth/login")
    expect(realmPath("/platform")).toBe("/platform/v1")
    expect(realmOf("/portals")).toBe("app") // only the exact segment counts
  })

  it("adds the prefix once, so a replayed request keeps its path", () => {
    expect(realmPath(realmPath("/auth/refresh"))).toBe("/app/v1/auth/refresh")
    expect(realmPath("/platform/v1/staff")).toBe("/platform/v1/staff")
    expect(realmPath("https://cdn.example.com/x")).toBe("https://cdn.example.com/x")
  })

  it("writes workspace record paths", () => {
    expect(workspacePath("0190a7f2-0000-7000-8000-000000000001", "/members")).toBe("/workspaces/0190a7f2-0000-7000-8000-000000000001/members")
    expect(workspacePath("a/b", "roles")).toBe("/workspaces/a%2Fb/roles")
  })
})
