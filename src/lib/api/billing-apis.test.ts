import { describe, it, expect, vi, beforeEach } from "vitest"
import { AxiosError, InternalAxiosRequestConfig } from "axios"
import apiClient from "@/lib/myapi/client"
import {
  billingApi,
  createCheckoutApi,
  createPortalApi,
  isUpgradeRequired,
} from "./billing-apis"

const dummyConfig = {} as InternalAxiosRequestConfig

describe("billing-apis", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("getSubscription calls GET /billing/subscription and returns subscription info", async () => {
    const mockSubscription = {
      orgId: "org-123",
      plan: "pro",
      status: "active",
      provider: "stripe",
      currentPeriodEnd: "2026-12-31T23:59:59.000Z",
      access: true,
      graceUntil: null,
      hasPaymentMethod: true,
    }

    vi.spyOn(apiClient, "get").mockResolvedValueOnce({ data: mockSubscription })

    const result = await billingApi.getSubscription()
    expect(apiClient.get).toHaveBeenCalledWith("/billing/subscription")
    expect(result).toEqual(mockSubscription)
  })

  it("createCheckoutApi calls POST /billing/checkout with correct payload", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: { url: "https://checkout.stripe.com/c/pay/cs_test_123" },
    })

    const result = await createCheckoutApi("pro")
    expect(apiClient.post).toHaveBeenCalledWith("/billing/checkout", {
      plan: "pro",
    })
    expect(result.url).toBe("https://checkout.stripe.com/c/pay/cs_test_123")
  })

  it("createPortalApi calls POST /billing/portal", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: { url: "https://billing.stripe.com/p/session/portal_123" },
    })

    const result = await createPortalApi()
    expect(apiClient.post).toHaveBeenCalledWith("/billing/portal")
    expect(result.url).toBe("https://billing.stripe.com/p/session/portal_123")
  })
})

describe("isUpgradeRequired", () => {
  it("returns true for 403 status with code upgrade_required", () => {
    const error = new AxiosError("Forbidden", "403", dummyConfig, null, {
      status: 403,
      data: { code: "upgrade_required", message: "Upgrade required" },
      statusText: "Forbidden",
      headers: {},
      config: dummyConfig,
    })

    expect(isUpgradeRequired(error)).toBe(true)
  })

  it("returns false for 403 status with different code", () => {
    const error = new AxiosError("Forbidden", "403", dummyConfig, null, {
      status: 403,
      data: { code: "forbidden", message: "Not permitted" },
      statusText: "Forbidden",
      headers: {},
      config: dummyConfig,
    })

    expect(isUpgradeRequired(error)).toBe(false)
  })

  it("returns false for 401, 500, or network errors", () => {
    const error401 = new AxiosError("Unauthorized", "401", dummyConfig, null, {
      status: 401,
      data: {},
      statusText: "Unauthorized",
      headers: {},
      config: dummyConfig,
    })
    expect(isUpgradeRequired(error401)).toBe(false)

    const error500 = new AxiosError("Internal Server Error", "500", dummyConfig, null, {
      status: 500,
      data: {},
      statusText: "Internal Server Error",
      headers: {},
      config: dummyConfig,
    })
    expect(isUpgradeRequired(error500)).toBe(false)

    expect(isUpgradeRequired(new Error("generic error"))).toBe(false)
    expect(isUpgradeRequired(null)).toBe(false)
    expect(isUpgradeRequired(undefined)).toBe(false)
  })
})
