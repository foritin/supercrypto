"use client";

import { motion } from "framer-motion";
import { Rocket, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function CTASectionV2() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={cn(
        "relative py-24 md:py-32 px-6 overflow-hidden",
        "flex items-center justify-center"
      )}
    >
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,102,255,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Top border line */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
        }}
      />

      <div className="relative z-10 max-w-[700px] mx-auto text-center">
        <h2 className="font-display text-[clamp(28px,4vw,42px)] font-semibold text-white mb-5 leading-tight">
          {t("home.finalCta.title")}
        </h2>
        <p className="text-lg text-white/45 mb-10 leading-[1.7] max-w-[520px] mx-auto">
          {t("home.finalCta.description")}
        </p>

        <button
          onClick={() => router.push("/assets")}
          className={cn(
            "group inline-flex items-center gap-3",
            "h-[56px] px-10 rounded-xl",
            "bg-white/[0.04] border border-white/[0.08]",
            "text-white font-semibold text-base",
            "transition-all duration-300",
            "hover:bg-white/[0.08] hover:border-white/[0.15] hover:-translate-y-0.5",
            "hover:shadow-[0_0_40px_rgba(0,102,255,0.15)]"
          )}
        >
          <Rocket className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
          <span>{t("home.finalCta.button")}</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </motion.section>
  );
}
