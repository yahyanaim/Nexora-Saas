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
  Users,
  UserFollow,
  ChartLine,
} from "@/components/ui/carbon/icons"
import { useTranslations } from "next-intl"

export function SectionCards() {
  const t = useTranslations()

  const cards = [
    {
      title: t("totalRevenue"),
      value: "$128,450.00",
      badge: {
        label: "+12.5%",
        icon: TrendingUp,
        variant: "outline" as const,
        className: "gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      },
      footer: {
        icon: DollarSign,
        text: t("trendingUpThisMonth"),
      },
    },
    {
      title: t("newCustomers"),
      value: "1,234",
      badge: {
        label: "-2.4%",
        icon: TrendingDown,
        variant: "outline" as const,
        className: "gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      },
      footer: {
        icon: UserFollow,
        text: t("down20ThisPeriod"),
      },
    },
    {
      title: t("activeAccounts"),
      value: "45,678",
      badge: {
        label: "+14.8%",
        icon: TrendingUp,
        variant: "outline" as const,
        className: "gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      },
      footer: {
        icon: Users,
        text: t("strongUserRetention"),
      },
    },
    {
      title: t("growthRate"),
      value: "24.5%",
      badge: {
        label: "+4.5%",
        icon: TrendingUp,
        variant: "outline" as const,
        className: "gap-1 border-primary/20 bg-primary/10 text-primary",
      },
      footer: {
        icon: ChartLine,
        text: t("steadyPerformanceIncrease"),
      },
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full">
      {cards.map((card, idx) => (
        <Card key={idx} className="h-full flex flex-col justify-between">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {card.title}
              </CardDescription>
              <Badge
                variant={card.badge.variant}
                className={card.badge.className}
              >
                <card.badge.icon className="size-3" />
                {card.badge.label}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold font-mono tabular-nums @[250px]/card:text-3xl mt-2">
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
