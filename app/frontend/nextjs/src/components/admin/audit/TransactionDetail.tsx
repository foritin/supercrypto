/**
 * TransactionDetail Component
 * 交易详情抽屉组件 - Premium UI Design
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
  LoadingOutlined,
} from '@ant-design/icons';
import { 
  FileText, 
  Clock, 
  Hash,
  AlertTriangle,
  Link as LinkIcon,
  Wallet,
  Coins,
  Fuel,
  Box,
  Code,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TransactionAudit, TransactionAuditType, TransactionAuditStatus } from '@/services/audit';
import { AddressDisplay, TxHashLink, TokenAmount, ChainBadge } from './web3';
import { SectionCard, InfoRow } from '@/components/ui';
import { getStatusBgColor } from '@/lib/theme-colors';

const { Text } = Typography;

interface TransactionDetailProps {
  open: boolean;
  onClose: () => void;
  transaction: TransactionAudit | null;
}

// 交易类型标签
const TX_TYPE_LABELS: Record<TransactionAuditType, string> = {
  transfer: '转账',
  token_transfer: 'Token 转账',
  token_approve: 'Token 授权',
  contract_deploy: '合约部署',
  contract_call: '合约调用',
  staking: '质押',
  unstaking: '解除质押',
  claim_reward: '领取奖励',
  swap: '兑换',
  subscription: '认购',
  redemption: '赎回',
  admin_contract_call: '管理合约调用',
  other: '其他',
};

// 状态配置 - 使用 CSS 变量
const STATUS_CONFIG: Record<TransactionAuditStatus, { 
  color: string; 
  bg: string;
  border: string;
  icon: React.ReactNode; 
  text: string;
}> = {
  confirmed: { 
    color: 'var(--color-success)', 
    bg: getStatusBgColor('success', 0.1),
    border: getStatusBgColor('success', 0.3),
    icon: <CheckCircleOutlined />, 
    text: '已确认' 
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
    icon: <LoadingOutlined />, 
    text: '待确认' 
  },
  reverted: { 
    color: 'var(--color-warning)', 
    bg: getStatusBgColor('warning', 0.1),
    border: getStatusBgColor('warning', 0.3),
    icon: <CloseCircleOutlined />, 
    text: '已回滚' 
  },
  dropped: { 
    color: 'rgba(255, 255, 255, 0.45)', 
    bg: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.1)',
    icon: <CloseCircleOutlined />, 
    text: '已丢弃' 
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
            <LinkIcon size={28} style={{ color: statusConfig.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              color: '#fff',
              marginBottom: 8,
            }}>
              {t('admin.audit.txDetail.title', '交易详情')}
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
                {t(`admin.audit.txStatus.${transaction.status}`, statusConfig.text)}
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
                {t(`admin.audit.txType.${transaction.tx_type}`, TX_TYPE_LABELS[transaction.tx_type] || transaction.tx_type)}
              </span>
              <ChainBadge chainId={transaction.chain_id} network={transaction.network} showName />
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
        {/* 交易哈希卡片 */}
        <SectionCard title={t('admin.audit.txDetail.txHash', '交易哈希')} icon={<Hash size={16} />}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TxHashLink 
              txHash={transaction.tx_hash} 
              chainId={transaction.chain_id}
              showFull 
            />
            <button
              onClick={() => handleCopy(transaction.tx_hash, 'txHash')}
              style={{
                background: 'transparent',
                border: 'none',
                color: copiedField === 'txHash' ? '#52c41a' : 'rgba(255, 255, 255, 0.45)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              {copiedField === 'txHash' ? <CheckOutlined /> : <CopyOutlined />}
            </button>
          </div>
          {transaction.nonce !== null && transaction.nonce !== undefined && (
            <InfoRow label="Nonce" style={{ marginTop: 12 }}>
              <code style={{ 
                fontSize: 12, 
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '2px 6px',
                borderRadius: 4,
              }}>
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
              <Text style={{ color: 'rgba(255, 255, 255, 0.45)', fontStyle: 'italic' }}>
                {t('admin.audit.txDetail.contractCreation', '合约创建')}
              </Text>
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
                  <Tag color="blue" style={{ margin: 0 }}>
                    {transaction.token_symbol}
                    {transaction.token_decimals !== null && ` (${transaction.token_decimals} decimals)`}
                  </Tag>
                </InfoRow>
              )}
              {transaction.token_amount && (
                <InfoRow label={t('admin.audit.txDetail.tokenAmount', 'Token 金额')}>
                  <span style={{ color: '#00D4AA', fontWeight: 500 }}>
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
                <span style={{ color: '#00D4AA', fontWeight: 500 }}>
                  {transaction.contract_name}
                </span>
              </InfoRow>
            )}
            {transaction.function_name && (
              <InfoRow label={t('admin.audit.txDetail.functionName', '函数名称')}>
                <code style={{ 
                  fontSize: 13, 
                  background: 'rgba(0, 212, 170, 0.1)',
                  border: '1px solid rgba(0, 212, 170, 0.2)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  color: '#00D4AA',
                }}>
                  {transaction.function_name}()
                </code>
              </InfoRow>
            )}
            {transaction.function_args && Object.keys(transaction.function_args).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ 
                  fontSize: 11, 
                  color: 'rgba(255, 255, 255, 0.45)', 
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {t('admin.audit.txDetail.functionArgs', '函数参数')}
                </div>
                <pre style={{
                  margin: 0,
                  padding: 12,
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, Monaco, monospace',
                  color: 'rgba(255, 255, 255, 0.75)',
                  overflow: 'auto',
                  maxHeight: 150,
                }}>
                  {JSON.stringify(transaction.function_args, null, 2)}
                </pre>
              </div>
            )}
          </SectionCard>
        )}

        {/* Gas 信息 */}
        <SectionCard title={t('admin.audit.txDetail.gasInfo', 'Gas 信息')} icon={<Fuel size={16} />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
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
            <InfoRow label={t('admin.audit.txDetail.gasCost', 'Gas 费用')} style={{ marginTop: 8 }}>
              <span style={{ color: '#faad14', fontWeight: 500 }}>
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
                <code style={{ 
                  fontSize: 12, 
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}>
                  #{transaction.block_number.toLocaleString()}
                </code>
              </InfoRow>
            )}
            {transaction.block_timestamp && (
              <InfoRow label={t('admin.audit.txDetail.blockTimestamp', '区块时间')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} style={{ color: 'rgba(255, 255, 255, 0.45)' }} />
                  {formatDateTime(transaction.block_timestamp)}
                </div>
              </InfoRow>
            )}
          </SectionCard>
        )}

        {/* 描述信息 */}
        {transaction.description && (
          <SectionCard title={t('admin.audit.txDetail.description', '描述')} icon={<FileText size={16} />}>
            <p style={{ 
              margin: 0, 
              color: 'rgba(255, 255, 255, 0.85)',
              lineHeight: 1.6,
            }}>
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
            <span style={{ color: '#ff4d4f' }}>{transaction.error_message}</span>
          </SectionCard>
        )}

        {/* 时间和环境信息 */}
        <SectionCard title={t('admin.audit.txDetail.metaInfo', '元信息')} icon={<Clock size={16} />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            <InfoRow label={t('admin.audit.txDetail.createdAt', '创建时间')}>
              {formatDateTime(transaction.created_at)}
            </InfoRow>
            <InfoRow label={t('admin.audit.txDetail.confirmedAt', '确认时间')}>
              {formatDateTime(transaction.confirmed_at)}
            </InfoRow>
            <InfoRow label={t('admin.audit.txDetail.environment', '环境')}>
              <Tag style={{ margin: 0 }}>{transaction.environment}</Tag>
            </InfoRow>
            {transaction.operator_id && (
              <InfoRow label={t('admin.audit.txDetail.operatorId', '操作者 ID')}>
                <code style={{ 
                  fontSize: 12, 
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}>
                  {transaction.operator_id}
                </code>
              </InfoRow>
            )}
          </div>
        </SectionCard>
      </div>
    </Drawer>
  );
};
