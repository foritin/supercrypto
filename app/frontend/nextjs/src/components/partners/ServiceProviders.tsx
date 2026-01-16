'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import './ServiceProviders.css';

/**
 * ════════════════════════════════════════════════════════════════
 * SERVICE PROVIDERS - Securitize 风格合作伙伴展示
 * 
 * 特点:
 * - 浅色背景 + 白色圆形 logo 容器
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
  { id: 'polkadot', name: 'Polkadot', logo: '/partners/polkadot.svg' },
  { id: 'cosmos', name: 'Cosmos', logo: '/partners/cosmos.svg' },
  { id: 'near', name: 'NEAR', logo: '/partners/near.svg' },
];

// 第二行: Layer 2 & 基础设施
export const ROW2_PROVIDERS: ServiceProvider[] = [
  { id: 'polygon', name: 'Polygon', logo: '/partners/polygon.svg' },
  { id: 'arbitrum', name: 'Arbitrum', logo: '/partners/arbitrum.svg' },
  { id: 'optimism', name: 'Optimism', logo: '/partners/optimism.svg' },
  { id: 'bnb', name: 'BNB Chain', logo: '/partners/bnb.svg' },
  { id: 'chainlink', name: 'Chainlink', logo: '/partners/chainlink.svg' },
  { id: 'aptos', name: 'Aptos', logo: '/partners/aptos.svg' },
];

interface ServiceProvidersProps {
  /** 标签文字 */
  label?: string;
  /** 标题第一行 */
  title?: string;
  /** 标题第二行 */
  titleLine2?: string;
  /** 描述段落1 */
  description1?: string;
  /** 描述段落2 */
  description2?: string;
  /** 按钮文字 */
  ctaText?: string;
  /** 按钮链接 */
  ctaLink?: string;
  /** 自动滚动间隔(ms) */
  autoScrollInterval?: number;
  /** 每次滚动的 logo 数量 */
  scrollStep?: number;
  /** 可见的 logo 数量 */
  visibleCount?: number;
}

export const ServiceProviders: React.FC<ServiceProvidersProps> = ({
  label = 'Partners',
  title = 'Best-in-class Service Providers,',
  titleLine2 = 'United by a Shared Mission.',
  description1 = 'The Securitize Ecosystem represents a strategic alliance of premier partners committed to advancing our mission. This network includes top-tier providers across liquidity, custody, and essential onchain infrastructure.',
  description2 = "Through these partnerships, we're able to provide a truly comprehensive platform to provide our clients with access to top-tier solutions that support their success.",
  ctaText = 'Explore Ecosystem',
  ctaLink = '/partners',
  autoScrollInterval = 3000,
  scrollStep = 1,
  visibleCount = 5,
}) => {
  // 每行的滚动位置 index
  const [row1Index, setRow1Index] = useState(0);
  const [row2Index, setRow2Index] = useState(0);

  // Logo 尺寸 + 间距
  const itemSize = 100; // 100px
  const gap = 8; // 8px gap
  const itemTotalWidth = itemSize + gap;

  // 复制数组以实现无缝循环
  const row1Extended = [...ROW1_PROVIDERS, ...ROW1_PROVIDERS, ...ROW1_PROVIDERS, ...ROW1_PROVIDERS];
  const row2Extended = [...ROW2_PROVIDERS, ...ROW2_PROVIDERS, ...ROW2_PROVIDERS, ...ROW2_PROVIDERS];

  // 容器宽度 = 可见数量 * (item宽度 + gap) - gap
  const containerWidth = visibleCount * itemTotalWidth - gap;

  // 自动滚动
  const scrollRow1 = useCallback(() => {
    setRow1Index(prev => (prev + scrollStep) % ROW1_PROVIDERS.length);
  }, [scrollStep]);

  const scrollRow2 = useCallback(() => {
    setRow2Index(prev => (prev + scrollStep) % ROW2_PROVIDERS.length);
  }, [scrollStep]);

  useEffect(() => {
    const timer1 = setInterval(scrollRow1, autoScrollInterval);
    const timer2 = setInterval(scrollRow2, autoScrollInterval + 500); // 错开半秒

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
          style={{ transform: `translateX(${translateX}px)` }}
        >
          {providers.map((provider, i) => (
            <div key={`${provider.id}-${i}`} className="sp-logo-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={provider.logo}
                alt={provider.name}
                className="sp-logo"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="service-providers">
      <div className="sp-content">
        {/* Label */}
        <span className="sp-label">{label}</span>

        {/* Title */}
        <h2 className="sp-title">
          {title}
          <br />
          {titleLine2}
        </h2>

        {/* Logo Rows */}
        <div className="sp-logos">
          {renderLogoRow(row1Extended, row1Index)}
          {renderLogoRow(row2Extended, row2Index)}
        </div>

        {/* Description */}
        <div className="sp-description">
          <p>{description1}</p>
          <p>{description2}</p>
        </div>

        {/* CTA Button */}
        <Button
          type="primary"
          size="large"
          className="sp-cta-button"
          href={ctaLink}
        >
          {ctaText} <ArrowRightOutlined />
        </Button>
      </div>
    </section>
  );
};

export default ServiceProviders;
