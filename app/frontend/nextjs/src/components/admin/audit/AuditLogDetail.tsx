/**
 * AuditLogDetail Component
 * 审计日志详情抽屉组件 - Premium UI Design
 */
'use client';

import React, { useState } from 'react';
import { Drawer, Tag, Typography } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined,
  CopyOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { 
  FileText, 
  User, 
  Target, 
  Clock, 
  Globe, 
  Monitor, 
  Hash,
  AlertTriangle,
  Link as LinkIcon,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AuditLog, AuditStatus } from '@/services/audit';
import { AddressDisplay, TxHashLink } from './web3';
import { SectionCard, InfoRow } from '@/components/ui';
import { getStatusBgColor } from '@/lib/theme-colors';

const { Text } = Typography;

interface AuditLogDetailProps {
  open: boolean;
  onClose: () => void;
  log: AuditLog | null;
}

// 状态配置 - 使用 CSS 变量
const STATUS_CONFIG: Record<AuditStatus, { 
  color: string; 
  bg: string;
  border: string;
  icon: React.ReactNode; 
  text: string;
}> = {
  success: { 
    color: 'var(--color-success)', 
    bg: getStatusBgColor('success', 0.1),
    border: getStatusBgColor('success', 0.3),
    icon: <CheckCircleOutlined />, 
    text: '成功' 
  },
  failed: { 
    color: 'var(--color-error)', 
    bg: getStatusBgColor('error', 0.1),
    border: getStatusBgColor('error', 0.3),
    icon: <CloseCircleOutlined />, 
    text: '失败' 
  },
  pending: { 
    color: 'var(--color-info)', 
    bg: getStatusBgColor('info', 0.1),
    border: getStatusBgColor('info', 0.3),
    icon: <ClockCircleOutlined />, 
    text: '待处理' 
  },
  reverted: { 
    color: 'var(--color-warning)', 
    bg: getStatusBgColor('warning', 0.1),
    border: getStatusBgColor('warning', 0.3),
    icon: <CloseCircleOutlined />, 
    text: '已回滚' 
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

export const AuditLogDetail: React.FC<AuditLogDetailProps> = ({
  open,
  onClose,
  log,
}) => {
  const { t } = useTranslation();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!log) return null;

  const statusConfig = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Drawer
      title={null}
      placement="right"
      width={560}
      onClose={onClose}
      open={open}
      closable={false}
      rootStyle={{ zIndex: 2147483648 }}
      styles={{
        body: { padding: 0 },
        header: { display: 'none' },
        wrapper: { 
          zIndex: 2147483648,
          background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.98) 0%, rgba(15, 15, 22, 0.98) 100%)',
        },
      }}
    >
      {/* 顶部渐变装饰 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200,
        background: `linear-gradient(180deg, ${statusConfig.bg} 0%, transparent 100%)`,
        pointerEvents: 'none',
      }} />

      {/* 头部区域 */}
      <div style={{
        position: 'relative',
        padding: '24px 24px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}>
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          ✕
        </button>

        {/* 图标和标题 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${statusConfig.bg} 0%, rgba(255, 255, 255, 0.02) 100%)`,
            border: `1px solid ${statusConfig.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <FileText size={28} style={{ color: statusConfig.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              color: '#fff',
              marginBottom: 8,
            }}>
              {t('admin.audit.detail.title', '审计日志详情')}
            </h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                background: statusConfig.bg,
                border: `1px solid ${statusConfig.border}`,
                color: statusConfig.color,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                {statusConfig.icon}
                {t(`admin.audit.status.${log.status}`, statusConfig.text)}
              </span>
              <span style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.7)',
              }}>
                {t(`admin.audit.category.${log.category}`, log.category)}
              </span>
              <span style={{
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.45)',
              }}>
                ID: {log.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 - 可滚动 */}
      <div style={{ 
        padding: 24, 
        position: 'relative',
        maxHeight: 'calc(100vh - 200px)',
        overflowY: 'auto',
      }}>
        {/* 基本信息卡片 */}
        <SectionCard title="基本信息" icon={<FileText size={16} />}>
          <InfoRow label={t('admin.audit.detail.action', '操作')}>
            <span style={{ color: '#00D4AA', fontWeight: 500 }}>
              {t(`admin.audit.action.${log.action.replace('.', '_')}`, log.action)}
            </span>
          </InfoRow>
          <InfoRow label={t('admin.audit.detail.operatedAt', '操作时间')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} style={{ color: 'rgba(255, 255, 255, 0.45)' }} />
              {formatDateTime(log.operated_at)}
            </div>
          </InfoRow>
          {log.duration_ms !== null && (
            <InfoRow label={t('admin.audit.detail.duration', '耗时')}>
              <span style={{ 
                color: log.duration_ms > 1000 ? '#faad14' : '#52c41a',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {log.duration_ms} ms
              </span>
            </InfoRow>
          )}
        </SectionCard>

        {/* 操作者信息 */}
        {(log.operator_address || log.operator_id || log.operator_type) && (
          <SectionCard title={t('admin.audit.detail.operatorInfo', '操作者信息')} icon={<User size={16} />}>
            {log.operator_address && (
              <InfoRow label={t('admin.audit.detail.operatorAddress', '操作者地址')}>
                <AddressDisplay address={log.operator_address} showFull />
              </InfoRow>
            )}
            {log.operator_type && (
              <InfoRow label={t('admin.audit.detail.operatorType', '操作者类型')}>
                <Tag style={{ margin: 0 }}>
                  {t(`admin.audit.operatorType.${log.operator_type}`, log.operator_type)}
                </Tag>
              </InfoRow>
            )}
          </SectionCard>
        )}

        {/* 目标信息 */}
        {(log.target_type || log.target_id || log.target_address) && (
          <SectionCard title={t('admin.audit.detail.targetInfo', '目标信息')} icon={<Target size={16} />}>
            {log.target_type && (
              <InfoRow label={t('admin.audit.detail.targetType', '目标类型')}>
                {log.target_type}
              </InfoRow>
            )}
            {log.target_id && (
              <InfoRow label={t('admin.audit.detail.targetId', '目标 ID')}>
                <code style={{ 
                  fontSize: 12, 
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}>
                  {log.target_id}
                </code>
              </InfoRow>
            )}
            {log.target_address && (
              <InfoRow label={t('admin.audit.detail.targetAddress', '目标地址')}>
                <AddressDisplay address={log.target_address} showFull />
              </InfoRow>
            )}
          </SectionCard>
        )}

        {/* 描述信息 */}
        {log.description && (
          <SectionCard title={t('admin.audit.detail.description', '描述')} icon={<FileText size={16} />}>
            <p style={{ 
              margin: 0, 
              color: 'rgba(255, 255, 255, 0.85)',
              lineHeight: 1.6,
            }}>
              {log.description}
            </p>
          </SectionCard>
        )}

        {/* 变更数据 */}
        {(log.old_value || log.new_value) && (
          <SectionCard title={t('admin.audit.detail.changes', '变更数据')} icon={<ArrowRight size={16} />}>
            {log.old_value && (
              <div style={{ marginBottom: log.new_value ? 16 : 0 }}>
                <div style={{ 
                  fontSize: 11, 
                  color: 'rgba(255, 255, 255, 0.45)', 
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {t('admin.audit.detail.oldValue', '变更前')}
                </div>
                <pre style={{
                  margin: 0,
                  padding: 12,
                  background: 'rgba(255, 77, 79, 0.05)',
                  border: '1px solid rgba(255, 77, 79, 0.15)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, Monaco, monospace',
                  color: 'rgba(255, 255, 255, 0.75)',
                  overflow: 'auto',
                  maxHeight: 120,
                }}>
                  {JSON.stringify(log.old_value, null, 2)}
                </pre>
              </div>
            )}
            {log.new_value && (
              <div>
                <div style={{ 
                  fontSize: 11, 
                  color: 'rgba(255, 255, 255, 0.45)', 
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {t('admin.audit.detail.newValue', '变更后')}
                </div>
                <pre style={{
                  margin: 0,
                  padding: 12,
                  background: 'rgba(82, 196, 26, 0.05)',
                  border: '1px solid rgba(82, 196, 26, 0.15)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, Monaco, monospace',
                  color: 'rgba(255, 255, 255, 0.75)',
                  overflow: 'auto',
                  maxHeight: 120,
                }}>
                  {JSON.stringify(log.new_value, null, 2)}
                </pre>
              </div>
            )}
          </SectionCard>
        )}

        {/* 区块链信息 */}
        {log.tx_hash && (
          <SectionCard title={t('admin.audit.detail.blockchainInfo', '区块链信息')} icon={<LinkIcon size={16} />}>
            <InfoRow label={t('admin.audit.detail.txHash', '交易哈希')}>
              <TxHashLink txHash={log.tx_hash} />
            </InfoRow>
          </SectionCard>
        )}

        {/* 请求上下文 */}
        {(log.ip_address || log.user_agent || log.request_id) && (
          <SectionCard title={t('admin.audit.detail.requestContext', '请求上下文')} icon={<Globe size={16} />}>
            {log.ip_address && (
              <InfoRow label={t('admin.audit.detail.ipAddress', 'IP 地址')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Globe size={14} style={{ color: 'rgba(255, 255, 255, 0.45)' }} />
                  {log.ip_address}
                </div>
              </InfoRow>
            )}
            {log.user_agent && (
              <InfoRow label={t('admin.audit.detail.userAgent', '用户代理')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Monitor size={14} style={{ color: 'rgba(255, 255, 255, 0.45)' }} />
                  <Text ellipsis style={{ maxWidth: 350, color: 'rgba(255, 255, 255, 0.65)', fontSize: 12 }}>
                    {log.user_agent}
                  </Text>
                </div>
              </InfoRow>
            )}
            {log.request_id && (
              <InfoRow label={t('admin.audit.detail.requestId', '请求 ID')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ 
                    fontSize: 11, 
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}>
                    {log.request_id}
                  </code>
                  <button
                    onClick={() => handleCopy(log.request_id!, 'request_id')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copiedField === 'request_id' ? '#52c41a' : 'rgba(255, 255, 255, 0.45)',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    {copiedField === 'request_id' ? <CheckOutlined /> : <CopyOutlined />}
                  </button>
                </div>
              </InfoRow>
            )}
          </SectionCard>
        )}

        {/* 错误信息 */}
        {(log.error_code || log.error_message) && (
          <SectionCard 
            title={t('admin.audit.detail.errorInfo', '错误信息')} 
            icon={<AlertTriangle size={16} />}
            variant="error"
          >
            {log.error_code && (
              <InfoRow label={t('admin.audit.detail.errorCode', '错误代码')}>
                <Tag color="error">{log.error_code}</Tag>
              </InfoRow>
            )}
            {log.error_message && (
              <InfoRow label={t('admin.audit.detail.errorMessage', '错误消息')}>
                <span style={{ color: '#ff4d4f' }}>{log.error_message}</span>
              </InfoRow>
            )}
          </SectionCard>
        )}

        {/* 环境信息 */}
        <SectionCard title="环境" icon={<Hash size={16} />}>
          <InfoRow label={t('admin.audit.detail.environment', '环境')}>
            <Tag style={{ margin: 0 }}>{log.environment}</Tag>
          </InfoRow>
        </SectionCard>
      </div>
    </Drawer>
  );
};
