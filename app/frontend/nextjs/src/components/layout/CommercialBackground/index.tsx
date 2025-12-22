'use client';

import React from 'react';

/**
 * ════════════════════════════════════════════════════════════════
 * COMMERCIAL BACKGROUND - 商业化背景
 * 设计参考: Ulfry Dashboard
 * 特点: 深色渐变 + 极简 + 专业
 * ════════════════════════════════════════════════════════════════
 */

export const CommercialBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* 主背景 - 深紫黑渐变 */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at top, #1a1929 0%, #0f0e1c 100%)',
        }}
      />

      {/* 微妙的光晕效果 - 左上 */}
      <div
        className="absolute -top-40 -left-40 w-80 h-80 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #6c5dd3 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* 微妙的光晕效果 - 右下 */}
      <div
        className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, #00d4aa 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* 微妙的网格纹理 */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
};

