'use client'

/**
 * AdmissionButton - KYC 链上准入按钮组件
 *
 * 处理完整的链上准入流程:
 * 1. 三重验证: admin check → deployer_address match → on-chain verifiers() call
 * 2. 交易流程: walletClient.writeContract(addInvestor) → publicClient.waitForTransactionReceipt() → recordAdmission()
 * 3. 交易状态显示: signing → broadcasting → confirming → success/failed
 *
 * @validates Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { ShieldCheck } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'

import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks'
import { useTransactionTimeout } from '@/hooks/use-tx-timeout'
import { notification } from '@/lib/notification'
import { recordAdmission } from '@/services/admin-kyc'
import { usePlatformInfoStore } from '@/stores/platform-info-store'

import { savePendingTx, clearPendingTx, getPendingTx } from './tx-recovery'

// ============ Types ============

export interface AdmissionButtonProps {
  /** KYC 记录 ID */
  kycId: number
  /** 投资者钱包地址 */
  walletAddress: string
  /** 国家代码 */
  countryCode: string
  /** 是否合格投资者 */
  isAccredited: boolean
  /** KYCManager 合约地址 */
  contractAddress: string
  /** 合约部署者地址 (verifier) */
  deployerAddress: string
  /** 是否为重新准入 (之前已 revoked) */
  isReAdmission?: boolean
  /** 准入成功回调 */
  onSuccess: () => void
}

/** 交易状态 */
type TxStatus = 'idle' | 'verifying' | 'signing' | 'broadcasting' | 'confirming' | 'recording' | 'success' | 'failed'

// ============ 可见性逻辑 (可测试的纯函数) ============

/**
 * 判断准入按钮是否应该可见
 * 按钮可见条件: status === 'approved' AND on_chain_sync_status 不是 'synced'
 * (包含: pending, failed, not_required, revoked)
 *
 * @validates Requirements 1.3, 1.4
 */
export function shouldShowAdmissionButton(
  status: string | undefined | null,
  onChainSyncStatus: string | undefined | null
): boolean {
  return status === 'approved' && onChainSyncStatus !== 'synced'
}

// ============ 状态标签映射 ============

function getTxStatusLabel(status: TxStatus, t: (key: string) => string, isReAdmission = false): string {
  switch (status) {
    case 'verifying':
      return t('admin.kyc.admission.verifying')
    case 'signing':
      return t('admin.kyc.admission.signing')
    case 'broadcasting':
      return t('admin.kyc.admission.broadcasting')
    case 'confirming':
      return t('admin.kyc.admission.confirming')
    case 'recording':
      return t('admin.kyc.admission.recording')
    default:
      return isReAdmission ? t('admin.kyc.admission.reAdmit') : t('admin.kyc.admission.admit')
  }
}

// ============ Component ============

