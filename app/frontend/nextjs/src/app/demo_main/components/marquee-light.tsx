"use client";

import { motion, useReducedMotion } from "framer-motion";

const PARTNERS = [
  "Polygon", "Arbitrum", "Base", "Solana", "Avalanche",
  "Chainlink", "BlackRock", "Morgan Stanley", "Sei", "Near",
];

export function MarqueeLight() {
  const reduced = useReducedMotion();
  // Duplicate for seamless loop
  const items = [...PARTNERS, ...PARTNERS];

  return (
    <motion.section
      initial={reduced ? {} : { scale: 0.98, filter: "blur(2px)" }}
      whileInView={{ scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative bg-white py-12 overflow-hidden marquee-paused"
    >
      <div className="text-center mb-8">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#86868B] font-medium">
          Backed by the Best
        </span>
      </div>

      <div className="relative flex overflow-hidden">
        <div className="animate-marquee flex items-center gap-12 whitespace-nowrap pr-12">
          {items.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="text-lg font-medium text-[#C7C7CC] hover:text-[#1D1D1F] transition-all duration-300 cursor-default select-none"
              style={{ filter: "grayscale(100%)", transition: "filter 0.3s, color 0.3s" }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.filter = "grayscale(0%)"; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.filter = "grayscale(100%)"; }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
