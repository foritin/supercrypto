"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccount, useWalletClient, usePublicClient, useSwitchChain, useChainId } from "wagmi";


import { ContractDetailPanel } from "@/components/admin/contract-detail-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getExpectedBackendNetwork, normalizeNetworkName } from "@/lib/network-guard";
import { notification } from "@/lib/notification";
import { contractAdminService } from "@/services/contract";
import type { GraphNode } from "@/services/contract-graph";
import { transactionAuditService } from "@/services/transaction-audit";
import { usePlatformInfoStore } from "@/stores/platform-info-store";
import type { ContractStatusItem } from "@/types/contract";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const NETWORK_CHAIN_ID_MAP: Record<string, number> = {
  hardhat: 31337,
  arbitrum: 42161,
  "arbitrum-sepolia": 421614,
};

const ADDRESS_PROVIDER_BINDING_ABI = [
  {
    type: "function",
    name: "admin_set_address_provider",
    stateMutability: "nonpayable",
    inputs: [{ name: "_address_provider", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "ADDRESS_PROVIDER",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

interface DependencyPanelProps {
  detailPanelOpen: boolean;
  onDetailPanelClose: () => void;
  selectedNode: GraphNode | null;
  selectedListContract: ContractStatusItem | null;
  onSuccess: () => void;
}

export function DependencyPanel({
  detailPanelOpen,
  onDetailPanelClose,
  selectedNode,
  selectedListContract,
  onSuccess,
}: DependencyPanelProps) {
  const { t } = useTranslation();
  const { chain, address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();

  const [isRegistering, setIsRegistering] = useState(false);
  const [isUnregistering, setIsUnregistering] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [externalAddressModalOpen, setExternalAddressModalOpen] = useState(false);
  const [externalAddressInput, setExternalAddressInput] = useState("");
  const [pendingRegisterContract, setPendingRegisterContract] = useState<string | null>(null);

  // Reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetProject, setResetProject] = useState<string | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const backendNetwork = normalizeNetworkName(
    usePlatformInfoStore.getState().chainInfo?.network || getExpectedBackendNetwork()
  );
  const expectedChainId = backendNetwork ? NETWORK_CHAIN_ID_MAP[backendNetwork] : undefined;
  const isHardhatBackend = backendNetwork === "hardhat";

  const isStablecoinContract = (contractName: string): boolean => {
    if (selectedListContract?.name === contractName && selectedListContract.contract_type === "stablecoin") {
      return true;
    }
    const upperName = contractName.toUpperCase();
    return upperName.includes("USDT") || upperName.includes("USDC");
  };

  const isValidEvmAddress = (value: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

  // 检查并切换到后端期望网络
  const ensureExpectedNetwork = async (): Promise<boolean> => {
    if (!expectedChainId) {
      notification.error(
        t("admin.contracts.register.switchFailed") ||
          "Cannot determine target network from backend configuration."
      );
      return false;
    }

    if (chain?.id !== expectedChainId) {
      try {
        const networkLabel = backendNetwork || "target";
        notification.loading(
          t("admin.contracts.register.switchingNetwork") || `Switching to ${networkLabel} network...`,
          0
        );
        await switchChainAsync({ chainId: expectedChainId });
        notification.destroy();
        return true;
      } catch (switchError) {
        notification.destroy();
        const err = switchError as { code?: number; message?: string };
        if (err.code === 4001 || err.message?.includes('rejected')) {
          notification.warning(
            t("admin.contracts.register.switchRejected") ||
              `Network switch rejected. Please switch to ${backendNetwork || "target"} network manually.`
          );
        } else {
          notification.error(
            t("admin.contracts.register.switchFailed") ||
              `Failed to switch network. Please switch to ${backendNetwork || "target"} network manually in wallet.`
          );
        }
        return false;
      }
    }
    return true;
  };

  // 验证 Provider 合约和 owner 权限
  const verifyProviderAndOwner = async (
    providerAddress: string,
    errorPrefix: string
  ): Promise<string | null> => {
    if (!publicClient || !walletClient) return null;

    const providerCode = await publicClient.getCode({
      address: providerAddress as `0x${string}`,
    });

    if (!providerCode || providerCode === "0x") {
      notification.error(
        t(`admin.contracts.${errorPrefix}.providerNotDeployed`, {
          address: providerAddress.slice(0, 10) + "...",
        }) || `AddressProvider 合约未部署或地址无效: ${providerAddress.slice(0, 10)}...`
      );
      return null;
    }

    let providerAbi = usePlatformInfoStore.getState().getAbi("AddressProvider");
    if (!providerAbi || providerAbi.length === 0) {
      // Store cache may be stale — refresh once and retry
      await usePlatformInfoStore.getState().refresh();
      providerAbi = usePlatformInfoStore.getState().getAbi("AddressProvider");
    }
    if (!providerAbi || providerAbi.length === 0) {
      notification.error("AddressProvider ABI not found in platform info");
      return null;
    }

    let owner: string;
    try {
      owner = await publicClient.readContract({
        address: providerAddress as `0x${string}`,
        abi: providerAbi,
        functionName: "owner",
      }) as string;
    } catch (ownerError) {
      console.error(`[${errorPrefix}] Failed to read owner:`, ownerError);
      notification.error(
        t(`admin.contracts.${errorPrefix}.ownerReadFailed`) ||
        `无法读取 AddressProvider 的 owner，请确认合约地址正确: ${providerAddress.slice(0, 10)}...`
      );
      return null;
    }

    const walletAddress = walletClient.account?.address;
    if (!walletAddress || walletAddress.toLowerCase() !== owner.toLowerCase()) {
      notification.error(
        t(`admin.contracts.${errorPrefix}.notOwner`, {
          owner: owner.slice(0, 10) + "...",
        })
      );
      return null;
    }

    return owner;
  };

  const getContractAbiByName = async (contractName: string) => {
    let abi = usePlatformInfoStore.getState().getAbi(contractName);
    if (!abi || abi.length === 0) {
      await usePlatformInfoStore.getState().refresh();
      abi = usePlatformInfoStore.getState().getAbi(contractName);
    }
    return abi;
  };

  const supportsSetAddressProvider = (abi: unknown): boolean => {
    if (!Array.isArray(abi)) return false;
    return abi.some(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "type" in item &&
        (item as { type?: string }).type === "function" &&
        "name" in item &&
        (item as { name?: string }).name === "admin_set_address_provider"
    );
  };

  const syncContractAddressProvider = async ({
    contractName,
    contractAddress,
    providerAddress,
    mode,
  }: {
    contractName: string;
    contractAddress: string;
    providerAddress: string;
    mode: "register" | "unregister";
  }): Promise<boolean> => {
    if (!walletClient || !publicClient) return false;

    const targetAddress = mode === "register" ? providerAddress : ZERO_ADDRESS;
    const actionText =
      mode === "register"
        ? t(
            "admin.contracts.register.bindingProvider",
            "Binding AddressProvider for {{name}}...",
            { name: contractName }
          )
        : t(
            "admin.contracts.unregister.clearingProvider",
            "Clearing AddressProvider for {{name}}...",
            { name: contractName }
          );

    try {
      notification.loading(actionText, 0);

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: ADDRESS_PROVIDER_BINDING_ABI,
        functionName: "admin_set_address_provider",
        args: [targetAddress as `0x${string}`],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const currentProvider = (await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ADDRESS_PROVIDER_BINDING_ABI,
        functionName: "ADDRESS_PROVIDER",
      })) as string;

      const ok = currentProvider.toLowerCase() === targetAddress.toLowerCase();

      notification.destroy();
      if (!ok) {
        notification.warning(
          mode === "register"
            ? t(
                "admin.contracts.register.bindVerifyFailed",
                "Binding transaction submitted, but ADDRESS_PROVIDER could not be verified immediately. Please refresh and retry."
              )
            : t(
                "admin.contracts.unregister.clearVerifyFailed",
                "Clear transaction submitted, but ADDRESS_PROVIDER could not be verified immediately. Please refresh to confirm."
              )
        );
      }
      return ok;
    } catch (error) {
      notification.destroy();
      const err = error as { message?: string; shortMessage?: string };
      const message = err.shortMessage || err.message || "Unknown error";

      if (mode === "unregister") {
        notification.warning(
          t(
            "admin.contracts.unregister.clearNotSupported",
            "This contract does not support clearing AddressProvider (zero address may be forbidden). Provider unregistration was executed only."
          ) + ` (${message.split("\n")[0]})`
        );
        return false;
      }

      notification.error(
        t(
          "admin.contracts.register.bindFailed",
          "Registered in Provider, but failed to bind AddressProvider to target contract: {{error}}",
          { error: message.split("\n")[0] }
        )
      );
      return false;
    }
  };

  // 处理注册合约到 Provider
  const handleRegisterToProvider = async (
    contractName: string,
    externalAddress?: string
  ) => {
    if (!walletClient || !publicClient) {
      notification.error(t("admin.contracts.register.walletNotConnected"));
      return;
    }

    if (!(await ensureExpectedNetwork())) return;

    const trimmedExternalAddress = externalAddress?.trim();
    if (trimmedExternalAddress && !isValidEvmAddress(trimmedExternalAddress)) {
      notification.error(
        t(
          "admin.contracts.register.externalAddressInvalid",
          "External contract address format invalid (must be 0x + 40 hex)."
        )
      );
      return;
    }

    setIsRegistering(true);
    try {
      const prepareData = await contractAdminService.prepareRegister({
        contract_name: contractName,
        ...(trimmedExternalAddress ? { external_address: trimmedExternalAddress } : {}),
      });

      console.log("[Register] prepareData:", prepareData);

      const owner = await verifyProviderAndOwner(prepareData.provider_address, "register");
      if (!owner) return;

      notification.loading(t("admin.contracts.register.signing"), 0);

      const hash = await walletClient.writeContract({
        address: prepareData.provider_address as `0x${string}`,
        abi: prepareData.abi,
        functionName: prepareData.function_name,
        args: [prepareData.key_hash as `0x${string}`, prepareData.contract_address as `0x${string}`],
      });

      transactionAuditService.recordAdminContractCall({
        txHash: hash,
        chainId: chainId,
        network: chain?.name || "hardhat",
        fromAddress: address!,
        contractAddress: prepareData.provider_address,
        contractName: "AddressProvider",
        functionName: prepareData.function_name,
        functionArgs: {
          keyHash: prepareData.key_hash,
          contractAddress: prepareData.contract_address,
          contractName: contractName,
        },
        description: `[Admin] Register ${contractName} to AddressProvider`,
      });

      notification.destroy();
      notification.loading(t("admin.contracts.register.confirming"), 0);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      transactionAuditService.updateStatus(hash, "confirmed", {
        block_number: Number(receipt.blockNumber),
        gas_used: Number(receipt.gasUsed),
        effective_gas_price: receipt.effectiveGasPrice?.toString(),
      });

      await contractAdminService.confirmRegister({
        contract_name: contractName,
        provider_key: prepareData.provider_key,
        tx_hash: hash,
      });

      const contractAbi = await getContractAbiByName(contractName);
      if (supportsSetAddressProvider(contractAbi)) {
        await syncContractAddressProvider({
          contractName,
          contractAddress: prepareData.contract_address,
          providerAddress: prepareData.provider_address,
          mode: "register",
        });
      }

      notification.destroy();
      notification.success(
        t("admin.contracts.register.success", {
          name: contractName,
          tx: hash.slice(0, 10) + "...",
        })
      );

      onDetailPanelClose();
      onSuccess();
    } catch (error) {
      notification.destroy();
      const err = error as { code?: number; message?: string; shortMessage?: string };
      
      if (err.code === 4001 || err.message?.includes('rejected') || err.message?.includes('denied')) {
        notification.warning(
          t("admin.contracts.register.rejected") || "Transaction signature was rejected by user"
        );
      } else {
        const errorMessage = err.shortMessage || err.message?.split('\n')[0] || "Unknown error";
        notification.error(
          t("admin.contracts.register.failed", { error: errorMessage })
        );
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // 处理解除注册合约
  const handleUnregisterFromProvider = async (contractName: string) => {
    if (!walletClient || !publicClient) {
      notification.error(t("admin.contracts.unregister.walletNotConnected", "Please connect your wallet first"));
      return;
    }

    if (!(await ensureExpectedNetwork())) return;

    setIsUnregistering(true);
    try {
      const prepareData = await contractAdminService.prepareUnregister({
        contract_name: contractName,
      });

      console.log("[Unregister] prepareData:", prepareData);

      const owner = await verifyProviderAndOwner(prepareData.provider_address, "unregister");
      if (!owner) return;

      notification.loading(t("admin.contracts.unregister.signing", "Awaiting signature..."), 0);

      const hash = await walletClient.writeContract({
        address: prepareData.provider_address as `0x${string}`,
        abi: prepareData.abi,
        functionName: prepareData.function_name,
        args: [prepareData.key_hash as `0x${string}`, prepareData.contract_address as `0x${string}`],
      });

      transactionAuditService.recordAdminContractCall({
        txHash: hash,
        chainId: chainId,
        network: chain?.name || "hardhat",
        fromAddress: address!,
        contractAddress: prepareData.provider_address,
        contractName: "AddressProvider",
        functionName: prepareData.function_name,
        functionArgs: {
          keyHash: prepareData.key_hash,
          contractAddress: prepareData.contract_address,
          contractName: contractName,
        },
        description: `[Admin] Unregister ${contractName} from AddressProvider`,
      });

      notification.destroy();
      notification.loading(t("admin.contracts.unregister.confirming", "Confirming transaction..."), 0);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      transactionAuditService.updateStatus(hash, "confirmed", {
        block_number: Number(receipt.blockNumber),
        gas_used: Number(receipt.gasUsed),
        effective_gas_price: receipt.effectiveGasPrice?.toString(),
      });

      await contractAdminService.confirmUnregister({
        contract_name: contractName,
        provider_key: prepareData.provider_key,
        tx_hash: hash,
      });

      const contractAbi = await getContractAbiByName(contractName);
      if (supportsSetAddressProvider(contractAbi)) {
        await syncContractAddressProvider({
          contractName,
          contractAddress: prepareData.contract_address,
          providerAddress: prepareData.provider_address,
          mode: "unregister",
        });
      }

      notification.destroy();
      notification.success(
        t("admin.contracts.unregister.success", {
          defaultValue: "Unregistered successfully: {{name}}, TX: {{tx}}",
          name: contractName,
          tx: hash.slice(0, 10) + "...",
        })
      );

      onDetailPanelClose();
      onSuccess();
    } catch (error) {
      notification.destroy();
      const err = error as { code?: number; message?: string; shortMessage?: string };
      
      if (err.code === 4001 || err.message?.includes('rejected') || err.message?.includes('denied')) {
        notification.warning(
          t("admin.contracts.unregister.rejected") || "Transaction signature was rejected by user"
        );
      } else {
        const errorMessage = err.shortMessage || err.message?.split('\n')[0] || "Unknown error";
        notification.error(
          t("admin.contracts.unregister.failed", {
            defaultValue: "Unregister failed: {{error}}",
            error: errorMessage,
          })
        );
      }
    } finally {
      setIsUnregistering(false);
    }
  };

  // 处理设置主合约
  const handleSetPrimary = async () => {
    const contractId = selectedListContract?.id;
    if (!contractId) {
      notification.error(t("admin.contracts.primary.noContractId", "Contract ID is missing"));
      return;
    }

    setIsSettingPrimary(true);
    try {
      await contractAdminService.setPrimary(contractId);
      notification.success(
        t("admin.contracts.primary.setSuccess", {
          defaultValue: "Set {{name}} as primary contract",
          name: selectedListContract?.name,
        })
      );
      onDetailPanelClose();
      onSuccess();
    } catch (error) {
      const err = error as { message?: string };
      notification.error(
        t("admin.contracts.primary.setFailed", {
          defaultValue: "Failed to set primary contract: {{error}}",
          error: err.message || "Unknown error",
        })
      );
    } finally {
      setIsSettingPrimary(false);
    }
  };

  // 处理取消主合约
  const handleUnsetPrimary = async () => {
    const contractId = selectedListContract?.id;
    if (!contractId) {
      notification.error(t("admin.contracts.primary.noContractId", "Contract ID is missing"));
      return;
    }

    setIsSettingPrimary(true);
    try {
      await contractAdminService.unsetPrimary(contractId);
      notification.success(
        t("admin.contracts.primary.unsetSuccess", {
          defaultValue: "Unset primary flag for {{name}}",
          name: selectedListContract?.name,
        })
      );
      onDetailPanelClose();
      onSuccess();
    } catch (error) {
      const err = error as { message?: string };
      notification.error(
        t("admin.contracts.primary.unsetFailed", {
          defaultValue: "Failed to unset primary contract: {{error}}",
          error: err.message || "Unknown error",
        })
      );
    } finally {
      setIsSettingPrimary(false);
    }
  };

  // Reset
  const handleResetExecute = async () => {
    setIsResetting(true);
    try {
      if (resetProject) {
        await contractAdminService.resetProjectDeployments(
          resetProject as "common" | "mock" | "fake",
          resetProject.toUpperCase()
        );
      } else {
        await contractAdminService.resetAllDeployments("RESET ALL");
      }
      notification.success(t("admin.contracts.resetSuccess"));
      setResetModalOpen(false);
      setResetProject(null);
      setResetConfirmText("");
      onSuccess();
    } catch (error) {
      notification.error(
        `${t("admin.contracts.resetFailed")}: ${(error as Error).message}`
      );
    } finally {
      setIsResetting(false);
    }
  };

  const confirmReset = () => {
    const expectedText = resetProject
      ? resetProject.toUpperCase()
      : "RESET ALL";
    if (resetConfirmText !== expectedText) {
      notification.error(
        t("admin.contracts.resetConfirmError", { text: expectedText })
      );
      return;
    }
    handleResetExecute();
  };

  const openExternalAddressModal = (contractName: string) => {
    setPendingRegisterContract(contractName);
    const currentAddress = selectedListContract?.name === contractName ? selectedListContract.address : null;
    setExternalAddressInput(
      currentAddress && currentAddress !== ZERO_ADDRESS && isValidEvmAddress(currentAddress)
        ? currentAddress
        : ""
    );
    setExternalAddressModalOpen(true);
  };

  const startRegisterFlow = (contractName: string) => {
    if (!isHardhatBackend && isStablecoinContract(contractName)) {
      openExternalAddressModal(contractName);
      return;
    }
    handleRegisterToProvider(contractName);
  };

  const confirmExternalAddressAndRegister = () => {
    const contractName = pendingRegisterContract;
    if (!contractName) return;

    const value = externalAddressInput.trim();
    if (!value) {
      notification.error(
        t(
          "admin.contracts.register.externalAddressRequired",
          "Please input external token contract address first."
        )
      );
      return;
    }
    if (!isValidEvmAddress(value)) {
      notification.error(
        t(
          "admin.contracts.register.externalAddressInvalid",
          "External contract address format invalid (must be 0x + 40 hex)."
        )
      );
      return;
    }

    setExternalAddressModalOpen(false);
    handleRegisterToProvider(contractName, value);
  };

  return (
    <>
      {/* Contract Detail Panel */}
      <ContractDetailPanel
        open={detailPanelOpen}
        onClose={onDetailPanelClose}
        node={selectedNode}
        onUpdateDependency={() => {
          const contractName = selectedNode?.id || selectedListContract?.name;
          if (contractName) {
            startRegisterFlow(contractName);
          }
        }}
        onUnregister={() => {
          const contractName = selectedNode?.id || selectedListContract?.name;
          if (contractName) {
            handleUnregisterFromProvider(contractName);
          }
        }}
        onSetPrimary={handleSetPrimary}
        onUnsetPrimary={handleUnsetPrimary}
        isRegistering={isRegistering}
        isUnregistering={isUnregistering}
        isSettingPrimary={isSettingPrimary}
      />

      {/* Reset Modal */}
      <Dialog open={resetModalOpen} onOpenChange={(open) => {
        setResetModalOpen(open);
        if (!open) {
          setResetProject(null);
          setResetConfirmText("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t("admin.contracts.resetModal.title")}
            </DialogTitle>
          </DialogHeader>
          
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("admin.contracts.resetModal.warning")}</AlertTitle>
            <AlertDescription>
              {resetProject
                ? t("admin.contracts.resetModal.projectWarning", {
                    project: resetProject,
                  })
                : t("admin.contracts.resetModal.allWarning")}
            </AlertDescription>
          </Alert>
          
          <p className="text-sm text-white/65 mb-4">
            {t("admin.contracts.resetModal.confirmText", {
              text: resetProject ? resetProject.toUpperCase() : "RESET ALL",
            })}
          </p>
          
          <Input
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            placeholder={resetProject ? resetProject.toUpperCase() : "RESET ALL"}
          />
          
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReset}
              disabled={isResetting}
            >
              {isResetting ? t("common.loading") : t("admin.contracts.resetModal.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={externalAddressModalOpen}
        onOpenChange={(open) => {
          setExternalAddressModalOpen(open);
          if (!open) {
            setPendingRegisterContract(null);
            setExternalAddressInput("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("admin.contracts.detail.registerToProvider")}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-white/65">
            {t(
              "admin.contracts.register.externalAddressPrompt",
              "This is a non-hardhat network. Please input real external stablecoin contract address before registration."
            )}
          </p>

          <Input
            value={externalAddressInput}
            onChange={(e) => setExternalAddressInput(e.target.value)}
            placeholder="0x..."
          />

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExternalAddressModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={confirmExternalAddressAndRegister}
              disabled={isRegistering}
            >
              {isRegistering ? t("common.loading") : t("admin.contracts.detail.registerToProvider")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
