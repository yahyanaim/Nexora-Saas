import { planById } from "./nexora-catalog"
import type { CustomerAccount, LifecycleStatus } from "@/types/platform-customers"

/**
 * The customer lifecycle (cahier des charges Figure 2, CUS-07): every allowed
 * status change. Anything else is refused.
 */
export const TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  trial: ["active", "suspended", "cancelled"],
  active: ["payment_overdue", "suspended", "cancelled"],
  payment_overdue: ["active", "suspended"],
  suspended: ["active", "trial", "payment_overdue", "cancelled"],
  cancelled: ["active", "deleted"],
  deleted: [],
}

export function canTransition(from: LifecycleStatus, to: LifecycleStatus) {
  return TRANSITIONS[from].includes(to)
}

/** Trials last 14 days and can be extended once by 7 days (D-02). */
export const TRIAL_DAYS = 14
export const TRIAL_EXTENSION_DAYS = 7

export const isoDay = (d: Date) => d.toISOString().slice(0, 10)
export function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return isoDay(d)
}

/** The day the current paid period ends: the next monthly or yearly anniversary of `since` after today. */
export function periodEnd(c: Pick<CustomerAccount, "since" | "billing">, today = isoDay(new Date())) {
  const start = new Date(`${c.since}T00:00:00Z`)
  const step = c.billing === "yearly" ? 12 : 1
  const d = new Date(start)
  while (isoDay(d) <= today) d.setUTCMonth(d.getUTCMonth() + step)
  d.setUTCDate(d.getUTCDate() - 1)
  return isoDay(d)
}

/** Monthly recurring revenue before VAT: active and payment-overdue customers only (§6.2). */
export function accountMrr(c: Pick<CustomerAccount, "plan" | "billing" | "status">) {
  if (c.status !== "active" && c.status !== "payment_overdue") return 0
  const monthly = planById(c.plan).monthly
  return c.billing === "yearly" ? Math.round(((monthly * 10) / 12) * 100) / 100 : monthly
}

export function accountsSummary(list: CustomerAccount[]) {
  const live = list.filter((c) => c.status !== "cancelled" && c.status !== "deleted")
  const mrr = list.reduce((s, c) => s + accountMrr(c), 0)
  return {
    customers: live.length,
    paying: list.filter((c) => c.status === "active" || c.status === "payment_overdue").length,
    trials: list.filter((c) => c.status === "trial").length,
    overdue: list.filter((c) => c.status === "payment_overdue").length,
    suspended: list.filter((c) => c.status === "suspended").length,
    cancelled: list.filter((c) => c.status === "cancelled").length,
    mrr: Math.round(mrr * 100) / 100,
    /** "MRR at risk": what payment-overdue customers bring in (§6.2) */
    atRisk: list.filter((c) => c.status === "payment_overdue").reduce((s, c) => s + accountMrr({ ...c, status: "active" }), 0),
    arr: Math.round(mrr * 12 * 100) / 100,
    seats: live.reduce((s, c) => s + c.seatsUsed, 0),
  }
}

/** Seat limit of the customer's plan, or null when unlimited. */
export function seatLimit(c: Pick<CustomerAccount, "plan">) {
  const seats = planById(c.plan).seats
  return seats < 0 ? null : seats
}
