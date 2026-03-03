/**
 * Contract Detail Panel Component
 * 合约详情侧边面板 - Premium UI Design
 * 
 * 参照 AuditLogDetail 组件风格重新设计
 * 使用 SectionCard + InfoRow 组件实现统一的卡片式布局
 */
'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileCode2, 
  Clock, 
  Layers, 
  GitBranch, 
  RefreshCw, 
  Trash2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Star,
  Link as LinkIcon,
  Info,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// 通用 UI 组件
import { SectionCard, InfoRow } from '@/components/ui';

interface ContractDetailPanelProps {
  open: boolean;
  onClose: () => void;
  node: GraphNode | null;
  onUpdateDependency?: () => void;
  onUnregister?: () => void;
  onSetPrimary?: () => void;
  onUnsetPrimary?: () => void;
  isRegistering?: boolean;
  isUnregistering?: boolean;
  isSettingPrimary?: boolean;
}

// 状态配置 - 使用 CSS 变量
const STATUS_CONFIG: Record<string, { 
  color: string; 
  bg: string;
  border: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  ready: { 
    color: 'var(--color-success)', 
    bg: getStatusBgColor('success', 0.1),
    border: getStatusBgColor('success', 0.3),
    badgeVariant: 'default',
  },
  synced: { 
    color: 'var(--color-success)', 
    bg: getStatusBgColor('success', 0.1),
    border: getStatusBgColor('success', 0.3),
    badgeVariant: 'default',
  },
  not_deployed: { 
    color: 'var(--text-muted)', 
    bg: 'rgba(140, 140, 140, 0.1)',
    border: 'rgba(140, 140, 140, 0.3)',
    badgeVariant: 'secondary',
  },
  not_registered: { 
    color: 'var(--color-warning)', 
    bg: getStatusBgColor('warning', 0.1),
    border: getStatusBgColor('warning', 0.3),
    badgeVariant: 'outline',
  },
  missing_deps: { 
    color: 'var(--color-error)', 
    bg: getStatusBgColor('error', 0.1),
    border: getStatusBgColor('error', 0.3),
    badgeVariant: 'destructive',
  },
};

// 项目颜色映射
const PROJECT_COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  common: { bg: 'rgba(24, 144, 255, 0.1)', border: 'rgba(24, 144, 255, 0.3)', text: 'var(--color-info)' },
  mock: { bg: 'rgba(250, 173, 20, 0.1)', border: 'rgba(250, 173, 20, 0.3)', text: 'var(--color-warning)' },
  vanke: { bg: 'rgba(0, 212, 170, 0.1)', border: 'rgba(0, 212, 170, 0.3)', text: 'var(--color-primary)' },
  fake: { bg: 'rgba(0, 212, 170, 0.1)', border: 'rgba(0, 212, 170, 0.3)', text: 'var(--color-primary)' },
};

