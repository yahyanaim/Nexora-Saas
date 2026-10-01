import { describe, it, expect } from "vitest"
import { spawnSync } from "node:child_process"
import path from "node:path"

const script = path.resolve(process.cwd(), "scripts/prebuild.js")

function runGuard(env: Record<string, string>) {
  const clean = { ...process.env }
  delete clean.NEXT_PUBLIC_DEMO_MODE
  delete clean.NEXT_PUBLIC_ALLOW_DEMO_BUILD
  delete clean.VERCEL_ENV
  return spawnSync(process.execPath, [script], {
    env: { ...clean, ...env },
    encoding: "utf8",
  })
}

describe("scripts/prebuild.js demo-mode guard", () => {
  it("fails a production build with demo mode on", () => {
    const res = runGuard({ NODE_ENV: "production", NEXT_PUBLIC_DEMO_MODE: "true" })
    expect(res.status).not.toBe(0)
    expect(res.stderr).toContain("SECURITY VIOLATION")
  })

  it("fails on Vercel production even without NODE_ENV", () => {
    const res = runGuard({ NODE_ENV: "", VERCEL_ENV: "production", NEXT_PUBLIC_DEMO_MODE: "true" })
    expect(res.status).not.toBe(0)
  })

  it("allows an intentional demo build with NEXT_PUBLIC_ALLOW_DEMO_BUILD", () => {
    const res = runGuard({
      NODE_ENV: "production",
      NEXT_PUBLIC_DEMO_MODE: "true",
      NEXT_PUBLIC_ALLOW_DEMO_BUILD: "true",
    })
    expect(res.status).toBe(0)
  })

  it("allows demo mode in development and normal production builds", () => {
    expect(runGuard({ NODE_ENV: "development", NEXT_PUBLIC_DEMO_MODE: "true" }).status).toBe(0)
    expect(runGuard({ NODE_ENV: "production", NEXT_PUBLIC_DEMO_MODE: "false" }).status).toBe(0)
  })
})
