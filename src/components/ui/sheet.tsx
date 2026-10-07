"use client"

import * as React from "react"
import { X as Close } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"

interface SheetContextType {
  open: boolean
  setOpen: (open: boolean) => void
  /** Links the panel to its SheetTitle so screen readers announce it */
  titleId: string
}

const SheetContext = React.createContext<SheetContextType | undefined>(undefined)

/** Closes an open overlay when Escape is pressed (keyboard accessibility). */
function useEscapeToClose(open: boolean, close: () => void) {
  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, close])
}

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

  const close = React.useCallback(() => setOpen(false), [setOpen])
  useEscapeToClose(open, close)
  const titleId = React.useId()

  return (
    <SheetContext.Provider value={{ open, setOpen, titleId }}>
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
    // Floating panel: inset from the screen edge with large rounded corners
    left: "inset-y-2 start-2 w-[calc(100%-1rem)] max-w-md rounded-[28px] border sm:inset-y-3 sm:start-3",
    right: "inset-y-2 end-2 w-[calc(100%-1rem)] max-w-lg rounded-[28px] border sm:inset-y-3 sm:end-3",
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 transition-opacity duration-200 animate-in fade-in-0"
        onClick={() => context.setOpen(false)}
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={context.titleId}
        className={cn(
          "fixed z-50 flex flex-col bg-card border-border/70 p-6 shadow-[0_24px_64px_-12px_rgba(15,23,42,0.28)] overflow-y-auto duration-300 animate-in sm:p-8",
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
            className="absolute top-6 end-6 rounded-full p-2 text-foreground/70 hover:bg-muted/70 hover:text-foreground transition-colors sm:top-8 sm:end-8"
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
      className={cn("mb-6 flex flex-col gap-1.5 border-b border-border/70 pb-6 pe-10 text-start", className)}
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
  const context = React.useContext(SheetContext)
  return (
    <h3
      id={context?.titleId}
      className={cn("font-serif text-[26px] font-normal leading-tight tracking-[-0.01em] text-foreground", className)}
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
        "mt-auto flex flex-col-reverse gap-2.5 pt-6 sm:flex-row sm:justify-end [&_button]:h-11 [&_button]:rounded-xl [&_button]:px-5",
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
