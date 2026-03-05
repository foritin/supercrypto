/**
 * TransactionTable Component
 * 交易审计表格组件 - 使用 shadcn/ui 和 @tanstack/react-table
 */
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TransactionAudit, TransactionAuditType } from '@/types/audit';

import { AddressDisplay } from './web3/address-display';
import { ChainBadge } from './web3/chain-badge';
import { TokenAmount } from './web3/token-amount';
import { TxHashLink } from './web3/tx-hash-link';
import { TxStatusBadge } from './web3/tx-status-badge';

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

  // 定义列配置
  const columns: ColumnDef<TransactionAudit>[] = [
    {
      accessorKey: 'created_at',
      header: t('admin.audit.txTable.time', '时间'),
      size: 160,
      cell: ({ row }) => (
        <span className="text-[13px] text-white/85">
          {formatDateTime(row.original.created_at)}
        </span>
      ),
    },
    {
      accessorKey: 'tx_hash',
      header: t('admin.audit.txTable.txHash', '交易哈希'),
      size: 160,
      cell: ({ row }) => (
        <TxHashLink txHash={row.original.tx_hash} chainId={row.original.chain_id} />
      ),
    },
    {
      id: 'chain',
      header: t('admin.audit.txTable.chain', '链'),
      size: 100,
      cell: ({ row }) => (
        <ChainBadge chainId={row.original.chain_id} network={row.original.network} />
      ),
    },
    {
      accessorKey: 'tx_type',
      header: t('admin.audit.txTable.type', '类型'),
      size: 120,
      cell: ({ row }) => {
        const txType = row.original.tx_type;
        return (
          <span className="text-white/85">
            {t(`admin.audit.txType.${txType}`, TX_TYPE_LABELS[txType] || txType)}
          </span>
        );
      },
    },
    {
      accessorKey: 'from_address',
      header: t('admin.audit.txTable.from', '发送方'),
      size: 150,
      cell: ({ row }) => <AddressDisplay address={row.original.from_address} />,
    },
    {
      accessorKey: 'to_address',
      header: t('admin.audit.txTable.to', '接收方'),
      size: 150,
      cell: ({ row }) => {
        const toAddress = row.original.to_address;
        return toAddress ? (
          <AddressDisplay address={toAddress} />
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: 'amount',
      header: t('admin.audit.txTable.amount', '金额'),
      size: 140,
      cell: ({ row }) => {
        const record = row.original;
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
        return <span className="text-muted-foreground">-</span>;
      },
    },
    {
      id: 'gas',
      header: t('admin.audit.txTable.gas', 'Gas'),
      size: 100,
      cell: ({ row }) => {
        const record = row.original;
        if (record.gas_used) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-white/65 text-xs cursor-default">
                    {record.gas_used.toLocaleString()}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Gas Used: {record.gas_used}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        if (record.gas_limit) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground text-xs cursor-default">
                    ~{record.gas_limit.toLocaleString()}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Gas Limit: {record.gas_limit}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return <span className="text-muted-foreground">-</span>;
      },
    },
    {
      accessorKey: 'status',
      header: t('admin.audit.txTable.status', '状态'),
      size: 110,
      cell: ({ row }) => <TxStatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: t('admin.audit.txTable.actions', '操作'),
      size: 80,
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onViewDetail?.(row.original)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('admin.audit.txTable.viewDetail', '查看详情')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
  ];

  // 转换分页配置
  const paginationConfig = pagination ? {
    pageIndex: pagination.current - 1, // DataTable 使用 0-based index
    pageSize: pagination.pageSize,
    pageCount: Math.ceil(pagination.total / pagination.pageSize),
    onPageChange: (page: number) => pagination.onChange(page + 1, pagination.pageSize),
    onPageSizeChange: (size: number) => pagination.onChange(1, size),
  } : undefined;

  return (
    <div 
      className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(15, 15, 26, 0.6)' }}
    >
      <DataTable<TransactionAudit, unknown>
        columns={columns}
        data={data}
        loading={loading}
        {...(paginationConfig ? { pagination: paginationConfig } : {})}
        emptyMessage={t('admin.audit.txTable.total', '暂无交易记录')}
      />
    </div>
  );
};
