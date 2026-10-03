import { LeaveStatus, LeaveType } from "@/types/work-planning"

/** Translation keys and badge styles for leave, shared by the planning screens. */

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  [LeaveType.VACATION]: "vacation",
  [LeaveType.SICK]: "sickLeave",
  [LeaveType.PERSONAL]: "personalLeave",
  [LeaveType.UNPAID]: "unpaidLeave",
}

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  [LeaveStatus.PENDING]: "pending",
  [LeaveStatus.APPROVED]: "approved",
  [LeaveStatus.REJECTED]: "declined",
  [LeaveStatus.CANCELLED]: "cancelled",
}

export const LEAVE_STATUS_CLASS: Record<LeaveStatus, string> = {
  [LeaveStatus.PENDING]: "bg-warning-soft text-warning-foreground border-transparent",
  [LeaveStatus.APPROVED]: "bg-success-soft text-success-foreground border-transparent",
  [LeaveStatus.REJECTED]: "bg-danger-soft text-destructive border-transparent",
  [LeaveStatus.CANCELLED]: "bg-muted text-muted-foreground border-transparent line-through",
}

/** Short range like "3–7 Oct" or "28 Sep – 2 Oct". */
export function formatRange(start: string, end: string, locale?: string) {
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  const dm = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" })
  if (start === end) return dm.format(s)
  return `${dm.format(s)} – ${dm.format(e)}`
}
