import { AccountStatus, type EmployeeAccount } from "@/types/work-access"
import { WorkRole } from "@/types/workforce"
import { createCollection } from "@/lib/workforce/demo-store"
import { inviteProblem } from "@/lib/workforce/access"
import { recordAudit } from "@/lib/workforce/audit"
import { listEmployeesApi, updateEmployeeApi } from "./employees-api"
import { getWorkspaceSubscriptionApi } from "./workspace-subscription-api"

const STAMP = "2026-01-05T09:00:00.000Z"

function seedAccounts(workspaceId: string): EmployeeAccount[] {
  const row = (employeeId: string, email: string, status: AccountStatus) => ({
    id: `acc_${employeeId}`,
    employeeId,
    email,
    status,
    invitedAt: STAMP,
    activatedAt: status === AccountStatus.ACTIVE ? STAMP : undefined,
  })
  const rows =
    workspaceId === "ws_atlas"
      ? [
          row("emp_sara", "sara@atlas.example", AccountStatus.ACTIVE),
          row("emp_karim", "karim@atlas.example", AccountStatus.ACTIVE),
          row("emp_lina", "lina@atlas.example", AccountStatus.ACTIVE),
          row("emp_yassine", "yassine@atlas.example", AccountStatus.ACTIVE),
          row("emp_emma", "emma@atlas.example", AccountStatus.ACTIVE),
          row("emp_julia", "julia@atlas.example", AccountStatus.INVITED),
        ]
      : workspaceId === "ws_northwind"
        ? [row("emp_ava", "ava@northwind.example", AccountStatus.ACTIVE), row("emp_mateo", "mateo@northwind.example", AccountStatus.ACTIVE), row("emp_chloe", "chloe@northwind.example", AccountStatus.INVITED)]
        : []
  return rows.map((r) => ({ ...r, workspaceId, createdAt: STAMP, updatedAt: STAMP }))
}

/**
 * Login accounts of the company's employees. Backed by the browser demo store;
 * the server version sends a real invitation email and stores password hashes.
 */
const accounts = createCollection<EmployeeAccount>("accounts", "acc", seedAccounts)

export async function listAccountsApi(workspaceId: string): Promise<EmployeeAccount[]> {
  return accounts.list(workspaceId)
}

async function employeeOf(workspaceId: string, employeeId: string) {
  const employee = (await listEmployeesApi(workspaceId)).find((e) => e.id === employeeId)
  if (!employee) throw new Error("Employee not found")
  return employee
}

/** Gives an employee access: an invitation is sent to their email and takes a seat. */
export async function inviteEmployeeApi(workspaceId: string, employeeId: string): Promise<EmployeeAccount> {
  const employee = await employeeOf(workspaceId, employeeId)
  const all = accounts.list(workspaceId)
  const { plan } = await getWorkspaceSubscriptionApi(workspaceId)
  const problem = inviteProblem(employee, all, employeeId, plan.seats)
  if (problem) throw new Error(problem)
  const existing = all.find((a) => a.employeeId === employeeId)
  const now = new Date().toISOString()
  const account = existing
    ? accounts.update(workspaceId, existing.id, { status: AccountStatus.INVITED, email: employee.email, invitedAt: now })
    : accounts.create(workspaceId, { employeeId, email: employee.email, status: AccountStatus.INVITED, invitedAt: now })
  recordAudit(workspaceId, { action: "Access granted", actionKey: "access.invited", category: "Team", target: `${employee.name} <${employee.email}>` })
  return account
}

export async function setAccountEnabledApi(workspaceId: string, employeeId: string, enabled: boolean): Promise<EmployeeAccount> {
  const account = accounts.list(workspaceId).find((a) => a.employeeId === employeeId)
  if (!account) throw new Error("This employee has no account")
  if (enabled) return inviteEmployeeApi(workspaceId, employeeId)
  const employee = await employeeOf(workspaceId, employeeId)
  const admins = accounts.list(workspaceId).filter((a) => a.status !== AccountStatus.DISABLED && a.employeeId !== employeeId)
  const employees = await listEmployeesApi(workspaceId)
  if (employee.role === WorkRole.ADMIN && !admins.some((a) => employees.find((e) => e.id === a.employeeId)?.role === WorkRole.ADMIN)) {
    throw new Error("Keep at least one administrator who can sign in")
  }
  recordAudit(workspaceId, { action: "Access removed", actionKey: "access.disabled", category: "Team", target: employee.name })
  return accounts.update(workspaceId, account.id, { status: AccountStatus.DISABLED })
}

/** Changes what someone can do: their work role sets their permissions. */
export async function changeAccessRoleApi(workspaceId: string, employeeId: string, role: WorkRole) {
  const employee = await employeeOf(workspaceId, employeeId)
  if (employee.role === WorkRole.ADMIN && role !== WorkRole.ADMIN) {
    const employees = await listEmployeesApi(workspaceId)
    const otherAdmins = accounts
      .list(workspaceId)
      .filter((a) => a.status !== AccountStatus.DISABLED && a.employeeId !== employeeId && employees.find((e) => e.id === a.employeeId)?.role === WorkRole.ADMIN)
    if (!otherAdmins.length) throw new Error("Keep at least one administrator who can sign in")
  }
  recordAudit(workspaceId, { action: "Access role changed", actionKey: "access.role", category: "Team", target: employee.name, before: employee.role, after: role })
  return updateEmployeeApi(workspaceId, employeeId, { role })
}

/**
 * Demo sign-in for an employee account: finds the account by email in any
 * workspace, activates an invitation on first sign-in, and returns the
 * employee with their workspace. The server version checks a password.
 */
export async function findAccountForSignInApi(email: string, workspaceIds: string[]) {
  const key = email.trim().toLowerCase()
  for (const ws of workspaceIds) {
    const account = accounts.list(ws).find((a) => a.email.toLowerCase() === key)
    if (!account || account.status === AccountStatus.DISABLED) continue
    const employee = (await listEmployeesApi(ws)).find((e) => e.id === account.employeeId)
    if (!employee) continue
    const now = new Date().toISOString()
    accounts.update(ws, account.id, {
      status: AccountStatus.ACTIVE,
      activatedAt: account.activatedAt ?? now,
      lastSignInAt: now,
    })
    return { workspaceId: ws, employee }
  }
  return null
}
