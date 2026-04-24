"use client";

import { motion } from "framer-motion";

const LOGOS = [
  "Ethereum", "Polygon", "Arbitrum", "Base", "Solana",
  "Avalanche", "Chainlink", "BlackRock", "Morgan Stanley", "Sei",
];

export function MarqueeLogos() {
  return (
    <section className="relative py-20 overflow-hidden border-y border-white/[0.04]">
      <div className="text-center mb-10">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/20">
          Backed by the best
        </span>
      </div>

      {/* Single row marquee */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0A0F1A] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0A0F1A] to-transparent z-10" />

        <div className="flex animate-marquee-slow">
          {[...LOGOS, ...LOGOS, ...LOGOS].map((name, i) => (
            <div
              key={i}
              className="flex-shrink-0 mx-8 flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
              <span className="text-white/20 text-sm font-medium tracking-wide whitespace-nowrap">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee-slow {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee-slow {
          animation: marquee-slow 30s linear infinite;
        }
      `}</style>
    </section>
  );
}
