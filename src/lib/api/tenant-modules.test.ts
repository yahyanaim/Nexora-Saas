import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

const dir = path.join(process.cwd(), "src/lib/api")
const listed = readFileSync(path.join(dir, "tenant-modules.ts"), "utf8")

describe("tenant export modules (AUD-04)", () => {
  it("lists every module that stores a company's records", () => {
    const stores = readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "tenant-modules.ts")
      .filter((f) => /createCollection</.test(readFileSync(path.join(dir, f), "utf8")))
      .map((f) => f.replace(/\.ts$/, ""))
    // The Nexora console's own records are not part of a company's data
    const missing = stores.filter((m) => !m.startsWith("platform-") && !listed.includes(`import("./${m}")`))
    expect(missing).toEqual([])
  })
})
