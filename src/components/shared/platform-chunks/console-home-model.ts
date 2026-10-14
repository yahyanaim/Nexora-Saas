import { monthlyTable, overdueAging, trialConversion, type MonthRow } from "@/lib/platform/metrics"
import { accountMrr, addDaysIso } from "@/lib/platform/customer-lifecycle"
import type { CustomerAccount } from "@/types/platform-customers"
import type { NxInvoice } from "@/types/platform-billing"
import type { SupportRequest } from "@/types/platform-support"

/**
 * What the console home shows, read from the same metric functions as the
 * Metrics page (cahier des charges §6.2): no figure is computed another way.
 */

export const HOME_RANGES = [3, 6, 12] as const
export type HomeRange = (typeof HOME_RANGES)[number]
export const HOME_COMPARES = ["previous", "lastYear", "none"] as const
export type HomeCompare = (typeof HOME_COMPARES)[number]

export interface HomeFigures {
  /** The months of the window, oldest first */
  window: MonthRow[]
  /** The same number of months in the comparison period, month for month (the chart's dashed line) */
  previous?: MonthRow[]
  /** The month the comparison is made against, when there is one */
  reference?: MonthRow
  mrr: number
  arr: number
  /** Relative change of MRR (and ARR) against the reference month */
  mrrChange: number | null
  paying: number
  /** Customer churn of the last month of the window (0–1) */
  churn: number | null
  /** Difference in percentage points against the reference month */
  churnChange: number | null
  trials: ReturnType<typeof trialConversion>
  owed: number
  overdue: number
  overdueInvoices: number
}

export function homeFigures(invoices: NxInvoice[], accounts: CustomerAccount[], today: string, months: HomeRange, compare: HomeCompare): HomeFigures {
  const back = compare === "previous" ? months : compare === "lastYear" ? 12 : 0
  const rows = monthlyTable(invoices, accounts, today, months + back)
  const window = rows.slice(-months)
  const last = window[window.length - 1]
  const reference = back ? rows[rows.length - 1 - back] : undefined
  const mrr = last?.mrr ?? 0
  const aging = overdueAging(invoices, today)
  const late = (["d1_30", "d31_60", "over_60"] as const).map((b) => aging.buckets[b])
  return {
    window,
    previous: back ? rows.slice(0, months) : undefined,
    reference,
    mrr,
    arr: Math.round(mrr * 12 * 100) / 100,
    mrrChange: reference && reference.mrr ? (mrr - reference.mrr) / reference.mrr : null,
    paying: last?.paying ?? 0,
    churn: last?.customerChurn ?? null,
    churnChange: reference && last && reference.customerChurn !== null && last.customerChurn !== null ? (last.customerChurn - reference.customerChurn) * 100 : null,
    trials: trialConversion(accounts),
    owed: aging.total,
    overdue: Math.round(late.reduce((s, b) => s + b.amount, 0) * 100) / 100,
    overdueInvoices: late.reduce((s, b) => s + b.count, 0),
  }
}

/** Monthly recurring revenue today, grouped by plan or by country (the Customers page's own figure, accountMrr). */
export function revenueBy(accounts: CustomerAccount[], key: "plan" | "country") {
  const groups = new Map<string, { key: string; mrr: number; customers: number }>()
  for (const a of accounts) {
    const mrr = accountMrr(a)
    if (mrr <= 0) continue
    const k = a[key]
    const g = groups.get(k) ?? { key: k, mrr: 0, customers: 0 }
    g.mrr = Math.round((g.mrr + mrr) * 100) / 100
    g.customers += 1
    groups.set(k, g)
  }
  return [...groups.values()].sort((a, b) => b.mrr - a.mrr || a.key.localeCompare(b.key))
}

export type AttentionItem =
  | { kind: "overdue"; id: string; name: string; href: string; since?: string }
  | { kind: "trial"; id: string; name: string; href: string; days: number; endsOn: string }
  | { kind: "support"; id: string; name: string; href: string; number: string; subject: string }

/** What needs the team today: customers late on payment, trials ending within 7 days, urgent open support requests. */
export function attentionList(accounts: CustomerAccount[], requests: SupportRequest[], today: string): AttentionItem[] {
  const limit = addDaysIso(today, 7)
  const overdue: AttentionItem[] = accounts
    .filter((a) => a.status === "payment_overdue")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => ({ kind: "overdue", id: a.id, name: a.name, href: `/dashboard/platform/${a.id}` }))
  const trials: AttentionItem[] = accounts
    .filter((a) => a.status === "trial" && a.trialEndsOn && a.trialEndsOn >= today && a.trialEndsOn <= limit)
    .sort((a, b) => a.trialEndsOn!.localeCompare(b.trialEndsOn!))
    .map((a) => ({ kind: "trial", id: a.id, name: a.name, href: `/dashboard/platform/${a.id}`, endsOn: a.trialEndsOn!, days: Math.round((Date.parse(a.trialEndsOn!) - Date.parse(today)) / 86_400_000) }))
  const support: AttentionItem[] = requests
    .filter((r) => r.priority === "urgent" && (r.status === "open" || r.status === "waiting_customer"))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r) => ({ kind: "support", id: r.id, name: r.customerName, href: `/dashboard/support-desk?request=${r.id}`, number: r.number, subject: r.subject }))
  return [...overdue, ...trials, ...support]
}
