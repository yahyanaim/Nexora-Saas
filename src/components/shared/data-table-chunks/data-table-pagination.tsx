"use client"

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table } from "@tanstack/react-table"
import { useTranslations } from "next-intl"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  total?: number
  /** "11–20 of 37", announced to screen readers when the page changes */
  showRange?: boolean
  /** Page numbers to click (1 2 3 … 9) instead of "3/9" (CRM clients list) */
  numbered?: boolean
}

/** Pages shown as buttons: the first, the last and two around the current one, with gaps as null. */
export function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const keep = new Set([0, total - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < total))
  if (current <= 2) [1, 2, 3].forEach((p) => keep.add(p))
  if (current >= total - 3) [total - 4, total - 3, total - 2].forEach((p) => keep.add(p))
  const pages = [...keep].sort((a, b) => a - b)
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1]! > 1 ? [null, p] : [p]))
}

export function DataTablePagination<TData>({
  table,
  total: _total,
  showRange = false,
  numbered = false,
}: DataTablePaginationProps<TData>) {
  const t = useTranslations()
  const { pageIndex, pageSize } = table.getState().pagination
  const totalPages = table.getPageCount()
  const rows = table.getFilteredRowModel().rows.length
  const sizes = [10, 20, 30, 50].includes(pageSize) ? [10, 20, 30, 50] : [10, 20, pageSize, 50].sort((a, b) => a - b)

  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-2 pb-5 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-xs text-muted-foreground">{t("rowsPerPage") || "Rows"}:</span>
        <Select
          value={`${pageSize}`}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger className="h-9 w-[80px] rounded-full text-[13px]">
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {sizes.map((size) => (
              <SelectItem key={size} value={`${size}`}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        {showRange && rows > 0 && (
          <span className="me-2 hidden text-xs tabular-nums text-muted-foreground sm:inline" aria-live="polite">
            {t("tcRange", { from: pageIndex * pageSize + 1, to: Math.min(rows, (pageIndex + 1) * pageSize), total: rows })}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="hidden size-9 sm:inline-flex"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          aria-label={t("firstPage")}
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-9 sm:w-auto sm:px-3.5 text-[13px]"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label={t("previousPage")}
        >
          <ChevronLeft className="size-3.5" />
          <span className="hidden lg:inline">{t("prev")}</span>
        </Button>

        {numbered && totalPages > 1 ? (
          <span className="flex items-center gap-1">
            {pageWindow(pageIndex, totalPages).map((p, i) =>
              p === null ? (
                <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden>…</span>
              ) : (
                <Button
                  key={p}
                  variant={p === pageIndex ? "primary" : "ghost"}
                  size="icon"
                  className="size-9 text-[13px] tabular-nums"
                  aria-label={t("pageN", { n: p + 1 })}
                  aria-current={p === pageIndex ? "page" : undefined}
                  onClick={() => table.setPageIndex(p)}
                >
                  {p + 1}
                </Button>
              )
            )}
          </span>
        ) : (
          <span className="min-w-10 text-center text-[13px] font-medium text-muted-foreground tabular-nums sm:min-w-14 px-1">
            {pageIndex + 1}/{totalPages || 1}
          </span>
        )}

        <Button
          variant="outline"
          size="icon"
          className="size-9 sm:w-auto sm:px-3.5 text-[13px]"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label={t("nextPage")}
        >
          <span className="hidden lg:inline">{t("next")}</span>
          <ChevronRight className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden size-9 sm:inline-flex"
          onClick={() => table.setPageIndex(totalPages - 1)}
          disabled={!table.getCanNextPage()}
          aria-label={t("lastPage")}
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
