import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
vi.mock("./pdf-kit", async (orig) => ({ ...(await orig<typeof import("./pdf-kit")>()), loadLogo: async () => null }))
import { buildClassicInvoice, buildClientInvoiceDocument } from "./generate-client-invoice-pdf"
import { buildClassicQuote, buildModernQuote } from "./generate-quote-pdf"
import { buildNxCreditNoteDocument, buildNxInvoiceDocument, buildNxProFormaDocument } from "./nexora-invoice-pdf"
import { buildSubscriptionInvoiceDocument } from "./generate-invoice-pdf"
import { ClientInvoiceStatus, InvoiceKind, PaymentMethod, type ClientInvoice } from "@/types/work-billing"
import { QuoteStatus, type Quote } from "@/types/work-quotes"

/*
 * One snapshot per document type (A4.5): what each PDF prints (title, parties,
 * lines, totals, bank details, stamps), built from fixed data. The PDF file
 * itself carries a creation date, so the printed content is what is compared.
 * A changed snapshot means a changed document: check it before updating.
 */

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-29T09:00:00Z"))
})
afterAll(() => vi.useRealTimers())

const workspace = { id: "ws", name: "Atlas Consulting", currency: "MAD" } as never
const company = {
  legalName: "Atlas Consulting SARL", address: "12 Bd d'Anfa", city: "Casablanca", country: "MA", baseCurrency: "MAD", ice: "002847192000084", taxId: "40128473", tradeRegister: "148291",
  fiscalYearStartMonth: 1, weekStart: "monday" as const, timeZone: "Africa/Casablanca", invoiceNumberFormat: "FAC-{YYYY}-{SEQ}", bankName: "Attijariwafa", bankAccount: "007 780 0001234567890123 45", email: "billing@atlas.example",
} as never
const client = { id: "cli_orbit", workspaceId: "ws", name: "Orbit Logistics", legalName: "Orbit Logistics SA", email: "ap@orbit.example", ice: "001523874000062", address: "Technopark, Casablanca", country: "MA", status: "active", paymentTermsDays: 30, contacts: [], createdAt: "", updatedAt: "" } as never
const invoice: ClientInvoice = {
  id: "inv1", workspaceId: "ws", number: "FAC-2026-014", clientId: "cli_orbit", currency: "MAD", issueDate: "2026-10-01", dueDate: "2026-10-31",
  status: ClientInvoiceStatus.ISSUED, taxRate: 20, withholdingRate: 0, createdAt: "", updatedAt: "",
  lines: [{ id: "l1", description: "Mobile app development", quantity: 40, unitPrice: 650, timeEntryIds: ["t1", "t2"] }, { id: "l2", description: "Hosting setup", quantity: 1, unitPrice: 2500, taxRate: 0, timeEntryIds: [] }],
  payments: [{ id: "p1", date: "2026-10-10", amount: 10000, method: PaymentMethod.BANK_TRANSFER }],
}
const quote: Quote = {
  id: "q1", workspaceId: "ws", number: "DEV-2026-007", clientId: "cli_orbit", currency: "MAD", issueDate: "2026-10-01", validUntil: "2026-10-31", subject: "Warehouse app audit",
  lines: [{ id: "ql1", description: "Audit days", quantity: 5, unit: "days", unitPrice: 6000 }], taxRate: 20, discountRate: 5, status: QuoteStatus.SENT, createdAt: "", updatedAt: "",
} as Quote
const seller = { legalName: "Nexora SAS", address: "Casablanca Finance City", city: "Casablanca", country: "MA", ice: "003000000000001", taxId: "5000001", rc: "500001", patente: "1", cnss: "1", bankName: "CIH", rib: "230 780 0000000000000000 11", swift: "CIHMMAMC" }
const nxLines = [{ label: "Business plan · 12 seats · October 2026", quantity: 12, unitPrice: 290, vatRate: 20 }] as never
const customer = { id: "cus_atlas", name: "Atlas Consulting", legalName: "Atlas Consulting SARL", ice: "002847192000084", address: "12 Bd d'Anfa", city: "Casablanca", country: "MA", admin: { name: "Omar Tazi", email: "omar@atlas.example" } } as never

