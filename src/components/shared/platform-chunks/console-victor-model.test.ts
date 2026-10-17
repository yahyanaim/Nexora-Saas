import { beforeEach, describe, expect, it } from "vitest"
import { createTranslator } from "next-intl"
import messages from "@/messages/en.json"
import { attentionList, homeFigures, revenueBy } from "./console-home-model"
import { consoleTopicOf, consoleVictorAnswer, type VictorInput } from "./console-victor-model"
import { listInvoicesApi } from "@/lib/api/platform-billing-api"
import { listCustomersApi } from "@/lib/api/platform-customers-api"
import type { CustomerAccount } from "@/types/platform-customers"
import type { SupportRequest } from "@/types/platform-support"

beforeEach(() => localStorage.clear())
const t = createTranslator({ locale: "en", messages }) as unknown as (k: string, v?: Record<string, string | number>) => string
const today = new Date().toISOString().slice(0, 10)
const money = (n: number) => `MAD ${Math.round(n)}`
const pct = (v: number | null, d = 1) => (v === null ? "—" : `${(v * 100).toFixed(d)}%`)

async function input(compare: "previous" | "none" = "previous", attention = true): Promise<VictorInput> {
  const [invoices, accounts] = await Promise.all([listInvoicesApi(), listCustomersApi()])
  const f = homeFigures(invoices, accounts, today, 12, compare)
  return {
    f,
    attention: attention ? attentionList(accounts, [], today) : [],
    byPlan: revenueBy(accounts, "plan").map((g) => ({ ...g, label: g.key })),
    byCountry: revenueBy(accounts, "country").map((g) => ({ ...g, label: g.key })),
    money,
    pct,
    signedPct: (v) => (v === null ? "—" : `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}%`),
    month: (m) => m,
    compareLabel: compare === "none" ? null : "vs previous period",
  }
}

describe("what a question is about", () => {
  it("is read from common words in several languages", () => {
    expect(consoleTopicOf("What needs the team today?")).toBe("today")
    expect(consoleTopicOf("Qui nous doit de l'argent ? impayés")).toBe("owed")
    expect(consoleTopicOf("Who owes us money?")).toBe("owed")
    expect(consoleTopicOf("¿Cuántas pruebas se convierten?")).toBe("trials")
    expect(consoleTopicOf("Wie hoch ist die Abwanderung? churn")).toBe("churn")
    expect(consoleTopicOf("ما هي أفضل باقة؟")).toBe("mix")
    expect(consoleTopicOf("How is recurring revenue doing?")).toBe("mrr")
    expect(consoleTopicOf("hello")).toBe("summary")
  })
})

describe("Victor's answers on the console home", () => {
  it("use the home's own figures, never another calculation", async () => {
    const x = await input()
    expect(consoleVictorAnswer("mrr", x, t)).toContain(money(x.f.mrr))
    expect(consoleVictorAnswer("mrr", x, t)).toContain(money(x.f.arr))
    expect(consoleVictorAnswer("owed", x, t)).toContain(money(x.f.owed))
    expect(consoleVictorAnswer("trials", x, t)).toContain(pct(x.f.trials.rate, 0))
    expect(consoleVictorAnswer("churn", x, t)).toContain(pct(x.f.churn))
    const summary = consoleVictorAnswer("summary", x, t)
    for (const part of [money(x.f.mrr), money(x.f.owed), pct(x.f.trials.rate, 0)]) expect(summary).toContain(part)
  })

  it("name the comparison only when one is chosen", async () => {
    const withRef = await input("previous")
    expect(consoleVictorAnswer("mrr", withRef, t)).toContain(`against ${withRef.f.reference!.month}`)
    const none = await input("none")
    expect(consoleVictorAnswer("mrr", none, t)).not.toContain("against")
  })

  it("list what needs the team today, or say nothing does", async () => {
    const acc = (id: string, patch: Partial<CustomerAccount>) => ({ id, name: id, status: "active", ...patch }) as CustomerAccount
    const req = { id: "r1", number: "SR-1", customerName: "Atlas", subject: "Export stops", priority: "urgent", status: "open", createdAt: "2026-10-01T00:00:00Z" } as SupportRequest
    const x = { ...(await input()), attention: attentionList([acc("Late SARL", { status: "payment_overdue" })], [req], today) }
    const answer = consoleVictorAnswer("today", x, t)
    expect(answer).toContain("2 things need the team today")
    expect(consoleVictorAnswer("owed", x, t)).toMatch(/on \d+ invoices?\./)
    expect(answer).toContain("Late SARL: Payment overdue")
    expect(answer).toContain("SR-1")
    expect(consoleVictorAnswer("today", await input("previous", false), t)).toMatch(/^Nothing needs the team today/)
    // singular and plural are written properly
    const one = { ...x, attention: x.attention.slice(0, 1), f: { ...x.f, overdueInvoices: 1 } }
    expect(consoleVictorAnswer("today", one, t)).toMatch(/^One thing needs the team today/)
    expect(consoleVictorAnswer("owed", one, t)).toContain("on 1 invoice.")
  })

  it("name the plan and country bringing the most", async () => {
    const x = await input()
    const answer = consoleVictorAnswer("mix", x, t)
    expect(answer).toContain(`${x.byPlan[0]!.label} brings the most recurring revenue: ${money(x.byPlan[0]!.mrr)}`)
    expect(answer).toContain(`${x.byCountry[0]!.label} leads`)
    expect(consoleVictorAnswer("mix", { ...x, byPlan: [], byCountry: [] }, t)).toBe("No recurring revenue yet.")
  })
})
