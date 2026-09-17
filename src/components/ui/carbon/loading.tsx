"use client"

export { Skeleton, SkeletonText, SkeletonPlaceholder } from "@/components/ui/skeleton"
export { Spinner } from "@/components/ui/spinner"

// Optional Carbon Loading alias fallbacks
export function Loading({ small = false, description = "Loading..." }: { small?: boolean; description?: string; withOverlay?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm">
      <div className={`border-2 border-primary border-t-transparent rounded-full animate-spin ${small ? "size-4" : "size-6"}`} />
      <span>{description}</span>
    </div>
  )
}

export function InlineLoading({ description = "Loading..." }: { description?: string; status?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
      <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span>{description}</span>
    </div>
  )
}
