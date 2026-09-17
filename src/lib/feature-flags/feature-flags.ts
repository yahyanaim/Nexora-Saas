import { BillingPlan } from "@/types/plans"

export type FeatureFlagKey =
  | "advancedAnalytics"
  | "apiKeys"
  | "sso"
  | "auditLogs"
  | "teamManagement"
  | "customDomain"
  | "dataExport"
  | "usageMetering"
  | "prioritySupport"

export interface FeatureFlagConfig {
  name: string
  description: string
  requiredPlans: BillingPlan[]
  minPlan: BillingPlan
}

export const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlagConfig> = {
  advancedAnalytics: {
    name: "Advanced Analytics",
    description: "Deep engagement, retention charts and cohort breakdown",
    requiredPlans: ["pro", "enterprise"],
    minPlan: "pro",
  },
  apiKeys: {
    name: "Developer API Keys",
    description: "Programmatic access to platform endpoints and webhooks",
    requiredPlans: ["pro", "enterprise"],
    minPlan: "pro",
  },
  sso: {
    name: "Single Sign-On (SAML / OIDC)",
    description: "Enterprise identity provider integration (Okta, Azure AD)",
    requiredPlans: ["enterprise"],
    minPlan: "enterprise",
  },
  auditLogs: {
    name: "Audit Logs",
    description: "Immutable security and compliance event tracking",
    requiredPlans: ["pro", "enterprise"],
    minPlan: "pro",
  },
  teamManagement: {
    name: "Team & Role Management",
    description: "Invite team members and manage role-based access",
    requiredPlans: ["pro", "enterprise"],
    minPlan: "pro",
  },
  customDomain: {
    name: "Custom Domains",
    description: "Host client portals on your own company domain with automated SSL",
    requiredPlans: ["enterprise"],
    minPlan: "enterprise",
  },
  dataExport: {
    name: "Bulk Data Export",
    description: "Export table datasets and account data to CSV/JSON",
    requiredPlans: ["pro", "enterprise"],
    minPlan: "pro",
  },
  usageMetering: {
    name: "Usage & Quota Metering",
    description: "Real-time resource quota and usage threshold tracking",
    requiredPlans: ["pro", "enterprise"],
    minPlan: "pro",
  },
  prioritySupport: {
    name: "24/7 Priority Support",
    description: "Dedicated account manager and 1-hour SLA response time",
    requiredPlans: ["enterprise"],
    minPlan: "enterprise",
  },
}

const PLAN_ORDER: Record<BillingPlan, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

/**
 * Pure evaluation function for feature flags given a plan tier.
 */
export function isFeatureEnabledForPlan(
  flag: FeatureFlagKey,
  currentPlan: BillingPlan = "free"
): boolean {
  const config = FEATURE_FLAGS[flag]
  if (!config) return false
  return (PLAN_ORDER[currentPlan] ?? 0) >= (PLAN_ORDER[config.minPlan] ?? 0)
}
