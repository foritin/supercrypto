/**
 * AuditLogDetail Component
 * 审计日志详情抽屉组件 - Premium UI Design
 * 
 * 已迁移到 shadcn/ui:
 * - Drawer → Sheet
 * - Tag → Badge
 * - @ant-design/icons → lucide-react
 */
'use client';

import { 
  CheckCircle, 
  XCircle, 
  Clock,
  Copy,
  Check,
  FileText, 
  User, 
  Target, 
  Globe, 
  Monitor, 
  Hash,
  AlertTriangle,
  Link as LinkIcon,
  ArrowRight,
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SectionCard, InfoRow } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { getStatusBgColor } from '@/lib/theme-colors';
import { cn } from '@/lib/utils';
import type { AuditLog, AuditStatus } from '@/types/audit';

import { AddressDisplay, TxHashLink } from './web3';

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
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  success: { 
    color: 'var(--color-success)', 
    bg: getStatusBgColor('success', 0.1),
    border: getStatusBgColor('success', 0.3),
    icon: <CheckCircle className="w-3.5 h-3.5" />, 
    text: '成功',
    badgeVariant: 'default',
  },
  failed: { 
    color: 'var(--color-error)', 
    bg: getStatusBgColor('error', 0.1),
    border: getStatusBgColor('error', 0.3),
    icon: <XCircle className="w-3.5 h-3.5" />, 
    text: '失败',
    badgeVariant: 'destructive',
  },
  pending: { 
    color: 'var(--color-info)', 
    bg: getStatusBgColor('info', 0.1),
    border: getStatusBgColor('info', 0.3),
    icon: <Clock className="w-3.5 h-3.5" />, 
    text: '待处理',
    badgeVariant: 'secondary',
  },
  reverted: { 
    color: 'var(--color-warning)', 
    bg: getStatusBgColor('warning', 0.1),
    border: getStatusBgColor('warning', 0.3),
    icon: <XCircle className="w-3.5 h-3.5" />, 
    text: '已回滚',
    badgeVariant: 'outline',
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
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent 
        side="right" 
        className="w-[560px] sm:max-w-[560px] p-0 overflow-hidden border-l border-white/10"
        style={{
          background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.98) 0%, rgba(15, 15, 22, 0.98) 100%)',
        }}
      >
        {/* 顶部渐变装饰 */}
        <div 
          className="absolute top-0 left-0 right-0 h-[200px] pointer-events-none"
          style={{
            background: `linear-gradient(180deg, ${statusConfig.bg} 0%, transparent 100%)`,
          }} 
        />

        {/* 头部区域 */}
        <SheetHeader className="relative px-6 pt-6 pb-5 border-b border-white/[0.06]">
          {/* 图标和标题 */}
          <div className="flex items-start gap-4">
            <div 
              className="w-14 h-14 rounded-[14px] flex items-center justify-center shrink-0"
              style={{
                background: `linear-gradient(135deg, ${statusConfig.bg} 0%, rgba(255, 255, 255, 0.02) 100%)`,
                border: `1px solid ${statusConfig.border}`,
              }}
            >
              <FileText size={28} style={{ color: statusConfig.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-semibold text-white mb-2">
                {t('admin.audit.detail.title', '审计日志详情')}
              </SheetTitle>
              <SheetDescription asChild>
                <div className="flex gap-2 flex-wrap items-center">
                  <Badge 
                    variant={statusConfig.badgeVariant}
                    className="flex items-center gap-1"
                    style={{
                      background: statusConfig.bg,
                      borderColor: statusConfig.border,
                      color: statusConfig.color,
                    }}
                  >
                    {statusConfig.icon}
                    {t(`admin.audit.status.${log.status}`, statusConfig.text)}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/5 border-white/10 text-white/70">
                    {t(`admin.audit.category.${log.category}`, log.category)}
                  </Badge>
                  <span className="text-xs text-white/45">
                    ID: {log.id}
                  </span>
                </div>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* 内容区域 - 可滚动 */}
        <div className="relative p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* 基本信息卡片 */}
          <SectionCard title="基本信息" icon={<FileText size={16} />}>
            <InfoRow label={t('admin.audit.detail.action', '操作')}>
              <span className="text-primary font-medium">
                {t(`admin.audit.action.${log.action.replace('.', '_')}`, log.action)}
              </span>
            </InfoRow>
            <InfoRow label={t('admin.audit.detail.operatedAt', '操作时间')}>
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-white/45" />
                {formatDateTime(log.operated_at)}
              </div>
            </InfoRow>
            {log.duration_ms !== null && (
              <InfoRow label={t('admin.audit.detail.duration', '耗时')}>
                <span 
                  className={cn(
                    "tabular-nums",
                    log.duration_ms > 1000 ? "text-yellow-500" : "text-green-500"
                  )}
                >
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
                  <Badge variant="secondary" className="bg-white/5 border-white/10">
                    {t(`admin.audit.operatorType.${log.operator_type}`, log.operator_type)}
                  </Badge>
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
                  <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">
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
              <p className="m-0 text-white/85 leading-relaxed">
                {log.description}
              </p>
            </SectionCard>
          )}

          {/* 变更数据 */}
          {(log.old_value || log.new_value) && (
            <SectionCard title={t('admin.audit.detail.changes', '变更数据')} icon={<ArrowRight size={16} />}>
              {log.old_value && (
                <div className={cn(log.new_value && "mb-4")}>
                  <div className="text-[11px] text-white/45 mb-2 uppercase tracking-wider">
                    {t('admin.audit.detail.oldValue', '变更前')}
                  </div>
                  <pre className="m-0 p-3 bg-red-500/5 border border-red-500/15 rounded-lg text-xs font-mono text-white/75 overflow-auto max-h-[120px]">
                    {JSON.stringify(log.old_value, null, 2)}
                  </pre>
                </div>
              )}
              {log.new_value && (
                <div>
                  <div className="text-[11px] text-white/45 mb-2 uppercase tracking-wider">
                    {t('admin.audit.detail.newValue', '变更后')}
                  </div>
                  <pre className="m-0 p-3 bg-green-500/5 border border-green-500/15 rounded-lg text-xs font-mono text-white/75 overflow-auto max-h-[120px]">
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
                  <div className="flex items-center gap-1.5">
                    <Globe size={14} className="text-white/45" />
                    {log.ip_address}
                  </div>
                </InfoRow>
              )}
              {log.user_agent && (
                <InfoRow label={t('admin.audit.detail.userAgent', '用户代理')}>
                  <div className="flex items-center gap-1.5">
                    <Monitor size={14} className="text-white/45" />
                    <span className="max-w-[350px] truncate text-white/65 text-xs">
                      {log.user_agent}
                    </span>
                  </div>
                </InfoRow>
              )}
              {log.request_id && (
                <InfoRow label={t('admin.audit.detail.requestId', '请求 ID')}>
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] bg-white/5 px-1.5 py-0.5 rounded">
                      {log.request_id}
                    </code>
                    <button
                      onClick={() => handleCopy(log.request_id!, 'request_id')}
                      className={cn(
                        "bg-transparent border-none cursor-pointer p-0.5 transition-colors",
                        copiedField === 'request_id' ? "text-green-500" : "text-white/45 hover:text-white/70"
                      )}
                    >
                      {copiedField === 'request_id' ? <Check size={14} /> : <Copy size={14} />}
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
                  <Badge variant="destructive">{log.error_code}</Badge>
                </InfoRow>
              )}
              {log.error_message && (
                <InfoRow label={t('admin.audit.detail.errorMessage', '错误消息')}>
                  <span className="text-red-500">{log.error_message}</span>
                </InfoRow>
              )}
            </SectionCard>
          )}

          {/* 环境信息 */}
          <SectionCard title="环境" icon={<Hash size={16} />}>
            <InfoRow label={t('admin.audit.detail.environment', '环境')}>
              <Badge variant="secondary" className="bg-white/5 border-white/10">
                {log.environment}
              </Badge>
            </InfoRow>
          </SectionCard>
        </div>
      </SheetContent>
    </Sheet>
  );
};
