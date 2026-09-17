import apiClient from "@/lib/myapi/client"
import { AuditLogEntry, demoAuditLogs } from "@/lib/demo-data/audit-logs"

export interface AuditLogsResponse {
  logs: AuditLogEntry[]
  total: number
}

/**
 * Dual-Mode Resilient API for retrieving security and compliance audit logs.
 */
export async function getAuditLogsApi(): Promise<AuditLogsResponse> {
  try {
    const res = await apiClient.get<AuditLogsResponse>("/audit-logs")
    if (res?.data?.logs && Array.isArray(res.data.logs)) {
      return res.data
    }
    return { logs: demoAuditLogs, total: demoAuditLogs.length }
  } catch {
    // Graceful fallback to demo data for isolated offline mode
    return { logs: demoAuditLogs, total: demoAuditLogs.length }
  }
}
