'use client'
/**
 * KYC Required Guard Component
 * 包装需要 KYC 验证的内容
 * 
 * 已从 Ant Design 迁移到 shadcn/ui
 * GOD_MODE: 开发环境下可绕过 KYC 检查
 */
import { ReactNode } from 'react'
import { ShieldAlert, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'
import { useKycStatus } from '@/hooks/use-kyc-status'
import { useGodMode } from '@/hooks/use-god-mode'

// shadcn/ui 组件
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export interface KycRequiredGuardProps {
  children: ReactNode
  /**
   * KYC 未通过时显示的模式
   * - 'modal': 显示模态框覆盖层 (默认)
   * - 'inline': 显示内联消息
   * - 'redirect': 重定向到 KYC 页面 (需要 onRedirect)
   */
  mode?: 'modal' | 'inline' | 'redirect'
  /**
   * 用户点击"前往 KYC"时的回调
   */
  onStartKyc?: () => void
  /**
   * KYC 必需消息的自定义标题
   */
  title?: string
  /**
   * KYC 必需消息的自定义描述
   */
  description?: string
}

/**
 * KYC 必需消息组件
 * 用于 inline 和 modal 模式
 */
function KycRequiredMessage({
  title,
  description,
  onStartKyc,
}: {
  title: string
  description: string
  onStartKyc?: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mb-6">
        <ShieldAlert 
          className="w-10 h-10 text-gold" 
          aria-hidden="true" 
        />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-center">
        {title}
      </h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6">
        {description}
      </p>
      <Button onClick={onStartKyc}>
        <ArrowRight className="w-4 h-4 mr-2" aria-hidden="true" />
        {t('kyc.guard.startButton')}
      </Button>
    </div>
  )
}

export function KycRequiredGuard({
  children,
  mode = 'modal',
  onStartKyc,
  title,
  description,
}: KycRequiredGuardProps) {
  const { t } = useTranslation()
  const { isConnected } = useAccount()
  const { isLoading, isApproved } = useKycStatus()
  
  // GOD_MODE: 开发环境下绕过 KYC 检查
  // Requirements: 14.5
  const { enabled: godModeEnabled } = useGodMode()

  // GOD_MODE: 直接渲染子组件，跳过 KYC 检查
  if (godModeEnabled) {
    return <>{children}</>
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Skeleton className="w-16 h-16 rounded-full mb-6" />
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }

  // 未连接钱包 - 显示内容但功能不可用
  if (!isConnected) {
    return <>{children}</>
  }

  // KYC 已通过 - 显示内容
  if (isApproved) {
    return <>{children}</>
  }

  // KYC 未通过 - 显示守卫
  const guardTitle = title || t('kyc.guard.title')
  const guardDescription = description || t('kyc.guard.description')

  // 内联模式
  if (mode === 'inline') {
    return (
      <KycRequiredMessage
        title={guardTitle}
        description={guardDescription}
        onStartKyc={onStartKyc}
      />
    )
  }

  // 模态框模式
  return (
    <>
      {children}
      <Dialog open={true}>
        <DialogContent 
          className="sm:max-w-md"
          // 禁用关闭按钮和点击外部关闭
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          // 隐藏默认关闭按钮
          hideCloseButton
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{guardTitle}</DialogTitle>
            <DialogDescription>{guardDescription}</DialogDescription>
          </DialogHeader>
          <KycRequiredMessage
            title={guardTitle}
            description={guardDescription}
            onStartKyc={onStartKyc}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Hook 用于在操作前检查是否需要 KYC
 */
export function useKycRequired() {
  const { isConnected } = useAccount()
  const { isApproved, status, isLoading } = useKycStatus()
  
  return {
    isKycRequired: isConnected && !isApproved && !isLoading,
    isKycApproved: isApproved,
    isLoading,
    status,
  }
}
