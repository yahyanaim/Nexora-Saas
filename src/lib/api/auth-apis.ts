import httpClient from "./http-client"
import {
  LoginPayload,
  LoginResponse,
  VerifyOtpPayload,
  ResetPasswordPayload,
  ForgotPasswordPayload,
  ChangeProfilePayload,
  ChangePasswordPayload,
  SendOtpResponse,
  SendOtpPayload,
} from "@/types/auth"

export const loginApi = async (
  payload: LoginPayload
): Promise<LoginResponse> => {
  const { data } = await httpClient.post("/auth/login", payload)
  const d = data?.data
  // If login is direct (no OTP/2FA gate), store session immediately
  if (d?.token) {
    localStorage.setItem("token", d?.token)
    localStorage.setItem("user", JSON.stringify(d?.user))
  }

  return d
}

export const verifyAccountApi = async (payload: VerifyOtpPayload) => {
  const { data } = await httpClient.post("/auth/verify-otp", payload)
  const d = data?.data

  // After OTP verification, session is created
  if (d?.token) {
    localStorage.setItem("token", d?.token)
    localStorage.setItem("user", JSON.stringify(d?.user))
  }

  return d
}

/**
 * NOTE: In the new system forgot-password uses OTP too, but reset-password
 * verifies the code internally in one step. This function is kept for
 * backward-compatibility and simply calls the shared verify-otp endpoint.
 */
export const verifyForgotPasswordApi = async (payload: VerifyOtpPayload) => {
  const { data } = await httpClient.post("/auth/verify-otp", payload)
  return data?.data
}

export const sendOtpApi = async (
  payload: SendOtpPayload
): Promise<SendOtpResponse> => {
  const { data } = await httpClient.post("/auth/send-otp", payload)
  return data?.data
}

export const forgotPasswordApi = async (payload: ForgotPasswordPayload) => {
  const { data } = await httpClient.post("/auth/forgot-password", payload)
  return data?.data
}

/**
 * CHANGED: payload now uses `code` (OTP) instead of `token` (hashed link).
 * Endpoint stays the same but logic is now OTP-based.
 */
export const resetPasswordApi = async (payload: ResetPasswordPayload) => {
  const { data } = await httpClient.post("/auth/reset-password", payload)
  return data?.data
}

export const logoutApi = async () => {
  // try {
  //   // New: HTTP logout invalidates the DB session and clears the cookie
  //   await httpClient.post("/auth/logout")
  // } catch (err) {
  //   console.log("[Logout] Server logout failed:", err)
  // } finally {
  //   localStorage.removeItem("token")
  //   localStorage.removeItem("user")
  // }
  localStorage.removeItem("token")
  localStorage.removeItem("user")
}

/**
 * CHANGED: endpoint moved from `/account` → `/auth/me`
 */
export const fetchMyAccountApi = async () => {
  const { data } = await httpClient.get("/auth/me")
  return data?.data
}

/**
 * CHANGED:
 * - Method: PUT → PATCH
 * - Endpoint: `/account/change-information` → `/change-my-profile
 */
export const changeProfileInfApi = async (payload: ChangeProfilePayload) => {
  const { data } = await httpClient.patch("/auth/change-my-profile", payload)
  return data?.data
}

/**
 * CHANGED:
 * - Method: PUT → POST
 * - Endpoint: `/account/change-password` → `/auth/change-password`
 * - Field renamed: `oldPassword` → `currentPassword`
 */
export const changePasswordApi = async (payload: ChangePasswordPayload) => {
  const { data } = await httpClient.post("/auth/change-password", payload)
  return data?.data
}

/**
 * NOTE: You need to create this route in your Next.js backend
 * (e.g. POST /api/users/me/verify-passcode or /auth/verify-passcode)
 */
export const verifyPasscodeApi = async (passcode: string) => {
  const { data } = await httpClient.post("/auth/verify-passcode", { passcode })
  return data?.data
}
