// components/plans/plan-card.tsx

"use client"

import { motion } from "motion/react"
import { Check as Checkmark, Trophy, Pencil as Edit, Trash2 as TrashCan, RefreshCw as Renew } from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
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
        "group relative flex flex-col rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-panel transition-shadow duration-200 hover:shadow-md",
        plan.featured && "border-primary/40 ring-1 ring-primary/30",
        isCurrent && "border-primary ring-1 ring-primary"
      )}
    >
      {/* Current Plan Badge or Popular Badge */}
      {isCurrent ? (
        <div className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-card">
          <Badge variant="success" className="h-7 px-3 font-semibold shadow-xs">
            <Checkmark className="mr-1.5 h-3.5 w-3.5" />
            Current Plan
          </Badge>
        </div>
      ) : plan.featured ? (
        <div className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-card">
          <Badge className="h-7 bg-primary px-3 font-semibold text-primary-foreground shadow-sm">
            <Trophy className="mr-1.5 h-3.5 w-3.5" />
            {t("mostPopular")}
          </Badge>
        </div>
      ) : null}

      {/* Top Section */}
      <div className="relative mb-6 border-b border-border pb-6">
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
              className="h-10 w-full gap-2 rounded-lg text-sm font-semibold border-success/20 bg-success-soft text-success-foreground cursor-default"
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
            <div className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-foreground">
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
