'use client'

import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface KycGuideCardProps {
  onNavigateToKyc: () => void
}

/**
 * KYC 引导卡片
 * - 仅在 KYC 未完成时显示
 * - 引导用户完成 KYC 验证
 */
export function KycGuideCard({ onNavigateToKyc }: KycGuideCardProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-4",
        "bg-gradient-to-br from-amber-500/10 to-amber-500/5",
        "border border-amber-500/30",
        "transition-all duration-300",
        "hover:border-amber-500/50 hover:from-amber-500/15 hover:to-amber-500/10"
      )}
    >
      {/* 背景装饰 */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
      
      <div className="relative flex items-start gap-3">
        {/* 图标 */}
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white/90 mb-1">
            {t('wallet.kyc.guideTitle', '完成 KYC 解锁更多功能')}
          </h4>
          <p className="text-xs text-white/60 mb-3">
            {t('wallet.kyc.guideDescription', '通过身份验证后，即可参与资产投资')}
          </p>
          
          {/* 按钮 */}
          <button
            onClick={onNavigateToKyc}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
              "bg-amber-500/20 text-amber-400",
              "text-sm font-medium",
              "transition-all duration-200",
              "hover:bg-amber-500/30 hover:text-amber-300",
              "active:scale-[0.98]",
              "group"
            )}
          >
            <span>{t('wallet.kyc.goToKyc', '去完成 KYC')}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
