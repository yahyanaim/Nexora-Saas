import { beforeEach, describe, expect, it } from "vitest"
import { createTranslator } from "next-intl"
import { EMAIL_TEMPLATES, announcementFor, flagOn } from "./config-rules"
import {
  announcementsForWorkspace,
  createAnnouncementApi,
  flagOnForWorkspaceApi,
  getIdentityApi,
  resetDemoWorkspaceApi,
  updateFlagApi,
  updateIdentityApi,
} from "@/lib/api/platform-config-api"
import { listInvoicesApi, startSubscriptionApi } from "@/lib/api/platform-billing-api"
import { listAuditApi, type ConsoleActor } from "@/lib/api/platform-console-api"
import { routing } from "@/i18n/routing"
import { ConsoleRole as R } from "@/types/platform-console"

const sophia: ConsoleActor = { id: "stf_sophia", name: "Sophia Vance", role: R.OWNER }
const admin: ConsoleActor = { id: "stf_imane", name: "Imane", role: R.ADMIN }
const liam: ConsoleActor = { id: "stf_liam", name: "Liam O'Connor", role: R.SUPPORT }

describe("configuration rules", () => {
  it("targets announcements by plan, country and dates (CFG-01)", () => {
    const a = { plans: ["business" as const], countries: ["MA"], from: "2026-10-01", to: "2026-10-10" }
    expect(announcementFor(a, { plan: "business", country: "MA" }, "2026-10-05")).toBe(true)
    expect(announcementFor(a, { plan: "starter", country: "MA" }, "2026-10-05")).toBe(false)
    expect(announcementFor(a, { plan: "business", country: "FR" }, "2026-10-05")).toBe(false)
    expect(announcementFor(a, { plan: "business", country: "MA" }, "2026-10-11")).toBe(false)
    expect(announcementFor({ ...a, endedAt: "x" }, { plan: "business", country: "MA" }, "2026-10-05")).toBe(false)
  })

  it("turns a flag on for everyone, for plans or for named customers (CFG-02)", () => {
    const c = { id: "cus_n", plan: "starter" as const }
    expect(flagOn({ enabled: true, plans: [], customerIds: [] }, c)).toBe(true)
    expect(flagOn({ enabled: true, plans: ["business"], customerIds: [] }, c)).toBe(false)
    expect(flagOn({ enabled: true, plans: ["business"], customerIds: ["cus_n"] }, c)).toBe(true)
    expect(flagOn({ enabled: false, plans: [], customerIds: [] }, c)).toBe(false)
  })

  it("renders every e-mail template in each of the nine languages (CFG-03)", async () => {
    for (const locale of routing.locales) {
      const messages = (await import(`@/messages/${locale}.json`)).default as Record<string, string>
      const t = createTranslator({ locale, messages }) as unknown as (k: string, v?: Record<string, string | number>) => string
      for (const tpl of EMAIL_TEMPLATES) {
        for (const part of ["subject", "body"]) {
          const key = `etpl_${tpl.id}_${part}`
          expect(messages[key], `${locale} ${key}`).toBeTruthy()
          const text = t(key, tpl.sample as Record<string, string | number>)
          expect(text).not.toMatch(/[{}]/)
        }
      }
    }
  })
})

describe("configuration", () => {
  beforeEach(() => localStorage.clear())

  it("lets only an owner change the identity, and only new invoices use it (CFG-04, CFG-06)", async () => {
    const before = await getIdentityApi()
    await expect(updateIdentityApi(admin, { ...before, legalName: "X" })).rejects.toThrow(/does not allow/)
    await expect(updateIdentityApi(sophia, { ...before, rib: "123" })).rejects.toThrow(/24 digits/)
    const old = (await listInvoicesApi())[0]!
    await updateIdentityApi(sophia, { ...before, legalName: "Nexora Technologies SA", rib: "0077 8000 0123 4567 8901 9999" })
    expect((await getIdentityApi()).rib).toBe("007780000123456789019999")
    await startSubscriptionApi(sophia, "cus_lyon", { plan: "business", billing: "monthly", method: "card" })
    const all = await listInvoicesApi()
    expect(all.find((i) => i.customerId === "cus_lyon")?.seller?.legalName).toBe("Nexora Technologies SA")
    expect(all.find((i) => i.id === old.id)?.seller?.legalName).toBe(before.legalName)
    expect((await listAuditApi()).some((e) => e.action === "config.identity_changed" && e.after?.includes("Nexora Technologies SA"))).toBe(true)
  })

  it("shows announcements in targeted workspaces only (CFG-01)", async () => {
    // seeded: business and enterprise in Morocco → Atlas (business, MA) yes, Northwind (starter, US) no
    expect(announcementsForWorkspace("ws_atlas").map((a) => a.id)).toContain("ann_1")
    expect(announcementsForWorkspace("ws_northwind").map((a) => a.id)).not.toContain("ann_1")
    const today = new Date().toISOString().slice(0, 10)
    await expect(createAnnouncementApi(liam, { title: "Hi", message: "Hello everyone there", plans: [], countries: [], from: today, to: today })).rejects.toThrow(/does not allow/)
    const a = await createAnnouncementApi(admin, { title: "US customers", message: "New US tax fields are available.", plans: [], countries: ["US"], from: today, to: today })
    expect(announcementsForWorkspace("ws_northwind").map((x) => x.id)).toContain(a.id)
    expect(announcementsForWorkspace("ws_atlas").map((x) => x.id)).not.toContain(a.id)
  })

  it("changes a flag for the targeted customer only, and resets a demo workspace (CFG-02, CFG-05)", async () => {
    expect(await flagOnForWorkspaceApi("victor_assistant", "ws_atlas")).toBe(true)
    expect(await flagOnForWorkspaceApi("victor_assistant", "ws_northwind")).toBe(false)
    await updateFlagApi(admin, "victor_assistant", { enabled: true, plans: ["business", "enterprise"], customerIds: ["cus_northwind"] })
    expect(await flagOnForWorkspaceApi("victor_assistant", "ws_northwind")).toBe(true)
    localStorage.setItem("nexora:clients:ws_northwind", "[]")
    expect(await resetDemoWorkspaceApi(admin, "cus_northwind")).toBeGreaterThan(0)
    expect(localStorage.getItem("nexora:clients:ws_northwind")).toBeNull()
    const actions = (await listAuditApi()).map((e) => e.action)
    expect(actions).toEqual(expect.arrayContaining(["config.flag_changed", "config.demo_reset"]))
  })
})
