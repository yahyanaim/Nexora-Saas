"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownContextType {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLDivElement | null>
}

const DropdownContext = React.createContext<DropdownContextType | undefined>(undefined)

export function DropdownMenu({
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const triggerRef = React.useRef<HTMLDivElement | null>(null)

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setInternalOpen(nextOpen)
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange]
  )

  React.useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open, setOpen])

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
      <div ref={triggerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

export function DropdownMenuTrigger({
  asChild,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const context = React.useContext(DropdownContext)
  if (!context) return <>{children}</>

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e)
        context.setOpen(!context.open)
      },
    })
  }

  return (
    <button
      type="button"
      onClick={() => context.setOpen(!context.open)}
      {...props}
    >
      {children}
    </button>
  )
}

export function DropdownMenuContent({
  className,
  align = "end",
  side = "bottom",
  sideOffset: _sideOffset = 4,
  children,
}: {
  className?: string
  align?: "start" | "end" | "center"
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
  children: React.ReactNode
}) {
  const context = React.useContext(DropdownContext)
  if (!context?.open) return null

  return (
    <div
      role="menu"
      className={cn(
        "absolute z-50 min-w-[12rem] overflow-hidden rounded-xl border border-border/70 bg-popover/95 p-1 text-popover-foreground shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150",
        align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0",
        side === "top" ? "bottom-full mb-1" : "top-full mt-1",
        className
      )}
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({
  className,
  variant = "default",
  onClick,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive"
}) {
  const context = React.useContext(DropdownContext)

  return (
    <div
      role="menuitem"
      onClick={(e) => {
        onClick?.(e)
        context?.setOpen(false)
      }}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-colors duration-100",
        variant === "destructive"
          ? "text-destructive hover:bg-destructive/15 focus:bg-destructive/15"
          : "text-foreground hover:bg-muted/80 focus:bg-muted/80",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DropdownMenuGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-0.5", className)} {...props} />
}

export function DropdownMenuLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-2.5 py-1.5 text-xs font-semibold text-muted-foreground", className)}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("-mx-1 my-1 h-px bg-border/60", className)} {...props} />
  )
}
