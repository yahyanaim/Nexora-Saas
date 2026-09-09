"use client"

import * as React from "react"
import { Column, Table } from "@tanstack/react-table"
import { BrushCleaning, Check, ListFilter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

export interface FacetedFilterConfig {
  columnId: string
  title: string
  options: { label: string; value: string }[]
}

interface DataTableFiltersPopoverProps<TData> {
  table: Table<TData>
  filters: FacetedFilterConfig[]
}

export function DataTableFiltersPopover<TData>({
  table,
  filters,
}: DataTableFiltersPopoverProps<TData>) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)

  const activeCount = filters.reduce((count, filter) => {
    const value = table.getColumn(filter.columnId)?.getFilterValue() as
      string[] | undefined
    return count + (value?.length ?? 0)
  }, 0)

  function toggleValue(
    column: Column<TData, unknown> | undefined,
    value: string
  ) {
    if (!column) return
    const current = new Set((column.getFilterValue() as string[]) ?? [])
    if (current.has(value)) {
      current.delete(value)
    } else {
      current.add(value)
    }
    const next = Array.from(current)
    column.setFilterValue(next.length ? next : undefined)
  }

  function clearAll() {
    filters.forEach((filter) => {
      table.getColumn(filter.columnId)?.setFilterValue(undefined)
    })
  }

  if (!filters.length) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="h-10 w-10 shrink-0 overflow-visible rounded-full border-none md:h-12 md:w-12"
        >
          <ListFilter className="size-4" />
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground tabular-nums">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-55 bg-background p-0">
        <div className="flex items-center justify-between px-3 py-2 pb-0">
          <span className="text-sm font-medium">{t("filters")}</span>
          {activeCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={clearAll}
            >
              {t("clear")}
              <BrushCleaning className="size-4" />
            </Button>
          )}
        </div>
        <div className="max-h-80 space-y-2 overflow-y-auto p-2 pt-0">
          {filters.map((filter, index) => {
            const column = table.getColumn(filter.columnId)
            const selected = new Set(
              (column?.getFilterValue() as string[]) ?? []
            )
            return (
              <React.Fragment key={filter.columnId}>
                <Separator />
                <Command>
                  <CommandList>
                    <CommandGroup heading={filter.title}>
                      {filter.options.map((option) => {
                        const isSelected = selected.has(option.value)
                        return (
                          <CommandItem
                            key={option.value}
                            onSelect={() => toggleValue(column, option.value)}
                            className="cursor-pointer"
                          >
                            <div
                              className={cn(
                                "mr-2 flex size-4 items-center justify-center rounded-sm border border-primary",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible"
                              )}
                            >
                              <Check className="size-3.5" />
                            </div>
                            <span>{option.label}</span>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </React.Fragment>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
