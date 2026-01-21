"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  /** 自定义轨道颜色变体 */
  variant?: 'default' | 'gold' | 'primary'
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, variant = 'default', ...props }, ref) => {
  const trackColors = {
    default: 'bg-primary',
    gold: 'bg-gradient-to-r from-[#FFD700] to-[#FFA500]',
    primary: 'bg-gradient-to-r from-[#00D4AA] to-[#00A08C]',
  }

  const thumbColors = {
    default: 'border-primary/50 bg-primary shadow-[0_2px_8px_rgba(0,212,170,0.5)]',
    gold: 'border-[#FFD700] bg-[#FFD700] shadow-[0_2px_8px_rgba(255,215,0,0.5)]',
    primary: 'border-[#00D4AA] bg-[#00D4AA] shadow-[0_2px_8px_rgba(0,212,170,0.5)]',
  }

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/10">
        <SliderPrimitive.Range className={cn("absolute h-full", trackColors[variant])} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb 
        className={cn(
          "block h-5 w-5 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          thumbColors[variant]
        )} 
      />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
