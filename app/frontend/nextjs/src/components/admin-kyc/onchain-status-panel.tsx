'use client'

/**
 * OnChainStatusPanel - 链上状态面板组件
 *
 * 显示投资者在 KYCManager 合约中的链上 KYC 状态信息，
 * 并提供"解除准入"操作。
 *
 * 功能:
 * 1. 调用 getInvestorInfo() 读取链上数据
 * 2. 显示 InvestorInfo 字段: verified, country, accreditedInvestor, addedTime, verificationTime, expiryTime, frozen
 * 3. 时间戳格式化: unix timestamp → human-readable datetime
 * 4. "解除准入" 按钮: 三重验证 → 输入原因 → writeContract(removeInvestor) → recordRevocation()
 * 5. verified=false 时禁用 "解除准入" 按钮
 *
 * @validates Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useConnection, useWalletClient, usePublicClient } from 'wagmi'
import { parseAbi } from 'viem'
import {
  ShieldCheck,
  ShieldOff,
  Globe,
  Calendar,
  Snowflake,
  RefreshCw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentUser } from '@/hooks'
import { useTransactionTimeout } from '@/hooks/use-tx-timeout'
import { notification } from '@/lib/notification'
import { recordRevocation } from '@/services/admin-kyc'
import type { KycDetail } from '@/services/admin-kyc'
import { KYC_MANAGER_ABI } from '@/constants/abis/kyc-manager-abi'
import { savePendingTx, clearPendingTx, getPendingTx } from './tx-recovery'

// ============ Types ============

export interface OnChainStatusPanelProps {
  /** KYC 详情数据 */
  kycDetail: KycDetail
  /** KYCManager 合约地址 */
  contractAddress: string
  /** 合约部署者地址 (verifier) */
  deployerAddress: string
  /** 解除准入成功回调 */
  onRevocationSuccess: () => void
}

/** 链上投资者信息 */
interface InvestorInfo {
  verified: boolean
  country: string
  accreditedInvestor: boolean
  addedTime: bigint
  verificationTime: bigint
  expiryTime: bigint
  frozen: boolean
}

/** 交易状态 */
type TxStatus = 'idle' | 'verifying' | 'signing' | 'confirming' | 'recording' | 'success' | 'failed'

// ============ Helpers ============

/**
 * 格式化 Unix 时间戳为可读日期时间
 * 时间戳为秒级，0 表示未设置
 */
function formatTimestamp(timestamp: bigint): string {
  if (timestamp === 0n) {
    return '-'
  }
  return new Date(Number(timestamp) * 1000).toLocaleString()
}

// ============ Sub-components ============

