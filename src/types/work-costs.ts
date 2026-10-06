/** Money spent on work: expenses employees submit, and project profitability. */

export enum ExpenseCategory {
  TRAVEL = "travel",
  MEALS = "meals",
  SOFTWARE = "software",
  HARDWARE = "hardware",
  SUBCONTRACTOR = "subcontractor",
  OTHER = "other",
}

export enum ExpenseStatus {
  SUBMITTED = "submitted",
  APPROVED = "approved",
  REJECTED = "rejected",
  /** Paid back to the employee */
  REIMBURSED = "reimbursed",
}

export interface Expense {
  id: string
  workspaceId: string
  employeeId: string
  projectId?: string
  /** yyyy-mm-dd */
  date: string
  category: ExpenseCategory
  description: string
  /** In the workspace currency */
  amount: number
  /** Re-bill to the project's client on the next invoice */
  billable: boolean
  /** Name of the attached receipt (the file itself stays with the backend later) */
  receiptName?: string
  status: ExpenseStatus
  rejectionReason?: string
  /** Who approved (employee id, "admin" or "auto") – BR-3 */
  approvedBy?: string
  /** First approver when the workspace needs two steps */
  firstApprovedBy?: string
  /** Set once re-billed on a client invoice */
  invoiceId?: string
  createdAt: string
  updatedAt: string
}

export type ExpenseInput = Pick<
  Expense,
  "employeeId" | "projectId" | "date" | "category" | "description" | "amount" | "billable" | "receiptName"
>

export interface ProjectProfit {
  projectId: string
  /** Earned so far: hourly → approved hours × rate; fixed → price × progress */
  revenue: number
  /** Logged hours (not rejected) × each person's hourly cost */
  laborCost: number
  hours: number
  /** Approved and reimbursed expenses on the project */
  expenses: number
  /** Logged hours × the workspace overhead rate (CST-4); 0 without overheads */
  overhead: number
  profit: number
  /** Profit as a share of revenue, or null without revenue */
  margin: number | null
}
