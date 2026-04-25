"use client";

import { motion } from "framer-motion";
import { Shield, DollarSign, Globe, Lock, Fingerprint, Server, ArrowUpRight } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface FeatureItem {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  accent: string;
}

const FEATURES: FeatureItem[] = [
  {
    id: "security",
    titleKey: "home.features.security.title",
    descriptionKey: "home.features.security.description",
    icon: <Shield className="w-8 h-8" />,
    accent: "#3B82F6",
  },
  {
    id: "returns",
    titleKey: "home.features.returns.title",
    descriptionKey: "home.features.returns.description",
    icon: <DollarSign className="w-8 h-8" />,
    accent: "#D4AF37",
  },
  {
    id: "global",
    titleKey: "home.features.global.title",
    descriptionKey: "home.features.global.description",
    icon: <Globe className="w-8 h-8" />,
    accent: "#10B981",
  },
];

function FeatureBlock({
  feature,
  index,
  t,
}: {
  feature: FeatureItem;
  index: number;
  t: (key: string) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay: index * 0.15, ease: "easeOut" }}
      className="relative group"
    >
      {/* 左侧竖线装饰 */}
      <div
        className="absolute left-0 top-0 w-[2px] h-full rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(180deg, ${feature.accent} 0%, transparent 80%)`,
        }}
      />

      <div className="pl-8 md:pl-10">
        {/* 大图标 */}
        <div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
            "bg-white/[0.03] border border-white/[0.08]",
            "transition-all duration-500 group-hover:scale-110 group-hover:border-white/[0.15]"
          )}
          style={{
            color: feature.accent,
            boxShadow: `0 0 30px -5px ${feature.accent}20`,
          }}
        >
          {feature.icon}
        </div>

        {/* 标题 */}
        <h3 className="font-display text-2xl md:text-[28px] font-semibold text-white mb-4 tracking-tight">
          {t(feature.titleKey)}
        </h3>

        {/* 描述 */}
        <p className="text-white/55 text-base md:text-lg leading-relaxed max-w-[340px]">
          {t(feature.descriptionKey)}
        </p>

        {/* Learn more 链接 */}
        <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-white/30 group-hover:text-white/60 transition-colors duration-300 cursor-pointer">
          <span>Learn more</span>
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>

      {/* 分隔线（除最后一个） */}
      {index < FEATURES.length - 1 && (
        <div className="hidden md:block absolute right-0 top-[10%] w-px h-[80%] bg-white/[0.06]" />
      )}
    </motion.div>
  );
}

function AuditBar() {
  const auditors = [
    { name: "CertiK", icon: <Lock className="w-4 h-4" /> },
    { name: "Hacken", icon: <Fingerprint className="w-4 h-4" /> },
    { name: "Trail of Bits", icon: <Server className="w-4 h-4" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "mt-20 pt-8 border-t border-white/[0.06]",
        "flex flex-col md:flex-row items-center justify-between gap-4"
      )}
    >
      <div className="flex items-center gap-6">
        {auditors.map((a) => (
          <div
            key={a.name}
            className={cn(
              "flex items-center gap-2 text-sm text-white/35",
              "hover:text-white/60 transition-colors"
            )}
          >
            {a.icon}
            <span className="font-medium">{a.name}</span>
          </div>
        ))}
      </div>
      <span className="text-xs text-white/25 tracking-wide">
        Smart contracts audited by leading security firms
      </span>
    </motion.div>
  );
}

export function FeaturesV3({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn("relative", className)}>
      {/* Features Grid — 三列无卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
        {FEATURES.map((feature, index) => (
          <FeatureBlock key={feature.id} feature={feature} index={index} t={t} />
        ))}
      </div>

      {/* Audit Bar */}
      <AuditBar />
    </div>
  );
}
