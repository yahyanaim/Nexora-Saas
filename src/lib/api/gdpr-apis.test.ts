import { describe, it, expect } from "vitest"
import {
  requestDataExportApi,
  getDataExportStatusApi,
  requestAccountDeletionApi,
  cancelAccountDeletionApi,
} from "./gdpr-apis"

describe("gdpr-apis", () => {
  it("creates a data export request with download details", async () => {
    const res = await requestDataExportApi("json")
    expect(res).toBeDefined()
    expect(res.id).toMatch(/^exp_/)
    expect(res.format).toBe("json")
    expect(res.status).toBe("completed")
    expect(res.downloadUrl).toBeDefined()
  })

  it("checks status of existing export request", async () => {
    const res = await getDataExportStatusApi("exp_test_123")
    expect(res.id).toBe("exp_test_123")
    expect(res.status).toBe("completed")
  })

  it("schedules account deletion with a 14-day grace period", async () => {
    const res = await requestAccountDeletionApi({ reason: "Switching providers" })
    expect(res).toBeDefined()
    expect(res.status).toBe("pending")
    expect(res.gracePeriodDays).toBe(14)
    expect(res.scheduledFor).toBeDefined()
  })

  it("cancels pending account deletion", async () => {
    const res = await cancelAccountDeletionApi()
    expect(res.success).toBe(true)
  })
})
