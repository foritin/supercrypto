'use client'

/**
 * CookieConsent - GDPR Cookie 同意横幅组件
 *
 * 功能：
 * - 显示 Cookie 使用说明横幅
 * - 提供"接受全部"、"拒绝非必要"、"自定义设置"选项
 * - 详细设置弹窗，分类管理 Cookie
 * - 保存用户偏好到 localStorage
 * - 根据用户选择控制第三方脚本加载
 */

import { Cookie, X, ChevronRight, Shield, BarChart3, Target } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ============ 类型定义 ============

export type CookieCategory = 'necessary' | 'analytics' | 'marketing'

export interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  timestamp: number
}

export interface CookieConsentProps {
  /** 自定义类名 */
  className?: string
}

// ============ 常量 ============

const STORAGE_KEY = 'cookie_consent_preferences'
const CONSENT_SHOWN_KEY = 'cookie_consent_shown'

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true, // 必要的 Cookie 始终启用
  analytics: false,
  marketing: false,
  timestamp: Date.now(),
}

// ============ 辅助函数 ============

/**
 * 从 localStorage 加载偏好设置
 */
function loadPreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Failed to load cookie preferences:', error)
  }
  return null
}

/**
 * 保存偏好设置到 localStorage
 */
function savePreferences(preferences: CookiePreferences): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    localStorage.setItem(CONSENT_SHOWN_KEY, 'true')
  } catch (error) {
    console.warn('Failed to save cookie preferences:', error)
  }
}

/**
 * 检查是否已显示过同意横幅
 */
function hasConsentBeenShown(): boolean {
  if (typeof window === 'undefined') return false

  try {
    return localStorage.getItem(CONSENT_SHOWN_KEY) === 'true'
  } catch {
    return false
  }
}

// ============ 子组件 ============

interface CookieCategoryCardProps {
  icon: React.ReactNode
  title: string
  description: string
  required?: boolean
  enabled: boolean
  onToggle?: (enabled: boolean) => void
}

function CookieCategoryCard({
  icon,
  title,
  description,
  required = false,
  enabled,
  onToggle,
}: CookieCategoryCardProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl border',
        'bg-white/[0.02] border-white/[0.06]',
        'flex items-start gap-4'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
          required ? 'bg-primary/10 text-primary' : 'bg-white/5 text-white/60'
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className="font-medium text-white">{title}</h4>
          {required && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Required
            </span>
          )}
        </div>
        <p className="text-sm text-white/50">{description}</p>
      </div>
      <div className="flex-shrink-0">
        <Checkbox
          checked={enabled}
          disabled={required}
          className={cn(
            'w-5 h-5 rounded border-2',
            'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
            required && 'opacity-50 cursor-not-allowed'
          )}
          {...(onToggle ? { onCheckedChange: onToggle } : {})}
        />
      </div>
    </div>
  )
}

// ============ 主组件 ============

