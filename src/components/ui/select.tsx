"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Check as Checkmark } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"

interface SelectContextType {
  value?: string | number
  defaultValue?: string | number
  onValueChange?: (val: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  selectedLabel: string
  setSelectedLabel: (label: string) => void
  trigger: HTMLButtonElement | null
  setTrigger: (el: HTMLButtonElement | null) => void
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

export function Select({
  value,
  defaultValue,
  onValueChange,
  children,
}: {
  value?: string | number
  defaultValue?: string | number
  onValueChange?: (value: string) => void
  children: React.ReactNode
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const [open, setOpen] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState("")
  const [trigger, setTrigger] = React.useState<HTMLButtonElement | null>(null)

  const currentValue = value !== undefined ? value : internalValue

  const handleValueChange = React.useCallback(
    (newVal: string) => {
      if (value === undefined) setInternalValue(newVal)
      onValueChange?.(newVal)
      setOpen(false)
    },
    [value, onValueChange]
  )

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        defaultValue,
        onValueChange: handleValueChange,
        open,
        setOpen,
        selectedLabel,
        setSelectedLabel,
        trigger,
        setTrigger,
      }}
    >
      <div className="contents">{children}</div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({
  className = "",
  size = "default",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: "sm" | "default" }) {
  const context = React.useContext(SelectContext)
  if (!context) return null
  const { open, setOpen, setTrigger } = context

  return (
    <button
      ref={setTrigger}
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      className={cn(
        "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-input px-3.5 py-2 text-sm text-foreground shadow-xs transition-colors hover:bg-muted/40 focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 text-xs" : "h-9",
        className
      )}
      {...props}
    >
      <div className="truncate flex-1 text-left">{children}</div>
      <ChevronDown
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
          open && "rotate-180 text-foreground"
        )}
      />
    </button>
  )
}

export function SelectValue({
  placeholder = "Select an option",
  children,
}: {
  placeholder?: React.ReactNode
  /** Label of the current value; items only register their labels once the menu has opened */
  children?: React.ReactNode
}) {
  const context = React.useContext(SelectContext)
  if (!context) return null

  const display = children ?? (context.selectedLabel || context.value)

  return (
    <span className={cn(display ? "text-foreground" : "text-muted-foreground")}>
      {display || placeholder}
    </span>
  )
}

export function SelectContent({
  className = "",
  children,
  side = "bottom",
}: {
  className?: string
  children: React.ReactNode
  side?: "top" | "bottom" | string
  position?: string
  align?: string
}) {
  const context = React.useContext(SelectContext)
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  const open = !!context?.open
  const trigger = context?.trigger

  // The menu is portalled to <body> so cards with overflow hidden never clip it
  React.useLayoutEffect(() => {
    if (!open) return
    const update = () => setRect(trigger?.getBoundingClientRect() ?? null)
    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [open, trigger])

  if (!context || !open || !rect || typeof document === "undefined") return null

  const MENU_MAX = 240
  const below = window.innerHeight - rect.bottom
  const placeTop = side === "top" ? rect.top > MENU_MAX || rect.top > below : below < MENU_MAX + 12 && rect.top > below
  const width = Math.max(rect.width, 128)
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)

  return createPortal(
    <>
      <div data-select-menu className="fixed inset-0 z-[96]" onClick={() => context.setOpen(false)} />
      <div
        role="listbox"
        data-select-menu
        style={{
          position: "fixed",
          left,
          width,
          ...(placeTop ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
        }}
        className={cn(
          "z-[97] max-h-60 overflow-auto rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          className
        )}
      >
        {children}
      </div>
    </>,
    document.body
  )
}

export function SelectItem({
  value,
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = React.useContext(SelectContext)
  const isSelected = context?.value === value

  React.useEffect(() => {
    if (isSelected && typeof children === "string") {
      context?.setSelectedLabel(children)
    }
  }, [isSelected, children, context])

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => {
        if (typeof children === "string") context?.setSelectedLabel(children)
        context?.onValueChange?.(value)
      }}
      className={cn(
        "relative flex min-h-9 cursor-pointer select-none items-center justify-between rounded-xl px-2.5 py-1.5 text-sm outline-none transition-colors hover:bg-muted focus:bg-muted",
        isSelected && "bg-primary/10 font-medium text-primary hover:bg-primary/15",
        className
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {isSelected && <Checkmark className="size-3.5 shrink-0 text-primary" />}
    </div>
  )
}

export function SelectGroup({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-1", className)} {...props}>
      {children}
    </div>
  )
}

export function SelectLabel({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SelectSeparator({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("-mx-1 my-1 h-px bg-border/60", className)}
      {...props}
    />
  )
}
