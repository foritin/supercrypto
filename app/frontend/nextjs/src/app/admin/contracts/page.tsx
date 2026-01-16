"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Typography,
  Card,
  Table,
  Tag,
  Button,
  Space,
  Flex,
  Modal,
  Form,
  Input,
  Tooltip,
  Alert,
  Badge,
  Divider,
  App,
  Tabs,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  WarningOutlined,
  ApiOutlined,
  ApartmentOutlined,
  TableOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAccount, useWalletClient, usePublicClient, useSwitchChain } from "wagmi";
import { parseAbi } from "viem";
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
import { ContractDependencyGraph } from "@/components/admin/ContractDependencyGraph";
import { ContractDependencyTree } from "@/components/admin/ContractDependencyTree";
import { ContractDetailPanel } from "@/components/admin/ContractDetailPanel";
import { ContractFilterBar, type ContractFilters, DEFAULT_FILTERS } from "@/components/admin/ContractFilterBar";
import { ContractTableList } from "@/components/admin/ContractTableList";
import { ContractStatusLegend } from "@/components/admin/ContractStatusLegend";
import { Node } from "reactflow";

const { Title, Text, Paragraph } = Typography;

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
  synced: <CheckCircleOutlined />,
  mismatch: <ExclamationCircleOutlined />,
  not_registered: <WarningOutlined />,
  not_deployed: <CloseCircleOutlined />,
  unknown: <ExclamationCircleOutlined />,
};

