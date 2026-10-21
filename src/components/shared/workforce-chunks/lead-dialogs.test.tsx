import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import messages from "@/messages/en.json"
import { ConvertDialog, DropDialog } from "./lead-dialogs"
import { ClientStatus, type Client } from "@/types/workforce"

const convert = vi.fn()
const drop = vi.fn()
vi.mock("@/hooks/workforce/use-deals", () => ({ useLeadMutations: () => ({ convert: { mutate: convert, isPending: false }, drop: { mutate: drop, isPending: false } }) }))
vi.mock("@/store/workspace-store", () => ({ useCurrentWorkspace: () => ({ id: "ws", currency: "MAD" }) }))

const lead: Client = { id: "cli_nova", workspaceId: "ws", name: "Nova Clinics", email: "a@b.c", status: ClientStatus.LEAD, paymentTermsDays: 30, accountManagerId: "emp_sara", contacts: [{ id: "con_7", name: "Yasmine", email: "y@n.c", isPrimary: true }], createdAt: "", updatedAt: "" }
const wrap = (ui: React.ReactNode) => render(<NextIntlClientProvider locale="en" messages={messages}>{ui}</NextIntlClientProvider>)

describe("lead dialogs (CRM step 6)", () => {
  it("converts with the first deal, owned by the account manager and with the main contact", () => {
    wrap(<ConvertDialog lead={lead} onClose={vi.fn()} hasDeal={false} />)
    const d = screen.getByRole("dialog", { name: "Convert Nova Clinics to a client" })
    expect(within(d).getByLabelText("Deal name")).toHaveValue("Nova Clinics – first project")
    expect(within(d).getByRole("button", { name: "Convert" })).toBeDisabled()
    fireEvent.change(within(d).getByLabelText("Amount before VAT (MAD)"), { target: { value: "300000" } })
    fireEvent.click(within(d).getByRole("button", { name: "Convert" }))
    expect(convert).toHaveBeenCalledWith({ id: "cli_nova", deal: expect.objectContaining({ title: "Nova Clinics – first project", amount: 300000, stage: "qualified", ownerId: "emp_sara", contactId: "con_7" }) }, expect.anything())
  })

  it("converts without a new deal when the lead already has one", () => {
    convert.mockClear()
    wrap(<ConvertDialog lead={lead} onClose={vi.fn()} hasDeal />)
    const d = screen.getByRole("dialog")
    expect(within(d).getByText("This lead already has an open deal.")).toBeInTheDocument()
    expect(within(d).queryByLabelText("Deal name")).not.toBeInTheDocument()
    fireEvent.click(within(d).getByRole("button", { name: "Convert" }))
    expect(convert).toHaveBeenCalledWith({ id: "cli_nova", deal: undefined }, expect.anything())
  })

  it("drops with a reason picked from the suggestions", () => {
    wrap(<DropDialog lead={lead} onClose={vi.fn()} />)
    const d = screen.getByRole("dialog", { name: "Drop the lead Nova Clinics" })
    expect(within(d).getByRole("button", { name: "Drop" })).toBeDisabled()
    fireEvent.click(within(d).getByRole("button", { name: "No budget" }))
    fireEvent.click(within(d).getByRole("button", { name: "Drop" }))
    expect(drop).toHaveBeenCalledWith({ id: "cli_nova", reason: "No budget" }, expect.anything())
  })
})
