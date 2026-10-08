import { createCollection } from "@/lib/workforce/demo-store"
import { consoleCan } from "@/lib/platform/console-roles"
import { NEXORA_CUSTOMERS, NEXORA_VAT_RATE, planById, type NexoraPlanId } from "@/lib/platform/nexora-catalog"
import { syncPlanContent } from "./platform-plans-api"
import {
  REFUND_SECOND_APPROVAL_ABOVE,
  addDays,
  daysBetween,
  dueDate,
  dunningActionsUpTo,
  invoiceTotals,
  isoOf,
  matchTransfer,
  nextNumber,
  periodFrom,
  periodPrice,
  proration,
  round2,
  versionOn,
  type InvoiceLine,
} from "@/lib/platform/billing"
import { ConsoleCapability as C, ConsoleRole } from "@/types/platform-console"
import type { CustomerAccount } from "@/types/platform-customers"
import type { DunningRun, NxCreditNote, NxInvoice, NxPayment, NxRefund, NxSubscription, PlanVersion, SubscriptionDiscount, TaxRate } from "@/types/platform-billing"
import { PLATFORM_WS, audit, auditCustomer, type ConsoleActor } from "./platform-console-api"
import { recordAudit } from "@/lib/workforce/audit"
import { customersCollection, seatsInUse } from "./platform-customers-api"
import { sellerSnapshot } from "./platform-config-api"

/**
 * Nexora's billing of its customers (cahier des charges §5.2–5.6, Lot A3), on
 * demo data. Every function takes `today` so the reference scenario (§13.2)
 * can be replayed with its own dates; the server runs the same rules.
 */

const today0 = () => isoOf(new Date())
const PLAN_IDS: NexoraPlanId[] = ["starter", "business", "enterprise"]
const vatRateFor = (country: string) => (country === "MA" ? NEXORA_VAT_RATE : 0)
const stamp = () => {
  const now = new Date().toISOString()
  return { workspaceId: PLATFORM_WS, createdAt: now, updatedAt: now }
}

/* ---------- seeds: built from the catalogue, dates relative to today ---------- */

const seedVersions = (): PlanVersion[] =>
  PLAN_IDS.map((plan) => ({ ...stamp(), id: `ver_${plan}_1`, plan, monthly: planById(plan).monthly, effectiveFrom: "2024-01-01", existing: "keep", createdBy: "Sophia Vance" }))

/** Current period of a customer that started on `since`. */
function currentPeriod(since: string, billing: "monthly" | "yearly", today: string) {
  let p = periodFrom(since, billing)
  while (p.end < today) p = periodFrom(p.next, billing)
  return p
}

const seedSubscriptions = (): NxSubscription[] => {
  const today = today0()
  return NEXORA_CUSTOMERS.filter((c) => c.status === "active" || c.status === "past_due").map((c) => {
    const p = currentPeriod(c.since, c.billing, today)
    return {
      ...stamp(), id: `sub_${c.id}`, customerId: c.id, plan: c.plan, versionId: `ver_${c.plan}_1`, billing: c.billing,
      method: c.id === "cus_bina" || c.id === "cus_tanger" ? "transfer" : "card", periodStart: p.start, periodEnd: p.end,
      history: [{ at: `${c.since}T09:00:00.000Z`, by: "System", kind: "started", to: c.plan }],
    } satisfies NxSubscription
  })
}

/** PLA-08: what a discount takes off one invoice before VAT. */
export function discountAmount(d: Pick<SubscriptionDiscount, "kind" | "value">, base: number) {
  return round2(Math.min(base, d.kind === "percent" ? (base * d.value) / 100 : d.value))
}

/** Lines of a subscription invoice (INV-03), with the discount as its own line and reason (PLA-08). */
function subscriptionLines(plan: NexoraPlanId, billing: "monthly" | "yearly", monthly: number, country: string, from: string, to: string, discount?: SubscriptionDiscount): InvoiceLine[] {
  const rate = vatRateFor(country)
  const base = periodPrice(monthly, billing)
  const lines: InvoiceLine[] = [{
    label: `Nexora ${planById(plan).name} · ${billing === "yearly" ? "12 months (10 charged)" : "1 month"} · ${from} → ${to}${rate === 0 ? " · exported service" : ""}`,
    quantity: 1, unitPrice: base, vatRate: rate,
  }]
  if (discount && discount.invoicesLeft !== 0) {
    lines.push({ label: `Discount ${discount.kind === "percent" ? `${discount.value}%` : `${discount.value} MAD`} · ${discount.reason}`, quantity: 1, unitPrice: -discountAmount(discount, base), vatRate: rate })
  }
  return lines
}

