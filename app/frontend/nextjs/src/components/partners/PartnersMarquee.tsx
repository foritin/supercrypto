'use client';

import React from 'react';
import Image from 'next/image';
import { Partner } from './partners-data';
import './PartnersMarquee.css';

/**
 * ════════════════════════════════════════════════════════════════
 * PARTNERS MARQUEE - 合作伙伴无限滚动墙
 * 
 * 用途: 展示金融机构/区块链生态合作伙伴，增强信任感
 * 特点: 无限滚动、hover 暂停、灰度/彩色切换
 * 
 * Usage:
 *   <PartnersMarquee
 *     title="Backed By Leading Institutions"
 *     partners={INSTITUTION_PARTNERS}
 *   />
 * ════════════════════════════════════════════════════════════════
 */

export interface PartnersMarqueeProps {
  /** 标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 合作伙伴列表 */
  partners: Partner[];
  /** 动画时长(秒)，默认 30 */
  speed?: number;
  /** 滚动方向 */
  direction?: 'left' | 'right';
  /** hover 时暂停 */
  pauseOnHover?: boolean;
  /** 默认灰度显示 */
  grayscale?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

export const PartnersMarquee: React.FC<PartnersMarqueeProps> = ({
  title,
  subtitle,
  partners,
  speed = 30,
  direction = 'left',
  pauseOnHover = true,
  grayscale = true,
  className = '',
  style,
}) => {
  // 复制一份用于无缝滚动
  const duplicatedPartners = [...partners, ...partners];

  return (
    <section
      className={`partners-marquee ${className}`}
      style={style}
    >
      <div className="partners-marquee__container">
        {/* Header */}
        {(title || subtitle) && (
          <div className="partners-marquee__header">
            {title && (
              <h3 className="partners-marquee__title">{title}</h3>
            )}
            {subtitle && (
              <p className="partners-marquee__subtitle">{subtitle}</p>
            )}
          </div>
        )}

        {/* Marquee Track */}
        <div
          className={`partners-marquee__wrapper ${pauseOnHover ? 'pause-on-hover' : ''}`}
        >
          <div
            className={`partners-marquee__track ${direction === 'right' ? 'reverse' : ''}`}
            style={{
              '--marquee-duration': `${speed}s`,
            } as React.CSSProperties}
          >
            {duplicatedPartners.map((partner, index) => (
              <div
                key={`${partner.id}-${index}`}
                className={`partners-marquee__item ${grayscale ? 'grayscale' : ''}`}
              >
                <Image
                  src={partner.logo}
                  alt={partner.name}
                  width={120}
                  height={40}
                  className="partners-marquee__logo"
                  style={{ objectFit: 'contain' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnersMarquee;
