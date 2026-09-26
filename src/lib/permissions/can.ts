import { User, UserType } from "@/types/users"
import { AdminPermissionsPlatform, Role } from "@/types/roles"

/**
 * Extracts the full set of effective permissions for a user.
 * Merges direct permissions and active role permissions.
 */
export function getUserPermissions(user: User | undefined): Set<AdminPermissionsPlatform> {
  if (!user) return new Set()

  const permissions = new Set<AdminPermissionsPlatform>()

  // Direct user permissions
  if (user.permissions?.length) {
    user.permissions.forEach((p) => permissions.add(p))
  }

  // Active role permissions
  if (user.roles?.length) {
    user.roles
      .filter((role) => {
        const r = role as unknown as Partial<Role>
        return !r.status || r.status === "active"
      })
      .forEach((role) => {
        role.permissions?.forEach((p) => permissions.add(p))
      })
  }

  return permissions
}

/**
 * Returns true if the user has super-admin or owner privileges that bypass granular checks.
 */
export function isSuperUser(user: User | undefined): boolean {
  if (!user) return false
  const record = user as unknown as Record<string, unknown>
  return (
    user.role === "admin" ||
    user.userType === UserType.ADMIN ||
    record.userType === "owner" ||
    record.teamRole === "owner"
  )
}

/**
 * UI-ONLY — enforced by backend per request
 * Central RBAC gatekeeper. Checks whether a user has a specific permission.
 *
 * Rules:
 * 1. Unauthenticated or unresolved users have NO permissions.
 * 2. Superusers (admin/owner) have ALL permissions.
 * 3. Users with `AdminPermissionsPlatform.ALL` have ALL permissions.
 * 4. Otherwise, user must possess the specific permission directly or via active roles.
 */
export function can(
  user: User | undefined,
  permission: AdminPermissionsPlatform
): boolean {
  if (!user || (!user.role && !user.userType)) return false
  if (isSuperUser(user)) return true

  const perms = getUserPermissions(user)
  if (perms.has(AdminPermissionsPlatform.ALL)) return true

  return perms.has(permission)
}

/**
 * UI-ONLY — enforced by backend per request
 * Checks whether a user possesses ALL of the specified permissions.
 */
export function canAll(
  user: User | undefined,
  permissions: AdminPermissionsPlatform[]
): boolean {
  if (!user || (!user.role && !user.userType)) return false
  if (isSuperUser(user)) return true
  return permissions.every((p) => can(user, p))
}

/**
 * UI-ONLY — enforced by backend per request
 * Checks whether a user possesses AT LEAST ONE of the specified permissions.
 */
export function canAny(
  user: User | undefined,
  permissions: AdminPermissionsPlatform[]
): boolean {
  if (!user || (!user.role && !user.userType)) return false
  if (isSuperUser(user)) return true
  return permissions.some((p) => can(user, p))
}
