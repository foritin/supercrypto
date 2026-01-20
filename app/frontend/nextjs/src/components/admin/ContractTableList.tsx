/**
 * Contract Table List Component
 * 合约表格列表组件 (纯 Provider 模式)
 *
 * 功能:
 * - 按 scope 分组：Global Contracts / Project Contracts
 * - 显示 contract_type 列（registry, kyc, stablecoin, token, defi）
 * - 支持排序 (sorter 配置)
 * - 状态徽章增强 (颜色 + 动画)
 * - 依赖标签展开/收起
 * - 查看详情按钮
 */
'use client';

import {
  Typography,
  Table,
  Tag,
  Button,
  Space,
  Tooltip,
  Divider,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  EyeOutlined,
  ApiOutlined,
  GlobalOutlined,
  FolderOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  DollarOutlined,
  GoldOutlined,
  LineChartOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import type {
  ContractStatusItem,
  ContractStatusResponse,
  DependencyStatusItem,
  RegistrationStatus,
  ContractType,
  ProjectContractsGroup,
} from '@/services/contract';
import { useMemo } from 'react';

const { Text } = Typography;

// 注册状态颜色映射（纯 Provider 模式）
const REGISTRATION_STATUS_COLORS: Record<RegistrationStatus, string> = {
  synced: 'success',
  mismatch: 'warning',
  not_registered: 'orange',
  not_deployed: 'error',
  unknown: 'default',
};

// 注册状态图标映射
const REGISTRATION_STATUS_ICONS: Record<RegistrationStatus, React.ReactNode> = {
  synced: <CheckCircleOutlined />,
  mismatch: <ExclamationCircleOutlined />,
  not_registered: <WarningOutlined />,
  not_deployed: <CloseCircleOutlined />,
  unknown: <ExclamationCircleOutlined />,
};

// 合约类型图标映射
const CONTRACT_TYPE_ICONS: Record<ContractType, React.ReactNode> = {
  registry: <AppstoreOutlined />,
  kyc: <SafetyCertificateOutlined />,
  governance: <BankOutlined />,
  stablecoin: <DollarOutlined />,
  token: <GoldOutlined />,
  defi: <LineChartOutlined />,
};

// 合约类型颜色映射
const CONTRACT_TYPE_COLORS: Record<ContractType, string> = {
  registry: 'purple',
  kyc: 'blue',
  governance: 'geekblue',
  stablecoin: 'green',
  token: 'gold',
  defi: 'orange',
};

// 依赖状态颜色映射（基于 registered 布尔值）
const DEP_STATUS_COLORS = {
  registered: 'success',
  not_registered: 'warning',
} as const;

// 新版 Props：接收新的 API 结构
interface ContractTableListProps {
  contractStatus: ContractStatusResponse | null;
  loading?: boolean;
  onContractClick?: (contract: ContractStatusItem) => void;
}

// 通用表格列生成函数（Global Contracts - 包含 Type 列）
function getGlobalColumns(
  t: any,
  onContractClick?: (contract: ContractStatusItem) => void
): ColumnsType<ContractStatusItem> {
  return [
    {
      title: t('admin.contracts.table.name'),
      dataIndex: 'name',
      key: 'name',
      width: 180,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record: ContractStatusItem) => (
        <Space>
          <ApiOutlined style={{ color: '#00D4AA' }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: t('admin.contracts.table.type'),
      dataIndex: 'contract_type',
      key: 'contract_type',
      width: 120,
      sorter: (a, b) => (a.contract_type || '').localeCompare(b.contract_type || ''),
      render: (type: ContractType | null) => {
        if (!type) return <Text type="secondary">-</Text>;
        const icon = CONTRACT_TYPE_ICONS[type] || <AppstoreOutlined />;
        const color = CONTRACT_TYPE_COLORS[type] || 'default';
        return (
          <Tag color={color} icon={icon} style={{ textTransform: 'capitalize' }}>
            {type}
          </Tag>
        );
      },
    },
    {
      title: t('admin.contracts.table.address'),
      dataIndex: 'address',
      key: 'address',
      width: 180,
      render: (address: string | null) =>
        address ? (
          <Text copyable style={{ fontFamily: 'monospace' }}>
            {address.slice(0, 10)}...{address.slice(-8)}
          </Text>
        ) : (
          <Tag color="error">{t('admin.contracts.status.not_deployed')}</Tag>
        ),
    },
    {
      title: t('admin.contracts.status.legendTitle'),
      dataIndex: 'registration_status',
      key: 'registration_status',
      width: 160,
      sorter: (a, b) => (a.registration_status || '').localeCompare(b.registration_status || ''),
      render: (status: RegistrationStatus) => {
        const color = REGISTRATION_STATUS_COLORS[status] || 'default';
        const icon = REGISTRATION_STATUS_ICONS[status] || <ExclamationCircleOutlined />;
        const labelKey = {
          synced: 'synced',
          mismatch: 'mismatch',
          not_registered: 'notRegistered',
          not_deployed: 'notDeployed',
          unknown: 'unknown',
        }[status] || 'unknown';
        return (
          <Tag color={color} icon={icon} style={{ fontWeight: 500 }}>
            {t(`admin.contracts.status.${labelKey}`)}
          </Tag>
        );
      },
    },
    {
      title: t('admin.contracts.table.dependencies'),
      dataIndex: 'dependencies',
      key: 'dependencies',
      width: 200,
      render: (deps: DependencyStatusItem[]) => {
        if (!deps || deps.length === 0) {
          return <Text type="secondary">-</Text>;
        }

        return (
          <Space wrap size={4}>
            {deps.map((dep) => (
              <Tooltip
                key={dep.key}
                title={
                  <div>
                    <div>
                      <strong>{dep.contract}</strong>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>
                      Key: {dep.key}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>
                      {dep.address || t('admin.contracts.status.notRegistered')}
                    </div>
                  </div>
                }
              >
                <Tag
                  color={dep.registered ? DEP_STATUS_COLORS.registered : DEP_STATUS_COLORS.not_registered}
                  icon={dep.registered ? <CheckCircleOutlined /> : <WarningOutlined />}
                  style={{
                    cursor: 'default',
                    padding: '2px 6px',
                    fontSize: 11,
                    borderRadius: 4,
                  }}
                >
                  {dep.contract}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
    {
      title: t('admin.contracts.table.deployedAt'),
      dataIndex: 'deployed_at',
      key: 'deployed_at',
      width: 160,
      sorter: (a, b) => {
        const aTime = a.deployed_at ? new Date(a.deployed_at).getTime() : 0;
        const bTime = b.deployed_at ? new Date(b.deployed_at).getTime() : 0;
        return aTime - bTime;
      },
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: t('admin.contracts.table.actions'),
      key: 'actions',
      width: 80,
      fixed: 'right' as const,
      render: (_, record: ContractStatusItem) => (
        <Space size="small">
          <Tooltip title={t('admin.contracts.table.viewDetails')}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => onContractClick?.(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];
}

// 项目合约表格列（包含项目列，不含 Type）
function getProjectColumns(
  t: any,
  onContractClick?: (contract: ContractStatusItem) => void
): ColumnsType<ContractStatusItem> {
  return [
    {
      title: t('admin.contracts.table.name'),
      dataIndex: 'name',
      key: 'name',
      width: 180,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string) => (
        <Space>
          <ApiOutlined style={{ color: '#00D4AA' }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: t('admin.contracts.table.address'),
      dataIndex: 'address',
      key: 'address',
      width: 180,
      render: (address: string | null) =>
        address ? (
          <Text copyable style={{ fontFamily: 'monospace' }}>
            {address.slice(0, 10)}...{address.slice(-8)}
          </Text>
        ) : (
          <Tag color="error">{t('admin.contracts.status.not_deployed')}</Tag>
        ),
    },
    {
      title: t('admin.contracts.status.legendTitle'),
      dataIndex: 'registration_status',
      key: 'registration_status',
      width: 160,
      sorter: (a, b) => (a.registration_status || '').localeCompare(b.registration_status || ''),
      render: (status: RegistrationStatus) => {
        const color = REGISTRATION_STATUS_COLORS[status] || 'default';
        const icon = REGISTRATION_STATUS_ICONS[status] || <ExclamationCircleOutlined />;
        const labelKey = {
          synced: 'synced',
          mismatch: 'mismatch',
          not_registered: 'notRegistered',
          not_deployed: 'notDeployed',
          unknown: 'unknown',
        }[status] || 'unknown';
        return (
          <Tag color={color} icon={icon} style={{ fontWeight: 500 }}>
            {t(`admin.contracts.status.${labelKey}`)}
          </Tag>
        );
      },
    },
    {
      title: t('admin.contracts.table.project'),
      dataIndex: 'project',
      key: 'project',
      width: 100,
      render: (project: string) => (
        <Tag style={{ textTransform: 'uppercase', fontWeight: 500 }}>
          {project}
        </Tag>
      ),
    },
    {
      title: t('admin.contracts.table.dependencies'),
      dataIndex: 'dependencies',
      key: 'dependencies',
      width: 250,
      render: (deps: DependencyStatusItem[]) => {
        if (!deps || deps.length === 0) {
          return <Text type="secondary">-</Text>;
        }

        return (
          <Space wrap size={4}>
            {deps.map((dep) => (
              <Tooltip
                key={dep.key}
                title={
                  <div>
                    <div><strong>{dep.contract}</strong></div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>Key: {dep.key}</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>
                      {dep.address || t('admin.contracts.status.notRegistered')}
                    </div>
                  </div>
                }
              >
                <Tag
                  color={dep.registered ? DEP_STATUS_COLORS.registered : DEP_STATUS_COLORS.not_registered}
                  icon={dep.registered ? <CheckCircleOutlined /> : <WarningOutlined />}
                  style={{ padding: '2px 6px', fontSize: 11, borderRadius: 4 }}
                >
                  {dep.contract}
                </Tag>
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
    {
      title: t('admin.contracts.table.deployedAt'),
      dataIndex: 'deployed_at',
      key: 'deployed_at',
      width: 160,
      sorter: (a, b) => {
        const aTime = a.deployed_at ? new Date(a.deployed_at).getTime() : 0;
        const bTime = b.deployed_at ? new Date(b.deployed_at).getTime() : 0;
        return aTime - bTime;
      },
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: t('admin.contracts.table.actions'),
      key: 'actions',
      width: 80,
      fixed: 'right' as const,
      render: (_, record: ContractStatusItem) => (
        <Tooltip title={t('admin.contracts.table.viewDetails')}>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => onContractClick?.(record)}
          />
        </Tooltip>
      ),
    },
  ];
}

// 表格行样式
const getRowClassName = (record: ContractStatusItem) => {
  const status = record.registration_status || 'not_deployed';
  if (status === 'mismatch' || status === 'not_registered') {
    return 'row-needs-binding';
  }
  if (status === 'not_deployed') {
    return 'row-not-deployed';
  }
  return 'row-deployed';
};

// 单个表格组件
interface ContractTableProps {
  title: React.ReactNode;
  dataSource: ContractStatusItem[];
  columns: ColumnsType<ContractStatusItem>;
  loading?: boolean;
  onContractClick?: (contract: ContractStatusItem) => void;
}

function ContractTable({ title, dataSource, columns, loading, onContractClick }: ContractTableProps) {
  const { t } = useTranslation();

  return (
    <div style={{ marginBottom: 32 }}>
      <Space size="middle" style={{ marginBottom: 16 }}>
        {title}
        <Tag color="blue">{dataSource.length}</Tag>
      </Space>
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="name"
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `${t('admin.contracts.table.total')}: ${total}`,
        }}
        rowClassName={getRowClassName}
        onRow={(record) => ({
          onClick: () => onContractClick?.(record),
          style: { cursor: 'pointer' },
        })}
        size="middle"
      />
    </div>
  );
}

export function ContractTableList({
  contractStatus,
  loading = false,
  onContractClick,
}: ContractTableListProps) {
  const { t } = useTranslation();

  // 获取 global 和 project 合约
  const globalContracts = contractStatus?.global_contracts || [];
  const projectGroups = contractStatus?.project_contracts || [];

  // 合并所有项目合约用于显示
  const allProjectContracts = useMemo(() => {
    return projectGroups.flatMap(g => g.contracts);
  }, [projectGroups]);

  const globalColumns = getGlobalColumns(t, onContractClick);
  const projectColumns = getProjectColumns(t, onContractClick);

  if (!contractStatus) {
    return null;
  }

  return (
    <>
      {/* 样式定义 */}
      <style>{`
        /* 三状态行样式 - 绿色：已部署且已绑定 */
        .row-deployed {
          background: rgba(82, 196, 26, 0.03) !important;
          border-left: 3px solid var(--color-success);
        }
        /* 黄色：已部署但需绑定 */
        .row-needs-binding {
          background: rgba(250, 173, 20, 0.05) !important;
          border-left: 3px solid var(--color-warning);
        }
        /* 红色：未部署 */
        .row-not-deployed {
          background: rgba(255, 77, 79, 0.05) !important;
          border-left: 3px solid var(--color-error);
        }

        /* 表格行 hover 增强 */
        .ant-table-tbody > tr:hover > td {
          background: rgba(0, 212, 170, 0.05) !important;
          transition: background 0.2s;
        }
      `}</style>

      {/* Global Contracts 表格 */}
      <ContractTable
        title={
          <Space size="small">
            <GlobalOutlined style={{ color: '#3B82F6' }} />
            <Text strong style={{ color: '#fff', fontSize: 16 }}>
              Global Contracts
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ({t('admin.contracts.globalContracts.description') || '公共基础设施合约'})
            </Text>
          </Space>
        }
        dataSource={globalContracts}
        columns={globalColumns}
        loading={loading}
        onContractClick={onContractClick}
      />

      {/* Project Contracts 表格 */}
      {allProjectContracts.length > 0 && (
        <>
          <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '32px 0' }} />
          <ContractTable
            title={
              <Space size="small">
                <FolderOutlined style={{ color: '#10B981' }} />
                <Text strong style={{ color: '#fff', fontSize: 16 }}>
                  Project Contracts
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ({t('admin.contracts.projectContracts.description') || '项目专属合约'})
                </Text>
              </Space>
            }
            dataSource={allProjectContracts}
            columns={projectColumns}
            loading={loading}
            onContractClick={onContractClick}
          />
        </>
      )}
    </>
  );
}

export default ContractTableList;
