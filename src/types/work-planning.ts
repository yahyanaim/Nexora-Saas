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

export interface LeaveRequest {
  id: string
  workspaceId: string
  employeeId: string
  type: LeaveType
  /** yyyy-mm-dd, inclusive */
  startDate: string
  endDate: string
  note?: string
  status: LeaveStatus
  /** Why a manager declined */
  decisionNote?: string
  createdAt: string
  updatedAt: string
}

export type LeaveRequestInput = Pick<LeaveRequest, "employeeId" | "type" | "startDate" | "endDate" | "note">

/** Paid vacation days per employee per calendar year. */
export const ANNUAL_VACATION_DAYS = 25
