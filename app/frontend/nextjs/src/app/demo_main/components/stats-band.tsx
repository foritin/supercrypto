"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCountUp } from "@/hooks/use-count-up";

const STATS = [
  { label: "Total Value Locked", value: 42.8, prefix: "$", suffix: "M", decimals: 1 },
  { label: "Active Investors", value: 3240, prefix: "", suffix: "", decimals: 0 },
  { label: "Avg. APY", value: 8.4, prefix: "", suffix: "%", decimals: 1 },
  { label: "Assets Deployed", value: 28, prefix: "", suffix: "", decimals: 0 },
];

function StatItem({ stat, index }: { stat: typeof STATS[0]; index: number }) {
  const reduced = useReducedMotion();
  const { count, ref } = useCountUp(stat.value, {
    prefix: stat.prefix,
    suffix: stat.suffix,
    decimals: stat.decimals,
    duration: 2000,
    threshold: 0.3,
  });

  return (
    <motion.div
      initial={reduced ? {} : { y: 20, filter: "blur(6px)" }}
      whileInView={{ y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: "easeOut" }}
      className="flex-1 text-center px-4 py-6"
      ref={ref}
    >
      <div className="text-xs uppercase tracking-[0.15em] text-[#86868B] mb-2">
        {stat.label}
      </div>
      <motion.div
        className="font-display text-3xl md:text-4xl font-bold text-[#1D1D1F] tracking-tight"
        initial={reduced ? {} : { scale: 0.95 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{
          delay: index * 0.1 + 0.2,
          type: "spring",
          stiffness: 50,
          damping: 20,
        }}
      >
        {count}
      </motion.div>
    </motion.div>
  );
}

export function StatsBand() {
  return (
    <section className="relative bg-[#F2F2F7] py-8 px-6">
      <div className="max-w-[1000px] mx-auto flex flex-wrap items-center justify-center">
        {STATS.map((stat, i) => (
          <div key={stat.label} className="flex items-center">
            <StatItem stat={stat} index={i} />
            {i < STATS.length - 1 && (
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 + 0.3, duration: 0.4 }}
                className="hidden md:block w-px h-12 bg-[#D2D2D7] origin-center"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
