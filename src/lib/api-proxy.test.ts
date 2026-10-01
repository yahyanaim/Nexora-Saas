import { describe, it, expect } from "vitest"
import { buildApiProxyRewrites } from "./api-proxy"

describe("buildApiProxyRewrites", () => {
  it("is disabled when no target is set", () => {
    expect(buildApiProxyRewrites(undefined)).toEqual([])
    expect(buildApiProxyRewrites("")).toEqual([])
  })

  it("forwards /api/* to the target's /api/*", () => {
    expect(buildApiProxyRewrites("https://api.other.com")).toEqual([
      { source: "/api/:path*", destination: "https://api.other.com/api/:path*" },
    ])
  })

  it("keeps a base path and drops a trailing slash", () => {
    expect(buildApiProxyRewrites("https://other.com/backend/")[0]!.destination).toBe(
      "https://other.com/backend/api/:path*"
    )
  })

  it("rejects invalid targets", () => {
    expect(() => buildApiProxyRewrites("api.other.com")).toThrow(/absolute URL/)
    expect(() => buildApiProxyRewrites("ftp://other.com")).toThrow(/http\(s\)/)
  })
})
