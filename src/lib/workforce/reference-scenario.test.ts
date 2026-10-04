import { describe, it, expect, beforeEach } from "vitest"
import { createClientApi } from "@/lib/api/clients-api"
import { changeRateApi, createEmployeeApi, listEmployeesApi } from "@/lib/api/employees-api"
import { createProjectApi, listProjectsApi } from "@/lib/api/work-projects-api"
import {
  approveTimeEntriesApi,
  createCreditNoteApi,
  createInvoiceFromHoursApi,
  issueInvoiceApi,
  listClientInvoicesApi,
  listTimeEntriesApi,
  recordPaymentApi,
  setTimesheetCellApi,
  submitTimesheetApi,
  updateInvoiceDraftApi,
} from "@/lib/api/work-billing-api"
import { listClientsApi } from "@/lib/api/clients-api"
import { creditedAmount, invoiceBalance, invoiceTotals, unbilledEntries } from "./billing"
import { projectProfit } from "./profitability"
import { employeeKpis } from "./kpis"
import { ClientStatus, EmployeeStatus, EmploymentType, WorkRole } from "@/types/workforce"
import { BudgetType, Priority, WorkProjectStatus } from "@/types/work-projects"
import { ClientInvoiceStatus, PaymentMethod, TimeEntryStatus } from "@/types/work-billing"

/**
 * Section 13.3 of the specification, end to end on the demo store. The
 * workspace currency is MAD and VAT is 20%.
 */
const WS = "ws_reference"
const WEEK = ["2027-03-01", "2027-03-02", "2027-03-03", "2027-03-04", "2027-03-05"]

beforeEach(() => localStorage.clear())

describe("reference scenario (spec 13.3)", () => {
  it("runs the whole chain from rate card to credit note", async () => {
    // 1. Rate card 800/h for Senior consultant; the employee costs 300/h, 40 h a week
    const client = await createClientApi(WS, {
      name: "Client SA", email: "billing@client.example", status: ClientStatus.ACTIVE, paymentTermsDays: 30, contacts: [],
      rateCard: [{ id: "rc", jobTitle: "Senior consultant", rate: 800 }],
    })
    const employee = await createEmployeeApi(WS, {
      name: "Rania Alami", email: "rania@company.example", jobTitle: "Senior consultant", role: WorkRole.EMPLOYEE,
      employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2026-01-01",
      hourlyCost: 300, billableRate: 600, weeklyCapacity: 40, skills: [],
    })

    // 2. Time-and-materials project with the employee on it
    const project = await createProjectApi(WS, {
      code: "REF-01", name: "Reference", clientId: client.id, memberIds: [employee.id], status: WorkProjectStatus.ACTIVE,
      priority: Priority.MEDIUM, startDate: "2027-01-01", budgetType: BudgetType.HOURLY,
    })

    // 3. 10 billable hours in one week, submitted
    for (const date of WEEK) await setTimesheetCellApi(WS, { employeeId: employee.id, projectId: project.id, date, hours: 2 })
    await submitTimesheetApi(WS, employee.id, WEEK[0]!, "2027-03-07")
    let entries = await listTimeEntriesApi(WS)
    expect(entries.every((e) => e.status === TimeEntryStatus.SUBMITTED)).toBe(true)

    // 4. Approved: each entry stores billable rate 800 and cost rate 300
    await approveTimeEntriesApi(WS, entries.map((e) => e.id))
    entries = await listTimeEntriesApi(WS)
    expect(entries.every((e) => e.status === TimeEntryStatus.APPROVED && e.billRate === 800 && e.costRate === 300)).toBe(true)

    // 5. Invoice from the approved hours with VAT 20%: net 8,000, VAT 1,600, total 9,600
    const draft = await createInvoiceFromHoursApi(WS, { clientId: client.id, entryIds: entries.map((e) => e.id), taxRate: 20, issueDate: "2027-03-08" })
    expect(invoiceTotals(draft)).toMatchObject({ subtotal: 8000, tax: 1600, total: 9600 })
    expect(unbilledEntries(await listTimeEntriesApi(WS), await listProjectsApi(WS), client.id)).toEqual([])

    // 6. Issued: next number in sequence, and immutable
    const issued = await issueInvoiceApi(WS, draft.id)
    expect(issued.number).toBe("INV-2027-001")
    await expect(updateInvoiceDraftApi(WS, issued.id, { taxRate: 10 })).rejects.toThrow(/draft/)

    // 7. Payment of 9,600: paid, balance 0
    const paid = await recordPaymentApi(WS, issued.id, { date: "2027-03-20", amount: 9600, method: PaymentMethod.BANK_TRANSFER })
    expect(paid.status).toBe(ClientInvoiceStatus.PAID)
    expect(invoiceBalance(paid, await listClientInvoicesApi(WS))).toBe(0)

    // 8. Project profit: revenue 8,000, labor 3,000, profit 5,000, margin 62.5%
    const data = { entries: await listTimeEntriesApi(WS), tasks: [], expenses: [], employees: await listEmployeesApi(WS), clients: await listClientsApi(WS) }
    expect(projectProfit(project, data)).toMatchObject({ revenue: 8000, laborCost: 3000, profit: 5000, margin: 62.5 })

    // 9. KPI for that week: utilization 25% (10 of 40 available hours)
    const kpis = employeeKpis(employee, { ...data, projects: await listProjectsApi(WS), leave: [] }, WEEK[0]!, "2027-03-07")
    expect(kpis.utilization).toBe(25)

    // 10. A raise to 350 from next month leaves approved work and the report unchanged
    await changeRateApi(WS, employee.id, { effectiveFrom: "2027-04-01", hourlyCost: 350, billableRate: 650 })
    const after = { ...data, employees: await listEmployeesApi(WS), entries: await listTimeEntriesApi(WS) }
    expect(projectProfit(project, after)).toMatchObject({ laborCost: 3000, profit: 5000 })

    // 11. Full credit note: hours back to approved and unbilled; the invoice stays and shows the credit
    await createCreditNoteApi(WS, issued.id, { releaseHours: true })
    const unbilled = unbilledEntries(await listTimeEntriesApi(WS), await listProjectsApi(WS), client.id)
    expect(unbilled).toHaveLength(5)
    expect(unbilled.every((e) => e.status === TimeEntryStatus.APPROVED)).toBe(true)
    const all = await listClientInvoicesApi(WS)
    const original = all.find((i) => i.id === issued.id)!
    expect(original.status).toBe(ClientInvoiceStatus.PAID)
    expect(creditedAmount(original, all)).toBe(9600)
    // Credit notes are dated today and number in their own series
    expect(all.find((i) => i.creditNoteFor === issued.id)?.number).toMatch(/^CN-\d{4}-001$/)
  })
})
