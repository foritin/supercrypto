'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import './ServiceProviders.css';

/**
 * ════════════════════════════════════════════════════════════════
 * SERVICE PROVIDERS - 区块链生态合作伙伴展示
 * 
 * 特点:
 * - 深色背景 + 白色圆形 logo 容器
 * - 两行 logo，步进式滚动（非无限滚动）
 * - 定时自动切换，平滑过渡
 * ════════════════════════════════════════════════════════════════
 */

export interface ServiceProvider {
  id: string;
  name: string;
  logo: string;
}

// 第一行: Layer 1 区块链
export const ROW1_PROVIDERS: ServiceProvider[] = [
  { id: 'ethereum', name: 'Ethereum', logo: '/partners/ethereum.svg' },
  { id: 'solana', name: 'Solana', logo: '/partners/solana.svg' },
  { id: 'avalanche', name: 'Avalanche', logo: '/partners/avalanche.svg' },
  { id: 'hedera', name: 'Hedera', logo: '/partners/hedera.svg' },
  { id: 'aptos', name: 'Aptos', logo: '/partners/aptos.svg' },
  { id: 'sei', name: 'Sei', logo: '/partners/sei.svg' },
  { id: 'bnb', name: 'BNB Chain', logo: '/partners/bnb.svg' },
  { id: 'polkadot', name: 'Polkadot', logo: '/partners/polkadot.svg' },
  { id: 'cosmos', name: 'Cosmos', logo: '/partners/cosmos.svg' },
];

// 第二行: Layer 2 & 基础设施
export const ROW2_PROVIDERS: ServiceProvider[] = [
  { id: 'polygon', name: 'Polygon', logo: '/partners/polygon.svg' },
  { id: 'arbitrum', name: 'Arbitrum', logo: '/partners/arbitrum.svg' },
  { id: 'optimism', name: 'Optimism', logo: '/partners/optimism.svg' },
  { id: 'chainlink', name: 'Chainlink', logo: '/partners/chainlink.svg' },
  { id: 'frax', name: 'Frax', logo: '/partners/frax.svg' },
  { id: 'near', name: 'NEAR', logo: '/partners/near.svg' },
  { id: 'blackrock', name: 'BlackRock', logo: '/partners/blackrock.svg' },
  { id: 'vaneck', name: 'VanEck', logo: '/partners/vaneck.svg' },
];

interface ServiceProvidersProps {
  /** 标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 描述段落 */
  description?: string;
  /** 按钮文字 */
  ctaText?: string;
  /** 按钮链接 */
  ctaLink?: string;
  /** 自动滚动间隔(ms) */
  autoScrollInterval?: number;
  /** 可见的 logo 数量 */
  visibleCount?: number;
}

export const ServiceProviders: React.FC<ServiceProvidersProps> = ({
  title = 'Powered by Leading Blockchains',
  subtitle = 'Multi-chain support for maximum flexibility and security',
  description = 'Our platform integrates with the most trusted blockchain networks, providing seamless access to DeFi opportunities across multiple ecosystems.',
  ctaText = 'Explore Ecosystem',
  ctaLink = '/assets',
  autoScrollInterval = 2500,
  visibleCount = 5,
}) => {
  // 每行的滚动位置 index
  const [row1Index, setRow1Index] = useState(0);
  const [row2Index, setRow2Index] = useState(0);

  // Logo 尺寸 + 间距
  const itemSize = 100;
  const gap = 12;
  const itemTotalWidth = itemSize + gap;

  // 复制数组以实现无缝循环
  const row1Extended = [...ROW1_PROVIDERS, ...ROW1_PROVIDERS, ...ROW1_PROVIDERS, ...ROW1_PROVIDERS];
  const row2Extended = [...ROW2_PROVIDERS, ...ROW2_PROVIDERS, ...ROW2_PROVIDERS, ...ROW2_PROVIDERS];

  // 容器宽度
  const containerWidth = visibleCount * itemTotalWidth - gap;

  // 自动滚动
  const scrollRow1 = useCallback(() => {
    setRow1Index(prev => (prev + 1) % ROW1_PROVIDERS.length);
  }, []);

  const scrollRow2 = useCallback(() => {
    setRow2Index(prev => (prev + 1) % ROW2_PROVIDERS.length);
  }, []);

  useEffect(() => {
    const timer1 = setInterval(scrollRow1, autoScrollInterval);
    const timer2 = setInterval(scrollRow2, autoScrollInterval + 800); // 错开时间

    return () => {
      clearInterval(timer1);
      clearInterval(timer2);
    };
  }, [scrollRow1, scrollRow2, autoScrollInterval]);

  const renderLogoRow = (
    providers: ServiceProvider[],
    index: number
  ) => {
    const translateX = -index * itemTotalWidth;

    return (
      <div className="sp-row-wrapper" style={{ width: containerWidth }}>
        <div
          className="sp-row-track"
          style={{ 
            transform: `translateX(${translateX}px)`,
            gap: `${gap}px`
          }}
        >
          {providers.map((provider, i) => (
            <div key={`${provider.id}-${i}`} className="sp-logo-circle">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={provider.logo}
                alt={provider.name}
                className="sp-logo-img"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="service-providers">
      {/* 顶部分隔线 */}
      <div className="sp-divider" />
      
      <div className="sp-container">
        {/* Header */}
        <div className="sp-header">
          <span className="sp-label">BLOCKCHAIN ECOSYSTEM</span>
          <h2 className="sp-title">{title}</h2>
          <p className="sp-subtitle">{subtitle}</p>
        </div>

        {/* Logo Rows - 步进式滚动 */}
        <div className="sp-logos">
          {renderLogoRow(row1Extended, row1Index)}
          {renderLogoRow(row2Extended, row2Index)}
        </div>

        {/* Description */}
        <p className="sp-description">{description}</p>

        {/* CTA Button */}
        <Button
          size="lg"
          className="sp-cta-button bg-gradient-to-br from-[#00D4AA] to-[#00A080] text-[#0a0a0f] border-none rounded-[28px] px-8 h-12 text-[15px] font-semibold shadow-[0_4px_20px_rgba(0,212,170,0.3)] hover:translate-y-[-2px] hover:shadow-[0_6px_28px_rgba(0,212,170,0.4)] transition-all duration-300"
          asChild
        >
          <Link href={ctaLink}>
            {ctaText} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default ServiceProviders;
