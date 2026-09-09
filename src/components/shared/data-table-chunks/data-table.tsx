"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
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
import { Plus } from "lucide-react"
import { DataTablePagination } from "./data-table-pagination"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
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
  isFetching,
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
    // TODO: sorting is temporarily disabled — remove this line to re-enable it.
    enableSorting: false,
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

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden",
        className
      )}
    >
      <div className="flex h-full w-full flex-col bg-card ring-1 ring-foreground/10">
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
        />
        {renderAfterJsxToolbar && renderAfterJsxToolbar()}
        <div className="grow overflow-auto p-3 pt-2">
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
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
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
                          <Skeleton className="h-9 w-full max-w-[140px] bg-background" />
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
