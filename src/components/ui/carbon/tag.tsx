"use client"

import * as React from "react"
import { Badge, badgeVariants, type BadgeProps } from "@/components/ui/badge"
import { StatusBadge, type StatusBadgeProps, type BadgeToneConfig } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

export type CarbonTagType =
  | "red"
  | "magenta"
  | "purple"
  | "blue"
  | "cyan"
  | "teal"
  | "green"
  | "gray"
  | "cool-gray"
  | "warm-gray"
  | "high-contrast"
  | "outline"

export function Tag({
  type = "blue",
  size = "sm",
  className = "",
  children,
  ...props
}: {
  type?: CarbonTagType
  size?: "sm" | "md" | "lg"
  className?: string
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLSpanElement>) {
  const typeClasses: Record<CarbonTagType, string> = {
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    cyan: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
    teal: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    red: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 font-medium",
    magenta: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
    purple: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    gray: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20",
    "cool-gray": "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
    "warm-gray": "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20",
    "high-contrast": "bg-foreground text-background font-semibold",
    outline: "border-border text-foreground bg-transparent",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        typeClasses[type] || typeClasses.blue,
        size === "sm" && "text-xs py-0.5",
        size === "lg" && "text-sm py-1 px-3",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export { Badge, StatusBadge, badgeVariants }
export type { BadgeProps, StatusBadgeProps, BadgeToneConfig }
