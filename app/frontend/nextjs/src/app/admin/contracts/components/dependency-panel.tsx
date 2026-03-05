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
import { notification } from "@/lib/notification";
import { contractAdminService } from "@/services/contract";
import type { GraphNode } from "@/services/contract-graph";
import { transactionAuditService } from "@/services/transaction-audit";
import { usePlatformInfoStore } from "@/stores/platform-info-store";
import type { ContractStatusItem } from "@/types/contract";

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

  // Reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetProject, setResetProject] = useState<string | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // 检查并切换到 Hardhat 网络
  const ensureHardhatNetwork = async (): Promise<boolean> => {
    const HARDHAT_CHAIN_ID = 31337;
    if (chain?.id !== HARDHAT_CHAIN_ID) {
      try {
        notification.loading(t("admin.contracts.register.switchingNetwork") || "Switching to Hardhat network...", 0);
        await switchChainAsync({ chainId: HARDHAT_CHAIN_ID });
        notification.destroy();
        return true;
      } catch (switchError) {
        notification.destroy();
        const err = switchError as { code?: number; message?: string };
        if (err.code === 4001 || err.message?.includes('rejected')) {
          notification.warning(t("admin.contracts.register.switchRejected") || "Network switch rejected. Please switch to Hardhat network manually.");
        } else {
          notification.error(t("admin.contracts.register.switchFailed") || "Failed to switch network. Please switch to Hardhat network manually in MetaMask.");
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

  // 处理注册合约到 Provider
  const handleRegisterToProvider = async (contractName: string) => {
    if (!walletClient || !publicClient) {
      notification.error(t("admin.contracts.register.walletNotConnected"));
      return;
    }

    if (!(await ensureHardhatNetwork())) return;

    setIsRegistering(true);
    try {
      const prepareData = await contractAdminService.prepareRegister({
        contract_name: contractName,
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
          t("admin.contracts.register.rejected") || "用户取消了交易签名"
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
      notification.error(t("admin.contracts.unregister.walletNotConnected", "请先连接钱包"));
      return;
    }

    if (!(await ensureHardhatNetwork())) return;

    setIsUnregistering(true);
    try {
      const prepareData = await contractAdminService.prepareUnregister({
        contract_name: contractName,
      });

      console.log("[Unregister] prepareData:", prepareData);

      const owner = await verifyProviderAndOwner(prepareData.provider_address, "unregister");
      if (!owner) return;

      notification.loading(t("admin.contracts.unregister.signing", "签名中..."), 0);

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
      notification.loading(t("admin.contracts.unregister.confirming", "确认交易中..."), 0);

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

      notification.destroy();
      notification.success(
        t("admin.contracts.unregister.success", {
          defaultValue: "解除注册成功: {{name}}, TX: {{tx}}",
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
          t("admin.contracts.unregister.rejected") || "用户取消了交易签名"
        );
      } else {
        const errorMessage = err.shortMessage || err.message?.split('\n')[0] || "Unknown error";
        notification.error(
          t("admin.contracts.unregister.failed", {
            defaultValue: "解除注册失败: {{error}}",
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
      notification.error(t("admin.contracts.primary.noContractId", "合约 ID 不存在"));
      return;
    }

    setIsSettingPrimary(true);
    try {
      await contractAdminService.setPrimary(contractId);
      notification.success(
        t("admin.contracts.primary.setSuccess", {
          defaultValue: "已将 {{name}} 设为主合约",
          name: selectedListContract?.name,
        })
      );
      onDetailPanelClose();
      onSuccess();
    } catch (error) {
      const err = error as { message?: string };
      notification.error(
        t("admin.contracts.primary.setFailed", {
          defaultValue: "设置主合约失败: {{error}}",
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
      notification.error(t("admin.contracts.primary.noContractId", "合约 ID 不存在"));
      return;
    }

    setIsSettingPrimary(true);
    try {
      await contractAdminService.unsetPrimary(contractId);
      notification.success(
        t("admin.contracts.primary.unsetSuccess", {
          defaultValue: "已取消 {{name}} 的主合约标记",
          name: selectedListContract?.name,
        })
      );
      onDetailPanelClose();
      onSuccess();
    } catch (error) {
      const err = error as { message?: string };
      notification.error(
        t("admin.contracts.primary.unsetFailed", {
          defaultValue: "取消主合约失败: {{error}}",
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
            handleRegisterToProvider(contractName);
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
    </>
  );
}
