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
}

export function DataTablePagination<TData>({
  table,
  total: _total,
}: DataTablePaginationProps<TData>) {
  const t = useTranslations()
  const { pageIndex, pageSize } = table.getState().pagination
  const totalPages = table.getPageCount()

  return (
    <div className="flex items-center justify-between gap-3 bg-card px-4 py-3 border-t border-border/50">
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-xs text-muted-foreground">{t("rowsPerPage") || "Rows"}:</span>
        <Select
          value={`${pageSize}`}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger className="h-8 w-[76px] text-xs">
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 20, 30, 50].map((size) => (
              <SelectItem key={size} value={`${size}`}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 sm:inline-flex"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          aria-label={t("firstPage")}
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 sm:w-auto sm:px-2.5 text-xs"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label={t("previousPage")}
        >
          <ChevronLeft className="size-3.5" />
          <span className="hidden lg:inline">{t("prev")}</span>
        </Button>

        <span className="min-w-10 text-center text-xs font-mono font-medium text-muted-foreground tabular-nums sm:min-w-14 sm:text-xs px-1">
          {pageIndex + 1}/{totalPages || 1}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 sm:w-auto sm:px-2.5 text-xs"
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
          className="hidden h-8 w-8 sm:inline-flex"
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
