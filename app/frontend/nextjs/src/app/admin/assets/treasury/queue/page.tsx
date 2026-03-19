'use client';

import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Inbox
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { keccak256, toHex } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';

import { RequireAuth } from '@/components/auth';
import { RedemptionDetailModal } from '@/components/treasury/redemption-detail-modal';
import { RedemptionQueueTable } from '@/components/treasury/redemption-queue-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  useExecuteRedemption,
  useRedemptionDetail,
  useRedemptionQueue,
  useRejectRedemption,
  useSignRedemption,
  useTreasuryConfig,
} from '@/hooks/use-treasury';
import { notification } from '@/lib/notification';
import type { RedemptionRequest } from '@/types/treasury';

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
] as const;

export default function RedemptionQueuePage() {
  const { t } = useTranslation();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { user } = useCurrentUser();

  const canAccessTreasury = Boolean(
    user?.is_admin || user?.roles?.includes('contract_owner')
  );
  const canSignRedemption = Boolean(
    user?.roles?.some((role) => role === 'multisig_signer' || role === 'treasury' || role === 'contract_owner')
  );
  const canExecuteOrReject = Boolean(user?.roles?.includes('contract_owner'));
  
  // State
  const [selectedRedemptionId, setSelectedRedemptionId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Data
  const { data: queueData, isLoading } = useRedemptionQueue({ pageSize: 20 });
  const { data: selectedRedemption } = useRedemptionDetail(selectedRedemptionId);
  const { data: treasuryConfig } = useTreasuryConfig();

  // Mutations
  const { mutateAsync: signRedemption, isPending: isSigning } = useSignRedemption();
  const { mutateAsync: executeRedemption, isPending: isExecuting } = useExecuteRedemption();
  const { mutate: rejectRedemption, isPending: isRejecting } = useRejectRedemption();

  // Handlers
  const handleViewDetails = useCallback((request: RedemptionRequest) => {
    setSelectedRedemptionId(request.id);
    setIsDetailModalOpen(true);
  }, []);

  const handleSign = useCallback(async (request: RedemptionRequest) => {
    if (!canSignRedemption) {
      notification.warning('Read-only access: only multisig signer can sign');
      return;
    }

    if (!walletClient || !publicClient) {
      notification.error('Wallet not connected');
      return;
    }

    if (!treasuryConfig?.contractAddress) {
      notification.error('Treasury contract is not configured on-chain');
      return;
    }

    if (request.proposalId === undefined) {
      notification.error('Missing on-chain proposal ID for this redemption');
      return;
    }

    try {
      const account = walletClient.account?.address;
      if (!account) {
        notification.error('Wallet account not available');
        return;
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
      ]);

      const normalizedSigners = (onChainSigners as readonly string[]).map((s) => s.toLowerCase());
      if (!normalizedSigners.includes(account.toLowerCase())) {
        notification.error('Current wallet is not in on-chain treasury signer set');
        return;
      }

      if (alreadySigned) {
        const syncHash = keccak256(
          toHex(`sync-signature:${request.id}:${request.proposalId}:${account}`)
        );
        await signRedemption({
          redemptionId: request.id,
          signature: syncHash,
        });
        notification.success('On-chain signature already exists, synced backend state');
        setIsDetailModalOpen(false);
        return;
      }

      notification.loading('Please sign the proposal transaction in your wallet...', 0);

      const { request: txRequest } = await publicClient.simulateContract({
        account,
        address: treasuryConfig.contractAddress as `0x${string}`,
        abi: TREASURY_MULTISIG_ABI,
        functionName: 'sign_proposal',
        args: [BigInt(request.proposalId)],
      });
      const txHash = await walletClient.writeContract(txRequest);

      notification.destroy();
      notification.loading('Waiting for on-chain confirmation...', 0);

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      await signRedemption({
        redemptionId: request.id,
        signature: txHash,
      });

      notification.destroy();
      notification.success(t('admin.treasury.signSuccess'));
      setIsDetailModalOpen(false);
    } catch (error) {
      notification.destroy();
      const err = error as { message?: string; shortMessage?: string; code?: number };
      if (err.code === 4001 || err.message?.includes('rejected')) {
        notification.warning('Transaction signature rejected');
        return;
      }
      notification.error(err.shortMessage || err.message || t('admin.treasury.signFailed'));
    }
  }, [canSignRedemption, walletClient, publicClient, treasuryConfig?.contractAddress, signRedemption, t]);

  const handleReject = useCallback((request: RedemptionRequest) => {
    if (!canExecuteOrReject) {
      notification.warning('Read-only access: only contract owner can reject');
      return;
    }

    rejectRedemption(
      { redemptionId: request.id, reason: 'Rejected by admin' },
      {
        onSuccess: () => {
          notification.success(t('admin.treasury.rejectSuccess'));
          setIsDetailModalOpen(false);
        },
        onError: (error: Error) => {
          notification.error(error.message || t('admin.treasury.rejectFailed'));
        },
      }
    );
  }, [canExecuteOrReject, rejectRedemption, t]);

  const handleExecute = useCallback(async (request: RedemptionRequest) => {
    if (!canExecuteOrReject) {
      notification.warning('Read-only access: only contract owner can execute');
      return;
    }

    if (!walletClient || !publicClient) {
      notification.error('Wallet not connected');
      return;
    }

    if (!treasuryConfig?.contractAddress) {
      notification.error('Treasury contract is not configured on-chain');
      return;
    }

    if (request.proposalId === undefined) {
      notification.error('Missing on-chain proposal ID for this redemption');
      return;
    }

    try {
      notification.loading('Please execute the proposal transaction in your wallet...', 0);

      const txHash = await walletClient.writeContract({
        address: treasuryConfig.contractAddress as `0x${string}`,
        abi: TREASURY_MULTISIG_ABI,
        functionName: 'execute_proposal',
        args: [BigInt(request.proposalId)],
      });

      notification.destroy();
      notification.loading('Waiting for execution confirmation...', 0);

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      await executeRedemption({
        redemptionId: request.id,
        txHash,
      });

      notification.destroy();
      notification.success('Redemption executed successfully');
      setIsDetailModalOpen(false);
    } catch (error) {
      notification.destroy();
      const err = error as { message?: string; shortMessage?: string; code?: number };
      if (err.code === 4001 || err.message?.includes('rejected')) {
        notification.warning('Transaction signature rejected');
        return;
      }
      notification.error(err.shortMessage || err.message || 'Execute redemption failed');
    }
  }, [canExecuteOrReject, walletClient, publicClient, treasuryConfig?.contractAddress, executeRedemption]);

  return (
    <RequireAuth wallet check={() => canAccessTreasury}>
      <div className="min-h-screen bg-[#0a0b14] pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <Link href="/admin/assets/treasury">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-white/50 hover:text-white hover:bg-white/5"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <span className="text-amber-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-1 block">
                  {t('admin.treasury.title')}
                </span>
                <h1 className="text-3xl font-bold text-white">{t('admin.treasury.queueTitle')}</h1>
              </div>
            </div>
            <p className="text-white/50 ml-14">
              {t('admin.treasury.queueSubtitle')}
            </p>
          </motion.div>

          {/* Queue Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-white/[0.06] bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-blue-400" />
                  {t('admin.treasury.pendingRequests')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RedemptionQueueTable
                  requests={queueData?.items || []}
                  isLoading={isLoading}
                  onViewDetails={handleViewDetails}
                  onSign={handleSign}
                  onExecute={handleExecute}
                  onReject={handleReject}
                  canSignAction={canSignRedemption}
                  canExecuteAction={canExecuteOrReject}
                  canRejectAction={canExecuteOrReject}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Detail Modal */}
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
      </div>
    </RequireAuth>
  );
}
