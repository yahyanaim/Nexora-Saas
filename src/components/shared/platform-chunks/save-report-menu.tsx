"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ChevronSort, Download, type LucideIcon } from "@/components/ui/carbon/icons"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export interface ReportOption {
  icon: LucideIcon
  title: string
  hint: string
  onClick: () => void
  disabled?: boolean
}

/** "Save as report", drawn like the companies' Analytics menu (A11 step 5). */
export function SaveReportMenu({ options, disabled }: { options: ReportOption[]; disabled?: boolean }) {
  const t = useTranslations()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="primary" size="sm" disabled={disabled}>
          <Download />
          <span>{t("anSaveReport")}</span>
          <ChevronSort className="opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {options.map((o) => (
          <DropdownMenuItem key={o.title} onClick={() => !o.disabled && o.onClick()} aria-disabled={o.disabled} className="flex cursor-pointer items-center gap-2.5 rounded-md p-2">
            <o.icon className="size-3.5 shrink-0 text-primary" />
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">{o.title}</span>
              <span className="text-xs text-muted-foreground">{o.hint}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
