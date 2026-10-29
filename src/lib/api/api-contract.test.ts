import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

const dir = path.join(process.cwd(), "src/lib/api")
const contract = readFileSync(path.join(process.cwd(), "docs/API_AUDIT_2026-10.md"), "utf8")
const named = (name: string) => new RegExp(`\\b${name}\\b`).test(contract)

describe("API contract (docs/API_AUDIT_2026-10.md) stays in step with the code", () => {
  it("names every exported API function, as an endpoint or in Appendix B", () => {
    const missing = readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
      .flatMap((f) => [...readFileSync(path.join(dir, f), "utf8").matchAll(/^export (?:async )?function ([A-Za-z0-9]+)/gm)].map((m) => `${f}: ${m[1]}`))
      .filter((entry) => !named(entry.split(": ")[1]!))
    expect(missing).toEqual([])
  })

  it("only names helpers that still exist", () => {
    const code = readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => readFileSync(path.join(dir, f), "utf8")).join("\n")
    const stale = [...new Set([...contract.matchAll(/`([a-z][A-Za-z0-9]*Api)`/g)].map((m) => m[1]!))].filter((n) => !new RegExp(`\\b${n}\\b`).test(code))
    expect(stale).toEqual([])
  })
})
