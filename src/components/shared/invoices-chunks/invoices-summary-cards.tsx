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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
} from "@/components/ui/carbon/icons"
import { Invoice, InvoiceStatus } from "@/types/invoices"

interface InvoicesSummaryCardsProps {
  invoices: Invoice[]
}

export function InvoicesSummaryCards({ invoices }: InvoicesSummaryCardsProps) {
  const t = useTranslations()

  const summary = useMemo(() => {
    let totalRevenue = 0
    let paid = 0
    let pending = 0
    let overdue = 0
    let cancelled = 0

    invoices.forEach((invoice) => {
      if (invoice.status === InvoiceStatus.PAID) {
        totalRevenue += invoice.total
        paid += 1
      } else if (invoice.status === InvoiceStatus.PENDING) {
        pending += 1
      } else if (invoice.status === InvoiceStatus.OVERDUE) {
        overdue += 1
        totalRevenue += invoice.total // Still counts as revenue but overdue
      } else if (invoice.status === InvoiceStatus.CANCELLED) {
        cancelled += 1
      }
    })

    return { totalRevenue, paid, pending, overdue, cancelled }
  }, [invoices])

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
      key: "paid",
      title: t("paidInvoices"),
      value: summary.paid.toString(),
      valueClassName: "text-emerald-600",
      badge: {
        label: t("paid"),
        icon: CheckCircle,
        variant: "outline" as const,
        className:
          "gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
      },
      footer: {
        icon: FileText,
        text: t("paidInvoices"),
        subtext: t("paidInvoicesSubtext"),
        className: "text-emerald-600",
      },
    },
    {
      key: "pending",
      title: t("pendingInvoices"),
      value: summary.pending.toString(),
      valueClassName: "text-amber-600",
      badge: {
        label: t("pending"),
        icon: Clock,
        variant: "outline" as const,
        className: "gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600",
      },
      footer: {
        icon: Clock,
        text: t("pendingInvoices"),
        subtext: t("pendingInvoicesSubtext"),
        className: "text-amber-600",
      },
    },
    {
      key: "overdue",
      title: t("overdueInvoices"),
      value: summary.overdue.toString(),
      valueClassName: "text-destructive",
      badge: {
        label: t("overdue"),
        icon: AlertCircle,
        variant: "outline" as const,
        className:
          "gap-1 border-destructive/20 bg-destructive/10 text-destructive",
      },
      footer: {
        icon: TrendingDown,
        text: t("overdueInvoices"),
        subtext: t("overdueInvoicesSubtext"),
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
