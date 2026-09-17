import * as React from "react"
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
      {...props}
    />
  )
}

function SkeletonText({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={cn("h-4 w-full my-1 rounded", className)}
      {...props}
    />
  )
}

function SkeletonPlaceholder({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={cn("h-24 w-full rounded-lg", className)}
      {...props}
    />
  )
}

export { Skeleton, SkeletonText, SkeletonPlaceholder }
