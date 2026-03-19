'use client';

import { X, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/**
 * ════════════════════════════════════════════════════════════════
 * GLOBAL RISK DISCLAIMER - 全局风险免责声明
 * 
 * 用途: 在全站显示投资风险提示，符合金融监管要求
 * 行为: 用户点击 Accept 或关闭后，使用 localStorage 记住选择
 * 位置: 固定在页面底部
 * ════════════════════════════════════════════════════════════════
 */

const STORAGE_KEY = 'riskDisclaimerAccepted';

export interface GlobalRiskDisclaimerProps {
  /** 自定义类名 */
  className?: string;
  /** 位置：顶部或底部 */
  position?: 'top' | 'bottom';
  /** 过期时间（天数），默认 30 天 */
  expiryDays?: number;
}

export const GlobalRiskDisclaimer: React.FC<GlobalRiskDisclaimerProps> = ({
  className = '',
  position = 'bottom',
  expiryDays = 30,
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 客户端挂载后检查 localStorage
  useEffect(() => {
    setIsMounted(true);
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { accepted, timestamp } = JSON.parse(stored);
        const expiryTime = timestamp + expiryDays * 24 * 60 * 60 * 1000;
        
        // 检查是否过期
        if (Date.now() > expiryTime) {
          localStorage.removeItem(STORAGE_KEY);
          setIsVisible(true);
        } else if (!accepted) {
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }
    } catch {
      // 如果 localStorage 不可用，显示免责声明
      setIsVisible(true);
    }
  }, [expiryDays]);

  const handleAccept = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ accepted: true, timestamp: Date.now() })
      );
    } catch {
      // 忽略 localStorage 错误
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    // 用户关闭但不接受，下次还会显示
    setIsVisible(false);
  };

  // 服务端渲染时不显示，避免 hydration 不匹配
  if (!isMounted || !isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50',
        'bg-bg-dark/95 backdrop-blur-md',
        'border border-yellow-500/20',
        'shadow-lg shadow-black/20',
        'animate-slide-up',
        position === 'top' ? 'top-0' : 'bottom-0',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-start gap-3">
          {/* 图标 */}
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-yellow-200/90 leading-relaxed">
              {t(
                'compliance.riskDisclaimer.message',
                'Cryptocurrency investments carry significant risks. Past performance does not guarantee future results. Please ensure you understand the risks before investing.'
              )}
              {' '}
              <Link
                href="/risk-disclosure"
                className="underline hover:text-yellow-100 transition-colors"
              >
                {t('compliance.riskDisclaimer.learnMore', 'Learn more')}
              </Link>
            </p>
          </div>

          {/* 按钮组 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleAccept}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md',
                'bg-yellow-500/20 text-yellow-200',
                'hover:bg-yellow-500/30',
                'border border-yellow-500/30',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-yellow-500/50'
              )}
            >
              {t('compliance.riskDisclaimer.accept', 'I Understand')}
            </button>

            <button
              onClick={handleDismiss}
              className={cn(
                'p-1.5 rounded-md',
                'text-yellow-200/60 hover:text-yellow-200',
                'hover:bg-yellow-500/10',
                'transition-colors',
                'focus:outline-none'
              )}
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalRiskDisclaimer;
