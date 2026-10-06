"use client"

import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { findCurrentEmployee } from "@/lib/workforce/current-employee"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"

/** The signed-in person's employee record in the current workspace, if any. */
export function useCurrentEmployee() {
  const { authedUser } = useAuthGuard()
  const { data: employees = [] } = useEmployees()
  const { data: settings } = useWorkspaceSettings()
  return findCurrentEmployee(employees, authedUser as Parameters<typeof findCurrentEmployee>[1], settings?.ownerEmployeeId)
}

/**
 * Self-service pages (timesheet, expenses, leave) show people without the
 * approve right only their own records: `scoped` is true and `restrict`
 * narrows a list of employees to the signed-in person.
 */
export function useSelfScope() {
  const { authedUser } = useAuthGuard()
  const me = useCurrentEmployee()
  const scoped = !can(authedUser, AdminPermissionsPlatform.TIME_APPROVE)
  return {
    me,
    scoped,
    restrict: <T extends { id: string }>(people: T[]) => (scoped ? people.filter((p) => p.id === me?.id) : people),
    isMine: (employeeId: string) => !scoped || employeeId === me?.id,
  }
}
