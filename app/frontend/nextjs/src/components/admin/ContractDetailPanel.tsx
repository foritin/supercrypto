/**
 * Contract Detail Panel Component
 * 合约详情侧边面板 - Premium UI Design
 * 已迁移至 shadcn/ui 组件
 */
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileCode2, Clock, Layers, GitBranch, RefreshCw, Trash2, AlertTriangle, Copy, Check, X } from 'lucide-react';
import { GraphNode } from '@/services/contract-graph';
import { getStatusBgColor } from '@/lib/theme-colors';

// shadcn/ui 组件
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ContractDetailPanelProps {
  open: boolean;
  onClose: () => void;
  node: GraphNode | null;
  onUpdateDependency?: () => void;
  onUnregister?: () => void;
  isRegistering?: boolean;
  isUnregistering?: boolean;
}

// 项目颜色映射 - 使用 CSS 变量
const PROJECT_COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  common: { bg: 'rgba(24, 144, 255, 0.1)', border: 'rgba(24, 144, 255, 0.3)', text: 'var(--color-info)' },
  mock: { bg: 'rgba(250, 173, 20, 0.1)', border: 'rgba(250, 173, 20, 0.3)', text: 'var(--color-warning)' },
  vanke: { bg: 'rgba(0, 212, 170, 0.1)', border: 'rgba(0, 212, 170, 0.3)', text: 'var(--color-primary)' },
  fake: { bg: 'rgba(0, 212, 170, 0.1)', border: 'rgba(0, 212, 170, 0.3)', text: 'var(--color-primary)' },
};

// 状态颜色映射 - 使用 CSS 变量
const STATUS_COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  ready: { bg: getStatusBgColor('success', 0.1), border: getStatusBgColor('success', 0.3), text: 'var(--color-success)' },
  not_deployed: { bg: 'rgba(140, 140, 140, 0.1)', border: 'rgba(140, 140, 140, 0.3)', text: 'var(--text-muted)' },
  not_registered: { bg: getStatusBgColor('warning', 0.1), border: getStatusBgColor('warning', 0.3), text: 'var(--color-warning)' },
  missing_deps: { bg: getStatusBgColor('error', 0.1), border: getStatusBgColor('error', 0.3), text: 'var(--color-error)' },
};

