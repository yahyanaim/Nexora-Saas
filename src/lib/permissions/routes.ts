import { AdminPermissionsPlatform as P } from "@/types/roles"

/**
 * The permission each dashboard page needs. The navigation shows a page only
 * when the role has it, and the dashboard layout refuses typed URLs to pages
 * the role lacks. Sub-pages (e.g. /dashboard/projects/123) inherit from the
 * closest listed parent. Pages not listed are open to every signed-in user.
 */
export const ROUTE_PERMISSIONS: Record<string, P> = {
  "/dashboard/my-work": P.TIME_TRACK,
  "/dashboard/team": P.TIME_APPROVE,
  "/dashboard/kpis": P.VIEW_ANALYTICS,
  "/dashboard/overview": P.VIEW_ANALYTICS,
  "/dashboard/reports": P.VIEW_ANALYTICS,
  "/dashboard/employees": P.EMPLOYEES_READ,
  "/dashboard/org-chart": P.EMPLOYEES_READ,
  "/dashboard/reviews": P.TIME_TRACK,
  "/dashboard/documents": P.EMPLOYEES_UPDATE,
  "/dashboard/access": P.EMPLOYEES_UPDATE,
  "/dashboard/clients": P.CLIENTS_READ,
  "/dashboard/portal": P.CLIENTS_UPDATE,
  "/dashboard/projects": P.PROJECTS_READ,
  "/dashboard/timesheets": P.TIME_TRACK,
  "/dashboard/time-approvals": P.TIME_APPROVE,
  "/dashboard/deals": P.CLIENTS_UPDATE,
  "/dashboard/forecast": P.INVOICES_READ,
  "/dashboard/quotes": P.INVOICES_READ,
  "/dashboard/client-invoices": P.INVOICES_READ,
  "/dashboard/recurring-invoices": P.INVOICES_CREATE,
  "/dashboard/receivables": P.INVOICES_READ,
  "/dashboard/bank-import": P.INVOICES_CREATE,
  "/dashboard/suppliers": P.INVOICES_CREATE,
  "/dashboard/supplier-bills": P.INVOICES_CREATE,
  "/dashboard/expenses": P.TIME_TRACK,
  "/dashboard/profitability": P.COSTS_READ,
  "/dashboard/timeline": P.PROJECTS_READ,
  "/dashboard/calendar": P.PROJECTS_READ,
  "/dashboard/workload": P.EMPLOYEES_READ,
  "/dashboard/resourcing": P.PROJECTS_UPDATE,
  "/dashboard/today": P.TIME_TRACK,
  "/dashboard/leave": P.TIME_TRACK,
  "/dashboard/platform": P.SUBSCRIPTIONS_READ,
  "/dashboard/users": P.USERS_READ,
  "/dashboard/staffs": P.STAFFS_READ,
  "/dashboard/banned-users": P.BANNED_USERS_READ,
  "/dashboard/plans": P.PLANS_READ,
  "/dashboard/subscriptions": P.SUBSCRIPTIONS_READ,
  "/dashboard/transactions": P.TRANSACTIONS_READ,
  "/dashboard/invoices": P.INVOICES_READ,
  "/dashboard/taxes": P.INVOICES_READ,
  "/dashboard/files": P.FILES_READ,
  "/dashboard/developer": P.PROJECTS_READ,
  "/dashboard/system-issues": P.SYSTEM_ISSUES_READ,
  "/dashboard/health": P.SYSTEM_ISSUES_READ,
  "/dashboard/incidents": P.SYSTEM_ISSUES_READ,
  "/dashboard/settings": P.ROLES_READ,
  "/dashboard/subscription": P.ROLES_READ,
  "/dashboard/roles": P.ROLES_READ,
  "/dashboard/sessions": P.SESSIONS_READ,
  "/dashboard/platform-audit": P.SESSIONS_READ,
  "/dashboard/support-desk": P.SUBSCRIPTIONS_READ,
  "/dashboard/support-access": P.SUBSCRIPTIONS_READ,
  "/dashboard/audit-logs": P.SESSIONS_READ,
}

function isUnder(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`)
}

/** The permission a path needs: its own entry, or the closest parent's. */
export function routePermission(pathname: string): P | undefined {
  let best: string | undefined
  for (const url of Object.keys(ROUTE_PERMISSIONS)) {
    if (isUnder(pathname, url) && (!best || url.length > best.length)) best = url
  }
  return best ? ROUTE_PERMISSIONS[best] : undefined
}

/** True when the path needs a permission the user does not have. */
export function isRouteDenied(pathname: string, has: (permission: P) => boolean) {
  const needed = routePermission(pathname)
  return !!needed && !has(needed)
}
