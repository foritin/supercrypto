/**
 * ChainBadge Component
 * 链标识徽章组件
 */
'use client';

import React from 'react';
import { Tag, Tooltip } from 'antd';

interface ChainBadgeProps {
  chainId: number;
  network?: string;
  showName?: boolean;
}

// 链配置
const CHAIN_CONFIG: Record<number, { name: string; shortName: string; color: string; icon?: string }> = {
  1: { name: 'Ethereum Mainnet', shortName: 'ETH', color: '#627EEA' },
  5: { name: 'Goerli Testnet', shortName: 'Goerli', color: '#627EEA' },
  11155111: { name: 'Sepolia Testnet', shortName: 'Sepolia', color: '#627EEA' },
  137: { name: 'Polygon Mainnet', shortName: 'MATIC', color: '#8247E5' },
  80001: { name: 'Mumbai Testnet', shortName: 'Mumbai', color: '#8247E5' },
  56: { name: 'BNB Smart Chain', shortName: 'BSC', color: '#F0B90B' },
  97: { name: 'BSC Testnet', shortName: 'BSC Test', color: '#F0B90B' },
  42161: { name: 'Arbitrum One', shortName: 'ARB', color: '#28A0F0' },
  421613: { name: 'Arbitrum Goerli', shortName: 'ARB Goerli', color: '#28A0F0' },
  10: { name: 'Optimism', shortName: 'OP', color: '#FF0420' },
  420: { name: 'Optimism Goerli', shortName: 'OP Goerli', color: '#FF0420' },
  43114: { name: 'Avalanche C-Chain', shortName: 'AVAX', color: '#E84142' },
  43113: { name: 'Avalanche Fuji', shortName: 'Fuji', color: '#E84142' },
  31337: { name: 'Hardhat Local', shortName: 'Local', color: '#FFF100' },
};

export const ChainBadge: React.FC<ChainBadgeProps> = ({
  chainId,
  network,
  showName = false,
}) => {
  const config = CHAIN_CONFIG[chainId] || {
    name: network || `Chain ${chainId}`,
    shortName: network || `#${chainId}`,
    color: '#666666',
  };

  const displayText = showName ? config.name : config.shortName;

  return (
    <Tooltip title={config.name}>
      <Tag
        style={{
          backgroundColor: `${config.color}20`,
          borderColor: `${config.color}40`,
          color: config.color,
          fontWeight: 500,
          fontSize: 11,
        }}
      >
        {displayText}
      </Tag>
    </Tooltip>
  );
};
