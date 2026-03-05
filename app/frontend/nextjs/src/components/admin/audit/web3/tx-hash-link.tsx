/**
 * TxHashLink Component
 * 交易哈希链接组件 - 跳转区块浏览器
 */
'use client';

import { Copy, Check, ExternalLink } from 'lucide-react';
import React, { useState } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { notification } from '@/lib/notification';
import { getExplorerUrl } from '@/lib/utils';

interface TxHashLinkProps {
  txHash: string;
  chainId?: number;
  showFull?: boolean;
  copyable?: boolean;
}

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
      notification.success('已复制交易哈希');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notification.error('复制失败');
    }
  };

  const explorerUrl = getExplorerUrl(chainId, 'tx', txHash);
  const displayHash = shortenHash(txHash);

  const content = (
    <span className="inline-flex items-center gap-1">
      {explorerUrl ? (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-[13px] text-primary hover:text-primary/80 transition-colors"
        >
          {displayHash}
          <ExternalLink className="h-[11px] w-[11px]" />
        </a>
      ) : (
        <span className="font-mono text-[13px] text-white/85">
          {displayHash}
        </span>
      )}
      {copyable && (
        <span
          onClick={handleCopy}
          className="text-white/45 text-[12px] cursor-pointer hover:text-white/65 transition-colors"
        >
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
          <p className="font-mono text-xs">{txHash}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export { TxHashLink };
