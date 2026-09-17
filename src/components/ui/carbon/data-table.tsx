"use client"

export * from "@/components/ui/table"

// Fallbacks for any legacy Carbon table references
export const DataTableSkeleton = ({ rowCount = 5 }: { rowCount?: number }) => (
  <div className="w-full space-y-2 p-4 animate-pulse">
    <div className="h-8 bg-muted/60 rounded-md w-full mb-4" />
    {Array.from({ length: rowCount }).map((_, i) => (
      <div key={i} className="h-10 bg-muted/40 rounded-md w-full" />
    ))}
  </div>
)

export const Pagination = ({
  totalItems: _totalItems,
  page: _page,
  pageSize: _pageSize,
}: {
  totalItems?: number
  page?: number
  pageSize?: number
}) => null
