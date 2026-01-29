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
 * - Project Contracts 独立项目筛选
 * - 项目就绪状态显示 (Requirements: 4.1-4.5)
 */
'use client';

import { useMemo, useState } from 'react';
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
  Link2,
  Link2Off,
  Star,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ProjectInfo,
  ProjectContractsGroup,
} from '@/services/contract';
import type { ProjectReadinessStatus } from '@/types/contract';

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

// 项目就绪状态样式映射 (Requirements: 4.1)
const PROJECT_READINESS_STYLES: Record<ProjectReadinessStatus, { className: string; icon: React.ReactNode }> = {
  ready: {
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  partially_ready: {
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  not_ready: {
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: <XCircle className="h-3 w-3" />,
  },
};

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

// 依赖标签样式 - 可选依赖使用不同颜色
const OPTIONAL_DEP_STYLES = {
  registered: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400',
  not_registered: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
};

// 依赖标签组件
function DependencyTags({ deps, t, variant = 'required' }: { deps: DependencyStatusItem[]; t: TranslateFunction; variant?: 'required' | 'optional' }) {
  if (!deps || deps.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  const isOptional = variant === 'optional';
  const styles = isOptional ? OPTIONAL_DEP_STYLES : DEP_STATUS_STYLES;

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
                  dep.registered ? styles.registered : styles.not_registered
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
                {isOptional && <div className="text-[11px] text-purple-400">{t('admin.contracts.status.optional')}</div>}
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

/**
 * 项目状态卡片组件
 * 显示项目就绪状态、绑定状态和就绪条件详情
 * Requirements: 4.1-4.5
 */
interface ProjectStatusCardProps {
  projectGroup: ProjectContractsGroup;
  t: TranslateFunction;
}

function ProjectStatusCard({ projectGroup, t }: ProjectStatusCardProps) {
  const {
    project,
    config,
    project_readiness,
    readiness_details,
    is_bound_to_asset,
    bound_asset,
    can_bind_asset,
  } = projectGroup;

  // 获取就绪状态样式
  const readinessStyle = PROJECT_READINESS_STYLES[project_readiness] || PROJECT_READINESS_STYLES.not_ready;
  
  // 就绪状态标签文本
  const readinessLabelKey = {
    ready: 'ready',
    partially_ready: 'partiallyReady',
    not_ready: 'notReady',
  }[project_readiness] || 'notReady';

  // 构建未满足条件列表 (Requirements: 4.2)
  const unmetConditions: string[] = [];
  if (readiness_details) {
    if (!readiness_details.all_registered) {
      unmetConditions.push(t('admin.contracts.projectReadiness.conditions.allRegisteredNo'));
    }
    if (!readiness_details.no_missing_deps) {
      unmetConditions.push(t('admin.contracts.projectReadiness.conditions.noMissingDepsNo'));
    }
    if (!readiness_details.has_primary) {
      unmetConditions.push(t('admin.contracts.projectReadiness.conditions.hasPrimaryNo'));
    }
  }

  return (
    <div 
      className="p-4 rounded-xl border border-white/10 mb-4"
      style={{ background: 'rgba(15, 15, 26, 0.6)' }}
    >
      <div className="flex items-center justify-between">
        {/* 左侧：项目名称和状态 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold text-white text-base uppercase">
              {config?.label || project}
            </span>
          </div>
          
          {/* 就绪状态标签 (Requirements: 4.1) */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={cn('gap-1 font-medium cursor-default', readinessStyle.className)}
                >
                  {readinessStyle.icon}
                  {t(`admin.contracts.projectReadiness.${readinessLabelKey}`)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-2">
                  <div className="font-semibold">
                    {t(`admin.contracts.projectReadiness.tooltip.${project_readiness === 'ready' ? 'ready' : project_readiness === 'partially_ready' ? 'partiallyReady' : 'notReady'}`)}
                  </div>
                  {/* 显示未满足条件 (Requirements: 4.2) */}
                  {unmetConditions.length > 0 && (
                    <ul className="text-xs space-y-1 text-white/70">
                      {unmetConditions.map((condition, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-red-400" />
                          {condition}
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* 显示已满足条件 */}
                  {readiness_details && (
                    <ul className="text-xs space-y-1 text-white/70">
                      {readiness_details.all_registered && (
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          {t('admin.contracts.projectReadiness.conditions.allRegistered')}
                        </li>
                      )}
                      {readiness_details.no_missing_deps && (
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          {t('admin.contracts.projectReadiness.conditions.noMissingDeps')}
                        </li>
                      )}
                      {readiness_details.has_primary && (
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          {t('admin.contracts.projectReadiness.conditions.hasPrimary')}
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* 右侧：绑定状态 */}
        <div className="flex items-center gap-2">
          {/* 已绑定 Asset 时显示 Asset 名称 (Requirements: 4.3) */}
          {is_bound_to_asset && bound_asset && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="gap-1 font-medium cursor-default bg-blue-500/20 text-blue-400 border-blue-500/30"
                  >
                    <Link2 className="h-3 w-3" />
                    {t('admin.contracts.projectReadiness.boundToAsset')}: {bound_asset.asset_name}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {t('admin.contracts.projectReadiness.tooltip.boundAsset', { assetName: bound_asset.asset_name })}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* 可绑定 Asset 标签 (Requirements: 4.4) */}
          {can_bind_asset && !is_bound_to_asset && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="gap-1 font-medium cursor-default bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  >
                    <Link2Off className="h-3 w-3" />
                    {t('admin.contracts.projectReadiness.canBindAsset')}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {t('admin.contracts.projectReadiness.tooltip.canBind')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* 合约数量 */}
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
            {projectGroup.contracts.length} {t('admin.contracts.table.projectContracts')}
          </Badge>
        </div>
      </div>
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
          {row.original.is_primary && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                </TooltipTrigger>
                <TooltipContent>
                  {t('admin.contracts.detail.primaryContract')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
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
      accessorKey: 'optional_dependencies',
      header: t('admin.contracts.table.optionalDependencies'),
      size: 200,
      cell: ({ row }) => <DependencyTags deps={row.original.optional_dependencies || []} t={t} variant="optional" />,
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

  // Project Contracts 独立的项目筛选状态
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // 获取 global 和 project 合约
  const globalContracts = contractStatus?.global_contracts || [];
  const projectGroups = contractStatus?.project_contracts || [];

  // 从 API 响应中获取项目列表
  const projects: ProjectInfo[] = contractStatus?.projects || [];

  // 根据项目筛选过滤 project contracts
  const filteredProjectContracts = useMemo(() => {
    const allProjectContracts = projectGroups.flatMap(g => g.contracts);
    if (projectFilter === 'all') {
      return allProjectContracts;
    }
    return allProjectContracts.filter(c => c.project === projectFilter);
  }, [projectGroups, projectFilter]);

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
      {filteredProjectContracts.length > 0 || projectGroups.length > 0 ? (
        <>
          <div className="border-t border-white/10 my-8" />
          <div className="mb-8">
            {/* 标题和筛选器 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-emerald-400" />
                  <span className="font-semibold text-white text-base">
                    Project Contracts
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({t('admin.contracts.projectContracts.description') || '项目专属合约'})
                  </span>
                </div>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                  {filteredProjectContracts.length}
                </Badge>
              </div>
              
              {/* 项目筛选下拉框 */}
              {projects.length > 0 && (
                <Select
                  value={projectFilter}
                  onValueChange={setProjectFilter}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder={t('admin.contracts.filters.allProjects')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('admin.contracts.filters.allProjects', 'All Projects')}
                    </SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.name} value={project.name}>
                        {project.label || project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 项目状态卡片 (Requirements: 4.1-4.5) */}
            {projectGroups
              .filter(pg => projectFilter === 'all' || pg.project === projectFilter)
              .map((projectGroup) => (
                <ProjectStatusCard
                  key={projectGroup.project}
                  projectGroup={projectGroup}
                  t={t}
                />
              ))}
            
            {/* 表格 */}
            <div 
              className="rounded-xl overflow-hidden"
              style={{ background: 'rgba(15, 15, 26, 0.6)' }}
            >
              <DataTable<ContractStatusItem, unknown>
                columns={projectColumns}
                data={filteredProjectContracts}
                loading={loading}
                emptyMessage={t('admin.contracts.table.noData', '暂无合约数据')}
              />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

export default ContractTableList;
