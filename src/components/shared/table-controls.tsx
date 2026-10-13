"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { TableHead } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown as ArrowUpDown } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { pageOf, sortRows, type SortDir, type Sorters } from "@/lib/ui/table-sort"

const SIZES = [10, 25, 50, 100]

/**
 * UX-05: sort by any column and page through a console table. The page goes
 * back to the first one when the rows change (a filter or a search).
 */
export function useTableControls<T>(rows: readonly T[], sorters: Sorters<T>, initial?: { key: string; dir: SortDir }, pageSize = 10) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(initial ?? null)
  const [page, setPage] = useState({ index: 0, size: pageSize, length: rows.length })
  // a different number of rows means a new filter: back to page 1 (render-time reset, no effect)
  if (page.length !== rows.length) setPage({ ...page, index: 0, length: rows.length })
  const sorted = useMemo(() => sortRows(rows, sort ? sorters[sort.key] : undefined, sort?.dir ?? "asc"), [rows, sort, sorters])
  const view = pageOf(sorted, page.index, page.size)
  return {
    ...view,
    sorted,
    pageSize: page.size,
    sort,
    toggle: (key: string) => setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: typeof sorters[key]?.(rows[0] as T) === "number" ? "desc" : "asc" })),
    setPageIndex: (index: number) => setPage((p) => ({ ...p, index })),
    setPageSize: (size: number) => setPage((p) => ({ ...p, size, index: 0 })),
  }
}
export type TableControls = Pick<ReturnType<typeof useTableControls<unknown>>, "sort" | "toggle" | "pageIndex" | "pageCount" | "from" | "to" | "total" | "pageSize" | "setPageIndex" | "setPageSize">

/** A column header that sorts the table; screen readers hear the order. */
export function SortableHead({ label, k, ctl, className, align = "start" }: { label: string; k: string; ctl: Pick<TableControls, "sort" | "toggle">; className?: string; align?: "start" | "end" }) {
  const t = useTranslations()
  const active = ctl.sort?.key === k
  const Icon = !active ? ArrowUpDown : ctl.sort!.dir === "asc" ? ArrowUp : ArrowDown
  return (
    <TableHead className={cn(align === "end" && "text-end", className)} aria-sort={active ? (ctl.sort!.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => ctl.toggle(k)}
        className={cn("inline-flex items-center gap-1 rounded uppercase tracking-wider hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", align === "end" && "flex-row-reverse", active && "text-foreground")}
        aria-label={t("tcSortBy", { column: label })}
      >
        {label}
        <Icon className={cn("size-3", !active && "opacity-40")} aria-hidden />
      </button>
    </TableHead>
  )
}

/** "11–20 of 37", the page size and previous/next; hidden when everything fits on one page of 10. */
export function TablePager({ ctl, className }: { ctl: TableControls; className?: string }) {
  const t = useTranslations()
  if (ctl.total <= SIZES[0]!) return null
  return (
    <div className={cn("mt-3 flex flex-wrap items-center justify-between gap-3 text-sm", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="hidden sm:inline text-xs">{t("rowsPerPage")}</span>
        <Select value={String(ctl.pageSize)} onValueChange={(v) => ctl.setPageSize(Number(v))}>
          <SelectTrigger className="h-8 w-20 rounded-full text-xs" aria-label={t("rowsPerPage")}><SelectValue /></SelectTrigger>
          <SelectContent side="top">{SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <span className="tabular-nums text-xs text-muted-foreground" aria-live="polite">{t("tcRange", { from: ctl.from, to: ctl.to, total: ctl.total })}</span>
        <Button variant="outline" size="icon" className="size-8" onClick={() => ctl.setPageIndex(ctl.pageIndex - 1)} disabled={ctl.pageIndex === 0} aria-label={t("previousPage")}><ChevronLeft className="size-4" /></Button>
        <Button variant="outline" size="icon" className="size-8" onClick={() => ctl.setPageIndex(ctl.pageIndex + 1)} disabled={ctl.pageIndex >= ctl.pageCount - 1} aria-label={t("nextPage")}><ChevronRight className="size-4" /></Button>
      </div>
    </div>
  )
}
