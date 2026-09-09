"use client"

import { Table } from "@tanstack/react-table"
import { Plus, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableFiltersPopover } from "./data-table-filters-popover"
import { cn } from "@/lib/utils"
import { useGetDirection } from "@/hooks/use-get-direction"
import { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"

export interface FacetedFilterConfig {
  columnId: string
  title: string
  options: { label: string; value: string }[]
}

export interface ToolbarAction {
  label: string
  icon?: LucideIcon
  onClick: () => void
  variant?: "default" | "primary" | "outline" | "ghost" | "destructive"
  className?: string
  disabled?: boolean
  /** Show as icon only (no text) */
  iconOnly?: boolean
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchColumnId?: string
  searchPlaceholder?: string
  filters?: FacetedFilterConfig[]
  bulkActions?: React.ReactNode
  title?: string
  /** @deprecated Use `actions` instead */
  onAddClick?: () => void
  /** Array of toolbar actions */
  actions?: ToolbarAction[]
  searchValue?: string
  onSearchChange?: (value: string) => void
}

export function DataTableToolbar<TData>({
  table,
  searchColumnId,
  searchPlaceholder = "Search...",
  filters = [],
  bulkActions,
  title = "Items",
  onAddClick,
  actions = [],
  searchValue,
  onSearchChange,
}: DataTableToolbarProps<TData>) {
  const t = useTranslations()
  const { dir } = useGetDirection()
  const isFiltered = table.getState().columnFilters.length > 0
  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  const isControlledSearch = onSearchChange !== undefined
  const currentSearchValue = isControlledSearch
    ? (searchValue ?? "")
    : ((table.getColumn(searchColumnId ?? "")?.getFilterValue() as string) ??
      "")

  function handleSearchChange(value: string) {
    if (isControlledSearch) {
      onSearchChange?.(value)
    } else {
      table.getColumn(searchColumnId ?? "")?.setFilterValue(value)
    }
  }

  // Merge onAddClick into actions for backward compatibility
  const toolbarActions = [...actions]
  if (onAddClick) {
    const hasAddAction = toolbarActions.some(
      (action) => action.label === "Add" || action.label === "Create"
    )
    if (!hasAddAction) {
      toolbarActions.push({
        label: t("add"),
        icon: Plus,
        onClick: onAddClick,
        variant: "primary",
      })
    }
  }

  // Get button variant styles
  const getButtonVariant = (variant?: string) => {
    switch (variant) {
      case "primary":
        return "primary"
      case "destructive":
        return "destructive"
      case "outline":
        return "outline"
      case "ghost":
        return "ghost"
      default:
        return "default"
    }
  }

  if (selectedCount > 0 && bulkActions) {
    return (
      <div className="relative z-10 flex w-full items-center justify-between gap-3 p-4">
        <span className="font-medium">
          {t("selectedCount", { count: selectedCount })}
        </span>
        <div className="ml-auto flex gap-2">{bulkActions}</div>
      </div>
    )
  }

  return (
    <div className="relative z-10 flex w-full items-center justify-between gap-3 p-2">
      {/* <div className={cn(dir === "rtl" ? "pr-3" : "pl-3")}> */}
      <div className={cn(dir === "rtl" ? "md:pr-2" : "md:pl-2")}>
        <h1 className="text-lg font-semibold tracking-tight whitespace-nowrap capitalize">
          {title}
        </h1>
      </div>
      {(searchColumnId || isControlledSearch) && (
        <div className="flex grow items-center gap-2 md:gap-3">
          <div className="relative flex-1 rounded-full bg-background">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground md:left-4 md:size-5" />
            <Input
              placeholder={searchPlaceholder}
              value={currentSearchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 rounded-full border-0 bg-transparent pr-8 pl-10 text-xs shadow-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring md:h-12 md:pr-9 md:pl-12 md:text-sm dark:bg-transparent"
            />
            {currentSearchValue && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground md:right-4"
              >
                <X className="size-4 md:size-5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <DataTableFiltersPopover table={table} filters={filters} />

        {/* Actions */}
        {toolbarActions.map((action, index) => {
          const Icon = action.icon
          const variant = getButtonVariant(action.variant)

          return (
            <Button
              key={`action-${index}`}
              size={action.iconOnly ? "icon" : "default"}
              variant={variant as any}
              className={cn(
                action.iconOnly
                  ? "h-10 w-10 rounded-full md:h-12 md:w-12"
                  : "gap-2",
                action.className
              )}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {Icon && (
                <Icon className={action.iconOnly ? "size-5" : "h-4 w-4"} />
              )}
              {!action.iconOnly && action.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
