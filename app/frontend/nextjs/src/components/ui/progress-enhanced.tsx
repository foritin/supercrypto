"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

interface ProgressEnhancedProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** 进度值 (0-100) */
  value?: number
  /** 进度条颜色 */
  indicatorColor?: string
  /** 是否显示进度文本 */
  showInfo?: boolean
  /** 自定义格式化进度文本 */
  format?: (percent: number) => React.ReactNode
  /** 是否启用动画效果 */
  animated?: boolean
  /** 脉冲效果（当有新的认购时） */
  pulse?: boolean
}

const ProgressEnhanced = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressEnhancedProps
>(({ 
  className, 
  value = 0, 
  indicatorColor, 
  showInfo = false, 
  format,
  animated = true,
  pulse = false,
  ...props 
}, ref) => {
  // 计算进度状态
  const isNearComplete = value >= 80 && value < 100
  const isComplete = value >= 100
  
  // 动态颜色
  const getIndicatorColor = () => {
    if (isComplete) return "#F59E0B" // 金色/橙色 - 售罄
    if (isNearComplete) return "#F97316" // 橙色 - 即将售罄
    return indicatorColor || "#00D4AA" // 默认青绿色
  }

  const color = getIndicatorColor()

  return (
    <div className="flex items-center gap-2 w-full">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative h-3 w-full overflow-hidden rounded-full bg-white/5",
          className
        )}
        {...props}
      >
        {/* 背景轨道 */}
        <div className="absolute inset-0 rounded-full bg-white/5" />
        
        {/* 进度指示器 */}
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 rounded-full relative",
            animated && "transition-all duration-500 ease-out"
          )}
          style={{ 
            transform: `translateX(-${100 - (value || 0)}%)`,
            backgroundColor: color,
            boxShadow: isComplete 
              ? "0 0 20px rgba(245, 158, 11, 0.5)" 
              : isNearComplete 
                ? "0 0 15px rgba(249, 115, 22, 0.4)"
                : "0 0 10px rgba(0, 212, 170, 0.3)"
          }}
        >
          {/* 流光扫过动画 - 当进度 > 80% */}
          {isNearComplete && !isComplete && (
            <div 
              className="absolute inset-0 overflow-hidden rounded-full"
              style={{ transform: `translateX(${(100 - value)}%)` }}
            >
              <div 
                className="absolute inset-0 w-full h-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                  animation: "shimmer 1.5s infinite"
                }}
              />
            </div>
          )}
          
          {/* 金色流光 - 售罄状态 */}
          {isComplete && (
            <div 
              className="absolute inset-0 overflow-hidden rounded-full"
              style={{ transform: `translateX(${(100 - value)}%)` }}
            >
              <div 
                className="absolute inset-0 w-full h-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
                  animation: "shimmer 2s infinite"
                }}
              />
            </div>
          )}
          
          {/* 脉冲光晕效果 */}
          {pulse && (
            <>
              <div 
                className="absolute inset-0 rounded-full animate-ping opacity-30"
                style={{ backgroundColor: color }}
              />
              <div 
                className="absolute inset-[-4px] rounded-full animate-pulse opacity-20 blur-sm"
                style={{ backgroundColor: color }}
              />
            </>
          )}
        </ProgressPrimitive.Indicator>
        
        {/* 顶部高光线 */}
        <div 
          className="absolute top-0 left-0 right-0 h-px rounded-full opacity-50"
          style={{ 
            background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
            transform: `translateX(-${100 - (value || 0)}%)`
          }}
        />
      </ProgressPrimitive.Root>
      
      {showInfo && (
        <span className="text-xs text-muted-foreground min-w-[40px] text-right">
          {format ? format(value || 0) : `${Math.round(value || 0)}%`}
        </span>
      )}
      
      {/* 注入 shimmer 动画 */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )
})

ProgressEnhanced.displayName = "ProgressEnhanced"

export { ProgressEnhanced }
