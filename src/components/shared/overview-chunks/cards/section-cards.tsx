import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingDown, TrendingUp } from "lucide-react"
import { useTranslations } from "next-intl"

export function SectionCards() {
  const t = useTranslations()
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>{t("totalRevenue")}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            $1,250.00
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {t("trendingUpThisMonth")} <TrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {t("visitorsLast6Months")}
          </div>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>{t("newCustomers")}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            1,234
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingDown />
              -20%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {t("down20ThisPeriod")} <TrendingDown className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {t("acquisitionNeedsAttention")}
          </div>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>{t("activeAccounts")}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            45,678
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {t("strongUserRetention")} <TrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {t("engagementExceedTargets")}
          </div>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>{t("growthRate")}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            4.5%
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              +4.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {t("steadyPerformanceIncrease")} <TrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {t("meetsGrowthProjections")}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
