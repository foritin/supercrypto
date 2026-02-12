'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

/**
 * ════════════════════════════════════════════════════════════════
 * PARTNER DISCLAIMER - 合作伙伴免责声明
 * 
 * 用途: 在合作伙伴展示区域底部显示法律免责声明
 * 说明: 明确告知用户 Logo 仅用于识别，不暗示背书或合作
 * ════════════════════════════════════════════════════════════════
 */

export interface PartnerDisclaimerProps {
  /** 自定义类名 */
  className?: string;
  /** 变体：简短版或完整版 */
  variant?: 'short' | 'full';
}

export const PartnerDisclaimer: React.FC<PartnerDisclaimerProps> = ({
  className = '',
  variant = 'short',
}) => {
  const { t } = useTranslation();

  if (variant === 'short') {
    return (
      <div className={`text-center px-6 mt-6 ${className}`}>
        <p className="text-white/40 text-xs leading-relaxed m-0">
          {t('home.partners.disclaimer.short', 
            '* All logos and trademarks are the property of their respective owners. Their use here is for identification and informational purposes only.'
          )}{' '}
          <Link 
            href="/partners" 
            className="text-white/50 underline transition-colors duration-200 hover:text-white/70"
          >
            {t('home.partners.disclaimer.link', 'Learn more')}
          </Link>
        </p>
      </div>
    );
  }

  // 完整版（用于 Partners 页面）
  return (
    <div className={`text-center px-6 ${className}`}>
      <p className="text-white/40 text-xs leading-relaxed m-0">
        {t('partners.disclaimer.full',
          'All logos, trademarks, and brand names are the property of their respective owners. Their use here is for identification and informational purposes only, pursuant to nominative fair use principles.'
        )}
      </p>
    </div>
  );
};

export default PartnerDisclaimer;
