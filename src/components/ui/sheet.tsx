"use client"

import * as React from "react"
import { Close } from "@carbon/icons-react"
import { cn } from "@/lib/utils"

interface SheetContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextType | undefined>(undefined)

export function Sheet({
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

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setInternalOpen(nextOpen)
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange]
  )

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  )
}

export function SheetTrigger({
  asChild,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const context = React.useContext(SheetContext)
  if (!context) return <>{children}</>

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props?.onClick?.(e)
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

export function SheetContent({
  side = "right",
  className = "",
  showCloseButton = true,
  children,
}: {
  side?: "top" | "bottom" | "left" | "right"
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  const context = React.useContext(SheetContext)
  if (!context || !context.open) return null

  const sideClasses = {
    top: "inset-x-0 top-0 border-b max-h-[80vh]",
    bottom: "inset-x-0 bottom-0 border-t max-h-[80vh] rounded-t-2xl",
    left: "inset-y-0 left-0 border-r w-full max-w-md",
    right: "inset-y-0 right-0 border-l w-full max-w-md",
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in-0"
        onClick={() => context.setOpen(false)}
      />

      {/* Sheet panel */}
      <div
        className={cn(
          "fixed z-50 flex flex-col bg-card/95 border-border/70 p-6 shadow-2xl backdrop-blur-md overflow-y-auto duration-200 animate-in",
          side === "left" && "slide-in-from-left",
          side === "right" && "slide-in-from-right",
          side === "top" && "slide-in-from-top",
          side === "bottom" && "slide-in-from-bottom",
          sideClasses[side],
          className
        )}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={() => context.setOpen(false)}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
            aria-label="Close panel"
          >
            <Close className="size-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 pb-4 border-b border-border/60 text-left", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function SheetTitle({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold tracking-tight text-foreground", className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function SheetDescription({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  )
}

export function SheetFooter({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-auto flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-border/60",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SheetClose({
  children,
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const context = React.useContext(SheetContext)

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props?.onClick?.(e)
        context?.setOpen(false)
      },
    })
  }

  return (
    <button type="button" onClick={() => context?.setOpen(false)} {...props}>
      {children}
    </button>
  )
}

export const SheetPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const SheetOverlay = () => null
