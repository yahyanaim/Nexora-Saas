"use client"

import { Table } from "@tanstack/react-table"
import { Plus, Search, X, Download, FileSpreadsheet, FileCode } from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableFiltersPopover } from "./data-table-filters-popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exportToCsv, exportToJson } from "@/lib/utils/export-data"
import { cn } from "@/lib/utils"
import { useGetDirection } from "@/hooks/use-get-direction"
import { LucideIcon } from "@/components/ui/carbon/icons"
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
  /** Base filename for CSV and JSON exports */
  exportFilename?: string
  /** Custom data supplier for export; defaults to filtered table rows */
  getExportData?: () => Record<string, unknown>[]
  /** Whether export dropdown is enabled (defaults to true) */
  enableExport?: boolean
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
  exportFilename,
  getExportData,
  enableExport = true,
}: DataTableToolbarProps<TData>) {
  const t = useTranslations()
  const { dir } = useGetDirection()
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
  const getButtonVariant = (variant?: string): "primary" | "destructive" | "outline" | "ghost" | "default" => {
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
      <div className="relative z-10 flex w-full items-center justify-between gap-3 px-5 pt-5 pb-2 sm:px-6">
        <span className="font-medium">
          {t("selectedCount", { count: selectedCount })}
        </span>
        <div className="ml-auto flex gap-2">{bulkActions}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-2 sm:px-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground whitespace-nowrap capitalize sm:text-xl">
          {title}
        </h2>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 sm:ms-auto sm:w-auto">
        {(searchColumnId || isControlledSearch) && (
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none md:w-72">
            <Search className="absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={currentSearchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 w-full rounded-full pe-9 ps-10"
            />
            {currentSearchValue && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                aria-label="Clear search"
                className="absolute top-1/2 end-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}

        <DataTableFiltersPopover table={table} filters={filters} />

        {enableExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                aria-label="Export"
                className="px-4 max-sm:size-10 max-sm:px-0"
              >
                <Download />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={dir === "rtl" ? "start" : "end"} className="w-44">
              <DropdownMenuItem
                className="text-xs cursor-pointer gap-2"
                onClick={() => {
                  const data = getExportData
                    ? getExportData()
                    : table.getFilteredRowModel().rows.map((r) => r.original as Record<string, unknown>)
                  exportToCsv(
                    data,
                    exportFilename || `${title.toLowerCase().replace(/\s+/g, "-")}-export`
                  )
                }}
              >
                <FileSpreadsheet className="size-3.5 text-success-foreground" />
                <span>Export CSV (.csv)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs cursor-pointer gap-2"
                onClick={() => {
                  const data = getExportData
                    ? getExportData()
                    : table.getFilteredRowModel().rows.map((r) => r.original as Record<string, unknown>)
                  exportToJson(
                    data,
                    exportFilename || `${title.toLowerCase().replace(/\s+/g, "-")}-export`
                  )
                }}
              >
                <FileCode className="size-3.5 text-info-foreground" />
                <span>Export JSON (.json)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Actions */}
        {toolbarActions.map((action, index) => {
          const Icon = action.icon
          const variant = getButtonVariant(action.variant)

          return (
            <Button
              key={`action-${index}`}
              variant={variant}
              aria-label={action.label}
              className={cn(
                // Icon-only actions still show their label from sm up, so "+" is never unlabeled
                action.iconOnly ? "max-sm:size-10 max-sm:px-0 sm:px-4" : "px-4",
                action.className
              )}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {Icon && <Icon />}
              <span className={cn(action.iconOnly && "max-sm:sr-only")}>{action.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
