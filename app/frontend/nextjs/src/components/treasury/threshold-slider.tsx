'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertCircle } from 'lucide-react';

import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface ThresholdSliderProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  min?: number;
  disabled?: boolean;
}

/**
 * 阈值滑块组件
 * 用于选择多签阈值（如 2/3）
 */
export function ThresholdSlider({
  value,
  max,
  onChange,
  min = 1,
  disabled = false,
}: ThresholdSliderProps) {
  const visualMin = 0;
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = (values: number[]) => {
    const rawValue = values[0] ?? min;
    const clampedValue = Math.max(min, Math.min(max, rawValue));
    setInternalValue(clampedValue);
    onChange(clampedValue);
  };

  // Calculate security level
  const getSecurityLevel = (threshold: number, total: number) => {
    const ratio = threshold / total;
    if (ratio >= 0.67) return { level: 'High', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' };
    if (ratio >= 0.5) return { level: 'Medium', color: 'text-amber-400', bgColor: 'bg-amber-500/10' };
    return { level: 'Low', color: 'text-rose-400', bgColor: 'bg-rose-500/10' };
  };

  const security = getSecurityLevel(internalValue, max);
  const isValid = internalValue <= max && internalValue >= min;

  return (
    <div className="space-y-4">
      {/* Threshold Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-white/40" />
          <span className="text-sm text-white/60">Required Signatures</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-2xl font-bold tabular-nums",
            isValid ? "text-white" : "text-rose-400"
          )}>
            {internalValue}
          </span>
          <span className="text-white/40">/</span>
          <span className="text-lg text-white/60 tabular-nums">{max}</span>
        </div>
      </div>

      {/* Slider */}
      <div className="py-2">
        <Slider
          value={[internalValue]}
          min={visualMin}
          max={max}
          step={1}
          onValueChange={handleChange}
          disabled={disabled || max <= visualMin}
          className={cn(
            "w-full",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        
        {/* Scale Labels */}
        <div className="flex justify-between mt-2 text-xs text-white/40">
          <span>{visualMin}</span>
          {max > 3 && (
            <>
              <span>{Math.ceil(max * 0.25)}</span>
              <span>{Math.ceil(max * 0.5)}</span>
              <span>{Math.ceil(max * 0.75)}</span>
            </>
          )}
          <span>{max}</span>
        </div>
      </div>

      {/* Security Level Badge */}
      <div className="flex items-center justify-between">
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
          security.bgColor,
          security.color
        )}>
          <Shield className="w-3 h-3" />
          {security.level} Security
        </div>
        
        {!isValid && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400">
            <AlertCircle className="w-3.5 h-3.5" />
            Threshold must be between {min} and {max}
          </div>
        )}
      </div>

      {/* Help Text */}
      <p className="text-xs text-white/40 leading-relaxed">
        At least {internalValue} of {max} signers must approve each redemption request. 
        Higher thresholds provide better security but may slow down processing.
      </p>
    </div>
  );
}
