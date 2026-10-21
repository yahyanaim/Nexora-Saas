import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import messages from "@/messages/en.json"
import { FollowUpDialog } from "./follow-up-dialog"
import { ClientStatus, EmployeeStatus, type Client } from "@/types/workforce"
import { DealStage } from "@/types/work-sales"

const save = vi.fn()
vi.mock("@/hooks/workforce/use-crm", () => ({ useFollowUpMutations: () => ({ save: { mutate: save, isPending: false } }) }))
vi.mock("@/hooks/workforce/use-current-employee", () => ({ useCurrentEmployee: () => ({ id: "emp_sara" }) }))
const client: Client = { id: "cli_helio", workspaceId: "ws", name: "Helio Energy", email: "a@b.c", status: ClientStatus.ACTIVE, paymentTermsDays: 30, contacts: [{ id: "con_3", name: "Rachid Amrani", email: "r@h.c", isPrimary: true }], createdAt: "", updatedAt: "" }
vi.mock("@/hooks/workforce/use-workforce", () => ({ useClients: () => ({ data: [client] }), useEmployees: () => ({ data: [{ id: "emp_sara", name: "Sara Bennani", status: EmployeeStatus.ACTIVE }] }) }))
vi.mock("@/hooks/workforce/use-deals", () => ({ useDeals: () => ({ data: [{ id: "deal_helio", clientId: "cli_helio", title: "Energy dashboard phase 2", stage: DealStage.NEGOTIATION }, { id: "deal_won", clientId: "cli_helio", title: "Old", stage: DealStage.WON }] }) }))

describe("follow-up dialog", () => {
  it("shows names, not codes, and saves with the client, deal and owner", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <FollowUpDialog open onOpenChange={vi.fn()} defaults={{ clientId: "cli_helio", contactId: "con_3", dealId: "deal_helio" }} lockClient />
      </NextIntlClientProvider>
    )
    const dialog = screen.getByRole("dialog", { name: "Plan a follow-up" })
    expect(within(dialog).getByText("Something to do for Helio Energy by a date.")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Who does it")).toHaveTextContent("Sara Bennani")
    expect(within(dialog).getByLabelText("Status")).toHaveTextContent("To do")
    expect(within(dialog).getByLabelText("Contact")).toHaveTextContent("Rachid Amrani")
    expect(within(dialog).getByLabelText("Deal")).toHaveTextContent("Energy dashboard phase 2")
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText("What needs to be done"), { target: { value: "Share the timeline" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }))
    expect(save).toHaveBeenCalledWith({ input: expect.objectContaining({ clientId: "cli_helio", title: "Share the timeline", ownerId: "emp_sara", contactId: "con_3", dealId: "deal_helio", status: "todo" }), id: undefined }, expect.anything())
  })
})
