import type { User } from "@/types/users"
import { can, isPlatformOperator } from "./can"
import { isRouteDenied } from "./routes"

/** Pages a company user can land on after signing in, best first. */
const HOMES = ["/dashboard/overview", "/dashboard/my-work", "/dashboard/timesheets", "/dashboard/projects", "/dashboard/clients"] as const

/**
 * Where a person lands: the console for the Nexora team, the portal for a
 * client contact, otherwise the first page their role can open (an employee
 * without analytics starts on My work, not on "No access").
 */
export function homePathFor(user: User | undefined): string {
  if (!user) return HOMES[0]
  if (isPlatformOperator(user)) return "/dashboard/console"
  if ((user as { clientId?: string }).clientId) return "/dashboard/portal"
  return HOMES.find((path) => !isRouteDenied(path, (p) => can(user, p))) ?? "/dashboard/help"
}
