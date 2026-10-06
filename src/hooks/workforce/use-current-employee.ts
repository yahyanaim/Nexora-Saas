"use client"

import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { findCurrentEmployee } from "@/lib/workforce/current-employee"

/** The signed-in person's employee record in the current workspace, if any. */
export function useCurrentEmployee() {
  const { authedUser } = useAuthGuard()
  const { data: employees = [] } = useEmployees()
  const { data: settings } = useWorkspaceSettings()
  return findCurrentEmployee(employees, authedUser as Parameters<typeof findCurrentEmployee>[1], settings?.ownerEmployeeId)
}
