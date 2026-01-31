'use client'

/**
 * KYC 页面（优化版）
 *
 * 根据用户 KYC 状态显示不同内容：
 * - 未连接钱包：显示连接钱包提示
 * - not_started/rejected：显示状态卡片，点击按钮进入向导
 * - pending/approved：仅显示状态卡片
 *
 * 优化功能：
 * - 添加步骤预览卡片
 * - 添加进度恢复提示
 * - 优化视图切换动画
 */

import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'
import { ArrowLeft, X, Wallet } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { KycStatusCard } from '@/components/kyc/kyc-status-card'
import { KycWizard } from '@/components/kyc/kyc-wizard'
import { KycStepPreview } from '@/components/kyc/kyc-step-preview'
import { KycProgressRestore } from '@/components/kyc/kyc-progress-restore'
import { useKycStatus } from '@/hooks/use-kyc-status'
import { KycStatus } from '@/services/kyc'

/**
 * 页面视图状态
 * - status: 显示状态卡片
 * - preview: 显示步骤预览
 * - wizard: 显示 KYC 向导
 */
type ViewState = 'status' | 'preview' | 'wizard'

export default function KycPage() {
  const { t } = useTranslation()
  const { isConnected } = useAccount()
  const { status, refetch } = useKycStatus()

  // 视图状态管理
  const [viewState, setViewState] = useState<ViewState>('status')
  const [initialWizardStep, setInitialWizardStep] = useState(0)

  /**
   * 处理开始 KYC 认证 - 显示预览
   */
  const handleStartKyc = useCallback(() => {
    setViewState('preview')
  }, [])

  /**
   * 处理从预览进入向导
   */
  const handleEnterWizard = useCallback(() => {
    setViewState('wizard')
  }, [])

  /**
   * 处理向导完成
   */
  const handleWizardComplete = useCallback(() => {
    refetch()
    setViewState('status')
    setInitialWizardStep(0)
  }, [refetch])

  /**
   * 处理向导取消
   */
  const handleWizardCancel = useCallback(() => {
    setViewState('status')
    setInitialWizardStep(0)
  }, [])

  /**
   * 处理返回状态视图
   */
  const handleBackToStatus = useCallback(() => {
    setViewState('status')
    setInitialWizardStep(0)
  }, [])

  /**
   * 处理恢复进度
   */
  const handleRestoreProgress = useCallback((stepIndex: number) => {
    setInitialWizardStep(stepIndex)
    setViewState('wizard')
  }, [])

  /**
   * 处理清除进度
   */
  const handleClearProgress = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kyc_wizard_data')
    }
    setInitialWizardStep(0)
  }, [])

  // 判断是否可以进入向导
  const canStartWizard = status === KycStatus.NOT_STARTED || status === KycStatus.REJECTED

  // 页面标题
  const pageTitle = {
    status: t('kyc.pageTitle', 'Identity Verification'),
    preview: t('kyc.preview.title', 'Identity Verification'),
    wizard: t('kyc.wizard.title', 'Identity Verification'),
  }[viewState]

  return (
    <div className={cn(
      'min-h-screen',
      'py-4 px-3',
      'sm:py-6 sm:px-4',
      'md:py-8 md:px-6',
      'lg:px-8'
    )}>
      <div className="w-full max-w-[600px] mx-auto">
        {/* 页面标题 */}
        <div className="mb-6 sm:mb-8">
          {viewState === 'status' ? (
            // 状态模式：显示页面标题
            <div className="text-center">
              <h1 className="text-lg sm:text-xl font-medium text-white/90">
                {pageTitle}
              </h1>
              <p className="text-xs sm:text-sm text-white/40 mt-1">
                {t('kyc.pageDescription', 'Complete verification to unlock all features')}
              </p>
            </div>
          ) : (
            // 预览/向导模式：顶部导航
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToStatus}
                className="text-white/40 hover:text-white/70 hover:bg-white/5 w-9 h-9"
                aria-label={t('common.back')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              
              <div className="text-center">
                <h1 className="text-base sm:text-lg font-medium text-white/90">
                  {pageTitle}
                </h1>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToStatus}
                className="text-white/40 hover:text-white/70 hover:bg-white/5 w-9 h-9"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* 主内容区域 */}
        <div className="transition-all duration-300 ease-out">
          {viewState === 'wizard' ? (
            // 显示 KYC 向导
            <KycWizard
              key={initialWizardStep} // 强制重新挂载以使用新的初始步骤
              initialStep={initialWizardStep}
              onComplete={handleWizardComplete}
              onCancel={handleWizardCancel}
              className="shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
            />
          ) : viewState === 'preview' ? (
            // 显示步骤预览
            <KycStepPreview
              onStart={handleEnterWizard}
              className="shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
            />
          ) : (
            // 显示 KYC 状态卡片
            <div className="space-y-4">
              {/* 进度恢复提示 */}
              {canStartWizard && (
                <KycProgressRestore
                  onRestore={handleRestoreProgress}
                  onClear={handleClearProgress}
                  onDismiss={() => {}}
                />
              )}

              {/* 状态卡片 */}
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
            </div>
          )}
        </div>

        {/* 底部说明 - 仅在状态视图显示 */}
        {viewState === 'status' && isConnected && (
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-xs sm:text-sm text-white/40">
              {t('kyc.footer.helpText', 'Need help? Contact our support team')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
