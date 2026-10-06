import { createCollection, createId } from "@/lib/workforce/demo-store"
import { assertBill, billTotals } from "@/lib/workforce/supplier-bills"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { roundMoney } from "@/lib/workforce/money"
import { approverRef, assertNotSelfApproval, type Approver } from "@/lib/workforce/approvals"
import { recordAudit } from "@/lib/workforce/audit"
import { assertPeriodOpen } from "./settings-api"
import { SupplierBillStatus, type SupplierBill, type SupplierBillInput, type SupplierBillPayment } from "@/types/work-purchases"

/**
 * Bills received from suppliers (Phase 6f.2). Backed by the browser demo
 * store for now; replace the bodies with apiClient calls once the backend exists.
 */
const bills = createCollection<SupplierBill>("supplier-bills", "bil", (workspaceId) => {
  if (workspaceId !== "ws_atlas") return []
  const t = todayIso()
  const line = (id: string, description: string, quantity: number, unitPrice: number, taxRate?: number) => ({ id, description, quantity, unitPrice, taxRate })
  const rows: Omit<SupplierBill, "workspaceId" | "createdAt" | "updatedAt">[] = [
    {
      id: "bil_cloud_1", supplierId: "sup_cloud", number: "MC-2026-0412", issueDate: addDays(t, -40), dueDate: addDays(t, -10), lines: [line("b1", "Cloud hosting, staging and production", 1, 4800)],
      taxRate: 20, status: SupplierBillStatus.PAID, submittedBy: "emp_yassine", approvedBy: "emp_sara", payments: [{ id: "bp1", date: addDays(t, -12), amount: 5760, method: "bank_transfer", reference: "VIR-0412" }], fileName: "mc-0412.pdf",
    },
    {
      id: "bil_dev_1", supplierId: "sup_dev", number: "YA-031", issueDate: addDays(t, -18), dueDate: addDays(t, -3), projectId: "prj_orbit", lines: [line("b2", "Mobile tracking screens (subcontracted)", 8, 3500)],
      taxRate: 20, status: SupplierBillStatus.APPROVED, submittedBy: "emp_karim", approvedBy: "emp_sara", payments: [], fileName: "ya-031.pdf",
    },
    {
      id: "bil_office_1", supplierId: "sup_office", number: "BP-88231", issueDate: addDays(t, -6), dueDate: addDays(t, 54), lines: [line("b3", "Printer paper and toner", 1, 1250), line("b4", "Office chairs", 2, 2100)],
      taxRate: 20, status: SupplierBillStatus.APPROVED, submittedBy: "emp_yassine", approvedBy: "emp_sara", payments: [{ id: "bp2", date: addDays(t, -2), amount: 2000, method: "cheque", reference: "CHQ-551" }],
    },
    {
      id: "bil_cloud_2", supplierId: "sup_cloud", number: "MC-2026-0518", issueDate: addDays(t, -2), dueDate: addDays(t, 28), projectId: "prj_helio", lines: [line("b5", "Dashboard data API usage", 1, 2600)],
      taxRate: 20, status: SupplierBillStatus.SUBMITTED, submittedBy: "emp_yassine", payments: [],
    },
  ]
  return rows.map((r) => ({ ...r, workspaceId, createdAt: `${r.issueDate}T09:00:00.000Z`, updatedAt: `${r.issueDate}T09:00:00.000Z` }))
})

const target = (b: Pick<SupplierBill, "number">) => `Bill ${b.number}`

export async function listSupplierBillsApi(workspaceId: string): Promise<SupplierBill[]> {
  return bills.list(workspaceId)
}

/** Records a bill; it waits for approval. */
export async function createSupplierBillApi(workspaceId: string, input: SupplierBillInput, submittedBy: string): Promise<SupplierBill> {
  const clean = { ...input, number: input.number.trim() }
  assertBill(clean, bills.list(workspaceId))
  await assertPeriodOpen(workspaceId, clean.issueDate)
  const created = bills.create(workspaceId, { ...clean, status: SupplierBillStatus.SUBMITTED, submittedBy, payments: [] })
  recordAudit(workspaceId, { action: "Supplier bill recorded", actionKey: "bill.created", category: "Billing", target: target(created) })
  return created
}

