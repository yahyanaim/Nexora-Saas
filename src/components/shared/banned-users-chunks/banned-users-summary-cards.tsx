"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  Ban,
  Users,
  ShieldUser,
  ShieldAlert,
} from "@/components/ui/carbon/icons"
import { User, UserType } from "@/types/users"
import { MetricCardGrid, MetricCardItem } from "@/components/ui/metric-card-grid"

interface BannedUsersSummaryCardsProps {
  users?: User[]
  totalCount?: number
  isLoading?: boolean
}

/**
 * Summary KPI cards for the Banned Accounts Directory.
 * Displays Total Banned, Client Account Bans, Staff Suspensions, and Active Compliance Sanctions.
 */
export function BannedUsersSummaryCards({
  users = [],
  totalCount,
  isLoading,
}: BannedUsersSummaryCardsProps) {
  const t = useTranslations()

  const summary = useMemo(() => {
    let clientBans = 0
    let staffBans = 0
    let highRiskBans = 0

    users.forEach((user) => {
      if (user.userType === UserType.STAFF || user.role === "admin") {
        staffBans++
      } else {
        clientBans++
      }

      if (user.isBanned || user.status === "banned") {
        highRiskBans++
      }
    })

    const total = totalCount !== undefined ? totalCount : users.length

    return {
      total,
      clientBans,
      staffBans,
      highRiskBans: highRiskBans || total,
    }
  }, [users, totalCount])

  const cards: MetricCardItem[] = [
    {
      key: "totalBanned",
      title: t("totalBanned") || "Total Banned",
      value: summary.total,
      valueClassName: "text-destructive",
      badge: {
        label: t("restricted") || "Restricted",
        icon: Ban,
        variant: "outline",
        className:
          "gap-1 border-destructive/20 bg-destructive/10 text-destructive",
      },
      footer: {
        icon: Ban,
        text: t("restrictedAccess") || "Restricted or suspended access",
      },
    },
    {
      key: "clientBans",
      title: t("clientBans") || "Client Accounts",
      value: summary.clientBans,
      badge: {
        label: t("users") || "Users",
        icon: Users,
        variant: "outline",
        className: "gap-1",
      },
      footer: {
        icon: Users,
        text: t("consumerSanctions") || "Standard user account sanctions",
      },
    },
    {
      key: "staffSuspensions",
      title: t("staffSuspensions") || "Staff Suspensions",
      value: summary.staffBans,
      valueClassName: "text-amber-600 dark:text-amber-400",
      badge: {
        label: t("staff") || "Staff",
        icon: ShieldUser,
        variant: "outline",
        className:
          "gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      },
      footer: {
        icon: ShieldUser,
        text: t("privilegedRevoked") || "Privileged access credentials revoked",
      },
    },
    {
      key: "activeSanctions",
      title: t("activeSanctions") || "Active Sanctions",
      value: summary.highRiskBans,
      valueClassName: "text-destructive",
      badge: {
        label: t("enforced") || "Enforced",
        icon: ShieldAlert,
        variant: "outline",
        className:
          "gap-1 border-destructive/20 bg-destructive/10 text-destructive",
      },
      footer: {
        icon: ShieldAlert,
        text: t("policyViolations") || "Policy violation & compliance actions",
      },
    },
  ]

  return <MetricCardGrid cards={cards} isLoading={isLoading} />
}
