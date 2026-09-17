"use client"

import * as React from "react"
import { Input as ShadcnInput } from "@/components/ui/input"
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea"
import { Switch as ShadcnSwitch, type SwitchProps as ShadcnSwitchProps } from "@/components/ui/switch"
import { Checkbox as ShadcnCheckbox, type CheckboxProps as ShadcnCheckboxProps } from "@/components/ui/checkbox"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldContent,
  FieldTitle,
  FieldSeparator,
} from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export const Form = (props: React.FormHTMLAttributes<HTMLFormElement>) => <form {...props} />
export const FormGroup = FieldGroup
export const FormItem = Field
export const FormLabel = FieldLabel

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  invalid?: boolean
  invalidText?: React.ReactNode
  warn?: boolean
  warnText?: React.ReactNode
  helperText?: React.ReactNode
  labelText?: React.ReactNode
  hideLabel?: boolean
  size?: "sm" | "md" | "lg" | number
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      labelText,
      hideLabel = true,
      invalid,
      invalidText,
      helperText,
      warn: _warn,
      warnText: _warnText,
      size: _size,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id || generatedId

    return (
      <div className="w-full space-y-1">
        {labelText && !hideLabel && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground block">
            {labelText}
          </label>
        )}
        <ShadcnInput
          id={inputId}
          ref={ref}
          aria-invalid={invalid}
          className={cn(
            invalid && "border-destructive focus-visible:ring-destructive/30",
            className
          )}
          {...props}
        />
        {invalid && invalidText && (
          <p className="text-xs text-destructive">{invalidText}</p>
        )}
        {!invalid && helperText && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  invalidText?: React.ReactNode
  labelText?: React.ReactNode
  hideLabel?: boolean
  helperText?: React.ReactNode
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      labelText,
      hideLabel = true,
      invalid,
      invalidText,
      helperText,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id || generatedId

    return (
      <div className="w-full space-y-1">
        {labelText && !hideLabel && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground block">
            {labelText}
          </label>
        )}
        <ShadcnTextarea
          id={inputId}
          ref={ref}
          aria-invalid={invalid}
          className={cn(
            invalid && "border-destructive focus-visible:ring-destructive/30",
            className
          )}
          {...props}
        />
        {invalid && invalidText && (
          <p className="text-xs text-destructive">{invalidText}</p>
        )}
        {!invalid && helperText && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export interface SwitchProps extends ShadcnSwitchProps {
  labelA?: string
  labelB?: string
  labelText?: string
}

export function Switch({
  labelText,
  labelA: _labelA,
  labelB: _labelB,
  className,
  ...props
}: SwitchProps) {
  return (
    <div className="flex items-center gap-3">
      {labelText && (
        <span className="text-sm font-medium text-foreground">{labelText}</span>
      )}
      <ShadcnSwitch className={className} {...props} />
    </div>
  )
}

export interface CheckboxProps extends ShadcnCheckboxProps {
  labelText?: React.ReactNode
}

export function Checkbox({
  labelText,
  id,
  className,
  ...props
}: CheckboxProps) {
  const generatedId = React.useId()
  const checkboxId = id || generatedId

  return (
    <div className="flex items-center gap-2">
      <ShadcnCheckbox id={checkboxId} className={className} {...props} />
      {labelText && (
        <label
          htmlFor={checkboxId}
          className="text-sm font-medium text-foreground cursor-pointer select-none"
        >
          {labelText}
        </label>
      )}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldContent,
  FieldTitle,
  FieldSeparator,
  Label,
}
