"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  Shield,
  Activity,
  Terminal,
  UserFollow,
  TrendingUp,
  AlertTriangle,
} from "@/components/ui/carbon/icons"
import { AuditLogEntry } from "@/lib/demo-data/audit-logs"
import { MetricCardGrid, MetricCardItem } from "@/components/ui/metric-card-grid"

interface AuditLogsSummaryCardsProps {
  logs?: AuditLogEntry[]
  totalCount?: number
  isLoading?: boolean
}

export function AuditLogsSummaryCards({
  logs = [],
  totalCount,
  isLoading,
}: AuditLogsSummaryCardsProps) {
  const t = useTranslations()

  const summary = useMemo(() => {
    let security = 0
    let api = 0
    let team = 0

    logs.forEach((log) => {
      if (log.category === "Security" || log.status === "warning" || log.status === "error") {
        security++
      } else if (log.category === "API") {
        api++
      } else if (log.category === "Team") {
        team++
      }
    })

    const total = totalCount !== undefined ? totalCount : logs.length

    return {
      total,
      security,
      api,
      team,
    }
  }, [logs, totalCount])

  const cards: MetricCardItem[] = [
    {
      key: "totalEvents",
      title: t("totalEvents") || "Total Audit Events",
      value: summary.total,
      badge: {
        label: "+28.4%",
        icon: TrendingUp,
        variant: "outline",
        className: "gap-1",
      },
      footer: {
        icon: Activity,
        text: t("allRecordedActions") || "All recorded system operations",
      },
    },
    {
      key: "securityIncidents",
      title: t("securityIncidents") || "Security Sanctions",
      value: summary.security,
      valueClassName: summary.security > 0 ? "text-amber-600 dark:text-amber-400" : undefined,
      badge: {
        label: summary.security > 0 ? "Flagged" : "Clear",
        icon: AlertTriangle,
        variant: "outline",
        className:
          summary.security > 0
            ? "gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      },
      footer: {
        icon: Shield,
        text: t("monitoredAccessEvents") || "Rate limits and access sanctions",
      },
    },
    {
      key: "apiDispatches",
      title: t("apiDispatches") || "API & Webhooks",
      value: summary.api,
      valueClassName: "text-blue-600 dark:text-blue-400",
      badge: {
        label: "Live",
        icon: Terminal,
        variant: "outline",
        className:
          "gap-1 border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
      },
      footer: {
        icon: Terminal,
        text: t("externalIntegrations") || "Programmatic token & webhook dispatches",
      },
    },
    {
      key: "teamActions",
      title: t("teamActions") || "Privileged Actions",
      value: summary.team,
      valueClassName: "text-purple-600 dark:text-purple-400",
      badge: {
        label: "Admin",
        icon: UserFollow,
        variant: "outline",
        className:
          "gap-1 border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400",
      },
      footer: {
        icon: UserFollow,
        text: t("roleAndWorkspaceChanges") || "Role grants and workspace modifications",
      },
    },
  ]

  return <MetricCardGrid cards={cards} isLoading={isLoading} />
}
