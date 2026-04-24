"use client";

import { motion, useReducedMotion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";

export function CTAV3() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Scroll-driven parallax for particles
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const rawParticleY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const particleY = useSpring(rawParticleY, { stiffness: 80, damping: 30 });

  // Glow brightness linked to scroll progress
  const glowOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.08, 0.18, 0.08]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = 600;
    let raf: number;

    interface RisingParticle {
      x: number;
      y: number;
      vy: number;
      vx: number;
      radius: number;
      alpha: number;
      life: number;
      maxLife: number;
    }

    const particles: RisingParticle[] = [];
    const MAX_PARTICLES = 40;

    const spawn = () => {
      if (particles.length >= MAX_PARTICLES) return;
      particles.push({
        x: Math.random() * w,
        y: h + 10,
        vy: -0.5 - Math.random() * 1.2,
        vx: (Math.random() - 0.5) * 0.3,
        radius: 1 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.4,
        life: 0,
        maxLife: 300 + Math.random() * 200,
      });
    };

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = 600;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      if (Math.random() < 0.1) spawn();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p) continue;
        p.life++;
        if (p.life > p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        const lifeRatio = p.life / p.maxLife;
        const alpha = p.alpha * (1 - lifeRatio);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 102, 255, ${alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative bg-[#050505] py-32 px-6 overflow-hidden flex flex-col items-center justify-center min-h-[500px]">
      {/* Rising particles canvas with parallax */}
      <motion.canvas
        ref={canvasRef}
        style={{ y: reduced ? 0 : particleY, height: "100%" }}
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Breathing glow with scroll-linked brightness */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,102,255,0.15) 0%, transparent 70%)",
          animation: "ctaGlow 4s ease-in-out infinite",
          opacity: reduced ? 0.15 : glowOpacity,
        }}
      />

      <div className="relative z-10 text-center max-w-[700px]">
        {/* Title with word-by-word blur-in */}
        <motion.h2
          className="font-display text-5xl md:text-6xl font-bold text-white tracking-tight mb-6"
        >
          <motion.span
            className="block"
            initial={reduced ? {} : { y: 20, filter: "blur(8px)" }}
            whileInView={{ y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            Your Assets,
          </motion.span>
          <motion.span
            className="block text-white/40"
            initial={reduced ? {} : { y: 20, filter: "blur(8px)" }}
            whileInView={{ y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.15, duration: 0.7 }}
          >
            Reimagined
          </motion.span>
        </motion.h2>

        <motion.p
          initial={reduced ? {} : { y: 15, filter: "blur(4px)" }}
          whileInView={{ y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="text-white/50 text-lg mb-10 max-w-[480px] mx-auto leading-relaxed"
        >
          Join 3,000+ investors accessing the future of real-world asset tokenization.
        </motion.p>

        <motion.button
          initial={reduced ? {} : { y: 15, scale: 0.95, filter: "blur(2px)" }}
          whileInView={{ y: 0, scale: 1, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/assets")}
          className="group relative inline-flex items-center gap-3 h-[56px] px-10 rounded-full bg-white text-[#050505] text-sm font-semibold tracking-wide hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] transition-shadow"
        >
          Start Investing
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </motion.button>

        <motion.p
          initial={reduced ? {} : { y: 10, filter: "blur(2px)" }}
          whileInView={{ y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="text-white/25 text-xs mt-6"
        >
          No minimum · Instant liquidity · Audited contracts
        </motion.p>
      </div>
    </section>
  );
}
