"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

const PARTICLE_COUNT = 180;
const CONNECTION_DIST = 130;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  hue: number;
}

export function HeroNexus() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -999, y: -999, active: false });
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

    // Init particles
    const initParticles = () => {
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: 1.5 + Math.random() * 2,
        baseRadius: 1.5 + Math.random() * 2,
        hue: 180 + Math.random() * 60, // cyan to blue
      }));
    };
    initParticles();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const draw = () => {
      ctx.fillStyle = "rgba(8, 10, 20, 0.15)";
      ctx.fillRect(0, 0, W, H);

      const mouse = mouseRef.current;
      const particles = particlesRef.current;

      // Update & draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Mouse attraction
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 250 && dist > 10) {
            const force = (250 - dist) / 250 * 0.015;
            p.vx += dx / dist * force;
            p.vy += dy / dist * force;
          }
        }

        // Apply velocity with damping
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Bounce
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        p.x = Math.max(0, Math.min(W, p.x));
        p.y = Math.max(0, Math.min(H, p.y));

        // Speed affects radius and hue
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        p.radius = p.baseRadius + speed * 4;
        const dynamicHue = p.hue + speed * 30;

        // Draw particle glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${dynamicHue}, 80%, 60%, 0.15)`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${dynamicHue}, 90%, 70%, ${0.4 + speed * 0.3})`;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        const pi = particles[i]!;
        for (let j = i + 1; j < particles.length; j++) {
          const pj = particles[j]!;
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.25;
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.strokeStyle = `rgba(0, 220, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
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
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ background: "#080A14" }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 15%, rgba(8,10,20,0.6) 55%, rgba(8,10,20,0.95) 100%)",
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
          <span className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-[#00DCFF]/40 font-medium">
            <span className="w-10 h-[1px] bg-[#00DCFF]/20" />
            RWA Tokenization Platform
            <span className="w-10 h-[1px] bg-[#00DCFF]/20" />
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
              background: "linear-gradient(135deg, #00DCFF 0%, #0080FF 40%, #D4AF37 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 30px rgba(0,220,255,0.25))",
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
          className="inline-flex items-center gap-2.5 h-12 px-8 rounded-full bg-[#00DCFF]/10 border border-[#00DCFF]/30 text-[#00DCFF] text-sm font-semibold tracking-wide hover:bg-[#00DCFF]/20 hover:border-[#00DCFF]/50 transition-all"
        >
          Explore Opportunities
          <ArrowUpRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </div>
  );
}
