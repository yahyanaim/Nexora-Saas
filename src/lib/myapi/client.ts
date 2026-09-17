import axios, { type AxiosResponse } from "axios"
import type { AuthResponse } from "@/types/auth"
import { env } from "@/env"

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

let isRefreshing = false
let refreshPromise: Promise<AxiosResponse<AuthResponse>> | null = null

/**
 * Global response interceptor:
 * 1. Plan Gate Interceptor: Listens for 403 + upgrade_required to trigger billing prompts.
 * 2. Token Refresh Interceptor: Transparently queues failed 401s, attempts session refresh,
 *    and replays the original request with minimal friction.
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error)
    }

    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean
    }
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
    // Skip if already retried, or if this request was itself an auth attempt
    const url = originalRequest?.url ?? ""
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh")

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      originalRequest._retry = true

      try {
        if (!isRefreshing) {
          isRefreshing = true
          refreshPromise = apiClient
            .post<AuthResponse>("/auth/refresh")
            .finally(() => {
              isRefreshing = false
              refreshPromise = null
            })
        }

        await refreshPromise
        return apiClient(originalRequest)
      } catch (refreshError) {
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

export default apiClient
