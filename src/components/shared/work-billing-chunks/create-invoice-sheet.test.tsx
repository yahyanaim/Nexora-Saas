import { describe, it, expect } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { CreateInvoiceSheet } from "./create-invoice-sheet"
import { IntlWrapper } from "@/test/intl"
import messages from "@/messages/en.json"
import { seedClients, seedEmployees } from "@/lib/workforce/demo-seed"
import { seedProjects, seedTasks } from "@/lib/workforce/project-seed"
import { seedClientInvoices, seedTimeEntries } from "@/lib/workforce/billing-seed"
import { todayIso } from "@/lib/workforce/project-metrics"
import { ExpenseCategory, ExpenseStatus, type Expense } from "@/types/work-costs"

const WS = "ws_atlas"
const helio = seedClients(WS).find((c) => c.id === "cli_helio")!
const licence: Expense = { id: "x1", workspaceId: WS, employeeId: "emp_lina", projectId: "prj_helio", date: todayIso(), category: ExpenseCategory.SOFTWARE, description: "Charting library licence", amount: 4200, billable: true, status: ExpenseStatus.APPROVED, createdAt: "", updatedAt: "" }

function renderSheet() {
  render(
    <IntlWrapper>
      <CreateInvoiceSheet
        client={helio}
        entries={seedTimeEntries(WS)}
        expenses={[licence]}
        projects={seedProjects(WS)}
        employees={seedEmployees(WS)}
        tasks={seedTasks(WS)}
        invoices={seedClientInvoices(WS)}
        currency="MAD"
        isSubmitting={false}
        onOpenChange={() => {}}
        onCreate={() => {}}
      />
    </IntlWrapper>
  )
}

describe("CreateInvoiceSheet selection rows", () => {
  it.each([messages.hoursToBill, messages.expensesToRebill])("toggles a row in “%s” once from its square or its text", (legend) => {
    renderSheet()
    const box = within(screen.getByRole("group", { name: legend })).getAllByRole("checkbox")[0]!
    const text = screen.getByText(box.getAttribute("aria-label")!)
    expect(box).toHaveAttribute("aria-checked", "true")

    // The check mark is what sits under the pointer at the square's centre. Its click must be
    // cancelled: browsers re-dispatch an uncancelled one through the row's <label> once the
    // check mark unmounts, undoing the toggle (jsdom doesn't, so assert the cancel itself)
    expect(fireEvent.click(box.querySelector("svg")!)).toBe(false)
    expect(box).toHaveAttribute("aria-checked", "false")
    fireEvent.click(box)
    expect(box).toHaveAttribute("aria-checked", "true")

    fireEvent.click(text)
    expect(box).toHaveAttribute("aria-checked", "false")
    fireEvent.click(text)
    expect(box).toHaveAttribute("aria-checked", "true")
  })
})
