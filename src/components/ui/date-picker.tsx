"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// Helper functions moved outside component for better performance
function formatDate(date: Date | undefined): string {
  if (!date) return ""
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function isValidDate(date: Date): boolean {
  return !isNaN(date.getTime())
}

function parseDate(input: string): Date | undefined {
  const date = new Date(input)
  return isValidDate(date) ? date : undefined
}

interface DatePickerInputProps {
  /** Initial date value */
  defaultValue?: Date
  /** Called when date changes */
  onDateChange?: (date: Date | undefined) => void
  /** Placeholder text for the input */
  placeholder?: string
  /** Label for the field */
  label?: string

  /** Input ID */
  id?: string
  /** Whether the field is disabled */
  disabled?: boolean
  /** Whether the field is required */
  required?: boolean
  /** CSS class name for the field */
  className?: string
  /** Minimum selectable date */
  minDate?: Date
  /** Maximum selectable date */
  maxDate?: Date
}

export function DatePicker({
  defaultValue = new Date(),
  onDateChange,
  placeholder = "June 01, 2025",
  label = "Subscription Date",
  id = "date-picker-input",
  disabled = false,
  required = false,
  className,
  minDate,
  maxDate,
}: DatePickerInputProps) {
  // State management
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(defaultValue)
  const [month, setMonth] = React.useState<Date | undefined>(defaultValue)
  const [inputValue, setInputValue] = React.useState(formatDate(defaultValue))

  // Handle date selection
  const handleDateSelect = React.useCallback(
    (selectedDate: Date | undefined) => {
      setDate(selectedDate)
      setInputValue(formatDate(selectedDate))
      setOpen(false)
      onDateChange?.(selectedDate)
    },
    [onDateChange]
  )

  // Handle input change
  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)

      const parsedDate = parseDate(newValue)
      if (parsedDate) {
        setDate(parsedDate)
        setMonth(parsedDate)
        onDateChange?.(parsedDate)
      }
    },
    [onDateChange]
  )

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown" && !disabled) {
        e.preventDefault()
        setOpen(true)
      }
    },
    [disabled]
  )

  // Memoize calendar props to prevent unnecessary re-renders
  const calendarProps = React.useMemo(
    () => ({
      mode: "single" as const,
      selected: date,
      month,
      onMonthChange: setMonth,
      onSelect: handleDateSelect,
      disabled: (date: Date) => {
        if (minDate && date < minDate) return true
        if (maxDate && date > maxDate) return true
        return false
      },
    }),
    [date, month, handleDateSelect, minDate, maxDate]
  )

  return (
    <InputGroup
      onClick={() => setOpen(true)}
      className={cn(className, "cursor-pointer")}
    >
      <InputGroupInput
        id={id}
        value={inputValue}
        placeholder={placeholder}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        required={required}
        aria-label={label}
        readOnly
      />
      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <InputGroupButton
              variant="ghost"
              size="icon-xs"
              aria-label="Select date"
              disabled={disabled}
              type="button"
            >
              <CalendarIcon />
              <span className="sr-only">Select date</span>
            </InputGroupButton>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
            side="bottom"
          >
            <Calendar {...calendarProps} />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  )
}
