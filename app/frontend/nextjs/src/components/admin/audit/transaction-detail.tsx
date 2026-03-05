/**
 * TransactionDetail Component
 * 交易详情抽屉组件 - Premium UI Design
 * 
 * 已迁移到 shadcn/ui:
 * - Drawer → Sheet
 * - Tag → Badge
 * - Typography → Tailwind typography
 * - @ant-design/icons → lucide-react
 */
'use client';

import { 
  CheckCircle, 
  XCircle, 
  Clock,
  Copy,
  Check,
  Loader2,
  FileText, 
  Hash,
  AlertTriangle,
  Link as LinkIcon,
  Wallet,
  Coins,
  Fuel,
  Box,
  Code,
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
import { TransactionAuditType } from '@/types/audit';
import type { TransactionAudit , TransactionAuditStatus } from '@/types/audit';

import { AddressDisplay, TxHashLink, TokenAmount, ChainBadge } from './web3';


interface TransactionDetailProps {
  open: boolean;
  onClose: () => void;
  transaction: TransactionAudit | null;
}

// 交易类型标签
const TX_TYPE_LABELS: Record<TransactionAuditType, string> = {
  [TransactionAuditType.TRANSFER]: '转账',
  [TransactionAuditType.TOKEN_TRANSFER]: 'Token 转账',
  [TransactionAuditType.TOKEN_APPROVE]: 'Token 授权',
  [TransactionAuditType.CONTRACT_DEPLOY]: '合约部署',
  [TransactionAuditType.CONTRACT_CALL]: '合约调用',
  [TransactionAuditType.STAKING]: '质押',
  [TransactionAuditType.UNSTAKING]: '解除质押',
  [TransactionAuditType.CLAIM_REWARD]: '领取奖励',
  [TransactionAuditType.SWAP]: '兑换',
  [TransactionAuditType.OTHER]: '其他',
};

// 状态配置 - 使用 CSS 变量
const STATUS_CONFIG: Record<TransactionAuditStatus, { 
  color: string; 
  bg: string;
  border: string;
  icon: React.ReactNode; 
  text: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  confirmed: { 
    color: 'var(--color-success)', 
    bg: getStatusBgColor('success', 0.1),
    border: getStatusBgColor('success', 0.3),
    icon: <CheckCircle className="w-3.5 h-3.5" />, 
    text: '已确认',
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
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, 
    text: '待确认',
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
  dropped: { 
    color: 'rgba(255, 255, 255, 0.45)', 
    bg: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.1)',
    icon: <XCircle className="w-3.5 h-3.5" />, 
    text: '已丢弃',
    badgeVariant: 'outline',
  },
};

// 格式化时间
function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
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

export const TransactionDetail: React.FC<TransactionDetailProps> = ({
  open,
  onClose,
  transaction,
}) => {
  const { t } = useTranslation();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!transaction) return null;

  const statusConfig = STATUS_CONFIG[transaction.status] || STATUS_CONFIG.pending;

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
              <LinkIcon size={28} style={{ color: statusConfig.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-semibold text-white mb-2">
                {t('admin.audit.txDetail.title', '交易详情')}
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
                    {t(`admin.audit.txStatus.${transaction.status}`, statusConfig.text)}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/5 border-white/10 text-white/70">
                    {t(`admin.audit.txType.${transaction.tx_type}`, TX_TYPE_LABELS[transaction.tx_type] || transaction.tx_type)}
                  </Badge>
                  <ChainBadge chainId={transaction.chain_id} network={transaction.network} showName />
                </div>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* 内容区域 - 可滚动 */}
        <div className="relative p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* 交易哈希卡片 */}
          <SectionCard title={t('admin.audit.txDetail.txHash', '交易哈希')} icon={<Hash size={16} />}>
            <div className="flex items-center gap-2">
              <TxHashLink 
                txHash={transaction.tx_hash} 
                chainId={transaction.chain_id}
                showFull 
              />
              <button
                onClick={() => handleCopy(transaction.tx_hash, 'txHash')}
                className={cn(
                  "bg-transparent border-none cursor-pointer p-1 transition-colors",
                  copiedField === 'txHash' ? "text-green-500" : "text-white/45 hover:text-white/70"
                )}
              >
                {copiedField === 'txHash' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            {transaction.nonce !== null && transaction.nonce !== undefined && (
              <InfoRow label="Nonce" className="mt-3">
                <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">
                  {transaction.nonce}
                </code>
              </InfoRow>
            )}
          </SectionCard>

          {/* 地址信息 */}
          <SectionCard title={t('admin.audit.txDetail.addressInfo', '地址信息')} icon={<Wallet size={16} />}>
            <InfoRow label={t('admin.audit.txDetail.from', '发送方')}>
              <AddressDisplay address={transaction.from_address} showFull />
            </InfoRow>
            <InfoRow label={t('admin.audit.txDetail.to', '接收方')}>
              {transaction.to_address ? (
                <AddressDisplay address={transaction.to_address} showFull />
              ) : (
                <span className="text-white/45 italic">
                  {t('admin.audit.txDetail.contractCreation', '合约创建')}
                </span>
              )}
            </InfoRow>
          </SectionCard>

          {/* 金额信息 */}
          <SectionCard title={t('admin.audit.txDetail.valueInfo', '金额信息')} icon={<Coins size={16} />}>
            <InfoRow label={t('admin.audit.txDetail.value', 'ETH 金额')}>
              <TokenAmount
                amount={transaction.value}
                decimals={18}
                symbol="ETH"
                showFull
              />
            </InfoRow>
            {transaction.token_address && (
              <>
                <InfoRow label={t('admin.audit.txDetail.tokenAddress', 'Token 地址')}>
                  <AddressDisplay address={transaction.token_address} showFull />
                </InfoRow>
                {transaction.token_symbol && (
                  <InfoRow label={t('admin.audit.txDetail.tokenSymbol', 'Token')}>
                    <Badge variant="secondary" className="bg-blue-500/10 border-blue-500/20 text-blue-400">
                      {transaction.token_symbol}
                      {transaction.token_decimals !== null && ` (${transaction.token_decimals} decimals)`}
                    </Badge>
                  </InfoRow>
                )}
                {transaction.token_amount && (
                  <InfoRow label={t('admin.audit.txDetail.tokenAmount', 'Token 金额')}>
                    <span className="text-primary font-medium">
                      <TokenAmount
                        amount={transaction.token_amount}
                        decimals={transaction.token_decimals || 18}
                        symbol={transaction.token_symbol || ''}
                        showFull
                      />
                    </span>
                  </InfoRow>
                )}
              </>
            )}
          </SectionCard>

          {/* 合约调用信息 */}
          {(transaction.contract_name || transaction.function_name) && (
            <SectionCard title={t('admin.audit.txDetail.contractInfo', '合约调用')} icon={<Code size={16} />}>
              {transaction.contract_name && (
                <InfoRow label={t('admin.audit.txDetail.contractName', '合约名称')}>
                  <span className="text-primary font-medium">
                    {transaction.contract_name}
                  </span>
                </InfoRow>
              )}
              {transaction.function_name && (
                <InfoRow label={t('admin.audit.txDetail.functionName', '函数名称')}>
                  <code className="text-[13px] bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-primary">
                    {transaction.function_name}()
                  </code>
                </InfoRow>
              )}
              {transaction.function_args && Object.keys(transaction.function_args).length > 0 && (
                <div className="mt-3">
                  <div className="text-[11px] text-white/45 mb-2 uppercase tracking-wider">
                    {t('admin.audit.txDetail.functionArgs', '函数参数')}
                  </div>
                  <pre className="m-0 p-3 bg-black/30 border border-white/[0.08] rounded-lg text-xs font-mono text-white/75 overflow-auto max-h-[150px]">
                    {JSON.stringify(transaction.function_args, null, 2)}
                  </pre>
                </div>
              )}
            </SectionCard>
          )}

          {/* Gas 信息 */}
          <SectionCard title={t('admin.audit.txDetail.gasInfo', 'Gas 信息')} icon={<Fuel size={16} />}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <InfoRow label={t('admin.audit.txDetail.gasPrice', 'Gas Price')}>
                {transaction.gas_price ? (
                  <TokenAmount amount={transaction.gas_price} decimals={9} symbol="Gwei" />
                ) : '-'}
              </InfoRow>
              <InfoRow label={t('admin.audit.txDetail.gasLimit', 'Gas Limit')}>
                {transaction.gas_limit?.toLocaleString() ?? '-'}
              </InfoRow>
              <InfoRow label={t('admin.audit.txDetail.gasUsed', 'Gas Used')}>
                {transaction.gas_used?.toLocaleString() ?? '-'}
              </InfoRow>
              <InfoRow label={t('admin.audit.txDetail.effectiveGasPrice', '实际 Gas Price')}>
                {transaction.effective_gas_price ? (
                  <TokenAmount amount={transaction.effective_gas_price} decimals={9} symbol="Gwei" />
                ) : '-'}
              </InfoRow>
            </div>
            {transaction.gas_cost && (
              <InfoRow label={t('admin.audit.txDetail.gasCost', 'Gas 费用')} className="mt-2">
                <span className="text-yellow-500 font-medium">
                  <TokenAmount amount={transaction.gas_cost} decimals={18} symbol="ETH" />
                </span>
              </InfoRow>
            )}
          </SectionCard>

          {/* 区块信息 */}
          {(transaction.block_number || transaction.block_timestamp) && (
            <SectionCard title={t('admin.audit.txDetail.blockInfo', '区块信息')} icon={<Box size={16} />}>
              {transaction.block_number && (
                <InfoRow label={t('admin.audit.txDetail.blockNumber', '区块号')}>
                  <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">
                    #{transaction.block_number.toLocaleString()}
                  </code>
                </InfoRow>
              )}
              {transaction.block_timestamp && (
                <InfoRow label={t('admin.audit.txDetail.blockTimestamp', '区块时间')}>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-white/45" />
                    {formatDateTime(transaction.block_timestamp)}
                  </div>
                </InfoRow>
              )}
            </SectionCard>
          )}

          {/* 描述信息 */}
          {transaction.description && (
            <SectionCard title={t('admin.audit.txDetail.description', '描述')} icon={<FileText size={16} />}>
              <p className="m-0 text-white/85 leading-relaxed">
                {transaction.description}
              </p>
            </SectionCard>
          )}

          {/* 错误信息 */}
          {transaction.error_message && (
            <SectionCard 
              title={t('admin.audit.txDetail.errorInfo', '错误信息')} 
              icon={<AlertTriangle size={16} />}
              variant="error"
            >
              <span className="text-red-500">{transaction.error_message}</span>
            </SectionCard>
          )}

          {/* 时间和环境信息 */}
          <SectionCard title={t('admin.audit.txDetail.metaInfo', '元信息')} icon={<Clock size={16} />}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <InfoRow label={t('admin.audit.txDetail.createdAt', '创建时间')}>
                {formatDateTime(transaction.created_at)}
              </InfoRow>
              <InfoRow label={t('admin.audit.txDetail.confirmedAt', '确认时间')}>
                {formatDateTime(transaction.confirmed_at)}
              </InfoRow>
              <InfoRow label={t('admin.audit.txDetail.environment', '环境')}>
                <Badge variant="secondary" className="bg-white/5 border-white/10">
                  {transaction.environment}
                </Badge>
              </InfoRow>
              {transaction.operator_id && (
                <InfoRow label={t('admin.audit.txDetail.operatorId', '操作者 ID')}>
                  <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">
                    {transaction.operator_id}
                  </code>
                </InfoRow>
              )}
            </div>
          </SectionCard>
        </div>
      </SheetContent>
    </Sheet>
  );
};
