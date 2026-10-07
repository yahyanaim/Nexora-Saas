import type { NexoraPlanId } from "@/lib/platform/nexora-catalog"

/**
 * A company using Nexora as the console manages it (cahier des charges §5.1,
 * Lot A2). Account and billing fields only: never the company's business data.
 */
export type LifecycleStatus = "trial" | "active" | "payment_overdue" | "suspended" | "cancelled" | "deleted"

export interface CustomerNote {
  id: string
  text: string
  author: string
  /** ISO timestamp */
  at: string
}

export interface CustomerSuspension {
  reason: string
  /** yyyy-mm-dd, optional automatic end */
  until?: string
  /** status to go back to when the suspension is lifted */
  previous: LifecycleStatus
  by: string
  /** ISO timestamp */
  at: string
}

export interface CustomerAccount {
  id: string
  workspaceId: string
  /** Demo workspace this company opens in (CUS-12) */
  demoWorkspaceId?: string
  name: string
  city: string
  country: string
  ice?: string
  plan: NexoraPlanId
  billing: "monthly" | "yearly"
  seatsUsed: number
  status: LifecycleStatus
  /** The workspace can be read but not changed (trial ended, dunning day 14, suspension) */
  readOnly: boolean
  /** yyyy-mm-dd */
  since: string
  /** yyyy-mm-dd, for trials */
  trialEndsOn?: string
  /** A trial can be extended once by 7 days (D-02) */
  trialExtended?: boolean
  /** yyyy-mm-dd: cancellation takes effect at the end of the paid period (CUS-09) */
  cancelsOn?: string
  suspension?: CustomerSuspension
  admin: { name: string; email: string; avatar?: string }
  notes: CustomerNote[]
  createdAt: string
  updatedAt: string
}

/** A person of a customer company whose account the Nexora team suspended (USR-04). */
export interface UserSuspension {
  id: string
  workspaceId: string
  userId: string
  name: string
  email: string
  customerId: string
  company: string
  reason: string
  /** yyyy-mm-dd */
  until?: string
  by: string
  /** ISO timestamps */
  at: string
  liftedAt?: string
  liftedBy?: string
  createdAt: string
  updatedAt: string
}
