"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  RowData,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DataTableToolbar,
  FacetedFilterConfig,
  ToolbarAction,
} from "./data-table-toolbar"
import { Plus } from "@/components/ui/carbon/icons"
import { DataTablePagination } from "./data-table-pagination"
import { CompactHeaderContext } from "./data-table-column-header"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchColumnId?: string
  searchPlaceholder?: string
  filters?: FacetedFilterConfig[]
  bulkActions?: React.ReactNode
  emptyMessage?: string
  className?: string
  isLoading?: boolean
  isFetching?: boolean
  title?: string
  /** @deprecated Use `actions` instead */
  onAddClick?: () => void
  /** Array of toolbar actions */
  actions?: ToolbarAction[]

  manual?: boolean
  pageCount?: number
  rowCount?: number
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  columnFilters?: ColumnFiltersState
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  searchValue?: string
  onSearchChange?: (value: string) => void
  renderAfterJsxToolbar?: () => React.ReactNode
  renderBeforeJsxToolbar?: () => React.ReactNode
  defaultColumnVisibility?: VisibilityState
  /** Custom export filename */
  exportFilename?: string
  /** Custom export data accessor */
  getExportData?: () => Record<string, unknown>[]
  /** Whether export is enabled (defaults to true) */
  enableExport?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumnId,
  searchPlaceholder,
  filters,
  bulkActions,
  className,
  emptyMessage = "No results.",
  isLoading,
  isFetching: _isFetching,
  title,
  onAddClick,
  actions = [],
  manual = false,
  pageCount,
  rowCount,
  pagination: controlledPagination,
  onPaginationChange,
  columnFilters: controlledColumnFilters,
  onColumnFiltersChange,
  sorting: controlledSorting,
  onSortingChange,
  searchValue,
  onSearchChange,
  renderAfterJsxToolbar,
  renderBeforeJsxToolbar,
  defaultColumnVisibility,
  exportFilename,
  getExportData,
  enableExport = true,
}: DataTableProps<TData, TValue>) {
  const t = useTranslations()
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultColumnVisibility ?? {})

  const [internalColumnFilters, setInternalColumnFilters] =
    React.useState<ColumnFiltersState>([])
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([])
  const [internalPagination, setInternalPagination] =
    React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  const columnFilters = manual
    ? (controlledColumnFilters ?? [])
    : internalColumnFilters
  const sorting = manual ? (controlledSorting ?? []) : internalSorting
  const paginationState = manual
    ? (controlledPagination ?? { pageIndex: 0, pageSize: 10 })
    : internalPagination

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination: paginationState,
    },
    manualPagination: manual,
    manualFiltering: manual,
    manualSorting: manual,
    pageCount: manual ? (pageCount ?? -1) : undefined,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: manual ? onSortingChange : setInternalSorting,
    onColumnFiltersChange: manual
      ? onColumnFiltersChange
      : setInternalColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: manual ? onPaginationChange : setInternalPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: manual ? undefined : getFilteredRowModel(),
    getPaginationRowModel: manual ? undefined : getPaginationRowModel(),
    getSortedRowModel: manual ? undefined : getSortedRowModel(),
    getFacetedUniqueValues: manual ? undefined : getFacetedUniqueValues(),
  })

  const skeletonRowCount = paginationState.pageSize || 10
  const visibleColumnsCount = table.getVisibleLeafColumns().length

  // Merge onAddClick into actions for backward compatibility
  const toolbarActions = React.useMemo(() => {
    const mergedActions = [...actions]
    if (onAddClick) {
      // Check if there's already an action with the same label
      const hasAddAction = mergedActions.some(
        (action) => action.label === "Add" || action.label === "Create"
      )
      if (!hasAddAction) {
        mergedActions.push({
          label: t("add"),
          icon: Plus,
          onClick: onAddClick,
          variant: "primary",
        })
      }
    }
    return mergedActions
  }, [actions, onAddClick, t])

  const headerById = new Map(table.getFlatHeaders().map((h) => [h.column.id, h]))

  return (
    <div
      className={cn(
        "relative flex w-full flex-col",
        className
      )}
    >
      <div className="flex w-full flex-col rounded-3xl border border-border bg-card shadow-panel overflow-hidden">
        {renderBeforeJsxToolbar && renderBeforeJsxToolbar()}
        <DataTableToolbar
          table={table}
          title={title}
          actions={toolbarActions}
          searchColumnId={searchColumnId}
          searchPlaceholder={searchPlaceholder}
          filters={filters}
          bulkActions={bulkActions}
          searchValue={manual ? searchValue : undefined}
          onSearchChange={manual ? onSearchChange : undefined}
          exportFilename={exportFilename}
          getExportData={getExportData}
          enableExport={enableExport}
        />
        {renderAfterJsxToolbar && renderAfterJsxToolbar()}
        {/* Phones and tablets: each row becomes a card with labelled fields */}
        <div className="grid gap-2 px-3 pb-2 pt-1 sm:px-5 md:grid-cols-2 lg:hidden">
          {isLoading ? (
            Array.from({ length: Math.min(skeletonRowCount, 4) }).map((_, i) => (
              <div key={`skeleton-card-${i}`} className="rounded-2xl border border-border p-4">
                <Skeleton className="h-5 w-2/3 rounded-full bg-muted" />
                <Skeleton className="mt-3 h-4 w-1/2 rounded-full bg-muted" />
              </div>
            ))
          ) : table.getRowModel().rows.length ? (
            <CompactHeaderContext.Provider value={true}>
              {table.getRowModel().rows.map((row) => {
                const cells = row.getVisibleCells()
                const actionCell = cells.find((c) => c.column.id === "actions")
                const selectCell = cells.find((c) => c.column.id === "select")
                const [primary, ...rest] = cells.filter((c) => c !== actionCell && c !== selectCell)
                return (
                  <div
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className="rounded-2xl border border-border bg-card p-4 data-[state=selected]:border-primary/25 data-[state=selected]:bg-info-soft"
                  >
                    <div className="flex items-start gap-3">
                      {selectCell && flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}
                      <div className="min-w-0 flex-1">
                        {primary && flexRender(primary.column.columnDef.cell, primary.getContext())}
                      </div>
                      {actionCell && (
                        <div className="-me-2 -mt-1 shrink-0">
                          {flexRender(actionCell.column.columnDef.cell, actionCell.getContext())}
                        </div>
                      )}
                    </div>
                    {rest.length > 0 && (
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3">
                        {rest.map((cell) => {
                          const header = headerById.get(cell.column.id)
                          return (
                            <div key={cell.id} className="min-w-0">
                              <dt className="truncate text-xs text-muted-foreground">
                                {header && !header.isPlaceholder
                                  ? flexRender(header.column.columnDef.header, header.getContext())
                                  : cell.column.id}
                              </dt>
                              <dd className="mt-1 min-w-0 text-sm [overflow-wrap:anywhere]">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </dd>
                            </div>
                          )
                        })}
                      </dl>
                    )}
                  </div>
                )
              })}
            </CompactHeaderContext.Provider>
          ) : (
            <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground md:col-span-2">
              {emptyMessage}
            </p>
          )}
        </div>
        <div className="hidden w-full overflow-auto px-3 sm:px-5 lg:block">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(header.column.columnDef.meta?.className)}
                    >
                      {header.isPlaceholder
                        ? null
                        : header.column.columnDef.header
                          ? flexRender(header.column.columnDef.header, header.getContext())
                          : <span className="sr-only">{t("actions")}</span>}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
                  <TableRow
                    key={`skeleton-row-${rowIndex}`}
                    className="hover:bg-transparent"
                  >
                    {Array.from({ length: visibleColumnsCount }).map(
                      (_, colIndex) => (
                        <TableCell key={`skeleton-cell-${colIndex}`}>
                          <Skeleton className="h-6 w-full max-w-[140px] rounded-full bg-muted" />
                        </TableCell>
                      )
                    )}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(cell.column.columnDef.meta?.className)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination
          table={table}
          total={manual ? rowCount : undefined}
        />
      </div>
    </div>
  )
}
