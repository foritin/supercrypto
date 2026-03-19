"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Shield } from "lucide-react";
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getExpectedBackendNetwork, normalizeNetworkName } from "@/lib/network-guard";
import { notification } from "@/lib/notification";
import { contractAdminService, type ContractStatusResponse, type ContractStatusItem } from "@/services/contract";
import { transactionAuditService } from "@/services/transaction-audit";
import { usePlatformInfoStore } from "@/stores/platform-info-store";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const NETWORK_CHAIN_ID_MAP: Record<string, number> = {
  hardhat: 31337,
  arbitrum: 42161,
  "arbitrum-sepolia": 421614,
};

interface TreasuryBindingPanelProps {
  contractStatus: ContractStatusResponse | null;
  onSuccess: () => void;
}

function isTreasuryMultisigCandidate(contract: ContractStatusItem): boolean {
  return (
    !!contract.deployed &&
    !!contract.address &&
    contract.address !== ZERO_ADDRESS &&
    (contract.name || "").toLowerCase().includes("treasurymultisig")
  );
}

export function TreasuryBindingPanel({ contractStatus, onSuccess }: TreasuryBindingPanelProps) {
  const { chain, address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();

  const [selectedContractName, setSelectedContractName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [binding, setBinding] = useState<{
    provider_address: string;
    treasury: string;
    treasury_multisig: string;
  } | null>(null);

  const backendNetwork = normalizeNetworkName(
    usePlatformInfoStore.getState().chainInfo?.network || getExpectedBackendNetwork()
  );
  const expectedChainId = backendNetwork ? NETWORK_CHAIN_ID_MAP[backendNetwork] : undefined;

  const candidates = useMemo(() => {
    if (!contractStatus) return [] as ContractStatusItem[];
    const flattened = [
      ...contractStatus.global_contracts,
      ...contractStatus.project_contracts.flatMap((p) => p.contracts),
    ];
    return flattened.filter(isTreasuryMultisigCandidate);
  }, [contractStatus]);

  const selectedContract = useMemo(
    () => candidates.find((c) => c.name === selectedContractName),
    [candidates, selectedContractName]
  );

  const loadBinding = async () => {
    setIsRefreshing(true);
    try {
      const result = await contractAdminService.getTreasuryBinding();
      setBinding(result);
    } catch (error) {
      console.error("Failed to load treasury binding:", error);
      setBinding(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadBinding();
  }, []);

  useEffect(() => {
    const first = candidates[0];
    if (!selectedContractName && first) {
      setSelectedContractName(first.name);
    }
  }, [candidates, selectedContractName]);

  const ensureExpectedNetwork = async (): Promise<boolean> => {
    if (!expectedChainId) {
      notification.error("Cannot determine target network from backend configuration.");
      return false;
    }

    if (chain?.id !== expectedChainId) {
      try {
        notification.loading(`Switching to ${backendNetwork || "target"} network...`, 0);
        await switchChainAsync({ chainId: expectedChainId });
        notification.destroy();
        return true;
      } catch {
        notification.destroy();
        notification.error(`Failed to switch network. Please switch to ${backendNetwork || "target"} manually.`);
        return false;
      }
    }
    return true;
  };

  const handleSetTreasury = async () => {
    if (!walletClient || !publicClient || !selectedContract) {
      notification.error("Wallet not connected or no TreasuryMultisig selected");
      return;
    }

    if (!(await ensureExpectedNetwork())) return;

    setIsSubmitting(true);
    try {
      const prepareData = await contractAdminService.prepareSetTreasury({
        treasury_contract_name: selectedContract.name,
      });

      notification.loading("Signing treasury update transaction...", 0);
      const hash = await walletClient.writeContract({
        address: prepareData.provider_address as `0x${string}`,
        abi: prepareData.abi,
        functionName: prepareData.function_name,
        args: [prepareData.key_hash as `0x${string}`, prepareData.contract_address as `0x${string}`],
      });

      transactionAuditService.recordAdminContractCall({
        txHash: hash,
        chainId,
        network: chain?.name || "hardhat",
        fromAddress: address || "",
        contractAddress: prepareData.provider_address,
        contractName: "AddressProvider",
        functionName: prepareData.function_name,
        functionArgs: {
          keyHash: prepareData.key_hash,
          contractAddress: prepareData.contract_address,
          contractName: selectedContract.name,
          providerKey: "TREASURY",
        },
        description: `[Admin] Set TREASURY -> ${selectedContract.name}`,
      });

      notification.destroy();
      notification.loading("Confirming treasury update...", 0);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      transactionAuditService.updateStatus(hash, "confirmed", {
        block_number: Number(receipt.blockNumber),
        gas_used: Number(receipt.gasUsed),
        effective_gas_price: receipt.effectiveGasPrice?.toString(),
      });

      await contractAdminService.confirmSetTreasury({
        treasury_contract_name: selectedContract.name,
        tx_hash: hash,
      });

      notification.destroy();
      notification.success(`TREASURY updated: ${selectedContract.name}`);
      await loadBinding();
      onSuccess();
    } catch (error) {
      notification.destroy();
      const err = error as { message?: string; shortMessage?: string; code?: number };
      if (err.code === 4001 || err.message?.includes("rejected")) {
        notification.warning("Transaction signature rejected");
      } else {
        notification.error(err.shortMessage || err.message || "Set TREASURY failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const treasuryConfigured = !!binding && binding.treasury !== ZERO_ADDRESS;

  return (
    <Card className="mt-6 border-white/[0.08] bg-[#0f1119]/80">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          Treasury Binding (Admin)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-white/70">TREASURY target (TreasuryMultisig only)</div>
          <Select value={selectedContractName} onValueChange={setSelectedContractName}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
              <SelectValue placeholder="Select TreasuryMultisig" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={`${c.name}-${c.address}`} value={c.name}>
                  {c.name} ({c.address?.slice(0, 8)}...{c.address?.slice(-4)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-white/[0.08] p-3 bg-white/[0.02] text-sm text-white/70 space-y-1">
          <div className="flex items-center gap-2">
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            <span>On-chain binding</span>
          </div>
          <div>Provider: {binding?.provider_address || "--"}</div>
          <div>TREASURY: {binding?.treasury || "--"}</div>
          <div>TREASURY_MULTISIG: {binding?.treasury_multisig || "--"}</div>
        </div>

        {!treasuryConfigured && (
          <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/20">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-300">
              TREASURY is not configured on-chain. Subscription funds routing is incomplete until TREASURY is set.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSetTreasury}
            disabled={isSubmitting || !selectedContractName}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {isSubmitting ? "Setting TREASURY..." : "Set TREASURY"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
