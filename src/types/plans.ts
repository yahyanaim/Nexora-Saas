export type BillingPlan = "free" | "pro" | "enterprise"

export interface PlanLimits {
  /** Maximum number of team members allowed (-1 for unlimited) */
  teamMembers: number
  /** Maximum number of active workspaces (-1 for unlimited) */
  workspaces: number
  /** Storage capacity limit in gigabytes */
  storageGb: number
  /** Maximum API requests per calendar month (-1 for unlimited) */
  apiCallsMonthly: number
  /** Maximum number of custom domains allowed */
  customDomains: number
}

export interface Plan {
  id: string
  name: string
  price: string
  period: string | null
  description: string
  featured: boolean
  features: string[]
  limits?: PlanLimits
  ssoEnabled?: boolean
  auditLogsEnabled?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreatePlanPayload {
  name: string
  price: string
  period?: string | null
  description: string
  featured?: boolean
  features: string[]
  limits?: Partial<PlanLimits>
  ssoEnabled?: boolean
  auditLogsEnabled?: boolean
}

export type UpdatePlanPayload = Partial<CreatePlanPayload>

export interface PlanFilters {
  featured?: boolean
  search?: string
}