let seeded: { invoices: NxInvoice[]; payments: NxPayment[]; dunning: DunningRun[] } | null = null
function seedBilling() {
  if (seeded) return seeded
  const today = today0()
  const drafts: Omit<NxInvoice, "number">[] = []
  const monthBack = (iso: string) => isoOf(new Date(new Date(`${iso}T00:00:00Z`).setUTCMonth(new Date(`${iso}T00:00:00Z`).getUTCMonth() - 1)))
  for (const c of NEXORA_CUSTOMERS) {
    // trials, and trials that ended without a subscription, were never invoiced
    if (c.status === "trial" || (c.trialStartedOn && !c.convertedOn)) continue
    // the last period of a cancelled customer ends at its cancellation; others run up to today
    const until = c.status === "cancelled" ? addDays(c.cancelledOn ?? addDays(c.since, 60), -1) : today
    const periods: { start: string; end: string }[] = []
    let p = currentPeriod(c.since, c.billing, until)
    // a year of history for monthly plans, two years for yearly ones (the metrics show twelve months)
    const back = c.billing === "yearly" ? 2 : 13
    for (let i = 0; i < back; i++) {
      periods.unshift(p)
      const prevStart = c.billing === "yearly" ? addDays(p.start, -365) : monthBack(p.start)
      if (prevStart < c.since) break
      p = periodFrom(prevStart, c.billing)
    }
    const method = c.id === "cus_bina" || c.id === "cus_tanger" ? "transfer" : "card"
    periods.forEach((p, i) => {
      const plan = c.previousPlan && c.planChangedOn && p.start < c.planChangedOn ? c.previousPlan : c.plan
      const lines = subscriptionLines(plan, c.billing, planById(plan).monthly, c.country, p.start, p.end)
      const t = invoiceTotals(lines)
      const latest = i === periods.length - 1
      const overdue = c.status === "past_due" && latest
      drafts.push({
        ...stamp(), id: `nxi_${c.id}_${i}`, customerId: c.id, customerName: c.name, customerIce: c.ice, kind: "subscription",
        date: p.start, dueDate: dueDate(p.start, method), periodFrom: p.start, periodTo: p.end, lines, ...t,
        paid: overdue ? 0 : t.total, credited: 0, status: overdue ? "overdue" : "paid", einvoice: c.country === "MA" ? "accepted" : "sent",
        ...(overdue ? { failedOn: addDays(today, -5) } : {}),
      })
    })
  }
  drafts.sort((a, b) => a.date.localeCompare(b.date) || a.customerName.localeCompare(b.customerName))
  const numbers: string[] = []
  const seller = sellerSnapshot()
  const invoices = drafts.map((d) => {
    const number = nextNumber("NX", Number(d.date.slice(0, 4)), numbers)
    numbers.push(number)
    return { ...d, number, seller }
  })
  const payments: NxPayment[] = invoices.flatMap((i): NxPayment[] => {
    const method = i.customerId === "cus_bina" || i.customerId === "cus_tanger" ? "transfer" : "card"
    if (i.status === "paid") return [{ ...stamp(), id: `pay_${i.id}`, customerId: i.customerId, customerName: i.customerName, invoiceId: i.id, invoiceNumber: i.number, method, amount: i.total, date: method === "card" ? i.date : addDays(i.date, 6), status: "succeeded", reference: method === "card" ? `ch_${i.id.slice(-6)}` : `VIR ${i.number}` } satisfies NxPayment]
    return [{ ...stamp(), id: `pay_${i.id}_f`, customerId: i.customerId, customerName: i.customerName, invoiceId: i.id, invoiceNumber: i.number, method: "card", amount: i.total, date: i.failedOn!, status: "failed", reference: "card_declined" } satisfies NxPayment]
  })
  payments.push({ ...stamp(), id: "pay_unmatched_1", method: "transfer", amount: 588, date: addDays(today, -2), status: "unmatched", reference: "VIREMENT TLC SARL AVRIL", payer: "TLC SARL" })
  const overdue = invoices.find((i) => i.status === "overdue")
  const dunning: DunningRun[] = overdue
    ? dunningActionsUpTo(daysBetween(overdue.failedOn!, today)).map((a) => ({ ...stamp(), id: `dun_${overdue.id}_${a.day}_${a.kind}`, invoiceId: overdue.id, day: a.day, kind: a.kind, date: addDays(overdue.failedOn!, a.day), result: a.kind === "retry" ? "declined" : "sent" }))
    : []
  seeded = { invoices, payments, dunning }
  return seeded
}

const seedTaxes = (): TaxRate[] => [
  { ...stamp(), id: "tax_ma_20", label: "TVA Maroc, taux normal (services)", rate: 20, from: "2007-01-01", reference: "CGI art. 98" },
  { ...stamp(), id: "tax_export_0", label: "Services exportés (à confirmer avec le comptable, D-05)", rate: 0, from: "2026-01-01", reference: "CGI art. 92-I-1°" },
]

const versions = createCollection<PlanVersion>("platform-plan-versions", "ver", seedVersions)
const subscriptions = createCollection<NxSubscription>("platform-subscriptions", "sub", seedSubscriptions)
const invoices = createCollection<NxInvoice>("platform-invoices", "nxi", () => seedBilling().invoices)
const creditNotes = createCollection<NxCreditNote>("platform-credit-notes", "nxc", () => [])
const payments = createCollection<NxPayment>("platform-payments", "pay", () => seedBilling().payments)
const refunds = createCollection<NxRefund>("platform-refunds", "ref", () => [])
const dunningRuns = createCollection<DunningRun>("platform-dunning", "dun", () => seedBilling().dunning)
const taxes = createCollection<TaxRate>("platform-taxes", "tax", seedTaxes)

const ERR_FORBIDDEN = "Your console role does not allow this"
const need = (actor: ConsoleActor, cap: C) => {
  if (!consoleCan(actor.role, cap)) throw new Error(ERR_FORBIDDEN)
}
const customer = (id: string) => {
  const c = customersCollection.get(PLATFORM_WS, id)
  if (!c || c.status === "deleted") throw new Error("This customer no longer exists")
  return c
}
const setCustomer = (id: string, patch: Partial<CustomerAccount>) => customersCollection.update(PLATFORM_WS, id, patch)
const priceOf = (sub: Pick<NxSubscription, "versionId">) => versions.get(PLATFORM_WS, sub.versionId)?.monthly ?? 0

/* ---------- reads ---------- */

