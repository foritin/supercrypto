"use client";

import { motion, type Variants } from "framer-motion";
import { Wallet, ShieldCheck, TrendingUp, Coins, ArrowRight, type LucideIcon } from "lucide-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Step {
  Icon: LucideIcon;
  step: number;
  titleKey: string;
  descKey: string;
  detailKey: string;
  accent: string;
}

const STEPS: Step[] = [
  {
    Icon: Wallet,
    step: 1,
    titleKey: "home.howItWorksEnhanced.step1.title",
    descKey: "home.howItWorksEnhanced.step1.description",
    detailKey: "home.howItWorksEnhanced.step1.detail",
    accent: "#3B82F6",
  },
  {
    Icon: ShieldCheck,
    step: 2,
    titleKey: "home.howItWorksEnhanced.step2.title",
    descKey: "home.howItWorksEnhanced.step2.description",
    detailKey: "home.howItWorksEnhanced.step2.detail",
    accent: "#D4AF37",
  },
  {
    Icon: Coins,
    step: 3,
    titleKey: "home.howItWorksEnhanced.step3.title",
    descKey: "home.howItWorksEnhanced.step3.description",
    detailKey: "home.howItWorksEnhanced.step3.detail",
    accent: "#10B981",
  },
  {
    Icon: TrendingUp,
    step: 4,
    titleKey: "home.howItWorksEnhanced.step4.title",
    descKey: "home.howItWorksEnhanced.step4.description",
    detailKey: "home.howItWorksEnhanced.step4.detail",
    accent: "#A855F7",
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

function StepCard({
  step,
  isLast,
}: {
  step: Step;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { Icon } = step;

  return (
    <motion.div variants={itemVariants} className="relative flex flex-col items-center text-center">
      {/* Connector line (desktop) */}
      {!isLast && (
        <div className="hidden lg:block absolute top-7 left-[calc(50%+32px)] w-[calc(100%-64px)] h-px bg-white/[0.06]" />
      )}

      {/* Icon container */}
      <div
        className={cn(
          "relative w-14 h-14 rounded-xl flex items-center justify-center mb-5",
          "bg-white/[0.03] border border-white/[0.08]",
          "transition-all duration-500 hover:scale-105"
        )}
        style={{
          color: step.accent,
          boxShadow: `0 0 20px -5px ${step.accent}30`,
        }}
      >
        {/* Step number badge */}
        <span
          className={cn(
            "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center",
            "text-[10px] font-bold",
            "bg-white/[0.08] border border-white/[0.12] text-white/60"
          )}
        >
          {step.step}
        </span>
        <Icon className="w-6 h-6" />
      </div>

      {/* Title */}
      <h4 className="font-display text-base font-semibold text-white mb-2">
        {t(step.titleKey)}
      </h4>

      {/* Description */}
      <p className="text-white/45 text-sm leading-relaxed mb-2 max-w-[220px]">
        {t(step.descKey)}
      </p>

      {/* Expandable detail */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          expanded ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <p className="text-white/35 text-xs leading-relaxed px-2">{t(step.detailKey)}</p>
      </div>

      {/* Click hint */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-1 text-[11px] text-white/25 hover:text-white/50 transition-colors"
      >
        {expanded ? "Show less" : t("home.howItWorksEnhanced.clickToExpand")}
      </button>
    </motion.div>
  );
}

export function HowItWorksV2({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn("relative", className)}>
      {/* Desktop: 4-column grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="hidden lg:grid lg:grid-cols-4 gap-6 items-start"
      >
        {STEPS.map((step, index) => (
          <StepCard key={step.step} step={step} isLast={index === STEPS.length - 1} />
        ))}
      </motion.div>

      {/* Mobile: vertical timeline */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="lg:hidden space-y-8"
      >
        {STEPS.map((step, index) => (
          <motion.div key={step.step} variants={itemVariants} className="relative flex gap-5">
            {/* Timeline */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 gap-1",
                  "bg-white/[0.03] border border-white/[0.08]"
                )}
                style={{ color: step.accent }}
              >
                <span className="text-xs font-bold text-white/40">{step.step}</span>
                <step.Icon className="w-5 h-5" />
              </div>
              {index < STEPS.length - 1 && (
                <div className="w-px flex-1 bg-white/[0.06] mt-3 min-h-[24px]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-2">
              <h4 className="font-display text-base font-semibold text-white mb-1">
                {t(step.titleKey)}
              </h4>
              <p className="text-white/45 text-sm leading-relaxed">{t(step.descKey)}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="mt-14 text-center"
      >
        <p className="text-white/40 text-sm mb-5">{t("home.howItWorksEnhanced.ctaText")}</p>
        <Button
          size="lg"
          className={cn(
            "bg-white/[0.05] hover:bg-white/[0.10] text-white font-medium px-8",
            "border border-white/[0.08] hover:border-white/[0.15]",
            "rounded-xl h-12 transition-all duration-300"
          )}
          onClick={() => (window.location.href = "/assets")}
        >
          {t("home.howItWorksEnhanced.ctaButton")}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
