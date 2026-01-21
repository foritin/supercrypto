'use client'
import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES, type SupportedLanguage } from '@/config/i18n'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

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

  // 在 hydration 前显示骨架按钮，避免语言文本不匹配
  if (!isHydrated) {
    return <Skeleton className="w-20 h-8" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 gap-2"
          aria-label={ariaLabel || '切换语言'}
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
          {LANGUAGE_NAMES[i18n.language as SupportedLanguage] || 'Language'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[1100]">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className="cursor-pointer"
          >
            {i18n.language === lang && (
              <span className="text-green-500 mr-2">●</span>
            )}
            {LANGUAGE_NAMES[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

