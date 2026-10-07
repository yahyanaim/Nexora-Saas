import { UserStatus, UserType, type User } from "@/types/users"
import { InvoiceMethod, InvoiceStatus, type Invoice } from "@/types/invoices"
import { TransactionMethod, TransactionStatus, type Transaction } from "@/types/transactions"
import { SubscriptionStatus, type Subscription } from "@/types/subscriptions"
import type { Plan } from "@/types/plans"
import { NEXORA_CUSTOMERS, NEXORA_PLANS, NEXORA_TEAM, NEXORA_VAT_RATE, invoiceAmount, planById, type NexoraCustomer } from "./nexora-catalog"

/**
 * Turns the Nexora catalogue into the records the platform console pages show
 * (users, staff, banned accounts, subscriptions, invoices, transactions and
 * plans), with dates relative to today so the demo always looks current.
 */

const COLORS = ["#2684ff", "#1baf7a", "#eb6834", "#8a3ffc", "#eda100", "#da1e28"]
const iso = (d: Date) => d.toISOString()
const daysAgo = (n: number) => {
  const d = new Date()
  d.setUTCHours(9, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d
}
const addMonths = (d: Date, n: number) => {
  const x = new Date(d)
  x.setUTCMonth(x.getUTCMonth() + n)
  return x
}
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

export function consoleUsers(): User[] {
  const users: User[] = []
  NEXORA_TEAM.forEach((m, i) => {
    users.push({
      id: `usr-nx-${i + 1}`, name: m.name, email: m.email, role: "admin", userType: UserType.STAFF, status: UserStatus.ACTIVE, isActive: true, isVerified: true,
      avatar: m.avatar, profileColor: COLORS[i % COLORS.length], adminTag: m.role, adminTagColor: "#2684ff", orgId: "nexora", createdAt: iso(daysAgo(700 - i * 90)), updatedAt: iso(daysAgo(2)),
    })
  })
  NEXORA_CUSTOMERS.forEach((c, ci) => {
    const since = new Date(`${c.since}T09:00:00Z`)
    const cancelled = c.status === "cancelled"
    users.push({
      id: c.id === "cus_atlas" ? "usr-demo-1" : `usr-${c.id}-admin`, name: c.admin.name, email: c.admin.email, role: "admin", userType: UserType.ADMIN,
      status: cancelled ? UserStatus.INACTIVE : UserStatus.ACTIVE, isActive: !cancelled, isVerified: true, avatar: c.admin.avatar, profileColor: COLORS[ci % COLORS.length],
      adminTag: c.name, orgId: c.id, teamRole: "owner", createdAt: iso(since), updatedAt: iso(daysAgo(ci + 1)), lastSeen: iso(daysAgo(cancelled ? 60 : ci)),
    })
    c.members.forEach((m, mi) => {
      users.push({
        id: `usr-${c.id}-${mi + 1}`, name: m.name, email: m.email, role: "user", userType: UserType.USER,
        status: m.banned ? UserStatus.BANNED : cancelled ? UserStatus.INACTIVE : UserStatus.ACTIVE, isActive: !m.banned && !cancelled, isBanned: !!m.banned, isVerified: !m.banned,
        avatar: m.avatar, profileColor: COLORS[(ci + mi + 1) % COLORS.length], adminTag: c.name, orgId: c.id, teamRole: "member",
        createdAt: iso(addMonths(since, mi + 1)), updatedAt: iso(daysAgo(ci + mi + 2)), lastSeen: iso(daysAgo(ci + mi + 1)),
        ...(m.banned ? { bio: "Banned: automated sign-ups from a disposable address" } : {}),
      })
    })
  })
  return users
}

const STATUS: Record<NexoraCustomer["status"], SubscriptionStatus> = {
  trial: SubscriptionStatus.INACTIVE,
  active: SubscriptionStatus.ACTIVE,
  past_due: SubscriptionStatus.PAST_DUE,
  cancelled: SubscriptionStatus.CANCELED,
}

export function consoleSubscriptions(): Subscription[] {
  return NEXORA_CUSTOMERS.map((c, i) => {
    const plan = planById(c.plan)
    const price = invoiceAmount(c)
    const next = c.status === "cancelled" ? null : c.status === "trial" ? c.trialEndsOn ?? null : iso(addMonths(daysAgo(10 + i), c.billing === "yearly" ? 12 : 1))
    return {
      id: `sub_${c.id}`,
      name: `${c.name} · ${plan.name}`,
      description: c.status === "trial" ? `Free trial until ${c.trialEndsOn}` : `${c.seatsUsed} people · ${c.city}`,
      price: String(price),
      period: c.billing === "yearly" ? "year" : "month",
      status: STATUS[c.status],
      features: plan.features,
      user: { id: `usr-${c.id}-admin`, name: c.admin.name, email: c.admin.email, avatar: c.admin.avatar ?? null },
      plan: { id: plan.id, name: plan.name, price, period: c.billing === "yearly" ? "year" : "month" },
      nextBilling: next,
      billingCycle: c.billing,
      createdAt: iso(new Date(`${c.since}T09:00:00Z`)),
      updatedAt: iso(daysAgo(i + 1)),
    }
  })
}

/** Invoices Nexora sent its customers: the last three months (or the yearly one), Moroccan VAT 20%. */
export function consoleInvoices(): Invoice[] {
  const users = consoleUsers()
  const invoices: Invoice[] = []
  let seq = 140
  NEXORA_CUSTOMERS.forEach((c, ci) => {
    if (c.status === "trial") return
    const admin = users.find((u) => u.orgId === c.id && u.teamRole === "owner")!
    const plan = planById(c.plan)
    const periods = c.billing === "yearly" ? [0] : c.status === "cancelled" ? [5, 6] : [0, 1, 2]
    periods.forEach((back) => {
      const date = addMonths(daysAgo(3 + ci), -back)
      const subtotal = invoiceAmount(c)
      const tax = Math.round(subtotal * NEXORA_VAT_RATE) / 100
      const latest = back === periods[0]
      const status = c.status === "past_due" && latest ? InvoiceStatus.OVERDUE : InvoiceStatus.PAID
      seq++
      invoices.push({
        id: `inv-nx-${seq}`,
        invoiceNumber: `NX-${date.getUTCFullYear()}-${String(seq).padStart(4, "0")}`,
        user: admin,
        items: [{ id: `it-${seq}`, description: `Nexora ${plan.name} · ${c.billing === "yearly" ? "12 months (2 free)" : "1 month"} · ${c.name}`, quantity: 1, unitPrice: subtotal, total: subtotal }],
        subtotal,
        tax,
        taxRate: NEXORA_VAT_RATE,
        total: Math.round((subtotal + tax) * 100) / 100,
        status,
        method: c.country === "MA" ? InvoiceMethod.BANK_TRANSFER : InvoiceMethod.CARD,
        date: iso(date),
        dueDate: iso(new Date(date.getTime() + 15 * 86_400_000)),
        ...(status === InvoiceStatus.PAID ? { paidAt: iso(new Date(date.getTime() + 4 * 86_400_000)) } : {}),
        notes: status === InvoiceStatus.OVERDUE ? "Payment reminder sent; access stays open during the 14-day grace period." : undefined,
        createdAt: iso(date),
      })
    })
  })
  return invoices.sort((a, b) => b.date.localeCompare(a.date))
}

/** Payments received for those invoices, plus one failed card payment and one refund. */
export function consoleTransactions(): Transaction[] {
  const tx: Transaction[] = consoleInvoices()
    .filter((i) => i.status === InvoiceStatus.PAID)
    .map((i, n) => ({
      id: `tx-nx-${n + 1}`,
      transactionId: `TX-${String(560100 + n)}`,
      user: { id: i.user.id, name: i.user.name, email: i.user.email ?? "" },
      amount: i.total,
      method: i.method === InvoiceMethod.CARD ? TransactionMethod.CARD : TransactionMethod.BANK_TRANSFER,
      status: TransactionStatus.PAID,
      date: i.paidAt ?? i.date,
      description: `Payment of ${i.invoiceNumber}`,
      reference: i.method === InvoiceMethod.CARD ? `CMI-${slug(i.user.name).slice(0, 6).toUpperCase()}-${n}` : `VIR ${i.invoiceNumber}`,
      createdAt: i.paidAt ?? i.date,
    }))
  const overdue = consoleInvoices().find((i) => i.status === InvoiceStatus.OVERDUE)
  if (overdue) {
    tx.push({ id: "tx-nx-failed", transactionId: "TX-560900", user: { id: overdue.user.id, name: overdue.user.name, email: overdue.user.email ?? "" }, amount: overdue.total, method: TransactionMethod.CARD, status: TransactionStatus.FAILED, date: overdue.date, description: `Card declined for ${overdue.invoiceNumber}`, reference: "CMI-DECLINED-51", createdAt: overdue.date })
  }
  const fes = NEXORA_CUSTOMERS.find((c) => c.id === "cus_fes")!
  tx.push({ id: "tx-nx-refund", transactionId: "TX-560901", user: { id: "usr-cus_fes-admin", name: fes.admin.name, email: fes.admin.email }, amount: Math.round(invoiceAmount(fes) * 1.2 * 100) / 100, method: TransactionMethod.BANK_TRANSFER, status: TransactionStatus.REFUNDED, date: iso(daysAgo(150)), description: "Refund of the last month after cancellation", reference: "RFD-FES-01", createdAt: iso(daysAgo(150)) })
  return tx.sort((a, b) => b.date.localeCompare(a.date))
}

/** Nexora's plans in the shape of the Plans page. */
export function consolePlans(): Plan[] {
  return NEXORA_PLANS.map((p) => ({
    id: p.id,
    name: p.name,
    price: `${p.monthly.toLocaleString("fr-MA")} MAD`,
    period: "month",
    description: p.description,
    featured: p.featured,
    features: p.features,
    limits: { teamMembers: p.seats, workspaces: p.id === "enterprise" ? -1 : 1, storageGb: p.id === "starter" ? 10 : p.id === "business" ? 100 : 1000, apiCallsMonthly: p.id === "starter" ? 10_000 : -1, customDomains: p.id === "enterprise" ? 3 : 0 },
    ssoEnabled: p.id === "enterprise",
    auditLogsEnabled: p.id !== "starter",
  }))
}
