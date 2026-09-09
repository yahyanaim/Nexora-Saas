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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
} from "lucide-react"
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
