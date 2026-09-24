import apiClient, { apiErrorMessage, isBackendUnreachable } from "@/lib/myapi/client"

export interface ResourceUsage {
  used: number
  limit: number
  unit: string
  formattedUsed: string
  formattedLimit: string
}

export interface UsageSummary {
  apiCalls: ResourceUsage
  teamSeats: ResourceUsage
  storageGb: ResourceUsage
  invoices: ResourceUsage
  projects: ResourceUsage
  billingCycleEnd: string
}

const DEMO_USAGE: UsageSummary = {
  apiCalls: {
    used: 84200,
    limit: 100000,
    unit: "requests",
    formattedUsed: "84,200",
    formattedLimit: "100,000",
  },
  teamSeats: {
    used: 4,
    limit: 5,
    unit: "seats",
    formattedUsed: "4",
    formattedLimit: "5",
  },
  storageGb: {
    used: 7.4,
    limit: 10,
    unit: "GB",
    formattedUsed: "7.4 GB",
    formattedLimit: "10 GB",
  },
  invoices: {
    used: 18,
    limit: 25,
    unit: "invoices",
    formattedUsed: "18",
    formattedLimit: "25",
  },
  projects: {
    used: 12,
    limit: 20,
    unit: "projects",
    formattedUsed: "12",
    formattedLimit: "20",
  },
  billingCycleEnd: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
}

/**
 * Fetch organization real-time resource consumption and tier quotas.
 */
export async function fetchUsageApi(): Promise<UsageSummary> {
  try {
    const res = await apiClient.get<UsageSummary>("/billing/usage")
    if (res?.data) return res.data
    return DEMO_USAGE
  } catch (error) {
    const msg = apiErrorMessage(error, "Failed to fetch usage metrics")
    console.error("fetchUsageApi error:", msg)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return DEMO_USAGE
    }
    throw new Error(msg)
  }
}

/**
 * Check whether a requested resource allocation is within quota.
 */
export async function checkQuotaApi(
  resource: keyof Omit<UsageSummary, "billingCycleEnd">
): Promise<{ allowed: boolean; remaining: number; used: number; limit: number }> {
  try {
    const res = await apiClient.get(`/billing/usage/check`, {
      params: { resource },
    })
    if (res?.data) return res.data
  } catch (error) {
    const msg = apiErrorMessage(error, "Failed to check quota")
    console.error("checkQuotaApi error:", msg)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw new Error(msg)
    }
  }

  const metric = DEMO_USAGE[resource]
  const remaining = metric.limit === -1 ? Infinity : Math.max(0, metric.limit - metric.used)
  return {
    allowed: metric.limit === -1 || metric.used < metric.limit,
    remaining,
    used: metric.used,
    limit: metric.limit,
  }
}
