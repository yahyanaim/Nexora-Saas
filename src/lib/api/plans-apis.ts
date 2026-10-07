export * from "./billing-apis"
import { billingApi } from "./billing-apis"
import { Plan, CreatePlanPayload, UpdatePlanPayload } from "@/types/plans"
import { ApiPaginatedResponse } from "@/types/tables"
import { consolePlans } from "@/lib/platform/console-data"

// Nexora's own plans, from the platform catalogue
const STATIC_PLANS: Plan[] = consolePlans()

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
