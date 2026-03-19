'use client'
/**
 * Quick KYC Panel Component
 * Developer tool for quick KYC approval/reset
 * 
 * Migrated from Ant Design to shadcn/ui
 * @validates Requirements 16.14
 */
import { ShieldCheck, CheckCircle, RotateCcw, Loader2, RefreshCw, User } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useKycStatus, getKycStatusInfo } from '@/hooks/use-kyc-status'
import { notification } from '@/lib/notification'
import { devToolsService, type TokenRecipient } from '@/services/dev-tools'
import { KycStatus, kycService } from '@/services/kyc'
import { usePlatformInfoStore } from '@/stores/platform-info-store'

export function QuickKycPanel() {
  const { t } = useTranslation()
  const { address: currentAddress, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { refetch: refetchCurrentUserKyc } = useKycStatus()

  const [recipients, setRecipients] = useState<TokenRecipient[]>([])
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<string>('')

  const loadRecipients = useCallback(async () => {
    setIsLoadingRecipients(true)
    try {
      const list = await devToolsService.getTokenRecipients()
      setRecipients(list)
    } catch (error) {
      console.error('Failed to load accounts for Quick KYC:', error)
      notification.error(t('common.error'))
    } finally {
      setIsLoadingRecipients(false)
    }
  }, [t])

  useEffect(() => {
    if (isConnected) {
      void loadRecipients()
    }
  }, [isConnected, loadRecipients])

  useEffect(() => {
    if (!recipients.length) return
    if (selectedAddress && recipients.some((r) => r.address === selectedAddress)) return

    const fallbackAddress = recipients[0]?.address || ''
    const current = currentAddress
      ? recipients.find((r) => r.address.toLowerCase() === currentAddress.toLowerCase())
      : undefined
    setSelectedAddress(current?.address || fallbackAddress)
  }, [recipients, selectedAddress, currentAddress])

  const selectedRecipient = useMemo(
    () => recipients.find((r) => r.address === selectedAddress),
    [recipients, selectedAddress]
  )

  const selectedStatus = (selectedRecipient?.kyc_status as KycStatus | null) || KycStatus.NOT_STARTED
  const statusInfo = getKycStatusInfo(selectedStatus)
  const isApproved = selectedStatus === KycStatus.APPROVED
  const isCurrentSelected = !!(
    currentAddress && selectedAddress && currentAddress.toLowerCase() === selectedAddress.toLowerCase()
  )
  
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
  const handleQuickApprove = async () => {
    if (!selectedAddress) return
    if (!walletClient || !publicClient || !currentAddress) {
      notification.error(t('kyc.connectWalletFirst'))
      return
    }

    setIsApproving(true)
    try {
      const prepared = await kycService.quickApprove(selectedAddress)

      if (prepared.on_chain_sync_status === 'synced') {
        notification.success('Already verified on-chain, no wallet signature required')
        void loadRecipients()
        if (isCurrentSelected) {
          void refetchCurrentUserKyc()
        }
        return
      }

      let kycAbi = usePlatformInfoStore.getState().getAbi('KYC')
      let kycAddress = usePlatformInfoStore.getState().getAddress('KYC')
      if (!kycAbi || kycAbi.length === 0 || !kycAddress) {
        await usePlatformInfoStore.getState().refresh()
        kycAbi = usePlatformInfoStore.getState().getAbi('KYC')
        kycAddress = usePlatformInfoStore.getState().getAddress('KYC')
      }

      if (!kycAbi || kycAbi.length === 0 || !kycAddress) {
        notification.error('KYC contract ABI/address not found')
        return
      }

      const isVerifier = await publicClient.readContract({
        address: kycAddress as `0x${string}`,
        abi: kycAbi,
        functionName: 'verifiers',
        args: [currentAddress as `0x${string}`],
      })

      if (!isVerifier) {
        notification.error('Current wallet is not a KYC verifier')
        return
      }

      const countryCode = prepared.country_code || 'US'
      const txHash = await walletClient.writeContract({
        address: kycAddress as `0x${string}`,
        abi: kycAbi,
        functionName: 'admin_add_investor',
        args: [selectedAddress as `0x${string}`, countryCode, true],
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      if (receipt.status === 'reverted') {
        notification.error('Quick KYC on-chain transaction reverted')
        return
      }

      await kycService.confirmQuickApprove(selectedAddress, txHash)
      notification.success(t('dev.kyc.approveSuccess'))
      void loadRecipients()
      if (isCurrentSelected) {
        void refetchCurrentUserKyc()
      }
    } catch (error) {
      notification.error((error as Error).message || t('common.error'))
    } finally {
      setIsApproving(false)
    }
  }

  // Handle reset
  const handleReset = async () => {
    if (!selectedAddress) return
    if (!walletClient || !publicClient || !currentAddress) {
      notification.error(t('kyc.connectWalletFirst'))
      return
    }

    setIsResetting(true)
    try {
      let kycAbi = usePlatformInfoStore.getState().getAbi('KYC')
      let kycAddress = usePlatformInfoStore.getState().getAddress('KYC')
      if (!kycAbi || kycAbi.length === 0 || !kycAddress) {
        await usePlatformInfoStore.getState().refresh()
        kycAbi = usePlatformInfoStore.getState().getAbi('KYC')
        kycAddress = usePlatformInfoStore.getState().getAddress('KYC')
      }

      if (!kycAbi || kycAbi.length === 0 || !kycAddress) {
        notification.error('KYC contract ABI/address not found')
        return
      }

      const isVerifier = await publicClient.readContract({
        address: kycAddress as `0x${string}`,
        abi: kycAbi,
        functionName: 'verifiers',
        args: [currentAddress as `0x${string}`],
      })

      if (!isVerifier) {
        notification.error('Current wallet is not a KYC verifier')
        return
      }

      const isChainVerified = await publicClient.readContract({
        address: kycAddress as `0x${string}`,
        abi: kycAbi,
        functionName: 'is_verified',
        args: [selectedAddress as `0x${string}`],
      })

      if (isChainVerified) {
        const txHash = await walletClient.writeContract({
          address: kycAddress as `0x${string}`,
          abi: kycAbi,
          functionName: 'admin_remove_investor',
          args: [selectedAddress as `0x${string}`, 'Quick KYC reset'],
        })

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
        if (receipt.status === 'reverted') {
          notification.error('Quick KYC reset on-chain transaction reverted')
          return
        }
      }

      await kycService.reset(selectedAddress)
      notification.success(t('dev.kyc.resetSuccess'))
      void loadRecipients()
      if (isCurrentSelected) {
        void refetchCurrentUserKyc()
      }
    } catch (error) {
      notification.error((error as Error).message || t('common.error'))
    } finally {
      setIsResetting(false)
    }
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
        
        <div className="flex flex-col gap-2">
          <label className="font-medium text-foreground text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </label>
          <div className="flex gap-2">
            <Select
              value={selectedAddress}
              onValueChange={setSelectedAddress}
              disabled={isLoadingRecipients || isApproving || isResetting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                {recipients.map((r) => {
                  const isCurrent = !!(
                    currentAddress && r.address.toLowerCase() === currentAddress.toLowerCase()
                  )
                  return (
                    <SelectItem key={r.address} value={r.address}>
                      {isCurrent ? `[Current] ${r.label}` : r.label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void loadRecipients()}
              disabled={isLoadingRecipients || isApproving || isResetting}
            >
              {isLoadingRecipients ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {isLoadingRecipients ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex gap-2">
            {!isApproved ? (
              <Button
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600"
                onClick={() => void handleQuickApprove()}
                disabled={isApproving || !selectedAddress}
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
                    disabled={isResetting || !selectedAddress}
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
                    <AlertDialogAction onClick={() => void handleReset()}>
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
