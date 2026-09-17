"use client"

import { MoreHorizontal } from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useGetDirection } from "@/hooks/use-get-direction"

export interface RowAction<TData> {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: (row: TData) => void
  variant?: "default" | "destructive"
  separatorBefore?: boolean
}

interface DataTableRowActionsProps<TData> {
  row: TData
  actions: RowAction<TData>[]
}

export function DataTableRowActions<TData>({
  row,
  actions,
}: DataTableRowActionsProps<TData>) {
  const { dir } = useGetDirection()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={dir === "rtl" ? "start" : "end"}
        className="w-44"
      >
        {actions.map((action) => (
          <div key={action.label}>
            {action.separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem
              variant={action.variant}
              onClick={() => action.onClick(row)}
            >
              {action.icon && <action.icon className="size-4" />}
              {action.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
