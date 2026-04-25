"use client";

import { Check, Sparkles, Shield, Clock } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { YieldCalculatorV2 } from "./yield-calculator-v2";

const CHECKPOINTS = [
  { icon: <Shield className="w-4 h-4" />, key: "noHiddenFees" },
  { icon: <Clock className="w-4 h-4" />, key: "instantWithdrawal" },
  { icon: <Sparkles className="w-4 h-4" />, key: "dailyCompounding" },
  { icon: <Check className="w-4 h-4" />, key: "fullyTransparent" },
];

export function CalculatorSectionV2({
  title,
  subtitle,
  className,
}: {
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const displayTitle = title || t("home.calculator.title");
  const displaySubtitle = subtitle || t("home.calculator.subtitle");

  return (
    <div
      className={cn(
        "grid gap-12 items-center",
        "lg:grid-cols-2 lg:gap-16",
        "grid-cols-1",
        className
      )}
    >
      {/* Left text */}
      <div className="text-left lg:pr-8">
        <span className="inline-flex items-center gap-2 text-[#D4AF37] text-sm font-semibold tracking-[2px] uppercase mb-6">
          <Sparkles className="w-4 h-4" />
          {t("home.calculator.badge")}
        </span>

        <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold text-white mb-6 leading-tight">
          {displayTitle}
        </h2>

        <p className="text-lg text-white/50 mb-10 leading-relaxed max-w-[500px]">
          {displaySubtitle}
        </p>

        {/* Checkpoints */}
        <div className="grid grid-cols-2 gap-4">
          {CHECKPOINTS.map((checkpoint, index) => (
            <div key={index} className="flex items-center gap-3 text-white/70">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  "bg-white/[0.04] border border-white/[0.08]",
                  "text-[#D4AF37]"
                )}
              >
                {checkpoint.icon}
              </div>
              <span className="text-sm font-medium">
                {t(`home.calculator.points.${checkpoint.key}`)}
              </span>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-10 pt-6 border-t border-white/[0.06]">
          <p className="text-white/35 text-sm">{t("home.calculator.disclaimer")}</p>
        </div>
      </div>

      {/* Right calculator */}
      <div className="relative">
        <YieldCalculatorV2 />
      </div>
    </div>
  );
}
