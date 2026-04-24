"use client";

import { motion, useReducedMotion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useMagneticButton } from "@/hooks/use-magnetic-button";

export function HeroV2() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const magneticRef = useMagneticButton({ threshold: 120, strength: 0.35 });

  // Scroll-driven parallax
  const { scrollY } = useScroll();
  const rawContentY = useTransform(scrollY, [0, 800], [0, -250]);
  const contentY = useSpring(rawContentY, { stiffness: 100, damping: 30 });
  const rawContentOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const contentOpacity = useSpring(rawContentOpacity, { stiffness: 100, damping: 30 });

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Central content with parallax */}
      <motion.div
        style={{ y: reduced ? 0 : contentY, opacity: reduced ? 1 : contentOpacity }}
        className="relative z-10 max-w-[900px] text-center"
      >
        {/* Eyebrow */}
        <motion.div
          initial={reduced ? {} : { y: 20, filter: "blur(4px)" }}
          animate={{ y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/50 font-medium">
            <span className="w-8 h-[1px] bg-white/20" />
            RWA Tokenization Platform
            <span className="w-8 h-[1px] bg-white/20" />
          </span>
        </motion.div>

        {/* Main Title — Editorial with blur-in */}
        <motion.h1
          initial={reduced ? {} : { y: 30, filter: "blur(8px)" }}
          animate={{ y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
          className="font-display text-[clamp(56px,10vw,140px)] font-bold leading-[0.95] tracking-[-0.03em] mb-8"
        >
          <span className="block text-white">The Future</span>
          <motion.span
            initial={reduced ? {} : { y: 20, filter: "blur(6px)" }}
            animate={{ y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.55, ease: "easeOut" }}
            className="block text-white/30"
          >
            of
          </motion.span>
          <motion.span
            initial={reduced ? {} : { y: 20, filter: "blur(8px)" }}
            animate={{ y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
            className="block hero-glow-text"
            style={{
              background: "linear-gradient(135deg, #D4AF37 0%, #E5C76B 40%, #0066FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Real Assets
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={reduced ? {} : { y: 10, filter: "blur(4px)" }}
          animate={{ y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="text-base md:text-lg text-white/60 max-w-[600px] mx-auto leading-[1.7] mb-12 font-normal"
        >
          Tokenized real-world assets backed by institutional-grade security.
          Earn sustainable yields, transparently.
        </motion.p>

        {/* CTA — Magnetic pill button */}
        <motion.button
          ref={magneticRef}
          initial={reduced ? {} : { scale: 0.95, filter: "blur(2px)" }}
          animate={{ scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: 1.1 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/assets")}
          className="group relative inline-flex items-center gap-3 h-[52px] px-8 rounded-full bg-white text-[#0A0F1A] text-sm font-semibold tracking-wide transition-shadow hover:shadow-[0_0_60px_rgba(255,255,255,0.25)] will-change-transform"
        >
          Explore Assets
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </motion.button>
      </motion.div>

      {/* Bottom scroll indicator */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-4 h-4 text-white/30" />
        </motion.div>
      </motion.div>
    </section>
  );
}
