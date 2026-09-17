import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import apiClient from "@/lib/myapi/client"
import { tokenStorage } from "@/lib/myapi/token-storage"
import {
  loginApi,
  registerApi,
  logoutApi,
  fetchMyAccountApi,
  requestVerificationApi,
  verifyAccountApi,
  forgotPasswordApi,
  verifyForgotPasswordApi,
  verifyPasscodeApi,
  resetPasswordApi,
  changePasswordApi,
  isDemoMode,
  DEMO_ADMIN_USER,
} from "./auth-apis"

describe("auth-apis", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("loginApi sends POST /auth/login with credentials", async () => {
    const mockUser = {
      id: "usr-1",
      name: "Founder",
      email: "founder@saas.test",
      role: "admin" as const,
    }
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: { success: true, user: mockUser },
    })

    const result = await loginApi({
      email: "founder@saas.test",
      password: "Password123!",
    })

    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
      email: "founder@saas.test",
      password: "Password123!",
    })
    expect(result.user?.email).toBe("founder@saas.test")
  })

  it("registerApi sends POST /auth/register", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: { id: "usr-2", name: "Alice", email: "alice@test.com" },
    })

    const result = await registerApi({
      name: "Alice",
      email: "alice@test.com",
      password: "Password123!",
    })

    expect(apiClient.post).toHaveBeenCalledWith("/auth/register", {
      name: "Alice",
      email: "alice@test.com",
      password: "Password123!",
    })
    expect(result.id).toBe("usr-2")
  })

  it("fetchMyAccountApi sends GET /auth/me", async () => {
    const mockProfile = {
      id: "usr-1",
      name: "Founder",
      email: "founder@saas.test",
      role: "admin" as const,
    }
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({ data: mockProfile })

    const user = await fetchMyAccountApi()
    expect(apiClient.get).toHaveBeenCalledWith("/auth/me")
    expect(user.id).toBe("usr-1")
    expect(user.name).toBe("Founder")
  })

  it("logoutApi sends POST /auth/logout", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({ data: {} })
    await logoutApi()
    expect(postSpy).toHaveBeenCalledWith("/auth/logout")
  })

  it("requestVerificationApi sends POST /auth/verify-request", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: { message: "Verification email sent" },
    })

    const res = await requestVerificationApi("test@saas.test")
    expect(apiClient.post).toHaveBeenCalledWith("/auth/verify-request", {
      email: "test@saas.test",
    })
    expect(res.message).toBe("Verification email sent")
  })

  it("verifyAccountApi sends GET /auth/verify with encoded token", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: { message: "Account verified" },
    })

    const res = await verifyAccountApi("abc+123")
    expect(apiClient.get).toHaveBeenCalledWith("/auth/verify?token=abc%2B123")
    expect(res.message).toBe("Account verified")
  })

  it("forgotPasswordApi sends POST /auth/password-reset-request", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: { message: "Reset email sent" },
    })

    const res = await forgotPasswordApi({ email: "test@saas.test" })
    expect(apiClient.post).toHaveBeenCalledWith("/auth/password-reset-request", {
      email: "test@saas.test",
    })
    expect(res.message).toBe("Reset email sent")
  })

  it("resetPasswordApi sends POST /auth/password-reset with token and passwords", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: { message: "Password updated successfully" },
    })

    const res = await resetPasswordApi({
      token: "reset-tok-123",
      newPassword: "NewSecret123!",
      confirmNewPassword: "NewSecret123!",
    })

    expect(apiClient.post).toHaveBeenCalledWith("/auth/password-reset", {
      token: "reset-tok-123",
      newPassword: "NewSecret123!",
      confirmNewPassword: "NewSecret123!",
    })
    expect(res.message).toBe("Password updated successfully")
  })

  it("changePasswordApi sends PUT /profile/password", async () => {
    vi.spyOn(apiClient, "put").mockResolvedValueOnce({
      data: { message: "Password changed successfully" },
    })

    const res = await changePasswordApi({
      currentPassword: "OldPassword1!",
      newPassword: "NewPassword2!",
    })

    expect(apiClient.put).toHaveBeenCalledWith("/profile/password", {
      currentPassword: "OldPassword1!",
      newPassword: "NewPassword2!",
    })
    expect(res.message).toBe("Password changed successfully")
  })

  describe("verifyForgotPasswordApi", () => {
    it("sends POST /auth/password-reset-verify and returns resetToken on success", async () => {
      vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        data: { resetToken: "tok-reset-valid" },
      })

      const res = await verifyForgotPasswordApi({
        otpCode: "123456",
        otpId: "email",
      })

      expect(apiClient.post).toHaveBeenCalledWith("/auth/password-reset-verify", {
        otpCode: "123456",
        otpId: "email",
      })
      expect(res.resetToken).toBe("tok-reset-valid")
    })

    it("rejects on 400/401 failure when OTP is invalid or expired", async () => {
      const error = new Error("Invalid or expired OTP")
      vi.spyOn(apiClient, "post").mockRejectedValueOnce(error)

      await expect(
        verifyForgotPasswordApi({
          otpCode: "999999",
          otpId: "email",
        })
      ).rejects.toThrow("Invalid or expired OTP")
    })
  })

  describe("verifyPasscodeApi", () => {
    it("sends POST /auth/passcode-verify and returns true on boolean response", async () => {
      vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        data: true,
      })

      const isValid = await verifyPasscodeApi("1234")

      expect(apiClient.post).toHaveBeenCalledWith("/auth/passcode-verify", {
        passcode: "1234",
      })
      expect(isValid).toBe(true)
    })

    it("handles object response containing valid or success flags", async () => {
      vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        data: { valid: true },
      })
      expect(await verifyPasscodeApi("1234")).toBe(true)

      vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        data: { valid: false },
      })
      expect(await verifyPasscodeApi("0000")).toBe(false)
    })

    it("rejects on 400/401 failure from server", async () => {
      const error = new Error("Passcode verification failed")
      vi.spyOn(apiClient, "post").mockRejectedValueOnce(error)

      await expect(verifyPasscodeApi("0000")).rejects.toThrow(
        "Passcode verification failed"
      )
    })
  })

  describe("demo-mode security guards", () => {
    const originalDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE
    const originalVercelEnv = process.env.VERCEL_ENV

    afterEach(() => {
      process.env.NEXT_PUBLIC_DEMO_MODE = originalDemoMode
      process.env.VERCEL_ENV = originalVercelEnv
      if (typeof window !== "undefined") {
        sessionStorage.clear()
      }
    })

    it("isDemoMode() returns false when unset, empty, or false", () => {
      delete process.env.NEXT_PUBLIC_DEMO_MODE
      delete process.env.VERCEL_ENV
      expect(isDemoMode()).toBe(false)

      process.env.NEXT_PUBLIC_DEMO_MODE = "false"
      expect(isDemoMode()).toBe(false)

      process.env.NEXT_PUBLIC_DEMO_MODE = ""
      expect(isDemoMode()).toBe(false)
    })

    it("isDemoMode() returns true only when explicitly 'true' and not production", () => {
      delete process.env.VERCEL_ENV
      process.env.NEXT_PUBLIC_DEMO_MODE = "true"
      expect(isDemoMode()).toBe(true)
    })

    it("isDemoMode() returns false in production even if NEXT_PUBLIC_DEMO_MODE is 'true'", () => {
      process.env.VERCEL_ENV = "production"
      process.env.NEXT_PUBLIC_DEMO_MODE = "true"
      expect(isDemoMode()).toBe(false)
    })

    it("loginApi throws error when backend fails and isDemoMode() is false", async () => {
      delete process.env.NEXT_PUBLIC_DEMO_MODE
      delete process.env.VERCEL_ENV
      vi.spyOn(apiClient, "post").mockRejectedValueOnce(new Error("Invalid credentials"))

      await expect(
        loginApi({ email: "attacker@test.com", password: "wrongpassword" })
      ).rejects.toThrow("Invalid credentials")
    })

    it("loginApi logs console.warn, sets demo token, and returns DEMO_ADMIN_USER when isDemoMode() is true", async () => {
      delete process.env.VERCEL_ENV
      process.env.NEXT_PUBLIC_DEMO_MODE = "true"
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const tokenSpy = vi.spyOn(tokenStorage, "set").mockImplementation(() => {})
      vi.spyOn(apiClient, "post").mockRejectedValueOnce(new Error("Network Error"))

      const result = await loginApi({ email: "demo@test.com", password: "any" })

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[AUTH WARNING] Demo mode fallback used in loginApi")
      )
      expect(tokenSpy).toHaveBeenCalledWith("demo-session-token")
      expect(result.user).toEqual(DEMO_ADMIN_USER)
    })

    it("fetchMyAccountApi throws when backend fails and isDemoMode() is false", async () => {
      delete process.env.NEXT_PUBLIC_DEMO_MODE
      delete process.env.VERCEL_ENV
      vi.spyOn(apiClient, "get").mockRejectedValueOnce(new Error("Unauthorized"))

      await expect(fetchMyAccountApi()).rejects.toThrow("Unauthenticated")
    })

    it("fetchMyAccountApi logs console.warn and returns DEMO_ADMIN_USER when isDemoMode() is true", async () => {
      delete process.env.VERCEL_ENV
      process.env.NEXT_PUBLIC_DEMO_MODE = "true"
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      vi.spyOn(apiClient, "get").mockRejectedValueOnce(new Error("Unauthorized"))

      const user = await fetchMyAccountApi()

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[AUTH WARNING] Demo mode fallback used in fetchMyAccountApi")
      )
      expect(user).toEqual(DEMO_ADMIN_USER)
    })

    it("logoutApi clears token via tokenStorage.clear()", async () => {
      vi.spyOn(apiClient, "post").mockResolvedValueOnce({ data: {} })
      const clearSpy = vi.spyOn(tokenStorage, "clear").mockImplementation(() => {})

      await logoutApi()

      expect(clearSpy).toHaveBeenCalled()
    })

    describe("tokenStorage guards", () => {
      it("returns null on get() and no-ops on set() when isDemoMode() is false", () => {
        delete process.env.NEXT_PUBLIC_DEMO_MODE
        delete process.env.VERCEL_ENV

        tokenStorage.set("test-token")
        expect(tokenStorage.get()).toBeNull()
      })

      it("allows get() and set() when isDemoMode() is true", () => {
        delete process.env.VERCEL_ENV
        process.env.NEXT_PUBLIC_DEMO_MODE = "true"

        tokenStorage.set("preview-token")
        expect(tokenStorage.get()).toBe("preview-token")
        tokenStorage.clear()
        expect(tokenStorage.get()).toBeNull()
      })
    })
  })
})
