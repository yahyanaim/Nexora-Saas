import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import type { AuthResponse } from "@/types/auth"
import { env } from "@/env"
import { isDemoMode } from "@/lib/auth/demo-mode"
import { hasDemoSession } from "./token-storage"

/**
 * Central Axios HTTP client singleton for Nexora SaaS.
 * Configured with base URL resolution, credentials forwarding for HttpOnly session cookies,
 * plan-gated 403 upgrade event dispatching, and automatic 401 token refresh retry logic.
 *
 * In production, session tokens are managed exclusively via HttpOnly Secure cookies
 * forwarded automatically by the browser with withCredentials: true.
 */
export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

/**
 * Event name dispatched when a request fails with HTTP 403 'upgrade_required'.
 * Consumed by AuthGuardProvider and navigation listeners to prompt subscription upgrades.
 */
export const UPGRADE_REQUIRED_EVENT = "billing:upgrade-required"
export const SESSION_EXPIRED_EVENT = "auth:session-expired"

let refreshPromise: Promise<AxiosResponse<AuthResponse>> | null = null
/** Incremented on every successful session refresh. */
let refreshGeneration = 0

/** Auth endpoints that must never trigger a refresh-and-retry cycle. */
const AUTH_ROUTES = new Set(["/auth/login", "/auth/register", "/auth/refresh", "/auth/me"])

type RetriableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  _refreshGeneration?: number
}

/** Normalizes a request URL to its path (no query/hash), relative to the API base. */
function requestPath(url: string | undefined): string {
  if (!url) return ""
  const path = url.split(/[?#]/)[0] ?? ""
  if (/^https?:\/\//.test(path)) {
    const base = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    return path.startsWith(base) ? path.slice(base.length) || "/" : new URL(path).pathname
  }
  return path.startsWith("/") ? path : `/${path}`
}

/** @internal Test-only reset of refresh bookkeeping. */
export function __resetRefreshStateForTests() {
  refreshPromise = null
  refreshGeneration = 0
}

apiClient.interceptors.request.use((config) => {
  ;(config as RetriableConfig)._refreshGeneration = refreshGeneration
  return config
})

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error)
    }

    const originalRequest = error.config as RetriableConfig | undefined
    const status = error.response?.status

    // 1. Plan gate handler: route to pricing
    if (
      status === 403 &&
      (error.response?.data as { code?: string } | undefined)?.code ===
        "upgrade_required"
    ) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(UPGRADE_REQUIRED_EVENT))
      }
      return Promise.reject(error)
    }

    // 2. Automatic session refresh on 401:
    // Skip if already retried, or if this request was itself an auth check / attempt
    const isAuthRoute = AUTH_ROUTES.has(requestPath(originalRequest?.url))

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRoute &&
      // A demo session can't be refreshed; its callers fall back to demo data
      !(isDemoMode() && hasDemoSession())
    ) {
      originalRequest._retry = true

      // The request was sent before a refresh that has since completed:
      // the session is already fresh, so just replay it.
      if ((originalRequest._refreshGeneration ?? refreshGeneration) < refreshGeneration) {
        return apiClient(originalRequest)
      }

      try {
        if (!refreshPromise) {
          refreshPromise = apiClient
            .post<AuthResponse>("/auth/refresh")
            .then((res) => {
              refreshGeneration++
              return res
            })
            .finally(() => {
              refreshPromise = null
            })
        }

        await refreshPromise
        return apiClient(originalRequest)
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
        }
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

interface ResponseWithMessage {
  response: {
    data?: {
      message?: unknown
    }
  }
}

function isResponseWithMessage(error: unknown): error is ResponseWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response: unknown }).response === "object" &&
    (error as { response: unknown }).response !== null
  )
}

/**
 * Shared API error extractor: surfaces the backend `message` when present,
 * falls back otherwise. Use in every catch block instead of hardcoded
 * strings so server-side reasons (lockout, validation, plan gates) reach
 * the user and support instead of "Failed to X".
 */
export function apiErrorMessage(
  error: unknown,
  fallback: string = "An unexpected error occurred"
): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return (
      error.response?.data?.message ??
      error.message ??
      fallback
    )
  }
  if (isResponseWithMessage(error)) {
    const msg = error.response.data?.message
    if (typeof msg === "string") {
      return msg
    }
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

/**
 * Detects whether an error indicates that the backend is unreachable
 * (network drop, DNS failure, connection refused, timeout, or 502/503/504 gateway outage).
 * Application-level responses such as 404 are NOT treated as unreachable.
 */
export function isBackendUnreachable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  if (!error.response) return true
  return [502, 503, 504].includes(error.response.status)
}

/**
 * True when an API helper should fall back to local demo data:
 * demo mode is enabled AND either the backend could not be reached or the
 * user signed in with the demo session, which a real backend always rejects.
 */
export function shouldUseDemoFallback(error: unknown): boolean {
  return isDemoMode() && (isBackendUnreachable(error) || hasDemoSession())
}

export default apiClient
