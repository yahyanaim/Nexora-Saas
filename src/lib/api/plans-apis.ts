export * from "./billing-apis"
import { billingApi } from "./billing-apis"
import { Plan, CreatePlanPayload, UpdatePlanPayload } from "@/types/plans"
import { ApiPaginatedResponse } from "@/types/tables"

const STATIC_PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "month",
    description: "Essential tools for personal projects.",
    featured: false,
    features: ["1 Workspace", "Up to 3 members", "Community support"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "month",
    description: "Advanced features and power tools for scaling businesses.",
    featured: true,
    features: ["Unlimited workspaces", "Up to 25 members", "Priority support", "Full API access"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$99",
    period: "month",
    description: "Maximum security, scalability, and dedicated SLA.",
    featured: false,
    features: ["Unlimited seats", "Dedicated manager", "99.99% SLA", "SSO"],
  },
]

export const fetchPlansApi = async (_params?: unknown): Promise<ApiPaginatedResponse<Plan>> => {
  return {
    success: true,
    data: STATIC_PLANS,
    pagination: {
      page: 0,
      pageSize: 10,
      totalItems: STATIC_PLANS.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  }
}

export const createPlanApi = async (payload: CreatePlanPayload): Promise<Plan> => {
  return {
    id: `custom-${Date.now()}`,
    name: payload.name,
    price: payload.price,
    period: payload.period ?? "month",
    description: payload.description,
    featured: payload.featured ?? false,
    features: payload.features,
    ssoEnabled: payload.ssoEnabled,
    auditLogsEnabled: payload.auditLogsEnabled,
  }
}

export const updatePlanApi = async (id: string, payload: UpdatePlanPayload): Promise<Plan> => {
  const existing = STATIC_PLANS.find((p) => p.id === id) || STATIC_PLANS[0]!
  return {
    ...existing,
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.price !== undefined ? { price: payload.price } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.period !== undefined ? { period: payload.period } : {}),
    ...(payload.featured !== undefined ? { featured: payload.featured } : {}),
    ...(payload.features !== undefined ? { features: payload.features } : {}),
    ...(payload.ssoEnabled !== undefined ? { ssoEnabled: payload.ssoEnabled } : {}),
    ...(payload.auditLogsEnabled !== undefined ? { auditLogsEnabled: payload.auditLogsEnabled } : {}),
  }
}

export const deletePlanApi = async (_id: string): Promise<void> => {}

export default billingApi
