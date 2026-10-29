import { isDemoMode } from "@/lib/auth/demo-mode"

/**
 * Every page of the app, as its address after the language (`/en`, `/ar`…).
 * The proxy answers 404 for anything else before the page starts streaming,
 * so an unknown address gets a real 404 status, not a 200 (see the Next.js
 * streaming guide, "Status codes"). A test keeps this list equal to the
 * `page.tsx` files under `src/app/[locale]`.
 */
export const APP_ROUTES = [
  "/",
  "/auth",
  "/billing",
  "/billing/success",
  "/dashboard",
  "/dashboard/access",
  "/dashboard/audit-logs",
  "/dashboard/bank-import",
  "/dashboard/banned-users",
  "/dashboard/calendar",
  "/dashboard/client-invoices",
  "/dashboard/clients",
  "/dashboard/clients/[id]",
  "/dashboard/clients/import",
  "/dashboard/console",
  "/dashboard/console-settings",
  "/dashboard/contacts",
  "/dashboard/data-requests",
  "/dashboard/deals",
  "/dashboard/developer",
  "/dashboard/documents",
  "/dashboard/employees",
  "/dashboard/expenses",
  "/dashboard/files",
  "/dashboard/follow-ups",
  "/dashboard/forecast",
  "/dashboard/health",
  "/dashboard/help",
  "/dashboard/incidents",
  "/dashboard/invoices",
  "/dashboard/kpis",
  "/dashboard/leads",
  "/dashboard/leave",
  "/dashboard/metrics",
  "/dashboard/my-work",
  "/dashboard/org-chart",
  "/dashboard/overview",
  "/dashboard/plans",
  "/dashboard/platform",
  "/dashboard/platform-audit",
  "/dashboard/platform/[id]",
  "/dashboard/portal",
  "/dashboard/profitability",
  "/dashboard/projects",
  "/dashboard/projects/[id]",
  "/dashboard/quotes",
  "/dashboard/receivables",
  "/dashboard/reconciliation",
  "/dashboard/recurring-invoices",
  "/dashboard/reports",
  "/dashboard/requests",
  "/dashboard/resourcing",
  "/dashboard/reviews",
  "/dashboard/roles",
  "/dashboard/sessions",
  "/dashboard/settings",
  "/dashboard/staffs",
  "/dashboard/subscription",
  "/dashboard/subscriptions",
  "/dashboard/supplier-bills",
  "/dashboard/suppliers",
  "/dashboard/support-access",
  "/dashboard/support-desk",
  "/dashboard/system-issues",
  "/dashboard/taxes",
  "/dashboard/team",
  "/dashboard/time-approvals",
  "/dashboard/timeline",
  "/dashboard/timesheets",
  "/dashboard/today",
  "/dashboard/transactions",
  "/dashboard/users",
  "/dashboard/workload",
  "/plans",
  "/subscriptions",
] as const

/**
 * Pages that exist only in demo mode. The Developer page (API keys and webhooks)
 * belongs to the public-API phase, so a real deployment answers 404 for it
 * (backend cahier des charges, decision B9).
 */
export const DEMO_ONLY_ROUTES: readonly string[] = ["/dashboard/developer"]

const toPattern = (route: string) => new RegExp(`^${route.replace(/\[[^\]/]+\]/g, "[^/]+")}/?$`)
const PATTERNS = APP_ROUTES.map(toPattern)
const DEMO_ONLY = DEMO_ONLY_ROUTES.map(toPattern)

/** True when the address (without its language) is one of the app's pages; demo-only pages count only in demo mode. */
export const isKnownRoute = (path: string, demo = isDemoMode()) => {
  const p = path || "/"
  if (!demo && DEMO_ONLY.some((pattern) => pattern.test(p))) return false
  return PATTERNS.some((pattern) => pattern.test(p))
}
