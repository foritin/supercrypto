'use client';

import Image from 'next/image';
import React from 'react';

import { PartnerDisclaimer } from './partner-disclaimer';
import type { Partner } from './partners-data';
import './partners-marquee.css';

/**
 * ════════════════════════════════════════════════════════════════
 * PARTNERS MARQUEE - 合作伙伴无限滚动墙
 *
 * 用途: 展示金融机构/区块链生态合作伙伴
 * 特点: 无限滚动、hover 暂停、灰度/彩色切换
 * 合规: 包含免责声明，明确 Logo 使用目的
 * ════════════════════════════════════════════════════════════════
 */

export interface PartnersMarqueeProps {
  /** 标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 合作伙伴列表 */
  partners: Partner[];
  /** 动画时长(秒)，默认 35 */
  speed?: number;
  /** 滚动方向 */
  direction?: 'left' | 'right';
  /** hover 时暂停 */
  pauseOnHover?: boolean;
  /** 默认灰度显示 */
  grayscale?: boolean;
  /** 显示免责声明 */
  showDisclaimer?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

export const PartnersMarquee: React.FC<PartnersMarqueeProps> = ({
  title,
  subtitle,
  partners,
  speed = 35,
  direction = 'left',
  pauseOnHover = true,
  grayscale = true,
  showDisclaimer = true,
  className = '',
  style,
}) => {
  // 复制一份用于无缝滚动
  const duplicatedPartners = [...partners, ...partners];

  return (
    <section
      className={`py-12 md:py-10 sm:py-8 bg-[linear-gradient(180deg,rgba(0,212,170,0.03)_0%,rgba(0,0,0,0.3)_50%,rgba(0,212,170,0.03)_100%)] border-t border-b border-primary/10 overflow-hidden ${className}`}
      style={style}
    >
      <div className="max-w-[1400px] mx-auto">
        {/* 标题区域 */}
        {(title || subtitle) && (
          <div className="text-center mb-10 md:mb-8 sm:mb-6 px-6">
            {title && (
              <h3 className="text-white/70 text-sm sm:text-xs font-semibold tracking-[1.5px] uppercase m-0 mb-2">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-white/45 text-[13px] m-0">{subtitle}</p>
            )}
          </div>
        )}

        {/* 滚动轨道 */}
        <div
          className={`partners-marquee__wrapper relative overflow-hidden ${pauseOnHover ? 'pause-on-hover' : ''}`}
        >
          <div
            className={`partners-marquee__track flex gap-20 md:gap-15 sm:gap-10 w-max ${direction === 'right' ? 'reverse' : ''}`}
            style={{
              '--marquee-duration': `${speed}s`,
            } as React.CSSProperties}
          >
            {duplicatedPartners.map((partner, index) => (
              <div
                key={`${partner.id}-${index}`}
                className="shrink-0 flex items-center justify-center px-4 py-2 transition-all duration-300 group"
                title={partner.name}
              >
                <Image
                  src={partner.logo}
                  alt={partner.name}
                  width={120}
                  height={40}
                  style={{ width: 'auto' }}
                  className={`h-8 md:h-7 sm:h-6 max-w-[140px] md:max-w-[120px] sm:max-w-[100px] object-contain transition-all duration-300 ${
                    grayscale
                      ? 'brightness-0 invert opacity-60 group-hover:opacity-100 group-hover:scale-[1.08]'
                      : ''
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 免责声明 */}
        {showDisclaimer && (
          <PartnerDisclaimer variant="short" />
        )}
      </div>
    </section>
  );
};

export default PartnersMarquee;
