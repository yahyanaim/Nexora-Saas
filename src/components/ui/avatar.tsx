"use client"

import * as React from "react"
import { UserAvatar } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"

export function Avatar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex size-10 shrink-0 overflow-hidden rounded-full border border-border/80 bg-muted/80",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function AvatarImage({
  src,
  alt,
  className,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [error, setError] = React.useState(!src)

  if (error || !src) return null

  return (
    <img
      src={src}
      alt={alt || "Avatar"}
      onError={() => setError(true)}
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  )
}

export function AvatarFallback({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted font-semibold text-xs text-muted-foreground uppercase select-none",
        className
      )}
      {...props}
    >
      {children || <UserAvatar className="size-5 opacity-70" />}
    </div>
  )
}
