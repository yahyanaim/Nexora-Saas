export interface ApiKey {
  id: string
  name: string
  tokenPrefix: string
  tokenSecret?: string
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
  status: "active" | "revoked"
}

export interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  secretKey: string
  status: "active" | "failing"
  failureCount: number
  createdAt: string
}

export const AVAILABLE_SCOPES = [
  { id: "read:users", label: "Read Users", description: "Query user profiles and directory listings" },
  { id: "write:users", label: "Write Users", description: "Create, update, and manage accounts" },
  { id: "read:invoices", label: "Read Invoices", description: "View invoices, totals, and payment status" },
  { id: "write:invoices", label: "Write Invoices", description: "Generate and send new billing invoices" },
  { id: "read:analytics", label: "Read Analytics", description: "Access aggregated traffic and cohort telemetry" },
  { id: "admin:all", label: "Full Administrator", description: "Unrestricted operational access to all endpoints" },
]

export const AVAILABLE_WEBHOOK_EVENTS = [
  { id: "invoice.paid", label: "Invoice Paid", description: "Triggered when customer payment clears" },
  { id: "user.created", label: "User Created", description: "Triggered when a new user registers or is invited" },
  { id: "user.banned", label: "User Sanctioned", description: "Triggered upon security restriction enforcement" },
  { id: "subscription.updated", label: "Subscription Updated", description: "Triggered upon plan tier changes" },
  { id: "role.granted", label: "Role Granted", description: "Triggered when privileges are reassigned" },
]

export const initialApiKeys: ApiKey[] = [
  {
    id: "key_live_01",
    name: "Production CI/CD Runner",
    tokenPrefix: "nex_live_9a7d3f82...",
    scopes: ["read:users", "write:invoices"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), // 14 days ago
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
    status: "active",
  },
  {
    id: "key_live_02",
    name: "Analytics Data Ingestion Gateway",
    tokenPrefix: "nex_live_bc42e819...",
    scopes: ["read:analytics"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hrs ago
    status: "active",
  },
  {
    id: "key_live_03",
    name: "Zapier Automated CRM Sync",
    tokenPrefix: "nex_live_11fac892...",
    scopes: ["read:users", "write:users"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(), // 60 days ago
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    status: "active",
  },
]

export const initialWebhooks: WebhookEndpoint[] = [
  {
    id: "whk_01",
    url: "https://hooks.slack.com/services/T0123/B4567/nexora-feed",
    events: ["invoice.paid", "user.banned"],
    secretKey: "whsec_live_920f718bc3d2e14",
    status: "active",
    failureCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
  },
  {
    id: "whk_02",
    url: "https://api.partnercrm.io/v1/nexora-sync",
    events: ["user.created", "subscription.updated"],
    secretKey: "whsec_live_55a18c99f1230ab",
    status: "active",
    failureCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
  },
]