export const listPlanVersionsApi = async () => {
  syncPlanContent()
  return [...versions.list(PLATFORM_WS)].sort((a, b) => a.plan.localeCompare(b.plan) || b.effectiveFrom.localeCompare(a.effectiveFrom))
}
export const listSubscriptionsApi = async () => {
  syncPlanContent()
  return subscriptions.list(PLATFORM_WS)
}
export const listInvoicesApi = async () => [...invoices.list(PLATFORM_WS)].sort((a, b) => b.number.localeCompare(a.number))
export const listCreditNotesApi = async () => [...creditNotes.list(PLATFORM_WS)].sort((a, b) => b.number.localeCompare(a.number))
export const listPaymentsApi = async () => [...payments.list(PLATFORM_WS)].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
export const listRefundsApi = async () => refunds.list(PLATFORM_WS)
export const listDunningApi = async () => dunningRuns.list(PLATFORM_WS)
export const listTaxRatesApi = async () => taxes.list(PLATFORM_WS)

/* ---------- plans (§5.2) ---------- */

/** PLA-03, PLA-05: a price change is a new version with an effective date; owners only. */
export async function createPlanVersionApi(actor: ConsoleActor, input: { plan: NexoraPlanId; monthly: number; effectiveFrom: string; existing: "keep" | "move_at_renewal" }, today = today0()): Promise<PlanVersion> {
  need(actor, C.CHANGE_PLANS)
  if (!(input.monthly > 0)) throw new Error("Enter a price above zero")
  if (input.effectiveFrom < today) throw new Error("The new price starts today or later")
  if (versions.list(PLATFORM_WS).some((v) => v.plan === input.plan && v.effectiveFrom === input.effectiveFrom)) throw new Error("A price already starts on that day")
  const current = versionOn(versions.list(PLATFORM_WS), input.plan, today)
  const created = versions.create(PLATFORM_WS, { plan: input.plan, monthly: round2(input.monthly), effectiveFrom: input.effectiveFrom, existing: input.existing, createdBy: actor.name })
  audit(actor, "plan.version_created", "subscription", `${planById(input.plan).name} · from ${input.effectiveFrom}`, { before: current ? `${current.monthly} MAD` : undefined, after: `${created.monthly} MAD · ${input.existing}` })
  return created
}

/* ---------- invoices and collection ---------- */

function issueInvoice(c: CustomerAccount, kind: NxInvoice["kind"], lines: InvoiceLine[], from: string, to: string, method: "card" | "transfer", date: string) {
  const year = Number(date.slice(0, 4))
  const number = nextNumber("NX", year, invoices.list(PLATFORM_WS).map((i) => i.number))
  const t = invoiceTotals(lines)
  return invoices.create(PLATFORM_WS, {
    number, customerId: c.id, customerName: c.name, customerIce: c.ice, kind, date, dueDate: dueDate(date, method), periodFrom: from, periodTo: to,
    lines, ...t, paid: 0, credited: 0, status: "issued", einvoice: "to_send", seller: sellerSnapshot(),
  })
}

const balanceOf = (i: NxInvoice) => round2(i.total - i.paid - i.credited)

/** Records money received against an invoice and restores the customer when nothing is overdue any more (PAY-06). */
function applyPayment(i: NxInvoice, amount: number, method: "card" | "transfer", date: string, reference: string) {
  const paid = round2(i.paid + amount)
  const status: NxInvoice["status"] = round2(i.total - paid - i.credited) <= 0 ? "paid" : "partly_paid"
  invoices.update(PLATFORM_WS, i.id, { paid, status, failedOn: status === "paid" ? undefined : i.failedOn })
  const pay = payments.create(PLATFORM_WS, { customerId: i.customerId, customerName: i.customerName, invoiceId: i.id, invoiceNumber: i.number, method, amount, date, status: "succeeded", reference })
  const c = customersCollection.get(PLATFORM_WS, i.customerId)
  const stillOverdue = invoices.list(PLATFORM_WS).some((x) => x.customerId === i.customerId && x.status === "overdue")
  if (c && !stillOverdue && (c.status === "payment_overdue" || (c.status === "suspended" && c.suspension?.reason.startsWith("Unpaid")))) {
    setCustomer(c.id, { status: "active", readOnly: false, suspension: undefined })
  }
  return pay
}

/** A card attempt: succeeds, or fails and starts dunning (PAY-04). */
function collectByCard(i: NxInvoice, date: string, outcome: "ok" | "declined") {
  if (outcome === "ok") return applyPayment(i, balanceOf(i), "card", date, `ch_${i.number}`)
  invoices.update(PLATFORM_WS, i.id, { status: "overdue", failedOn: i.failedOn ?? date })
  payments.create(PLATFORM_WS, { customerId: i.customerId, customerName: i.customerName, invoiceId: i.id, invoiceNumber: i.number, method: "card", amount: balanceOf(i), date, status: "failed", reference: "card_declined" })
  const c = customersCollection.get(PLATFORM_WS, i.customerId)
  if (c && c.status === "active") setCustomer(c.id, { status: "payment_overdue" })
  return null
}

/* ---------- subscriptions (§5.3) ---------- */