/** Edits a bill that isn't approved yet; a rejected bill goes back for approval. */
export async function updateSupplierBillApi(workspaceId: string, id: string, input: SupplierBillInput): Promise<SupplierBill> {
  const bill = bills.get(workspaceId, id)
  if (!bill) throw new Error("Bill not found")
  if (bill.status !== SupplierBillStatus.SUBMITTED && bill.status !== SupplierBillStatus.REJECTED) throw new Error("Approved bills can't be changed")
  const clean = { ...input, number: input.number.trim() }
  assertBill(clean, bills.list(workspaceId), id)
  await assertPeriodOpen(workspaceId, clean.issueDate)
  return bills.update(workspaceId, id, { ...clean, status: SupplierBillStatus.SUBMITTED, rejectionReason: undefined })
}

/** Approves or rejects a bill; nobody approves a bill they entered. */
export async function reviewSupplierBillApi(workspaceId: string, approver: Approver, id: string, approved: boolean, reason?: string): Promise<SupplierBill> {
  const bill = bills.get(workspaceId, id)
  if (!bill) throw new Error("Bill not found")
  if (bill.status !== SupplierBillStatus.SUBMITTED) throw new Error("Only bills waiting for approval can be reviewed")
  assertNotSelfApproval(approver.employeeId, bill.submittedBy)
  if (!approved && !reason?.trim()) throw new Error("Give a reason when rejecting")
  recordAudit(workspaceId, {
    action: approved ? "Supplier bill approved" : "Supplier bill rejected",
    actionKey: approved ? "bill.approved" : "bill.rejected",
    category: "Approvals",
    target: target(bill),
    before: bill.status,
    after: approved ? SupplierBillStatus.APPROVED : SupplierBillStatus.REJECTED,
  })
  return bills.update(workspaceId, id, approved ? { status: SupplierBillStatus.APPROVED, approvedBy: approverRef(approver) } : { status: SupplierBillStatus.REJECTED, rejectionReason: reason!.trim() })
}

/** Records a payment to the supplier; the bill is paid once nothing is left. */
export async function paySupplierBillApi(workspaceId: string, id: string, payment: Omit<SupplierBillPayment, "id">): Promise<SupplierBill> {
  const bill = bills.get(workspaceId, id)
  if (!bill) throw new Error("Bill not found")
  if (bill.status !== SupplierBillStatus.APPROVED) throw new Error("Approve the bill before paying it")
  if (!(payment.amount > 0)) throw new Error("Enter an amount above zero")
  const { balance } = billTotals(bill)
  if (roundMoney(payment.amount) > balance) throw new Error("The payment is more than what is left to pay")
  await assertPeriodOpen(workspaceId, payment.date)
  const payments = [...bill.payments, { ...payment, amount: roundMoney(payment.amount), id: createId("bpay") }]
  const paid = billTotals({ ...bill, payments }).balance === 0
  recordAudit(workspaceId, { action: "Supplier bill payment recorded", actionKey: "bill.paid", category: "Billing", target: `${target(bill)} (${payment.amount})` })
  return bills.update(workspaceId, id, { payments, status: paid ? SupplierBillStatus.PAID : bill.status })
}

/** Deletes a bill entered by mistake; approved bills stay for the books. */
export async function deleteSupplierBillApi(workspaceId: string, id: string): Promise<void> {
  const bill = bills.get(workspaceId, id)
  if (!bill) throw new Error("Bill not found")
  if (bill.status !== SupplierBillStatus.SUBMITTED && bill.status !== SupplierBillStatus.REJECTED) throw new Error("Approved bills can't be deleted")
  bills.remove(workspaceId, id)
  recordAudit(workspaceId, { action: "Supplier bill deleted", actionKey: "bill.deleted", category: "Billing", target: target(bill) })
}