export default function AdminContractsPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { isConnected, chain } = useAccount();
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
  const [form] = Form.useForm();

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

  // 过滤后的所有合约（根据 filters.showDeleted 过滤）
  const filteredAllContracts = useMemo(() => {
    if (filters.showDeleted) return allContracts;
    return allContracts.filter(c => !c.is_deleted);
  }, [allContracts, filters.showDeleted]);

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
  const filteredContractStatus = useMemo(() => {
    if (!contractStatus) return null;

    const filterContract = (contract: ContractStatusItem) => {
      // 已删除（解绑）的合约过滤
      if (!filters.showDeleted && contract.is_deleted) {
        return false;
      }

      // 搜索筛选
      if (filters.search && !contract.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // 项目筛选
      if (filters.project !== 'all' && contract.project !== filters.project) {
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
  const handleUpdate = async (values: {
    setFunction: string;
    newAddress: string;
  }) => {
    if (!selectedContract || !walletClient || !publicClient) {
      message.error("Invalid state");
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

      await publicClient.waitForTransactionReceipt({ hash });

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

      message.success(
        `${t("admin.contracts.updateSuccess")} TX: ${hash.slice(0, 10)}...`
      );
      setUpdateModalOpen(false);
      setSelectedDependency(null);
      form.resetFields();
      refetch();
    } catch (error) {
      message.error(
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
      message.success(t("admin.contracts.resetSuccess"));
      setResetModalOpen(false);
      setResetProject(null);
      setResetConfirmText("");
      refetch();
    } catch (error) {
      message.error(
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
    form.setFieldsValue({
      providerKey: dependency.key,
      contractName: dependency.contract,
      currentAddress: dependency.address,
    });
    setUpdateModalOpen(true);
  };

  // 处理注册合约到 Provider (前端钱包签名模式)
  const handleRegisterToProvider = async (contractName: string) => {
    if (!walletClient || !publicClient) {
      message.error(t("admin.contracts.register.walletNotConnected"));
      return;
    }

    // 检查并切换到 Hardhat 网络 (chainId: 31337)
    const HARDHAT_CHAIN_ID = 31337;
    if (chain?.id !== HARDHAT_CHAIN_ID) {
      try {
        message.loading(t("admin.contracts.register.switchingNetwork") || "Switching to Hardhat network...", 0);
        await switchChainAsync({ chainId: HARDHAT_CHAIN_ID });
        message.destroy();
      } catch (switchError) {
        message.destroy();
        const err = switchError as { code?: number; message?: string };
        if (err.code === 4001 || err.message?.includes('rejected')) {
          message.warning(t("admin.contracts.register.switchRejected") || "Network switch rejected. Please switch to Hardhat network manually.");
        } else {
          message.error(t("admin.contracts.register.switchFailed") || "Failed to switch network. Please switch to Hardhat network manually in MetaMask.");
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
        message.error(
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
        message.error(
          t("admin.contracts.register.ownerReadFailed") || 
          `无法读取 AddressProvider 的 owner，请确认合约地址正确: ${prepareData.provider_address.slice(0, 10)}...`
        );
        return;
      }

      const walletAddress = walletClient.account?.address;
      if (!walletAddress || walletAddress.toLowerCase() !== owner.toLowerCase()) {
        message.error(
          t("admin.contracts.register.notOwner", {
            owner: owner.slice(0, 10) + "...",
          })
        );
        return;
      }

      // 4. 钱包签名发送交易
      message.loading(t("admin.contracts.register.signing"), 0);

      const hash = await walletClient.writeContract({
        address: prepareData.provider_address as `0x${string}`,
        abi: prepareData.abi,
        functionName: prepareData.function_name,
        args: [prepareData.key_hash as `0x${string}`, prepareData.contract_address as `0x${string}`],
      });

      message.destroy();
      message.loading(t("admin.contracts.register.confirming"), 0);

      // 4. 等待交易确认
      await publicClient.waitForTransactionReceipt({ hash });

      // 5. 更新数据库缓存
      await contractAdminService.confirmRegister({
        contract_name: contractName,
        provider_key: prepareData.provider_key,
        tx_hash: hash,
      });

      message.destroy();
      message.success(
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
      message.destroy();
      const errorMessage = (error as Error).message || "Unknown error";
      message.error(
        t("admin.contracts.register.failed", { error: errorMessage })
      );
    } finally {
      setIsRegistering(false);
    }
  };

  // 处理解除注册合约 (前端钱包签名模式)
  const handleUnregisterFromProvider = async (contractName: string) => {
    if (!walletClient || !publicClient) {
      message.error(t("admin.contracts.unregister.walletNotConnected", "请先连接钱包"));
      return;
    }

    // 检查并切换到 Hardhat 网络 (chainId: 31337)
    const HARDHAT_CHAIN_ID = 31337;
    if (chain?.id !== HARDHAT_CHAIN_ID) {
      try {
        message.loading(t("admin.contracts.register.switchingNetwork") || "Switching to Hardhat network...", 0);
        await switchChainAsync({ chainId: HARDHAT_CHAIN_ID });
        message.destroy();
      } catch (switchError) {
        message.destroy();
        const err = switchError as { code?: number; message?: string };
        if (err.code === 4001 || err.message?.includes('rejected')) {
          message.warning(t("admin.contracts.register.switchRejected") || "Network switch rejected.");
        } else {
          message.error(t("admin.contracts.register.switchFailed") || "Failed to switch network.");
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
        message.error(
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
        message.error(t("admin.contracts.unregister.ownerReadFailed", "无法读取 owner"));
        return;
      }

      const walletAddress = walletClient.account?.address;
      if (!walletAddress || walletAddress.toLowerCase() !== owner.toLowerCase()) {
        message.error(
          t("admin.contracts.unregister.notOwner", {
            defaultValue: "只有 owner 可以解除注册",
            owner: owner.slice(0, 10) + "...",
          })
        );
        return;
      }

      // 4. 钱包签名发送交易
      message.loading(t("admin.contracts.unregister.signing", "签名中..."), 0);

      const hash = await walletClient.writeContract({
        address: prepareData.provider_address as `0x${string}`,
        abi: prepareData.abi,
        functionName: prepareData.function_name,
        args: [prepareData.key_hash as `0x${string}`, prepareData.contract_address as `0x${string}`],
      });

      message.destroy();
      message.loading(t("admin.contracts.unregister.confirming", "确认交易中..."), 0);

      // 5. 等待交易确认
      await publicClient.waitForTransactionReceipt({ hash });

      // 6. 更新数据库缓存
      await contractAdminService.confirmUnregister({
        contract_name: contractName,
        provider_key: prepareData.provider_key,
        tx_hash: hash,
      });

      message.destroy();
      message.success(
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
      message.destroy();
      const errorMessage = (error as Error).message || "Unknown error";
      message.error(
        t("admin.contracts.unregister.failed", {
          defaultValue: "解除注册失败: {{error}}",
          error: errorMessage,
        })
      );
    } finally {
      setIsUnregistering(false);
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
      message.error(
        t("admin.contracts.resetConfirmError", { text: expectedText })
      );
      return;
    }
    handleResetExecute();
  };

  return (
    <RequireAdmin>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Page Header with Refresh Button */}
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Title level={2} style={{ marginBottom: 8 }}>
              {t("admin.contracts.title")}
            </Title>
            <Text style={{ color: "rgba(255, 255, 255, 0.65)" }}>
              {t("admin.contracts.subtitle")}
            </Text>
          </div>
          <Button
            icon={<ReloadOutlined spin={isLoading} />}
            onClick={fetchContractStatus}
            loading={isLoading}
          >
            {t("admin.contracts.refresh")}
          </Button>
        </div>

        {/* View Toggle Tabs */}
        <Tabs
          activeKey={viewMode}
          onChange={(key) => setViewMode(key as "table" | "graph")}
          items={[
            {
              key: "table",
              label: (
                <Space>
                  <TableOutlined />
                  {t("admin.contracts.table.listView")}
                </Space>
              ),
              children: (
                <>
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
                        },
                      } as Node);
                      setDetailPanelOpen(true);
                    }}
                  />
                </>
              ),
            },
            {
              key: "graph",
              label: (
                <Space>
                  <ApartmentOutlined />
                  {t("admin.contracts.table.treeView")}
                </Space>
              ),
              children: (
                /* Dependency Tree View - Compact */
                <>
                  {/* 筛选栏（包含显示已解绑 Checkbox） */}
                  <ContractFilterBar
                    filters={filters}
                    onFiltersChange={setFilters}
                    onReset={() => setFilters(DEFAULT_FILTERS)}
                  />
                  <ContractDependencyTree
                    showDeleted={filters.showDeleted}
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
                          },
                        } as Node);
                        setDetailPanelOpen(true);
                      }
                    }}
                  />
                </>
              ),
            },
          ]}
        />

        {/* Update Modal */}
        <Modal
          title={t("admin.contracts.updateModal.title")}
          open={updateModalOpen}
          onCancel={() => {
            setUpdateModalOpen(false);
            setSelectedDependency(null);
            form.resetFields();
          }}
          onOk={() => form.submit()}
          confirmLoading={isUpdating}
        >
          {selectedDependency && (
            <Alert
              type="info"
              message={t("admin.contracts.updateModal.info")}
              description={
                <div>
                  <div>
                    <strong>{t("admin.contracts.updateModal.from")}:</strong>{" "}
                    {selectedDependency.address}
                  </div>
                  <div>
                    <strong>{t("admin.contracts.updateModal.contract")}:</strong>{" "}
                    {selectedDependency.contract}
                  </div>
                </div>
              }
              style={{ marginBottom: 16 }}
            />
          )}
          <Form form={form} layout="vertical" onFinish={handleUpdate}>
            <Form.Item
              name="setFunction"
              label={t("admin.contracts.updateModal.setFunction")}
              rules={[{ required: true }]}
            >
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="newAddress"
              label={t("admin.contracts.updateModal.newAddress")}
              rules={[{ required: true }]}
            >
              <Input disabled />
            </Form.Item>
          </Form>
        </Modal>

        {/* Reset Modal */}
        <Modal
          title={
            <Space>
              <WarningOutlined style={{ color: "#ff4d4f" }} />
              {t("admin.contracts.resetModal.title")}
            </Space>
          }
          open={resetModalOpen}
          onCancel={() => {
            setResetModalOpen(false);
            setResetProject(null);
            setResetConfirmText("");
          }}
          onOk={confirmReset}
          confirmLoading={isResetting}
          okButtonProps={{ danger: true }}
          okText={t("admin.contracts.resetModal.confirm")}
        >
          <Alert
            type="error"
            message={t("admin.contracts.resetModal.warning")}
            description={
              resetProject
                ? t("admin.contracts.resetModal.projectWarning", {
                    project: resetProject,
                  })
                : t("admin.contracts.resetModal.allWarning")
            }
            style={{ marginBottom: 16 }}
          />
          <Paragraph>
            {t("admin.contracts.resetModal.confirmText", {
              text: resetProject ? resetProject.toUpperCase() : "RESET ALL",
            })}
          </Paragraph>
          <Input
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            placeholder={
              resetProject ? resetProject.toUpperCase() : "RESET ALL"
            }
          />
        </Modal>

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
          isRegistering={isRegistering}
          isUnregistering={isUnregistering}
        />
      </div>
    </RequireAdmin>
  );
}