/** The tabs of a client's page (CRM step 4), in order; the one shown is kept in ?tab= */
export const CLIENT_PAGE_TABS = ["overview", "contacts", "followups", "deals", "billing", "projects", "contracts", "activity", "history"] as const
export type ClientPageTab = (typeof CLIENT_PAGE_TABS)[number]

/** The link to a client's page, on a tab when it isn't the first one. */
export function clientPageHref(clientId: string, tab?: ClientPageTab) {
  return `/dashboard/clients/${clientId}${tab && tab !== "overview" ? `?tab=${tab}` : ""}`
}

/** The tab named in the address, or the first one when missing, unknown or not allowed. */
export function tabFromQuery(value: string | null, allowed: readonly ClientPageTab[]): ClientPageTab {
  return allowed.find((t) => t === value) ?? "overview"
}