/** A trial chooses a plan (scenario step 2): first invoice, collected now by card, or due in 15 days by transfer. */
export async function startSubscriptionApi(actor: ConsoleActor, customerId: string, input: { plan: NexoraPlanId; billing: "monthly" | "yearly"; method: "card" | "transfer" }, today = today0(), cardOutcome: "ok" | "declined" = "ok") {
  need(actor, C.CHANGE_SUBSCRIPTION)
  const c = customer(customerId)
  if (subscriptions.list(PLATFORM_WS).some((s) => s.customerId === customerId)) throw new Error("This customer already has a subscription")
  if (c.status !== "trial" && c.status !== "cancelled") throw new Error("This status change is not allowed")
  const version = versionOn(versions.list(PLATFORM_WS), input.plan, today)!
  const p = periodFrom(today, input.billing)
  const sub = subscriptions.create(PLATFORM_WS, {
    customerId, plan: input.plan, versionId: version.id, billing: input.billing, method: input.method, periodStart: p.start, periodEnd: p.end,
    history: [{ at: new Date().toISOString(), by: actor.name, kind: "started", to: input.plan }],
  })
  setCustomer(customerId, { status: "active", plan: input.plan, billing: input.billing, readOnly: false, trialEndsOn: undefined, cancelsOn: undefined, since: c.status === "trial" ? today : c.since, ...(c.status === "trial" ? { trialStartedOn: c.trialStartedOn ?? c.since, convertedOn: today } : {}) })
  const inv = issueInvoice(customer(customerId), "subscription", subscriptionLines(input.plan, input.billing, version.monthly, c.country, p.start, p.end), p.start, p.end, input.method, today)
  if (input.method === "card") collectByCard(inv, today, cardOutcome)
  audit(actor, "subscription.started", "subscription", c.name, { after: `${planById(input.plan).name} · ${input.billing} · ${input.method}`, customerId })
  return { subscription: sub, invoice: invoices.get(PLATFORM_WS, inv.id)! }
}

/** SUB-02 to SUB-04: upgrades now with a prorated invoice; downgrades wait for the renewal; never below the seats in use. */
export async function changePlanApi(actor: ConsoleActor, customerId: string, plan: NexoraPlanId, today = today0(), cardOutcome: "ok" | "declined" = "ok") {
  need(actor, C.CHANGE_SUBSCRIPTION)
  return changePlanCore({ actor }, customerId, plan, today, cardOutcome)
}

async function changePlanCore(by: ChangedBy, customerId: string, plan: NexoraPlanId, today: string, cardOutcome: "ok" | "declined") {
  const c = customer(customerId)
  const sub = subscriptions.list(PLATFORM_WS).find((s) => s.customerId === customerId)
  if (!sub) throw new Error("This customer has no subscription yet")
  if (plan === sub.plan) return { subscription: sub, invoice: null }
  const oldPrice = priceOf(sub)
  const version = versionOn(versions.list(PLATFORM_WS), plan, today)!
  const upgrade = version.monthly > oldPrice
  if (!upgrade) {
    const seats = planById(plan).seats
    const allowed = seats > 0 ? seats + (c.extraSeats && c.extraSeatsUntil && c.extraSeatsUntil >= today ? c.extraSeats : 0) : seats
    const used = await seatsInUse(c)
    if (seats > 0 && used > allowed) throw new Error(`Free ${used - allowed} seats before this downgrade`)
    const updated = subscriptions.update(PLATFORM_WS, sub.id, { scheduledPlan: plan, history: [...sub.history, { at: new Date().toISOString(), by: nameOf(by), kind: "downgrade_scheduled", from: sub.plan, to: plan }] })
    record(by, c, "plan", sub.plan, `${plan} at renewal (${addDays(sub.periodEnd, 1)})`)
    return { subscription: updated, invoice: null }
  }
  const pr = proration(periodPrice(oldPrice, sub.billing), periodPrice(version.monthly, sub.billing), sub.periodStart, sub.periodEnd, today)
  const updated = subscriptions.update(PLATFORM_WS, sub.id, { plan, versionId: version.id, scheduledPlan: undefined, history: [...sub.history, { at: new Date().toISOString(), by: nameOf(by), kind: "upgraded", from: sub.plan, to: plan }] })
  setCustomer(customerId, { plan })
  let inv: NxInvoice | null = null
  if (pr.amount > 0) {
    inv = issueInvoice(c, "proration", [{ label: `Upgrade ${planById(sub.plan).name} → ${planById(plan).name} · ${pr.remaining}/${pr.days} days · ${today} → ${sub.periodEnd}`, quantity: 1, unitPrice: pr.amount, vatRate: vatRateFor(c.country) }], today, sub.periodEnd, sub.method, today)
    if (sub.method === "card") collectByCard(inv, today, cardOutcome)
    inv = invoices.get(PLATFORM_WS, inv.id)!
  }
  record(by, c, "plan", sub.plan, `${plan}${inv ? ` · ${inv.number}` : ""}`)
  return { subscription: updated, invoice: inv }
}

/**
 * The daily billing jobs (SUB-06, PAY-04, BR-08), idempotent (NFR-04):
 * renew every subscription whose period ended, then run the dunning steps due.
 */
