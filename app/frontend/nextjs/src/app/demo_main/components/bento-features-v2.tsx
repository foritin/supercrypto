"use client";

import { motion, type Variants } from "framer-motion";
import { Shield, DollarSign, Globe, ArrowUpRight, Lock, Fingerprint, Server } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface FeatureItem {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  accent: string;
  colSpan?: "large" | "small";
}

const FEATURES: FeatureItem[] = [
  {
    id: "security",
    titleKey: "home.features.security.title",
    descriptionKey: "home.features.security.description",
    icon: <Shield className="w-6 h-6" />,
    accent: "#60A5FA",
    colSpan: "large",
  },
  {
    id: "returns",
    titleKey: "home.features.returns.title",
    descriptionKey: "home.features.returns.description",
    icon: <DollarSign className="w-6 h-6" />,
    accent: "#FBBF24",
    colSpan: "small",
  },
  {
    id: "global",
    titleKey: "home.features.global.title",
    descriptionKey: "home.features.global.description",
    icon: <Globe className="w-6 h-6" />,
    accent: "#34D399",
    colSpan: "small",
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

function FeatureCard({
  feature,
  className,
  children,
}: {
  feature: FeatureItem;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      variants={cardVariants}
      className={cn(
        "group relative rounded-2xl overflow-hidden",
        // 顶部微亮渐变，制造体积感
        "bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-white/[0.01]",
        "backdrop-blur-xl",
        // 双层边框：外层主边框 + 顶部高亮 inset 线
        "border border-white/[0.10]",
        // 底部深色投影，让卡片"浮"起来
        "shadow-[0_8px_32px_rgba(0,0,0,0.45)]",
        "transition-all duration-500 ease-out",
        "hover:border-white/[0.18] hover:shadow-[0_12px_40px_rgba(0,0,0,0.55)]",
        "hover:-translate-y-1",
        className
      )}
    >
      {/* 顶部 inset 高光边框 */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Hover 时顶部出现主题色光晕 */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          background: `linear-gradient(90deg, transparent, ${feature.accent}50, transparent)`,
        }}
      />

      <div className="relative z-10 p-7 md:p-8 flex flex-col h-full">
        {/* Icon */}
        <div
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center mb-6",
            "bg-white/[0.06] border border-white/[0.12]",
            "transition-all duration-300 group-hover:scale-110",
            "shadow-[0_0_24px_-4px_var(--glow)]"
          )}
          style={{
            color: feature.accent,
            boxShadow: `0 0 24px -4px ${feature.accent}35, 0 0 48px -8px ${feature.accent}15`,
          }}
        >
          {feature.icon}
        </div>

        {/* Title */}
        <h3 className="font-display text-xl md:text-2xl font-semibold text-white mb-3 tracking-tight">
          {feature.titleKey}
        </h3>

        {/* Description — 提高对比度 */}
        <p className="text-white/65 text-[15px] leading-relaxed mb-6 flex-1">
          {feature.descriptionKey}
        </p>

        {children}
      </div>
    </motion.div>
  );
}

function AuditRow() {
  const auditors = [
    { name: "CertiK", icon: <Lock className="w-3.5 h-3.5" /> },
    { name: "Hacken", icon: <Fingerprint className="w-3.5 h-3.5" /> },
    { name: "Trail of Bits", icon: <Server className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="mt-auto pt-5 border-t border-white/[0.08]">
      <div className="flex flex-wrap items-center gap-3">
        {auditors.map((a) => (
          <div
            key={a.name}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full",
              "bg-white/[0.04] border border-white/[0.08]",
              "text-xs text-white/50 font-medium",
              "hover:bg-white/[0.08] hover:text-white/70 hover:border-white/[0.14] transition-all"
            )}
          >
            {a.icon}
            <span>{a.name}</span>
          </div>
        ))}
        <span className="text-xs text-white/30 ml-auto hidden sm:inline">
          Audited by leading security firms
        </span>
      </div>
    </div>
  );
}

export function BentoFeaturesV2({ className }: { className?: string }) {
  const { t } = useTranslation();

  const large = FEATURES.find((f) => f.colSpan === "large")!;
  const smalls = FEATURES.filter((f) => f.colSpan === "small");

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className={cn(
        "grid gap-5",
        "md:grid-cols-[2fr_1fr] md:grid-rows-2",
        "grid-cols-1",
        className
      )}
    >
      {/* Large card */}
      <FeatureCard
        feature={{ ...large, titleKey: t(large.titleKey), descriptionKey: t(large.descriptionKey) }}
        className="md:row-span-2"
      >
        <AuditRow />
      </FeatureCard>

      {/* Small cards */}
      {smalls.map((f) => (
        <FeatureCard
          key={f.id}
          feature={{ ...f, titleKey: t(f.titleKey), descriptionKey: t(f.descriptionKey) }}
        >
          <div className="mt-auto pt-2">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-medium",
                "text-white/40 group-hover:text-white/70 transition-colors duration-300"
              )}
            >
              <span>Learn more</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </FeatureCard>
      ))}
    </motion.div>
  );
}
