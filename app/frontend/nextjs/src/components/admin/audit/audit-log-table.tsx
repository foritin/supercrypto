/**
 * AuditLogTable Component
 * 审计日志表格组件 - 使用 shadcn/ui 和 @tanstack/react-table
 */
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { AuditLog, AuditCategory, AuditAction, AuditStatus } from '@/types/audit';

import { AddressDisplay } from './web3/address-display';

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

// 类别颜色映射 - 使用 Tailwind 类名
const CATEGORY_STYLES: Record<AuditCategory, string> = {
  auth: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  account: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  kyc: 'bg-green-500/20 text-green-400 border-green-500/30',
  contract: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  asset: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  permission: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  system: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  staking: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

// 状态配置
const STATUS_CONFIG: Record<AuditStatus, { className: string; icon: React.ReactNode }> = {
  success: { 
    className: 'bg-green-500/20 text-green-400 border-green-500/30', 
    icon: <CheckCircle className="h-3 w-3" /> 
  },
  failed: { 
    className: 'bg-red-500/20 text-red-400 border-red-500/30', 
    icon: <XCircle className="h-3 w-3" /> 
  },
  pending: { 
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', 
    icon: <Clock className="h-3 w-3" /> 
  },
  reverted: { 
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', 
    icon: <XCircle className="h-3 w-3" /> 
  },
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

  // 定义列配置
  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'operated_at',
      header: t('admin.audit.table.time', '操作时间'),
      size: 180,
      cell: ({ row }) => (
        <span className="text-[13px] text-white/85">
          {formatDateTime(row.original.operated_at)}
        </span>
      ),
    },
    {
      id: 'operator',
      header: t('admin.audit.table.operator', '操作者'),
      size: 180,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            {record.operator_address ? (
              <AddressDisplay address={record.operator_address} />
            ) : record.operator_id ? (
              <span className="text-white/85">
                ID: {record.operator_id}
              </span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
            {record.operator_type && (
              <Badge 
                variant="outline" 
                className="mt-0.5 text-[11px] px-1.5 py-0 h-5 w-fit"
              >
                {t(`admin.audit.operatorType.${record.operator_type}`, record.operator_type)}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'category',
      header: t('admin.audit.table.category', '类别'),
      size: 100,
      cell: ({ row }) => {
        const category = row.original.category as AuditCategory;
        const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.system;
        return (
          <Badge variant="outline" className={style}>
            {t(`admin.audit.category.${category}`, category)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'action',
      header: t('admin.audit.table.action', '操作'),
      size: 150,
      cell: ({ row }) => {
        const action = row.original.action as AuditAction;
        return (
          <span className="text-white/85">
            {t(`admin.audit.action.${action.replace('.', '_')}`, action)}
          </span>
        );
      },
    },
    {
      id: 'target',
      header: t('admin.audit.table.target', '目标'),
      size: 180,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            {record.target_address ? (
              <AddressDisplay address={record.target_address} />
            ) : record.target_id ? (
              <span className="text-white/85">
                {record.target_type && `${record.target_type}: `}#{record.target_id}
              </span>
            ) : record.target_type ? (
              <span className="text-white/65">
                {record.target_type}
              </span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: t('admin.audit.table.status', '状态'),
      size: 100,
      cell: ({ row }) => {
        const status = row.original.status as AuditStatus;
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
        return (
          <Badge variant="outline" className={`${config.className} gap-1`}>
            {config.icon}
            {t(`admin.audit.status.${status}`, status)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'description',
      header: t('admin.audit.table.description', '描述'),
      cell: ({ row }) => {
        const description = row.original.description;
        if (!description) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-white/65 truncate block max-w-[200px] cursor-default">
                  {description}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[300px]">
                <p>{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: 'actions',
      header: t('admin.audit.table.actions', '操作'),
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
              {t('admin.audit.table.viewDetail', '查看详情')}
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
      <DataTable<AuditLog, unknown>
        columns={columns}
        data={data}
        loading={loading}
        {...(paginationConfig ? { pagination: paginationConfig } : {})}
        emptyMessage={t('admin.audit.table.empty', '暂无审计日志')}
      />
    </div>
  );
};
