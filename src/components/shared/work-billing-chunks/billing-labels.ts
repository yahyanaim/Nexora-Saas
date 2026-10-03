import { ClientInvoiceStatus, TimeEntryStatus, type ClientInvoiceDisplayStatus } from "@/types/work-billing"

/** Translation keys and badge styles for time and invoice statuses. */

export const TIME_STATUS_LABEL: Record<TimeEntryStatus, string> = {
  [TimeEntryStatus.DRAFT]: "draft",
  [TimeEntryStatus.SUBMITTED]: "submitted",
  [TimeEntryStatus.APPROVED]: "approved",
  [TimeEntryStatus.REJECTED]: "rejected",
}

export const TIME_STATUS_CLASS: Record<TimeEntryStatus, string> = {
  [TimeEntryStatus.DRAFT]: "bg-muted text-muted-foreground border-transparent",
  [TimeEntryStatus.SUBMITTED]: "bg-info-soft text-info-foreground border-transparent",
  [TimeEntryStatus.APPROVED]: "bg-success-soft text-success-foreground border-transparent",
  [TimeEntryStatus.REJECTED]: "bg-danger-soft text-destructive border-transparent",
}

/** Cell tint in the timesheet grid, so a locked cell reads as locked at a glance */
export const TIME_STATUS_CELL: Record<TimeEntryStatus, string> = {
  [TimeEntryStatus.DRAFT]: "",
  [TimeEntryStatus.SUBMITTED]: "bg-info-soft/60",
  [TimeEntryStatus.APPROVED]: "bg-success-soft/60",
  [TimeEntryStatus.REJECTED]: "bg-danger-soft/70 border-destructive/40",
}

export const INVOICE_STATUS_LABEL: Record<ClientInvoiceDisplayStatus, string> = {
  [ClientInvoiceStatus.DRAFT]: "draft",
  [ClientInvoiceStatus.SENT]: "sent",
  [ClientInvoiceStatus.PAID]: "paid",
  [ClientInvoiceStatus.VOID]: "void",
  overdue: "overdue",
}

export const INVOICE_STATUS_CLASS: Record<ClientInvoiceDisplayStatus, string> = {
  [ClientInvoiceStatus.DRAFT]: "bg-muted text-muted-foreground border-transparent",
  [ClientInvoiceStatus.SENT]: "bg-info-soft text-info-foreground border-transparent",
  [ClientInvoiceStatus.PAID]: "bg-success-soft text-success-foreground border-transparent",
  [ClientInvoiceStatus.VOID]: "bg-muted text-muted-foreground border-transparent line-through",
  overdue: "bg-danger-soft text-destructive border-transparent",
}

export function formatHours(hours: number) {
  return `${Math.round(hours * 100) / 100} h`
}
