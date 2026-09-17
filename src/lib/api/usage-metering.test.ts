import { describe, it, expect } from "vitest"
import { fetchUsageApi, checkQuotaApi } from "./usage-metering"

describe("usage-metering", () => {
  it("fetches usage metrics summary", async () => {
    const usage = await fetchUsageApi()
    expect(usage).toBeDefined()
    expect(usage.apiCalls).toBeDefined()
    expect(usage.apiCalls.used).toBeGreaterThan(0)
    expect(usage.teamSeats).toBeDefined()
    expect(usage.storageGb).toBeDefined()
  })

  it("checks resource quota status accurately", async () => {
    const quota = await checkQuotaApi("apiCalls")
    expect(quota).toBeDefined()
    expect(quota.used).toBeDefined()
    expect(quota.limit).toBeDefined()
    expect(typeof quota.allowed).toBe("boolean")
    expect(quota.remaining).toBe(quota.limit - quota.used)
  })
})
