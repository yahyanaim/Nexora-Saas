import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import messages from "@/messages/en.json"
import { FollowUpList } from "./follow-up-list"
import { ClientStatus, type Client } from "@/types/workforce"
import { FollowUpStatus, type ClientFollowUp } from "@/types/work-crm"
import { todayIso } from "@/lib/workforce/project-metrics"

const setDone = vi.fn()
vi.mock("@/hooks/workforce/use-crm", () => ({ useFollowUpMutations: () => ({ setDone: { mutate: setDone, isPending: false }, save: { mutate: vi.fn() }, remove: { mutate: vi.fn() } }) }))
vi.mock("@/hooks/workforce/use-current-employee", () => ({ useCurrentEmployee: () => ({ id: "emp_emma" }) }))
const client: Client = { id: "cli_medica", workspaceId: "ws", name: "Medica Health", email: "a@b.c", status: ClientStatus.ACTIVE, paymentTermsDays: 30, contacts: [{ id: "con_4", name: "Sofia Conti", email: "s@m.c", isPrimary: true }], createdAt: "", updatedAt: "" }
vi.mock("@/hooks/workforce/use-workforce", () => ({ useClients: () => ({ data: [client] }), useEmployees: () => ({ data: [{ id: "emp_emma", name: "Emma Stone" }, { id: "emp_sara", name: "Sara Idrissi" }] }) }))
vi.mock("@/hooks/workforce/use-deals", () => ({ useDeals: () => ({ data: [{ id: "deal_medica", title: "Patient mobile app" }] }) }))

const today = todayIso()
const fu = (id: string, over: Partial<ClientFollowUp> = {}): ClientFollowUp => ({ id, workspaceId: "ws", clientId: "cli_medica", title: id, dueDate: today, ownerId: "emp_emma", createdAt: "", updatedAt: "", ...over })

function renderList(items: ClientFollowUp[], canEdit = false) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <FollowUpList items={items} canEdit={canEdit} onEdit={vi.fn()} empty={<p>empty</p>} />
    </NextIntlClientProvider>
  )
}

describe("follow-up list", () => {
  it("shows the client, contact, deal and when it is due", () => {
    renderList([fu("Send the scope", { contactId: "con_4", dealId: "deal_medica", status: FollowUpStatus.IN_PROGRESS })])
    expect(screen.getByRole("link", { name: "Medica Health" })).toHaveAttribute("href", "/en/dashboard/clients/cli_medica?tab=followups")
    expect(screen.getByText("with Sofia Conti")).toBeInTheDocument()
    expect(screen.getByText("for Patient mobile app")).toBeInTheDocument()
    expect(screen.getByText("In progress")).toBeInTheDocument()
    expect(screen.getByText("Today")).toBeInTheDocument()
  })

  it("lets the owner tick their own follow-up without client rights, not someone else's", () => {
    renderList([fu("Mine"), fu("Sara's", { ownerId: "emp_sara" })])
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark “Mine” as done" }))
    expect(setDone).toHaveBeenCalledWith({ id: "Mine", done: true, by: "emp_emma" })
    expect(screen.getByRole("checkbox", { name: "Mark “Sara's” as done" })).toBeDisabled()
  })

  it("shows the empty state when there is nothing", () => {
    renderList([])
    expect(screen.getByText("empty")).toBeInTheDocument()
  })
})
