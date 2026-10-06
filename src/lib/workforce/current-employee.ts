import type { Employee } from "@/types/workforce"

type Account = { email?: string; role?: string; employeeId?: string; clientId?: string } | null | undefined

/**
 * The employee record behind a signed-in account: the account's own link
 * (Team access), then a matching email, then, for the workspace owner's
 * admin account, the owner link set in Settings.
 */
export function findCurrentEmployee(employees: Employee[], account: Account, ownerEmployeeId?: string) {
  if (!account || account.clientId) return undefined
  if (account.employeeId) return employees.find((e) => e.id === account.employeeId)
  const email = account.email?.toLowerCase()
  const byEmail = email ? employees.find((e) => e.email.toLowerCase() === email) : undefined
  if (byEmail) return byEmail
  return account.role === "admin" && ownerEmployeeId ? employees.find((e) => e.id === ownerEmployeeId) : undefined
}
