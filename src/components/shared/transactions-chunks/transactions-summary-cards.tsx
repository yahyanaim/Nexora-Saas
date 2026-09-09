"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
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
    <div className="p-3">
      <Carousel className="w-full">
        <CarouselContent>
          {cards.map((card) => (
            <CarouselItem
              key={card.key}
              className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
            >
              <div className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardDescription>{card.title}</CardDescription>
                    <CardTitle
                      className={`text-2xl font-semibold tabular-nums @[250px]/card:text-3xl ${card.valueClassName}`}
                    >
                      {card.value}
                    </CardTitle>
                    <CardAction>
                      <Badge
                        variant={card.badge.variant}
                        className={card.badge.className}
                      >
                        <card.badge.icon className="size-3" />
                        {card.badge.label}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className="h-full flex-col items-start gap-1.5 text-sm">
                    <div
                      className={`line-clamp-1 flex gap-2 font-medium ${card.footer.className}`}
                    >
                      <card.footer.icon className="size-4" />
                      {card.footer.text}
                    </div>
                    {/* <div className="text-muted-foreground">
                      {card.footer.subtext}
                    </div> */}
                  </CardFooter>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  )
}
