"use client";

import { Trophy, DollarSign, TrendingUp } from "lucide-react";
import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export function YieldCalculatorV2({ className = "" }: { className?: string }) {
  const [principal, setPrincipal] = useState(10000);
  const [apy, setApy] = useState(15);
  const [duration, setDuration] = useState(365);

  const result = useMemo(() => {
    const dailyRate = apy / 100 / 365;
    const futureValue = principal * Math.pow(1 + dailyRate, duration);
    const profit = futureValue - principal;
    return {
      futureValue,
      profit,
      roi: ((profit / principal) * 100).toFixed(2),
    };
  }, [principal, apy, duration]);

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "bg-white/[0.02] backdrop-blur-xl",
        "border border-white/[0.06]",
        className
      )}
      style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset" }}
    >
      {/* Subtle top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[1px]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)",
        }}
      />

      <div className="relative z-10 p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b border-white/[0.06]">
          <div
            className={cn(
              "inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4",
              "bg-white/[0.04] border border-white/[0.08]",
              "text-[#D4AF37]"
            )}
          >
            <Trophy className="w-5 h-5" />
          </div>
          <h3 className="font-display text-xl font-semibold text-white mb-1">
            Yield Calculator
          </h3>
          <p className="text-white/40 text-sm">
            Calculate your potential earnings
          </p>
        </div>

        {/* Investment Amount */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-white/30" />
            <span className="text-white/70 text-sm font-medium">Investment Amount</span>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg font-medium">
              $
            </span>
            <Input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className={cn(
                "bg-white/[0.03] border-white/[0.08] text-white",
                "text-lg h-12 rounded-xl font-medium pl-8",
                "focus-visible:ring-[#D4AF37]/30 focus-visible:border-[#D4AF37]/40"
              )}
              min={0}
              step={100}
            />
          </div>
        </div>

        {/* APY Slider */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-white/30" />
              <span className="text-white/70 text-sm font-medium">Expected APY</span>
            </div>
            <span className="text-[#D4AF37] text-lg font-semibold bg-[#D4AF37]/8 px-3 py-0.5 rounded-lg border border-[#D4AF37]/15">
              {apy}%
            </span>
          </div>
          <Slider
            min={1}
            max={50}
            step={1}
            value={[apy]}
            onValueChange={(v) => v[0] !== undefined && setApy(v[0])}
            className="py-1"
          />
        </div>

        {/* Duration Slider */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-white/70 text-sm font-medium">Duration (Days)</span>
            <span className="text-white/70 text-lg font-semibold bg-white/[0.04] px-3 py-0.5 rounded-lg border border-white/[0.08]">
              {duration} days
            </span>
          </div>
          <Slider
            min={30}
            max={365}
            step={1}
            value={[duration]}
            onValueChange={(v) => v[0] !== undefined && setDuration(v[0])}
            className="py-1"
          />
          <div className="flex justify-between mt-2 px-1">
            {[30, 90, 180, 365].map((mark) => (
              <span key={mark} className="text-white/25 text-[11px]">{mark}</span>
            ))}
          </div>
        </div>

        {/* Results */}
        <div
          className={cn(
            "rounded-xl p-6 border border-white/[0.06]",
            "bg-white/[0.02]"
          )}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="text-center">
              <span className="text-white/35 text-[11px] block mb-1 uppercase tracking-wider">
                Total Value
              </span>
              <div className="text-[28px] md:text-[32px] font-bold text-white/90 font-mono tracking-tight">
                ${result.futureValue.toFixed(2)}
              </div>
            </div>
            <div className="text-center">
              <span className="text-white/35 text-[11px] block mb-1 uppercase tracking-wider">
                Profit
              </span>
              <div className="text-[28px] md:text-[32px] font-bold text-[#D4AF37] font-mono tracking-tight">
                ${result.profit.toFixed(2)}
              </div>
            </div>
            <div className="col-span-1 sm:col-span-2 text-center pt-4 border-t border-white/[0.06]">
              <span className="text-white/40 text-sm">
                Return on Investment:{" "}
                <span className="text-[#D4AF37] text-xl font-bold font-mono">
                  {result.roi}%
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
