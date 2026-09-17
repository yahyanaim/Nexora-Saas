import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/15 text-blue-400",
        primary:
          "border-primary/30 bg-primary/15 text-blue-400",
        secondary:
          "border-border/50 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300 font-medium",
        "solid-destructive":
          "bg-destructive text-white border-transparent font-medium shadow-xs",
        outline: "text-foreground border-border",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-300",
        info:
          "border-blue-500/30 bg-blue-500/10 text-blue-400",
        tag:
          "border-border/60 bg-muted/60 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
