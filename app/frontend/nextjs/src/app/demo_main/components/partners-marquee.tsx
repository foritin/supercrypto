"use client";

import { motion } from "framer-motion";

const PARTNERS_ROW1 = [
  "Ethereum", "Polygon", "Arbitrum", "Optimism", "Base", "Solana", "Avalanche", "Near",
];
const PARTNERS_ROW2 = [
  "Chainlink", "BlackRock", "Morgan Stanley", "Frax", "Sei", "Aptos", "Hedera", "Cosmos",
];

export function PartnersMarqueeSection() {
  return (
    <section className="relative py-20 overflow-hidden">
      <div className="text-center mb-12 px-6">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-sm font-semibold uppercase tracking-[2px] text-white/40"
        >
          Trusted Ecosystem Partners
        </motion.span>
      </div>

      {/* Row 1 - left to right */}
      <div className="relative mb-6">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0A0F1A] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0A0F1A] to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee-left">
          {[...PARTNERS_ROW1, ...PARTNERS_ROW1].map((name, i) => (
            <div
              key={i}
              className="flex-shrink-0 mx-4 px-8 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
            >
              <span className="text-white/50 font-medium text-sm whitespace-nowrap">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2 - right to left */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0A0F1A] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0A0F1A] to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee-right">
          {[...PARTNERS_ROW2, ...PARTNERS_ROW2].map((name, i) => (
            <div
              key={i}
              className="flex-shrink-0 mx-4 px-8 py-4 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
            >
              <span className="text-white/50 font-medium text-sm whitespace-nowrap">{name}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-left {
          animation: marquee-left 35s linear infinite;
        }
        .animate-marquee-right {
          animation: marquee-right 40s linear infinite;
        }
        .animate-marquee-left:hover,
        .animate-marquee-right:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
