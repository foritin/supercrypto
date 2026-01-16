/**
 * TransactionTable Component
 * 交易审计表格组件
 */
'use client';

import React from 'react';
import { Table, Tooltip, Typography, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import type { TransactionAudit, TransactionAuditType } from '@/services/audit';
import { AddressDisplay } from './web3/AddressDisplay';
import { TxHashLink } from './web3/TxHashLink';
import { TokenAmount } from './web3/TokenAmount';
import { ChainBadge } from './web3/ChainBadge';
import { TxStatusBadge } from './web3/TxStatusBadge';

const { Text } = Typography;

interface TransactionTableProps {
  data: TransactionAudit[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  onViewDetail?: (tx: TransactionAudit) => void;
}

// 交易类型标签
const TX_TYPE_LABELS: Record<TransactionAuditType, string> = {
  transfer: '转账',
  token_transfer: 'Token 转账',
  token_approve: 'Token 授权',
  contract_deploy: '合约部署',
  contract_call: '合约调用',
  staking: '质押',
  unstaking: '解除质押',
  claim_reward: '领取奖励',
  swap: '兑换',
  other: '其他',
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

export const TransactionTable: React.FC<TransactionTableProps> = ({
  data,
  loading = false,
  pagination,
  onViewDetail,
}) => {
  const { t } = useTranslation();

  const columns: ColumnsType<TransactionAudit> = [
    {
      title: t('admin.audit.txTable.time', '时间'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (value: string) => (
        <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13 }}>
          {formatDateTime(value)}
        </Text>
      ),
    },
    {
      title: t('admin.audit.txTable.txHash', '交易哈希'),
      dataIndex: 'tx_hash',
      key: 'tx_hash',
      width: 160,
      render: (value: string, record) => (
        <TxHashLink txHash={value} chainId={record.chain_id} />
      ),
    },
    {
      title: t('admin.audit.txTable.chain', '链'),
      key: 'chain',
      width: 100,
      render: (_, record) => (
        <ChainBadge chainId={record.chain_id} network={record.network} />
      ),
    },
    {
      title: t('admin.audit.txTable.type', '类型'),
      dataIndex: 'tx_type',
      key: 'tx_type',
      width: 120,
      render: (value: TransactionAuditType) => (
        <Text style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
          {t(`admin.audit.txType.${value}`, TX_TYPE_LABELS[value] || value)}
        </Text>
      ),
    },
    {
      title: t('admin.audit.txTable.from', '发送方'),
      dataIndex: 'from_address',
      key: 'from_address',
      width: 150,
      render: (value: string) => <AddressDisplay address={value} />,
    },
    {
      title: t('admin.audit.txTable.to', '接收方'),
      dataIndex: 'to_address',
      key: 'to_address',
      width: 150,
      render: (value: string | null) => 
        value ? <AddressDisplay address={value} /> : <Text type="secondary">-</Text>,
    },
    {
      title: t('admin.audit.txTable.amount', '金额'),
      key: 'amount',
      width: 140,
      render: (_, record) => {
        // 优先显示 Token 金额
        if (record.token_amount && record.token_symbol) {
          return (
            <TokenAmount
              amount={record.token_amount}
              decimals={record.token_decimals || 18}
              symbol={record.token_symbol}
            />
          );
        }
        // 显示 ETH 金额
        if (record.value && record.value !== '0') {
          return (
            <TokenAmount
              amount={record.value}
              decimals={18}
              symbol="ETH"
            />
          );
        }
        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: t('admin.audit.txTable.gas', 'Gas'),
      key: 'gas',
      width: 100,
      render: (_, record) => {
        if (record.gas_used) {
          return (
            <Tooltip title={`Gas Used: ${record.gas_used}`}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 12 }}>
                {record.gas_used.toLocaleString()}
              </Text>
            </Tooltip>
          );
        }
        if (record.gas_limit) {
          return (
            <Tooltip title={`Gas Limit: ${record.gas_limit}`}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ~{record.gas_limit.toLocaleString()}
              </Text>
            </Tooltip>
          );
        }
        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: t('admin.audit.txTable.status', '状态'),
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (value) => <TxStatusBadge status={value} />,
    },
    {
      title: t('admin.audit.txTable.actions', '操作'),
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title={t('admin.audit.txTable.viewDetail', '查看详情')}>
          <a onClick={() => onViewDetail?.(record)}>
            <EyeOutlined style={{ fontSize: 16 }} />
          </a>
        </Tooltip>
      ),
    },
  ];

  return (
    <Table<TransactionAudit>
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      scroll={{ x: 1400 }}
      pagination={pagination ? {
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onChange: pagination.onChange,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => t('admin.audit.txTable.total', '共 {{total}} 条', { total }),
      } : false}
      style={{
        background: 'rgba(15, 15, 26, 0.6)',
        borderRadius: 12,
      }}
    />
  );
};
