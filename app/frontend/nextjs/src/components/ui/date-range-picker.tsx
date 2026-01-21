"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { type DateRange, type SelectRangeEventHandler } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DateRangePickerProps {
  /** The selected date range */
  value?: DateRange
  /** Callback when date range changes */
  onChange?: (range: DateRange | undefined) => void
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
  /** Number of months to display */
  numberOfMonths?: number
  /** ID for form integration */
  id?: string
  /** Name for form integration */
  name?: string
}

/**
 * DateRangePicker component that wraps react-day-picker with Popover for dropdown behavior.
 * Supports date range selection with date-fns formatting.
 * Integrates with react-hook-form via Controller.
 * 
 * @example
 * // Basic usage
 * <DateRangePicker value={dateRange} onChange={setDateRange} />
 * 
 * @example
 * // With react-hook-form
 * <FormField
 *   control={form.control}
 *   name="dateRange"
 *   render={({ field }) => (
 *     <FormItem>
 *       <FormLabel>Date Range</FormLabel>
 *       <FormControl>
 *         <DateRangePicker
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
const DateRangePicker = React.forwardRef<HTMLButtonElement, DateRangePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = "Pick a date range",
      dateFormat = "PPP",
      disabled = false,
      className,
      fromDate,
      toDate,
      numberOfMonths = 2,
      id,
      name,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)

    const handleSelect: SelectRangeEventHandler = (range) => {
      onChange?.(range)
      // Close popover when both dates are selected
      if (range?.from && range?.to) {
        setOpen(false)
      }
    }

    const formatDateRange = (range: DateRange | undefined): string => {
      if (!range) return ""
      
      if (range.from && range.to) {
        return `${format(range.from, dateFormat)} - ${format(range.to, dateFormat)}`
      }
      
      if (range.from) {
        return `${format(range.from, dateFormat)} - ...`
      }
      
      return ""
    }

    const displayValue = formatDateRange(value)

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
              !value?.from && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-[var(--text-tertiary)]" />
            {displayValue ? (
              <span className="text-[var(--text-primary)]">{displayValue}</span>
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
            mode="range"
            selected={value}
            onSelect={handleSelect}
            disabled={disabled}
            fromDate={fromDate}
            toDate={toDate}
            numberOfMonths={numberOfMonths}
            initialFocus
            className={cn(
              // Web3 dark theme styling for calendar
              "[&_.rdp-day_button]:text-[var(--text-primary)]",
              "[&_.rdp-day_button:hover]:bg-[rgba(0,212,170,0.15)]",
              "[&_.rdp-day_button:hover]:text-[var(--color-primary)]",
              "[&_[data-selected=true]_.rdp-day_button]:bg-[var(--color-primary)]",
              "[&_[data-selected=true]_.rdp-day_button]:text-[var(--bg-dark)]",
              "[&_[data-range-middle=true]_.rdp-day_button]:bg-[rgba(0,212,170,0.15)]",
              "[&_[data-range-middle=true]_.rdp-day_button]:text-[var(--color-primary)]",
              "[&_.rdp-weekday]:text-[var(--text-tertiary)]",
              "[&_.rdp-caption_label]:text-[var(--text-primary)]",
              "[&_.rdp-nav_button]:text-[var(--text-secondary)]",
              "[&_.rdp-nav_button:hover]:bg-[rgba(0,212,170,0.15)]"
            )}
          />
        </PopoverContent>
      </Popover>
    )
  }
)
DateRangePicker.displayName = "DateRangePicker"

export { DateRangePicker }
export type { DateRange }
