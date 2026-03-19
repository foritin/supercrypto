'use client'

import { useState } from 'react'
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi'

import { useCurrentUser } from '@/hooks/use-current-user'
import { getExpectedBackendNetwork, normalizeNetworkName } from '@/lib/network-guard'
import { notification } from '@/lib/notification'
import { devToolsService } from '@/services/dev-tools'
import { usePlatformInfoStore } from '@/stores/platform-info-store'

import { TreasuryConfigPanel } from './treasury-config-panel'

const NETWORK_CHAIN_ID_MAP: Record<string, number> = {
  hardhat: 31337,
  arbitrum: 42161,
  'arbitrum-sepolia': 421614,
}

export function TreasuryConfigSection() {
  const [isDeployingTreasury, setIsDeployingTreasury] = useState(false)

  const { chain } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()
  const { isContractOwner } = useCurrentUser()

  const backendNetwork = normalizeNetworkName(
    usePlatformInfoStore.getState().chainInfo?.network || getExpectedBackendNetwork()
  )
  const expectedChainId = backendNetwork ? NETWORK_CHAIN_ID_MAP[backendNetwork] : undefined

  return (
    <TreasuryConfigPanel
      isDeploying={isDeployingTreasury}
      canConfigure={isContractOwner}
      onDeploy={async (config) => {
        try {
          if (!walletClient || !publicClient) {
            throw new Error('Wallet not connected')
          }

          if (!expectedChainId) {
            throw new Error('Cannot determine target network from backend configuration')
          }

          if (chain?.id !== expectedChainId) {
            try {
              notification.loading(`Switching to ${backendNetwork || 'target'} network...`, 0)
              await switchChainAsync({ chainId: expectedChainId })
              notification.destroy()
            } catch {
              notification.destroy()
              throw new Error(`Failed to switch network. Please switch to ${backendNetwork || 'target'} manually.`)
            }
          }

          setIsDeployingTreasury(true)
          const prepareData = await devToolsService.prepareInitTreasury({
            signer_addresses: config.signers,
            required_signatures: config.threshold,
          })

          notification.loading('Signing treasury configuration transaction...', 0)
          const hash = await walletClient.writeContract({
            address: prepareData.contract_address as `0x${string}`,
            abi: prepareData.abi,
            functionName: prepareData.function_name,
            args: [
              prepareData.signer_addresses as `0x${string}`[],
              BigInt(prepareData.required_signatures),
            ],
          })

          notification.destroy()
          notification.loading('Confirming treasury configuration...', 0)
          await publicClient.waitForTransactionReceipt({ hash })

          await devToolsService.confirmInitTreasury({
            signer_addresses: config.signers,
            required_signatures: config.threshold,
            tx_hash: hash,
          })

          notification.destroy()
          notification.success('Treasury multisig initialized')
        } catch (error) {
          notification.destroy()
          notification.error((error as Error).message || 'Failed to initialize treasury')
          throw error
        } finally {
          setIsDeployingTreasury(false)
        }
      }}
    />
  )
}
