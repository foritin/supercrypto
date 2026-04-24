"use client";

import { motion, useReducedMotion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";
import { useRouter } from "next/navigation";

const ASSETS = [
  { id: "1", name: "US Treasury", apy: 5.2, raised: 78, total: 5_000_000, color: "#0066FF" },
  { id: "2", name: "Real Estate Fund", apy: 8.5, raised: 92, total: 12_000_000, color: "#D4AF37" },
  { id: "3", name: "DeFi Yield", apy: 12.4, raised: 65, total: 3_000_000, color: "#00C9A7" },
  { id: "4", name: "Green Bond", apy: 6.8, raised: 45, total: 8_000_000, color: "#10B981" },
];

function AssetCard({ asset, index }: { asset: typeof ASSETS[0]; index: number }) {
  const reduced = useReducedMotion();
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  // Even-indexed cards get extra parallax
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });
  const rawParallax = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const parallax = useSpring(rawParallax, { stiffness: 100, damping: 30 });

  const isEven = index % 2 === 0;

  return (
    <motion.div
      ref={cardRef}
      initial={reduced ? {} : { y: 30, rotateX: 6, filter: "blur(2px)" }}
      whileInView={{ y: 0, rotateX: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: index * 0.1, duration: 0.7, ease: "easeOut" }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      onClick={() => router.push(`/assets/${asset.id}`)}
      style={{ perspective: 800, y: isEven && !reduced ? parallax : 0 }}
      className="group relative bg-white rounded-[20px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] transition-shadow duration-300 cursor-pointer overflow-hidden shimmer-sweep"
    >
      {/* Top colored stripe */}
      <div className="absolute top-0 left-6 right-6 h-[3px] rounded-full" style={{ backgroundColor: asset.color }} />

      <div className="pt-4">
        <h3 className="text-lg font-semibold text-[#1D1D1F] mb-1">{asset.name}</h3>
        <p className="text-sm text-[#86868B] mb-4">{asset.raised}% funded</p>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden mb-5">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${asset.raised}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: asset.color }}
          />
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#86868B] mb-0.5">TVL</div>
            <div className="text-sm font-medium text-[#1D1D1F]">${(asset.total / 1_000_000).toFixed(1)}M</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-[#86868B] mb-0.5">APY</div>
            <div className="text-2xl font-bold font-display tracking-tight transition-transform duration-300 group-hover:scale-110" style={{ color: asset.color }}>
              {asset.apy}%
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function AssetCardsV3() {
  const reduced = useReducedMotion();

  return (
    <section className="relative bg-[#F2F2F7] py-24 px-6">
      <div className="max-w-[1100px] mx-auto">
        <motion.div
          initial={reduced ? {} : { y: 30, filter: "blur(6px)" }}
          whileInView={{ y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="mb-12"
        >
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#86868B] font-medium">
            Live Opportunities
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-[#1D1D1F] mt-4 tracking-tight">
            Invest in What Matters
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ASSETS.map((asset, i) => (
            <AssetCard key={asset.id} asset={asset} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
