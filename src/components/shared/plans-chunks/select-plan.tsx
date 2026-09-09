// components/shared/select-plan.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronsUpDown, Loader2, Gem, X, SearchIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useTranslations } from "next-intl"
import { usePlansOptions } from "@/hooks/plans/use-plans-options"

interface PlanOption {
  id: string
  name: string
  price: string
  featured: boolean
}

interface SelectPlanProps {
  value?: string
  onChange: (planId: string) => void
  placeholder?: string
  disabled?: boolean
  excludePlanId?: string
}

export function SelectPlan({
  value,
  onChange,
  placeholder,
  disabled = false,
  excludePlanId,
}: SelectPlanProps) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [selectedName, setSelectedName] = useState<string>("")

  const {
    data: plans,
    isLoading,
    isFetching,
    search,
    setSearch,
  } = usePlansOptions()

  const placeholderText = placeholder || t("selectPlan")

  // Sync selected name with the current plans list
  useEffect(() => {
    if (!plans?.length || !value) return
    const plan = plans.find((p: PlanOption) => p.id === value)
    if (plan) {
      setSelectedName(plan.name)
    }
  }, [plans, value])

  // Filter out excluded plan
  const filteredPlans = useMemo(() => {
    if (!plans) return []
    return excludePlanId
      ? plans.filter((plan: PlanOption) => plan.id !== excludePlanId)
      : plans
  }, [plans, excludePlanId])

  const selectedPlan = useMemo(() => {
    if (!value || !plans) return null
    return plans.find((p: PlanOption) => p.id === value) || null
  }, [value, plans])

  const selectPlan = (planId: string, planName: string) => {
    setSelectedName(planName)
    onChange(planId)
    setOpen(false)
  }

  const clearSelection = () => {
    setSelectedName("")
    onChange("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div
          role="combobox"
          aria-expanded={open}
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onKeyDown={(e) => {
            if (disabled) return
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
              e.preventDefault()
              setOpen(true)
            }
          }}
          className={cn(
            "flex h-auto min-h-[52px] w-full cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-md border border-input bg-card px-3 py-2 text-sm font-normal shadow-sm transition-colors",
            "hover:bg-accent/50",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none",
            disabled && "pointer-events-none cursor-not-allowed opacity-50"
            // value && "border-primary/30 bg-primary/5 hover:bg-primary/10"
          )}
        >
          {isLoading && !value ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("loadingPlans")}
            </span>
          ) : value && selectedPlan ? (
            <div className="flex items-center gap-2 truncate">
              <span className="truncate">{selectedPlan.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                ({selectedPlan.price})
              </span>
              {selectedPlan.featured && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {t("featured")}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholderText}</span>
          )}
          <div className="flex shrink-0 items-center gap-1.5">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  clearSelection()
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    e.stopPropagation()
                    clearSelection()
                  }
                }}
                className="cursor-pointer rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={t("clearPlan")}
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] rounded-xl p-0 shadow-xl"
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col rounded-xl">
          {/* Header with count */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <Gem className="size-4 text-primary" />
              <span className="text-sm font-semibold">{t("plans")}</span>
            </div>
            {value && (
              <span className="text-xs text-muted-foreground">
                {t("selectedCount", { count: 1 })}
              </span>
            )}
          </div>

          {/* Plain search input instead of CommandInput */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlans")}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Plain scrollable list — overflow works fine, no cmdk involved */}
          <div role="listbox" className="max-h-56 overflow-y-auto p-1">
            {isLoading || (isFetching && search) ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {search ? t("searching") : t("loadingPlans")}
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Gem className="size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">{t("noPlansFound")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("tryAdjustingSearch")}
                </p>
              </div>
            ) : (
              filteredPlans.map((plan: PlanOption) => {
                const checked = value === plan.id
                return (
                  <div
                    key={plan.id}
                    role="option"
                    aria-selected={checked}
                    tabIndex={0}
                    onClick={() => selectPlan(plan.id, plan.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        selectPlan(plan.id, plan.name)
                      }
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 outline-none",
                      "hover:bg-accent focus-visible:bg-accent",
                      checked && "bg-primary/5"
                    )}
                  >
                    <Gem
                      className={cn(
                        "size-4 shrink-0",
                        checked ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <div className="flex flex-1 items-center gap-2 truncate">
                      <span className="font-medium">{plan.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({plan.price})
                      </span>
                      {plan.featured && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {t("featured")}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
