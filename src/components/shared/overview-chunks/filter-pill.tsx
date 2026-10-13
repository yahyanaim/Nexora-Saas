"use client"

import { ChevronSort, Checkmark } from "@/components/ui/carbon/icons"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export const FILTER_PILL =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[13px] font-medium text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer select-none"

/**
 * A rounded filter button that opens a list with a check on the current choice,
 * as in the Analytics toolbar (period, comparison, client, team).
 */
export function FilterPill<V extends string | number | null>({
  label,
  value,
  options,
  onChange,
  width = "w-52",
}: {
  label: string
  value: V
  options: { value: V; label: string }[]
  onChange: (value: V) => void
  width?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={FILTER_PILL}>
          <span>{label}</span>
          <ChevronSort className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={width}>
        {options.map((o) => (
          <DropdownMenuItem key={o.value ?? "all"} onClick={() => onChange(o.value)} className="flex items-center justify-between">
            <span>{o.label}</span>
            {value === o.value && <Checkmark className="size-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
