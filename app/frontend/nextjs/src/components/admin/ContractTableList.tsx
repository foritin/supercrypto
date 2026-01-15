/**
 * Contract Table List Component
 * 合约表格列表组件
 *
 * 功能:
 * - 拆分为两个表格：公共合约表格 + 项目合约表格
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
  EyeOutlined,
  ApiOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import type {
  ContractStatusItem,
  DependencyStatusItem,
} from '@/services/contract';
import { useMemo } from 'react';

const { Text, Title } = Typography;

// 部署状态颜色映射（三种状态）
const DEPLOYMENT_STATUS_COLORS = {
  deployed_and_binded: 'success',
  deployed_needs_binding: 'warning',
  not_deployed: 'error',
} as const;

// 部署状态图标映射
const DEPLOYMENT_STATUS_ICONS = {
  deployed_and_binded: <CheckCircleOutlined />,
  deployed_needs_binding: <ExclamationCircleOutlined />,
  not_deployed: <CloseCircleOutlined />,
};

// 状态颜色映射（用于依赖项）
const STATUS_COLORS = {
  synced: 'success',
  needs_update: 'warning',
  not_deployed: 'error',
} as const;

// 状态图标映射（用于依赖项）
const STATUS_ICONS = {
  synced: <CheckCircleOutlined />,
  needs_update: <ExclamationCircleOutlined />,
  not_deployed: <CloseCircleOutlined />,
};

interface ContractTableListProps {
  contracts: ContractStatusItem[];
  loading?: boolean;
  onContractClick?: (contract: ContractStatusItem) => void;
}

// 通用表格列生成函数（不含项目列）
function getCommonColumns(
  t: any,
  onContractClick?: (contract: ContractStatusItem) => void
): ColumnsType<ContractStatusItem> {
  return [
    {
      title: t('admin.contracts.table.name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record: ContractStatusItem) => (
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
      dataIndex: 'deployment_status',
      key: 'deployment_status',
      width: 200,
      sorter: (a, b) => a.deployment_status?.localeCompare(b.deployment_status || ''),
      render: (status: string) => {
        const color = DEPLOYMENT_STATUS_COLORS[status as keyof typeof DEPLOYMENT_STATUS_COLORS];
        const icon = DEPLOYMENT_STATUS_ICONS[status as keyof typeof DEPLOYMENT_STATUS_ICONS];
        const labelKey = {
          deployed_and_binded: 'deployedAndBinded',
          deployed_needs_binding: 'deployedNeedsBinding',
          not_deployed: 'notDeployed',
        }[status] || 'notDeployed';
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
      width: 300,
      render: (deps: DependencyStatusItem[]) => {
        if (!deps || deps.length === 0) {
          return <Text type="secondary">-</Text>;
        }

        return (
          <Space wrap>
            {deps.map((dep) => (
              <Tooltip
                key={dep.dependency_name}
                title={
                  <div>
                    <div>
                      <strong>{dep.dependency_name}</strong>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>
                      {dep.status === 'needs_update'
                        ? `${dep.current_address?.slice(0, 10)}... → ${dep.latest_address?.slice(0, 10)}...`
                        : dep.current_address || t('admin.contracts.status.not_deployed')}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>
                      {dep.set_function}
                    </div>
                  </div>
                }
              >
                <Tag
                  color={STATUS_COLORS[dep.status]}
                  icon={STATUS_ICONS[dep.status]}
                  style={{
                    cursor: 'default',
                    padding: '4px 8px',
                    fontSize: 12,
                    borderRadius: 6,
                    transition: 'all 0.2s',
                  }}
                >
                  {dep.dependency_name}
                  {dep.status === 'needs_update' && (
                    <ExclamationCircleOutlined style={{ marginLeft: 4 }} />
                  )}
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
      width: 180,
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
      width: 100,
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

// 项目合约表格列（包含项目列）
function getProjectColumns(
  t: any,
  onContractClick?: (contract: ContractStatusItem) => void
): ColumnsType<ContractStatusItem> {
  const commonColumns = getCommonColumns(t, onContractClick);
  // 在状态列后插入项目列
  const projectColumn: ColumnsType<ContractStatusItem>[0] = {
    title: t('admin.contracts.table.project'),
    dataIndex: 'project',
    key: 'project',
    width: 120,
    sorter: (a, b) => a.project.localeCompare(b.project),
    render: (project: string) => (
      <Tag
        style={{
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
      >
        {project}
      </Tag>
    ),
  };

  return [
    ...commonColumns.slice(0, 3), // name, address, status
    projectColumn, // project
    ...commonColumns.slice(3), // dependencies, deployedAt, actions
  ];
}

// 表格行样式
const getRowClassName = (record: ContractStatusItem) => {
  const status = record.deployment_status || 'not_deployed';
  if (status === 'deployed_needs_binding') {
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
        scroll={{ x: 1200 }}
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
      />
    </div>
  );
}

export function ContractTableList({
  contracts,
  loading = false,
  onContractClick,
}: ContractTableListProps) {
  const { t } = useTranslation();

  // 分离公共合约和项目合约
  const { commonContracts, projectContracts } = useMemo(() => {
    const common = contracts.filter(c => c.project === 'common');
    const projects = contracts.filter(c => c.project !== 'common');
    return { commonContracts: common, projectContracts: projects };
  }, [contracts]);

  const commonColumns = getCommonColumns(t, onContractClick);
  const projectColumns = getProjectColumns(t, onContractClick);

  return (
    <>
      {/* 样式定义 */}
      <style>{`
        /* 三状态行样式 - 绿色：已部署且已绑定 */
        .row-deployed {
          background: rgba(34, 197, 94, 0.03) !important;
          border-left: 3px solid #22C55E;
        }
        /* 黄色：已部署但需绑定 */
        .row-needs-binding {
          background: rgba(234, 179, 8, 0.05) !important;
          border-left: 3px solid #EAB308;
        }
        /* 红色：未部署 */
        .row-not-deployed {
          background: rgba(239, 68, 68, 0.05) !important;
          border-left: 3px solid #EF4444;
        }

        /* 表格行 hover 增强 */
        .ant-table-tbody > tr:hover > td {
          background: rgba(0, 212, 170, 0.05) !important;
          transition: background 0.2s;
        }

        /* 状态徽章发光动画 */
        @keyframes pulse-badge {
          0%, 100% { box-shadow: 0 0 10px rgba(234, 179, 8, 0.4); }
          50% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.6), 0 0 30px rgba(234, 179, 8, 0.3); }
        }
      `}</style>

      {/* 公共合约表格 */}
      <ContractTable
        title={
          <Space size="small">
            <FolderOutlined style={{ color: '#3B82F6' }} />
            <Text strong style={{ color: '#fff', fontSize: 16 }}>
              {t('admin.contracts.filters.common')}
            </Text>
          </Space>
        }
        dataSource={commonContracts}
        columns={commonColumns}
        loading={loading}
        onContractClick={onContractClick}
      />

      {/* 项目合约表格 */}
      {projectContracts.length > 0 && (
        <>
          <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '32px 0' }} />
          <ContractTable
            title={
              <Space size="small">
                <FolderOutlined style={{ color: '#10B981' }} />
                <Text strong style={{ color: '#fff', fontSize: 16 }}>
                  {t('admin.contracts.table.projectContracts')}
                </Text>
              </Space>
            }
            dataSource={projectContracts}
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
