import apiClient, { apiErrorMessage, shouldUseDemoFallback } from "@/lib/myapi/client"
import { AuditLogEntry, demoAuditLogs } from "@/lib/demo-data/audit-logs"
import { logger } from "@/lib/logger"
import { listAudit } from "@/lib/workforce/audit"

export interface AuditLogsResponse {
  logs: AuditLogEntry[]
  total: number
}

/**
 * Dual-Mode Resilient API for retrieving security and compliance audit logs.
 */
export async function getAuditLogsApi(workspaceId?: string): Promise<AuditLogsResponse> {
  // Changes recorded in this workspace come first (PLT-12)
  const recorded = workspaceId ? listAudit(workspaceId) : []
  const withRecorded = (logs: AuditLogEntry[]) => ({ logs: [...recorded, ...logs], total: recorded.length + logs.length })
  try {
    const res = await apiClient.get<AuditLogsResponse>("/audit-logs")
    if (res?.data?.logs && Array.isArray(res.data.logs)) {
      return res.data
    }
    return withRecorded(demoAuditLogs)
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to fetch audit logs")
    logger.error("[API Error] getAuditLogsApi failed:", message, error)
    if (!shouldUseDemoFallback(error)) {
      throw error
    }
    return withRecorded(demoAuditLogs)
  }
}
