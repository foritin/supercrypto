"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

const GRID_COLS = 24;
const GRID_ROWS = 16;
const TOTAL = GRID_COLS * GRID_ROWS;

function getPulseState(
  index: number,
  cols: number,
  rows: number,
  time: number,
  centers: { x: number; y: number; birth: number }[]
): number {
  const x = index % cols;
  const y = Math.floor(index / cols);
  let maxIntensity = 0;

  for (const c of centers) {
    const age = time - c.birth;
    if (age < 0 || age > 2.5) continue;
    const dist = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2);
    const wavePos = age * 10; // wave speed
    const spread = 3; // wave thickness
    const intensity = Math.max(0, 1 - Math.abs(dist - wavePos) / spread) * (1 - age / 2.5);
    maxIntensity = Math.max(maxIntensity, intensity);
  }

  return maxIntensity;
}

export function HeroNeonGrid() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const [cells, setCells] = useState<number[]>(Array(TOTAL).fill(0));
  const centersRef = useRef<{ x: number; y: number; birth: number }[]>([]);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (reduced) return;

    const spawnCenter = () => {
      centersRef.current.push({
        x: Math.floor(Math.random() * GRID_COLS),
        y: Math.floor(Math.random() * GRID_ROWS),
        birth: (Date.now() - startRef.current) / 1000,
      });
      // cleanup old centers
      const now = (Date.now() - startRef.current) / 1000;
      centersRef.current = centersRef.current.filter((c) => now - c.birth < 3);
    };

    spawnCenter();
    const spawnInterval = setInterval(spawnCenter, 800);

    const animate = () => {
      const now = (Date.now() - startRef.current) / 1000;
      centersRef.current = centersRef.current.filter((c) => now - c.birth < 3);

      const newCells = new Array(TOTAL);
      for (let i = 0; i < TOTAL; i++) {
        newCells[i] = getPulseState(i, GRID_COLS, GRID_ROWS, now, centersRef.current);
      }
      setCells(newCells);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      clearInterval(spawnInterval);
      cancelAnimationFrame(rafRef.current);
    };
  }, [reduced]);

  return (
    <div
      ref={gridRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Grid Background */}
      <div className="absolute inset-0 z-0 bg-[#050508]">
        <div
          className="absolute inset-0 grid gap-[2px] p-4"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
          }}
        >
          {cells.map((intensity, i) => {
            const isBright = intensity > 0.3;
            const baseOpacity = 0.04 + intensity * 0.85;
            const color = isBright
              ? `rgba(0, 245, 255, ${baseOpacity})`
              : `rgba(40, 60, 100, ${baseOpacity * 0.5})`;
            const shadow = intensity > 0.5
              ? `0 0 ${intensity * 12}px rgba(0,245,255,${intensity * 0.4})`
              : "none";

            return (
              <div
                key={i}
                className="rounded-[2px] transition-colors duration-75"
                style={{
                  backgroundColor: color,
                  boxShadow: shadow,
                  transform: intensity > 0.6 ? `scale(${1 + intensity * 0.15})` : "scale(1)",
                }}
              />
            );
          })}
        </div>

        {/* Grid lines overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,245,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.3) 1px, transparent 1px)",
            backgroundSize: `${100 / GRID_COLS}% ${100 / GRID_ROWS}%`,
          }}
        />

        {/* Radial vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, transparent 10%, rgba(5,5,8,0.7) 60%, rgba(5,5,8,0.95) 100%)",
          }}
        />
      </div>

      {/* Scanline effect */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03]"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,245,255,0.1) 2px, rgba(0,245,255,0.1) 4px)",
          animation: "scanlineMove 8s linear infinite",
        }}
      />

      {/* Content overlay */}
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 max-w-[900px] text-center px-6"
      >
        {/* Eyebrow */}
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-[#00F5FF]/40 font-medium">
            <span className="w-10 h-[1px] bg-[#00F5FF]/20" />
            RWA Tokenization Platform
            <span className="w-10 h-[1px] bg-[#00F5FF]/20" />
          </span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={reduced ? {} : { opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          className="font-display text-[clamp(52px,10vw,130px)] font-bold leading-[0.95] tracking-[-0.03em] mb-6"
        >
          <span className="block text-white">The Future</span>
          <span className="block text-white/15">of</span>
          <span
            className="block"
            style={{
              background:
                "linear-gradient(135deg, #00F5FF 0%, #00B4D8 40%, #D4AF37 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 30px rgba(0,245,255,0.25))",
            }}
          >
            Real Assets
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={reduced ? {} : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="text-base md:text-lg text-white/45 max-w-[580px] mx-auto leading-[1.7] mb-12"
        >
          Tokenized real-world assets backed by institutional-grade security.
          Earn sustainable yields, transparently.
        </motion.p>

        {/* CTA */}
        <motion.button
          initial={reduced ? {} : { opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/assets")}
          className="group relative inline-flex items-center gap-3 h-[54px] px-10 rounded-full text-sm font-semibold tracking-wide transition-all will-change-transform overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #00F5FF, #00B4D8)",
            boxShadow: "0 0 40px rgba(0,245,255,0.25), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span className="relative text-[#050508]">Explore Assets</span>
          <ArrowUpRight className="relative w-4 h-4 text-[#050508] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </motion.button>
      </motion.div>

      <style jsx global>{`
        @keyframes scanlineMove {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 100vh;
          }
        }
      `}</style>
    </div>
  );
}
