import type { Employee, EmployeeInput, RateChange } from "@/types/workforce"
import { rateOn, withRateChange } from "@/lib/workforce/rates"
import { todayIso } from "@/lib/workforce/project-metrics"
import { createCollection } from "@/lib/workforce/demo-store"
import { seedEmployees } from "@/lib/workforce/demo-seed"

/**
 * Employees of a workspace. Backed by the browser demo store for now;
 * replace the bodies with apiClient calls once the backend exposes them.
 */
const employees = createCollection<Employee>("employees", "emp", seedEmployees)

export async function listEmployeesApi(workspaceId: string): Promise<Employee[]> {
  return employees.list(workspaceId)
}

export async function createEmployeeApi(workspaceId: string, input: EmployeeInput): Promise<Employee> {
  assertUniqueEmail(workspaceId, input.email)
  // The first rates take effect on the hire date
  const rateHistory = [{ effectiveFrom: input.hireDate, hourlyCost: input.hourlyCost, billableRate: input.billableRate }]
  return employees.create(workspaceId, { ...input, rateHistory })
}

export async function updateEmployeeApi(
  workspaceId: string,
  id: string,
  input: Partial<EmployeeInput>
): Promise<Employee> {
  if (input.email) assertUniqueEmail(workspaceId, input.email, id)
  if (input.managerId === id) throw new Error("An employee can't be their own manager")
  const current = employees.get(workspaceId, id)
  if (!current) throw new Error("Employee not found")
  const { hourlyCost, billableRate, rateHistory: _ignored, ...rest } = input
  const ratesEdited =
    (hourlyCost !== undefined && hourlyCost !== current.hourlyCost) ||
    (billableRate !== undefined && billableRate !== current.billableRate)
  const updated = employees.update(workspaceId, id, rest)
  if (!ratesEdited) return updated
  // Editing rates on the profile records a change from today; past work keeps its rates
  return changeRateApi(workspaceId, id, {
    effectiveFrom: todayIso(),
    hourlyCost: hourlyCost ?? current.hourlyCost,
    billableRate: billableRate ?? current.billableRate,
    reason: "Updated on the profile",
  })
}

/**
 * Records a rate change from a date (HR-3). The profile's current rates follow
 * whichever change is in force today.
 */
export async function changeRateApi(
  workspaceId: string,
  id: string,
  change: RateChange,
  today = todayIso()
): Promise<Employee> {
  const employee = employees.get(workspaceId, id)
  if (!employee) throw new Error("Employee not found")
  if (change.hourlyCost < 0 || change.billableRate < 0) throw new Error("Rates can't be negative")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(change.effectiveFrom)) throw new Error("Pick the date the rates take effect")
  if (change.effectiveFrom < employee.hireDate) throw new Error("Rates can't start before the hire date")
  const base = employee.rateHistory?.length
    ? employee.rateHistory
    : [{ effectiveFrom: employee.hireDate, hourlyCost: employee.hourlyCost, billableRate: employee.billableRate }]
  const rateHistory = withRateChange(base, { ...change, reason: change.reason?.trim() || undefined })
  const now = rateOn({ ...employee, rateHistory }, today)
  return employees.update(workspaceId, id, { rateHistory, ...now })
}

export async function deleteEmployeeApi(workspaceId: string, id: string): Promise<void> {
  // Reports of the removed employee lose their manager instead of pointing at nothing
  for (const report of employees.list(workspaceId).filter((e) => e.managerId === id)) {
    employees.update(workspaceId, report.id, { managerId: undefined })
  }
  employees.remove(workspaceId, id)
}

export { listDepartmentsApi } from "./settings-api"

function assertUniqueEmail(workspaceId: string, email: string, exceptId?: string) {
  const normalized = email.trim().toLowerCase()
  const taken = employees
    .list(workspaceId)
    .some((e) => e.id !== exceptId && e.email.toLowerCase() === normalized)
  if (taken) throw new Error("An employee with this email already exists")
}
