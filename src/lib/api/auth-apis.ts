import apiClient from "@/lib/myapi/client"
import { tokenStorage } from "@/lib/myapi/token-storage"
import {
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
  ResetPasswordPayload,
  ForgotPasswordPayload,
  ChangeProfilePayload,
  ChangePasswordPayload,
  InviteAcceptPayload,
  TwoFactorVerifyPayload,
  AuthUser,
  AuthResponse,
} from "@/types/auth"

/**
 * Returns true when demo mode is explicitly enabled for local dev/preview only.
 * Defaults to false when unset, empty, or running in a production environment.
 * Demo mode enables graceful fallbacks to hardcoded data when the backend
 * is unreachable — intended strictly for showcases and local dev.
 */
import { isDemoMode } from "@/lib/auth/demo-mode"
export { isDemoMode }

export const DEMO_ADMIN_USER: AuthUser = {
  id: "usr-demo-1",
  name: "Alex Morgan",
  email: "alex.morgan@company.io",
  role: "admin",
  emailVerified: true,
  avatar: "/avatars/alex-morgan.jpg",
}

export const loginApi = async (
  payload: LoginPayload
): Promise<LoginResponse> => {
  try {
    const { data } = await apiClient.post("/auth/login", payload)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("saas_demo_logged_out")
    }
    return data
  } catch (err) {
    // Only fall back to demo user when demo mode is explicitly enabled in local dev
    if (isDemoMode()) {
      console.warn(
        "[AUTH WARNING] Demo mode fallback used in loginApi: Logged in as Demo Administrator. Do NOT enable NEXT_PUBLIC_DEMO_MODE in production."
      )
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("saas_demo_logged_out")
        tokenStorage.set("demo-session-token")
      }
      return {
        success: true,
        user: DEMO_ADMIN_USER,
        message: "Logged in as Demo Administrator",
        id: DEMO_ADMIN_USER.id,
        name: DEMO_ADMIN_USER.name,
        email: DEMO_ADMIN_USER.email,
        role: DEMO_ADMIN_USER.role,
      }
    }
    throw err
  }
}

export const registerApi = async (
  payload: RegisterPayload
): Promise<RegisterResponse> => {
  try {
    const { data } = await apiClient.post("/auth/register", payload)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("saas_demo_logged_out")
    }
    return data
  } catch (err) {
    if (isDemoMode()) {
      console.warn(
        "[AUTH WARNING] Demo mode fallback used in registerApi: Created local demo user. Do NOT enable NEXT_PUBLIC_DEMO_MODE in production."
      )
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("saas_demo_logged_out")
        tokenStorage.set("demo-session-token")
      }
      const demoUser: AuthUser = {
        id: `usr-demo-${Date.now()}`,
        name: payload.name || "Demo User",
        email: payload.email,
        role: "user",
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return {
        success: true,
        id: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
        role: demoUser.role,
        message: "Registration successful (Demo Mode)",
        user: demoUser,
      }
    }
    throw err
  }
}

export const refreshApi = async (): Promise<AuthResponse> => {
  const { data } = await apiClient.post("/auth/refresh")
  return data
}

export const logoutApi = async (): Promise<void> => {
  try {
    await apiClient.post("/auth/logout")
  } catch {
    // ignore network errors on logout
  }
  if (typeof window !== "undefined") {
    sessionStorage.setItem("saas_demo_logged_out", "true")
    tokenStorage.clear()
  }
}

export const fetchMyAccountApi = async (): Promise<AuthUser> => {
  try {
    const { data } = await apiClient.get("/auth/me")
    if (data?.id) return data
  } catch {
    // Backend session not active; fall through to demo session if enabled
  }

  // Only provide demo user when demo mode is on
  if (isDemoMode()) {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("saas_demo_logged_out") === "true") {
        throw new Error("Unauthenticated")
      }
    }
    console.warn(
      "[AUTH WARNING] Demo mode fallback used in fetchMyAccountApi: Returning DEMO_ADMIN_USER. Do NOT enable NEXT_PUBLIC_DEMO_MODE in production."
    )
    return DEMO_ADMIN_USER
  }

  throw new Error("Unauthenticated")
}

