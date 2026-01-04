'use client';

import React from 'react';

/**
 * ════════════════════════════════════════════════════════════════
 * V6 BACKGROUND - 高级深邃背景 (Phase 2 增强)
 * 特点: Unsplash图片 + 渐变叠加 + 动态光球 + 浮动粒子 + 网格纹理
 * ════════════════════════════════════════════════════════════════
 */

export const V6Background: React.FC = () => {
  return (
    <>
      {/* 背景容器 - z-index: -10 */}
      <div className="premium-bg-layer">
        {/* Layer 1: 基础图片 + 深度叠加 */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(180deg,
                rgba(10, 10, 15, 0.85) 0%,
                rgba(10, 10, 15, 0.92) 40%,
                rgba(10, 10, 15, 0.96) 70%,
                rgba(10, 10, 15, 1) 100%
              ),
              url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1920&q=80') center top/cover no-repeat
            `,
            filter: 'contrast(1.1) saturate(1.2)',
          }}
        />

        {/* Layer 2: 动态光球 - 金色 (左上) */}
        <div
          className="absolute w-[600px] h-[600px] -top-[200px] -left-[200px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(201, 169, 98, 0.15) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'floatOrb1 30s ease-in-out infinite',
          }}
        />

        {/* Layer 2: 动态光球 - 青色 (右下) */}
        <div
          className="absolute w-[500px] h-[500px] -bottom-[150px] -right-[150px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(0, 212, 170, 0.12) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'floatOrb2 25s ease-in-out infinite reverse',
          }}
        />

        {/* Layer 3: 网格纹理 */}
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 212, 170, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 212, 170, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Layer 4: 浮动粒子 (9个) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-[2px] h-[2px] rounded-full"
              style={{
                left: `${10 + i * 10}%`,
                background: 'radial-gradient(circle, rgba(0, 212, 170, 1) 0%, transparent 70%)',
                animation: `floatParticle ${15 + i * 2}s linear infinite`,
                animationDelay: `${i * 2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Layer 5: 顶部光流 - 移除持续动画，改为触发式 */}
      {/* 触发式光流现在由独立组件管理，仅在关键时刻显示 */}

      {/* 内联样式动画关键帧 */}
      <style>{`
        @keyframes floatOrb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(100px, 150px) scale(1.1); }
          66% { transform: translate(50px, 100px) scale(0.9); }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-80px, -120px) scale(1.15); }
          66% { transform: translate(-40px, -80px) scale(0.85); }
        }
        @keyframes floatParticle {
          0% {
            transform: translateY(100vh) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% {
            transform: translateY(-100vh) translateX(50px) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};
