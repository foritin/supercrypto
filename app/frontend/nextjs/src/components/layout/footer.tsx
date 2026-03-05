'use client'

import { Github, Twitter, Globe } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { CookieSettingsButton } from '@/components/cookie-consent'

/**
 * Footer 组件 - 使用 Tailwind CSS 布局
 * 
 * 更新：
 * - 添加法律合规页面链接（Privacy, Terms, Risk Disclosure）
 * - 添加 Partners 页面链接
 * - 添加 Cookie Settings 按钮
 * - 保留社交链接和版权信息
 */
export function Footer() {
  const { t } = useTranslation()
  // 避免 hydration 不匹配，在客户端设置年份
  const [currentYear, setCurrentYear] = useState<number | null>(null)

  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
  }, [])

  return (
    <footer
      className="border-t"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* 品牌区域 */}
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-white">SuperCrypto</h3>
            <p className="text-sm text-muted-foreground">
              {t('footer.tagline', 'Institutional-grade RWA investment platform')}
            </p>
            {/* 社交链接 */}
            <div className="flex gap-4 mt-2">
              <Link
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" aria-hidden="true" />
              </Link>
              <Link
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" aria-hidden="true" />
              </Link>
              <Link
                href="/"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="网站首页"
              >
                <Globe className="w-5 h-5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* 快速链接 */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
              {t('footer.quickLinks', 'Quick Links')}
            </h4>
            <div className="flex flex-col gap-2">
              <Link 
                href="/assets" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t('footer.assets', 'Assets')}
              </Link>
              <Link 
                href="/portfolio" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t('footer.portfolio', 'Portfolio')}
              </Link>
              <Link 
                href="/partners" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t('footer.partners', 'Partners')}
              </Link>
            </div>
          </div>

          {/* 法律合规链接 */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
              {t('footer.legal', 'Legal')}
            </h4>
            <div className="flex flex-col gap-2">
              <Link 
                href="/risk-disclosure" 
                className="text-sm text-muted-foreground hover:text-gold transition-colors"
              >
                {t('footer.riskDisclosure', 'Risk Disclosure')}
              </Link>
              <Link 
                href="/terms" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t('footer.terms', 'Terms of Service')}
              </Link>
              <Link 
                href="/privacy" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t('footer.privacy', 'Privacy Policy')}
              </Link>
            </div>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-white/10 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* 版权信息 */}
            <p className="text-xs text-muted-foreground">
              © {currentYear ?? '2026'} SuperCrypto. {t('footer.rights', 'All rights reserved.')}
            </p>
            
            {/* 额外链接 */}
            <div className="flex items-center gap-4">
              <Link 
                href="/risk-disclosure" 
                className="text-xs text-gold/70 hover:text-gold transition-colors flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                {t('footer.investmentRisk', 'Investment involves risk')}
              </Link>
              <CookieSettingsButton variant="ghost" size="sm" className="text-xs text-white/40 hover:text-white/60" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
