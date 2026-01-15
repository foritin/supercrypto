/**
 * 项目状态徽章组件
 *
 * Story 10.7: 前端项目状态仪表盘
 */

import { Tag } from 'antd';
import type { ProjectReadiness, ContractStatus } from '@/types/project-registry';


// ===== 项目就绪状态徽章 =====

interface ProjectStatusBadgeProps {
  readiness: ProjectReadiness;
  size?: 'sm' | 'md' | 'lg';
}

const readinessConfig: Record<ProjectReadiness, { label: string; color: string }> = {
  not_ready: { label: '未就绪', color: 'error' },
  partially_ready: { label: '部分就绪', color: 'warning' },
  fully_ready: { label: '完全就绪', color: 'success' },
  unknown: { label: '未知', color: 'default' },
  error: { label: '错误', color: 'error' },
};

export function ProjectStatusBadge({ readiness }: ProjectStatusBadgeProps) {
  const config = readinessConfig[readiness] || readinessConfig.unknown;

  return (
    <Tag color={config.color}>
      {config.label}
    </Tag>
  );
}


// ===== 合约状态徽章 =====

interface ContractStatusBadgeProps {
  status: ContractStatus | null;
}

const statusConfig: Record<ContractStatus, { label: string; color: string }> = {
  not_registered: { label: '未注册', color: 'default' },
  registered: { label: '已注册', color: 'blue' },
  deployed: { label: '已部署', color: 'purple' },
  bound: { label: '已绑定', color: 'cyan' },
  active: { label: '已激活', color: 'green' },
  deprecated: { label: '已废弃', color: 'red' },
};

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  if (!status) {
    return <span style={{ color: '#999' }}>-</span>;
  }

  const config = statusConfig[status];
  if (!config) {
    return <Tag>{status}</Tag>;
  }

  return <Tag color={config.color}>{config.label}</Tag>;
}
