"use client"

import * as React from "react"
import { ChevronDown, Checkmark } from "@carbon/icons-react"
import { cn } from "@/lib/utils"

interface SelectContextType {
  value?: string | number
  defaultValue?: string | number
  onValueChange?: (val: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  selectedLabel: string
  setSelectedLabel: (label: string) => void
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
      }}
    >
      <div className="relative w-full inline-block">{children}</div>
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

  return (
    <button
      type="button"
      onClick={() => context.setOpen(!context.open)}
      aria-expanded={context.open}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground shadow-xs transition-colors hover:border-border focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 text-xs" : "h-9",
        className
      )}
      {...props}
    >
      <div className="truncate flex-1 text-left">{children}</div>
      <ChevronDown
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
          context.open && "rotate-180 text-foreground"
        )}
      />
    </button>
  )
}

export function SelectValue({
  placeholder = "Select an option",
}: {
  placeholder?: React.ReactNode
}) {
  const context = React.useContext(SelectContext)
  if (!context) return null

  const display = context.selectedLabel || context.value

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
  if (!context || !context.open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => context.setOpen(false)}
      />
      <div
        className={cn(
          "absolute z-50 max-h-60 min-w-[8rem] w-full overflow-auto rounded-xl border border-border/70 bg-popover/95 p-1 text-popover-foreground shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          className
        )}
      >
        {children}
      </div>
    </>
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
        "relative flex cursor-pointer select-none items-center justify-between rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors hover:bg-muted/70 focus:bg-muted/70",
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
