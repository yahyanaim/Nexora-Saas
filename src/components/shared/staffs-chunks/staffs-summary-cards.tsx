"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  ShieldUser,
  CheckCircle,
  Clock,
  ShieldCheck,
  TrendingUp,
} from "@/components/ui/carbon/icons"
import { User, UserStatus } from "@/types/users"
import { MetricCardGrid, MetricCardItem } from "@/components/ui/metric-card-grid"

interface StaffsSummaryCardsProps {
  users?: User[]
  totalCount?: number
  isLoading?: boolean
}

/**
 * Summary KPI cards for the Staff Directory.
 * Displays Total Staff, Active on Duty, Roles Configured, and Inactive/Pending Staff.
 */
export function StaffsSummaryCards({
  users = [],
  totalCount,
  isLoading,
}: StaffsSummaryCardsProps) {
  const t = useTranslations()

  const summary = useMemo(() => {
    let active = 0
    let inactive = 0
    let rolesAssigned = 0

    users.forEach((user) => {
      if (user.status === UserStatus.ACTIVE || user.isActive) {
        active++
      } else {
        inactive++
      }

      if (user.roles && user.roles.length > 0) {
        rolesAssigned++
      } else if (user.role && user.role !== "user") {
        rolesAssigned++
      }
    })

    const total = totalCount !== undefined ? totalCount : users.length

    return {
      total,
      active,
      inactive,
      rolesAssigned,
    }
  }, [users, totalCount])

  const cards: MetricCardItem[] = [
    {
      key: "totalStaff",
      title: t("totalStaff") || "Total Staff",
      value: summary.total,
      badge: {
        label: "+8.5%",
        icon: TrendingUp,
        variant: "outline",
        className: "gap-1",
      },
      footer: {
        icon: ShieldUser,
        text: t("internalTeamMembers") || "Internal personnel & operators",
      },
    },
    {
      key: "activeStaff",
      title: t("activeStaff") || "Active on Duty",
      value: summary.active,
      valueClassName: "text-emerald-600 dark:text-emerald-400",
      badge: {
        label: t("active") || "Active",
        icon: CheckCircle,
        variant: "outline",
        className:
          "gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      },
      footer: {
        icon: CheckCircle,
        text: t("verifiedOnDuty") || "Verified and actively on duty",
      },
    },
    {
      key: "rolesConfigured",
      title: t("rolesAssigned") || "Roles Configured",
      value: summary.rolesAssigned,
      valueClassName: "text-primary",
      badge: {
        label: t("assigned") || "Assigned",
        icon: ShieldCheck,
        variant: "outline",
        className:
          "gap-1 border-primary/20 bg-primary/10 text-primary",
      },
      footer: {
        icon: ShieldCheck,
        text: t("operationalPermissions") || "Operational access keys active",
      },
    },
    {
      key: "inactiveStaff",
      title: t("inactiveStaff") || "Pending / Inactive",
      value: summary.inactive,
      valueClassName: "text-amber-600 dark:text-amber-400",
      badge: {
        label: t("pending") || "Pending",
        icon: Clock,
        variant: "outline",
        className:
          "gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      },
      footer: {
        icon: Clock,
        text: t("pendingOnboarding") || "Deactivated or onboarding pending",
      },
    },
  ]

  return <MetricCardGrid cards={cards} isLoading={isLoading} />
}
