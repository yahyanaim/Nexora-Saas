"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PopoverContextType {
  open: boolean
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  triggerRef: React.RefObject<HTMLDivElement | null>
}

const PopoverContext = React.createContext<PopoverContextType | undefined>(undefined)

export function Popover({
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
    (nextOpen: boolean | ((prev: boolean) => boolean)) => {
      if (!isControlled) {
        setInternalOpen((prev) => {
          const resolved = typeof nextOpen === "function" ? nextOpen(prev) : nextOpen
          onOpenChange?.(resolved)
          return resolved
        })
      } else {
        const resolved = typeof nextOpen === "function" ? nextOpen(controlledOpen ?? false) : nextOpen
        onOpenChange?.(resolved)
      }
    },
    [isControlled, controlledOpen, onOpenChange]
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
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div ref={triggerRef} className="relative inline-block text-left">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

export function PopoverTrigger({
  asChild,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const context = React.useContext(PopoverContext)
  if (!context) return <>{children}</>

  const handleToggle = (_e: React.MouseEvent) => {
    context.setOpen((prev) => !prev)
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e)
        handleToggle(e)
      },
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      {...props}
    >
      {children}
    </button>
  )
}

export function PopoverContent({
  className,
  align = "center",
  side = "bottom",
  sideOffset: _sideOffset,
  alignOffset: _alignOffset,
  onOpenAutoFocus: _onOpenAutoFocus,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "end" | "center"
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
  alignOffset?: number
  onOpenAutoFocus?: (e: Event) => void
}) {
  const context = React.useContext(PopoverContext)
  if (!context?.open) return null

  return (
    <div
      role="dialog"
      className={cn(
        "absolute z-50 min-w-[14rem] rounded-xl border border-border/70 bg-popover/95 p-4 text-popover-foreground shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150",
        align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0",
        side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const PopoverAnchor = ({ children }: { children: React.ReactNode }) => <>{children}</>
