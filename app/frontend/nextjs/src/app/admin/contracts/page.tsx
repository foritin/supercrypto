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
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  WarningOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { parseAbi } from "viem";
import { useCurrentUser } from "@/hooks";
import { RequireAdmin } from "@/components/auth";
import {
  contractAdminService,
  type ContractStatusItem,
  type DependencyStatusItem,
  type ContractStatusResponse,
  CONTRACT_SET_ABIS,
} from "@/services/contract";

const { Title, Text, Paragraph } = Typography;

// 状态颜色映射
const STATUS_COLORS = {
  synced: "success",
  needs_update: "warning",
  not_deployed: "error",
} as const;

// 状态图标映射
const STATUS_ICONS = {
  synced: <CheckCircleOutlined />,
  needs_update: <ExclamationCircleOutlined />,
  not_deployed: <CloseCircleOutlined />,
};

export default function AdminContractsPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { isConnected } = useAccount();
  const { isAdmin } = useCurrentUser();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetProject, setResetProject] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] =
    useState<ContractStatusItem | null>(null);
  const [selectedDependency, setSelectedDependency] =
    useState<DependencyStatusItem | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [form] = Form.useForm();

  // Data state
  const [contractStatus, setContractStatus] =
    useState<ContractStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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

  // 按项目分组
  const groupedContracts = useMemo(() => {
    if (!contractStatus?.contracts) return {};

    const groups: Record<string, ContractStatusItem[]> = {};

    for (const contract of contractStatus.contracts) {
      const project = contract.project || "unknown";
      if (!groups[project]) {
        groups[project] = [];
      }
      groups[project].push(contract);
    }

    return groups;
  }, [contractStatus]);

  // 项目信息映射
  const projectMap = useMemo(() => {
    if (!contractStatus?.projects) return {};
    return Object.fromEntries(contractStatus.projects.map((p) => [p.name, p]));
  }, [contractStatus]);

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
        selectedDependency?.dependency_name ||
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

  // 处理更新依赖地址
  const handleUpdateDependency = (
    contract: ContractStatusItem,
    dependency: DependencyStatusItem
  ) => {
    setSelectedContract(contract);
    setSelectedDependency(dependency);
    form.setFieldsValue({
      setFunction: dependency.set_function,
      newAddress: dependency.latest_address,
    });
    setUpdateModalOpen(true);
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

  // 表格列
  const columns = [
    {
      title: t("admin.contracts.table.name"),
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <Space>
          <ApiOutlined style={{ color: "#00D4AA" }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: t("admin.contracts.table.address"),
      dataIndex: "address",
      key: "address",
      render: (address: string | null) =>
        address ? (
          <Text copyable style={{ fontFamily: "monospace" }}>
            {address.slice(0, 10)}...{address.slice(-8)}
          </Text>
        ) : (
          <Tag color="error">{t("admin.contracts.status.not_deployed")}</Tag>
        ),
    },
    {
      title: t("admin.contracts.table.dependencies"),
      dataIndex: "dependencies",
      key: "dependencies",
      render: (deps: DependencyStatusItem[], record: ContractStatusItem) => {
        if (!deps || deps.length === 0) {
          return <Text type="secondary">-</Text>;
        }

        return (
          <Space wrap>
            {deps.map((dep) => (
              <Tooltip
                key={dep.dependency_name}
                title={
                  dep.status === "needs_update"
                    ? `${dep.current_address?.slice(
                        0,
                        10
                      )}... → ${dep.latest_address?.slice(0, 10)}...`
                    : dep.current_address
                }
              >
                <Tag
                  color={STATUS_COLORS[dep.status]}
                  icon={STATUS_ICONS[dep.status]}
                  style={{
                    cursor:
                      dep.status === "needs_update" ? "pointer" : "default",
                  }}
                  onClick={() => {
                    if (dep.status === "needs_update") {
                      handleUpdateDependency(record, dep);
                    }
                  }}
                >
                  {dep.dependency_name}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
    {
      title: t("admin.contracts.table.deployedAt"),
      dataIndex: "deployed_at",
      key: "deployed_at",
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString() : "-",
    },
  ];

  return (
    <RequireAdmin>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Page Header */}
        <div style={{ marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            {t("admin.contracts.title")}
          </Title>
          <Text style={{ color: "rgba(255, 255, 255, 0.65)" }}>
            {t("admin.contracts.subtitle")}
          </Text>
        </div>

        {/* Contract Groups */}
        <Flex vertical gap={24} style={{ width: "100%" }}>
          {Object.entries(groupedContracts).map(([project, contracts]) => {
            const projectInfo = projectMap[project];
            return (
              <Card
                key={project}
                title={
                  <Space>
                    <Badge status="processing" />
                    <Text strong>{projectInfo?.label || project}</Text>
                    <Tag>{contracts.length}</Tag>
                  </Space>
                }
                extra={
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleReset(project)}
                  >
                    {t("admin.contracts.reset")}
                  </Button>
                }
              >
                <Text
                  type="secondary"
                  style={{ marginBottom: 16, display: "block" }}
                >
                  {projectInfo?.description || ""}
                </Text>
                <Table
                  columns={columns}
                  dataSource={contracts}
                  rowKey="name"
                  pagination={false}
                  loading={isLoading}
                />
              </Card>
            );
          })}

          {/* Global Reset */}
          <Divider />
          <Card>
            <Flex vertical>
              <Text strong>{t("admin.contracts.globalReset")}</Text>
              <Text type="secondary">
                {t("admin.contracts.globalResetDescription")}
              </Text>
              <Button
                danger
                type="primary"
                icon={<DeleteOutlined />}
                onClick={() => handleReset(null)}
              >
                {t("admin.contracts.resetAll")}
              </Button>
            </Flex>
          </Card>
        </Flex>

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
                    {selectedDependency.current_address}
                  </div>
                  <div>
                    <strong>{t("admin.contracts.updateModal.to")}:</strong>{" "}
                    {selectedDependency.latest_address}
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
      </div>
    </RequireAdmin>
  );
}