export async function runBillingJobsApi(actor: ConsoleActor, today = today0(), cardOutcome: "ok" | "declined" = "ok") {
  if (![ConsoleRole.OWNER, ConsoleRole.ADMIN, ConsoleRole.FINANCE, ConsoleRole.ENGINEERING].includes(actor.role)) throw new Error(ERR_FORBIDDEN)
  let renewed = 0
  let steps = 0
  for (const sub of subscriptions.list(PLATFORM_WS)) {
    let s = sub
    while (s.periodEnd < today) {
      const c = customersCollection.get(PLATFORM_WS, s.customerId)
      if (!c || c.status === "cancelled" || c.status === "deleted") break
      if (c.cancelsOn && c.cancelsOn <= s.periodEnd) {
        setCustomer(c.id, { status: "cancelled", readOnly: true, cancelsOn: undefined, cancelledOn: c.cancelsOn })
        break
      }
      const plan = s.scheduledPlan ?? s.plan
      const current = versions.get(PLATFORM_WS, s.versionId)
      const latest = versionOn(versions.list(PLATFORM_WS), plan, addDays(s.periodEnd, 1))!
      // BR-02 / PLA-04: keep the old price unless the change moves existing customers
      const version = plan !== s.plan || latest.existing === "move_at_renewal" || !current ? latest : current
      const billing = s.scheduledBilling ?? s.billing
      const p = periodFrom(addDays(s.periodEnd, 1), billing)
      const discount = s.discount && s.discount.invoicesLeft !== 0 ? s.discount : undefined
      const nextDiscount = discount ? (discount.invoicesLeft === null ? discount : discount.invoicesLeft > 1 ? { ...discount, invoicesLeft: discount.invoicesLeft - 1 } : undefined) : undefined
      s = subscriptions.update(PLATFORM_WS, s.id, {
        plan, versionId: version.id, scheduledPlan: undefined, billing, scheduledBilling: undefined, discount: nextDiscount, periodStart: p.start, periodEnd: p.end,
        history: [...s.history, { at: new Date().toISOString(), by: "Billing jobs", kind: plan !== s.plan ? "downgraded" : "renewed", from: s.plan, to: plan }],
      })
      setCustomer(c.id, { plan, billing, mrrDiscount: mrrDiscountOf(nextDiscount, version.monthly, billing) })
      const inv = issueInvoice(customer(c.id), "subscription", subscriptionLines(plan, billing, version.monthly, c.country, p.start, p.end, discount), p.start, p.end, s.method, p.start)
      if (s.method === "card") collectByCard(inv, p.start, cardOutcome)
      renewed++
    }
  }
  for (const inv of invoices.list(PLATFORM_WS).filter((i) => i.status === "overdue" && i.failedOn)) {
    const days = daysBetween(inv.failedOn!, today)
    const done = new Set(dunningRuns.list(PLATFORM_WS).filter((d) => d.invoiceId === inv.id).map((d) => `${d.day}_${d.kind}`))
    for (const a of dunningActionsUpTo(days)) {
      if (done.has(`${a.day}_${a.kind}`)) continue
      const date = addDays(inv.failedOn!, a.day)
      let result = "sent"
      const c = customersCollection.get(PLATFORM_WS, inv.customerId)
      if (a.kind === "retry") {
        const fresh = invoices.get(PLATFORM_WS, inv.id)!
        if (fresh.status !== "overdue") break
        result = cardOutcome === "ok" ? "paid" : "declined"
        if (cardOutcome === "ok") applyPayment(fresh, balanceOf(fresh), "card", date, `ch_retry_${inv.number}`)
        else payments.create(PLATFORM_WS, { customerId: inv.customerId, customerName: inv.customerName, invoiceId: inv.id, invoiceNumber: inv.number, method: "card", amount: balanceOf(fresh), date, status: "failed", reference: "card_declined" })
      }
      if (a.kind === "read_only" && c) setCustomer(c.id, { readOnly: true })
      if (a.kind === "suspend" && c && (c.status === "payment_overdue")) {
        setCustomer(c.id, { status: "suspended", readOnly: true, suspension: { reason: `Unpaid invoice ${inv.number}`, previous: "payment_overdue", by: "Billing jobs", at: new Date().toISOString() } })
      }
      dunningRuns.create(PLATFORM_WS, { invoiceId: inv.id, day: a.day, kind: a.kind, date, result })
      steps++
      if (invoices.get(PLATFORM_WS, inv.id)!.status !== "overdue") break
    }
  }
  audit(actor, "billing.jobs_run", "console", `${renewed} renewals · ${steps} dunning steps`, { after: today })
  return { renewed, steps }
}

export { listPlanContentApi, updatePlanContentApi, syncPlanContent } from "./platform-plans-api"

/* ---------- subscription changes (SUB-05, SUB-07, SUB-10, PLA-08) ---------- */

/** A change made by a team member, or by the company administrator from My subscription. */
export type ChangedBy = { actor: ConsoleActor } | { person: { name: string; email: string } }
const nameOf = (by: ChangedBy) => ("actor" in by ? by.actor.name : by.person.name)
function record(by: ChangedBy, c: CustomerAccount, label: string, before?: string, after?: string) {
  if ("actor" in by) audit(by.actor, "subscription.changed", "subscription", `${c.name} · ${label}`, { before, after, customerId: c.id })
  else auditCustomer(by.person, c.id, "subscription.changed", `${c.name} · ${label}`, { before, after, targetType: "subscription" })
  // the company sees the same change in its own audit log
  if (c.demoWorkspaceId) recordAudit(c.demoWorkspaceId, { action: "Subscription changed", actionKey: "subscription.changed", category: "Billing", target: `Nexora subscription · ${label}`, before, after, actor: { id: "actor" in by ? by.actor.id : by.person.email, name: nameOf(by), email: "actor" in by ? `${by.actor.id}@nexora.io` : by.person.email } })
}
const subOf = (customerId: string) => {
  const s = subscriptions.list(PLATFORM_WS).find((x) => x.customerId === customerId)
  if (!s) throw new Error("This customer has no subscription yet")
  return s
}
const needStaff = (by: ChangedBy, cap: C) => {
  if ("actor" in by) need(by.actor, cap)
}
function mrrDiscountOf(d: SubscriptionDiscount | undefined, monthly: number, billing: "monthly" | "yearly") {
  if (!d || d.invoicesLeft === 0) return undefined
  return round2(discountAmount(d, periodPrice(monthly, billing)) / (billing === "yearly" ? 12 : 1))
}

