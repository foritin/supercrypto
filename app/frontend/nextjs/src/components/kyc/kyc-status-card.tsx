'use client'
/**
 * KYC Status Card Component
 * 显示当前 KYC 状态并提供操作按钮
 * 
 * 已从 Ant Design 迁移到 shadcn/ui
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

// shadcn/ui 组件
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

interface KycStatusCardProps {
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
  if (!isConnected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldCheck 
            className="w-16 h-16 text-muted-foreground mb-6" 
            aria-hidden="true" 
          />
          <h3 className="text-lg font-semibold mb-2">
            {t('kyc.connectWalletFirst')}
          </h3>
          <p className="text-muted-foreground text-center max-w-sm">
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
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Skeleton className="w-16 h-16 rounded-full mb-6" />
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardContent>
      </Card>
    )
  }

  // 错误状态
  if (isError) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('kyc.error.loadFailed')}</AlertTitle>
            <AlertDescription className="flex items-center justify-between mt-2">
              <span>{t('common.tryAgainLater')}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
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
  const renderContent = () => {
    switch (status) {
      case KycStatus.APPROVED:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-[#00D4AA]/20 flex items-center justify-center mb-6">
              <CheckCircle2 
                className="w-10 h-10 text-[#00D4AA]" 
                aria-hidden="true" 
              />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {t('kyc.approved.title')}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {t('kyc.approved.description')}
            </p>
            <div className="flex flex-col items-center gap-2">
              {kycData?.reviewed_at && (
                <p className="text-sm text-muted-foreground">
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
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-[#1677ff]/20 flex items-center justify-center mb-6">
              <Clock 
                className="w-10 h-10 text-[#1677ff]" 
                aria-hidden="true" 
              />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {t('kyc.pending.title')}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {t('kyc.pending.description')}
            </p>
            {kycData?.submitted_at && (
              <p className="text-sm text-muted-foreground mb-4">
                {t('kyc.pending.submitted', { 
                  date: new Date(kycData.submitted_at).toLocaleDateString() 
                })}
              </p>
            )}
            <Button 
              variant="outline" 
              onClick={() => refetch()}
            >
              <RotateCw className="w-4 h-4 mr-2" aria-hidden="true" />
              {t('kyc.pending.refresh')}
            </Button>
          </div>
        )

      case KycStatus.REJECTED:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-6">
              <XCircle 
                className="w-10 h-10 text-destructive" 
                aria-hidden="true" 
              />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {t('kyc.rejected.title')}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {t('kyc.rejected.description')}
            </p>
            {kycData?.reject_reason && (
              <Alert variant="destructive" className="mb-4 text-left max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('kyc.rejected.reason')}</AlertTitle>
                <AlertDescription>
                  {kycData.reject_reason}
                </AlertDescription>
              </Alert>
            )}
            <Button 
              onClick={handleStartKyc} 
              disabled={isApplying}
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
          <div className="flex flex-col items-center justify-center py-8">
            <ShieldCheck 
              className="w-16 h-16 text-muted-foreground mb-6" 
              aria-hidden="true" 
            />
            <h3 className="text-lg font-semibold mb-2">
              {t('kyc.notStarted.title')}
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {t('kyc.notStarted.description')}
            </p>
            <div className="w-full max-w-sm mb-6">
              <h4 className="text-sm font-medium mb-3 text-center">
                {t('kyc.notStarted.requirements')}
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                <li>{t('kyc.notStarted.req1')}</li>
                <li>{t('kyc.notStarted.req2')}</li>
                <li>{t('kyc.notStarted.req3')}</li>
              </ul>
            </div>
            <Button 
              size="lg"
              onClick={handleStartKyc}
              disabled={isApplying}
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
