import { describe, expect, it, vi } from "vitest"
vi.mock("./pdf-kit", async (orig) => ({ ...(await orig<typeof import("./pdf-kit")>()), loadLogo: async () => null }))
import { clean, companyLines, documentBrand, hexToRgb, legalLine, tint } from "./pdf-kit"
import { pdfLocale } from "./pdf-i18n"
import { buildClientInvoiceDocument } from "./generate-client-invoice-pdf"
import { ClientInvoiceStatus, InvoiceKind, PaymentMethod, type ClientInvoice } from "@/types/work-billing"

describe("PDF kit", () => {
  it("makes text safe for the built-in PDF fonts", () => {
    expect(clean("1 234,50 € − “ok” — a… →")).toBe('1 234,50 € - "ok" - a... ->')
  })
  it("reads brand colours and tints them", () => {
    expect(hexToRgb("#7c3aed")).toEqual([124, 58, 237])
    expect(hexToRgb("nope")).toEqual([38, 132, 255])
    // Old demo seed colours and a missing colour fall back to the ERP blue; a real choice is kept
    expect(documentBrand(undefined)).toEqual([38, 132, 255])
    expect(documentBrand("#2563EB")).toEqual([38, 132, 255])
    expect(documentBrand("#10b981")).toEqual([16, 185, 129])
    expect(tint([0, 0, 0], 0.5)).toEqual([128, 128, 128])
  })
  it("prints the company identity and legal line", () => {
    const company = { legalName: "Atlas SARL", address: "12 Bd d'Anfa", city: "Casablanca", country: "MA", ice: "002847192000084", taxId: "401", tradeRegister: "148291", shareCapital: "100 000 MAD", email: "a@b.ma" }
    expect(companyLines(company)).toEqual(["12 Bd d'Anfa, Casablanca, MA", "a@b.ma", "ICE 002847192000084  ·  IF 401  ·  RC 148291"])
    expect(legalLine(company, "x")).toContain("Capital 100 000 MAD")
  })
  it("writes PDFs in a language the fonts can draw", () => {
    expect(pdfLocale("fr")).toBe("fr")
    expect(pdfLocale("ar")).toBe("fr")
    expect(pdfLocale("zh")).toBe("en")
  })
})

describe("client invoice document", () => {
  const invoice: ClientInvoice = {
    id: "i1", workspaceId: "w", number: "INV-2026-001", clientId: "c1", currency: "EUR", issueDate: "2026-09-01", dueDate: "2026-10-01",
    status: ClientInvoiceStatus.ISSUED, taxRate: 20, withholdingRate: 0, createdAt: "", updatedAt: "",
    lines: [{ id: "l1", description: "Design", quantity: 10, unitPrice: 100, timeEntryIds: ["t1", "t2"] }],
    payments: [{ id: "p1", date: "2026-09-10", amount: 200, method: PaymentMethod.BANK_TRANSFER }],
  }
  const base = { workspace: { id: "w", name: "Atlas", currency: "EUR" } as never, locale: "en", company: { legalName: "Atlas", country: "MA", baseCurrency: "EUR", fiscalYearStartMonth: 1, weekStart: "monday" as const, timeZone: "UTC", invoiceNumberFormat: "{SEQ}", bankName: "Bank", bankAccount: "123" } }

  it("shows totals, the balance due and bank details", async () => {
    const doc = await buildClientInvoiceDocument({ ...base, invoice, balance: 1000 })
    expect(doc.title).toBe("Invoice")
    expect(doc.totals.find((r) => r.strong)?.value).toContain("1,200.00")
    expect(doc.due?.value).toContain("1,000.00")
    expect(doc.payment?.rows.map((r) => r[1])).toEqual(["Bank", "123", "INV-2026-001"])
    expect(doc.tables?.[0]?.rows).toHaveLength(1)
    expect(doc.stamp).toBeUndefined()
  })
  it("stamps drafts and credit notes have no amount due", async () => {
    expect((await buildClientInvoiceDocument({ ...base, invoice: { ...invoice, status: ClientInvoiceStatus.DRAFT, number: "" } })).stamp?.text).toBe("Draft")
    const credit = await buildClientInvoiceDocument({ ...base, invoice: { ...invoice, kind: InvoiceKind.CREDIT_NOTE, creditNoteFor: "i0" }, allInvoices: [{ ...invoice, id: "i0", number: "INV-2026-000" }] })
    expect(credit.title).toBe("Credit note")
    expect(credit.due).toBeUndefined()
    expect(credit.meta.some(([, v]) => v === "INV-2026-000")).toBe(true)
  })
})
