/**
 * TransactionDetail Component
 * 交易详情抽屉组件
 */
'use client';

import React from 'react';
import { Drawer, Descriptions, Tag, Typography, Divider } from 'antd';
import { useTranslation } from 'react-i18next';
import type { TransactionAudit, TransactionAuditType } from '@/services/audit';
import { AddressDisplay } from './web3/AddressDisplay';
import { TxHashLink } from './web3/TxHashLink';
import { TokenAmount } from './web3/TokenAmount';
import { ChainBadge } from './web3/ChainBadge';
import { TxStatusBadge } from './web3/TxStatusBadge';

const { Text, Paragraph } = Typography;

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
  other: '其他',
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

  if (!transaction) return null;

  return (
    <Drawer
      title={t('admin.audit.txDetail.title', '交易详情')}
      placement="right"
      width={640}
      onClose={onClose}
      open={open}
      styles={{
        body: { padding: '16px 24px', background: 'rgba(15, 15, 26, 0.95)' },
        header: { 
          background: 'rgba(15, 15, 26, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        },
      }}
    >
      {/* 基本信息 */}
      <Descriptions
        title={t('admin.audit.txDetail.basicInfo', '基本信息')}
        column={2}
        size="small"
        labelStyle={{ color: 'rgba(255, 255, 255, 0.45)' }}
        contentStyle={{ color: 'rgba(255, 255, 255, 0.85)' }}
      >
        <Descriptions.Item label={t('admin.audit.txDetail.txHash', '交易哈希')} span={2}>
          <TxHashLink 
            txHash={transaction.tx_hash} 
            chainId={transaction.chain_id}
            showFull 
          />
        </Descriptions.Item>
        <Descriptions.Item label={t('admin.audit.txDetail.chain', '链')}>
          <ChainBadge chainId={transaction.chain_id} network={transaction.network} showName />
        </Descriptions.Item>
        <Descriptions.Item label={t('admin.audit.txDetail.status', '状态')}>
          <TxStatusBadge status={transaction.status} />
        </Descriptions.Item>
        <Descriptions.Item label={t('admin.audit.txDetail.type', '类型')}>
          <Tag>
            {t(`admin.audit.txType.${transaction.tx_type}`, TX_TYPE_LABELS[transaction.tx_type])}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t('admin.audit.txDetail.nonce', 'Nonce')}>
          {transaction.nonce ?? '-'}
        </Descriptions.Item>
      </Descriptions>

      <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* 地址信息 */}
      <Descriptions
        title={t('admin.audit.txDetail.addressInfo', '地址信息')}
        column={1}
        size="small"
        labelStyle={{ color: 'rgba(255, 255, 255, 0.45)' }}
        contentStyle={{ color: 'rgba(255, 255, 255, 0.85)' }}
      >
        <Descriptions.Item label={t('admin.audit.txDetail.from', '发送方')}>
          <AddressDisplay address={transaction.from_address} showFull />
        </Descriptions.Item>
        <Descriptions.Item label={t('admin.audit.txDetail.to', '接收方')}>
          {transaction.to_address ? (
            <AddressDisplay address={transaction.to_address} showFull />
          ) : (
            <Text type="secondary">
              {t('admin.audit.txDetail.contractCreation', '合约创建')}
            </Text>
          )}
        </Descriptions.Item>
      </Descriptions>

      <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* 金额信息 */}
      <Descriptions
        title={t('admin.audit.txDetail.valueInfo', '金额信息')}
        column={2}
        size="small"
        labelStyle={{ color: 'rgba(255, 255, 255, 0.45)' }}
        contentStyle={{ color: 'rgba(255, 255, 255, 0.85)' }}
      >
        <Descriptions.Item label={t('admin.audit.txDetail.value', 'ETH 金额')} span={2}>
          <TokenAmount
            amount={transaction.value}
            decimals={18}
            symbol="ETH"
            showFull
          />
        </Descriptions.Item>
        {transaction.token_address && (
          <>
            <Descriptions.Item label={t('admin.audit.txDetail.tokenAddress', 'Token 地址')} span={2}>
              <AddressDisplay address={transaction.token_address} showFull />
            </Descriptions.Item>
            <Descriptions.Item label={t('admin.audit.txDetail.tokenSymbol', 'Token 符号')}>
              <Tag color="blue">{transaction.token_symbol || '-'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('admin.audit.txDetail.tokenDecimals', '精度')}>
              {transaction.token_decimals ?? '-'}
            </Descriptions.Item>
            {transaction.token_amount && (
              <Descriptions.Item label={t('admin.audit.txDetail.tokenAmount', 'Token 金额')} span={2}>
                <TokenAmount
                  amount={transaction.token_amount}
                  decimals={transaction.token_decimals || 18}
                  symbol={transaction.token_symbol || ''}
                  showFull
                />
              </Descriptions.Item>
            )}
          </>
        )}
      </Descriptions>

      {/* 合约调用信息 */}
      {(transaction.contract_name || transaction.function_name) && (
        <>
          <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
          <Descriptions
            title={t('admin.audit.txDetail.contractInfo', '合约调用信息')}
            column={1}
            size="small"
            labelStyle={{ color: 'rgba(255, 255, 255, 0.45)' }}
            contentStyle={{ color: 'rgba(255, 255, 255, 0.85)' }}
          >
            {transaction.contract_name && (
              <Descriptions.Item label={t('admin.audit.txDetail.contractName', '合约名称')}>
                {transaction.contract_name}
              </Descriptions.Item>
            )}
            {transaction.function_name && (
              <Descriptions.Item label={t('admin.audit.txDetail.functionName', '函数名称')}>
                <Text code>{transaction.function_name}</Text>
              </Descriptions.Item>
            )}
            {transaction.function_args && (
              <Descriptions.Item label={t('admin.audit.txDetail.functionArgs', '函数参数')}>
                <pre style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'rgba(255, 255, 255, 0.75)',
                  overflow: 'auto',
                  maxHeight: 150,
                  margin: 0,
                }}>
                  {JSON.stringify(transaction.function_args, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        </>
      )}

      <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Gas 信息 */}
      <Descriptions
        title={t('admin.audit.txDetail.gasInfo', 'Gas 信息')}
        column={2}
        size="small"
        labelStyle={{ color: 'rgba(255, 255, 255, 0.45)' }}
        contentStyle={{ color: 'rgba(255, 255, 255, 0.85)' }}
      >
        <Descriptions.Item label={t('admin.audit.txDetail.gasPrice', 'Gas Price')}>
          {transaction.gas_price ? (
            <TokenAmount
              amount={transaction.gas_price}
              decimals={9}
              symbol="Gwei"
            />
          ) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t('admin.audit.txDetail.gasLimit', 'Gas Limit')}>
          {transaction.gas_limit?.toLocaleString() ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t('admin.audit.txDetail.gasUsed', 'Gas Used')}>
          {transaction.gas_used?.toLocaleString() ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t('admin.audit.txDetail.effectiveGasPrice', '实际 Gas Price')}>
          {transaction.effective_gas_price ? (
            <TokenAmount
              amount={transaction.effective_gas_price}
              decimals={9}
              symbol="Gwei"
            />
          ) : '-'}
        </Descriptions.Item>
        {transaction.gas_cost && (
          <Descriptions.Item label={t('admin.audit.txDetail.gasCost', 'Gas 费用')} span={2}>
            <TokenAmount
              amount={transaction.gas_cost}
              decimals={18}
              symbol="ETH"
            />
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* 区块信息 */}
      {(transaction.block_number || transaction.block_timestamp) && (
        <>
          <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
          <Descriptions
            title={t('admin.audit.txDetail.blockInfo', '区块信息')}
            column={2}
            size="small"
            labelStyle={{ color: 'rgba(255, 255, 255, 0.45)' }}
            contentStyle={{ color: 'rgba(255, 255, 255, 0.85)' }}
          >
            <Descriptions.Item label={t('admin.audit.txDetail.blockNumber', '区块号')}>
              {transaction.block_number?.toLocaleString() ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('admin.audit.txDetail.blockTimestamp', '区块时间')}>
              {formatDateTime(transaction.block_timestamp)}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}

      {/* 描述和错误信息 */}
      {(transaction.description || transaction.error_message) && (
        <>
          <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
          <Descriptions
            title={t('admin.audit.txDetail.otherInfo', '其他信息')}
            column={1}
            size="small"
            labelStyle={{ color: 'rgba(255, 255, 255, 0.45)' }}
            contentStyle={{ color: 'rgba(255, 255, 255, 0.85)' }}
          >
            {transaction.description && (
              <Descriptions.Item label={t('admin.audit.txDetail.description', '描述')}>
                <Paragraph style={{ color: 'rgba(255, 255, 255, 0.85)', marginBottom: 0 }}>
                  {transaction.description}
                </Paragraph>
              </Descriptions.Item>
            )}
            {transaction.error_message && (
              <Descriptions.Item label={t('admin.audit.txDetail.errorMessage', '错误信息')}>
                <Text type="danger">{transaction.error_message}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </>
      )}

      {/* 时间戳 */}
      <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
      <Descriptions
        column={2}
        size="small"
        labelStyle={{ color: 'rgba(255, 255, 255, 0.45)' }}
        contentStyle={{ color: 'rgba(255, 255, 255, 0.85)' }}
      >
        <Descriptions.Item label={t('admin.audit.txDetail.createdAt', '创建时间')}>
          {formatDateTime(transaction.created_at)}
        </Descriptions.Item>
        <Descriptions.Item label={t('admin.audit.txDetail.confirmedAt', '确认时间')}>
          {formatDateTime(transaction.confirmed_at)}
        </Descriptions.Item>
        <Descriptions.Item label={t('admin.audit.txDetail.environment', '环境')}>
          <Tag>{transaction.environment}</Tag>
        </Descriptions.Item>
        {transaction.operator_id && (
          <Descriptions.Item label={t('admin.audit.txDetail.operatorId', '操作者 ID')}>
            {transaction.operator_id}
          </Descriptions.Item>
        )}
      </Descriptions>
    </Drawer>
  );
};
