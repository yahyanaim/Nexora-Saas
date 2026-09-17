import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { AxiosError } from "axios"
import apiClient, {
  apiErrorMessage,
  UPGRADE_REQUIRED_EVENT,
} from "./client"

describe("apiClient configuration", () => {
  it("has withCredentials set to true for cookie-based sessions", () => {
    expect(apiClient.defaults.withCredentials).toBe(true)
  })

  it("points to the expected API base URL", () => {
    expect(apiClient.defaults.baseURL).toBeDefined()
    expect(apiClient.defaults.baseURL).toContain("/api")
  })
})

describe("apiErrorMessage", () => {
  it("extracts backend message from response data", () => {
    const error = {
      response: {
        data: {
          message: "Account already exists with this email",
        },
      },
      message: "Request failed with status code 400",
    }
    expect(apiErrorMessage(error)).toBe("Account already exists with this email")
  })

  it("extracts error.message when no backend response data exists", () => {
    const error = new Error("Network Error")
    expect(apiErrorMessage(error)).toBe("Network Error")
  })

  it("returns fallback message when error has no usable message", () => {
    expect(apiErrorMessage({}, "Something went wrong")).toBe("Something went wrong")
    expect(apiErrorMessage(null, "Custom fallback")).toBe("Custom fallback")
    expect(apiErrorMessage(undefined)).toBe("An unexpected error occurred")
  })
})

describe("apiClient interceptors", () => {
  const originalAdapter = apiClient.defaults.adapter

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
  })

  it("dispatches UPGRADE_REQUIRED_EVENT on 403 with upgrade_required code", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent")

    apiClient.defaults.adapter = async (config) => {
      const error = new AxiosError("Upgrade required", "403", config, null, {
        status: 403,
        data: { code: "upgrade_required", message: "Plan upgrade required" },
        statusText: "Forbidden",
        headers: {},
        config,
      })
      throw error
    }

    await expect(apiClient.get("/test-gated-resource")).rejects.toThrow()

    expect(dispatchSpy).toHaveBeenCalled()
    const dispatchedEvent = dispatchSpy.mock.calls.find(
      (call) => (call[0] as CustomEvent)?.type === UPGRADE_REQUIRED_EVENT
    )
    expect(dispatchedEvent).toBeDefined()
  })

  it("does not dispatch UPGRADE_REQUIRED_EVENT on regular 403 forbidden", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent")

    apiClient.defaults.adapter = async (config) => {
      const error = new AxiosError("Forbidden", "403", config, null, {
        status: 403,
        data: { code: "forbidden", message: "Access denied" },
        statusText: "Forbidden",
        headers: {},
        config,
      })
      throw error
    }

    await expect(apiClient.get("/test-forbidden")).rejects.toThrow()

    const dispatchedEvent = dispatchSpy.mock.calls.find(
      (call) => (call[0] as CustomEvent)?.type === UPGRADE_REQUIRED_EVENT
    )
    expect(dispatchedEvent).toBeUndefined()
  })

  it("attempts token refresh and retries original request on 401", async () => {
    let callCount = 0

    apiClient.defaults.adapter = async (config) => {
      callCount++
      const url = config.url

      // First call to /resource fails with 401
      if (url?.includes("/resource") && callCount === 1) {
        const error = new AxiosError("Unauthorized", "401", config, null, {
          status: 401,
          data: { message: "Token expired" },
          statusText: "Unauthorized",
          headers: {},
          config,
        })
        throw error
      }

      // Refresh succeeds
      if (url?.includes("/auth/refresh")) {
        return {
          status: 200,
          data: { success: true },
          statusText: "OK",
          headers: {},
          config,
        }
      }

      // Retried call to /resource succeeds
      if (url?.includes("/resource") && callCount === 3) {
        return {
          status: 200,
          data: { success: true, retried: true },
          statusText: "OK",
          headers: {},
          config,
        }
      }

      return { status: 200, data: {}, statusText: "OK", headers: {}, config }
    }

    const response = await apiClient.get("/resource")
    expect(response.data).toEqual({ success: true, retried: true })
    expect(callCount).toBe(3)
  })

  it("rejects without infinite retry loop if /auth/refresh fails with 401", async () => {
    apiClient.defaults.adapter = async (config) => {
      const error = new AxiosError("Unauthorized", "401", config, null, {
        status: 401,
        data: { message: "Refresh token invalid" },
        statusText: "Unauthorized",
        headers: {},
        config,
      })
      throw error
    }

    await expect(apiClient.post("/auth/refresh")).rejects.toThrow()
  })
})
