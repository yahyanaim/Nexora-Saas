"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { DataTable } from "@/components/shared/data-table-chunks/data-table"
import { getAuditLogsColumns } from "./audit-logs-columns"
import { AuditLogsSummaryCards } from "./audit-logs-summary-cards"
import { getAuditLogsApi } from "@/lib/api/audit-logs-api"
import { AuditLogEntry } from "@/lib/demo-data/audit-logs"
import { Shield } from "@/components/ui/carbon/icons"
import { Badge } from "@/components/ui/badge"
import { FacetedFilterConfig } from "../data-table-chunks/data-table-toolbar"
import { PageHeader } from "@/components/shared/page-header"

export default function AuditLogsPage() {
  const t = useTranslations()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function loadLogs() {
      setIsLoading(true)
      try {
        const res = await getAuditLogsApi()
        if (mounted && res?.logs) {
          setLogs(res.logs)
        }
      } catch (err) {
        console.error("Failed to load audit logs:", err)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    loadLogs()
    return () => {
      mounted = false
    }
  }, [])

  const columns = useMemo(() => getAuditLogsColumns(t), [t])

  const filters: FacetedFilterConfig[] = useMemo(
    () => [
      {
        columnId: "category",
        title: t("category") || "Category",
        options: [
          { label: "Security", value: "Security" },
          { label: "Billing", value: "Billing" },
          { label: "Team", value: "Team" },
          { label: "API", value: "API" },
          { label: "System", value: "System" },
        ],
      },
      {
        columnId: "status",
        title: t("status") || "Status",
        options: [
          { label: "Success", value: "success" },
          { label: "Warning", value: "warning" },
          { label: "Failed", value: "error" },
        ],
      },
    ],
    [t]
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        badge={
          <Badge variant="success" className="hidden sm:inline-flex">
            <Shield />
            SOC 2 Compliant
          </Badge>
        }
        description="Immutable, real-time audit trail of all security incidents, privileged role modifications, billing cycles, and API dispatches."
      />

      {/* KPI Metric Summary Cards */}
      <AuditLogsSummaryCards logs={logs} isLoading={isLoading} />

      {/* Data Table with Search, Filter & Universal Export */}
      <DataTable
        columns={columns}
        data={logs}
        searchColumnId="targetResource"
        searchPlaceholder="Filter by resource, actor, or IP address..."
        filters={filters}
        isLoading={isLoading}
        title={t("auditLogs") || "Audit Logs"}
        exportFilename="nexora-audit-logs-export"
        enableExport={true}
      />
    </div>
  )
}