export function CookieConsent({ className }: CookieConsentProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES)
  const [tempPreferences, setTempPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES)

  // 初始化：检查是否已显示过
  useEffect(() => {
    const stored = loadPreferences()
    if (stored) {
      setPreferences(stored)
      setTempPreferences(stored)
    } else if (!hasConsentBeenShown()) {
      // 延迟显示，避免页面加载时立即弹出
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 1500)
      return () => clearTimeout(timer)
    }

    return undefined
  }, [])

  // 接受全部
  const handleAcceptAll = useCallback(() => {
    const newPreferences: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    }
    setPreferences(newPreferences)
    savePreferences(newPreferences)
    setIsVisible(false)
  }, [])

  // 拒绝非必要
  const handleRejectNonNecessary = useCallback(() => {
    const newPreferences: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    }
    setPreferences(newPreferences)
    savePreferences(newPreferences)
    setIsVisible(false)
  }, [])

  // 打开设置
  const handleOpenSettings = useCallback(() => {
    setTempPreferences(preferences)
    setShowSettings(true)
  }, [preferences])

  // 保存设置
  const handleSaveSettings = useCallback(() => {
    const newPreferences = {
      ...tempPreferences,
      timestamp: Date.now(),
    }
    setPreferences(newPreferences)
    savePreferences(newPreferences)
    setShowSettings(false)
    setIsVisible(false)
  }, [tempPreferences])

  // 关闭横幅（不保存）
  const handleDismiss = useCallback(() => {
    setIsVisible(false)
  }, [])

  // 如果没有显示，返回 null
  if (!isVisible) return null

  return (
    <>
      {/* 横幅 */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'animate-slide-up',
          className
        )}
      >
        <div
          className={cn(
            'mx-4 mb-4 p-4 sm:p-6 rounded-2xl',
            'bg-bg-card/95 backdrop-blur-xl',
            'border border-white/[0.08]',
            'shadow-2xl shadow-black/50',
            'max-w-[1200px] lg:mx-auto'
          )}
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
            {/* 左侧：图标和文案 */}
            <div className="flex items-start gap-4 flex-1">
              <div className="flex-shrink-0 p-2 rounded-xl bg-gold/10">
                <Cookie className="w-5 h-5 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white mb-1">
                  {t('cookieConsent.title', 'We use cookies')}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {t(
                    'cookieConsent.description',
                    'We use cookies to enhance your experience, analyze site traffic, and for marketing purposes. You can customize your preferences or accept all cookies.'
                  )}
                </p>
              </div>
            </div>

            {/* 右侧：按钮组 */}
            <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenSettings}
                className={cn(
                  'h-10 px-4',
                  'border-white/10 text-white/70 hover:text-white hover:bg-white/5',
                  'text-sm'
                )}
              >
                {t('cookieConsent.customize', 'Customize')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectNonNecessary}
                className={cn(
                  'h-10 px-4',
                  'border-white/10 text-white/70 hover:text-white hover:bg-white/5',
                  'text-sm'
                )}
              >
                {t('cookieConsent.reject', 'Reject Non-Essential')}
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className={cn(
                  'h-10 px-4',
                  'bg-primary hover:bg-primary/90 text-bg-dark',
                  'text-sm font-medium'
                )}
              >
                {t('cookieConsent.acceptAll', 'Accept All')}
              </Button>
            </div>

            {/* 关闭按钮（移动端隐藏） */}
            <button
              onClick={handleDismiss}
              className="hidden lg:flex flex-shrink-0 p-2 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 设置弹窗 */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5 text-gold" />
              {t('cookieConsent.settings.title', 'Cookie Preferences')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'cookieConsent.settings.description',
                'Customize your cookie preferences. Necessary cookies are always enabled as they are essential for the website to function properly.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {/* 必要 Cookie */}
            <CookieCategoryCard
              icon={<Shield className="w-5 h-5" />}
              title={t('cookieConsent.categories.necessary.title', 'Necessary')}
              description={t(
                'cookieConsent.categories.necessary.description',
                'Essential for the website to function properly. These cannot be disabled.'
              )}
              required={true}
              enabled={tempPreferences.necessary}
            />

            {/* 分析 Cookie */}
            <CookieCategoryCard
              icon={<BarChart3 className="w-5 h-5" />}
              title={t('cookieConsent.categories.analytics.title', 'Analytics')}
              description={t(
                'cookieConsent.categories.analytics.description',
                'Help us understand how visitors interact with our website by collecting and reporting information anonymously.'
              )}
              enabled={tempPreferences.analytics}
              onToggle={(enabled) =>
                setTempPreferences((prev) => ({ ...prev, analytics: enabled }))
              }
            />

            {/* 营销 Cookie */}
            <CookieCategoryCard
              icon={<Target className="w-5 h-5" />}
              title={t('cookieConsent.categories.marketing.title', 'Marketing')}
              description={t(
                'cookieConsent.categories.marketing.description',
                'Used to track visitors across websites to display relevant and engaging advertisements.'
              )}
              enabled={tempPreferences.marketing}
              onToggle={(enabled) =>
                setTempPreferences((prev) => ({ ...prev, marketing: enabled }))
              }
            />
          </div>

          {/* 底部按钮 */}
          <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setShowSettings(false)}
              className="flex-1 h-11 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleSaveSettings}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-bg-dark font-medium"
            >
              {t('cookieConsent.settings.save', 'Save Preferences')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CookieConsent

// 导出工具函数供其他组件使用
export { loadPreferences, savePreferences, DEFAULT_PREFERENCES }
