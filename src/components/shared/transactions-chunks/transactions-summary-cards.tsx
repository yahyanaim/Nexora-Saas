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
} from "@/components/ui/carbon/icons"
import { Transaction, TransactionStatus } from "@/types/transactions"

interface TransactionsSummaryCardsProps {
  transactions: Transaction[]
}

interface SummaryData {
  totalRevenue: number
  successful: number
  pending: number
  failed: number
}

export function TransactionsSummaryCards({
  transactions,
}: TransactionsSummaryCardsProps) {
  const t = useTranslations()

  const summary = useMemo<SummaryData>(() => {
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.status === TransactionStatus.PAID) {
          acc.totalRevenue += transaction.amount
          acc.successful += transaction.amount
        } else if (transaction.status === TransactionStatus.PENDING) {
          acc.pending += transaction.amount
        } else if (transaction.status === TransactionStatus.FAILED) {
          acc.failed += transaction.amount
        }
        return acc
      },
      { totalRevenue: 0, successful: 0, pending: 0, failed: 0 }
    )
  }, [transactions])

  const cards = [
    {
      key: "totalRevenue",
      title: t("totalRevenue"),
      value: `$${summary.totalRevenue.toFixed(2)}`,
      valueClassName: "",
      badge: {
        label: "+12.5%",
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
      key: "successful",
      title: t("successful"),
      value: `$${summary.successful.toFixed(2)}`,
      valueClassName: "text-emerald-600",
      badge: {
        label: t("paid"),
        icon: CheckCircle,
        variant: "outline" as const,
        className:
          "gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
      },
      footer: {
        icon: TrendingUp,
        text: t("successfulTransactions"),
        subtext: t("successfulTransactionsSubtext"),
        className: "text-emerald-600",
      },
    },
    {
      key: "pending",
      title: t("pending"),
      value: `$${summary.pending.toFixed(2)}`,
      valueClassName: "text-amber-600",
      badge: {
        label: t("pending"),
        icon: Clock,
        variant: "outline" as const,
        className: "gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600",
      },
      footer: {
        icon: Clock,
        text: t("pendingTransactions"),
        subtext: t("pendingTransactionsSubtext"),
        className: "text-amber-600",
      },
    },
    {
      key: "failed",
      title: t("failed"),
      value: `$${summary.failed.toFixed(2)}`,
      valueClassName: "text-destructive",
      badge: {
        label: t("failed"),
        icon: AlertCircle,
        variant: "outline" as const,
        className:
          "gap-1 border-destructive/20 bg-destructive/10 text-destructive",
      },
      footer: {
        icon: TrendingDown,
        text: t("failedTransactions"),
        subtext: t("failedTransactionsSubtext"),
        className: "text-destructive",
      },
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full">
      {cards.map((card) => (
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
