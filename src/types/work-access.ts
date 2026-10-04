/** Login accounts of a company: one per employee who may sign in (ACC-1…ACC-4). */

export enum AccountStatus {
  INVITED = "invited",
  ACTIVE = "active",
  DISABLED = "disabled",
}

export interface EmployeeAccount {
  id: string
  workspaceId: string
  employeeId: string
  /** Sign-in email; mirrors the employee's email */
  email: string
  status: AccountStatus
  invitedAt: string
  activatedAt?: string
  lastSignInAt?: string
  createdAt: string
  updatedAt: string
}
