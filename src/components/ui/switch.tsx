"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  onChange?: (checked: boolean) => void
  labelText?: React.ReactNode
  labelA?: string
  labelB?: string
  size?: "sm" | "md" | "lg"
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      onChange,
      labelText,
      disabled,
      ...props
    },
    ref
  ) => {
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked)
    const isChecked = controlledChecked !== undefined ? controlledChecked : uncontrolledChecked

    const toggle = () => {
      if (disabled) return
      const next = !isChecked
      if (controlledChecked === undefined) {
        setUncontrolledChecked(next)
      }
      onCheckedChange?.(next)
      onChange?.(next)
    }

    return (
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={isChecked}
          disabled={disabled}
          ref={ref}
          onClick={toggle}
          className={cn(
            "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            isChecked ? "bg-primary" : "bg-muted border-border/80",
            className
          )}
          {...props}
        >
          <span
            className={cn(
              "pointer-events-none block size-4 rounded-full shadow-lg ring-0 transition-transform",
              isChecked ? "translate-x-4 bg-white" : "translate-x-0 bg-muted-foreground"
            )}
          />
        </button>
        {labelText && (
          <span className="text-sm font-medium text-foreground select-none">
            {labelText}
          </span>
        )}
      </div>
    )
  }
)
Switch.displayName = "Switch"
