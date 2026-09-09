"use client"

import { cn } from "@/lib/utils"

interface FooterGradientProps {
  height?: "sm" | "md" | "lg" | "xl"
  blur?: boolean
  className?: string
  position?: "fixed" | "sticky" | "absolute"
}

export function FooterGradient({
  height = "lg",
  blur = true,
  className,
  position = "fixed",
}: FooterGradientProps) {
  const heights = {
    sm: "h-16",
    md: "h-24",
    lg: "h-32",
    xl: "h-48",
  }

  const positions = {
    fixed: "fixed right-0 bottom-0 left-0",
    sticky: "sticky bottom-0",
    absolute: "absolute right-0 bottom-0 left-0",
  }

  return (
    <div
      className={cn(
        "pointer-events-none",
        positions[position],
        heights[height],
        "bg-gradient-to-t from-background via-background/80 to-transparent",
        blur && "backdrop-blur-[2px]",
        className
      )}
    />
  )
}
