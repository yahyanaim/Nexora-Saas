import { describe, expect, it } from "vitest"
import { isWebUrl, safeHref } from "./url"

describe("web addresses (A2.1)", () => {
  it("accepts http and https only", () => {
    expect(isWebUrl("https://www.linkedin.com/in/claire")).toBe(true)
    expect(isWebUrl(" http://example.com ")).toBe(true)
    for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<b>x</b>", "vbscript:x", "www.example.com", "//evil.example", "https://", ""]) {
      expect(isWebUrl(bad)).toBe(false)
    }
  })

  it("gives an href only for a web address", () => {
    expect(safeHref(" https://example.com ")).toBe("https://example.com")
    expect(safeHref("javascript:alert(1)")).toBeUndefined()
    expect(safeHref(undefined)).toBeUndefined()
    expect(safeHref(null)).toBeUndefined()
  })
})
