import { describe, it, expect, vi, beforeEach } from "vitest"
import apiClient from "@/lib/myapi/client"
import { fetchUsersApi } from "./users-apis"
import { getDemoUsers } from "@/lib/demo-data"

describe("users-apis fallback", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("falls back to demo users when apiClient.get fails", async () => {
    vi.spyOn(apiClient, "get").mockRejectedValueOnce(new Error("Network Error"))

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
})
