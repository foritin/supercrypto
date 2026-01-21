/**
 * 项目状态徽章组件
 *
 * Story 10.7: 前端项目状态仪表盘
 */

import { Badge } from '@/components/ui/badge';
import type { ProjectReadiness, ContractStatus } from '@/types/project-registry';


// ===== 项目就绪状态徽章 =====

interface ProjectStatusBadgeProps {
  readiness: ProjectReadiness;
  size?: 'sm' | 'md' | 'lg';
}

const readinessConfig: Record<ProjectReadiness, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  not_ready: { label: '未就绪', variant: 'destructive' },
  partially_ready: { label: '部分就绪', variant: 'warning' },
  fully_ready: { label: '完全就绪', variant: 'success' },
  unknown: { label: '未知', variant: 'secondary' },
  error: { label: '错误', variant: 'destructive' },
};

export function ProjectStatusBadge({ readiness }: ProjectStatusBadgeProps) {
  const config = readinessConfig[readiness] || readinessConfig.unknown;

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}


// ===== 合约状态徽章 =====

interface ContractStatusBadgeProps {
  status: ContractStatus | null;
}

const statusConfig: Record<ContractStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  not_registered: { label: '未注册', variant: 'secondary' },
  registered: { label: '已注册', variant: 'default' },
  deployed: { label: '已部署', variant: 'outline' },
  bound: { label: '已绑定', variant: 'default' },
  active: { label: '已激活', variant: 'success' },
  deprecated: { label: '已废弃', variant: 'destructive' },
};

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  if (!status) {
    return <span className="text-muted-foreground">-</span>;
  }

  const config = statusConfig[status];
  if (!config) {
    return <Badge variant="secondary">{status}</Badge>;
  }

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
