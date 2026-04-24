"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Shield, Globe, Lock, Zap, BarChart3, Layers } from "lucide-react";
import { useState } from "react";

const FEATURES = [
  {
    id: "security",
    title: "Institutional Security",
    desc: "Multi-sig treasury, audited contracts, regulated custody.",
    icon: Shield,
    num: "01",
  },
  {
    id: "global",
    title: "Borderless Access",
    desc: "Invest from anywhere. No minimums. Instant settlement.",
    icon: Globe,
    num: "02",
  },
  {
    id: "transparent",
    title: "On-Chain Verifiable",
    desc: "Every asset backing and transaction visible on-chain.",
    icon: Lock,
    num: "03",
  },
  {
    id: "yield",
    title: "Sustainable Yield",
    desc: "Real cash flows from real assets. Not speculation.",
    icon: Zap,
    num: "04",
  },
  {
    id: "liquidity",
    title: "Deep Liquidity",
    desc: "Secondary markets and instant redemption mechanisms.",
    icon: BarChart3,
    num: "05",
  },
  {
    id: "diversity",
    title: "Asset Diversity",
    desc: "Real estate, bonds, commodities — all in one portfolio.",
    icon: Layers,
    num: "06",
  },
];

export function FeaturesGrid() {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-[1100px] mx-auto">
        <motion.div
          initial={reduced ? {} : { y: 30 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16"
        >
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-medium">
            Why SuperCrypto
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mt-4 tracking-tight max-w-[500px]">
            Built Different
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-white/[0.04] rounded-2xl overflow-hidden">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const isHovered = hovered === f.id;
            return (
              <motion.div
                key={f.id}
                initial={reduced ? {} : { y: 20 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                onMouseEnter={() => setHovered(f.id)}
                onMouseLeave={() => setHovered(null)}
                className="relative bg-[#0A0F1A] p-8 md:p-10 cursor-default group transition-colors duration-300"
                style={isHovered ? { backgroundColor: "rgba(255,255,255,0.02)" } : {}}
              >
                <div className="flex items-start justify-between mb-8">
                  <Icon
                    className="w-5 h-5 transition-colors duration-300"
                    style={{ color: isHovered ? "#fff" : "rgba(255,255,255,0.45)" }}
                  />
                  <span className="text-[10px] font-mono text-white/15">{f.num}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/35 leading-relaxed">{f.desc}</p>

                {/* Corner accent on hover */}
                <div
                  className="absolute top-0 right-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: "linear-gradient(225deg, rgba(0,102,255,0.1) 0%, transparent 60%)",
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
