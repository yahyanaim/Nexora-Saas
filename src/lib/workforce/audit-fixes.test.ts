import { describe, it, expect, vi, afterEach } from "vitest"
import { roundMoney, sumMoney, toCents } from "./money"
import { invoiceTotals } from "./billing"
import { createCollection, STORAGE_FULL } from "./demo-store"
import { errorKey, translateError } from "@/lib/errors/translate-error"
import { ERROR_KEYS } from "@/lib/errors/error-catalog"
import en from "@/messages/en.json"

describe("money (H1)", () => {
  it("rounds half away from zero without floating point drift", () => {
    expect(roundMoney(1.005)).toBe(1.01)
    expect(roundMoney(-1.005)).toBe(-1.01)
    expect(roundMoney(1234.565)).toBe(1234.57)
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
    expect(roundMoney(-0.004)).toBe(0)
    expect(sumMoney([0.1, 0.2, 0.3])).toBe(0.6)
    expect(toCents(19.995)).toBe(2000)
  })
  it("gives the cent a VAT return expects", () => {
    // 3 × 33.50 at 20% VAT: 100.50 + 20.10
    const t = invoiceTotals({ lines: [{ id: "l", description: "x", quantity: 3, unitPrice: 33.5 }], taxRate: 20 } as never)
    expect(t.subtotal).toBe(100.5)
    expect(t.tax).toBe(20.1)
    expect(t.total).toBe(120.6)
  })
})

describe("save errors (H4)", () => {
  afterEach(() => vi.restoreAllMocks())
  it("reports a change the browser refused to store", () => {
    const col = createCollection<{ id: string; workspaceId: string; createdAt: string; updatedAt: string; name: string }>("h4", "h4", () => [])
    col.list("ws")
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })
    expect(() => col.create("ws", { name: "x" })).toThrow(STORAGE_FULL)
  })
})

describe("translated errors (M1)", () => {
  it("maps every catalogued message to an existing translation", () => {
    const keys = en as Record<string, string>
    for (const key of Object.values(ERROR_KEYS)) expect(keys[key], key).toBeTruthy()
  })
  it("extracts values from messages with numbers", () => {
    expect(errorKey("Only 2 day(s) left in 2026; this request needs 5")).toEqual({ key: "err_leaveBalance", values: { left: "2", year: "2026", need: "5" } })
    const t = Object.assign((k: string) => `T:${k}`, { has: (k: string) => k === "err_storageFull" })
    expect(translateError(new Error(STORAGE_FULL), t)).toBe("T:err_storageFull")
    expect(translateError(new Error("Unlisted"), t)).toBe("Unlisted")
    expect(translateError(null, t)).toBe("T:somethingWentWrong")
  })
})

describe("error catalog stays complete", () => {
  it("lists every fixed message the business rules throw", async () => {
    const fs = await import("node:fs")
    const path = await import("node:path")
    const platform = ["files-api", "transactions-api", "users-apis", "roles-apis", "invoices-api", "billing-apis", "upload-apis", "auth-apis", "subscriptions-api", "plans-apis", "team-apis", "gdpr-apis", "developer-apis", "sessions-apis", "profile-api", "overview-apis", "reports-apis", "usage-metering", "audit-logs-api", "workspace-subscription-api"]
    const dirs = ["src/lib/workforce", "src/lib/api"]
    const missing: string[] = []
    for (const dir of dirs) {
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith(".ts") || file.endsWith(".test.ts") || platform.some((p) => file.startsWith(p))) continue
        const src = fs.readFileSync(path.join(dir, file), "utf8")
        for (const m of src.matchAll(/throw new Error\("([^"]+)"\)/g)) if (!ERROR_KEYS[m[1]!]) missing.push(`${file}: ${m[1]}`)
      }
    }
    expect(missing).toEqual([])
  })
})

describe("company time zone (M2)", () => {
  it("dates 'today' in the company's zone, not the browser's", async () => {
    const { todayIso } = await import("./project-metrics")
    const lateNightUtc = new Date("2026-10-06T23:30:00Z")
    expect(todayIso(lateNightUtc, "Africa/Casablanca")).toBe("2026-10-07")
    expect(todayIso(lateNightUtc, "America/New_York")).toBe("2026-10-06")
  })
})
