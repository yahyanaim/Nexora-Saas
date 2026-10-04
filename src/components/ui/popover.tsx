"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { FloatingLayer } from "./floating"

interface PopoverContextType {
  open: boolean
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  triggerRef: React.RefObject<HTMLDivElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
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
  const contentRef = React.useRef<HTMLDivElement | null>(null)

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
      const target = e.target as Node
      if (triggerRef.current && !triggerRef.current.contains(target) && !contentRef.current?.contains(target) && !(target as Element).closest?.("[data-select-menu]")) {
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
    <PopoverContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
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
    <FloatingLayer anchorRef={context.triggerRef} contentRef={context.contentRef} side={side} align={align} offset={8}>
      <div
        role="dialog"
        className={cn(
          "min-w-[14rem] rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 duration-150",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </FloatingLayer>
  )
}

export const PopoverAnchor = ({ children }: { children: React.ReactNode }) => <>{children}</>
