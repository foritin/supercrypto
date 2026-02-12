'use client'

/**
 * CookieSettingsButton - Cookie 设置按钮
 *
 * 允许用户在同意横幅关闭后，仍然可以修改 Cookie 偏好设置
 * 通常放在 Footer 或隐私设置页面
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cookie, Shield, BarChart3, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  loadPreferences,
  savePreferences,
  DEFAULT_PREFERENCES,
  type CookiePreferences,
} from './cookie-consent'

// ============ 类型定义 ============

export interface CookieSettingsButtonProps {
  /** 自定义类名 */
  className?: string
  /** 按钮变体 */
  variant?: 'default' | 'outline' | 'ghost'
  /** 按钮大小 */
  size?: 'default' | 'sm' | 'lg' | 'icon'
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
          onCheckedChange={onToggle}
          className={cn(
            'w-5 h-5 rounded border-2',
            'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
            required && 'opacity-50 cursor-not-allowed'
          )}
        />
      </div>
    </div>
  )
}

// ============ 主组件 ============

export function CookieSettingsButton({
  className,
  variant = 'ghost',
  size = 'sm',
}: CookieSettingsButtonProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES)

  // 打开设置时加载当前偏好
  const handleOpen = () => {
    const stored = loadPreferences()
    if (stored) {
      setPreferences(stored)
    }
    setIsOpen(true)
  }

  // 保存设置
  const handleSave = () => {
    const newPreferences = {
      ...preferences,
      timestamp: Date.now(),
    }
    savePreferences(newPreferences)
    setIsOpen(false)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpen}
        className={cn(
          'text-white/60 hover:text-white hover:bg-white/5',
          'gap-2',
          className
        )}
      >
        <Cookie className="w-4 h-4" />
        {t('cookieConsent.settingsButton', 'Cookie Settings')}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
              enabled={preferences.necessary}
            />

            {/* 分析 Cookie */}
            <CookieCategoryCard
              icon={<BarChart3 className="w-5 h-5" />}
              title={t('cookieConsent.categories.analytics.title', 'Analytics')}
              description={t(
                'cookieConsent.categories.analytics.description',
                'Help us understand how visitors interact with our website by collecting and reporting information anonymously.'
              )}
              enabled={preferences.analytics}
              onToggle={(enabled) =>
                setPreferences((prev) => ({ ...prev, analytics: enabled }))
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
              enabled={preferences.marketing}
              onToggle={(enabled) =>
                setPreferences((prev) => ({ ...prev, marketing: enabled }))
              }
            />
          </div>

          {/* 底部按钮 */}
          <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1 h-11 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleSave}
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

export default CookieSettingsButton
