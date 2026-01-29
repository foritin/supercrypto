'use client'

/**
 * KYC 页面
 *
 * 根据用户 KYC 状态显示不同内容：
 * - 未连接钱包：显示连接钱包提示
 * - not_started/rejected：显示状态卡片，点击按钮进入向导
 * - pending/approved：仅显示状态卡片
 *
 * @validates Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { KycStatusCard } from '@/components/kyc/kyc-status-card'
import { KycWizard } from '@/components/kyc/kyc-wizard'
import { useKycStatus } from '@/hooks/use-kyc-status'
import { KycStatus } from '@/services/kyc'

/**
 * 页面视图状态
 * - status: 显示状态卡片
 * - wizard: 显示 KYC 向导
 */
type ViewState = 'status' | 'wizard'

export default function KycPage() {
  const { t } = useTranslation()
  const { isConnected } = useAccount()
  const { status, refetch } = useKycStatus()

  // 视图状态管理
  const [viewState, setViewState] = useState<ViewState>('status')

  /**
   * 处理开始 KYC 认证
   * Requirements 1.2, 1.5: 点击"开始认证"或"重新申请"后进入向导
   */
  const handleStartKyc = useCallback(() => {
    setViewState('wizard')
  }, [])

  /**
   * 处理向导完成
   * 刷新状态并返回状态视图
   */
  const handleWizardComplete = useCallback(() => {
    refetch()
    setViewState('status')
  }, [refetch])

  /**
   * 处理向导取消
   * 返回状态视图
   */
  const handleWizardCancel = useCallback(() => {
    setViewState('status')
  }, [])

  /**
   * 处理返回状态视图
   */
  const handleBackToStatus = useCallback(() => {
    setViewState('status')
  }, [])

  // 判断是否可以进入向导
  // Requirements 1.2, 1.5: 未开始或被拒绝状态可以进入向导
  const canStartWizard = status === KycStatus.NOT_STARTED || status === KycStatus.REJECTED

  return (
    <div className={cn(
      'min-h-screen',
      // Mobile: 紧凑内边距，单列布局
      'py-4 px-3',
      // Tablet: 适中内边距
      'sm:py-6 sm:px-4',
      // Desktop: 宽松内边距
      'md:py-8 md:px-6',
      'lg:px-8'
    )}>
      {/* 
        Requirements 8.2: 桌面端居中卡片布局，最大宽度 600px
        使用 max-w-[600px] 确保桌面端居中显示
      */}
      <div className="w-full max-w-[600px] mx-auto">
        {/* 页面标题 */}
        <div className="mb-6 sm:mb-8">
          {viewState === 'wizard' ? (
            // 向导模式：显示返回按钮
            // Mobile: 垂直堆叠布局
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToStatus}
                // Requirements 8.3: 触摸目标尺寸优化 - 最小 44x44px
                className="gap-2 text-white/60 hover:text-white min-h-[44px] min-w-[44px] self-start"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('common.back')}
              </Button>
              <div>
                {/* Mobile: 较小标题，Desktop: 正常标题 */}
                <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3">
                  <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-[#00D4AA]" />
                  {t('kyc.wizard.title')}
                </h1>
                <p className="text-sm sm:text-base text-white/60 mt-1">
                  {t('kyc.wizard.description')}
                </p>
              </div>
            </div>
          ) : (
            // 状态模式：显示页面标题
            <div>
              {/* Mobile: 较小标题，Desktop: 正常标题 */}
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3">
                <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-[#00D4AA]" />
                {t('kyc.pageTitle')}
              </h1>
              <p className="text-sm sm:text-base text-white/60 mt-1">
                {t('kyc.pageDescription')}
              </p>
            </div>
          )}
        </div>

        {/* 主内容区域 */}
        <div
          className={cn(
            'transition-all duration-300 ease-out',
            viewState === 'wizard' ? 'opacity-100' : 'opacity-100'
          )}
        >
          {viewState === 'wizard' ? (
            // 显示 KYC 向导
            <KycWizard
              onComplete={handleWizardComplete}
              onCancel={handleWizardCancel}
              className="shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
            />
          ) : (
            // 显示 KYC 状态卡片
            <div
              className={cn(
                'bg-[rgba(17,25,22,0.8)] backdrop-blur-[12px]',
                'rounded-2xl border border-white/[0.08]',
                'shadow-[0_4px_16px_rgba(0,0,0,0.3)]',
                'overflow-hidden'
              )}
            >
              <KycStatusCard
                onStartKyc={canStartWizard ? handleStartKyc : undefined}
              />
            </div>
          )}
        </div>

        {/* 底部说明 - 仅在状态视图显示 */}
        {viewState === 'status' && isConnected && (
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-xs sm:text-sm text-white/40">
              {t('kyc.footer.helpText')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
