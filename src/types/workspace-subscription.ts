/** What a company pays Nexora for: its plan, seats and billing cycle (SUB-1…SUB-4). */

export type BillingCycle = "monthly" | "yearly"

export interface ErpPlan {
  id: "starter" | "business" | "enterprise"
  /** Price per month in USD on monthly billing */
  monthly: number
  /** Users who can sign in; -1 = unlimited */
  seats: number
  /** Feature keys shown on the plan card */
  features: string[]
}

export interface WorkspaceSubscription {
  workspaceId: string
  planId: ErpPlan["id"]
  cycle: BillingCycle
  status: "trialing" | "active" | "past_due" | "canceled"
  /** yyyy-mm-dd */
  startedAt: string
  renewsAt: string
  /** Card shown on the page, e.g. "Visa •••• 4242" */
  paymentMethod?: string
}

/** One invoice from Nexora to the company. */
export interface SubscriptionInvoice {
  id: string
  number: string
  date: string
  planId: ErpPlan["id"]
  cycle: BillingCycle
  subtotal: number
  taxRate: number
  tax: number
  total: number
  status: "paid" | "open"
}
