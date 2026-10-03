"use client"

import * as React from "react"
import { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** When true (phone card layout), headers render as plain labels without sort buttons. */
export const CompactHeaderContext = React.createContext(false)

interface DataTableColumnHeaderProps<
  TData,
  TValue,
> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const compact = React.useContext(CompactHeaderContext)
  if (compact) return <>{title}</>

  if (!column.getCanSort()) {
    return <div className={cn("text-xs", className)}>{title}</div>
  }

  const sorted = column.getIsSorted()

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ms-3 h-8 gap-1.5 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:bg-muted data-[state=open]:bg-accent", className)}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      <span>{title}</span>
      {sorted === "desc" ? (
        <ArrowDown className="size-3.5" />
      ) : sorted === "asc" ? (
        <ArrowUp className="size-3.5" />
      ) : (
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      )}
    </Button>
  )
}
