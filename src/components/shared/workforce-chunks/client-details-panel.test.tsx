import { describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import messages from "@/messages/en.json"
import { ClientDetailsPanel } from "./client-details-panel"
import { ClientStatus, type Client } from "@/types/workforce"
import type { ClientFigures } from "@/lib/workforce/client-figures"

const addNote = vi.fn((_input: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.())
const saveFollowUp = vi.fn()
vi.mock("@/hooks/workforce/use-crm", () => ({
  useCrmMutations: () => ({ addNote: { mutate: addNote, isPending: false } }),
  useFollowUpMutations: () => ({ save: { mutate: saveFollowUp, isPending: false } }),
}))
// the planning dialog reads clients, people and deals: replaced by a marker here
vi.mock("./follow-up-dialog", () => ({ FollowUpDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog" aria-label="Plan a follow-up" /> : null) }))
vi.mock("@/hooks/workforce/use-current-employee", () => ({ useCurrentEmployee: () => ({ id: "emp_emma" }) }))

const client: Client = {
  id: "cli_medica", workspaceId: "ws", name: "Medica Health", email: "finance@medica.example", status: ClientStatus.ACTIVE, paymentTermsDays: 30, industry: "Healthcare",
  tags: ["Healthcare"], contacts: [{ id: "c", name: "Sofia Conti", email: "sofia@medica.example", phone: "+212 662 98 76 54", isPrimary: true }], createdAt: "", updatedAt: "",
}
const figures: ClientFigures = {
  projects: { total: 3, inProgress: 1, completed: 2, cancelled: 0 },
  openDeals: { count: 1, amount: 50000, weighted: 25000 },
  billedThisYear: 320000,
  outstanding: 165735,
  overdue: 160920,
  oldestLateDays: 15,
  lastContact: "2026-10-01",
  nextFollowUp: { id: "fu", workspaceId: "ws", clientId: "cli_medica", title: "Call about the unpaid invoices", dueDate: "2000-01-01", createdAt: "", updatedAt: "" },
  lateFollowUps: 1,
  satisfaction: { count: 2, average: 4.5, nps: 50, promoters: 1, detractors: 0, latest: { rating: 4, comment: "Very good team", respondentName: "Sofia", answeredAt: "2026-09-20T10:00:00Z" } },
  health: { level: "watch", reasons: ["late_payment", "late_follow_up"] },
}

function renderPanel(extra: Partial<React.ComponentProps<typeof ClientDetailsPanel>> = {}) {
  const props = { client, figures, employees: [], currency: "MAD", canSeeMoney: true, canEdit: true, canDelete: true, onClose: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onOpenProfile: vi.fn(), ...extra }
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ClientDetailsPanel {...props} />
    </NextIntlClientProvider>
  )
  return props
}

describe("client details panel", () => {
  it("shows who the client is, how to reach them and where things stand", () => {
    renderPanel()
    expect(screen.getByText("Client details")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Call +212 662 98 76 54" })).toHaveAttribute("href", "tel:+212662987654")
    expect(screen.getByRole("link", { name: "E-mail sofia@medica.example" })).toHaveAttribute("href", "mailto:sofia@medica.example")
    expect(screen.getByRole("img", { name: "No website" })).toBeInTheDocument()
    expect(screen.getByText("Watch")).toBeInTheDocument()
    expect(screen.getByText(/A payment is late · A follow-up is late/)).toBeInTheDocument()
    expect(screen.getByText("Open deals").previousSibling).toHaveTextContent("1")
    expect(screen.getByText("“Very good team”")).toBeInTheDocument()
    expect(screen.getByText("MAD 165,735")).toBeInTheDocument()
    expect(screen.getByText("15 days late")).toBeInTheDocument()
    expect(screen.getByText("Call about the unpaid invoices")).toBeInTheDocument()
  })

  it("hides amounts from people who can't read invoices", () => {
    renderPanel({ canSeeMoney: false })
    expect(screen.queryByText("MAD 165,735")).not.toBeInTheDocument()
    expect(screen.queryByText("Billed this year")).not.toBeInTheDocument()
    expect(screen.queryByText("Invoices & payments")).not.toBeInTheDocument()
    expect(screen.getByText("Account manager")).toBeInTheDocument()
  })

  it("opens the full record and closes", () => {
    const p = renderPanel()
    fireEvent.click(screen.getByRole("button", { name: "View profile" }))
    fireEvent.click(screen.getByRole("button", { name: "Contracts" }))
    expect(p.onOpenProfile).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(p.onClose).toHaveBeenCalled()
  })

  it("logs a call on the client's timeline", () => {
    renderPanel()
    fireEvent.click(screen.getByRole("button", { name: "Log a call" }))
    const dialog = screen.getByRole("dialog", { name: "Log a contact with Medica Health" })
    fireEvent.click(within(dialog).getByRole("radio", { name: "Meeting" }))
    fireEvent.change(within(dialog).getByLabelText("What was said"), { target: { value: "Agreed a payment plan" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }))
    expect(addNote).toHaveBeenCalledWith(expect.objectContaining({ clientId: "cli_medica", kind: "meeting", text: "Agreed a payment plan", authorId: "emp_emma" }), expect.anything())
  })

  it("plans the next follow-up while logging the call", () => {
    renderPanel()
    fireEvent.click(screen.getByRole("button", { name: "Log a call" }))
    const dialog = screen.getByRole("dialog", { name: "Log a contact with Medica Health" })
    fireEvent.change(within(dialog).getByLabelText("What was said"), { target: { value: "They want the scope" } })
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Plan the next follow-up" }))
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText("What needs to be done"), { target: { value: "Send the scope" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }))
    expect(saveFollowUp).toHaveBeenCalledWith({ input: expect.objectContaining({ clientId: "cli_medica", title: "Send the scope", ownerId: "emp_emma", contactId: "c" }) })
  })

  it("plans a follow-up only for people who can edit clients", () => {
    renderPanel()
    fireEvent.click(screen.getByRole("button", { name: "Plan a follow-up" }))
    expect(screen.getByRole("dialog", { name: "Plan a follow-up" })).toBeInTheDocument()
    cleanup()
    renderPanel({ canEdit: false })
    expect(screen.queryByRole("button", { name: "Plan a follow-up" })).not.toBeInTheDocument()
  })
})
