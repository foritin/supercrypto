"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { type SelectSingleEventHandler } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
  /** The selected date */
  value?: Date
  /** Callback when date changes */
  onChange?: (date: Date | undefined) => void
  /** Placeholder text when no date is selected */
  placeholder?: string
  /** Date format string (date-fns format) */
  dateFormat?: string
  /** Whether the picker is disabled */
  disabled?: boolean
  /** Additional class names for the trigger button */
  className?: string
  /** Minimum selectable date */
  fromDate?: Date
  /** Maximum selectable date */
  toDate?: Date
  /** ID for form integration */
  id?: string
  /** Name for form integration */
  name?: string
}

/**
 * DatePicker component that wraps react-day-picker with Popover for dropdown behavior.
 * Supports single date selection with date-fns formatting.
 * Integrates with react-hook-form via Controller.
 * 
 * @example
 * // Basic usage
 * <DatePicker value={date} onChange={setDate} />
 * 
 * @example
 * // With react-hook-form
 * <FormField
 *   control={form.control}
 *   name="date"
 *   render={({ field }) => (
 *     <FormItem>
 *       <FormLabel>Date</FormLabel>
 *       <FormControl>
 *         <DatePicker
 *           value={field.value}
 *           onChange={field.onChange}
 *         />
 *       </FormControl>
 *       <FormMessage />
 *     </FormItem>
 *   )}
 * />
 * 
 * **Validates: Requirements 10.1, 10.2, 10.3**
 */
const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = "Pick a date",
      dateFormat = "PPP",
      disabled = false,
      className,
      fromDate,
      toDate,
      id,
      name,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)

    const handleSelect: SelectSingleEventHandler = (date) => {
      onChange?.(date)
      setOpen(false)
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            name={name}
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              // Web3 dark theme styling
              "bg-[var(--bg-elevated)] border-[var(--border-color-light)]",
              "hover:bg-[var(--bg-card-hover)] hover:border-[var(--color-primary)]",
              "focus:border-[rgba(0,212,170,0.8)] focus:ring-2 focus:ring-[rgba(0,212,170,0.2)]",
              "transition-all duration-300",
              !value && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-[var(--text-tertiary)]" />
            {value ? (
              <span className="text-[var(--text-primary)]">
                {format(value, dateFormat)}
              </span>
            ) : (
              <span className="text-[var(--text-muted)]">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "w-auto p-0",
            // Web3 dark theme styling for popover
            "bg-[var(--bg-elevated)] border-[var(--border-color)]",
            "shadow-[var(--shadow-lg)]"
          )}
          align="start"
        >
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelect}
            disabled={disabled}
            fromDate={fromDate}
            toDate={toDate}
            initialFocus
            className={cn(
              // Web3 dark theme styling for calendar
              "[&_.rdp-day_button]:text-[var(--text-primary)]",
              "[&_.rdp-day_button:hover]:bg-primary/15",
              "[&_.rdp-day_button:hover]:text-[var(--color-primary)]",
              "[&_[data-selected=true]_.rdp-day_button]:bg-[var(--color-primary)]",
              "[&_[data-selected=true]_.rdp-day_button]:text-[var(--bg-dark)]",
              "[&_.rdp-weekday]:text-[var(--text-tertiary)]",
              "[&_.rdp-caption_label]:text-[var(--text-primary)]",
              "[&_.rdp-nav_button]:text-[var(--text-secondary)]",
              "[&_.rdp-nav_button:hover]:bg-primary/15"
            )}
          />
        </PopoverContent>
      </Popover>
    )
  }
)
DatePicker.displayName = "DatePicker"

export { DatePicker }
