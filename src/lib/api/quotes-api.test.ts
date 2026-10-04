import { beforeEach, describe, expect, it } from "vitest"
import { QuoteStatus, FLAT_UNIT } from "@/types/work-quotes"
import { acceptQuoteApi, convertQuoteToInvoiceApi, createProjectFromQuoteApi, createQuoteApi, declineQuoteApi, deleteQuoteApi, duplicateQuoteApi, listQuotesApi, sendQuoteApi, updateQuoteApi } from "./quotes-api"
import { listClientInvoicesApi } from "./work-billing-api"
import { listProjectsApi } from "./work-projects-api"
import { invoiceTotals } from "@/lib/workforce/billing"
import { quoteTotals } from "@/lib/workforce/quotes"

const WS = "ws_atlas"
const input = {
  clientId: "cli_helio",
  currency: "EUR",
  issueDate: "2026-10-01",
  validUntil: "2026-10-31",
  deliveryDate: "2026-12-15",
  subject: "Website for the solar sites",
  taxRate: 20,
  discountRate: 10,
  lines: [
    { id: "a", description: "Design", quantity: 5, unit: "pages", unitPrice: 400 },
    { id: "b", description: "SEO", quantity: 1, unit: FLAT_UNIT, unitPrice: 300 },
  ],
}

describe("quotes API", () => {
  beforeEach(() => localStorage.clear())

  it("goes from draft to invoice and project", async () => {
    const draft = await createQuoteApi(WS, input)
    expect(draft).toMatchObject({ status: QuoteStatus.DRAFT, number: "" })

    const sent = await sendQuoteApi(WS, draft.id)
    expect(sent.number).toBe("DEV-2026-005") // the demo data already holds 001–004
    await expect(updateQuoteApi(WS, sent.id, input)).rejects.toThrow(/draft/)
    await expect(deleteQuoteApi(WS, sent.id)).rejects.toThrow(/draft/)
    await expect(convertQuoteToInvoiceApi(WS, sent.id)).rejects.toThrow(/accepted/)

    await acceptQuoteApi(WS, sent.id)
    const project = await createProjectFromQuoteApi(WS, sent.id, { code: "hel-03" })
    expect(project).toMatchObject({ code: "HEL-03", clientId: "cli_helio", budgetType: "fixed", budgetAmount: 2070, dueDate: "2026-12-15" })

    const invoice = await convertQuoteToInvoiceApi(WS, sent.id, "Remise")
    expect(invoice).toMatchObject({ status: "draft", quoteId: sent.id, subject: input.subject, clientId: "cli_helio" })
    expect(invoice.lines.every((l) => l.projectId === project.id)).toBe(true)
    expect(invoiceTotals(invoice).total).toBe(quoteTotals(input).total)
    await expect(convertQuoteToInvoiceApi(WS, sent.id)).rejects.toThrow(/already/)

    const after = (await listQuotesApi(WS)).find((q) => q.id === sent.id)!
    expect(after).toMatchObject({ invoiceId: invoice.id, projectId: project.id })
    expect((await listClientInvoicesApi(WS)).some((i) => i.id === invoice.id)).toBe(true)
    expect((await listProjectsApi(WS)).some((p) => p.id === project.id)).toBe(true)
  })

  it("needs a reason to decline and duplicates into a new draft", async () => {
    const sent = await sendQuoteApi(WS, (await createQuoteApi(WS, input)).id)
    await expect(declineQuoteApi(WS, sent.id, " ")).rejects.toThrow(/reason/)
    const declined = await declineQuoteApi(WS, sent.id, "Too expensive")
    expect(declined).toMatchObject({ status: QuoteStatus.DECLINED, declineReason: "Too expensive" })
    const copy = await duplicateQuoteApi(WS, declined.id)
    expect(copy).toMatchObject({ status: QuoteStatus.DRAFT, number: "", subject: input.subject })
    expect(copy.lines.map((l) => l.id)).not.toEqual(input.lines.map((l) => l.id))
  })

  it("refuses invalid quotes and only deletes drafts", async () => {
    await expect(createQuoteApi(WS, { ...input, clientId: "nope" })).rejects.toThrow(/Client/)
    await expect(createQuoteApi(WS, { ...input, validUntil: "2026-09-01" })).rejects.toThrow(/validity/)
    const draft = await createQuoteApi(WS, input)
    await deleteQuoteApi(WS, draft.id)
    expect((await listQuotesApi(WS)).some((q) => q.id === draft.id)).toBe(false)
  })
})