// Images are not part of what is compared
const content = <T extends object>(doc: T) => JSON.parse(JSON.stringify(doc, (key, value) => (key === "logo" ? undefined : value)))

describe("document snapshots", () => {
  it("client invoice (modern)", async () => {
    expect(content(await buildClientInvoiceDocument({ invoice, client, workspace, company, locale: "fr", balance: 22200 }))).toMatchSnapshot()
  })
  it("client invoice (classic)", async () => {
    expect(content(await buildClassicInvoice({ invoice, client, workspace, company, locale: "fr" }))).toMatchSnapshot()
  })
  it("credit note", async () => {
    const credit = { ...invoice, id: "cn1", number: "AV-2026-002", kind: InvoiceKind.CREDIT_NOTE, creditNoteFor: "inv1", lines: [invoice.lines[1]!], payments: [] }
    expect(content(await buildClientInvoiceDocument({ invoice: credit, allInvoices: [invoice, credit], client, workspace, company, locale: "fr" }))).toMatchSnapshot()
  })
  it("draft invoice is stamped", async () => {
    const doc = await buildClientInvoiceDocument({ invoice: { ...invoice, number: "", status: ClientInvoiceStatus.DRAFT, payments: [] }, client, workspace, company, locale: "en" })
    expect(content(doc)).toMatchSnapshot()
  })
  it("quote (classic and modern)", async () => {
    expect(content(await buildClassicQuote({ quote, client, workspace, company, locale: "fr" }))).toMatchSnapshot()
    expect(content(await buildModernQuote({ quote, client, workspace, company, locale: "en" }))).toMatchSnapshot()
  })
  it("Nexora subscription invoice, credit note and pro-forma", async () => {
    const nx = { id: "nx1", workspaceId: "platform", number: "NX-2026-0101", customerId: "cus_atlas", customerName: "Atlas Consulting", customerIce: "002847192000084", kind: "subscription", date: "2026-10-01", dueDate: "2026-10-15", periodFrom: "2026-10-01", periodTo: "2026-10-31", lines: nxLines, subtotal: 3480, vat: 696, total: 4176, paid: 0, credited: 0, status: "open", einvoice: "sent", seller, createdAt: "", updatedAt: "" } as never
    expect(content(await buildNxInvoiceDocument(nx, { customer, seller, locale: "fr", payments: [] }))).toMatchSnapshot()
    const note = { id: "nc1", workspaceId: "platform", number: "NC-2026-0003", invoiceId: "nx1", invoiceNumber: "NX-2026-0101", customerId: "cus_atlas", customerName: "Atlas Consulting", date: "2026-10-20", reason: "Two seats removed", subtotal: 580, vat: 116, total: 696, createdBy: "Sophia", createdAt: "", updatedAt: "" } as never
    expect(content(await buildNxCreditNoteDocument(note, { customer, seller, locale: "fr", invoice: nx }))).toMatchSnapshot()
    const pf = { id: "pf1", workspaceId: "platform", number: "PF-2026-0004", customerId: "cus_atlas", customerName: "Atlas Consulting", plan: "business", billing: "yearly", date: "2026-10-29", validUntil: "2026-11-28", periodFrom: "2026-11-01", periodTo: "2027-10-31", lines: nxLines, subtotal: 3480, vat: 696, total: 4176, createdBy: "Sophia", seller, createdAt: "", updatedAt: "" } as never
    expect(content(await buildNxProFormaDocument(pf, { customer, seller, locale: "en" }))).toMatchSnapshot()
  })
  it("subscription invoice (company's own plan)", async () => {
    const inv = { id: "s1", invoiceNumber: "INV-2026-0042", user: { id: "u1", name: "Omar Tazi", email: "omar@atlas.example" }, items: [{ id: "i1", description: "Business plan", quantity: 1, unitPrice: 3480, total: 3480 }], subtotal: 3480, tax: 696, taxRate: 20, total: 4176, status: "paid", method: "card", date: "2026-10-01", paidAt: "2026-10-01", createdAt: "" } as never
    expect(content(await buildSubscriptionInvoiceDocument(inv, "en"))).toMatchSnapshot()
  })
})