export function AdmissionButton({
  kycId,
  walletAddress,
  countryCode,
  isAccredited,
  contractAddress,
  deployerAddress,
  isReAdmission = false,
  onSuccess,
}: AdmissionButtonProps) {
  const { t } = useTranslation()
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { isAdmin } = useCurrentUser()

  const [txStatus, setTxStatus] = useState<TxStatus>('idle')

  // F-08: 交易超时感知 — confirming 阶段超过 30s 弹 warning
  const { startTimeout: startTxTimeout, clearTimeout: clearTxTimeout } = useTransactionTimeout({
    warningMs: 30_000,
    onWarning: () => notification.warning(t('admin.kyc.admission.txTimeout')),
  })

  // 恢复未完成的后端记录 (链上交易成功但 recordAdmission 失败的情况)
  useEffect(() => {
    const pending = getPendingTx(kycId, 'admission')
    if (!pending) return

    const recover = async () => {
      try {
        setTxStatus('recording')
        await recordAdmission(kycId, pending.txHash)
        clearPendingTx(kycId, 'admission')
        setTxStatus('success')
        notification.success(
          t('admin.kyc.admission.recoverySuccess'),
          `TX: ${pending.txHash.slice(0, 10)}...${pending.txHash.slice(-6)}`
        )
        onSuccess()
      } catch {
        setTxStatus('failed')
        notification.error(t('admin.kyc.admission.recoveryFailed'))
      } finally {
        setTimeout(() => setTxStatus('idle'), 2000)
      }
    }

    recover()
  }, [kycId, t, onSuccess])

  const handleAdmission = useCallback(async () => {
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

      // Step 3: 从 platformInfoStore 获取 KYC ABI
      let kycAbi = usePlatformInfoStore.getState().getAbi('KYC')
      if (!kycAbi || kycAbi.length === 0) {
        await usePlatformInfoStore.getState().refresh()
        kycAbi = usePlatformInfoStore.getState().getAbi('KYC')
      }
      if (!kycAbi || kycAbi.length === 0) {
        notification.error('KYC ABI not found in platform info')
        setTxStatus('failed')
        return
      }

      // Step 3b: 链上验证 verifiers() 调用
      const isVerifier = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: kycAbi,
        functionName: 'verifiers',
        args: [address as `0x${string}`],
      })

      if (!isVerifier) {
        notification.error(t('admin.kyc.admission.notVerifier'))
        setTxStatus('failed')
        return
      }

      // Step 4: 发起链上交易 - admin_add_investor
      setTxStatus('signing')

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: kycAbi,
        functionName: 'admin_add_investor',
        args: [
          walletAddress as `0x${string}`,
          countryCode || '',
          isAccredited,
        ],
      })

      // Step 5: 等待交易确认
      setTxStatus('confirming')
      startTxTimeout()

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      clearTxTimeout()

      if (receipt.status === 'reverted') {
        notification.error(t('admin.kyc.admission.txReverted'))
        setTxStatus('failed')
        return
      }

      // 交易已确认 — 先持久化 tx_hash 防止后端调用失败丢失
      savePendingTx({
        type: 'admission',
        kycId,
        txHash: hash,
        timestamp: Date.now(),
      })

      // Step 6: 记录到后端
      setTxStatus('recording')

      await recordAdmission(kycId, hash)

      // 后端记录成功 — 清除恢复条目
      clearPendingTx(kycId, 'admission')

      // 成功
      setTxStatus('success')
      notification.success(
        t('admin.kyc.admission.success'),
        `TX: ${hash.slice(0, 10)}...${hash.slice(-6)}`
      )
      onSuccess()
    } catch (error) {
      setTxStatus('failed')

      const errorMessage = (error as Error).message || ''

      // 用户拒绝签名
      if (
        errorMessage.includes('User rejected') ||
        errorMessage.includes('user rejected') ||
        errorMessage.includes('User denied')
      ) {
        notification.warning(t('admin.kyc.admission.userRejected'))
      } else {
        notification.error(
          t('admin.kyc.admission.failed'),
          errorMessage.slice(0, 100)
        )
      }
    } finally {
      // 延迟重置状态，让用户看到最终状态
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
    kycId,
    walletAddress,
    countryCode,
    isAccredited,
    t,
    onSuccess,
  ])

  const isProcessing = txStatus !== 'idle' && txStatus !== 'success' && txStatus !== 'failed'
  const buttonLabel = getTxStatusLabel(txStatus, t, isReAdmission)

  return (
    <Button
      onClick={handleAdmission}
      disabled={isProcessing}
      className={`
        rounded-xl h-10 px-6
        bg-gradient-to-r from-primary to-[#00E5BB]
        text-bg-dark font-semibold
        hover:shadow-[0_0_20px_rgba(0,212,170,0.4)]
        disabled:opacity-60 disabled:cursor-not-allowed
        transition-all duration-300
      `}
    >
      {isProcessing ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-bg-dark/30 border-t-bg-dark rounded-full animate-spin" />
          {buttonLabel}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          {buttonLabel}
        </span>
      )}
    </Button>
  )
}

export default AdmissionButton
