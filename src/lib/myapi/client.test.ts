import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { AxiosError } from "axios"
import apiClient, {
  apiErrorMessage,
  isBackendUnreachable,
  UPGRADE_REQUIRED_EVENT,
  __resetRefreshStateForTests,
} from "./client"
import type { InternalAxiosRequestConfig } from "axios"

const unauthorized = (config: InternalAxiosRequestConfig) =>
  new AxiosError("Unauthorized", "401", config, null, {
    status: 401,
    data: {},
    statusText: "Unauthorized",
    headers: {},
    config,
  })

const ok = (config: InternalAxiosRequestConfig, data: unknown = {}) => ({
  status: 200,
  data,
  statusText: "OK",
  headers: {},
  config,
})

describe("apiClient configuration", () => {
  it("times out requests instead of waiting forever", () => {
    expect(apiClient.defaults.timeout).toBeGreaterThan(0)
  })

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

  it("replaces axios internals with friendly messages", () => {
    const config = { headers: {} } as InternalAxiosRequestConfig
    expect(apiErrorMessage(new AxiosError("timeout of 20000ms exceeded", "ECONNABORTED", config))).toMatch(/too long/)
    expect(apiErrorMessage(new AxiosError("Network Error", "ERR_NETWORK", config))).toMatch(/Can't reach/)
    const serverError = new AxiosError("Request failed with status code 500", "ERR_BAD_RESPONSE", config, null, {
      status: 500, data: {}, statusText: "", headers: {}, config,
    })
    expect(apiErrorMessage(serverError)).toMatch(/server had a problem/)
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

  it("performs exactly one refresh for concurrent 401s", async () => {
    __resetRefreshStateForTests()
    let refreshCalls = 0
    let refreshed = false

    apiClient.defaults.adapter = async (config) => {
      if (config.url === "/auth/refresh") {
        refreshCalls++
        await new Promise((r) => setTimeout(r, 10))
        refreshed = true
        return ok(config)
      }
      if (!refreshed) throw unauthorized(config)
      return ok(config, { url: config.url })
    }

    const results = await Promise.all([
      apiClient.get("/a"),
      apiClient.get("/b"),
      apiClient.get("/c"),
    ])
    expect(results.map((r) => r.data.url)).toEqual(["/a", "/b", "/c"])
    expect(refreshCalls).toBe(1)
  })

  it("does not refresh again for a 401 from a request sent before the last refresh", async () => {
    __resetRefreshStateForTests()
    let refreshCalls = 0
    let releaseSlow: () => void = () => {}
    const slowGate = new Promise<void>((r) => (releaseSlow = r))
    let slowAttempts = 0

    apiClient.defaults.adapter = async (config) => {
      if (config.url === "/auth/refresh") {
        refreshCalls++
        return ok(config)
      }
      if (config.url === "/slow") {
        slowAttempts++
        if (slowAttempts === 1) {
          // Sent with the old session, answers 401 after the refresh finished
          await slowGate
          throw unauthorized(config)
        }
        return ok(config, { url: "/slow" })
      }
      if (refreshCalls === 0) throw unauthorized(config)
      return ok(config, { url: config.url })
    }

    const slow = apiClient.get("/slow")
    await apiClient.get("/fast")
    releaseSlow()
    const res = await slow

    expect(res.data.url).toBe("/slow")
    expect(refreshCalls).toBe(1)
  })

  it("matches auth routes exactly rather than by substring", async () => {
    __resetRefreshStateForTests()
    let refreshCalls = 0
    let refreshed = false

    apiClient.defaults.adapter = async (config) => {
      if (config.url === "/auth/refresh") {
        refreshCalls++
        refreshed = true
        return ok(config)
      }
      if (!refreshed) throw unauthorized(config)
      return ok(config)
    }

    await apiClient.get("/users/auth/me-preferences")
    expect(refreshCalls).toBe(1)

    __resetRefreshStateForTests()
    refreshed = false
    refreshCalls = 0
    await expect(apiClient.get("/auth/me?x=1")).rejects.toThrow()
    expect(refreshCalls).toBe(0)
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

describe("isBackendUnreachable", () => {
  const withStatus = (status: number) =>
    new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, {
      status,
      data: {},
    } as never)

  it("treats network errors without a response as unreachable", () => {
    expect(isBackendUnreachable(new AxiosError("Network Error", "ERR_NETWORK"))).toBe(true)
  })

  it("treats gateway errors as unreachable", () => {
    for (const status of [502, 503, 504]) {
      expect(isBackendUnreachable(withStatus(status))).toBe(true)
    }
  })

  it("does not treat application responses as unreachable", () => {
    for (const status of [400, 401, 403, 404, 500]) {
      expect(isBackendUnreachable(withStatus(status))).toBe(false)
    }
  })

  it("does not treat non-Axios errors as unreachable", () => {
    expect(isBackendUnreachable(new Error("boom"))).toBe(false)
    expect(isBackendUnreachable(undefined)).toBe(false)
  })
})
