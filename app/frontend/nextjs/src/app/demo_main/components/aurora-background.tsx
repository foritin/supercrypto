"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Scroll-driven parallax
  const { scrollY } = useScroll();
  const rawY = useTransform(scrollY, [0, 1500], [0, -450]);
  const rawScale = useTransform(scrollY, [0, 1500], [1, 1.15]);
  const smoothY = useSpring(rawY, { stiffness: 80, damping: 30 });
  const smoothScale = useSpring(rawScale, { stiffness: 80, damping: 30 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    let t = 0;
    let raf: number;
    const mouse = { x: -9999, y: -9999, active: false };

    const colors = [
      { r: 0, g: 102, b: 255 },   // primary blue
      { r: 0, g: 201, b: 167 },   // teal
      { r: 212, g: 175, b: 55 },  // gold
      { r: 139, g: 92, b: 246 },  // purple
    ];

    const blobs = colors.map((c, i) => ({
      baseX: w * (0.2 + i * 0.2),
      baseY: h * (0.3 + (i % 2) * 0.3),
      x: w * (0.2 + i * 0.2),
      y: h * (0.3 + (i % 2) * 0.3),
      r: Math.min(w, h) * 0.35,
      color: c,
      speed: 0.0003 + i * 0.0001,
      phase: i * Math.PI * 0.5,
    }));

    // Shimmer particles
    const particles: Particle[] = [];
    const MAX_PARTICLES = 60;

    const spawnParticle = () => {
      if (particles.length >= MAX_PARTICLES) return;
      particles.push({
        x: Math.random() * w,
        y: h + 10,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.3 - Math.random() * 0.5,
        radius: 0.5 + Math.random() * 1.5,
        alpha: 0.1 + Math.random() * 0.4,
        life: 0,
        maxLife: 200 + Math.random() * 300,
      });
    };

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      blobs.forEach((b, i) => {
        b.baseX = w * (0.2 + i * 0.2);
        b.baseY = h * (0.3 + (i % 2) * 0.3);
        b.r = Math.min(w, h) * 0.35;
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Update blob positions with mouse repulsion
      blobs.forEach((b) => {
        const naturalX = b.baseX + Math.sin(t * b.speed + b.phase) * w * 0.15;
        const naturalY = b.baseY + Math.cos(t * b.speed * 0.7 + b.phase) * h * 0.1;

        if (mouse.active) {
          const dx = naturalX - mouse.x;
          const dy = naturalY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const repelRadius = 250;
          if (dist < repelRadius && dist > 1) {
            const force = (1 - dist / repelRadius) * 40;
            b.x = naturalX + (dx / dist) * force;
            b.y = naturalY + (dy / dist) * force;
          } else {
            b.x += (naturalX - b.x) * 0.05;
            b.y += (naturalY - b.y) * 0.05;
          }
        } else {
          b.x += (naturalX - b.x) * 0.05;
          b.y += (naturalY - b.y) * 0.05;
        }

        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, `rgba(${b.color.r},${b.color.g},${b.color.b},0.28)`);
        grad.addColorStop(0.5, `rgba(${b.color.r},${b.color.g},${b.color.b},0.08)`);
        grad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      });

      // Draw particles
      if (Math.random() < 0.15) spawnParticle();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p) continue;
        p.life++;
        if (p.life > p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        // Mouse attraction
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200 && dist > 1) {
            const force = (1 - dist / 200) * 0.8;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;

        const lifeRatio = p.life / p.maxLife;
        const alpha = p.alpha * (1 - lifeRatio);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${alpha})`;
        ctx.fill();
      }

      // Subtle vignette
      const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
      vig.addColorStop(0, "rgba(10,15,26,0)");
      vig.addColorStop(1, "rgba(10,15,26,0.4)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      t += 16;
      raf = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ mixBlendMode: "screen", y: smoothY, scale: smoothScale }}
    />
  );
}
