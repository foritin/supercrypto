/**
 * Contract Table List Component
 * 合约表格列表组件 (纯 Provider 模式) - 使用 shadcn/ui 和 @tanstack/react-table
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

import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Eye,
  Plug,
  Globe,
  Folder,
  ShieldCheck,
  Landmark,
  DollarSign,
  Coins,
  TrendingUp,
  LayoutGrid,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type {
  ContractStatusItem,
  ContractStatusResponse,
  DependencyStatusItem,
  RegistrationStatus,
  ContractType,
} from '@/services/contract';

// 注册状态样式映射（纯 Provider 模式）
const REGISTRATION_STATUS_STYLES: Record<RegistrationStatus, { className: string; icon: React.ReactNode }> = {
  synced: {
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  mismatch: {
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  not_registered: {
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  not_deployed: {
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: <XCircle className="h-3 w-3" />,
  },
  unknown: {
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

// 合约类型图标映射
const CONTRACT_TYPE_ICONS: Record<ContractType, React.ReactNode> = {
  registry: <LayoutGrid className="h-3 w-3" />,
  kyc: <ShieldCheck className="h-3 w-3" />,
  governance: <Landmark className="h-3 w-3" />,
  stablecoin: <DollarSign className="h-3 w-3" />,
  token: <Coins className="h-3 w-3" />,
  defi: <TrendingUp className="h-3 w-3" />,
};

// 合约类型样式映射
const CONTRACT_TYPE_STYLES: Record<ContractType, string> = {
  registry: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  kyc: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  governance: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  stablecoin: 'bg-green-500/20 text-green-400 border-green-500/30',
  token: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  defi: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

// 依赖状态样式
const DEP_STATUS_STYLES = {
  registered: 'bg-green-500/20 text-green-400 border-green-500/30',
  not_registered: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
} as const;

// 新版 Props：接收新的 API 结构
interface ContractTableListProps {
  contractStatus: ContractStatusResponse | null;
  loading?: boolean;
  onContractClick?: (contract: ContractStatusItem) => void;
}

// 获取行样式类名
const getRowClassName = (record: ContractStatusItem) => {
  const status = record.registration_status || 'not_deployed';
  if (status === 'mismatch' || status === 'not_registered') {
    return 'border-l-2 border-l-yellow-500 bg-yellow-500/5';
  }
  if (status === 'not_deployed') {
    return 'border-l-2 border-l-red-500 bg-red-500/5';
  }
  return 'border-l-2 border-l-green-500 bg-green-500/5';
};

// 翻译函数类型
type TranslateFunction = ReturnType<typeof useTranslation>['t'];

// 依赖标签组件
function DependencyTags({ deps, t }: { deps: DependencyStatusItem[]; t: TranslateFunction }) {
  if (!deps || deps.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {deps.map((dep) => (
        <TooltipProvider key={dep.key}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  'cursor-default px-1.5 py-0.5 text-[10px] gap-1',
                  dep.registered ? DEP_STATUS_STYLES.registered : DEP_STATUS_STYLES.not_registered
                )}
              >
                {dep.registered ? (
                  <CheckCircle className="h-2.5 w-2.5" />
                ) : (
                  <AlertTriangle className="h-2.5 w-2.5" />
                )}
                {dep.contract}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <div className="font-semibold">{dep.contract}</div>
                <div className="text-[11px] opacity-80">Key: {dep.key}</div>
                <div className="text-[11px] opacity-80">
                  {dep.address || t('admin.contracts.status.notRegistered')}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}

// 通用表格列生成函数（Global Contracts - 包含 Type 列）
function getGlobalColumns(
  t: TranslateFunction,
  onContractClick?: (contract: ContractStatusItem) => void
): ColumnDef<ContractStatusItem>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column} title={t('admin.contracts.table.name')} />
      ),
      size: 180,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-green-400" />
          <span className="font-semibold text-white">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'contract_type',
      header: ({ column }) => (
        <SortableHeader column={column} title={t('admin.contracts.table.type')} />
      ),
      size: 120,
      cell: ({ row }) => {
        const type = row.original.contract_type;
        if (!type) return <span className="text-muted-foreground">-</span>;
        const icon = CONTRACT_TYPE_ICONS[type] || <LayoutGrid className="h-3 w-3" />;
        const style = CONTRACT_TYPE_STYLES[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        return (
          <Badge variant="outline" className={cn('gap-1 capitalize', style)}>
            {icon}
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'address',
      header: t('admin.contracts.table.address'),
      size: 180,
      cell: ({ row }) => {
        const address = row.original.address;
        return address ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-mono text-sm text-white/85 cursor-default">
                  {address.slice(0, 10)}...{address.slice(-8)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-mono">{address}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
            {t('admin.contracts.status.not_deployed')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'registration_status',
      header: ({ column }) => (
        <SortableHeader column={column} title={t('admin.contracts.status.legendTitle')} />
      ),
      size: 160,
      cell: ({ row }) => {
        const status = row.original.registration_status || 'unknown';
        const { className, icon } = REGISTRATION_STATUS_STYLES[status] || REGISTRATION_STATUS_STYLES.unknown;
        const labelKey = {
          synced: 'synced',
          mismatch: 'mismatch',
          not_registered: 'notRegistered',
          not_deployed: 'notDeployed',
          unknown: 'unknown',
        }[status] || 'unknown';
        return (
          <Badge variant="outline" className={cn('gap-1 font-medium', className)}>
            {icon}
            {t(`admin.contracts.status.${labelKey}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'dependencies',
      header: t('admin.contracts.table.dependencies'),
      size: 200,
      cell: ({ row }) => <DependencyTags deps={row.original.dependencies} t={t} />,
    },
    {
      accessorKey: 'deployed_at',
      header: ({ column }) => (
        <SortableHeader column={column} title={t('admin.contracts.table.deployedAt')} />
      ),
      size: 160,
      cell: ({ row }) => {
        const date = row.original.deployed_at;
        return date ? (
          <span className="text-white/70">{new Date(date).toLocaleString()}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: 'actions',
      header: t('admin.contracts.table.actions'),
      size: 80,
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onContractClick?.(row.original);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('admin.contracts.table.viewDetails')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
  ];
}

// 项目合约表格列（包含项目列，不含 Type）
function getProjectColumns(
  t: TranslateFunction,
  onContractClick?: (contract: ContractStatusItem) => void
): ColumnDef<ContractStatusItem>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <SortableHeader column={column} title={t('admin.contracts.table.name')} />
      ),
      size: 180,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-green-400" />
          <span className="font-semibold text-white">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'address',
      header: t('admin.contracts.table.address'),
      size: 180,
      cell: ({ row }) => {
        const address = row.original.address;
        return address ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-mono text-sm text-white/85 cursor-default">
                  {address.slice(0, 10)}...{address.slice(-8)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-mono">{address}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
            {t('admin.contracts.status.not_deployed')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'registration_status',
      header: ({ column }) => (
        <SortableHeader column={column} title={t('admin.contracts.status.legendTitle')} />
      ),
      size: 160,
      cell: ({ row }) => {
        const status = row.original.registration_status || 'unknown';
        const { className, icon } = REGISTRATION_STATUS_STYLES[status] || REGISTRATION_STATUS_STYLES.unknown;
        const labelKey = {
          synced: 'synced',
          mismatch: 'mismatch',
          not_registered: 'notRegistered',
          not_deployed: 'notDeployed',
          unknown: 'unknown',
        }[status] || 'unknown';
        return (
          <Badge variant="outline" className={cn('gap-1 font-medium', className)}>
            {icon}
            {t(`admin.contracts.status.${labelKey}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'project',
      header: t('admin.contracts.table.project'),
      size: 100,
      cell: ({ row }) => (
        <Badge variant="outline" className="uppercase font-medium">
          {row.original.project}
        </Badge>
      ),
    },
    {
      accessorKey: 'dependencies',
      header: t('admin.contracts.table.dependencies'),
      size: 250,
      cell: ({ row }) => <DependencyTags deps={row.original.dependencies} t={t} />,
    },
    {
      accessorKey: 'deployed_at',
      header: ({ column }) => (
        <SortableHeader column={column} title={t('admin.contracts.table.deployedAt')} />
      ),
      size: 160,
      cell: ({ row }) => {
        const date = row.original.deployed_at;
        return date ? (
          <span className="text-white/70">{new Date(date).toLocaleString()}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: 'actions',
      header: t('admin.contracts.table.actions'),
      size: 80,
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onContractClick?.(row.original);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t('admin.contracts.table.viewDetails')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
  ];
}

// 单个表格组件
interface ContractTableProps {
  title: React.ReactNode;
  dataSource: ContractStatusItem[];
  columns: ColumnDef<ContractStatusItem>[];
  loading?: boolean;
}

function ContractTable({ title, dataSource, columns, loading }: ContractTableProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        {title}
        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
          {dataSource.length}
        </Badge>
      </div>
      <div 
        className="rounded-xl overflow-hidden"
        style={{ background: 'rgba(15, 15, 26, 0.6)' }}
      >
        <DataTable<ContractStatusItem, unknown>
          columns={columns}
          data={dataSource}
          loading={loading}
          emptyMessage="暂无合约数据"
        />
      </div>
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

  const globalColumns = useMemo(
    () => getGlobalColumns(t, onContractClick),
    [t, onContractClick]
  );
  const projectColumns = useMemo(
    () => getProjectColumns(t, onContractClick),
    [t, onContractClick]
  );

  if (!contractStatus) {
    return null;
  }

  return (
    <>
      {/* Global Contracts 表格 */}
      <ContractTable
        title={
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            <span className="font-semibold text-white text-base">
              Global Contracts
            </span>
            <span className="text-xs text-muted-foreground">
              ({t('admin.contracts.globalContracts.description') || '公共基础设施合约'})
            </span>
          </div>
        }
        dataSource={globalContracts}
        columns={globalColumns}
        loading={loading}
      />

      {/* Project Contracts 表格 */}
      {allProjectContracts.length > 0 && (
        <>
          <div className="border-t border-white/10 my-8" />
          <ContractTable
            title={
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-emerald-400" />
                <span className="font-semibold text-white text-base">
                  Project Contracts
                </span>
                <span className="text-xs text-muted-foreground">
                  ({t('admin.contracts.projectContracts.description') || '项目专属合约'})
                </span>
              </div>
            }
            dataSource={allProjectContracts}
            columns={projectColumns}
            loading={loading}
          />
        </>
      )}
    </>
  );
}

export default ContractTableList;
