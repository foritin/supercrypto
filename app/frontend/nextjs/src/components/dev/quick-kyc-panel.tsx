'use client'
/**
 * Quick KYC Panel Component
 * Developer tool for quick KYC approval/reset
 * 
 * Migrated from Ant Design to shadcn/ui
 * @validates Requirements 16.14
 */
import { ShieldCheck, CheckCircle, RotateCcw, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAccount } from 'wagmi'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useKycStatus, useQuickKycApprove, useKycReset, getKycStatusInfo } from '@/hooks/use-kyc-status'
import { notification } from '@/lib/notification'
import { KycStatus } from '@/services/kyc'

export function QuickKycPanel() {
  const { t } = useTranslation()
  const { isConnected } = useAccount()
  const { status, isLoading: isStatusLoading, refetch } = useKycStatus()
  const { mutate: quickApprove, isPending: isApproving } = useQuickKycApprove()
  const { mutate: resetKyc, isPending: isResetting } = useKycReset()
  
  const statusInfo = getKycStatusInfo(status)
  const isApproved = status === KycStatus.APPROVED

  // Get badge variant based on status
  const getBadgeVariant = (antdStatus: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (antdStatus) {
      case 'success':
        return 'default'
      case 'error':
        return 'destructive'
      case 'warning':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // Handle quick approve
  const handleQuickApprove = () => {
    quickApprove(undefined, {
      onSuccess: () => {
        notification.success(t('dev.kyc.approveSuccess'))
        refetch()
      },
      onError: (error) => {
        notification.error(error.message || t('common.error'))
      },
    })
  }

  // Handle reset
  const handleReset = () => {
    resetKyc(undefined, {
      onSuccess: () => {
        notification.success(t('dev.kyc.resetSuccess'))
        refetch()
      },
      onError: (error) => {
        notification.error(error.message || t('common.error'))
      },
    })
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4" />
            {t('dev.kyc.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('kyc.connectWalletFirst')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="h-4 w-4" />
          {t('dev.kyc.title')}
        </CardTitle>
        <Badge variant={getBadgeVariant(statusInfo.antdStatus)}>
          {t(statusInfo.label)}
        </Badge>
      </CardHeader>
      
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">{t('dev.kyc.description')}</p>
        
        {isStatusLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex gap-2">
            {!isApproved ? (
              <Button
                onClick={handleQuickApprove}
                disabled={isApproving}
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {t('dev.kyc.approveButton')}
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    {t('dev.kyc.resetButton')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('dev.kyc.resetConfirm')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('dev.kyc.resetConfirmDescription') || t('dev.kyc.resetConfirm')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>
                      {t('common.confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
        
        <p className="text-muted-foreground/60 text-xs">
          {t('dev.kyc.note')}
        </p>
      </CardContent>
    </Card>
  )
}
