"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Rocket, ArrowRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";

export function HeroSection() {
  const router = useRouter();
  const prefersReduced = useReducedMotion();
  const primaryBtnRef = useRef<HTMLButtonElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Magnetic button effect
  useEffect(() => {
    if (prefersReduced) return;
    const btn = primaryBtnRef.current;
    if (!btn) return;

    const handleMove = (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2);
      if (dist < 120) {
        const strength = (120 - dist) / 120;
        setMousePos({
          x: (e.clientX - cx) * strength * 0.3,
          y: (e.clientY - cy) * strength * 0.3,
        });
      } else {
        setMousePos({ x: 0, y: 0 });
      }
    };
    const handleLeave = () => setMousePos({ x: 0, y: 0 });

    document.addEventListener("mousemove", handleMove);
    btn.addEventListener("mouseleave", handleLeave);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      btn.removeEventListener("mouseleave", handleLeave);
    };
  }, [prefersReduced]);

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.3 + i * 0.12,
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    }),
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-16">
      {/* Gradient orbs background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(0,102,255,0.3) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08] text-[13px] font-medium tracking-[1.5px] uppercase text-white/70">
            <span className="w-2 h-2 rounded-full bg-[#00C9A7] animate-pulse" />
            Institutional-Grade RWA Platform
          </span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="font-display text-[clamp(42px,9vw,96px)] font-bold leading-[1.05] tracking-[-0.03em] mb-6"
        >
          <span className="block text-white">Unlock</span>
          <span className="block bg-gradient-to-r from-[#D4AF37] via-[#E5C76B] to-[#D4AF37] bg-clip-text text-transparent">
            Real World Assets
          </span>
          <span className="block bg-gradient-to-r from-[#0066FF] via-[#3385FF] to-[#0066FF] bg-clip-text text-transparent">
            on Web3
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="text-lg md:text-xl text-white/60 max-w-[640px] mx-auto leading-[1.7] mb-10"
        >
          Institutional-grade security · Liquid · Transparent
          <br />
          Earn up to{" "}
          <span className="bg-gradient-to-r from-[#D4AF37] to-[#E5C76B] bg-clip-text text-transparent font-semibold">
            15% APY
          </span>{" "}
          backed by tokenized real-world assets
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="flex flex-wrap gap-4 justify-center mb-20"
        >
          <button
            ref={primaryBtnRef}
            onClick={() => router.push("/assets")}
            className="group relative h-[56px] px-10 rounded-2xl overflow-hidden transition-transform duration-300 active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #0066FF 0%, #0052CC 100%)",
              boxShadow: "0 4px 32px rgba(0,102,255,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
              transform: `translate(${mousePos.x}px, ${mousePos.y}px)`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative z-10 flex items-center gap-2.5 text-[15px] font-semibold text-white">
              <Rocket className="w-5 h-5" />
              Start Investing
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>

          <button
            onClick={() => router.push("/portfolio")}
            className="h-[56px] px-10 rounded-2xl text-[15px] font-semibold text-white/85 bg-white/[0.04] border border-white/[0.12] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 active:scale-[0.97]"
          >
            View Portfolio
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
          className="inline-flex flex-col md:flex-row items-center gap-6 md:gap-10 px-8 py-5 rounded-2xl bg-gradient-to-r from-[rgba(0,102,255,0.06)] via-[rgba(212,175,55,0.04)] to-[rgba(0,201,167,0.06)] backdrop-blur-xl border border-white/[0.08]"
        >
          <StatItem label="Total Value Locked" value="$2.5M+" />
          <div className="hidden md:block w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          <StatItem label="Active Investors" value="1,200+" />
          <div className="hidden md:block w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          <StatItem label="Tokenized Assets" value="15+" />
        </motion.div>
      </div>
    </section>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="text-[10px] md:text-xs uppercase tracking-[0.15em] text-white/45 font-medium">
        {label}
      </span>
      <span className="font-display text-xl md:text-3xl font-semibold text-[#D4AF37] tracking-tight drop-shadow-[0_0_15px_rgba(212,175,55,0.35)]">
        {value}
      </span>
    </div>
  );
}
