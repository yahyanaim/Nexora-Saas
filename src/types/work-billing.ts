/** Hours employees log on projects, and the invoices sent to clients for them. */

export enum TimeEntryStatus {
  /** Being filled in; the employee can still change it */
  DRAFT = "draft",
  /** Sent to a manager for approval; locked */
  SUBMITTED = "submitted",
  /** Accepted; can be invoiced */
  APPROVED = "approved",
  /** Sent back with a reason; editable again */
  REJECTED = "rejected",
}

export interface TimeEntry {
  id: string
  workspaceId: string
  employeeId: string
  projectId: string
  taskId?: string
  /** yyyy-mm-dd */
  date: string
  hours: number
  note?: string
  /** Billable to the client (always false on non-billable projects) */
  billable: boolean
  status: TimeEntryStatus
  rejectionReason?: string
  /** Set once the hours are on a client invoice */
  invoiceId?: string
  /** Rates captured at approval (TIM-9); later rate changes never alter them */
  billRate?: number
  costRate?: number
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

export enum ClientInvoiceStatus {
  DRAFT = "draft",
  SENT = "sent",
  PAID = "paid",
  VOID = "void",
}

/** Shown status: a sent invoice past its due date reads as overdue. */
export type ClientInvoiceDisplayStatus = ClientInvoiceStatus | "overdue"

export interface InvoiceLine {
  id: string
  description: string
  /** Hours (or units for a manual line) */
  quantity: number
  unitPrice: number
  projectId?: string
  /** Time entries billed by this line; freed again if the invoice is voided or deleted */
  timeEntryIds: string[]
  /** Expenses re-billed by this line; freed the same way */
  expenseIds?: string[]
}

export interface ClientInvoice {
  id: string
  workspaceId: string
  /** e.g. INV-2026-007, unique per workspace */
  number: string
  clientId: string
  currency: string
  /** yyyy-mm-dd */
  issueDate: string
  dueDate: string
  status: ClientInvoiceStatus
  lines: InvoiceLine[]
  /** Percent, e.g. 20 for 20% */
  taxRate: number
  notes?: string
  sentAt?: string
  paidAt?: string
  createdAt: string
  updatedAt: string
}
