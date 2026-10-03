"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  Users,
  CheckCircle,
  Clock,
  Ban,
  TrendingUp,
} from "@/components/ui/carbon/icons"
import { User, UserStatus } from "@/types/users"
import { MetricCardGrid, MetricCardItem } from "@/components/ui/metric-card-grid"

interface UsersSummaryCardsProps {
  users?: User[]
  totalCount?: number
  isLoading?: boolean
}

/**
 * Summary KPI cards for the Users directory.
 * Displays Total Users, Active Users, Pending/Inactive, and Banned Accounts.
 */
export function UsersSummaryCards({
  users = [],
  totalCount,
  isLoading,
}: UsersSummaryCardsProps) {
  const t = useTranslations()

  const summary = useMemo(() => {
    let active = 0
    let pending = 0
    let banned = 0

    users.forEach((user) => {
      if (user.status === UserStatus.ACTIVE || user.isActive) {
        active++
      } else if (user.status === UserStatus.BANNED || user.isBanned) {
        banned++
      } else {
        pending++
      }
    })

    const total = totalCount !== undefined ? totalCount : users.length

    return {
      total,
      active,
      pending,
      banned,
    }
  }, [users, totalCount])

  const cards: MetricCardItem[] = [
    {
      key: "totalUsers",
      title: t("totalUsers") || "Total Users",
      value: summary.total,
      badge: {
        label: "+14.2%",
        icon: TrendingUp,
        variant: "outline",
        className: "gap-1",
      },
      footer: {
        icon: Users,
        text: t("allRegisteredUsers") || "All registered platform users",
      },
    },
    {
      key: "activeUsers",
      title: t("activeUsers") || "Active Users",
      value: summary.active,
      valueClassName: "text-success-foreground",
      badge: {
        label: t("active") || "Active",
        icon: CheckCircle,
        variant: "outline",
        className:
          "gap-1 border-success/20 bg-success-soft text-success-foreground",
      },
      footer: {
        icon: CheckCircle,
        text: t("activeAccounts") || "Verified and active accounts",
      },
    },
    {
      key: "pendingUsers",
      title: t("pendingUsers") || "Pending / Inactive",
      value: summary.pending,
      valueClassName: "text-warning-foreground",
      badge: {
        label: t("pending") || "Pending",
        icon: Clock,
        variant: "outline",
        className:
          "gap-1 border-warning/20 bg-warning-soft text-warning-foreground",
      },
      footer: {
        icon: Clock,
        text: t("awaitingVerification") || "Awaiting verification or inactive",
      },
    },
    {
      key: "bannedUsers",
      title: t("bannedUsers") || "Banned Accounts",
      value: summary.banned,
      valueClassName: "text-destructive",
      badge: {
        label: t("banned") || "Banned",
        icon: Ban,
        variant: "outline",
        className:
          "gap-1 border-destructive/20 bg-destructive/10 text-destructive",
      },
      footer: {
        icon: Ban,
        text: t("restrictedAccess") || "Restricted or suspended access",
        className: "text-destructive",
      },
    },
  ]

  return <MetricCardGrid cards={cards} isLoading={isLoading} />
}
