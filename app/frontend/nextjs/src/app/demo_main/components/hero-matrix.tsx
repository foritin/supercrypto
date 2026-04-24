"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&*アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
const COLS = 40;
const FONT_SIZE = 16;

interface Drop {
  x: number;
  y: number;
  speed: number;
  length: number;
  chars: string[];
  brightness: number[];
}

export function HeroMatrix() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<Drop[]>([]);
  const mouseRef = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    // Init drops
    const initDrops = () => {
      const colWidth = W / COLS;
      dropsRef.current = Array.from({ length: COLS }, (_, i) => ({
        x: i * colWidth + colWidth / 2,
        y: Math.random() * -H,
        speed: 2 + Math.random() * 3,
        length: 8 + Math.floor(Math.random() * 15),
        chars: Array.from({ length: 25 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]!),
        brightness: Array.from({ length: 25 }, () => Math.random()),
      }));
    };
    initDrops();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -999, y: -999 };
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const draw = () => {
      // Fade trail
      ctx.fillStyle = "rgba(5, 8, 5, 0.12)";
      ctx.fillRect(0, 0, W, H);

      const mouse = mouseRef.current;
      const colWidth = W / COLS;

      dropsRef.current.forEach((drop) => {
        // Update position
        drop.y += drop.speed;
        if (drop.y - drop.length * FONT_SIZE > H) {
          drop.y = -drop.length * FONT_SIZE;
          drop.speed = 2 + Math.random() * 3;
          drop.length = 8 + Math.floor(Math.random() * 15);
        }

        // Draw trail
        for (let i = 0; i < drop.length; i++) {
          const charY = drop.y - i * FONT_SIZE;
          if (charY < -FONT_SIZE || charY > H + FONT_SIZE) continue;

          let charIndex = (Math.floor(drop.y / FONT_SIZE) + i) % drop.chars.length;
          if (charIndex < 0) charIndex += drop.chars.length;
          const char = drop.chars[charIndex]!;

          // Mouse interaction: highlight nearby
          const distToMouse = Math.sqrt((drop.x - mouse.x) ** 2 + (charY - mouse.y) ** 2);
          const isNearMouse = distToMouse < 120;

          // Head is brightest white/green
          if (i === 0) {
            ctx.font = `bold ${FONT_SIZE}px "SF Mono", "Courier New", monospace`;
            ctx.fillStyle = isNearMouse ? "#FFFFFF" : "#CCFFCC";
            ctx.shadowColor = isNearMouse ? "#00FF41" : "#00FF41";
            ctx.shadowBlur = isNearMouse ? 20 : 8;
          } else {
            const fade = 1 - i / drop.length;
            const baseGreen = Math.floor(40 + fade * 180);
            const alpha = fade * 0.7;
            ctx.font = `${FONT_SIZE}px "SF Mono", "Courier New", monospace`;
            ctx.fillStyle = isNearMouse
              ? `rgba(200, 255, 200, ${Math.min(1, alpha + 0.3)})`
              : `rgba(0, ${baseGreen}, 0, ${alpha})`;
            ctx.shadowColor = "#00FF41";
            ctx.shadowBlur = isNearMouse ? 10 : 0;
          }

          ctx.textAlign = "center";
          ctx.fillText(char, drop.x, charY);
          ctx.shadowBlur = 0;
        }
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const handleResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      initDrops();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Matrix Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ background: "#050805" }}
      />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(5,8,5,0.6) 60%, rgba(5,8,5,0.95) 100%)",
        }}
      />

      {/* Scanline */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none opacity-[0.04]"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,255,65,0.05) 3px, rgba(0,255,65,0.05) 6px)",
        }}
      />

      {/* Content */}
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 max-w-[900px] text-center px-6"
      >
        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-[#00FF41]/40 font-medium">
            <span className="w-10 h-[1px] bg-[#00FF41]/20" />
            RWA Tokenization Platform
            <span className="w-10 h-[1px] bg-[#00FF41]/20" />
          </span>
        </motion.div>

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
              background: "linear-gradient(135deg, #00FF41 0%, #00CC33 40%, #D4AF37 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 30px rgba(0,255,65,0.3))",
            }}
          >
            Real Assets
          </span>
        </motion.h1>

        <motion.p
          initial={reduced ? {} : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="text-base md:text-lg text-white/45 max-w-[580px] mx-auto leading-[1.7] mb-12"
        >
          Institutional-grade tokenization of real-world assets. Secure, transparent, and always liquid.
        </motion.p>

        <motion.button
          initial={reduced ? {} : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/assets")}
          className="inline-flex items-center gap-2.5 h-12 px-8 rounded-full bg-[#00FF41]/10 border border-[#00FF41]/30 text-[#00FF41] text-sm font-semibold tracking-wide hover:bg-[#00FF41]/20 hover:border-[#00FF41]/50 transition-all"
        >
          Explore Opportunities
          <ArrowUpRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </div>
  );
}
