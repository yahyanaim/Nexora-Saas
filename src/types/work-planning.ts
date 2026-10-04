/** Time off and planning data for a workspace. */

export enum LeaveType {
  VACATION = "vacation",
  SICK = "sick",
  PERSONAL = "personal",
  UNPAID = "unpaid",
}

export enum LeaveStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export enum HalfDay {
  MORNING = "am",
  AFTERNOON = "pm",
}

export interface LeaveRequest {
  id: string
  workspaceId: string
  employeeId: string
  type: LeaveType
  /** yyyy-mm-dd, inclusive */
  startDate: string
  endDate: string
  note?: string
  /** One-day requests can cover only the morning or the afternoon (counts as half a day) */
  halfDay?: HalfDay
  status: LeaveStatus
  /** Why a manager declined */
  decisionNote?: string
  createdAt: string
  updatedAt: string
}

export type LeaveRequestInput = Pick<LeaveRequest, "employeeId" | "type" | "startDate" | "endDate" | "note" | "halfDay">

/** Paid vacation days per employee per calendar year. */
export const ANNUAL_VACATION_DAYS = 25

/** Unused vacation days that move to the next year by default. */
export const DEFAULT_CARRY_OVER_DAYS = 5
