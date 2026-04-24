"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";

export function CTASection() {
  const router = useRouter();
  const prefersReduced = useReducedMotion();

  return (
    <section className="relative py-32 px-6 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(ellipse, rgba(0,102,255,0.3) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <motion.div
        initial={prefersReduced ? {} : { y: 40 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 max-w-[800px] mx-auto text-center"
      >
        <h2 className="font-display text-[clamp(28px,4.5vw,48px)] font-semibold text-white mb-5 leading-tight">
          Ready to Unlock
          <br />
          <span className="bg-gradient-to-r from-[#D4AF37] via-[#E5C76B] to-[#D4AF37] bg-clip-text text-transparent">
            Real World Yields?
          </span>
        </h2>

        <p className="text-lg text-white/60 mb-10 max-w-[520px] mx-auto leading-relaxed">
          Join thousands of investors already earning sustainable returns through
          tokenized real-world assets.
        </p>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/assets")}
          className="group relative h-[60px] px-14 rounded-2xl overflow-hidden text-lg font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, #0066FF 0%, #0052CC 100%)",
            boxShadow: "0 4px 40px rgba(0,102,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="relative z-10 flex items-center gap-3">
            <Rocket className="w-5 h-5" />
            Start Investing Now
          </span>
        </motion.button>

        <p className="mt-6 text-sm text-white/30">
          No minimum deposit · Instant liquidity · Bank-grade security
        </p>
      </motion.div>
    </section>
  );
}
