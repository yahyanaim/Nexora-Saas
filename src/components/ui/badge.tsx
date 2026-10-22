import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-info-soft text-info-foreground",
        primary: "bg-info-soft text-info-foreground",
        info: "bg-info-soft text-info-foreground",
        secondary: "bg-muted text-foreground/80",
        success: "bg-success-soft text-success-foreground",
        warning: "bg-warning-soft text-warning-foreground",
        destructive: "bg-danger-soft text-danger-foreground",
        "solid-destructive": "bg-destructive text-destructive-foreground",
        outline: "border-border bg-card text-foreground",
        tag: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Leading status dot; on by default for coloured status badges with plain text */
  dot?: boolean
}

const TONED_VARIANTS = new Set(["default", "primary", "info", "success", "warning", "destructive"])

/** Status badges (a tone, plain text) carry a small dot in their colour: Nexora's status signature. */
function wantsDot(variant: BadgeProps["variant"], className: string | undefined, children: React.ReactNode) {
  const plain = React.Children.toArray(children).every((c) => typeof c === "string" || typeof c === "number")
  const toned = TONED_VARIANTS.has(variant ?? "default") || /-soft\b|\bbg-muted\b/.test(className ?? "")
  return plain && toned && !/\bfont-mono\b/.test(className ?? "")
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  const withDot = dot ?? wantsDot(variant, className, children)
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {withDot && <span className="size-1.5 shrink-0 rounded-full bg-current opacity-75" aria-hidden />}
      {children}
    </div>
  )
}
