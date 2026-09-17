import * as React from "react"
import { cn } from "@/lib/utils"

export function Field({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 w-full my-1.5", className)}
      {...props}
    />
  )
}

export function FieldLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
}

export function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-muted-foreground leading-normal", className)}
      {...props}
    />
  )
}

export function FieldError({
  className,
  children,
  errors,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const message =
    children ||
    errors?.find((e) => e?.message)?.message

  if (!message) return null

  return (
    <p
      role="alert"
      className={cn("text-xs font-medium text-destructive mt-0.5", className)}
      {...props}
    >
      {message}
    </p>
  )
}

export function FieldGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-4 w-full", className)}
      {...props}
    />
  )
}

export function FieldSet({
  className,
  ...props
}: React.FieldsetHTMLAttributes<HTMLFieldSetElement>) {
  return (
    <fieldset className={cn("border-none p-0 m-0", className)} {...props} />
  )
}

export function FieldLegend({
  className,
  ...props
}: React.HTMLAttributes<HTMLLegendElement>) {
  return (
    <legend className={cn("text-base font-semibold mb-2 text-foreground", className)} {...props} />
  )
}

export function FieldContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />
}

export function FieldTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("font-medium text-foreground", className)} {...props} />
}

export function FieldSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("my-3 border-t border-border/60", className)} {...props} />
  )
}
