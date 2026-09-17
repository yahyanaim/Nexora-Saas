"use client"

import * as React from "react"
import { Checkmark } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "defaultChecked"> {
  checked?: boolean | "indeterminate"
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  labelText?: React.ReactNode
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      className,
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      labelText,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked)
    const isChecked = controlledChecked !== undefined ? controlledChecked : uncontrolledChecked

    const toggle = () => {
      if (disabled) return
      const next = isChecked === "indeterminate" ? true : !isChecked
      if (controlledChecked === undefined) {
        setUncontrolledChecked(next)
      }
      onCheckedChange?.(next)
    }

    return (
      <div className="inline-flex items-center gap-2">
        <button
          ref={ref}
          type="button"
          role="checkbox"
          id={inputId}
          aria-checked={isChecked === "indeterminate" ? "mixed" : isChecked}
          disabled={disabled}
          onClick={toggle}
          className={cn(
            "peer size-4 shrink-0 rounded-sm border border-border/80 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center transition-colors cursor-pointer",
            isChecked ? "bg-primary border-primary text-white" : "bg-background/80 hover:bg-muted/60",
            className
          )}
          {...props}
        >
          {isChecked === "indeterminate" ? (
            <div className="h-0.5 w-2 bg-current rounded-full" />
          ) : isChecked ? (
            <Checkmark className="size-3" />
          ) : null}
        </button>
        {labelText && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground cursor-pointer select-none"
          >
            {labelText}
          </label>
        )}
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"