export const requestVerificationApi = async (
  email: string
): Promise<{ message: string }> => {
  const { data } = await apiClient.post("/auth/verify-request", { email })
  return data
}

export const verifyAccountApi = async (
  token: string
): Promise<{ message: string }> => {
  const { data } = await apiClient.get(`/auth/verify?token=${encodeURIComponent(token)}`)
  return data
}

export const forgotPasswordApi = async (
  payload: ForgotPasswordPayload | string
): Promise<{ message: string; otpId?: string }> => {
  const email = typeof payload === "string" ? payload : payload.email
  const { data } = await apiClient.post("/auth/password-reset-request", { email })
  return { message: data?.message || "Password reset requested", otpId: "email" }
}

export const verifyForgotPasswordApi = async (payload: {
  otpCode: string
  otpId?: string
}): Promise<{ resetToken: string }> => {
  const { data } = await apiClient.post<{ resetToken: string }>(
    "/auth/password-reset-verify",
    {
      otpCode: payload.otpCode,
      otpId: payload.otpId,
    }
  )
  return data
}

export const verifyPasscodeApi = async (passcode: string): Promise<boolean> => {
  const { data } = await apiClient.post<
    boolean | { valid?: boolean; success?: boolean }
  >("/auth/passcode-verify", { passcode })
  if (typeof data === "boolean") return data
  if (data && typeof data === "object") {
    if (typeof data.valid === "boolean") return data.valid
    if (typeof data.success === "boolean") return data.success
  }
  return Boolean(data)
}

export const resetPasswordApi = async (
  payload: ResetPasswordPayload
): Promise<{ message: string }> => {
  const { data } = await apiClient.post("/auth/password-reset", {
    token: payload.token,
    newPassword: payload.newPassword,
    confirmNewPassword: payload.confirmNewPassword ?? payload.newPassword,
  })
  return data
}

export const acceptInviteApi = async (
  payload: InviteAcceptPayload
): Promise<AuthResponse> => {
  const { data } = await apiClient.post("/auth/invite-accept", payload)
  return data
}

export const verify2FaApi = async (
  payload: TwoFactorVerifyPayload
): Promise<AuthResponse> => {
  const { data } = await apiClient.post("/auth/2fa/verify", payload)
  return data
}

export const setup2FaApi = async (): Promise<{
  secret: string
  qrCodeUrl: string
}> => {
  const { data } = await apiClient.post("/auth/2fa/setup")
  return data
}

export const enable2FaApi = async (
  code: string
): Promise<{ message: string }> => {
  const { data } = await apiClient.post("/auth/2fa/enable", { code })
  return data
}

export const disable2FaApi = async (payload: {
  password: string
  code: string
}): Promise<{ message: string }> => {
  const { data } = await apiClient.post("/auth/2fa/disable", payload)
  return data
}

export const changeProfileInfApi = async (payload: ChangeProfilePayload) => {
  const { data } = await apiClient.put("/profile", payload)
  return data
}

export const changePasswordApi = async (payload: ChangePasswordPayload) => {
  const { data } = await apiClient.put("/profile/password", payload)
  return data
}

export const deleteAccountApi = async (): Promise<{ message: string }> => {
  const { data } = await apiClient.delete("/profile")
  return data
}

/**
 * Fetches a short-lived socket ticket token if supported by backend.
 * For backends using HttpOnly cookie authentication, this returns null
 * and the client relies on `withCredentials: true` during socket handshake.
 */
export const fetchSocketTokenApi = async (): Promise<string | null> => {
  try {
    const { data } = await apiClient.post<{ token: string }>("/auth/socket-token")
    return data?.token ?? null
  } catch {
    return null
  }
}