/** SUB-02 to SUB-04 for either side: the company administrator changes plan from My subscription with the same rules. */
export async function customerChangePlanApi(person: { name: string; email: string }, customerId: string, plan: NexoraPlanId, today = today0()) {
  if (planById(plan).retired) throw new Error("This plan is no longer sold")
  return changePlanCore({ person }, customerId, plan, today, "ok")
}

/** SUB-05: monthly to yearly starts a yearly period today with credit for the unused monthly days; yearly to monthly waits for the renewal. */
export async function changeBillingApi(by: ChangedBy, customerId: string, billing: "monthly" | "yearly", today = today0(), cardOutcome: "ok" | "declined" = "ok") {
  needStaff(by, C.CHANGE_SUBSCRIPTION)
  const c = customer(customerId)
  const s = subOf(customerId)
  if (billing === s.billing && !s.scheduledBilling) return { subscription: s, invoice: null }
  if (billing === "monthly") {
    const updated = subscriptions.update(PLATFORM_WS, s.id, { scheduledBilling: s.billing === "monthly" ? undefined : "monthly", history: [...s.history, { at: new Date().toISOString(), by: nameOf(by), kind: "billing_scheduled", from: s.billing, to: "monthly" }] })
    record(by, c, "billing", s.billing, `monthly from ${addDays(s.periodEnd, 1)}`)
    return { subscription: updated, invoice: null }
  }
  const monthly = priceOf(s)
  const total = daysBetween(s.periodStart, s.periodEnd) + 1
  const left = Math.max(0, daysBetween(today, s.periodEnd) + 1)
  const credit = round2((monthly * left) / total)
  const p = periodFrom(today, "yearly")
  const rate = vatRateFor(c.country)
  const lines = subscriptionLines(s.plan, "yearly", monthly, c.country, p.start, p.end, s.discount)
  if (credit > 0) lines.push({ label: `Credit for unused monthly days · ${left}/${total} days · ${today} → ${s.periodEnd}`, quantity: 1, unitPrice: -credit, vatRate: rate })
  const updated = subscriptions.update(PLATFORM_WS, s.id, { billing: "yearly", scheduledBilling: undefined, periodStart: p.start, periodEnd: p.end, history: [...s.history, { at: new Date().toISOString(), by: nameOf(by), kind: "billing_changed", from: s.billing, to: "yearly" }] })
  setCustomer(customerId, { billing: "yearly", mrrDiscount: mrrDiscountOf(s.discount, monthly, "yearly") })
  let inv = issueInvoice(customer(customerId), "subscription", lines, p.start, p.end, s.method, today)
  if (s.method === "card") collectByCard(inv, today, cardOutcome)
  inv = invoices.get(PLATFORM_WS, inv.id)!
  record(by, c, "billing", "monthly", `yearly · ${inv.number}`)
  return { subscription: updated, invoice: inv }
}

/** Card or bank transfer for the next invoices (SUB-01). */
export async function changeMethodApi(by: ChangedBy, customerId: string, method: "card" | "transfer") {
  needStaff(by, C.CHANGE_SUBSCRIPTION)
  const c = customer(customerId)
  const s = subOf(customerId)
  if (s.method === method) return s
  const updated = subscriptions.update(PLATFORM_WS, s.id, { method, history: [...s.history, { at: new Date().toISOString(), by: nameOf(by), kind: "method_changed", from: s.method, to: method }] })
  record(by, c, "payment method", s.method, method)
  return updated
}

/** PLA-08: percentage or amount, for a number of invoices or until removed, with a reason printed on each invoice. */
export async function setDiscountApi(actor: ConsoleActor, customerId: string, input: { kind: "percent" | "amount"; value: number; invoices: number | null; reason: string }) {
  need(actor, C.CHANGE_SUBSCRIPTION)
  const c = customer(customerId)
  const s = subOf(customerId)
  if (!(input.value > 0) || (input.kind === "percent" && input.value > 100)) throw new Error("A discount is above zero, and at most 100%")
  if (input.invoices !== null && !(Number.isInteger(input.invoices) && input.invoices > 0)) throw new Error("Give the number of invoices, or leave it until removed")
  if (input.reason.trim().length < 3) throw new Error("Give the reason for the discount")
  const discount: SubscriptionDiscount = { kind: input.kind, value: input.value, invoicesLeft: input.invoices, reason: input.reason.trim(), by: actor.name, since: today0() }
  const updated = subscriptions.update(PLATFORM_WS, s.id, { discount, history: [...s.history, { at: new Date().toISOString(), by: actor.name, kind: "discount_set", to: `${input.kind === "percent" ? `${input.value}%` : `${input.value} MAD`} · ${input.reason.trim()}` }] })
  setCustomer(customerId, { mrrDiscount: mrrDiscountOf(discount, priceOf(s), s.billing) })
  record({ actor }, c, "discount", s.discount ? `${s.discount.value}${s.discount.kind === "percent" ? "%" : " MAD"}` : undefined, `${input.value}${input.kind === "percent" ? "%" : " MAD"} · ${input.invoices ?? "∞"} invoices · ${input.reason.trim()}`)
  return updated
}

export async function removeDiscountApi(actor: ConsoleActor, customerId: string) {
  need(actor, C.CHANGE_SUBSCRIPTION)
  const c = customer(customerId)
  const s = subOf(customerId)
  if (!s.discount) return s
  const updated = subscriptions.update(PLATFORM_WS, s.id, { discount: undefined, history: [...s.history, { at: new Date().toISOString(), by: actor.name, kind: "discount_ended" }] })
  setCustomer(customerId, { mrrDiscount: undefined })
  record({ actor }, c, "discount", s.discount.reason, "removed")
  return updated
}

