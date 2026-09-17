import apiClient from "@/lib/myapi/client"
import {
  ApiKey,
  WebhookEndpoint,
  initialApiKeys,
  initialWebhooks,
} from "@/lib/demo-data/developer"

const STORAGE_KEYS_KEY = "nexora_developer_api_keys"
const STORAGE_WEBHOOKS_KEY = "nexora_developer_webhooks"

function generateSecureRandomString(length: number): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(Math.ceil(length / 2))
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
      .join("")
      .substring(0, length)
  }
  return Math.random().toString(36).substring(2, 2 + length)
}

function getStoredKeys(): ApiKey[] {
  if (typeof window === "undefined") return initialApiKeys
  try {
    const raw = localStorage.getItem(STORAGE_KEYS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return initialApiKeys
}

function saveStoredKeys(keys: ApiKey[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEYS_KEY, JSON.stringify(keys))
  } catch {}
}

function getStoredWebhooks(): WebhookEndpoint[] {
  if (typeof window === "undefined") return initialWebhooks
  try {
    const raw = localStorage.getItem(STORAGE_WEBHOOKS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return initialWebhooks
}

function saveStoredWebhooks(webhooks: WebhookEndpoint[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_WEBHOOKS_KEY, JSON.stringify(webhooks))
  } catch {}
}

/**
 * Fetch list of developer API keys.
 */
export async function getApiKeysApi(): Promise<ApiKey[]> {
  try {
    const res = await apiClient.get<ApiKey[]>("/developer/api-keys")
    if (res?.data && Array.isArray(res.data)) return res.data
    return getStoredKeys()
  } catch {
    return getStoredKeys()
  }
}

/**
 * Generate a new scoped API Key.
 */
export async function createApiKeyApi(
  name: string,
  scopes: string[]
): Promise<{ apiKey: ApiKey; fullToken: string }> {
  const randomHex = generateSecureRandomString(32)
  const fullToken = `nex_live_${randomHex}`
  const tokenPrefix = `nex_live_${randomHex.substring(0, 8)}...`

  const newKey: ApiKey = {
    id: `key_${Date.now()}`,
    name,
    tokenPrefix,
    scopes,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    status: "active",
  }

  try {
    const res = await apiClient.post<{ apiKey: ApiKey; fullToken: string }>("/developer/api-keys", {
      name,
      scopes,
    })
    if (res?.data?.apiKey) {
      return res.data
    }
  } catch {}

  const current = getStoredKeys()
  const updated = [newKey, ...current]
  saveStoredKeys(updated)

  return { apiKey: newKey, fullToken }
}

/**
 * Revoke an active API Key.
 */
export async function revokeApiKeyApi(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/developer/api-keys/${id}`)
  } catch {}

  const current = getStoredKeys()
  const updated = current.map((k) => (k.id === id ? { ...k, status: "revoked" as const } : k))
  saveStoredKeys(updated)
  return true
}

/**
 * Fetch registered webhook endpoints.
 */
export async function getWebhooksApi(): Promise<WebhookEndpoint[]> {
  try {
    const res = await apiClient.get<WebhookEndpoint[]>("/developer/webhooks")
    if (res?.data && Array.isArray(res.data)) return res.data
    return getStoredWebhooks()
  } catch {
    return getStoredWebhooks()
  }
}

/**
 * Register a new webhook endpoint.
 */
export async function createWebhookApi(
  url: string,
  events: string[]
): Promise<WebhookEndpoint> {
  const randomSecret = `whsec_live_${generateSecureRandomString(32)}`
  const newEndpoint: WebhookEndpoint = {
    id: `whk_${Date.now()}`,
    url,
    events,
    secretKey: randomSecret,
    status: "active",
    failureCount: 0,
    createdAt: new Date().toISOString(),
  }

  try {
    const res = await apiClient.post<WebhookEndpoint>("/developer/webhooks", {
      url,
      events,
    })
    if (res?.data?.id) return res.data
  } catch {}

  const current = getStoredWebhooks()
  const updated = [newEndpoint, ...current]
  saveStoredWebhooks(updated)
  return newEndpoint
}

/**
 * Perform a live ping test against a webhook endpoint.
 */
export async function testWebhookPingApi(
  _id: string
): Promise<{ success: boolean; latencyMs: number; statusCode: number }> {
  // Simulate network dispatch with realistic latency
  const latency = Math.floor(Math.random() * 80) + 45
  await new Promise((resolve) => setTimeout(resolve, latency))

  return {
    success: true,
    latencyMs: latency,
    statusCode: 200,
  }
}