export function ContractDetailPanel({
  open,
  onClose,
  node,
  onUpdateDependency,
  onUnregister,
  onSetPrimary,
  onUnsetPrimary,
  isRegistering = false,
  isUnregistering = false,
  isSettingPrimary = false,
}: ContractDetailPanelProps) {
  const { t } = useTranslation();
  const [unregisterModalOpen, setUnregisterModalOpen] = useState(false);
  const [setPrimaryModalOpen, setSetPrimaryModalOpen] = useState(false);
  const [unsetPrimaryModalOpen, setUnsetPrimaryModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!node) return null;

  const hasIssue = node.status === 'not_registered' || node.status === 'missing_deps';
  const isReady = node.status === 'ready' || node.status === 'synced';
  const isAddressProvider = node.id === 'AddressProvider' || node.label === 'AddressProvider';
  const canUnregister = isReady && node.isRegistered && onUnregister && !isAddressProvider;
  
  // 主合约相关逻辑
  const isProjectContract = node.type === 'exclusive';
  const isPrimary = node.isPrimary === true;
  const hasContractId = node.contractId != null;
  
  // 使用 actions 字段判断按钮状态
  const actions = node.actions;
  const canSetPrimary = actions?.can_set_primary ?? (
    isProjectContract && isReady && !isPrimary && hasContractId && !!onSetPrimary
  );
  const canUnsetPrimary = actions?.can_unset_primary ?? (
    isProjectContract && isPrimary && hasContractId && !!onUnsetPrimary
  );
  const disabledReason = actions?.disabled_reason || null;
  
  // 判断按钮是否应该显示
  const showSetPrimaryButton = isProjectContract && !isPrimary && hasContractId && onSetPrimary;
  const showUnsetPrimaryButton = isProjectContract && isPrimary && hasContractId && onUnsetPrimary;

  const statusConfig = STATUS_CONFIG[node.status] || STATUS_CONFIG.not_deployed;
  const projectColors = PROJECT_COLOR_MAP[node.project] || PROJECT_COLOR_MAP.common;

  const handleUnregisterConfirm = () => {
    setUnregisterModalOpen(false);
    onUnregister?.();
  };

  const handleSetPrimaryConfirm = () => {
    setSetPrimaryModalOpen(false);
    onSetPrimary?.();
  };

  const handleUnsetPrimaryConfirm = () => {
    setUnsetPrimaryModalOpen(false);
    onUnsetPrimary?.();
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

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent 
          side="right" 
          className="w-[520px] sm:max-w-[520px] p-0 overflow-hidden border-l border-white/10"
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
            <div className="flex items-start gap-4">
              <div 
                className="w-14 h-14 rounded-[14px] flex items-center justify-center shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${statusConfig.bg} 0%, rgba(255, 255, 255, 0.02) 100%)`,
                  border: `1px solid ${statusConfig.border}`,
                }}
              >
                <FileCode2 size={28} style={{ color: statusConfig.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-semibold text-white mb-2">
                  {node.label}
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
                      {t(`admin.contracts.status.${node.status}`)}
                    </Badge>
                    <Badge 
                      variant="secondary" 
                      className="flex items-center gap-1"
                      style={{
                        background: projectColors.bg,
                        borderColor: projectColors.border,
                        color: projectColors.text,
                      }}
                    >
                      {getProjectLabel(node.project)}
                    </Badge>
                    {isPrimary && (
                      <Badge 
                        variant="secondary"
                        className="flex items-center gap-1"
                        style={{
                          background: 'rgba(255, 215, 0, 0.1)',
                          borderColor: 'rgba(255, 215, 0, 0.3)',
                          color: 'var(--color-gold)',
                        }}
                      >
                        <Star size={12} fill="currentColor" />
                        {t('admin.contracts.detail.primaryContract')}
                      </Badge>
                    )}
                  </div>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* 内容区域 - 可滚动 */}
          <div className="relative p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
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

            {/* 合约地址卡片 */}
            <SectionCard 
              title={t('admin.contracts.detail.contractAddress')} 
              icon={<LinkIcon size={16} />}
            >
              <div className="flex items-center justify-between">
                <code className="text-[13px] font-mono text-white/85 break-all leading-relaxed flex-1 mr-3">
                  {node.address}
                </code>
                <button
                  onClick={handleCopyAddress}
                  className="flex items-center gap-1 text-xs bg-transparent border-none cursor-pointer p-1.5 rounded transition-colors hover:bg-white/5"
                  style={{ color: copied ? '#52c41a' : 'rgba(255, 255, 255, 0.45)' }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </SectionCard>

            {/* 合约信息卡片 */}
            <SectionCard 
              title={t('admin.contracts.detail.title')} 
              icon={<Layers size={16} />}
            >
              <InfoRow label={t('admin.contracts.detail.contractType')}>
                <Badge variant="secondary" className="bg-white/5 border-white/10 text-white/85">
                  {getContractTypeLabel(node.type)}
                </Badge>
              </InfoRow>
              <InfoRow label={t('admin.contracts.detail.dependencyStatus')}>
                <span style={{ color: statusConfig.color }}>
                  {t(`admin.contracts.status.${node.status}`)}
                </span>
              </InfoRow>
              <InfoRow label={t('admin.contracts.detail.deployedAt')} showBorder={false}>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-white/45" />
                  {node.deployedAt ? new Date(node.deployedAt).toLocaleString() : '-'}
                </div>
              </InfoRow>
            </SectionCard>

            {/* 依赖信息卡片 - 如果有缺失依赖 */}
            {node.missingDeps && node.missingDeps.length > 0 && (
              <SectionCard 
                title={t('admin.contracts.detail.missingDepsWarning')} 
                icon={<GitBranch size={16} />}
                variant="error"
              >
                <div className="flex flex-wrap gap-2">
                  {node.missingDeps.map((dep: string, index: number) => (
                    <Badge 
                      key={index} 
                      variant="destructive" 
                      className="bg-red-500/10 border-red-500/30 text-red-400"
                    >
                      {dep}
                    </Badge>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* 操作按钮区域 */}
            <SectionCard 
              title={t('admin.contracts.table.actions')} 
              icon={<Info size={16} />}
            >
              <div className="flex flex-col gap-3">
                {/* 注册按钮 */}
                {hasIssue && node.status === 'not_registered' && onUpdateDependency && (
                  <Button
                    onClick={onUpdateDependency}
                    disabled={isRegistering}
                    className="h-11 rounded-xl font-medium w-full"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRegistering ? 'animate-spin' : ''}`} />
                    {isRegistering
                      ? t('admin.contracts.detail.registering')
                      : t('admin.contracts.detail.registerToProvider')}
                  </Button>
                )}

                {/* 设置主合约按钮 */}
                {showSetPrimaryButton && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full">
                          <Button
                            variant="outline"
                            onClick={() => canSetPrimary && setSetPrimaryModalOpen(true)}
                            disabled={!canSetPrimary || isSettingPrimary || isRegistering || isUnregistering}
                            className={`h-11 rounded-xl font-medium w-full ${
                              canSetPrimary 
                                ? 'bg-[rgba(255,215,0,0.05)] border-gold/30 hover:bg-gold/10 text-gold'
                                : 'bg-white/[0.02] border-white/10 text-white/40 cursor-not-allowed'
                            }`}
                          >
                            <Star className={`h-4 w-4 mr-2 ${isSettingPrimary ? 'animate-pulse' : ''}`} />
                            {isSettingPrimary
                              ? t('admin.contracts.primary.setting')
                              : t('admin.contracts.primary.setButton')}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!canSetPrimary && disabledReason && (
                        <TooltipContent side="top" className="max-w-xs">
                          <p>{disabledReason}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* 取消主合约按钮 */}
                {showUnsetPrimaryButton && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full">
                          <Button
                            variant="outline"
                            onClick={() => canUnsetPrimary && setUnsetPrimaryModalOpen(true)}
                            disabled={!canUnsetPrimary || isSettingPrimary || isRegistering || isUnregistering}
                            className={`h-11 rounded-xl font-medium w-full ${
                              canUnsetPrimary
                                ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
                                : 'bg-white/[0.02] border-white/10 text-white/40 cursor-not-allowed'
                            }`}
                          >
                            <Star className={`h-4 w-4 mr-2 ${isSettingPrimary ? 'animate-pulse' : ''}`} />
                            {isSettingPrimary
                              ? t('admin.contracts.primary.unsetting')
                              : t('admin.contracts.primary.unsetButton')}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!canUnsetPrimary && disabledReason && (
                        <TooltipContent side="top" className="max-w-xs">
                          <p>{disabledReason}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* 解除注册按钮 */}
                {canUnregister && (
                  <Button
                    variant="destructive"
                    onClick={() => setUnregisterModalOpen(true)}
                    disabled={isUnregistering || isRegistering || isSettingPrimary}
                    className="h-11 rounded-xl font-medium w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isUnregistering
                      ? t('admin.contracts.unregister.unregistering')
                      : t('admin.contracts.unregister.button')}
                  </Button>
                )}

                {/* 关闭按钮 */}
                <Button 
                  variant="outline"
                  onClick={onClose}
                  disabled={isRegistering || isUnregistering || isSettingPrimary}
                  className="h-11 rounded-xl font-medium w-full bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
                >
                  {t('admin.contracts.detail.close')}
                </Button>
              </div>
            </SectionCard>
          </div>
        </SheetContent>
      </Sheet>

      {/* 解除注册确认对话框 */}
      <AlertDialog open={unregisterModalOpen} onOpenChange={setUnregisterModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#faad14]" />
              {t('admin.contracts.unregister.confirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    {t('admin.contracts.unregister.warning')}
                  </AlertTitle>
                  <AlertDescription>
                    {t('admin.contracts.unregister.warningDesc', { name: node?.label })}
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-muted-foreground">
                  {t('admin.contracts.unregister.warningNote')}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('admin.contracts.unregister.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnregisterConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('admin.contracts.unregister.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 设置主合约确认对话框 */}
      <AlertDialog open={setPrimaryModalOpen} onOpenChange={setSetPrimaryModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-gold" />
              {t('admin.contracts.primary.confirmSetTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('admin.contracts.primary.confirmSetDesc', { 
                    name: node?.label, 
                    project: node?.project 
                  })}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSetPrimaryConfirm}
              className="bg-gold text-bg-dark hover:bg-gold/90"
            >
              {t('admin.contracts.primary.confirmSet')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 取消主合约确认对话框 */}
      <AlertDialog open={unsetPrimaryModalOpen} onOpenChange={setUnsetPrimaryModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-white/45" />
              {t('admin.contracts.primary.confirmUnsetTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('admin.contracts.primary.confirmUnsetDesc', { 
                    name: node?.label, 
                    project: node?.project 
                  })}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsetPrimaryConfirm}>
              {t('admin.contracts.primary.confirmUnset')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ContractDetailPanel;
