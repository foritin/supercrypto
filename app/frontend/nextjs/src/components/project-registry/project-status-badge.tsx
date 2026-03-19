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
  not_ready: { label: 'Not Ready', variant: 'destructive' },
  partially_ready: { label: 'Partially Ready', variant: 'warning' },
  fully_ready: { label: 'Fully Ready', variant: 'success' },
  unknown: { label: 'Unknown', variant: 'secondary' },
  error: { label: 'Error', variant: 'destructive' },
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
  not_registered: { label: 'Not Registered', variant: 'secondary' },
  registered: { label: 'Registered', variant: 'default' },
  deployed: { label: 'Deployed', variant: 'outline' },
  bound: { label: 'Bound', variant: 'default' },
  active: { label: 'Active', variant: 'success' },
  deprecated: { label: 'Deprecated', variant: 'destructive' },
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
