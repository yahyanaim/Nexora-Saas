import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import messages from "@/messages/en.json"
import { InvoiceSheet } from "./invoice-sheet"
import { listClientInvoicesApi } from "@/lib/api/work-billing-api"
import { ClientInvoiceStatus, InvoiceKind, type ClientInvoice } from "@/types/work-billing"

vi.mock("@/hooks/workforce/use-work-projects", () => ({ useProjects: () => ({ data: [] }) }))
vi.mock("@/hooks/workforce/use-quotes", () => ({ useQuotes: () => ({ data: [] }) }))
vi.mock("@/store/workspace-store", () => ({ useCurrentWorkspace: () => ({ id: "ws_atlas", name: "Atlas", currency: "MAD" }) }))

let issued: ClientInvoice
beforeAll(async () => {
  localStorage.clear()
  const all = await listClientInvoicesApi("ws_atlas")
  issued = all.find((i) => i.kind !== InvoiceKind.CREDIT_NOTE && (i.status === ClientInvoiceStatus.ISSUED || i.status === ClientInvoiceStatus.SENT) && i.lines.length > 0)!
})

function renderSheet(invoice: ClientInvoice) {
  const handlers = { onSaveDraft: vi.fn(), onIssue: vi.fn(), onSend: vi.fn(), onPayment: vi.fn(), onVoid: vi.fn(), onDelete: vi.fn(), onCreditNote: vi.fn(), onOpenInvoice: vi.fn(), onOpenChange: vi.fn() }
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <InvoiceSheet invoice={invoice} allInvoices={[invoice]} canEdit busy={false} {...handlers} />
    </NextIntlClientProvider>
  )
  return handlers
}

describe("invoice sheet: the money actions (A4.5)", () => {
  it("issues a draft", () => {
    const draft = { ...issued, id: "inv_draft", number: "", status: ClientInvoiceStatus.DRAFT, payments: [] }
    const h = renderSheet(draft)
    fireEvent.click(screen.getByRole("button", { name: messages.issueInvoice }))
    expect(h.onIssue).toHaveBeenCalledWith("inv_draft")
    expect(h.onSend).not.toHaveBeenCalled()
  })

  it("records a payment with the amount, method and reference typed", () => {
    const open = { ...issued, payments: [] }
    const h = renderSheet(open)
    const form = screen.getAllByText(messages.recordPayment)[0]!.closest("form")!
    const pay = within(form).getByRole("button", { name: messages.recordPayment })
    expect(pay).toBeDisabled()
    fireEvent.change(within(form).getByLabelText(messages.amount), { target: { value: "1200" } })
    fireEvent.change(within(form).getByLabelText(messages.bankReference), { target: { value: "VIR-42" } })
    fireEvent.click(pay)
    expect(h.onPayment).toHaveBeenCalledWith(open.id, expect.objectContaining({ amount: 1200, reference: "VIR-42", method: "bank_transfer" }))
  })

  it("creates a credit note for the lines picked, with the reason", () => {
    const h = renderSheet({ ...issued, payments: [] })
    fireEvent.click(screen.getByRole("button", { name: messages.creditNote }))
    const dialog = screen.getByRole("dialog", { name: messages.creditNote })
    fireEvent.change(within(dialog).getByLabelText(messages.reason), { target: { value: "Wrong rate" } })
    fireEvent.click(within(dialog).getByRole("button", { name: messages.issueCreditNote }))
    expect(h.onCreditNote).toHaveBeenCalledWith(issued.id, expect.objectContaining({ reason: "Wrong rate", lineIds: expect.arrayContaining([issued.lines[0]!.id]) }))
  })
})
