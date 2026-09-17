"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Server,
  Users,
  HardDrive,
  Receipt,
  ArrowUpRight,
  Clock,
  WarningAlt,
} from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"

export interface QuotaMetric {
  id: string
  name: string
  used: number
  limit: number
  unit: string
  formattedUsed: string
  formattedLimit: string
  icon: React.ComponentType<{ className?: string }>
}

const DEFAULT_METRICS: QuotaMetric[] = [
  {
    id: "api_calls",
    name: "API Gateway Requests",
    used: 84200,
    limit: 100000,
    unit: "calls",
    formattedUsed: "84,200",
    formattedLimit: "100,000",
    icon: Server,
  },
  {
    id: "team_seats",
    name: "Active Team Seats",
    used: 4,
    limit: 5,
    unit: "seats",
    formattedUsed: "4",
    formattedLimit: "5",
    icon: Users,
  },
  {
    id: "storage",
    name: "Cloud Asset Storage",
    used: 7.4,
    limit: 10,
    unit: "GB",
    formattedUsed: "7.4 GB",
    formattedLimit: "10 GB",
    icon: HardDrive,
  },
  {
    id: "invoices",
    name: "Monthly Invoices Issued",
    used: 18,
    limit: 25,
    unit: "invoices",
    formattedUsed: "18",
    formattedLimit: "25",
    icon: Receipt,
  },
]

/**
 * Enterprise Usage Metering & Quotas Card for Nexora SaaS.
 * Visualizes resource consumption against subscription limits with automated
 * threshold status alerts and direct plan upgrade actions.
 */
export function UsageMeteringCard({
  metrics = DEFAULT_METRICS,
  className,
}: {
  metrics?: QuotaMetric[]
  className?: string
}) {
  const router = useRouter()

  return (
    <Card className={cn("border-border/80 shadow-xs", className)}>
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              <span>Resource Quotas & Usage Metering</span>
              <Badge variant="outline" className="text-xs font-normal text-amber-600 bg-amber-500/10 border-amber-500/20">
                <WarningAlt className="mr-1 size-3" />
                Capacity Notice
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Real-time consumption tracking against your active enterprise subscription limits.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/en/dashboard/plans")}
            className="text-xs shrink-0 self-start sm:self-auto gap-1.5"
          >
            Upgrade Plan Limits
            <ArrowUpRight className="size-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.map((metric) => {
            const percentage = Math.min(100, Math.round((metric.used / metric.limit) * 100))
            const isNearLimit = percentage >= 80
            const isCritical = percentage >= 95
            const Icon = metric.icon

            return (
              <div
                key={metric.id}
                className="rounded-lg border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-md bg-background border border-border/60 text-muted-foreground">
                      <Icon className="size-3.5" />
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      {metric.name}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold font-mono",
                      isCritical
                        ? "text-destructive"
                        : isNearLimit
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-foreground"
                    )}
                  >
                    {percentage}%
                  </span>
                </div>

                {/* Progress Bar Track */}
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isCritical
                        ? "bg-destructive"
                        : isNearLimit
                        ? "bg-amber-500"
                        : "bg-primary"
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                  <span>Used: {metric.formattedUsed}</span>
                  <span className="font-mono">Quota: {metric.formattedLimit}</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      <CardFooter className="px-5 py-3 border-t border-border/60 bg-muted/10 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-muted-foreground shrink-0" />
          <span>Usage counters automatically reset in 12 days (October 1, 2026).</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Overages are billed at $0.002 per additional request.
        </span>
      </CardFooter>
    </Card>
  )
}
