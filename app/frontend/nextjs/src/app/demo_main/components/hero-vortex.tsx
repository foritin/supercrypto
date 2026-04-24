"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

const ARMS = 6;
const PARTICLES_PER_ARM = 80;
const TOTAL_PARTICLES = ARMS * PARTICLES_PER_ARM;

interface VortexParticle {
  arm: number;
  t: number; // position along arm 0..1
  dist: number; // distance from center
  speed: number;
  size: number;
  hue: number;
  brightness: number;
}

export function HeroVortex() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<VortexParticle[]>([]);
  const mouseRef = useRef({ x: -999, y: -999 });
  const timeRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    const CX = W / 2;
    const CY = H / 2;
    canvas.width = W;
    canvas.height = H;

    // Init vortex particles
    const initParticles = () => {
      particlesRef.current = [];
      for (let arm = 0; arm < ARMS; arm++) {
        for (let i = 0; i < PARTICLES_PER_ARM; i++) {
          const t = i / PARTICLES_PER_ARM;
          particlesRef.current.push({
            arm,
            t,
            dist: 30 + t * Math.max(W, H) * 0.55,
            speed: 0.0003 + Math.random() * 0.0005,
            size: 1 + (1 - t) * 2.5,
            hue: arm * 40 + Math.random() * 30,
            brightness: 0.5 + Math.random() * 0.5,
          });
        }
      }
    };
    initParticles();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);

    const draw = () => {
      // Subtle trail
      ctx.fillStyle = "rgba(5, 5, 15, 0.08)";
      ctx.fillRect(0, 0, W, H);

      timeRef.current += 1;
      const time = timeRef.current;
      const mouse = mouseRef.current;

      // Draw center glow
      const centerGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, 150);
      centerGrad.addColorStop(0, "rgba(255, 200, 100, 0.15)");
      centerGrad.addColorStop(0.5, "rgba(100, 50, 200, 0.05)");
      centerGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = centerGrad;
      ctx.fillRect(0, 0, W, H);

      const particles = particlesRef.current;

      for (const p of particles) {
        // Spiral math
        const baseAngle = (p.arm / ARMS) * Math.PI * 2;
        const spiralAngle = baseAngle + p.dist * 0.003 + time * p.speed;

        let x = CX + Math.cos(spiralAngle) * p.dist;
        let y = CY + Math.sin(spiralAngle) * p.dist;

        // Mouse warp effect
        const dx = mouse.x - x;
        const dy = mouse.y - y;
        const mDist = Math.sqrt(dx * dx + dy * dy);
        if (mDist < 200) {
          const pull = (200 - mDist) / 200 * 8;
          x += (dx / mDist) * pull;
          y += (dy / mDist) * pull;
        }

        // Twinkle
        const twinkle = 0.6 + Math.sin(time * 0.03 + p.arm * 10 + p.t * 20) * 0.4;
        const alpha = p.brightness * twinkle * (1 - p.t * 0.3);

        // Draw star glow
        ctx.beginPath();
        ctx.arc(x, y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${alpha * 0.15})`;
        ctx.fill();

        // Draw star core
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, ${70 + twinkle * 30}%, ${alpha})`;
        ctx.fill();
      }

      // Draw arm connections (faint spiral lines)
      for (let arm = 0; arm < ARMS; arm++) {
        const armParticles = particles.filter((p) => p.arm === arm);
        if (armParticles.length < 2) continue;

        ctx.beginPath();
        const baseAngle = (arm / ARMS) * Math.PI * 2;

        for (let i = 0; i < armParticles.length; i += 3) {
          const p = armParticles[i]!;
          const spiralAngle = baseAngle + p.dist * 0.003 + time * p.speed;
          const x = CX + Math.cos(spiralAngle) * p.dist;
          const y = CY + Math.sin(spiralAngle) * p.dist;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = `hsla(${arm * 40}, 70%, 50%, 0.04)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const handleResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      initParticles();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ background: "#05050F" }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 10%, rgba(5,5,15,0.5) 50%, rgba(5,5,15,0.95) 100%)",
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
          <span className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-[#FFD700]/40 font-medium">
            <span className="w-10 h-[1px] bg-[#FFD700]/20" />
            RWA Tokenization Platform
            <span className="w-10 h-[1px] bg-[#FFD700]/20" />
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
              background: "linear-gradient(135deg, #FFD700 0%, #FF6B35 40%, #D4AF37 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 30px rgba(255,215,0,0.25))",
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
          className="inline-flex items-center gap-2.5 h-12 px-8 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-sm font-semibold tracking-wide hover:bg-[#FFD700]/20 hover:border-[#FFD700]/50 transition-all"
        >
          Explore Opportunities
          <ArrowUpRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </div>
  );
}
