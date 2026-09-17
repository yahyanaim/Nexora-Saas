"use client"

import React from "react"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can, canAll, canAny } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"

interface PermissionGuardProps {
  permission?: AdminPermissionsPlatform
  permissions?: AdminPermissionsPlatform[]
  mode?: "all" | "any"
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Declarative RBAC permission gatekeeper component.
 * Renders `children` only if the authenticated user satisfies the permission requirements.
 * Otherwise, renders optional `fallback` (defaults to null).
 *
 * @example
 * <PermissionGuard permission={AdminPermissionsPlatform.USERS_DELETE} fallback={<AccessDenied />}>
 *   <DeleteUserButton />
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  permissions,
  mode = "all",
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { user } = useAuthGuard()

  if (permission && !can(user, permission)) {
    return <>{fallback}</>
  }

  if (permissions && permissions.length > 0) {
    const isAllowed = mode === "all" ? canAll(user, permissions) : canAny(user, permissions)
    if (!isAllowed) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

export default PermissionGuard