export function ContractDetailPanel({
  open,
  onClose,
  node,
  onUpdateDependency,
  onUnregister,
  isRegistering = false,
  isUnregistering = false,
}: ContractDetailPanelProps) {
  const { t } = useTranslation();
  const [unregisterModalOpen, setUnregisterModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!node) return null;

  const hasIssue = node.status === 'not_registered' || node.status === 'missing_deps';
  const isReady = node.status === 'ready';
  const isAddressProvider = node.id === 'AddressProvider' || node.label === 'AddressProvider';
  const canUnregister = isReady && node.isRegistered && onUnregister && !isAddressProvider;

  const handleUnregisterConfirm = () => {
    setUnregisterModalOpen(false);
    onUnregister?.();
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(node.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getProjectLabel = (project: string): string => {
    return t(`admin.contracts.filters.${project}`) || project;
  };

  const getContractTypeLabel = (type: string): string => {
    if (type === 'common') return t('admin.contracts.filters.commonType');
    if (type === 'mock') return t('admin.contracts.filters.mockType');
    return t('admin.contracts.filters.exclusive');
  };

  const statusColors = STATUS_COLOR_MAP[node.status] || STATUS_COLOR_MAP.not_deployed;
  const projectColors = PROJECT_COLOR_MAP[node.project] || PROJECT_COLOR_MAP.common;

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent 
          side="right" 
          className="w-[480px] sm:max-w-[480px] p-0 border-l border-white/10 overflow-y-auto"
        >
          {/* 顶部渐变装饰 */}
          <div 
            className="absolute top-0 left-0 right-0 h-[200px] pointer-events-none"
            style={{
              background: `linear-gradient(180deg, ${statusColors.bg} 0%, transparent 100%)`,
            }}
          />

          {/* 头部区域 */}
          <div className="relative px-6 pt-6 pb-5 border-b border-white/[0.06]">
            {/* 图标和标题 */}
            <div className="flex items-start gap-4 pr-8">
              <div 
                className="w-14 h-14 rounded-[14px] flex items-center justify-center flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${statusColors.bg} 0%, rgba(255, 255, 255, 0.02) 100%)`,
                  border: `1px solid ${statusColors.border}`,
                }}
              >
                <FileCode2 size={28} style={{ color: statusColors.text }} />
              </div>
              <div className="flex-1 min-w-0">
                <SheetHeader className="space-y-0 text-left">
                  <SheetTitle className="text-xl font-semibold text-white mb-2">
                    {node.label}
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    {t('admin.contracts.detail.description', '合约详情面板')}
                  </SheetDescription>
                </SheetHeader>
                <div className="flex gap-2 flex-wrap">
                  <span 
                    className="px-2.5 py-1 rounded-md text-xs font-medium"
                    style={{
                      background: statusColors.bg,
                      border: `1px solid ${statusColors.border}`,
                      color: statusColors.text,
                    }}
                  >
                    {t(`admin.contracts.status.${node.status}`)}
                  </span>
                  <span 
                    className="px-2.5 py-1 rounded-md text-xs font-medium"
                    style={{
                      background: projectColors.bg,
                      border: `1px solid ${projectColors.border}`,
                      color: projectColors.text,
                    }}
                  >
                    {getProjectLabel(node.project)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="relative p-6">
            {/* 状态警告 */}
            {hasIssue && (
              <Alert variant="warning" className="mb-5 rounded-xl">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {node.status === 'not_registered'
                    ? t('admin.contracts.detail.notRegisteredWarning')
                    : t('admin.contracts.detail.missingDepsWarning')}
                </AlertTitle>
                <AlertDescription>
                  {node.status === 'not_registered'
                    ? t('admin.contracts.detail.notRegisteredDesc')
                    : t('admin.contracts.detail.missingDepsDesc')}
                </AlertDescription>
              </Alert>
            )}

            {/* 信息卡片 */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* 合约地址 */}
              <div className="p-4 px-5 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/45 uppercase tracking-wider">
                    {t('admin.contracts.detail.contractAddress')}
                  </span>
                  <button
                    onClick={handleCopyAddress}
                    className="flex items-center gap-1 text-xs bg-transparent border-none cursor-pointer p-1 transition-colors"
                    style={{ color: copied ? '#52c41a' : 'rgba(255, 255, 255, 0.45)' }}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <code className="block text-[13px] font-mono text-white/85 break-all leading-relaxed">
                  {node.address}
                </code>
              </div>

              {/* 其他信息 */}
              <div className="grid grid-cols-2">
                <InfoItem
                  icon={<Layers size={16} />}
                  label={t('admin.contracts.detail.contractType')}
                  value={getContractTypeLabel(node.type)}
                />
                <InfoItem
                  icon={<GitBranch size={16} />}
                  label={t('admin.contracts.detail.dependencyStatus')}
                  value={t(`admin.contracts.status.${node.status}`)}
                  valueColor={statusColors.text}
                />
                <InfoItem
                  icon={<Clock size={16} />}
                  label={t('admin.contracts.detail.deployedAt')}
                  value={node.deployedAt ? new Date(node.deployedAt).toLocaleString() : '-'}
                  span={2}
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="mt-6 flex flex-col gap-3">
              {hasIssue && node.status === 'not_registered' && onUpdateDependency && (
                <Button
                  onClick={onUpdateDependency}
                  disabled={isRegistering}
                  className="h-12 rounded-xl font-medium"
                >
                  <RefreshCw className={`h-4 w-4 ${isRegistering ? 'animate-spin' : ''}`} />
                  {isRegistering
                    ? t('admin.contracts.detail.registering')
                    : t('admin.contracts.detail.registerToProvider')}
                </Button>
              )}

              {canUnregister && (
                <Button
                  variant="destructive"
                  onClick={() => setUnregisterModalOpen(true)}
                  disabled={isUnregistering || isRegistering}
                  className="h-12 rounded-xl font-medium"
                >
                  <Trash2 className="h-4 w-4" />
                  {isUnregistering
                    ? t('admin.contracts.unregister.unregistering', '解除注册中...')
                    : t('admin.contracts.unregister.button', '解除注册')}
                </Button>
              )}

              <Button 
                variant="outline"
                onClick={onClose}
                disabled={isRegistering || isUnregistering}
                className="h-12 rounded-xl font-medium bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
              >
                {t('admin.contracts.detail.close')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 解除注册确认对话框 */}
      <AlertDialog open={unregisterModalOpen} onOpenChange={setUnregisterModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#faad14]" />
              {t('admin.contracts.unregister.confirmTitle', '确认解除注册')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    {t('admin.contracts.unregister.warning', '警告：此操作将解除合约注册')}
                  </AlertTitle>
                  <AlertDescription>
                    {t(
                      'admin.contracts.unregister.warningDesc',
                      '您即将解除注册合约 {{name}}。此操作会将 AddressProvider 中的地址设置为零地址。',
                      { name: node?.label }
                    )}
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-muted-foreground">
                  {t('admin.contracts.unregister.warningNote', '解除注册后，依赖此合约的其他合约可能无法正常工作。')}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('admin.contracts.unregister.cancel', '取消')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnregisterConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('admin.contracts.unregister.confirm', '确认解除注册')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// 信息项组件
function InfoItem({ 
  icon, 
  label, 
  value, 
  valueColor,
  span = 1 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  valueColor?: string;
  span?: number;
}) {
  return (
    <div 
      className={`p-4 px-5 border-b border-white/[0.06] ${span === 1 ? 'border-r border-white/[0.06]' : ''}`}
      style={{ gridColumn: span === 2 ? '1 / -1' : undefined }}
    >
      <div className="flex items-center gap-1.5 mb-1.5 text-white/45">
        {icon}
        <span className="text-xs uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div 
        className="text-sm font-medium"
        style={{ color: valueColor || 'rgba(255, 255, 255, 0.85)' }}
      >
        {value}
      </div>
    </div>
  );
}

export default ContractDetailPanel;
