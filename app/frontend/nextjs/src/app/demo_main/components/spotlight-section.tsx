"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { useRef, useState } from "react";

const ASSETS = [
  { id: "1", name: "US Treasury", apy: 5.2, raised: 78, total: 5_000_000, color: "#0066FF" },
  { id: "2", name: "Real Estate Fund", apy: 8.5, raised: 92, total: 12_000_000, color: "#D4AF37" },
  { id: "3", name: "DeFi Yield", apy: 12.4, raised: 65, total: 3_000_000, color: "#00C9A7" },
  { id: "4", name: "Green Bond", apy: 6.8, raised: 45, total: 8_000_000, color: "#10B981" },
];

export function SpotlightSection() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-[1100px] mx-auto">
        {/* Section header */}
        <motion.div
          initial={reduced ? {} : { y: 30 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16"
        >
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-medium">
            Live Opportunities
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mt-4 tracking-tight">
            Invest in What Matters
          </h2>
        </motion.div>

        {/* Asset list - editorial table style */}
        <div ref={containerRef} className="space-y-0 border-t border-white/[0.06]">
          {ASSETS.map((asset, i) => (
            <motion.div
              key={asset.id}
              initial={reduced ? {} : { y: 20 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => router.push(`/assets/${asset.id}`)}
              className="group relative flex items-center justify-between py-7 border-b border-white/[0.06] cursor-pointer transition-colors"
            >
              {/* Hover spotlight */}
              {hoveredIndex === i && (
                <motion.div
                  layoutId="spotlight"
                  className="absolute inset-0 -mx-6 rounded-xl"
                  style={{
                    background: `linear-gradient(90deg, ${asset.color}08 0%, transparent 60%)`,
                  }}
                  transition={{ duration: 0.3 }}
                />
              )}

              {/* Left: name + raised bar */}
              <div className="relative z-10 flex-1 min-w-0">
                <div className="flex items-baseline gap-4 mb-2">
                  <h3 className="text-lg md:text-xl font-semibold text-white group-hover:text-white transition-colors">
                    {asset.name}
                  </h3>
                  <span className="text-xs text-white/30 font-mono hidden md:inline">
                    {asset.raised}% funded
                  </span>
                </div>
                {/* Thin progress bar */}
                <div className="w-full max-w-[280px] h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${asset.raised}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: asset.color }}
                  />
                </div>
              </div>

              {/* Center: TVL */}
              <div className="relative z-10 hidden md:block text-right mr-12">
                <div className="text-xs text-white/25 uppercase tracking-wider mb-1">TVL</div>
                <div className="text-sm font-mono text-white/60">
                  ${(asset.total / 1_000_000).toFixed(1)}M
                </div>
              </div>

              {/* Right: APY + arrow */}
              <div className="relative z-10 flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs text-white/25 uppercase tracking-wider mb-1">APY</div>
                  <div
                    className="text-2xl md:text-3xl font-bold font-display tracking-tight"
                    style={{ color: asset.color }}
                  >
                    {asset.apy}%
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full border border-white/[0.08] flex items-center justify-center text-white/20 group-hover:text-white/60 group-hover:border-white/20 transition-all">
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View all */}
        <motion.div
          initial={reduced ? {} : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <button
            onClick={() => router.push("/assets")}
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors group"
          >
            View All Opportunities
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
