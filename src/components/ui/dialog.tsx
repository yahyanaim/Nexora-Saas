"use client"

import * as React from "react"
import { Close } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"

interface DialogContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextType | null>(null)

export function Dialog({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(value)
      }
      onOpenChange?.(value)
    },
    [controlledOpen, onOpenChange]
  )

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}

export function DialogTrigger({
  children,
  asChild,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const context = React.useContext(DialogContext)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(e)
    context?.setOpen(true)
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e)
        context?.setOpen(true)
      },
    })
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
}

export function DialogPortal({ children }: { children: React.ReactNode }) {
  const context = React.useContext(DialogContext)
  if (!context?.open) return null
  return <>{children}</>
}

export function DialogOverlay({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(DialogContext)
  return (
    <div
      onClick={() => context?.setOpen(false)}
      className={cn(
        "fixed inset-0 z-50 bg-black/70 backdrop-blur-xs animate-in fade-in-0 duration-200",
        className
      )}
      {...props}
    />
  )
}

export function DialogContent({
  className,
  containerClassName,
  children,
  showCloseButton = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  containerClassName?: string
  showCloseButton?: boolean
}) {
  const context = React.useContext(DialogContext)
  if (!context?.open) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        containerClassName
      )}
    >
      <DialogOverlay />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-50 w-full max-w-lg rounded-xl border border-border/80 bg-card p-6 text-card-foreground shadow-2xl animate-in zoom-in-95 fade-in-0 duration-200",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <button
            type="button"
            onClick={() => context?.setOpen(false)}
            className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            <Close className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </div>
    </div>
  )
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)}
      {...props}
    />
  )
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 mt-6 pt-4 border-t border-border/40",
        className
      )}
      {...props}
    />
  )
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)}
      {...props}
    />
  )
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground mt-1.5 leading-relaxed", className)}
      {...props}
    />
  )
}

export function DialogClose({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(DialogContext)
  return (
    <button
      type="button"
      className={className}
      onClick={() => context?.setOpen(false)}
      {...props}
    >
      {children}
    </button>
  )
}
