import type { NexoraPlanId } from "@/lib/platform/nexora-catalog"
import type { InvoiceLine } from "@/lib/platform/billing"
import type { SellerSnapshot } from "@/types/platform-config"

/** Nexora's own billing records (cahier des charges §5.2–5.6, §7.2). */

export interface PlanVersion {
  id: string
  workspaceId: string
  plan: NexoraPlanId
  /** Monthly price before VAT, MAD */
  monthly: number
  /** yyyy-mm-dd */
  effectiveFrom: string
  /** PLA-04: what happens to existing customers */
  existing: "keep" | "move_at_renewal"
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface SubscriptionChange {
  at: string
  by: string
  kind: "started" | "upgraded" | "downgrade_scheduled" | "downgraded" | "renewed" | "billing_changed"
  from?: string
  to?: string
}

export interface NxSubscription {
  id: string
  workspaceId: string
  customerId: string
  plan: NexoraPlanId
  /** The price version this subscription pays (BR-02) */
  versionId: string
  billing: "monthly" | "yearly"
  method: "card" | "transfer"
  /** yyyy-mm-dd, current period */
  periodStart: string
  periodEnd: string
  /** SUB-03: a downgrade waits for the renewal */
  scheduledPlan?: NexoraPlanId
  history: SubscriptionChange[]
  createdAt: string
  updatedAt: string
}

export type NxInvoiceStatus = "issued" | "paid" | "partly_paid" | "overdue" | "credited"

export interface NxInvoice {
  id: string
  workspaceId: string
  number: string
  customerId: string
  customerName: string
  customerIce?: string
  kind: "subscription" | "proration"
  /** yyyy-mm-dd */
  date: string
  dueDate: string
  periodFrom: string
  periodTo: string
  lines: InvoiceLine[]
  subtotal: number
  vat: number
  total: number
  paid: number
  credited: number
  status: NxInvoiceStatus
  /** INV-06: Nexora's own e-invoice status */
  einvoice: "to_send" | "sent" | "accepted" | "rejected"
  /** yyyy-mm-dd of the payment failure that started dunning */
  failedOn?: string
  /** CFG-04: Nexora's identity as it was when the invoice was issued */
  seller?: SellerSnapshot
  createdAt: string
  updatedAt: string
}

export interface NxCreditNote {
  id: string
  workspaceId: string
  number: string
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  date: string
  reason: string
  subtotal: number
  vat: number
  total: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface NxPayment {
  id: string
  workspaceId: string
  customerId?: string
  customerName?: string
  invoiceId?: string
  invoiceNumber?: string
  method: "card" | "transfer"
  /** Positive for money received, negative for a refund */
  amount: number
  date: string
  status: "succeeded" | "failed" | "refunded" | "unmatched"
  /** Bank reference or provider reference */
  reference: string
  payer?: string
  createdAt: string
  updatedAt: string
}

export interface NxRefund {
  id: string
  workspaceId: string
  creditNoteId: string
  creditNoteNumber: string
  customerId: string
  customerName: string
  amount: number
  status: "awaiting_approval" | "done"
  requestedBy: string
  approvedBy?: string
  createdAt: string
  updatedAt: string
}

export interface DunningRun {
  id: string
  workspaceId: string
  invoiceId: string
  day: number
  kind: "reminder" | "retry" | "warning" | "read_only" | "suspend" | "propose_cancel"
  date: string
  result: string
  createdAt: string
  updatedAt: string
}

export interface TaxRate {
  id: string
  workspaceId: string
  label: string
  rate: number
  from: string
  to?: string
  reference: string
  createdAt: string
  updatedAt: string
}