/** SUB-10: extra seats until a date, with a reason; they stop counting the day after. */
export async function setExtensionApi(actor: ConsoleActor, customerId: string, input: { seats: number; until: string; reason: string }, today = today0()) {
  need(actor, C.CHANGE_SUBSCRIPTION)
  const c = customer(customerId)
  const s = subOf(customerId)
  if (planById(s.plan).seats < 0) throw new Error("This plan already has unlimited people")
  if (!(Number.isInteger(input.seats) && input.seats > 0)) throw new Error("Give the number of extra people")
  if (!input.until || input.until < today) throw new Error("The end date must be in the future")
  if (input.reason.trim().length < 3) throw new Error("Give the reason for the extension")
  const updated = subscriptions.update(PLATFORM_WS, s.id, { extension: { seats: input.seats, until: input.until, reason: input.reason.trim(), by: actor.name }, history: [...s.history, { at: new Date().toISOString(), by: actor.name, kind: "extension_set", to: `+${input.seats} until ${input.until}` }] })
  setCustomer(customerId, { extraSeats: input.seats, extraSeatsUntil: input.until })
  record({ actor }, c, "extra seats", undefined, `+${input.seats} until ${input.until} · ${input.reason.trim()}`)
  return updated
}

export async function removeExtensionApi(actor: ConsoleActor, customerId: string) {
  need(actor, C.CHANGE_SUBSCRIPTION)
  const c = customer(customerId)
  const s = subOf(customerId)
  if (!s.extension) return s
  const updated = subscriptions.update(PLATFORM_WS, s.id, { extension: undefined, history: [...s.history, { at: new Date().toISOString(), by: actor.name, kind: "extension_ended" }] })
  setCustomer(customerId, { extraSeats: undefined, extraSeatsUntil: undefined })
  record({ actor }, c, "extra seats", `+${s.extension.seats}`, "removed")
  return updated
}

/** SUB-07: cancel today instead of at period end; the unused days are credited, and refunded with finance approval. */
export async function cancelNowApi(actor: ConsoleActor, customerId: string, input: { reason: string; refund: boolean }, today = today0()) {
  if (!consoleCan(actor.role, C.CREDIT_NOTES)) throw new Error(ERR_FORBIDDEN)
  if (input.reason.trim().length < 5) throw new Error("Give the reason for the cancellation")
  const c = customer(customerId)
  const s = subOf(customerId)
  if (c.status === "cancelled" || c.status === "deleted") throw new Error("This customer is already cancelled")
  const current = invoices.list(PLATFORM_WS).filter((i) => i.customerId === customerId && i.kind === "subscription" && i.periodFrom <= today && today <= i.periodTo && i.status !== "credited").sort((a, b) => b.date.localeCompare(a.date))[0]
  let creditNote: NxCreditNote | null = null
  let refund: NxRefund | null = null
  if (current) {
    const total = daysBetween(current.periodFrom, current.periodTo) + 1
    const left = Math.max(0, daysBetween(today, current.periodTo))
    const amount = round2((current.subtotal * left) / total)
    if (amount > 0) {
      const r = await issueCreditNoteApi(actor, current.id, { amount, reason: `Cancellation on ${today}: ${left}/${total} unused days · ${input.reason.trim()}`, refund: input.refund && current.paid > 0 }, today)
      creditNote = r.creditNote
      refund = r.refund
    }
  }
  subscriptions.update(PLATFORM_WS, s.id, { periodEnd: today, history: [...s.history, { at: new Date().toISOString(), by: actor.name, kind: "cancelled_now", from: s.plan }] })
  setCustomer(customerId, { status: "cancelled", readOnly: true, cancelsOn: undefined, cancelledOn: today, mrrDiscount: undefined })
  audit(actor, "customer.cancelled", "customer", c.name, { before: c.status, after: `cancelled now · ${input.reason.trim()}${creditNote ? ` · ${creditNote.number}` : ""}`, customerId })
  return { creditNote, refund }
}

/* ---------- payments and reconciliation (§5.5) ---------- */

/** PAY-03: a bank transfer is matched by invoice number and amount, otherwise it waits in the queue. */
export async function recordTransferApi(actor: ConsoleActor, input: { amount: number; reference: string; payer: string; date: string }) {
  need(actor, C.CREDIT_NOTES)
  if (!(input.amount > 0) || !input.reference.trim()) throw new Error("Enter the amount and the bank reference")
  const open = invoices.list(PLATFORM_WS).filter((i) => i.status !== "paid" && i.status !== "credited").map((i) => ({ ...i, balance: balanceOf(i) }))
  const match = matchTransfer({ reference: input.reference, amount: input.amount }, open)
  if (match) {
    const pay = applyPayment(invoices.get(PLATFORM_WS, match.id)!, round2(input.amount), "transfer", input.date, input.reference.trim())
    audit(actor, "payment.matched", "payment", `${match.number} · ${match.customerName}`, { after: `${input.amount} MAD`, customerId: match.customerId })
    return { payment: pay, matched: true }
  }
  const pay = payments.create(PLATFORM_WS, { method: "transfer", amount: round2(input.amount), date: input.date, status: "unmatched", reference: input.reference.trim(), payer: input.payer.trim() || undefined })
  audit(actor, "payment.recorded", "payment", `${input.payer || "—"} · ${input.reference}`, { after: `${input.amount} MAD · unmatched` })
  return { payment: pay, matched: false }
}

