// components/plans/plan-card.tsx

"use client"

import { motion } from "framer-motion"
import { Check, Gem, Pencil, Trash2, Loader2 } from "lucide-react"
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
  onEdit?: (plan: PlanCardData) => void
  onDelete?: (plan: PlanCardData) => void
  isDeleting?: boolean
}

export function PlanCard({
  plan,
  index = 0,
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
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        "group relative flex flex-col rounded-xl bg-card p-2 text-card-foreground ring-1 ring-foreground/10 transition-all duration-300",
        plan.featured && "shadow-xl shadow-primary/10 ring-primary/30"
      )}
    >
      {/* Popular Badge */}
      {plan.featured && (
        <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
          <Badge className="h-9 bg-primary px-4 text-primary-foreground">
            <Gem className="mr-1.5 h-3.5 w-3.5" />
            {t("mostPopular")}
          </Badge>
        </div>
      )}

      {/* Top Section */}
      <div className="relative mb-5 overflow-hidden rounded-lg bg-primary/10 p-5">
        <GridPattern
          width={20}
          height={20}
          x={-1}
          y={-1}
          className="[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)]"
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

        <div className="relative mb-6">
          <h3 className="mb-1 text-xl font-bold md:text-2xl">{plan.name}</h3>
          <p className="text-xs text-muted-foreground md:text-sm">
            {plan.description}
          </p>
        </div>

        {/* Price */}
        <div className="relative mb-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold md:text-4xl">{plan.price}</span>
          {plan.period && (
            <span className="text-sm text-muted-foreground">
              / {plan.period}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="relative mt-2 flex gap-2">
          {onEdit && (
            <Button
              variant={plan.featured ? "default" : "outline"}
              className="h-10 flex-1 gap-2 rounded-lg text-sm font-semibold"
              onClick={() => onEdit(plan)}
            >
              <Pencil className="h-3.5 w-3.5" />
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
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Features */}
      <ul className="flex-grow space-y-3 px-3 pb-4 md:space-y-4">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-3 w-3" strokeWidth={3} />
            </div>
            <span className="text-sm leading-relaxed text-muted-foreground">
              {feature}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}
