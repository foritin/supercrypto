"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface WaveTransitionProps {
  direction: "dark-to-light" | "light-to-dark";
  className?: string;
  reveal3D?: boolean;
}

export function WaveTransition({ direction, className = "", reveal3D = false }: WaveTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isDarkToLight = direction === "dark-to-light";

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rawY = useTransform(scrollYProgress, [0, 0.5, 1], [6, -6, 6]);
  const y = useSpring(rawY, { stiffness: 60, damping: 20 });

  // ── Glass-frost wave: entire area is semi-transparent so 3D bleeds through ──
  if (isDarkToLight && reveal3D) {
    const waveMask = `url("data:image/svg+xml,%3Csvg viewBox='0 0 1440 120' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,0 C380,120 1060,120 1440,0 L1440,130 L0,130 Z' fill='black'/%3E%3C/svg%3E")`;

    return (
      <motion.div
        ref={ref}
        style={{ height: 120, y }}
        className={`relative w-full overflow-hidden ${className}`}
      >
        <div
          className="absolute inset-0"
          style={{
            maskImage: waveMask,
            WebkitMaskImage: waveMask,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            background: "linear-gradient(to bottom, rgba(242,242,247,0.1) 0%, rgba(242,242,247,0.8) 60%, rgba(242,242,247,1) 100%)",
          }}
        />

        {/* Subtle shimmer line along the wave crest */}
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        >
          <path
            d="M0,0 C380,120 1060,120 1440,0"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.5"
          />
        </svg>
      </motion.div>
    );
  }

  // ── Standard opaque wave (no reveal) ──
  return (
    <motion.div
      ref={ref}
      style={{ height: 120, y }}
      className={`relative w-full overflow-hidden ${
        isDarkToLight ? "bg-[#0A0F1A]" : "bg-[#F2F2F7]"
      } ${className}`}
    >
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="absolute top-0 left-0 w-full h-full"
      >
        <path
          d={
            isDarkToLight
              ? "M0,0 C380,120 1060,120 1440,0 L1440,130 L0,130 Z"
              : "M0,120 C380,0 1060,0 1440,120 L1440,130 L0,130 Z"
          }
          fill={isDarkToLight ? "#F2F2F7" : "#0A0F1A"}
        />
      </svg>
    </motion.div>
  );
}
