import { describe, it, expect } from "vitest"
import {
  isFeatureEnabledForPlan,
  FEATURE_FLAGS,
} from "./feature-flags"

describe("feature flags", () => {
  it("defines standard enterprise feature flags", () => {
    expect(FEATURE_FLAGS.advancedAnalytics).toBeDefined()
    expect(FEATURE_FLAGS.sso).toBeDefined()
    expect(FEATURE_FLAGS.auditLogs).toBeDefined()
    expect(FEATURE_FLAGS.teamManagement).toBeDefined()
    expect(FEATURE_FLAGS.usageMetering).toBeDefined()
  })

  it("enforces plan tier requirements", () => {
    // Free plan
    expect(isFeatureEnabledForPlan("advancedAnalytics", "free")).toBe(false)
    expect(isFeatureEnabledForPlan("sso", "free")).toBe(false)

    // Pro plan
    expect(isFeatureEnabledForPlan("advancedAnalytics", "pro")).toBe(true)
    expect(isFeatureEnabledForPlan("teamManagement", "pro")).toBe(true)
    expect(isFeatureEnabledForPlan("sso", "pro")).toBe(false) // SSO is enterprise-only

    // Enterprise plan
    expect(isFeatureEnabledForPlan("advancedAnalytics", "enterprise")).toBe(true)
    expect(isFeatureEnabledForPlan("sso", "enterprise")).toBe(true)
    expect(isFeatureEnabledForPlan("prioritySupport", "enterprise")).toBe(true)
  })
})
