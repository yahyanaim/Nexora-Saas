import type { Employee, EmployeeInput } from "@/types/workforce"
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
  return employees.create(workspaceId, input)
}

export async function updateEmployeeApi(
  workspaceId: string,
  id: string,
  input: Partial<EmployeeInput>
): Promise<Employee> {
  if (input.email) assertUniqueEmail(workspaceId, input.email, id)
  if (input.managerId === id) throw new Error("An employee can't be their own manager")
  return employees.update(workspaceId, id, input)
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
