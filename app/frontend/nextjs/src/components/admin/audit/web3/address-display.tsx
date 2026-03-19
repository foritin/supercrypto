/**
 * AddressDisplay Component
 * 地址显示组件 - 支持复制和缩短显示
 */
'use client';

import { Copy, Check } from 'lucide-react';
import React, { useState } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { notification } from '@/lib/notification';

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
      notification.success('Address copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notification.error('Copy failed');
    }
  };

  const displayAddress = shortenAddress(address);

  const content = (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[13px] text-white/85 ${
        copyable ? 'cursor-pointer' : 'cursor-default'
      }`}
      onClick={copyable ? handleCopy : undefined}
    >
      <span className="font-mono text-white/85">{displayAddress}</span>
      {copyable && (
        <span className="text-white/45 text-[12px] hover:text-white/65 transition-colors">
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </span>
      )}
    </span>
  );

  if (showFull) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p className="font-mono text-xs">{address}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export { AddressDisplay };
