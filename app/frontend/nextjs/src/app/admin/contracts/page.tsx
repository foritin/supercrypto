"use client";

/**
 * Admin Contracts Page
 * 管理员合约管理页面 - 查看合约状态、注册/解除注册合约
 * 
 * 已迁移到 shadcn/ui 组件:
 * - Typography -> Tailwind typography
 * - Card -> shadcn/ui Card
 * - Table -> DataTable (子组件)
 * - Tag -> Badge (子组件)
 * - Button -> shadcn/ui Button
 * - Space/Flex -> Tailwind flex
 * - Modal -> Dialog
 * - Form -> react-hook-form
 * - Input -> shadcn/ui Input
 * - Tooltip -> shadcn/ui Tooltip (子组件)
 * - Alert -> shadcn/ui Alert
 * - Tabs -> shadcn/ui Tabs
 * - App.useApp().message -> sonner notification
 * - @ant-design/icons -> lucide-react
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAccount, useWalletClient, usePublicClient, useSwitchChain, useChainId } from "wagmi";
import { parseAbi } from "viem";
import { useForm } from "react-hook-form";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  AlertTriangle,
  Cable,
  GitBranch,
  Table as TableIcon,
  RefreshCw,
} from "lucide-react";

import { useCurrentUser } from "@/hooks";
import { RequireAdmin } from "@/components/auth";
import {
  contractAdminService,
  type ContractStatusItem,
  type DependencyStatusItem,
  type ContractStatusResponse,
  CONTRACT_SET_ABIS,
  ADDRESS_PROVIDER_ABI,
} from "@/services/contract";
import { transactionAuditService } from "@/services/transaction-audit";
import { notification } from "@/lib/notification";

import { ContractDependencyGraph } from "@/components/admin/ContractDependencyGraph";
import { ContractDependencyTree } from "@/components/admin/ContractDependencyTree";
import { ContractDetailPanel } from "@/components/admin/ContractDetailPanel";
import { ContractFilterBar, type ContractFilters, DEFAULT_FILTERS } from "@/components/admin/ContractFilterBar";
import { ContractTableList } from "@/components/admin/ContractTableList";
import { ContractStatusLegend } from "@/components/admin/ContractStatusLegend";
import { Node } from "reactflow";

// shadcn/ui 组件
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

// 注册状态颜色映射（纯 Provider 模式）
const STATUS_COLORS = {
  synced: "success",           // 已同步
  mismatch: "warning",         // 地址不匹配
  not_registered: "warning",   // 未注册到 Provider
  not_deployed: "error",       // 未部署
  unknown: "default",          // 未知
} as const;

// 状态图标映射
const STATUS_ICONS = {
  synced: <CheckCircle className="h-4 w-4" />,
  mismatch: <AlertCircle className="h-4 w-4" />,
  not_registered: <AlertTriangle className="h-4 w-4" />,
  not_deployed: <XCircle className="h-4 w-4" />,
  unknown: <AlertCircle className="h-4 w-4" />,
};

// 表单类型定义
interface UpdateFormValues {
  setFunction: string;
  newAddress: string;
}

export default function AdminContractsPage() {
  const { t } = useTranslation();
  const { isConnected, chain, address } = useAccount();
  const chainId = useChainId();
  const { isAdmin } = useCurrentUser();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetProject, setResetProject] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] =
    useState<ContractStatusItem | null>(null);
  const [selectedDependency, setSelectedDependency] =
    useState<DependencyStatusItem | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState("");

  // react-hook-form
  const form = useForm<UpdateFormValues>({
    defaultValues: {
      setFunction: "",
      newAddress: "",
    },
  });

  // 视图切换状态
  const [viewMode, setViewMode] = useState<"table" | "graph">("table");
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [selectedGraphNode, setSelectedGraphNode] = useState<Node | null>(null);
  const [selectedListContract, setSelectedListContract] = useState<ContractStatusItem | null>(null);

  // 筛选条件状态（包含 showDeleted）
  const [filters, setFilters] = useState<ContractFilters>(DEFAULT_FILTERS);

  // Data state
  const [contractStatus, setContractStatus] =
    useState<ContractStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUnregistering, setIsUnregistering] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);

  // 获取合约状态
  const fetchContractStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await contractAdminService.getContractStatus();
      setContractStatus(data);
    } catch (err) {
      console.error("Failed to fetch contract status:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchContractStatus();
    }
  }, [isAdmin, fetchContractStatus]);

  const refetch = fetchContractStatus;

  // 项目信息映射
  const projectMap = useMemo(() => {
    if (!contractStatus?.projects) return {};
    return Object.fromEntries(contractStatus.projects.map((p) => [p.name, p]));
  }, [contractStatus]);

  // 获取所有合约的扁平列表（用于筛选和其他操作）
  const allContracts = useMemo(() => {
    if (!contractStatus) return [];
    return [
      ...(contractStatus.global_contracts || []),
      ...(contractStatus.project_contracts?.flatMap(p => p.contracts) || []),
    ];
  }, [contractStatus]);

  // 过滤后的所有合约（根据 filters.showNotRegistered 过滤）
  const filteredAllContracts = useMemo(() => {
    if (filters.showNotRegistered) return allContracts;
    return allContracts.filter(c => !c.is_deleted);
  }, [allContracts, filters.showNotRegistered]);

  // 按项目分组 (使用 allContracts)
  const groupedContracts = useMemo(() => {
    if (!allContracts.length) return {};

    const groups: Record<string, ContractStatusItem[]> = {};

    for (const contract of allContracts) {
      const project = contract.project || "unknown";
      if (!groups[project]) {
        groups[project] = [];
      }
      groups[project].push(contract);
    }

    return groups;
  }, [allContracts]);

  // 筛选后的合约数据（返回新结构）
  // 注意: 项目筛选已移至 ContractTableList 组件内部处理
  const filteredContractStatus = useMemo(() => {
    if (!contractStatus) return null;

    const filterContract = (contract: ContractStatusItem) => {
      // 未注册的合约过滤（包括 not_registered 状态和已解绑的）
      if (!filters.showNotRegistered && (contract.registration_status === 'not_registered' || contract.is_deleted)) {
        return false;
      }

      // 搜索筛选
      if (filters.search && !contract.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // 状态筛选（使用 registration_status）
      if (filters.status !== 'all' && contract.registration_status !== filters.status) {
        return false;
      }

      // 类型筛选 - 使用 scope
      if (filters.type !== 'all') {
        const contractScope = contract.scope === 'global' ? 'common' : 'exclusive';
        if (contractScope !== filters.type) {
          return false;
        }
      }

      return true;
    };

    return {
      ...contractStatus,
      global_contracts: contractStatus.global_contracts?.filter(filterContract) || [],
      project_contracts: contractStatus.project_contracts?.map(group => ({
        ...group,
        contracts: group.contracts.filter(filterContract),
      })).filter(group => group.contracts.length > 0) || [],
    };
  }, [contractStatus, filters]);

  // 更新地址
  const handleUpdate = async (values: UpdateFormValues) => {
    if (!selectedContract || !walletClient || !publicClient || !address) {
      notification.error("Invalid state");
      return;
    }

    setIsUpdating(true);
    try {
      const callInfo = await contractAdminService.updateContractAddress({
        target_contract: selectedContract.name,
        set_function: values.setFunction,
        new_address: values.newAddress,
      });

      const abi = parseAbi(CONTRACT_SET_ABIS[values.setFunction]);

      const hash = await walletClient.writeContract({
        address: callInfo.target_address as `0x${string}`,
        abi,
        functionName: values.setFunction,
        args: [values.newAddress as `0x${string}`],
      });

      // 记录 Admin 合约操作到审计日志
      transactionAuditService.recordAdminContractCall({
        txHash: hash,
        chainId: chainId,
        network: chain?.name || "hardhat",
        fromAddress: address,
        contractAddress: callInfo.target_address,
        contractName: selectedContract.name,
        functionName: values.setFunction,
        functionArgs: { newAddress: values.newAddress },
        description: `[Admin] Set ${values.setFunction.replace("set", "")} to ${values.newAddress.slice(0, 10)}...`,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // 更新交易状态
      transactionAuditService.updateStatus(hash, "confirmed", {
        block_number: Number(receipt.blockNumber),
        gas_used: Number(receipt.gasUsed),
        effective_gas_price: receipt.effectiveGasPrice?.toString(),
      });

      const depName =
        selectedDependency?.contract ||
        values.setFunction
          .replace("set", "")
          .replace("KYCManager", "KYCManager");

      await contractAdminService.confirmBinding({
        contract_name: selectedContract.name,
        dependency_name: depName,
        tx_hash: hash,
        new_address: values.newAddress,
      });

      notification.success(
        `${t("admin.contracts.updateSuccess")} TX: ${hash.slice(0, 10)}...`
      );
      setUpdateModalOpen(false);
      setSelectedDependency(null);
      form.reset();
      refetch();
    } catch (error) {
      notification.error(
        `${t("admin.contracts.updateFailed")}: ${(error as Error).message}`
      );
    } finally {
      setIsUpdating(false);
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
      refetch();
    } catch (error) {
      notification.error(
        `${t("admin.contracts.resetFailed")}: ${(error as Error).message}`
      );
    } finally {
      setIsResetting(false);
    }
  };

  // 处理更新依赖地址（纯 Provider 模式下通过 Provider 注册）
  const handleUpdateDependency = (
    contract: ContractStatusItem,
    dependency: DependencyStatusItem
  ) => {
    setSelectedContract(contract);
    setSelectedDependency(dependency);
    form.setValue("setFunction", dependency.key || "");
    form.setValue("newAddress", dependency.address || "");
    setUpdateModalOpen(true);
  };

  // 处理注册合约到 Provider (前端钱包签名模式)
  const handleRegisterToProvider = async (contractName: string) => {
    if (!walletClient || !publicClient) {
      notification.error(t("admin.contracts.register.walletNotConnected"));
      return;
    }

    // 检查并切换到 Hardhat 网络 (chainId: 31337)
    const HARDHAT_CHAIN_ID = 31337;
    if (chain?.id !== HARDHAT_CHAIN_ID) {
      try {
        notification.loading(t("admin.contracts.register.switchingNetwork") || "Switching to Hardhat network...", 0);
        await switchChainAsync({ chainId: HARDHAT_CHAIN_ID });
        notification.destroy();
      } catch (switchError) {
        notification.destroy();
        const err = switchError as { code?: number; message?: string };
        if (err.code === 4001 || err.message?.includes('rejected')) {
          notification.warning(t("admin.contracts.register.switchRejected") || "Network switch rejected. Please switch to Hardhat network manually.");
        } else {
          notification.error(t("admin.contracts.register.switchFailed") || "Failed to switch network. Please switch to Hardhat network manually in MetaMask.");
        }
        return;
      }
    }

    setIsRegistering(true);
    try {
      // 1. 获取调用参数
      const prepareData = await contractAdminService.prepareRegister({
        contract_name: contractName,
      });

      console.log("[Register] prepareData:", prepareData);

      // 2. 验证 provider_address 是否是合约
      const providerCode = await publicClient.getCode({
        address: prepareData.provider_address as `0x${string}`,
      });

      if (!providerCode || providerCode === "0x") {
        notification.error(
          t("admin.contracts.register.providerNotDeployed", {
            address: prepareData.provider_address.slice(0, 10) + "...",
          }) || `AddressProvider 合约未部署或地址无效: ${prepareData.provider_address.slice(0, 10)}...`
        );
        return;
      }

      // 3. 校验 owner 权限
      let owner: string;
      try {
        owner = await publicClient.readContract({
          address: prepareData.provider_address as `0x${string}`,
          abi: ADDRESS_PROVIDER_ABI,
          functionName: "owner",
        }) as string;
      } catch (ownerError) {
        console.error("[Register] Failed to read owner:", ownerError);
        notification.error(
          t("admin.contracts.register.ownerReadFailed") || 
          `无法读取 AddressProvider 的 owner，请确认合约地址正确: ${prepareData.provider_address.slice(0, 10)}...`
        );
        return;
      }

      const walletAddress = walletClient.account?.address;
      if (!walletAddress || walletAddress.toLowerCase() !== owner.toLowerCase()) {
        notification.error(
          t("admin.contracts.register.notOwner", {
            owner: owner.slice(0, 10) + "...",
          })
        );
        return;
      }

      // 4. 钱包签名发送交易
      notification.loading(t("admin.contracts.register.signing"), 0);

      const hash = await walletClient.writeContract({
        address: prepareData.provider_address as `0x${string}`,
        abi: prepareData.abi,
        functionName: prepareData.function_name,
        args: [prepareData.key_hash as `0x${string}`, prepareData.contract_address as `0x${string}`],
      });

      // 记录 Admin 注册操作到审计日志
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

      // 5. 等待交易确认
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // 更新交易状态
      transactionAuditService.updateStatus(hash, "confirmed", {
        block_number: Number(receipt.blockNumber),
        gas_used: Number(receipt.gasUsed),
        effective_gas_price: receipt.effectiveGasPrice?.toString(),
      });

      // 6. 更新数据库缓存
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

      // 6. 关闭面板并刷新
      setDetailPanelOpen(false);
      setSelectedGraphNode(null);
      setSelectedListContract(null);
      refetch();
    } catch (error) {
      notification.destroy();
      const err = error as { code?: number; message?: string; shortMessage?: string };
      
      // 用户拒绝签名
      if (err.code === 4001 || err.message?.includes('rejected') || err.message?.includes('denied')) {
        notification.warning(
          t("admin.contracts.register.rejected") || "用户取消了交易签名"
        );
      } else {
        // 其他错误 - 优先使用 shortMessage（viem 提供的简短错误）
        const errorMessage = err.shortMessage || err.message?.split('\n')[0] || "Unknown error";
        notification.error(
          t("admin.contracts.register.failed", { error: errorMessage })
        );
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // 处理解除注册合约 (前端钱包签名模式)
  const handleUnregisterFromProvider = async (contractName: string) => {
    if (!walletClient || !publicClient) {
      notification.error(t("admin.contracts.unregister.walletNotConnected", "请先连接钱包"));
      return;
    }

    // 检查并切换到 Hardhat 网络 (chainId: 31337)
    const HARDHAT_CHAIN_ID = 31337;
    if (chain?.id !== HARDHAT_CHAIN_ID) {
      try {
        notification.loading(t("admin.contracts.register.switchingNetwork") || "Switching to Hardhat network...", 0);
        await switchChainAsync({ chainId: HARDHAT_CHAIN_ID });
        notification.destroy();
      } catch (switchError) {
        notification.destroy();
        const err = switchError as { code?: number; message?: string };
        if (err.code === 4001 || err.message?.includes('rejected')) {
          notification.warning(t("admin.contracts.register.switchRejected") || "Network switch rejected.");
        } else {
          notification.error(t("admin.contracts.register.switchFailed") || "Failed to switch network.");
        }
        return;
      }
    }

    setIsUnregistering(true);
    try {
      // 1. 获取调用参数
      const prepareData = await contractAdminService.prepareUnregister({
        contract_name: contractName,
      });

      console.log("[Unregister] prepareData:", prepareData);

      // 2. 验证 provider_address 是否是合约
      const providerCode = await publicClient.getCode({
        address: prepareData.provider_address as `0x${string}`,
      });

      if (!providerCode || providerCode === "0x") {
        notification.error(
          t("admin.contracts.unregister.providerNotDeployed", "AddressProvider 合约未部署")
        );
        return;
      }

      // 3. 校验 owner 权限
      let owner: string;
      try {
        owner = await publicClient.readContract({
          address: prepareData.provider_address as `0x${string}`,
          abi: ADDRESS_PROVIDER_ABI,
          functionName: "owner",
        }) as string;
      } catch (ownerError) {
        console.error("[Unregister] Failed to read owner:", ownerError);
        notification.error(t("admin.contracts.unregister.ownerReadFailed", "无法读取 owner"));
        return;
      }

      const walletAddress = walletClient.account?.address;
      if (!walletAddress || walletAddress.toLowerCase() !== owner.toLowerCase()) {
        notification.error(
          t("admin.contracts.unregister.notOwner", {
            defaultValue: "只有 owner 可以解除注册",
            owner: owner.slice(0, 10) + "...",
          })
        );
        return;
      }

      // 4. 钱包签名发送交易
      notification.loading(t("admin.contracts.unregister.signing", "签名中..."), 0);

      const hash = await walletClient.writeContract({
        address: prepareData.provider_address as `0x${string}`,
        abi: prepareData.abi,
        functionName: prepareData.function_name,
        args: [prepareData.key_hash as `0x${string}`, prepareData.contract_address as `0x${string}`],
      });

      // 记录 Admin 解除注册操作到审计日志
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

      // 5. 等待交易确认
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // 更新交易状态
      transactionAuditService.updateStatus(hash, "confirmed", {
        block_number: Number(receipt.blockNumber),
        gas_used: Number(receipt.gasUsed),
        effective_gas_price: receipt.effectiveGasPrice?.toString(),
      });

      // 6. 更新数据库缓存
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

      // 7. 关闭面板并刷新
      setDetailPanelOpen(false);
      setSelectedGraphNode(null);
      setSelectedListContract(null);
      refetch();
    } catch (error) {
      notification.destroy();
      const err = error as { code?: number; message?: string; shortMessage?: string };
      
      // 用户拒绝签名
      if (err.code === 4001 || err.message?.includes('rejected') || err.message?.includes('denied')) {
        notification.warning(
          t("admin.contracts.unregister.rejected") || "用户取消了交易签名"
        );
      } else {
        // 其他错误 - 优先使用 shortMessage
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
      // 关闭面板并刷新
      setDetailPanelOpen(false);
      setSelectedGraphNode(null);
      setSelectedListContract(null);
      refetch();
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
      // 关闭面板并刷新
      setDetailPanelOpen(false);
      setSelectedGraphNode(null);
      setSelectedListContract(null);
      refetch();
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

  // 处理 Reset
  const handleReset = (project: string | null) => {
    setResetProject(project);
    setResetModalOpen(true);
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
    <RequireAdmin>
      <div className="max-w-[1400px] mx-auto">
        {/* Page Header with Refresh Button */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {t("admin.contracts.title")}
            </h2>
            <p className="text-white/65">
              {t("admin.contracts.subtitle")}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchContractStatus}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t("admin.contracts.refresh")}
          </Button>
        </div>

        {/* View Toggle Tabs */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "table" | "graph")}>
          <TabsList className="mb-4">
            <TabsTrigger value="table" className="flex items-center gap-2">
              <TableIcon className="h-4 w-4" />
              {t("admin.contracts.table.listView")}
            </TabsTrigger>
            <TabsTrigger value="graph" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              {t("admin.contracts.table.treeView")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table">
            {/* 状态图例 */}
            <ContractStatusLegend />

            {/* 筛选栏（包含显示已解绑 Checkbox） */}
            <ContractFilterBar
              filters={filters}
              onFiltersChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
            />

            {/* 表格列表 */}
            <ContractTableList
              contractStatus={filteredContractStatus}
              loading={isLoading}
              onContractClick={(contract) => {
                setSelectedListContract(contract);
                // 将 ContractStatusItem 转换为 Node 格式供详情面板使用
                setSelectedGraphNode({
                  id: contract.name,
                  data: {
                    id: contract.name,
                    label: contract.name,
                    address: contract.address || '',
                    project: contract.project,
                    status: contract.registration_status,
                    type: contract.scope === 'global' ? 'common' : 'exclusive',
                    deployedAt: contract.deployed_at,
                    providerAddress: contract.provider_address,
                    lastSynced: contract.last_synced,
                    isRegistered: contract.registration_status === 'synced',
                    providerKey: contract.provider_key,
                    // 主合约相关字段
                    contractId: contract.id,
                    isPrimary: contract.is_primary,
                    symbol: contract.symbol,
                    // 操作权限字段 (Requirements: 5.1-5.5, 8.5-8.6)
                    actions: contract.actions,
                  },
                } as Node);
                setDetailPanelOpen(true);
              }}
            />
          </TabsContent>

          <TabsContent value="graph">
            {/* 筛选栏（包含显示已解绑 Checkbox） */}
            <ContractFilterBar
              filters={filters}
              onFiltersChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
            />
            <ContractDependencyTree
              showNotRegistered={filters.showNotRegistered}
              onContractClick={(contractId) => {
                // Find contract node data from all contracts
                const nodeData = allContracts.find(
                  (c) => c.name === contractId
                );
                if (nodeData) {
                  // Create a mock node for compatibility
                  setSelectedGraphNode({
                    id: contractId,
                    data: {
                      id: contractId,
                      label: contractId,
                      address: nodeData.address || '',
                      project: nodeData.project || 'common',
                      status: nodeData.registration_status,
                      type: nodeData.scope === 'global' ? 'common' : 'exclusive',
                      deployedAt: nodeData.deployed_at || null,
                      providerAddress: nodeData.provider_address,
                      lastSynced: nodeData.last_synced,
                      isRegistered: nodeData.registration_status === 'synced',
                      providerKey: nodeData.provider_key,
                      // 主合约相关字段
                      contractId: nodeData.id,
                      isPrimary: nodeData.is_primary,
                      symbol: nodeData.symbol,
                      // 操作权限字段 (Requirements: 5.1-5.5, 8.5-8.6)
                      actions: nodeData.actions,
                    },
                  } as Node);
                  setSelectedListContract(nodeData);
                  setDetailPanelOpen(true);
                }
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Update Modal */}
        <Dialog open={updateModalOpen} onOpenChange={(open) => {
          setUpdateModalOpen(open);
          if (!open) {
            setSelectedDependency(null);
            form.reset();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.contracts.updateModal.title")}</DialogTitle>
            </DialogHeader>
            
            {selectedDependency && (
              <Alert variant="info" className="mb-4">
                <Cable className="h-4 w-4" />
                <AlertTitle>{t("admin.contracts.updateModal.info")}</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1">
                    <div>
                      <strong>{t("admin.contracts.updateModal.from")}:</strong>{" "}
                      <span className="font-mono text-xs">{selectedDependency.address}</span>
                    </div>
                    <div>
                      <strong>{t("admin.contracts.updateModal.contract")}:</strong>{" "}
                      {selectedDependency.contract}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="setFunction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.contracts.updateModal.setFunction")}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.contracts.updateModal.newAddress")}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUpdateModalOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? t("common.loading") : t("common.confirm")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

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

        {/* Contract Detail Panel (for Graph View and List View) */}
        <ContractDetailPanel
          open={detailPanelOpen}
          onClose={() => {
            setDetailPanelOpen(false);
            setSelectedGraphNode(null);
            setSelectedListContract(null);
          }}
          node={selectedGraphNode?.data || null}
          onUpdateDependency={() => {
            // 注册合约到 Provider (前端钱包签名)
            const contractName = selectedGraphNode?.data?.id || selectedListContract?.name;
            if (contractName) {
              handleRegisterToProvider(contractName);
            }
          }}
          onUnregister={() => {
            // 解除注册合约 (前端钱包签名)
            const contractName = selectedGraphNode?.data?.id || selectedListContract?.name;
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
      </div>
    </RequireAdmin>
  );
}
