/**
 * The Nexora platform console's own demo data: the plans Nexora sells and the
 * companies that use it as their ERP. Users, subscriptions, invoices and
 * transactions of the console are all built from this one catalogue, so the
 * figures agree with each other. Prices are in MAD before VAT; Nexora bills
 * Moroccan VAT at 20%. The server will replace this with real records.
 */

export const NEXORA_CURRENCY = "MAD"
export const NEXORA_VAT_RATE = 20

export type NexoraPlanId = "starter" | "business" | "enterprise"

export interface NexoraPlan {
  id: NexoraPlanId
  name: string
  /** Monthly price before VAT, in MAD */
  monthly: number
  /** People included; -1 for unlimited */
  seats: number
  description: string
  featured: boolean
  features: string[]
}

export const NEXORA_PLANS: NexoraPlan[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 490,
    seats: 5,
    description: "For small teams that log time, run projects and invoice clients.",
    featured: false,
    features: ["Up to 5 people", "Projects, timesheets and approvals", "Quotes and invoices with Moroccan VAT", "Client portal", "Email support"],
  },
  {
    id: "business",
    name: "Business",
    monthly: 1490,
    seats: 25,
    description: "For growing service companies that need finance, planning and reports.",
    featured: true,
    features: ["Up to 25 people", "Everything in Starter", "DGI e-invoice file, VAT return and CGNC journal", "Suppliers, bills and payroll inputs", "Resource planning, deals and revenue forecast", "Priority support"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthly: 3990,
    seats: -1,
    description: "For larger firms and groups that need control and dedicated help.",
    featured: false,
    features: ["Unlimited people", "Everything in Business", "Several workspaces", "Single sign-on and audit export", "Dedicated account manager", "99.9% uptime commitment"],
  },
]

export const planById = (id: NexoraPlanId) => NEXORA_PLANS.find((p) => p.id === id)!

export type CustomerStatus = "trial" | "active" | "past_due" | "cancelled"

export interface NexoraCustomer {
  id: string
  /** Demo workspace this company opens in, when it has one */
  workspaceId?: string
  name: string
  city: string
  country: string
  ice?: string
  plan: NexoraPlanId
  billing: "monthly" | "yearly"
  /** People using Nexora in the company */
  seatsUsed: number
  status: CustomerStatus
  /** yyyy-mm-dd */
  since: string
  /** End of the free trial, for trials */
  trialEndsOn?: string
  admin: { name: string; email: string; avatar?: string }
  /** Other people of the company with an account */
  members: { name: string; email: string; avatar?: string; banned?: boolean }[]
}

