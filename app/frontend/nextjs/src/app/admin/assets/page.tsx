'use client'

import { motion } from 'framer-motion'
import { Inbox, Vault } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { keccak256, toHex } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'

import { AssetAdminList } from '@/components/admin/asset-admin-list'
import { RequireAdmin } from '@/components/auth'
import { RedemptionDetailModal } from '@/components/treasury/redemption-detail-modal'
import { RedemptionQueueTable } from '@/components/treasury/redemption-queue-table'
import { TreasuryConfigSection } from '@/components/treasury/treasury-config-section'
import { GlowStatusBadge } from '@/components/ui/glow-status-badge';
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  useExecuteRedemption,
  useRedemptionDetail,
  useRedemptionQueue,
  useSignRedemption,
  useRejectRedemption,
  useTreasuryConfig,
  useTreasuryStats,
} from '@/hooks/use-treasury'
import { notification } from '@/lib/notification'
import type { RedemptionRequest } from '@/types/treasury'
import { getErrorMessage } from '@/utils/error-handler'

const TREASURY_MULTISIG_ABI = [
  {
    type: 'function',
    name: 'sign_proposal',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_proposal_id', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'execute_proposal',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_proposal_id', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'has_signed',
    stateMutability: 'view',
    inputs: [
      { name: '_proposal_id', type: 'uint256' },
      { name: '_signer', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'get_signers',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
] as const

// ═══════════════════════════════════════════════════════════
// Contract Monitor Style + Neon Glow
// ═══════════════════════════════════════════════════════════

export default function AdminAssetsPage() {
  const { t } = useTranslation()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { user } = useCurrentUser()

  const canSignRedemption = Boolean(
    user?.roles?.some((role) => role === 'multisig_signer' || role === 'contract_owner')
  )
  const canExecuteOrReject = Boolean(user?.roles?.includes('contract_owner'))

  const [selectedRedemptionId, setSelectedRedemptionId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const { data: queueData, isLoading: isLoadingQueue } = useRedemptionQueue({ pageSize: 20 })
  const { data: selectedRedemption } = useRedemptionDetail(selectedRedemptionId)
  const { data: treasuryConfig } = useTreasuryConfig()
  const { data: stats } = useTreasuryStats()

  const { mutateAsync: signRedemption, isPending: isSigning } = useSignRedemption()
  const { mutateAsync: executeRedemption, isPending: isExecuting } = useExecuteRedemption()
  const { mutate: rejectRedemption, isPending: isRejecting } = useRejectRedemption()

  const handleViewDetails = useCallback((request: RedemptionRequest) => {
    setSelectedRedemptionId(request.id)
    setIsDetailModalOpen(true)
  }, [])

  const handleSign = useCallback(async (request: RedemptionRequest) => {
    if (!canSignRedemption) {
      notification.warning('Read-only access: only multisig signer can sign')
      return
    }

    if (!walletClient || !publicClient) {
      notification.error('Wallet not connected')
      return
    }

    if (!treasuryConfig?.contractAddress) {
      notification.error('Treasury contract is not configured on-chain')
      return
    }

    if (request.proposalId === undefined) {
      notification.error('Missing on-chain proposal ID for this redemption')
      return
    }

    try {
      const account = walletClient.account?.address
      if (!account) {
        notification.error('Wallet account not available')
        return
      }

      const [onChainSigners, alreadySigned] = await Promise.all([
        publicClient.readContract({
          address: treasuryConfig.contractAddress as `0x${string}`,
          abi: TREASURY_MULTISIG_ABI,
          functionName: 'get_signers',
        }),
        publicClient.readContract({
          address: treasuryConfig.contractAddress as `0x${string}`,
          abi: TREASURY_MULTISIG_ABI,
          functionName: 'has_signed',
          args: [BigInt(request.proposalId), account],
        }),
      ])

      const normalizedSigners = (onChainSigners as readonly string[]).map((s) => s.toLowerCase())
      if (!normalizedSigners.includes(account.toLowerCase())) {
        notification.error('Current wallet is not in on-chain treasury signer set')
        return
      }

      if (alreadySigned) {
        const syncHash = keccak256(
          toHex(`sync-signature:${request.id}:${request.proposalId}:${account}`)
        )
        await signRedemption({
          redemptionId: request.id,
          signature: syncHash,
        })
        notification.success('On-chain signature already exists, synced backend state')
        setIsDetailModalOpen(false)
        return
      }

      notification.loading('Please sign the proposal transaction in your wallet...', 0)

      const { request: txRequest } = await publicClient.simulateContract({
        account,
        address: treasuryConfig.contractAddress as `0x${string}`,
        abi: TREASURY_MULTISIG_ABI,
        functionName: 'sign_proposal',
        args: [BigInt(request.proposalId)],
      })
      const txHash = await walletClient.writeContract(txRequest)

      notification.destroy()
      notification.loading('Waiting for on-chain confirmation...', 0)

      await publicClient.waitForTransactionReceipt({ hash: txHash })

      await signRedemption({
        redemptionId: request.id,
        signature: txHash,
      })

      notification.destroy()
      notification.success(t('admin.treasury.signSuccess'))
      setIsDetailModalOpen(false)
    } catch (error) {
      notification.destroy()
      const err = error as { message?: string; shortMessage?: string; code?: number }
      if (err.code === 4001 || err.message?.includes('rejected')) {
        notification.warning('Transaction signature rejected')
        return
      }
      notification.error(err.shortMessage || getErrorMessage(error) || t('admin.treasury.signFailed'))
    }
  }, [canSignRedemption, walletClient, publicClient, treasuryConfig?.contractAddress, signRedemption, t])

  const handleReject = useCallback((request: RedemptionRequest) => {
    if (!canExecuteOrReject) {
      notification.warning('Read-only access: only contract owner can reject')
      return
    }

    rejectRedemption(
      { redemptionId: request.id, reason: 'Rejected by admin' },
      {
        onSuccess: () => {
          notification.success(t('admin.treasury.rejectSuccess'))
          setIsDetailModalOpen(false)
        },
        onError: (error: Error) => {
          notification.error(getErrorMessage(error) || t('admin.treasury.rejectFailed'))
        },
      }
    )
  }, [canExecuteOrReject, rejectRedemption, t])

  const handleExecute = useCallback(async (request: RedemptionRequest) => {
    if (!canExecuteOrReject) {
      notification.warning('Read-only access: only contract owner can execute')
      return
    }

    if (!walletClient || !publicClient) {
      notification.error('Wallet not connected')
      return
    }

    if (!treasuryConfig?.contractAddress) {
      notification.error('Treasury contract is not configured on-chain')
      return
    }

    if (request.proposalId === undefined) {
      notification.error('Missing on-chain proposal ID for this redemption')
      return
    }

    try {
      notification.loading('Please execute the proposal transaction in your wallet...', 0)

      const txHash = await walletClient.writeContract({
        address: treasuryConfig.contractAddress as `0x${string}`,
        abi: TREASURY_MULTISIG_ABI,
        functionName: 'execute_proposal',
        args: [BigInt(request.proposalId)],
      })

      notification.destroy()
      notification.loading('Waiting for execution confirmation...', 0)

      await publicClient.waitForTransactionReceipt({ hash: txHash })

      await executeRedemption({
        redemptionId: request.id,
        txHash,
      })

      notification.destroy()
      notification.success('Redemption executed successfully')
      setIsDetailModalOpen(false)
    } catch (error) {
      notification.destroy()
      const err = error as { message?: string; shortMessage?: string; code?: number }
      if (err.code === 4001 || err.message?.includes('rejected')) {
        notification.warning('Transaction signature rejected')
        return
      }
      notification.error(err.shortMessage || getErrorMessage(error) || 'Execute redemption failed')
    }
  }, [canExecuteOrReject, walletClient, publicClient, treasuryConfig?.contractAddress, executeRedemption])

  return (
    <RequireAdmin>
      {/* Contract Monitor Style Background */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Page Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex justify-between items-start"
        >
          <div>
            <h2 className="text-2xl font-bold mb-2 text-white">
              {t('admin.assets.title')}
            </h2>
            <p className="text-white/60">
              {t('admin.assets.subtitle')}
            </p>
          </div>
        </motion.div>

        {/* Asset Management */}
        <div className="mb-6">
          <AssetAdminList />
        </div>

        {/* Treasury Config Section */}
        <div className="mb-6">
          <TreasuryConfigSection />
        </div>

        {/* Treasury Management Card - Contract Monitor Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl overflow-hidden"
          style={{ background: 'rgba(15, 15, 26, 0.6)' }}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Vault className="h-5 w-5 text-emerald-400" />
                <span className="font-semibold text-white text-base">
                  {t('admin.treasury.managementTitle')}
                </span>
              </div>
              <span className="text-xs text-white/50">
                {t('admin.treasury.managementSubtitle')}
              </span>
            </div>
            
            {/* Stats Row - 使用 GlowStatusBadge */}
            <div className="flex items-center gap-2">
              <GlowStatusBadge 
                variant="cyan" 
                icon={<Inbox className="w-3 h-3" />}
                pulse={stats?.pendingCount ? stats.pendingCount > 0 : false}
                glow={stats?.pendingCount ? stats.pendingCount > 0 : false}
              >
                {t('admin.treasury.pendingRequests')}: {stats?.pendingCount ?? 0}
              </GlowStatusBadge>
              
              <GlowStatusBadge 
                variant="success"
                icon={<div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              >
                {t('admin.treasury.executed')}: {stats?.executedCount ?? 0}
              </GlowStatusBadge>
              
              <GlowStatusBadge variant="default">
                Signers: {stats?.threshold ?? 0}/{stats?.signerCount ?? 0}
              </GlowStatusBadge>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-6">
            {/* Section Label */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">
                {t('admin.treasury.pendingRequests')}
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Table Container */}
            <div className="rounded-xl overflow-hidden bg-black/20">
              <RedemptionQueueTable
                requests={queueData?.items || []}
                isLoading={isLoadingQueue}
                onViewDetails={handleViewDetails}
                onSign={handleSign}
                onExecute={handleExecute}
                onReject={handleReject}
                canSignAction={canSignRedemption}
                canExecuteAction={canExecuteOrReject}
                canRejectAction={canExecuteOrReject}
              />
            </div>
          </div>
        </motion.div>

        {/* Modal */}
        <RedemptionDetailModal
          request={selectedRedemption || null}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onSign={handleSign}
          onExecute={handleExecute}
          onReject={handleReject}
          canSignAction={canSignRedemption}
          canExecuteAction={canExecuteOrReject}
          canRejectAction={canExecuteOrReject}
          isSigning={isSigning || isExecuting}
          isExecuting={isExecuting}
          isRejecting={isRejecting || isExecuting}
        />
      </div>
    </RequireAdmin>
  )
}
