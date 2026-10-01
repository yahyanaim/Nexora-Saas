import { describe, it, expect } from "vitest"
import { getSafeNextPath, isUnderPath, resolveAfterLoginPath } from "./safe-redirect"

describe("isUnderPath", () => {
  it("matches the segment and nested paths only", () => {
    expect(isUnderPath("/auth", "/auth")).toBe(true)
    expect(isUnderPath("/auth/reset", "/auth")).toBe(true)
    expect(isUnderPath("/dashboard/authors", "/auth")).toBe(false)
    expect(isUnderPath("/authentication", "/auth")).toBe(false)
    expect(isUnderPath(undefined, "/auth")).toBe(false)
  })
})

describe("getSafeNextPath", () => {
  it("accepts relative app paths with query and hash", () => {
    expect(getSafeNextPath("/dashboard/users?page=2#top")).toBe("/dashboard/users?page=2#top")
  })

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "dashboard",
    "/\tevil",
    "/auth",
    "/auth/reset-password",
    "",
    null,
  ])("rejects %s", (value) => {
    expect(getSafeNextPath(value)).toBeNull()
  })
})

describe("resolveAfterLoginPath", () => {
  it("uses a safe next param", () => {
    expect(resolveAfterLoginPath("?next=%2Fdashboard%2Finvoices")).toBe("/dashboard/invoices")
  })

  it("falls back to the overview for missing or unsafe values", () => {
    expect(resolveAfterLoginPath("")).toBe("/dashboard/overview")
    expect(resolveAfterLoginPath("?next=https%3A%2F%2Fevil.com")).toBe("/dashboard/overview")
  })
})
