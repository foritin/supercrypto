"use client"

import * as SliderPrimitive from "@radix-ui/react-slider"
import * as React from "react"

import { cn } from "@/lib/utils"

export interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  /** 自定义轨道颜色变体 */
  variant?: 'default' | 'gold' | 'primary'
  /** 是否显示发光效果 - Requirements: 4.5 */
  glow?: boolean
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, variant = 'default', glow = true, ...props }, ref) => {
  const trackColors = {
    default: 'bg-primary',
    gold: 'bg-gradient-to-r from-gold to-[#FFA500]',
    primary: 'bg-gradient-to-r from-primary to-[#00A08C]',
  }

  const thumbColors = {
    default: 'border-primary/50 bg-primary shadow-[0_2px_8px_rgba(0,212,170,0.5)]',
    gold: 'border-gold bg-gold shadow-[0_2px_8px_rgba(255,215,0,0.5)]',
    primary: 'border-primary bg-primary shadow-[0_2px_8px_rgba(0,212,170,0.5)]',
  }

  const glowColors = {
    default: 'shadow-[0_0_10px_rgba(0,212,170,0.4),0_0_20px_rgba(0,212,170,0.2)]',
    gold: 'shadow-[0_0_10px_rgba(255,215,0,0.4),0_0_20px_rgba(255,215,0,0.2)]',
    primary: 'shadow-[0_0_10px_rgba(0,212,170,0.4),0_0_20px_rgba(0,212,170,0.2)]',
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
        <SliderPrimitive.Range 
          className={cn(
            "absolute h-full",
            trackColors[variant],
            glow && glowColors[variant]
          )} 
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb 
        className={cn(
          "block h-5 w-5 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          thumbColors[variant],
          glow && "hover:scale-110 transition-transform"
        )} 
      />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
