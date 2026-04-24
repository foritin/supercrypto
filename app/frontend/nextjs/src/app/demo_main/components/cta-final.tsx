"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

export function CTAFinal() {
  const router = useRouter();
  const reduced = useReducedMotion();

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center px-6 overflow-hidden">
      {/* Large ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,102,255,0.12) 0%, rgba(212,175,55,0.06) 40%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      <motion.div
        initial={reduced ? {} : { y: 40 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center max-w-[700px]"
      >
        <h2 className="font-display text-[clamp(36px,6vw,72px)] font-bold text-white leading-[1.05] tracking-tight mb-6">
          Your Assets,
          <br />
          <span className="text-white/30">Reimagined</span>
        </h2>
        <p className="text-lg text-white/30 mb-10 max-w-[420px] mx-auto leading-relaxed">
          Join 3,000+ investors accessing the future of real-world asset tokenization.
        </p>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/assets")}
          className="group relative inline-flex items-center gap-3 h-[56px] px-10 rounded-full bg-white text-[#0A0F1A] text-sm font-semibold tracking-wide"
        >
          Start Investing
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </motion.button>

        <p className="mt-6 text-xs text-white/15">
          No minimum · Instant liquidity · Audited contracts
        </p>
      </motion.div>
    </section>
  );
}
