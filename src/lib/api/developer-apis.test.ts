import { describe, it, expect, beforeEach } from "vitest"
import {
  getApiKeysApi,
  createApiKeyApi,
  revokeApiKeyApi,
  getWebhooksApi,
  createWebhookApi,
  testWebhookPingApi,
} from "./developer-apis"

describe("developer-apis", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("retrieves initial API keys", async () => {
    const keys = await getApiKeysApi()
    expect(keys.length).toBeGreaterThanOrEqual(3)
    expect(keys[0]!.tokenPrefix).toContain("nex_live_")
  })

  it("generates a new scoped API key and stores it", async () => {
    const res = await createApiKeyApi("Test Service Token", ["read:users", "write:invoices"])
    expect(res.fullToken).toMatch(/^nex_live_/)
    expect(res.apiKey.name).toBe("Test Service Token")
    expect(res.apiKey.scopes).toEqual(["read:users", "write:invoices"])

    const keys = await getApiKeysApi()
    expect(keys[0]!.name).toBe("Test Service Token")
  })

  it("revokes an active API key", async () => {
    const { apiKey } = await createApiKeyApi("Temporary Token", ["read:analytics"])
    expect(apiKey.status).toBe("active")

    const revoked = await revokeApiKeyApi(apiKey.id)
    expect(revoked).toBe(true)

    const keys = await getApiKeysApi()
    const found = keys.find((k) => k.id === apiKey.id)
    expect(found?.status).toBe("revoked")
  })

  it("registers and tests a webhook endpoint", async () => {
    const webhook = await createWebhookApi("https://example.com/webhook", ["invoice.paid"])
    expect(webhook.url).toBe("https://example.com/webhook")
    expect(webhook.secretKey).toMatch(/^whsec_live_/)

    const list = await getWebhooksApi()
    expect(list.some((w) => w.id === webhook.id)).toBe(true)

    const ping = await testWebhookPingApi(webhook.id)
    expect(ping.success).toBe(true)
    expect(ping.statusCode).toBe(200)
    expect(ping.latencyMs).toBeGreaterThan(0)
  })
})
