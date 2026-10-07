/**
 * Pages of the Nexora platform console (the company that sells Nexora), not
 * of the ERP a customer uses. They are hidden from company users and guarded
 * when opened directly. UI-only: the server checks the same rule.
 */
export const PLATFORM_PATHS = [
  "/dashboard/platform",
  "/dashboard/users",
  "/dashboard/staffs",
  "/dashboard/banned-users",
  "/dashboard/plans",
  "/dashboard/subscriptions",
  "/dashboard/transactions",
  "/dashboard/invoices",
  "/dashboard/taxes",
  "/dashboard/content-reports",
  "/dashboard/system-issues",
  "/dashboard/roles",
  "/dashboard/sessions",
  "/dashboard/platform-audit",
]

/** True when a path (with or without the locale prefix) is a platform console page. */
export function isPlatformPath(pathname: string) {
  const path = pathname.replace(/^\/[a-z]{2}(?=\/)/, "")
  return PLATFORM_PATHS.some((p) => path === p || path.startsWith(`${p}/`))
}
