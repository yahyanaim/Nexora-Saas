"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  Users,
} from "@/components/ui/carbon/icons"
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionsSummary,
} from "@/types/subscriptions"
import { useSubscriptionsSummary } from "@/hooks/subscriptions/use-subscriptions-summary"

interface SubscriptionsSummaryCardsProps {
  subscriptions?: Subscription[]
  useApi?: boolean
}

export function SubscriptionsSummaryCards({
  subscriptions,
  useApi = true,
}: SubscriptionsSummaryCardsProps) {
  const t = useTranslations()

  const { summary: apiSummary, isLoading, isError } = useSubscriptionsSummary()

  const localSummary = useMemo<SubscriptionsSummary>(() => {
    if (!subscriptions || subscriptions.length === 0) {
      return {
        totalRevenue: 0,
        totalSubscriptions: 0,
        active: 0,
        inactive: 0,
        pending: 0,
        expired: 0,
        canceled: 0,
        activePercentage: 0,
        revenueGrowth: 0,
      }
    }

    let totalRevenue = 0
    let active = 0
    let inactive = 0
    let pending = 0
    let expired = 0
    let canceled = 0

    subscriptions.forEach((subscription) => {
      switch (subscription.status) {
        case SubscriptionStatus.ACTIVE:
          const price =
            subscription.plan?.price ?? (parseFloat(subscription.price) || 0)
          totalRevenue += price
          active += 1
          break
        case SubscriptionStatus.INACTIVE:
          inactive += 1
          break
        case SubscriptionStatus.PAST_DUE:
          pending += 1
          break
        case SubscriptionStatus.EXPIRED:
          expired += 1
          break
        case SubscriptionStatus.CANCELED:
          canceled += 1
          break
        default:
          break
      }
    })

    return {
      totalRevenue,
      totalSubscriptions: subscriptions.length,
      active,
      inactive,
      pending,
      expired,
      canceled,
      activePercentage:
        subscriptions.length > 0
          ? Math.round((active / subscriptions.length) * 100)
          : 0,
      revenueGrowth: 12.5,
    }
  }, [subscriptions])

  const summary = useApi ? apiSummary : localSummary

  if (isLoading && useApi) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse h-full flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-2 h-8 w-16 rounded bg-muted" />
            </CardHeader>
            <CardFooter className="px-5 py-3 pt-0 border-t-0 mt-auto">
              <div className="h-3 w-32 rounded bg-muted" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (isError && useApi) {
    return (
      <div className="p-4 text-center text-destructive">
        {t("failedToLoadSummary")}
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        {t("noDataAvailable")}
      </div>
    )
  }

  // Helper function to safely format numbers
  const formatCurrency = (value: unknown): string => {
    const num = Number(value)
    return isNaN(num) ? "$0.00" : `$${num.toFixed(2)}`
  }

  const formatNumber = (value: unknown): string => {
    const num = Number(value)
    return isNaN(num) ? "0" : num.toString()
  }

  const formatPercentage = (value: unknown): string => {
    const num = Number(value)
    return isNaN(num) ? "0%" : `${num}%`
  }

  const cardsData = [
    {
      key: "totalRevenue",
      title: t("totalRevenue"),
      value: formatCurrency(summary.totalRevenue),
      valueClassName: "",
      badge: {
        label: `+${formatPercentage(summary.revenueGrowth)}`,
        icon: TrendingUp,
        variant: "outline" as const,
        className: "gap-1",
      },
      footer: {
        icon: DollarSign,
        text: t("totalRevenueDescription"),
        subtext: t("totalRevenueSubtext"),
        className: "",
      },
    },
    {
      key: "active",
      title: t("activeSubscriptions"),
      value: formatNumber(summary.active),
      valueClassName: "text-emerald-600",
      badge: {
        label: formatPercentage(summary.activePercentage),
        icon: CheckCircle,
        variant: "outline" as const,
        className:
          "gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
      },
      footer: {
        icon: Users,
        text: t("activeSubscriptions"),
        subtext: t("activeSubscriptionsSubtext"),
        className: "text-emerald-600",
      },
    },
    {
      key: "pending",
      title: t("pendingSubscriptions"),
      value: formatNumber((summary.pending || 0) + (summary.inactive || 0)),
      valueClassName: "text-amber-600",
      badge: {
        label: t("pending"),
        icon: Clock,
        variant: "outline" as const,
        className: "gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600",
      },
      footer: {
        icon: Clock,
        text: t("pendingSubscriptions"),
        subtext: t("pendingSubscriptionsSubtext"),
        className: "text-amber-600",
      },
    },
    {
      key: "expired",
      title: t("expiredCancelled"),
      value: formatNumber((summary.expired || 0) + (summary.canceled || 0)),
      valueClassName: "text-destructive",
      badge: {
        label: t("inactive"),
        icon: AlertCircle,
        variant: "outline" as const,
        className:
          "gap-1 border-destructive/20 bg-destructive/10 text-destructive",
      },
      footer: {
        icon: TrendingDown,
        text: t("expiredCancelledSubscriptions"),
        subtext: t("expiredCancelledSubtext"),
        className: "text-destructive",
      },
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full">
      {cardsData.map((card) => (
        <Card key={card.key} className="h-full flex flex-col justify-between">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">{card.title}</CardDescription>
              <Badge
                variant={card.badge.variant}
                className={card.badge.className}
              >
                <card.badge.icon className="size-3" />
                {card.badge.label}
              </Badge>
            </div>
            <CardTitle
              className={`text-2xl font-bold font-mono tabular-nums @[250px]/card:text-3xl mt-2 ${card.valueClassName}`}
            >
              {card.value}
            </CardTitle>
          </CardHeader>
          <CardFooter className="px-5 py-3 pt-0 border-t-0 flex items-center gap-1.5 text-xs text-muted-foreground mt-auto">
            <card.footer.icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{card.footer.text}</span>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
