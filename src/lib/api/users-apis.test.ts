import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { AxiosError } from "axios"
import apiClient from "@/lib/myapi/client"
import { fetchUsersApi } from "./users-apis"
import { getDemoUsers } from "@/lib/demo-data"

describe("users-apis fallback", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("falls back to demo users when the backend is unreachable in demo mode", async () => {
    vi.spyOn(apiClient, "get").mockRejectedValueOnce(new AxiosError("Network Error", "ERR_NETWORK"))

    const res = await fetchUsersApi({ page: 0, pageSize: 10 })
    expect(res.success).toBe(true)
    expect(res.data.length).toBeGreaterThan(0)
    expect(res.data[0]!.email).toBe(getDemoUsers()[0]!.email)
  })

  it("falls back to demo users when apiClient.get returns empty list", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({ data: [] })

    const res = await fetchUsersApi({ page: 0, pageSize: 10 })
    expect(res.success).toBe(true)
    expect(res.data.length).toBeGreaterThan(0)
    expect(res.data[0]!.email).toBe(getDemoUsers()[0]!.email)
  })

  it("returns the real empty list when demo mode is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false")
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({ data: [] })

    const res = await fetchUsersApi({ page: 0, pageSize: 10 })
    expect(res.data).toEqual([])
  })

  it("rethrows backend errors when demo mode is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false")
    vi.spyOn(apiClient, "get").mockRejectedValueOnce(new AxiosError("Network Error", "ERR_NETWORK"))

    await expect(fetchUsersApi({ page: 0, pageSize: 10 })).rejects.toThrow("Network Error")
  })
})
