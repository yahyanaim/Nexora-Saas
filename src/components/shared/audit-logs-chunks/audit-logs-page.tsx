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
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {t("auditLogs") || "Audit Logs"}
            </h1>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex gap-1 text-xs font-normal border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <Shield className="size-3" />
              SOC 2 Compliant
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable, real-time audit trail of all security incidents, privileged role modifications, billing cycles, and API dispatches.
          </p>
        </div>
      </div>

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
