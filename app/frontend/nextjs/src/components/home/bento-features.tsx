'use client';

import React from 'react';
import { Shield, DollarSign, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * BentoFeatures 组件 - Bento Grid 布局的功能展示区
 * 
 * 配色方案更新:
 * - Security: #0066FF (深海蓝)
 * - Returns: #D4AF37 (古铜金)
 * - Global: #00C9A7 (青绿)
 * 
 * 布局: 左侧 2/3 宽度大卡片，右侧 1/3 宽度上下两个小卡片
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

interface Feature {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  iconColor: string;
  glowColor: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  size: 'large' | 'small';
}

const FEATURES: Feature[] = [
  {
    id: 'security',
    titleKey: 'home.features.security.title',
    descriptionKey: 'home.features.security.description',
    icon: <Shield className="w-8 h-8" />,
    iconColor: '#0066FF',  // 深海蓝
    glowColor: 'rgba(0, 102, 255, 0.2)',
    gradientFrom: 'rgba(0, 102, 255, 0.2)',
    gradientTo: 'rgba(0, 102, 255, 0.05)',
    borderColor: 'rgba(0, 102, 255, 0.3)',
    size: 'large',
  },
  {
    id: 'returns',
    titleKey: 'home.features.returns.title',
    descriptionKey: 'home.features.returns.description',
    icon: <DollarSign className="w-7 h-7" />,
    iconColor: '#D4AF37',  // 古铜金
    glowColor: 'rgba(212, 175, 55, 0.2)',
    gradientFrom: 'rgba(212, 175, 55, 0.2)',
    gradientTo: 'rgba(212, 175, 55, 0.05)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
    size: 'small',
  },
  {
    id: 'global',
    titleKey: 'home.features.global.title',
    descriptionKey: 'home.features.global.description',
    icon: <Globe className="w-7 h-7" />,
    iconColor: '#00C9A7',  // 青绿
    glowColor: 'rgba(0, 201, 167, 0.2)',
    gradientFrom: 'rgba(0, 201, 167, 0.2)',
    gradientTo: 'rgba(0, 201, 167, 0.05)',
    borderColor: 'rgba(0, 201, 167, 0.3)',
    size: 'small',
  },
];

interface BentoFeaturesProps {
  className?: string;
}

export function BentoFeatures({ className }: BentoFeaturesProps) {
  const { t } = useTranslation();

  const largeFeature = FEATURES.find(f => f.size === 'large')!;
  const smallFeatures = FEATURES.filter(f => f.size === 'small');

  return (
    <div
      className={cn(
        // Bento Grid 布局 - Requirements: 3.5
        'grid gap-6',
        // 桌面端: 2fr 1fr 布局
        'md:grid-cols-[2fr_1fr] md:grid-rows-2',
        // 移动端: 单列布局 - Requirements: 3.3
        'grid-cols-1',
        className
      )}
    >
      {/* 大卡片 - 安全性 (占两行) - Requirements: 3.2 */}
      <GlassCard
        className={cn(
          'p-8 md:p-10',
          // 桌面端占两行
          'md:row-span-2',
          'flex flex-col justify-between'
        )}
        glow
        glowColor={largeFeature.glowColor}
        enhanced
      >
        <div>
          {/* 图标 */}
          <div
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-6',
              'transition-transform duration-300 hover:scale-110'
            )}
            style={{ 
              background: `linear-gradient(135deg, ${largeFeature.gradientFrom} 0%, ${largeFeature.gradientTo} 100%)`,
              border: `1px solid ${largeFeature.borderColor}`,
              color: largeFeature.iconColor,
              boxShadow: `0 0 20px ${largeFeature.glowColor}`
            }}
          >
            {largeFeature.icon}
          </div>

          {/* 标题 - 使用 Display 字体 */}
          <h3 className="font-display text-2xl md:text-3xl font-semibold text-white mb-4">
            {t(largeFeature.titleKey)}
          </h3>

          {/* 描述 */}
          <p className="text-white/65 text-base md:text-lg leading-relaxed mb-6">
            {t(largeFeature.descriptionKey)}
          </p>
        </div>

        {/* 额外内容区域 - 可放置审计报告或盾牌图标 */}
        <div className="mt-auto pt-6 border-t border-white/10">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {['Certik', 'Hacken', 'Trail of Bits'].map((auditor) => (
                <div
                  key={auditor}
                  className="w-10 h-10 rounded-full bg-white/10 border-2 border-[var(--color-bg-card)] flex items-center justify-center text-xs font-medium text-white/70"
                  title={auditor}
                >
                  {auditor[0]}
                </div>
              ))}
            </div>
            <span className="text-white/50 text-sm">
              Audited by leading security firms
            </span>
          </div>
        </div>
      </GlassCard>

      {/* 小卡片 - 高收益 & 全球准入 */}
      {smallFeatures.map((feature) => (
        <GlassCard
          key={feature.id}
          className="p-6 md:p-8 flex flex-col"
          glow
          glowColor={feature.glowColor}
          enhanced
        >
          {/* 图标 */}
          <div
            className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center mb-5',
              'transition-transform duration-300 hover:scale-110'
            )}
            style={{ 
              background: `linear-gradient(135deg, ${feature.gradientFrom} 0%, ${feature.gradientTo} 100%)`,
              border: `1px solid ${feature.borderColor}`,
              color: feature.iconColor,
              boxShadow: `0 0 15px ${feature.glowColor}`
            }}
          >
            {feature.icon}
          </div>

          {/* 标题 - 使用 Display 字体 */}
          <h4 className="font-display text-xl font-semibold text-white mb-3">
            {t(feature.titleKey)}
          </h4>

          {/* 描述 */}
          <p className="text-white/65 leading-relaxed">
            {t(feature.descriptionKey)}
          </p>
        </GlassCard>
      ))}
    </div>
  );
}
