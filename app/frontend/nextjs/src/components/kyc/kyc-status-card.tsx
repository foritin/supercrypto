'use client'
/**
 * KYC Status Card Component
 * 显示当前 KYC 状态并提供操作按钮
 * 
 * 已从 Ant Design 迁移到 shadcn/ui
 * 
 * @validates Requirements 8.1, 8.2, 8.3 - 响应式设计
 */
import {
  ShieldCheck,
  Clock,
  XCircle,
  ArrowRight,
  RotateCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'
import { useKycStatus, useKycApply, getKycStatusInfo } from '@/hooks/use-kyc-status'
import { KycStatus } from '@/services/kyc'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

// shadcn/ui 组件
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

export interface KycStatusCardProps {
  onStartKyc?: () => void
}

/**
 * 获取状态对应的 Badge 变体
 */
function getStatusBadgeVariant(status: KycStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case KycStatus.APPROVED:
      return 'default' // 主色调 (绿色)
    case KycStatus.PENDING:
      return 'secondary'
    case KycStatus.REJECTED:
      return 'destructive'
    default:
      return 'outline'
  }
}

export function KycStatusCard({ onStartKyc }: KycStatusCardProps) {
  const { t } = useTranslation()
  const { isConnected } = useAccount()
  const { data: kycData, isLoading, isError, refetch, status } = useKycStatus()
  const { mutate: applyKyc, isPending: isApplying } = useKycApply()
  const router = useRouter()
  
  const statusInfo = getKycStatusInfo(status)

  // 未连接钱包 - 显示连接钱包提示
  // Requirements 8.1: 移动端单列布局，8.2: 桌面端居中卡片布局
  if (!isConnected) {
    return (
      <Card>
        <CardContent className={cn(
          "flex flex-col items-center justify-center",
          // Mobile: 较小内边距
          "py-8 px-4",
          // Desktop: 正常内边距
          "sm:py-12 sm:px-6"
        )}>
          <ShieldCheck 
            className={cn(
              // Mobile: 较小图标
              "w-12 h-12 mb-4",
              // Desktop: 正常图标
              "sm:w-16 sm:h-16 sm:mb-6",
              "text-muted-foreground"
            )}
            aria-hidden="true" 
          />
          <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">
            {t('kyc.connectWalletFirst')}
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground text-center max-w-sm">
            {t('kyc.connectWalletDescription')}
          </p>
        </CardContent>
      </Card>
    )
  }

  // 加载状态
  if (isLoading) {
    return (
      <Card>
        <CardContent className={cn(
          "flex flex-col items-center justify-center",
          // Mobile: 较小内边距
          "py-8 px-4",
          // Desktop: 正常内边距
          "sm:py-12 sm:px-6"
        )}>
          <Skeleton className="w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-4 sm:mb-6" />
          <Skeleton className="h-5 sm:h-6 w-40 sm:w-48 mb-2" />
          <Skeleton className="h-4 w-56 sm:w-64" />
        </CardContent>
      </Card>
    )
  }

  // 错误状态
  if (isError) {
    return (
      <Card>
        <CardContent className="py-4 px-3 sm:py-6 sm:px-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-sm sm:text-base">{t('kyc.error.loadFailed')}</AlertTitle>
            <AlertDescription className={cn(
              // Mobile: 垂直堆叠
              "flex flex-col gap-3 mt-2",
              // Desktop: 水平布局
              "sm:flex-row sm:items-center sm:justify-between"
            )}>
              <span className="text-xs sm:text-sm">{t('common.tryAgainLater')}</span>
              {/* Requirements 8.3: 触摸目标尺寸优化 - 最小 44x44px */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="min-h-[44px] w-full sm:w-auto"
              >
                <RotateCw className="w-4 h-4 mr-2" aria-hidden="true" />
                {t('common.retry')}
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // 处理开始 KYC
  const handleStartKyc = () => {
    if (onStartKyc) {
      onStartKyc()
    } else {
      applyKyc({}, {
        onSuccess: () => {
          // 引导跳转第三方 KYC（MVP：占位外链或路由）
          router.push('/kyc/start')
        },
      })
    }
  }

  // 根据状态渲染内容
  // Requirements 8.1, 8.2, 8.3: 响应式布局和触摸目标优化
  const renderContent = () => {
    switch (status) {
      case KycStatus.APPROVED:
        return (
          <div className={cn(
            "flex flex-col items-center justify-center",
            // Mobile: 较小内边距
            "py-6 px-4",
            // Desktop: 正常内边距
            "sm:py-8 sm:px-6"
          )}>
            <div className={cn(
              // Mobile: 较小图标容器
              "w-12 h-12 mb-4",
              // Desktop: 正常图标容器
              "sm:w-16 sm:h-16 sm:mb-6",
              "rounded-full bg-[#00D4AA]/20 flex items-center justify-center"
            )}>
              <CheckCircle2 
                className="w-8 h-8 sm:w-10 sm:h-10 text-[#00D4AA]" 
                aria-hidden="true" 
              />
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">
              {t('kyc.approved.title')}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground text-center mb-4">
              {t('kyc.approved.description')}
            </p>
            <div className="flex flex-col items-center gap-2">
              {kycData?.reviewed_at && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('kyc.approved.date', { 
                    date: new Date(kycData.reviewed_at).toLocaleDateString() 
                  })}
                </p>
              )}
              {kycData?.is_accredited && (
                <Badge variant="default" className="bg-[#00D4AA]">
                  {t('kyc.accreditedInvestor')}
                </Badge>
              )}
            </div>
          </div>
        )

      case KycStatus.PENDING:
        return (
          <div className={cn(
            "flex flex-col items-center justify-center",
            // Mobile: 较小内边距
            "py-6 px-4",
            // Desktop: 正常内边距
            "sm:py-8 sm:px-6"
          )}>
            <div className={cn(
              // Mobile: 较小图标容器
              "w-12 h-12 mb-4",
              // Desktop: 正常图标容器
              "sm:w-16 sm:h-16 sm:mb-6",
              "rounded-full bg-[#1677ff]/20 flex items-center justify-center"
            )}>
              <Clock 
                className="w-8 h-8 sm:w-10 sm:h-10 text-[#1677ff]" 
                aria-hidden="true" 
              />
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">
              {t('kyc.pending.title')}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground text-center mb-4">
              {t('kyc.pending.description')}
            </p>
            {kycData?.submitted_at && (
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                {t('kyc.pending.submitted', { 
                  date: new Date(kycData.submitted_at).toLocaleDateString() 
                })}
              </p>
            )}
            {/* Requirements 8.3: 触摸目标尺寸优化 - 最小 44x44px */}
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              className="min-h-[44px] w-full sm:w-auto"
            >
              <RotateCw className="w-4 h-4 mr-2" aria-hidden="true" />
              {t('kyc.pending.refresh')}
            </Button>
          </div>
        )

      case KycStatus.REJECTED:
        return (
          <div className={cn(
            "flex flex-col items-center justify-center",
            // Mobile: 较小内边距
            "py-6 px-4",
            // Desktop: 正常内边距
            "sm:py-8 sm:px-6"
          )}>
            <div className={cn(
              // Mobile: 较小图标容器
              "w-12 h-12 mb-4",
              // Desktop: 正常图标容器
              "sm:w-16 sm:h-16 sm:mb-6",
              "rounded-full bg-destructive/20 flex items-center justify-center"
            )}>
              <XCircle 
                className="w-8 h-8 sm:w-10 sm:h-10 text-destructive" 
                aria-hidden="true" 
              />
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">
              {t('kyc.rejected.title')}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground text-center mb-4">
              {t('kyc.rejected.description')}
            </p>
            {kycData?.reject_reason && (
              <Alert variant="destructive" className="mb-4 text-left w-full max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-sm sm:text-base">{t('kyc.rejected.reason')}</AlertTitle>
                <AlertDescription className="text-xs sm:text-sm">
                  {kycData.reject_reason}
                </AlertDescription>
              </Alert>
            )}
            {/* Requirements 8.3: 触摸目标尺寸优化 - 最小 44x44px */}
            <Button 
              onClick={handleStartKyc} 
              disabled={isApplying}
              className="min-h-[44px] w-full sm:w-auto"
            >
              {isApplying ? (
                <RotateCw className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              ) : null}
              {t('kyc.rejected.reapply')}
            </Button>
          </div>
        )

      case KycStatus.NOT_STARTED:
      default:
        return (
          <div className={cn(
            "flex flex-col items-center justify-center",
            // Mobile: 较小内边距
            "py-6 px-4",
            // Desktop: 正常内边距
            "sm:py-8 sm:px-6"
          )}>
            <ShieldCheck 
              className={cn(
                // Mobile: 较小图标
                "w-12 h-12 mb-4",
                // Desktop: 正常图标
                "sm:w-16 sm:h-16 sm:mb-6",
                "text-muted-foreground"
              )}
              aria-hidden="true" 
            />
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">
              {t('kyc.notStarted.title')}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground text-center max-w-md mb-4 sm:mb-6">
              {t('kyc.notStarted.description')}
            </p>
            <div className="w-full max-w-sm mb-4 sm:mb-6">
              <h4 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-center">
                {t('kyc.notStarted.requirements')}
              </h4>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 sm:space-y-2 list-disc list-inside">
                <li>{t('kyc.notStarted.req1')}</li>
                <li>{t('kyc.notStarted.req2')}</li>
                <li>{t('kyc.notStarted.req3')}</li>
              </ul>
            </div>
            {/* Requirements 8.3: 触摸目标尺寸优化 - 最小 44x44px */}
            <Button 
              size="lg"
              onClick={handleStartKyc}
              disabled={isApplying}
              className="min-h-[48px] w-full sm:w-auto"
            >
              {isApplying ? (
                <RotateCw className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" aria-hidden="true" />
              )}
              {t('kyc.notStarted.startButton')}
            </Button>
          </div>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          {t('kyc.title')}
        </CardTitle>
        <Badge variant={getStatusBadgeVariant(status)}>
          {t(statusInfo.label)}
        </Badge>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  )
}
