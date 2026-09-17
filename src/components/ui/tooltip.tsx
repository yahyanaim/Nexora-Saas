"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const TooltipContext = React.createContext<TooltipContextType | undefined>(undefined)

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function Tooltip({
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div
        className="relative inline-flex"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

export function TooltipTrigger({
  asChild,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    return children
  }
  return <span {...props}>{children}</span>
}

export function TooltipContent({
  className,
  side = "top",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  side?: "top" | "bottom" | "left" | "right"
}) {
  const context = React.useContext(TooltipContext)
  if (!context?.open) return null

  return (
    <div
      role="tooltip"
      className={cn(
        "absolute z-50 overflow-hidden rounded-md border border-border/80 bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 pointer-events-none whitespace-nowrap",
        side === "top" && "bottom-full mb-1.5 left-1/2 -translate-x-1/2",
        side === "bottom" && "top-full mt-1.5 left-1/2 -translate-x-1/2",
        side === "left" && "right-full mr-1.5 top-1/2 -translate-y-1/2",
        side === "right" && "left-full ml-1.5 top-1/2 -translate-y-1/2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
