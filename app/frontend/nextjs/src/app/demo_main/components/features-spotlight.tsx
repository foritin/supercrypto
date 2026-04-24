"use client";

import { motion, useReducedMotion, useScroll, useTransform, useSpring } from "framer-motion";
import { Shield, Globe, Lock, Zap, BarChart3, Layers } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const FEATURES = [
  { id: "security", title: "Institutional Security", desc: "Multi-sig treasury, audited contracts, regulated custody.", icon: Shield, num: "01" },
  { id: "global", title: "Borderless Access", desc: "Invest from anywhere. No minimums. Instant settlement.", icon: Globe, num: "02" },
  { id: "transparent", title: "On-Chain Verifiable", desc: "Every asset backing and transaction visible on-chain.", icon: Lock, num: "03" },
  { id: "yield", title: "Sustainable Yield", desc: "Real cash flows from real assets. Not speculation.", icon: Zap, num: "04" },
  { id: "liquidity", title: "Deep Liquidity", desc: "Secondary markets and instant redemption mechanisms.", icon: BarChart3, num: "05" },
  { id: "diversity", title: "Asset Diversity", desc: "Real estate, bonds, commodities — all in one portfolio.", icon: Layers, num: "06" },
];

export function FeaturesSpotlight() {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: -9999, y: -9999 });

  // Title parallax
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const rawTitleY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const titleY = useSpring(rawTitleY, { stiffness: 80, damping: 30 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleMouseLeave = () => {
      setMousePos({ x: -9999, y: -9999 });
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <section className="relative bg-[#0A0F1A] py-32 px-6 overflow-hidden">
      <div ref={containerRef} className="max-w-[1100px] mx-auto relative">
        {/* Mouse-following spotlight overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300"
          style={{
            opacity: mousePos.x > 0 ? 1 : 0,
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.04), transparent 40%)`,
          }}
        />

        <motion.div
          initial={reduced ? {} : { y: 40, filter: "blur(6px)" }}
          whileInView={{ y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          style={{ y: reduced ? 0 : titleY }}
          className="mb-16 relative z-10"
        >
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-medium">
            Why SuperCrypto
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mt-4 tracking-tight max-w-[500px]">
            Built Different
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-white/[0.04] rounded-2xl overflow-hidden relative z-10">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const col = i % 3;
            const rotateY = col === 0 ? -4 : col === 2 ? 4 : 0;

            return (
              <motion.div
                key={f.id}
                initial={reduced ? {} : { y: 25, rotateY, filter: "blur(2px)" }}
                whileInView={{ y: 0, rotateY: 0, filter: "blur(0px)" }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.06, duration: 0.6, ease: "easeOut" }}
                style={{ perspective: 600 }}
                className="relative bg-[#0A0F1A] p-8 md:p-10 cursor-default group transition-all duration-300 hover:bg-white/[0.02]"
              >
                <div className="flex items-start justify-between mb-8">
                  <Icon className="w-5 h-5 text-white/45 transition-colors duration-300 group-hover:text-white" />
                  <span className="text-[10px] font-mono text-white/15">{f.num}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed group-hover:text-white/55 transition-colors">{f.desc}</p>

                <div
                  className="absolute top-0 right-0 w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "linear-gradient(225deg, rgba(0,102,255,0.1) 0%, transparent 60%)" }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
