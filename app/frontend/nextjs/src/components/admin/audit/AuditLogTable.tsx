/**
 * AuditLogTable Component
 * 审计日志表格组件
 */
'use client';

import React from 'react';
import { Table, Tag, Tooltip, Typography, Space } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import type { AuditLog, AuditCategory, AuditAction, AuditStatus } from '@/services/audit';
import { AddressDisplay } from './web3/AddressDisplay';

const { Text } = Typography;

interface AuditLogTableProps {
  data: AuditLog[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  onViewDetail?: (log: AuditLog) => void;
}

// 类别颜色映射
const CATEGORY_COLORS: Record<AuditCategory, string> = {
  auth: 'blue',
  account: 'cyan',
  kyc: 'green',
  contract: 'purple',
  asset: 'gold',
  permission: 'orange',
  system: 'default',
  staking: 'magenta',
};

// 状态配置
const STATUS_CONFIG: Record<AuditStatus, { color: string; icon: React.ReactNode }> = {
  success: { color: 'success', icon: <CheckCircleOutlined /> },
  failed: { color: 'error', icon: <CloseCircleOutlined /> },
  pending: { color: 'processing', icon: <ClockCircleOutlined /> },
  reverted: { color: 'warning', icon: <CloseCircleOutlined /> },
};

// 格式化时间
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  data,
  loading = false,
  pagination,
  onViewDetail,
}) => {
  const { t } = useTranslation();

  const columns: ColumnsType<AuditLog> = [
    {
      title: t('admin.audit.table.time', '操作时间'),
      dataIndex: 'operated_at',
      key: 'operated_at',
      width: 180,
      render: (value: string) => (
        <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13 }}>
          {formatDateTime(value)}
        </Text>
      ),
    },
    {
      title: t('admin.audit.table.operator', '操作者'),
      key: 'operator',
      width: 180,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          {record.operator_address ? (
            <AddressDisplay address={record.operator_address} />
          ) : record.operator_id ? (
            <Text style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              ID: {record.operator_id}
            </Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
          {record.operator_type && (
            <Tag style={{ marginTop: 2, fontSize: 11 }}>
              {t(`admin.audit.operatorType.${record.operator_type}`, record.operator_type)}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: t('admin.audit.table.category', '类别'),
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (value: AuditCategory) => (
        <Tag color={CATEGORY_COLORS[value] || 'default'}>
          {t(`admin.audit.category.${value}`, value)}
        </Tag>
      ),
    },
    {
      title: t('admin.audit.table.action', '操作'),
      dataIndex: 'action',
      key: 'action',
      width: 150,
      render: (value: AuditAction) => (
        <Text style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
          {t(`admin.audit.action.${value.replace('.', '_')}`, value)}
        </Text>
      ),
    },
    {
      title: t('admin.audit.table.target', '目标'),
      key: 'target',
      width: 180,
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          {record.target_address ? (
            <AddressDisplay address={record.target_address} />
          ) : record.target_id ? (
            <Text style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              {record.target_type && `${record.target_type}: `}#{record.target_id}
            </Text>
          ) : record.target_type ? (
            <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
              {record.target_type}
            </Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Space>
      ),
    },
    {
      title: t('admin.audit.table.status', '状态'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: AuditStatus) => {
        const config = STATUS_CONFIG[value] || STATUS_CONFIG.pending;
        return (
          <Tag color={config.color} icon={config.icon}>
            {t(`admin.audit.status.${value}`, value)}
          </Tag>
        );
      },
    },
    {
      title: t('admin.audit.table.description', '描述'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (value: string | null) => (
        <Tooltip title={value}>
          <Text 
            style={{ color: 'rgba(255, 255, 255, 0.65)' }}
            ellipsis
          >
            {value || '-'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: t('admin.audit.table.actions', '操作'),
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title={t('admin.audit.table.viewDetail', '查看详情')}>
          <a onClick={() => onViewDetail?.(record)}>
            <EyeOutlined style={{ fontSize: 16 }} />
          </a>
        </Tooltip>
      ),
    },
  ];

  return (
    <Table<AuditLog>
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      scroll={{ x: 1200 }}
      pagination={pagination ? {
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onChange: pagination.onChange,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => t('admin.audit.table.total', '共 {{total}} 条', { total }),
      } : false}
      style={{
        background: 'rgba(15, 15, 26, 0.6)',
        borderRadius: 12,
      }}
    />
  );
};
