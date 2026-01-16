'use client'
import { useState, useEffect } from 'react'
import { Dropdown, Button, Skeleton } from 'antd'
import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES, type SupportedLanguage } from '@/config/i18n'

export function LanguageSwitcher({ ariaLabel }: { ariaLabel?: string }) {
  const { i18n } = useTranslation()

  // 用于避免 hydration 不匹配 - 语言在服务端/客户端可能不同步
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const handleLanguageChange = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang)
  }

  const menuItems = SUPPORTED_LANGUAGES.map((lang) => ({
    key: lang,
    label: (
      <span>
        {i18n.language === lang && <span style={{ color: '#52c41a', marginRight: 8 }}>●</span>}
        {LANGUAGE_NAMES[lang]}
      </span>
    ),
    onClick: () => handleLanguageChange(lang),
  }))

  // 在 hydration 前显示骨架按钮，避免语言文本不匹配
  if (!isHydrated) {
    return (
      <Skeleton.Button active style={{ width: 80, height: 32 }} />
    )
  }

  return (
    <Dropdown 
      menu={{ items: menuItems }} 
      trigger={['click']}
      getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
      popupRender={(menu) => (
        <div style={{ zIndex: 1100 }}>{menu}</div>
      )}
    >
      <Button
        type="text"
        icon={<Globe width={16} height={16} aria-hidden="true" />}
        style={{ height: 32 }}
        aria-label={ariaLabel || "切换语言"}
      >
        {LANGUAGE_NAMES[i18n.language as SupportedLanguage] || 'Language'}
      </Button>
    </Dropdown>
  )
}

