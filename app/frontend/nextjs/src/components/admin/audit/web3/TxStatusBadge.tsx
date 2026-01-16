/**
 * TxStatusBadge Component
 * 交易状态徽章组件
 */
'use client';

import React from 'react';
import { Tag } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined,
  SyncOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { TransactionAuditStatus } from '@/services/audit';

interface TxStatusBadgeProps {
  status: TransactionAuditStatus;
}

// 状态配置
const STATUS_CONFIG: Record<TransactionAuditStatus, {
  color: string;
  icon: React.ReactNode;
  labelKey: string;
}> = {
  pending: {
    color: 'processing',
    icon: <SyncOutlined spin />,
    labelKey: 'admin.audit.txStatus.pending',
  },
  confirmed: {
    color: 'success',
    icon: <CheckCircleOutlined />,
    labelKey: 'admin.audit.txStatus.confirmed',
  },
  failed: {
    color: 'error',
    icon: <CloseCircleOutlined />,
    labelKey: 'admin.audit.txStatus.failed',
  },
  reverted: {
    color: 'warning',
    icon: <CloseCircleOutlined />,
    labelKey: 'admin.audit.txStatus.reverted',
  },
  dropped: {
    color: 'default',
    icon: <StopOutlined />,
    labelKey: 'admin.audit.txStatus.dropped',
  },
};

export const TxStatusBadge: React.FC<TxStatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();
  
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <Tag color={config.color} icon={config.icon}>
      {t(config.labelKey, status)}
    </Tag>
  );
};
