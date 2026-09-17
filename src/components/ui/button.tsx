"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] duration-150 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 font-medium",
        outline:
          "border border-border/80 bg-background/50 hover:bg-muted/80 hover:text-foreground text-foreground/90 backdrop-blur-xs",
        secondary:
          "bg-secondary text-secondary-foreground border border-border/40 hover:bg-secondary/80",
        ghost:
          "hover:bg-muted/60 hover:text-foreground text-muted-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        tertiary:
          "border border-border/80 bg-background/50 hover:bg-muted/80 text-foreground",
        danger:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 font-medium",
        red:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 font-medium",
        glass:
          "bg-card/60 backdrop-blur-md border border-white/10 hover:bg-card/80 text-foreground shadow-sm",
        "glass-primary":
          "bg-primary/80 backdrop-blur-md border border-primary/30 text-white hover:bg-primary shadow-sm",
        "glass-destructive":
          "bg-destructive/80 backdrop-blur-md border border-destructive/30 text-white hover:bg-destructive shadow-sm",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-lg px-6 text-sm font-semibold",
        icon: "size-9",
        "icon-sm": "size-8 rounded-md",
        "icon-xs": "size-7 rounded-sm",
        "icon-lg": "size-10 rounded-lg",
        xs: "h-7 rounded-sm px-2.5 text-xs",
        xl: "h-11 rounded-lg px-8 text-base",
        "2xl": "h-12 rounded-xl px-10 text-base",
        md: "h-9 px-4 py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  kind?: string
  hasIconOnly?: boolean
  renderIcon?: React.ComponentType<{ className?: string }>
  iconDescription?: string
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      kind,
      size,
      asChild = false,
      hasIconOnly,
      renderIcon: RenderIcon,
      children,
      ...props
    },
    ref
  ) => {
    let resolvedVariant = variant
    if (!resolvedVariant && kind) {
      if (kind === "primary") resolvedVariant = "primary"
      else if (kind === "secondary") resolvedVariant = "secondary"
      else if (kind === "tertiary") resolvedVariant = "outline"
      else if (kind.includes("danger")) resolvedVariant = "destructive"
      else if (kind === "ghost") resolvedVariant = "ghost"
    }

    const isIconSize = hasIconOnly || size === "icon" || size === "icon-sm" || size === "icon-xs"
    const resolvedSize = isIconSize && (!size || size === "default") ? "icon" : size

    const classes = cn(buttonVariants({ variant: resolvedVariant, size: resolvedSize, className }))

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>
      return React.cloneElement(child, {
        ref,
        className: cn(classes, child.props.className),
        ...props,
      } as React.HTMLAttributes<HTMLElement>)
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
        {RenderIcon && <RenderIcon className="size-4 shrink-0" />}
      </button>
    )
  }
)

Button.displayName = "Button"
