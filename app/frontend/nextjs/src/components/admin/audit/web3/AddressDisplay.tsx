/**
 * AddressDisplay Component
 * 地址显示组件 - 支持复制和缩短显示
 */
'use client';

import React, { useState } from 'react';
import { Typography, Tooltip, message } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface AddressDisplayProps {
  address: string;
  showFull?: boolean;
  copyable?: boolean;
  prefixLength?: number;
  suffixLength?: number;
}

const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  showFull = false,
  copyable = true,
  prefixLength = 6,
  suffixLength = 4,
}) => {
  const [copied, setCopied] = useState(false);

  const shortenAddress = (addr: string): string => {
    if (showFull || addr.length <= prefixLength + suffixLength + 3) {
      return addr;
    }
    return `${addr.slice(0, prefixLength)}...${addr.slice(-suffixLength)}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      message.success('已复制地址');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      message.error('复制失败');
    }
  };

  const displayAddress = shortenAddress(address);

  return (
    <Tooltip title={showFull ? undefined : address}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: 'monospace',
          fontSize: 13,
          color: 'rgba(255, 255, 255, 0.85)',
          cursor: copyable ? 'pointer' : 'default',
        }}
        onClick={copyable ? handleCopy : undefined}
      >
        <Text
          style={{
            fontFamily: 'monospace',
            color: 'rgba(255, 255, 255, 0.85)',
          }}
        >
          {displayAddress}
        </Text>
        {copyable && (
          <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 12 }}>
            {copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
          </span>
        )}
      </span>
    </Tooltip>
  );
};

export { AddressDisplay };
