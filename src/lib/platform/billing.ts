/**
 * Nexora's own billing rules (cahier des charges §5.2–5.6, §6, BR-02 to BR-10).
 * Pure functions: the console, the demo store and the tests share them, and
 * the server will apply the same formulas.
 */

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export interface InvoiceLine {
  label: string
  quantity: number
  /** Before VAT, MAD */
  unitPrice: number
  /** Percent, e.g. 20 */
  vatRate: number
}

/** BR-06: VAT is computed per line, then rounded per rate; totals recompute to the cent. */
export function invoiceTotals(lines: InvoiceLine[]) {
  const byRate = new Map<number, number>()
  let subtotal = 0
  for (const l of lines) {
    const amount = round2(l.quantity * l.unitPrice)
    subtotal = round2(subtotal + amount)
    byRate.set(l.vatRate, round2((byRate.get(l.vatRate) ?? 0) + amount))
  }
  const vatByRate = [...byRate.entries()].map(([rate, base]) => ({ rate, base, vat: round2((base * rate) / 100) }))
  const vat = round2(vatByRate.reduce((s, r) => s + r.vat, 0))
  return { subtotal, vat, total: round2(subtotal + vat), vatByRate }
}

/** BR-03: NX-YYYY-NNNNN for invoices, AV-YYYY-NNNNN for credit notes, sequential per calendar year, no gaps. */
export function nextNumber(prefix: "NX" | "AV", year: number, existing: string[]) {
  const head = `${prefix}-${year}-`
  const max = existing.filter((n) => n.startsWith(head)).reduce((m, n) => Math.max(m, Number(n.slice(head.length)) || 0), 0)
  return `${head}${String(max + 1).padStart(5, "0")}`
}

const DAY = 86_400_000
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)
export const isoOf = (d: Date) => d.toISOString().slice(0, 10)
export const daysBetween = (from: string, to: string) => Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY)
export function addDays(iso: string, n: number) {
  return isoOf(new Date(toDate(iso).getTime() + n * DAY))
}
export function addMonths(iso: string, n: number) {
  const d = toDate(iso)
  d.setUTCMonth(d.getUTCMonth() + n)
  return isoOf(d)
}

/** The period that starts on `start`: one month or twelve, ending the day before the next start. */
export function periodFrom(start: string, billing: "monthly" | "yearly") {
  const next = addMonths(start, billing === "yearly" ? 12 : 1)
  return { start, end: addDays(next, -1), next }
}

/**
 * §6.4: an upgrade on day d of a period of D days is charged
 * (new − old) × (D − d + 1) / D before VAT, rounded to the cent.
 * Downgrades give no credit (they apply at renewal).
 */
export function proration(oldPrice: number, newPrice: number, periodStart: string, periodEnd: string, changeDay: string) {
  const D = daysBetween(periodStart, periodEnd) + 1
  const d = daysBetween(periodStart, changeDay) + 1
  if (newPrice <= oldPrice || d < 1 || d > D) return { amount: 0, days: D, remaining: 0 }
  const remaining = D - d + 1
  return { amount: round2(((newPrice - oldPrice) * remaining) / D), days: D, remaining }
}

/** Price per period: yearly billing charges ten months for twelve (§6.1). */
export const periodPrice = (monthly: number, billing: "monthly" | "yearly") => (billing === "yearly" ? monthly * 10 : monthly)

export interface PlanVersionLike {
  plan: string
  monthly: number
  /** yyyy-mm-dd */
  effectiveFrom: string
}

/** BR-02: the version in force on a date for a plan (the latest one that has started). */
export function versionOn<T extends PlanVersionLike>(versions: T[], plan: string, on: string): T | undefined {
  return versions
    .filter((v) => v.plan === plan && v.effectiveFrom <= on)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
}

/**
 * BR-08 (D-03): reminders on days 0, 3 and 7, card retries on days 1, 3 and 7,
 * warning on day 12, read-only from day 14, suspension on day 30,
 * cancellation proposed to the team on day 45 (never automatic).
 */
export const DUNNING = { reminders: [0, 3, 7], retries: [1, 3, 7], warning: 12, readOnly: 14, suspend: 30, proposeCancel: 45 } as const

export type DunningStage = "reminders" | "read_only" | "suspended" | "cancel_proposed"

export function dunningStage(days: number): DunningStage {
  if (days >= DUNNING.proposeCancel) return "cancel_proposed"
  if (days >= DUNNING.suspend) return "suspended"
  if (days >= DUNNING.readOnly) return "read_only"
  return "reminders"
}

/** Every dunning action due on days 0..`days`, for an idempotent run (NFR-04). */
export function dunningActionsUpTo(days: number) {
  const out: { day: number; kind: "reminder" | "retry" | "warning" | "read_only" | "suspend" | "propose_cancel" }[] = []
  for (const d of DUNNING.reminders) if (d <= days) out.push({ day: d, kind: "reminder" })
  for (const d of DUNNING.retries) if (d <= days) out.push({ day: d, kind: "retry" })
  if (DUNNING.warning <= days) out.push({ day: DUNNING.warning, kind: "warning" })
  if (DUNNING.readOnly <= days) out.push({ day: DUNNING.readOnly, kind: "read_only" })
  if (DUNNING.suspend <= days) out.push({ day: DUNNING.suspend, kind: "suspend" })
  if (DUNNING.proposeCancel <= days) out.push({ day: DUNNING.proposeCancel, kind: "propose_cancel" })
  return out.sort((a, b) => a.day - b.day)
}

/**
 * PAY-03: a bank transfer matches an open invoice when its reference contains
 * the invoice number and the amount equals what is still owed.
 */
export function matchTransfer<T extends { id: string; number: string; balance: number }>(transfer: { reference: string; amount: number }, open: T[]): T | null {
  const ref = transfer.reference.toUpperCase().replace(/\s+/g, "")
  return open.find((i) => ref.includes(i.number.toUpperCase()) && round2(i.balance) === round2(transfer.amount)) ?? null
}

/** INV-08 (D-04): card invoices are due on issue, bank transfers after 15 days. */
export const dueDate = (issued: string, method: "card" | "transfer") => (method === "card" ? issued : addDays(issued, 15))

/** PAY-07, BR-10 (D-06): refunds above this amount, VAT included, need a second person. */
export const REFUND_SECOND_APPROVAL_ABOVE = 1000