/** Assigns a transfer from the queue to an invoice by hand. */
export async function assignTransferApi(actor: ConsoleActor, paymentId: string, invoiceId: string) {
  need(actor, C.CREDIT_NOTES)
  const pay = payments.get(PLATFORM_WS, paymentId)
  const inv = invoices.get(PLATFORM_WS, invoiceId)
  if (!pay || pay.status !== "unmatched" || !inv) throw new Error("This transfer is no longer waiting")
  if (pay.amount > balanceOf(inv)) throw new Error("The transfer is larger than what the invoice still owes")
  payments.remove(PLATFORM_WS, paymentId)
  const applied = applyPayment(inv, pay.amount, "transfer", pay.date, pay.reference)
  audit(actor, "payment.matched", "payment", `${inv.number} · ${inv.customerName}`, { after: `${pay.amount} MAD`, customerId: inv.customerId })
  return applied
}

/* ---------- credit notes and refunds (INV-04, PAY-07) ---------- */

/** INV-04: issued invoices are never edited; a credit note corrects them, optionally refunded. */
export async function issueCreditNoteApi(actor: ConsoleActor, invoiceId: string, input: { amount: number; reason: string; refund: boolean }, today = today0()) {
  need(actor, C.CREDIT_NOTES)
  const inv = invoices.get(PLATFORM_WS, invoiceId)
  if (!inv) throw new Error("This invoice no longer exists")
  if (input.reason.trim().length < 5) throw new Error("Give the reason for the credit note")
  const rate = inv.lines[0]?.vatRate ?? NEXORA_VAT_RATE
  const creditedBefore = round2(inv.credited / (1 + rate / 100))
  if (!(input.amount > 0) || round2(input.amount) > round2(inv.subtotal - creditedBefore)) throw new Error("The credit note cannot exceed what is left on the invoice")
  const t = invoiceTotals([{ label: input.reason, quantity: 1, unitPrice: input.amount, vatRate: rate }])
  if (input.refund && t.total > round2(inv.paid)) throw new Error("Only money received can be refunded")
  const note = creditNotes.create(PLATFORM_WS, {
    number: nextNumber("AV", Number(today.slice(0, 4)), creditNotes.list(PLATFORM_WS).map((n) => n.number)),
    invoiceId: inv.id, invoiceNumber: inv.number, customerId: inv.customerId, customerName: inv.customerName, date: today, reason: input.reason.trim(),
    subtotal: t.subtotal, vat: t.vat, total: t.total, createdBy: actor.name,
  })
  const credited = round2(inv.credited + t.total)
  invoices.update(PLATFORM_WS, inv.id, { credited, status: credited >= inv.total ? "credited" : inv.status })
  audit(actor, "invoice.credit_note", "invoice", `${inv.number} · ${inv.customerName}`, { after: `${note.number} · ${t.total} MAD`, customerId: inv.customerId })
  let refund: NxRefund | null = null
  if (input.refund) {
    if (t.total > REFUND_SECOND_APPROVAL_ABOVE) need(actor, C.REFUND_LARGE)
    else need(actor, C.REFUND_SMALL)
    refund = refunds.create(PLATFORM_WS, {
      creditNoteId: note.id, creditNoteNumber: note.number, customerId: inv.customerId, customerName: inv.customerName, amount: t.total,
      status: t.total > REFUND_SECOND_APPROVAL_ABOVE ? "awaiting_approval" : "done", requestedBy: actor.name,
    })
    if (refund.status === "done") finishRefund(actor, refund, today)
  }
  return { creditNote: note, refund }
}

function finishRefund(actor: ConsoleActor, refund: NxRefund, today: string) {
  payments.create(PLATFORM_WS, { customerId: refund.customerId, customerName: refund.customerName, method: "transfer", amount: -refund.amount, date: today, status: "refunded", reference: `Refund ${refund.creditNoteNumber}` })
  audit(actor, "payment.refund", "payment", `${refund.creditNoteNumber} · ${refund.customerName}`, { after: `${refund.amount} MAD`, customerId: refund.customerId })
}

/** BR-10, SEC-05: a second team member approves refunds above 1,000 MAD VAT included. */
export async function approveRefundApi(actor: ConsoleActor, refundId: string, today = today0()) {
  need(actor, C.REFUND_LARGE)
  const r = refunds.get(PLATFORM_WS, refundId)
  if (!r || r.status !== "awaiting_approval") throw new Error("This refund is not waiting for approval")
  if (r.requestedBy === actor.name) throw new Error("Another team member must approve this refund")
  const done = refunds.update(PLATFORM_WS, refundId, { status: "done", approvedBy: actor.name })
  audit(actor, "refund.approved", "payment", `${r.creditNoteNumber} · ${r.customerName}`, { after: `${r.amount} MAD`, customerId: r.customerId })
  finishRefund(actor, done, today)
  return done
}

/** TAX-03, BR-07: VAT collected on payments received, by month. */
export function vatByMonth(list: NxPayment[], invs: NxInvoice[]) {
  const byId = new Map(invs.map((i) => [i.id, i]))
  const out = new Map<string, { month: string; received: number; vat: number }>()
  for (const p of list) {
    if (p.status !== "succeeded" && p.status !== "refunded") continue
    const inv = p.invoiceId ? byId.get(p.invoiceId) : undefined
    const share = inv && inv.total ? inv.vat / inv.total : NEXORA_VAT_RATE / (100 + NEXORA_VAT_RATE)
    const m = p.date.slice(0, 7)
    const row = out.get(m) ?? { month: m, received: 0, vat: 0 }
    row.received = round2(row.received + p.amount)
    row.vat = round2(row.vat + p.amount * share)
    out.set(m, row)
  }
  return [...out.values()].sort((a, b) => b.month.localeCompare(a.month))
}