export const NEXORA_CUSTOMERS: NexoraCustomer[] = [
  {
    id: "cus_atlas", workspaceId: "ws_atlas", name: "Atlas Consulting", city: "Casablanca", country: "MA", ice: "002873641000058",
    plan: "business", billing: "monthly", seatsUsed: 12, status: "active", since: "2025-03-01",
    admin: { name: "Alex Morgan", email: "alex.morgan@company.io", avatar: "/avatars/alex-morgan.jpg" },
    members: [{ name: "Karim Haddad", email: "karim@atlas.ma" }, { name: "Lina Moreau", email: "lina@atlas.ma" }, { name: "Yassine Alaoui", email: "yassine@atlas.ma" }],
  },
  {
    id: "cus_northwind", workspaceId: "ws_northwind", name: "Northwind Studio", city: "Austin", country: "US",
    plan: "starter", billing: "yearly", seatsUsed: 4, status: "active", since: "2025-06-12",
    admin: { name: "Sarah Chen", email: "sarah.chen@techcorp.com", avatar: "/avatars/sarah-chen.jpg" },
    members: [{ name: "Mateo Ruiz", email: "mateo@northwind.studio" }],
  },
  {
    id: "cus_bina", name: "Dar Al Bina Ingénierie", city: "Rabat", country: "MA", ice: "001945328000071",
    plan: "enterprise", billing: "yearly", seatsUsed: 48, status: "active", since: "2024-11-04",
    admin: { name: "Hicham Benjelloun", email: "h.benjelloun@daralbina.ma", avatar: "/avatars/marcus-vance.jpg" },
    members: [{ name: "Salma Idrissi", email: "s.idrissi@daralbina.ma" }, { name: "Omar Tazi", email: "o.tazi@daralbina.ma" }],
  },
  {
    id: "cus_marrakech", name: "Marrakech Digital", city: "Marrakech", country: "MA", ice: "002511870000093",
    plan: "business", billing: "monthly", seatsUsed: 17, status: "past_due", since: "2025-01-20",
    admin: { name: "Nadia El Fassi", email: "nadia@marrakechdigital.ma", avatar: "/avatars/maya-patel.jpg" },
    members: [{ name: "Reda Amrani", email: "reda@marrakechdigital.ma" }],
  },
  {
    id: "cus_tanger", name: "Tanger Logistics Conseil", city: "Tangier", country: "MA", ice: "003102947000016",
    plan: "business", billing: "yearly", seatsUsed: 22, status: "active", since: "2025-09-08",
    admin: { name: "Youssef Berrada", email: "y.berrada@tlc.ma", avatar: "/avatars/james-wilson.jpg" },
    members: [{ name: "Imane Chraibi", email: "i.chraibi@tlc.ma" }],
  },
  {
    id: "cus_agadir", name: "Agadir Creative Studio", city: "Agadir", country: "MA",
    plan: "starter", billing: "monthly", seatsUsed: 3, status: "trial", since: "2026-09-24", trialEndsOn: "2026-10-24",
    admin: { name: "Meryem Ouazzani", email: "meryem@agadircreative.ma", avatar: "/avatars/rachel-thorne.jpg" },
    members: [],
  },
  {
    id: "cus_fes", name: "Fès Audit & Associés", city: "Fez", country: "MA", ice: "002064519000082",
    plan: "starter", billing: "monthly", seatsUsed: 5, status: "cancelled", since: "2025-02-15",
    admin: { name: "Driss Kettani", email: "d.kettani@fesaudit.ma", avatar: "/avatars/viktor-reznov.jpg" },
    members: [{ name: "Ali Raji", email: "spam.bot@mailinator.com", banned: true }],
  },
  {
    id: "cus_lyon", name: "Lumière Conseil", city: "Lyon", country: "FR",
    plan: "business", billing: "monthly", seatsUsed: 9, status: "trial", since: "2026-10-01", trialEndsOn: "2026-10-31",
    admin: { name: "Lucas Dubois", email: "lucas@lumiere-conseil.fr", avatar: "/avatars/lucas-dubois.jpg" },
    members: [{ name: "Elena Rostova", email: "elena@lumiere-conseil.fr", avatar: "/avatars/elena-rostova.jpg" }],
  },
]

/** The Nexora team: they run the platform console. */
export const NEXORA_TEAM = [
  { name: "Sophia Vance", email: "sophia.v@nexora.io", role: "Platform owner", avatar: "/avatars/sophia-vance.jpg" },
  { name: "Liam O'Connor", email: "liam@nexora.io", role: "Customer success", avatar: "/avatars/liam-oconnor.jpg" },
  { name: "Amine Lahlou", email: "amine@nexora.io", role: "Support engineer", avatar: "/avatars/david-kim.jpg" },
]

/** Monthly recurring revenue of a customer before VAT (yearly plans get two months free). */
export function customerMrr(c: Pick<NexoraCustomer, "plan" | "billing" | "status">) {
  if (c.status === "trial" || c.status === "cancelled") return 0
  const monthly = planById(c.plan).monthly
  return c.billing === "yearly" ? Math.round((monthly * 10) / 12) : monthly
}

/** Amount billed per invoice before VAT. */
export const invoiceAmount = (c: Pick<NexoraCustomer, "plan" | "billing">) => (c.billing === "yearly" ? planById(c.plan).monthly * 10 : planById(c.plan).monthly)

export function platformSummary(customers: NexoraCustomer[] = NEXORA_CUSTOMERS) {
  const mrr = customers.reduce((s, c) => s + customerMrr(c), 0)
  const paying = customers.filter((c) => c.status === "active" || c.status === "past_due")
  return {
    customers: customers.filter((c) => c.status !== "cancelled").length,
    paying: paying.length,
    trials: customers.filter((c) => c.status === "trial").length,
    pastDue: customers.filter((c) => c.status === "past_due").length,
    cancelled: customers.filter((c) => c.status === "cancelled").length,
    mrr,
    arr: mrr * 12,
    seats: customers.filter((c) => c.status !== "cancelled").reduce((s, c) => s + c.seatsUsed, 0),
  }
}

/** Formats an amount in MAD for the console pages. */
export function formatMad(n: number, locale = "fr-MA") {
  return new Intl.NumberFormat(locale, { style: "currency", currency: NEXORA_CURRENCY, maximumFractionDigits: 2 }).format(n)
}
