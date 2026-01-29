'use client'

import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { type KycStatus, kycStatusConfig, walletModalTokens } from './styles'

interface StatusBadgesProps {
  isAuthenticated: boolean
  kycStatus: KycStatus
  userTag?: string | null
}

/**
 * 状态徽章区域
 * - 认证状态（JWT 绑定）
 * - KYC 状态
 * - 用户 Tag（可选）
 */
export function StatusBadges({ isAuthenticated, kycStatus, userTag }: StatusBadgesProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 认证状态徽章 */}
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
          "transition-colors duration-200",
          isAuthenticated
            ? "bg-[#00D4AA]/15 text-[#00D4AA] border border-[#00D4AA]/30"
            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
        )}
      >
        <span>{isAuthenticated ? '✅' : '⏳'}</span>
        <span>
          {isAuthenticated 
            ? t('wallet.authenticated', '已认证') 
            : t('wallet.notAuthenticated', '未认证')
          }
        </span>
      </div>

      {/* KYC 状态徽章 */}
      {kycStatus && kycStatusConfig[kycStatus] && (
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
            "transition-colors duration-200",
            kycStatus === 'verified' && "bg-[#00D4AA]/15 text-[#00D4AA] border border-[#00D4AA]/30",
            kycStatus === 'pending' && "bg-amber-500/15 text-amber-400 border border-amber-500/30",
            kycStatus === 'rejected' && "bg-red-500/15 text-red-400 border border-red-500/30"
          )}
        >
          <span>{kycStatusConfig[kycStatus].icon}</span>
          <span>{t(`wallet.kyc.${kycStatus}`, kycStatusConfig[kycStatus].label)}</span>
        </div>
      )}

      {/* 用户 Tag 徽章 */}
      {userTag && (
        <div
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
            "bg-purple-500/15 text-purple-400 border border-purple-500/30"
          )}
        >
          <span>🏷️</span>
          <span>{userTag}</span>
        </div>
      )}
    </div>
  )
}
