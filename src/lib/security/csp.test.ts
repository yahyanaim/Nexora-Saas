import { describe, it, expect } from "vitest"
import { buildCsp, createNonce } from "./csp"

const directive = (csp: string, name: string) =>
  csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? ""

describe("buildCsp", () => {
  const prod = buildCsp({
    nonce: "abc123",
    isDev: false,
    apiUrl: "https://api.nexora.io/api",
    socketUrl: "https://rt.nexora.io",
  })

  it("allows scripts only via nonce in production", () => {
    const scripts = directive(prod, "script-src")
    expect(scripts).toContain("'nonce-abc123'")
    expect(scripts).toContain("'strict-dynamic'")
    expect(scripts).not.toContain("'unsafe-eval'")
    expect(scripts).not.toContain("'unsafe-inline'")
  })

  it("limits connect-src to self, API and socket origins", () => {
    expect(directive(prod, "connect-src")).toBe(
      "connect-src 'self' https://api.nexora.io wss://api.nexora.io https://rt.nexora.io wss://rt.nexora.io"
    )
  })

  it("does not ship localhost sources to production", () => {
    expect(prod).not.toContain("localhost")
    expect(prod).toContain("upgrade-insecure-requests")
  })

  it("allows eval and localhost in development", () => {
    const dev = buildCsp({ nonce: "n", isDev: true, apiUrl: "http://localhost:40001/api" })
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'")
    expect(directive(dev, "connect-src")).toContain("ws://localhost:*")
    expect(dev).not.toContain("upgrade-insecure-requests")
  })

  it("ignores invalid URLs", () => {
    const csp = buildCsp({ nonce: "n", isDev: false, apiUrl: "not a url" })
    expect(directive(csp, "connect-src")).toBe("connect-src 'self'")
  })
})

describe("createNonce", () => {
  it("returns distinct base64 values", () => {
    const a = createNonce()
    const b = createNonce()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })
})
