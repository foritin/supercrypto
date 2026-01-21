'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Github, Twitter, Globe } from 'lucide-react'
import Link from 'next/link'

/**
 * Footer 组件 - 使用 Tailwind CSS 布局
 * 
 * 迁移说明：
 * - 替换 Ant Design Layout.Footer 为 Tailwind footer 元素
 * - 替换 Ant Design Typography 为原生 HTML + Tailwind
 * - 替换 Ant Design Flex 为 Tailwind flex 布局
 * - 保留响应式设计和 Web3 主题风格
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
      className="text-center py-6 px-12 border-t"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex flex-col gap-2 items-center">
        {/* 社交链接 */}
        <div className="flex gap-6">
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
        
        {/* 版权信息 */}
        <p className="text-xs text-muted-foreground">
          © {currentYear ?? '2025'} SlimCrypto. {t('footer.rights')}
        </p>
      </div>
    </footer>
  )
}
