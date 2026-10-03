"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[background-color,color,border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 active:scale-[0.98] duration-150 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
        primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-border bg-card text-foreground shadow-xs hover:bg-muted",
        secondary: "bg-muted text-foreground hover:bg-muted/70",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        link: "rounded-md text-primary underline-offset-4 hover:underline",
        // Legacy names kept for existing call sites
        tertiary: "border border-border bg-card text-foreground shadow-xs hover:bg-muted",
        danger: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        red: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        glass: "border border-border bg-card text-foreground shadow-xs hover:bg-muted",
        "glass-primary": "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
        "glass-destructive": "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
      },
      size: {
        default: "h-10 px-5",
        md: "h-10 px-5",
        sm: "h-9 px-4 text-[13px]",
        xs: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        xl: "h-12 px-7 text-base",
        "2xl": "h-12 px-8 text-base",
        icon: "size-10",
        "icon-sm": "size-9",
        "icon-xs": "size-8",
        "icon-lg": "size-11",
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
