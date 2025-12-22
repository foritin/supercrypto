"use client";

import { useEffect, useRef, useMemo } from "react";
import { usePathname } from "next/navigation";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

interface Web3BackgroundProps {
  /** 排除的路由前缀 */
  excludePaths?: string[];
  /** 粒子数量 */
  particleCount?: number;
  /** 主色调 */
  primaryColor?: string;
  /** 次要色调 */
  secondaryColor?: string;
  /** 连线最大距离 */
  linkDistance?: number;
  /** 鼠标影响半径 */
  mouseRadius?: number;
}

/**
 * Web3Background - 高性能 Canvas 粒子网络背景
 *
 * 特点：
 * - 使用 Canvas + requestAnimationFrame 实现高性能动画
 * - 放在 Layout 层，只渲染一次，切换页面不重新初始化
 * - 根据路由自动显示/隐藏
 * - 鼠标互动效果：移动时与附近粒子连线
 */
export function Web3Background({
  excludePaths = ["/", "/admin"],
  particleCount = 50,
  primaryColor = "0, 212, 170", // RGB format for rgba()
  secondaryColor = "255, 215, 0",
  linkDistance = 150,
  mouseRadius = 200,
}: Web3BackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const configRef = useRef({
    primaryColor,
    secondaryColor,
    linkDistance,
    mouseRadius,
  });
  const pathname = usePathname();

  // 更新配置 ref
  useEffect(() => {
    configRef.current = {
      primaryColor,
      secondaryColor,
      linkDistance,
      mouseRadius,
    };
  }, [primaryColor, secondaryColor, linkDistance, mouseRadius]);

  // 检查当前路由是否应该显示背景 - 使用 useMemo 避免 effect 中 setState
  const isVisible = useMemo(() => {
    return !excludePaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
  }, [pathname, excludePaths]);

  // 主 Effect - 初始化和动画
  useEffect(() => {
    if (!isVisible) {
      // 隐藏时停止动画
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 初始化粒子
    const initParticles = (width: number, height: number) => {
      const particles: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2,
        });
      }
      particlesRef.current = particles;
    };

    // 动画循环
    const animate = () => {
      const {
        primaryColor: pc,
        secondaryColor: sc,
        linkDistance: ld,
        mouseRadius: mr,
      } = configRef.current;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      // 更新和绘制粒子
      particles.forEach((p, i) => {
        // 更新位置
        p.x += p.vx;
        p.y += p.vy;

        // 边界检测 - 平滑穿越
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // 绘制粒子
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pc}, ${p.opacity})`;
        ctx.fill();

        // 粒子间连线
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < ld) {
            const opacity = (1 - distance / ld) * 0.15;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${pc}, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        // 鼠标连线
        const mouseDx = p.x - mouse.x;
        const mouseDy = p.y - mouse.y;
        const mouseDistance = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);

        if (mouseDistance < mr) {
          const opacity = (1 - mouseDistance / mr) * 0.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          // 使用渐变色 - 靠近鼠标时偏金色
          const gradient = ctx.createLinearGradient(p.x, p.y, mouse.x, mouse.y);
          gradient.addColorStop(0, `rgba(${pc}, ${opacity})`);
          gradient.addColorStop(1, `rgba(${sc}, ${opacity * 0.8})`);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // 绘制鼠标光晕
      if (mouse.x > 0 && mouse.y > 0) {
        const gradient = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          mr * 0.5
        );
        gradient.addColorStop(0, `rgba(${sc}, 0.08)`);
        gradient.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, mr * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // 设置 Canvas 尺寸
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // 重新初始化粒子位置（仅首次）
      if (particlesRef.current.length === 0) {
        initParticles(canvas.width, canvas.height);
      }
    };

    // 鼠标移动处理
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    // 鼠标离开处理
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // 启动动画
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, particleCount]);

  if (!isVisible) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.8,
      }}
      aria-hidden="true"
    />
  );
}
