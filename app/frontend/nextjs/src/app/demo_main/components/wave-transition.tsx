"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface WaveTransitionProps {
  direction: "dark-to-light" | "light-to-dark";
  className?: string;
}

export function WaveTransition({ direction, className = "" }: WaveTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isDarkToLight = direction === "dark-to-light";

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rawScaleY = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1.12, 0.92]);
  const rawY = useTransform(scrollYProgress, [0, 0.5, 1], [15, -15, 15]);
  const scaleY = useSpring(rawScaleY, { stiffness: 60, damping: 20 });
  const y = useSpring(rawY, { stiffness: 60, damping: 20 });

  return (
    <motion.div
      ref={ref}
      style={{ height: 100, scaleY, y }}
      className={`relative w-full overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <path
          d={
            isDarkToLight
              ? "M0,0 C480,100 960,100 1440,0 L1440,100 L0,100 Z"
              : "M0,100 C480,0 960,0 1440,100 L1440,100 L0,100 Z"
          }
          fill={isDarkToLight ? "#F2F2F7" : "#0A0F1A"}
        />
        <path
          d={
            isDarkToLight
              ? "M0,20 C480,110 960,110 1440,20 L1440,100 L0,100 Z"
              : "M0,100 C480,10 960,10 1440,100 L1440,100 L0,100 Z"
          }
          fill={isDarkToLight ? "#F2F2F7" : "#0A0F1A"}
          opacity={0.5}
        />
      </svg>
    </motion.div>
  );
}