/** 信息行组件 */
function InfoRow({
  label,
  children,
  showBorder = true,
}: {
  label: string
  children: React.ReactNode
  showBorder?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between py-3 ${
        showBorder ? 'border-b border-white/[0.06]' : ''
      }`}
    >
      <span className="text-sm text-white/50">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  )
}

/** 状态 Badge 组件 */
function StatusBadge({
  value,
  trueLabel,
  falseLabel,
  trueColor = 'emerald',
  falseColor = 'red',
}: {
  value: boolean
  trueLabel: string
  falseLabel: string
  trueColor?: 'emerald' | 'teal'
  falseColor?: 'red' | 'amber'
}) {
  const colorMap = {
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    teal: { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30' },
    red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  }
  const colors = value ? colorMap[trueColor] : colorMap[falseColor]

  return (
    <Badge
      variant="outline"
      className={`${colors.bg} ${colors.text} ${colors.border} border`}
    >
      {value ? trueLabel : falseLabel}
    </Badge>
  )
}

// ============ Component ============

export function OnChainStatusPanel({
  kycDetail,
  contractAddress,
  deployerAddress,
  onRevocationSuccess,
}: OnChainStatusPanelProps) {
  const { t } = useTranslation()
  const { address } = useConnection()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { isAdmin } = useCurrentUser()

  const [investorInfo, setInvestorInfo] = useState<InvestorInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [showRevocationDialog, setShowRevocationDialog] = useState(false)
  const [revocationReason, setRevocationReason] = useState('')

  // F-08: 解除准入交易超时感知
  const { startTimeout: startTxTimeout, clearTimeout: clearTxTimeout } = useTransactionTimeout({
    warningMs: 30_000,
    onWarning: () => notification.warning(t('admin.kyc.onchain.revocationTimeout')),
  })

  const kyc = kycDetail.kyc

  // 恢复未完成的后端记录 (链上交易成功但 recordRevocation 失败的情况)
  useEffect(() => {
    const pending = getPendingTx(kyc.id, 'revocation')
    if (!pending) return

    const recover = async () => {
      try {
        setTxStatus('recording')
        await recordRevocation(kyc.id, pending.txHash, pending.reason || t('admin.kyc.onchain.defaultRevocationReason'))
        clearPendingTx(kyc.id, 'revocation')
        setTxStatus('success')
        notification.success(
          t('admin.kyc.onchain.revocationRecoverySuccess'),
          `TX: ${pending.txHash.slice(0, 10)}...${pending.txHash.slice(-6)}`
        )
        onRevocationSuccess()
      } catch {
        setTxStatus('failed')
        notification.error(t('admin.kyc.onchain.revocationRecoveryFailed'))
      } finally {
        setTimeout(() => setTxStatus('idle'), 2000)
      }
    }

    recover()
  }, [kyc.id, t, onRevocationSuccess])

  // 读取链上投资者信息
  const fetchInvestorInfo = useCallback(async () => {
    if (!publicClient || !contractAddress || !kyc.wallet_address) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const abi = parseAbi(KYC_MANAGER_ABI)

      const result = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'getInvestorInfo',
        args: [kyc.wallet_address as `0x${string}`],
      })

      // result is a struct (tuple) from Vyper — viem returns it as an array
      const tuple = result as readonly [boolean, string, boolean, bigint, bigint, bigint, boolean]
      const [verified, country, accreditedInvestor, addedTime, verificationTime, expiryTime, frozen] = tuple

      setInvestorInfo({
        verified,
        country,
        accreditedInvestor,
        addedTime,
        verificationTime,
        expiryTime,
        frozen,
      })
    } catch (err) {
      const errorMessage = (err as Error).message || ''
      setError(errorMessage.slice(0, 200))
    } finally {
      setLoading(false)
    }
  }, [publicClient, contractAddress, kyc.wallet_address])

  useEffect(() => {
    fetchInvestorInfo()
  }, [fetchInvestorInfo])

  // 解除准入流程
  const handleRevocation = useCallback(async () => {
    if (!address || !walletClient || !publicClient) {
      notification.error(t('admin.kyc.admission.walletNotConnected'))
      return
    }

    try {
      // Step 1: 验证管理员身份
      setTxStatus('verifying')

      if (!isAdmin) {
        notification.error(t('admin.kyc.admission.notAdmin'))
        setTxStatus('failed')
        return
      }

      // Step 2: 验证钱包地址匹配 deployer_address
      if (address.toLowerCase() !== deployerAddress.toLowerCase()) {
        notification.error(t('admin.kyc.admission.notDeployer'))
        setTxStatus('failed')
        return
      }

      // Step 3: 链上验证 verifiers() 调用
      const abi = parseAbi(KYC_MANAGER_ABI)

      const isVerifier = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'verifiers',
        args: [address as `0x${string}`],
      })

      if (!isVerifier) {
        notification.error(t('admin.kyc.admission.notVerifier'))
        setTxStatus('failed')
        return
      }

      // Step 4: 发起链上交易 - removeInvestor
      setTxStatus('signing')

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'removeInvestor',
        args: [
          kyc.wallet_address as `0x${string}`,
          revocationReason || t('admin.kyc.onchain.defaultRevocationReason'),
        ],
      })

      // Step 5: 等待交易确认
      setTxStatus('confirming')
      startTxTimeout()

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      clearTxTimeout()

      if (receipt.status === 'reverted') {
        notification.error(t('admin.kyc.onchain.revocationTxReverted'))
        setTxStatus('failed')
        return
      }

      // 交易已确认 — 先持久化 tx_hash 防止后端调用失败丢失
      savePendingTx({
        type: 'revocation',
        kycId: kyc.id,
        txHash: hash,
        timestamp: Date.now(),
        reason: revocationReason || t('admin.kyc.onchain.defaultRevocationReason'),
      })

      // Step 6: 记录到后端
      setTxStatus('recording')

      await recordRevocation(kyc.id, hash, revocationReason || t('admin.kyc.onchain.defaultRevocationReason'))

      // 后端记录成功 — 清除恢复条目
      clearPendingTx(kyc.id, 'revocation')

      // 成功
      setTxStatus('success')
      setShowRevocationDialog(false)
      setRevocationReason('')
      notification.success(
        t('admin.kyc.onchain.revocationSuccess'),
        `TX: ${hash.slice(0, 10)}...${hash.slice(-6)}`
      )
      onRevocationSuccess()
    } catch (err) {
      setTxStatus('failed')

      const errorMessage = (err as Error).message || ''

      // 用户拒绝签名
      if (
        errorMessage.includes('User rejected') ||
        errorMessage.includes('user rejected') ||
        errorMessage.includes('User denied')
      ) {
        notification.warning(t('admin.kyc.admission.userRejected'))
      } else {
        notification.error(
          t('admin.kyc.onchain.revocationFailed'),
          errorMessage.slice(0, 100)
        )
      }
    } finally {
      // 延迟重置状态
      setTimeout(() => {
        setTxStatus('idle')
      }, 2000)
    }
  }, [
    address,
    walletClient,
    publicClient,
    isAdmin,
    deployerAddress,
    contractAddress,
    kyc,
    revocationReason,
    t,
    onRevocationSuccess,
  ])

  // 打开解除准入对话框
  const handleOpenRevocationDialog = useCallback(() => {
    setRevocationReason('')
    setShowRevocationDialog(true)
  }, [])

  // 确认解除准入
  const handleConfirmRevocation = useCallback(() => {
    handleRevocation()
  }, [handleRevocation])

  const isProcessing = txStatus !== 'idle' && txStatus !== 'success' && txStatus !== 'failed'

  // 获取交易状态标签
  function getTxStatusLabel(): string {
    switch (txStatus) {
      case 'verifying':
        return t('admin.kyc.admission.verifying')
      case 'signing':
        return t('admin.kyc.admission.signing')
      case 'confirming':
        return t('admin.kyc.admission.confirming')
      case 'recording':
        return t('admin.kyc.admission.recording')
      default:
        return t('admin.kyc.admission.revoke')
    }
  }

  // Loading 状态
  if (loading) {
    return (
      <div
        className="rounded-2xl border border-white/[0.08] p-6"
        style={{
          background: 'rgba(17, 25, 22, 0.8)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-teal-400 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {t('admin.kyc.onchain.title')}
            </h3>
            <p className="text-sm text-white/40">{t('admin.kyc.onchain.loading')}</p>
          </div>
        </div>
        {/* Skeleton rows */}
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-white/[0.06]">
              <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
              <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error 状态
  if (error) {
    return (
      <div
        className="rounded-2xl border border-red-500/20 p-6"
        style={{
          background: 'rgba(17, 25, 22, 0.8)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <ShieldOff className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {t('admin.kyc.onchain.title')}
            </h3>
            <p className="text-sm text-red-400">{t('admin.kyc.onchain.loadError')}</p>
          </div>
        </div>
        <p className="text-xs text-white/40 font-mono break-all">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 bg-white/5 border-white/10 hover:bg-white/10"
          onClick={fetchInvestorInfo}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('admin.kyc.onchain.retry')}
        </Button>
      </div>
    )
  }

  if (!investorInfo) {
    return null
  }

  return (
    <>
      <div
        className="rounded-2xl border border-white/[0.08] overflow-hidden"
        style={{
          background: 'rgba(17, 25, 22, 0.8)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* 头部 */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  investorInfo.verified
                    ? 'bg-emerald-500/10'
                    : 'bg-red-500/10'
                }`}
              >
                {investorInfo.verified ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ShieldOff className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {t('admin.kyc.onchain.title')}
                </h3>
                <p className="text-sm text-white/40">
                  {t('admin.kyc.onchain.subtitle')}
                </p>
              </div>
            </div>
            {/* 刷新按钮 */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white/40 hover:text-white hover:bg-white/5"
              onClick={fetchInvestorInfo}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 信息列表 */}
        <div className="px-6 py-2">
          {/* verified */}
          <InfoRow label={t('admin.kyc.onchain.verified')}>
            <StatusBadge
              value={investorInfo.verified}
              trueLabel={t('admin.kyc.onchain.verifiedTrue')}
              falseLabel={t('admin.kyc.onchain.verifiedFalse')}
            />
          </InfoRow>

          {/* country */}
          <InfoRow label={t('admin.kyc.onchain.country')}>
            <span className="flex items-center gap-1.5 text-white">
              <Globe className="w-3.5 h-3.5 text-white/40" />
              {investorInfo.country || '-'}
            </span>
          </InfoRow>

          {/* accreditedInvestor */}
          <InfoRow label={t('admin.kyc.onchain.accreditedInvestor')}>
            <StatusBadge
              value={investorInfo.accreditedInvestor}
              trueLabel={t('admin.kyc.onchain.yes')}
              falseLabel={t('admin.kyc.onchain.no')}
              trueColor="teal"
              falseColor="amber"
            />
          </InfoRow>

          {/* addedTime */}
          <InfoRow label={t('admin.kyc.onchain.addedTime')}>
            <span className="flex items-center gap-1.5 text-white/80 font-mono text-xs">
              <Calendar className="w-3.5 h-3.5 text-white/40" />
              {formatTimestamp(investorInfo.addedTime)}
            </span>
          </InfoRow>

          {/* verificationTime */}
          <InfoRow label={t('admin.kyc.onchain.verificationTime')}>
            <span className="flex items-center gap-1.5 text-white/80 font-mono text-xs">
              <Calendar className="w-3.5 h-3.5 text-white/40" />
              {formatTimestamp(investorInfo.verificationTime)}
            </span>
          </InfoRow>

          {/* expiryTime */}
          <InfoRow label={t('admin.kyc.onchain.expiryTime')}>
            <span className="flex items-center gap-1.5 text-white/80 font-mono text-xs">
              <Calendar className="w-3.5 h-3.5 text-white/40" />
              {investorInfo.expiryTime === 0n
                ? t('admin.kyc.onchain.noExpiry')
                : formatTimestamp(investorInfo.expiryTime)}
            </span>
          </InfoRow>

          {/* frozen */}
          <InfoRow label={t('admin.kyc.onchain.frozen')} showBorder={false}>
            <span className="flex items-center gap-1.5">
              {investorInfo.frozen && (
                <Snowflake className="w-3.5 h-3.5 text-blue-400" />
              )}
              <StatusBadge
                value={!investorInfo.frozen}
                trueLabel={t('admin.kyc.onchain.frozenFalse')}
                falseLabel={t('admin.kyc.onchain.frozenTrue')}
                trueColor="emerald"
                falseColor="red"
              />
            </span>
          </InfoRow>
        </div>

        {/* 底部操作区 */}
        <div className="px-6 py-4 border-t border-white/[0.06]">
          <Button
            onClick={handleOpenRevocationDialog}
            disabled={!investorInfo.verified || isProcessing}
            className={`
              w-full rounded-xl h-10
              ${investorInfo.verified
                ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:shadow-[0_0_20px_rgba(255,77,79,0.2)]'
                : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
              }
              transition-all duration-300
            `}
            variant="outline"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                {getTxStatusLabel()}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ShieldOff className="w-4 h-4" />
                {t('admin.kyc.admission.revoke')}
              </span>
            )}
          </Button>
          {!investorInfo.verified && (
            <p className="text-xs text-white/30 text-center mt-2">
              {t('admin.kyc.onchain.revokeDisabledHint')}
            </p>
          )}
        </div>
      </div>

      {/* 解除准入确认对话框 */}
      <Dialog open={showRevocationDialog} onOpenChange={setShowRevocationDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {t('admin.kyc.onchain.revocationDialogTitle')}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {t('admin.kyc.onchain.revocationDialogDesc', {
                address: `${kyc.wallet_address.slice(0, 6)}...${kyc.wallet_address.slice(-4)}`,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm text-white/60 mb-2 block">
              {t('admin.kyc.onchain.revocationReason')}
            </label>
            <Textarea
              placeholder={t('admin.kyc.onchain.revocationReasonPlaceholder')}
              value={revocationReason}
              onChange={(e) => setRevocationReason(e.target.value)}
              rows={3}
              className="bg-white/5 border-white/10 resize-none text-white placeholder:text-white/30"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
              onClick={() => setShowRevocationDialog(false)}
              disabled={isProcessing}
            >
              {t('admin.kyc.onchain.cancel')}
            </Button>
            <Button
              className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
              onClick={handleConfirmRevocation}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  {getTxStatusLabel()}
                </span>
              ) : (
                t('admin.kyc.onchain.confirmRevocation')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default OnChainStatusPanel
