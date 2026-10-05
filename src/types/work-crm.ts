/** Client contracts, client notes, recurring invoices and payment reminders (phase 5b). */

export enum ContractType {
  TIME_MATERIALS = "time_materials",
  FIXED_PRICE = "fixed_price",
  RETAINER = "retainer",
}

/** A signed agreement with a client (CRM-4). */
export interface ClientContract {
  id: string
  workspaceId: string
  clientId: string
  title: string
  type: ContractType
  /** yyyy-mm-dd */
  startDate: string
  endDate?: string
  /** Total value (fixed price) or value per period (retainer), in `currency` */
  value?: number
  currency: string
  /** Day to renew or renegotiate by; drives the "renewal due" warning */
  renewalDate?: string
  /** Name of the attached signed file */
  fileName?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type ContractInput = Omit<ClientContract, "id" | "workspaceId" | "createdAt" | "updatedAt">

/** Shown status, derived from today's date. */
export type ContractStatus = "upcoming" | "active" | "renewal_due" | "ended"

export enum ClientNoteKind {
  NOTE = "note",
  MEETING = "meeting",
  CALL = "call",
}

/** A note, meeting or call recorded on a client (CRM-7). */
export interface ClientNote {
  id: string
  workspaceId: string
  clientId: string
  kind: ClientNoteKind
  /** yyyy-mm-dd */
  date: string
  text: string
  authorId?: string
  createdAt: string
  updatedAt: string
}

/** One entry of the client activity timeline, built from every module (CRM-7). */
export interface ClientActivity {
  id: string
  /** yyyy-mm-dd */
  date: string
  kind: "project" | "quote" | "invoice" | "payment" | "contract" | ClientNoteKind
  title: string
  detail?: string
  amount?: number
  currency?: string
}

export enum RecurringFrequency {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

export interface RecurringLine {
  id: string
  description: string
  quantity: number
  unit?: string
  unitPrice: number
}

/** A schedule that drafts the same invoice every period for review (BIL-14). */
export interface RecurringInvoice {
  id: string
  workspaceId: string
  clientId: string
  projectId?: string
  title: string
  frequency: RecurringFrequency
  /** First period to bill, yyyy-mm-dd */
  startDate: string
  /** Next date a draft is due */
  nextRunDate: string
  /** Last period to bill (optional) */
  endDate?: string
  lines: RecurringLine[]
  taxRate: number
  notes?: string
  active: boolean
  /** Drafts created by this schedule, newest last */
  invoiceIds: string[]
  createdAt: string
  updatedAt: string
}

export type RecurringInput = Omit<RecurringInvoice, "id" | "workspaceId" | "createdAt" | "updatedAt" | "invoiceIds" | "nextRunDate">

/** A payment reminder sent for an overdue invoice (BIL-15). */
export interface InvoiceReminder {
  invoiceId: string
  level: 1 | 2 | 3
  to: string
  /** ISO timestamp */
  at: string
}

/** Days after the due date at which each reminder level goes out (BIL-15). */
export interface ReminderSettings {
  enabled: boolean
  /** Days overdue for levels 1, 2 and 3 */
  days: [number, number, number]
}
