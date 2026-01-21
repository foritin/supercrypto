"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** 进度值 (0-100) */
  value?: number
  /** 进度条颜色 */
  indicatorColor?: string
  /** 是否显示进度文本 */
  showInfo?: boolean
  /** 自定义格式化进度文本 */
  format?: (percent: number) => React.ReactNode
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value = 0, indicatorColor, showInfo = false, format, ...props }, ref) => (
  <div className="flex items-center gap-2 w-full">
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-white/10",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 transition-all duration-300 ease-in-out"
        style={{ 
          transform: `translateX(-${100 - (value || 0)}%)`,
          backgroundColor: indicatorColor || 'hsl(var(--primary))'
        }}
      />
    </ProgressPrimitive.Root>
    {showInfo && (
      <span className="text-xs text-muted-foreground min-w-[40px] text-right">
        {format ? format(value || 0) : `${Math.round(value || 0)}%`}
      </span>
    )}
  </div>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
