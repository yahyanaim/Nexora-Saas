// components/plans/plan-card.tsx

"use client"

import { motion } from "motion/react"
import { Checkmark, Trophy, Edit, TrashCan, Renew } from "@carbon/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { GridPattern } from "@/components/ui/grid-pattern"
import { useTranslations } from "next-intl"

export interface PlanCardData {
  id: string
  name: string
  price: string
  period: string | null
  description: string
  featured: boolean
  features: string[]
}

interface PlanCardProps {
  plan: PlanCardData
  index?: number
  isCurrent?: boolean
  isUpgrading?: boolean
  onUpgrade?: (plan: PlanCardData) => void
  actionLabel?: string
  disabled?: boolean
  onEdit?: (plan: PlanCardData) => void
  onDelete?: (plan: PlanCardData) => void
  isDeleting?: boolean
}

export function PlanCard({
  plan,
  index = 0,
  isCurrent = false,
  isUpgrading = false,
  onUpgrade,
  actionLabel,
  disabled = false,
  onEdit,
  onDelete,
  isDeleting = false,
}: PlanCardProps) {
  const t = useTranslations()

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        "group relative flex flex-col rounded-2xl border border-border/70 bg-card/90 p-3 text-card-foreground shadow-sm backdrop-blur-md transition-all duration-300 hover:border-border hover:shadow-xl",
        plan.featured && "border-primary/50 shadow-lg shadow-primary/10 hover:border-primary/80 ring-1 ring-primary/30",
        isCurrent && "border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30"
      )}
    >
      {/* Current Plan Badge or Popular Badge */}
      {isCurrent ? (
        <div className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2">
          <Badge className="h-7 border border-emerald-500/40 bg-emerald-500/20 px-3 text-xs font-semibold text-emerald-400 backdrop-blur-md shadow-xs">
            <Checkmark className="mr-1.5 h-3.5 w-3.5" />
            Current Plan
          </Badge>
        </div>
      ) : plan.featured ? (
        <div className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2">
          <Badge className="h-7 border border-primary/50 bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/30 backdrop-blur-md">
            <Trophy className="mr-1.5 h-3.5 w-3.5" />
            {t("mostPopular")}
          </Badge>
        </div>
      ) : null}

      {/* Top Section */}
      <div className="relative mb-5 overflow-hidden rounded-xl border border-border/50 bg-muted/30 p-5 backdrop-blur-xs">
        <GridPattern
          width={20}
          height={20}
          x={-1}
          y={-1}
          className="[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)] opacity-40"
          squares={[
            [5, 1],
            [12, 2],
            [4, 4],
            [5, 3],
            [10, 10],
            [15, 10],
            [10, 15],
            [5, 5],
            [12, 15],
          ]}
        />

        <div className="relative mb-5">
          <h3 className="mb-1 text-xl font-bold tracking-tight text-foreground md:text-2xl">
            {plan.name}
          </h3>
          <p className="text-xs text-muted-foreground md:text-sm leading-relaxed">
            {plan.description}
          </p>
        </div>

        {/* Price */}
        <div className="relative mb-4 flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {plan.price}
          </span>
          {plan.period && (
            <span className="text-sm font-medium text-muted-foreground">
              / {plan.period}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="relative mt-2 flex flex-col gap-2">
          {isCurrent ? (
            <Button
              variant="outline"
              disabled
              className="h-10 w-full gap-2 rounded-lg text-sm font-semibold border-emerald-500/40 bg-emerald-500/10 text-emerald-400 cursor-default"
            >
              <Checkmark className="h-4 w-4" />
              Active Subscription
            </Button>
          ) : onUpgrade ? (
            <Button
              variant={plan.featured ? "primary" : "outline"}
              className={cn(
                "h-10 w-full gap-2 rounded-lg text-sm font-semibold transition-all duration-200",
                plan.featured && "shadow-md shadow-primary/20 hover:shadow-primary/30"
              )}
              onClick={() => onUpgrade(plan)}
              disabled={disabled || isUpgrading}
            >
              {isUpgrading ? (
                <Renew className="h-4 w-4 animate-spin" />
              ) : (
                actionLabel || "Upgrade"
              )}
            </Button>
          ) : null}

          {(onEdit || onDelete) && (
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  className="h-10 flex-1 gap-2 rounded-lg text-sm font-semibold"
                  onClick={() => onEdit(plan)}
                >
                  <Edit className="h-3.5 w-3.5" />
                  {t("edit")}
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="destructive"
                  className="h-10 w-10 rounded-lg"
                  onClick={() => onDelete(plan)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Renew className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <TrashCan className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <ul className="flex-grow space-y-3 px-3 pb-4">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <div className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <Checkmark className="size-3" />
            </div>
            <span className="text-sm leading-normal text-muted-foreground group-hover:text-foreground/90 transition-colors">
              {feature}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}
