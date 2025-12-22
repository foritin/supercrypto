'use client';

import React from 'react';

/**
 * ════════════════════════════════════════════════════════════════
 * PREMIUM V5 BACKGROUND - 高级深邃背景
 * 特点: Unsplash图片 + 渐变叠加 + 微妙光晕 + 网格纹理
 * ════════════════════════════════════════════════════════════════
 */

export const PremiumV5Background: React.FC = () => {
  return (
    <div className="premium-bg-layer">
      {/* 主背景图片 + 深色叠加 */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg, 
              rgba(10, 10, 15, 0.8) 0%, 
              rgba(10, 10, 15, 0.88) 30%,
              rgba(10, 10, 15, 0.94) 60%,
              rgba(10, 10, 15, 1) 100%
            ),
            url('https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1920&q=80') center top/cover no-repeat
          `,
        }}
      />

      {/* 金色光晕 - 左上 */}
      <div className="premium-bg-glow-1" />

      {/* 青色光晕 - 右下 */}
      <div className="premium-bg-glow-2" />

      {/* 微妙网格 */}
      <div className="premium-bg-grid" />

      {/* 顶部渐变边缘 */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(201, 169, 98, 0.3), transparent)',
        }}
      />
    </div>
  );
};

