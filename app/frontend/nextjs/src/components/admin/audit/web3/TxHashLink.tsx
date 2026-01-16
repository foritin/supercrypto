/**
 * TxHashLink Component
 * 交易哈希链接组件 - 跳转区块浏览器
 */
'use client';

import React, { useState } from 'react';
import { Typography, Tooltip, message, Space } from 'antd';
import { CopyOutlined, CheckOutlined, LinkOutlined } from '@ant-design/icons';

const { Text, Link } = Typography;

interface TxHashLinkProps {
  txHash: string;
  chainId?: number;
  showFull?: boolean;
  copyable?: boolean;
}

// 区块浏览器 URL 映射
const EXPLORER_URLS: Record<number, string> = {
  1: 'https://etherscan.io/tx/',
  5: 'https://goerli.etherscan.io/tx/',
  11155111: 'https://sepolia.etherscan.io/tx/',
  137: 'https://polygonscan.com/tx/',
  80001: 'https://mumbai.polygonscan.com/tx/',
  56: 'https://bscscan.com/tx/',
  97: 'https://testnet.bscscan.com/tx/',
  42161: 'https://arbiscan.io/tx/',
  421613: 'https://goerli.arbiscan.io/tx/',
  31337: '', // Hardhat local - no explorer
};

const TxHashLink: React.FC<TxHashLinkProps> = ({
  txHash,
  chainId = 31337,
  showFull = false,
  copyable = true,
}) => {
  const [copied, setCopied] = useState(false);

  const shortenHash = (hash: string): string => {
    if (showFull || hash.length <= 16) {
      return hash;
    }
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(txHash);
      setCopied(true);
      message.success('已复制交易哈希');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      message.error('复制失败');
    }
  };

  const explorerUrl = EXPLORER_URLS[chainId];
  const displayHash = shortenHash(txHash);

  return (
    <Tooltip title={showFull ? undefined : txHash}>
      <Space size={4}>
        {explorerUrl ? (
          <Link
            href={`${explorerUrl}${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {displayHash}
            <LinkOutlined style={{ fontSize: 11 }} />
          </Link>
        ) : (
          <Text
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              color: 'rgba(255, 255, 255, 0.85)',
            }}
          >
            {displayHash}
          </Text>
        )}
        {copyable && (
          <span
            onClick={handleCopy}
            style={{
              color: 'rgba(255, 255, 255, 0.45)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
          </span>
        )}
      </Space>
    </Tooltip>
  );
};

export { TxHashLink };
