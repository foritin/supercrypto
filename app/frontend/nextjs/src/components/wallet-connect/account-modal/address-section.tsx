'use client'

import { Copy, Check, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { cn, getExplorerUrl } from '@/lib/utils'
import { truncateAddress } from '@/utils/format'

interface AddressSectionProps {
  address: string
  chainId?: number
}

/**
 * 地址显示区域
 * - 显示截断的钱包地址
 * - 一键复制功能
 * - 区块浏览器链接（可选）
 */
export function AddressSection({ address, chainId }: AddressSectionProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      toast.success(t('wallet.addressCopied', '地址已复制'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('wallet.copyFailed', '复制失败'))
    }
  }

  // 获取区块浏览器 URL
  const explorerUrl = chainId ? getExplorerUrl(chainId, 'address', address) : null

  return (
    <div className="flex items-center justify-between">
      {/* 地址显示 */}
      <div className="flex items-center gap-3">
        {/* 钱包图标/头像 */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
          <span className="text-lg">👤</span>
        </div>
        
        {/* 地址文本 */}
        <div className="flex flex-col">
          <span className="text-lg font-semibold font-mono text-white/95">
            {truncateAddress(address)}
          </span>
          <span className="text-xs text-white/50">
            {t('wallet.connected', '已连接')}
          </span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1">
        {/* 复制按钮 */}
        <button
          onClick={handleCopy}
          className={cn(
            "p-2 rounded-lg transition-all duration-200",
            "hover:bg-white/10 active:scale-95",
            copied && "text-primary"
          )}
          title={t('wallet.copyAddress', '复制地址')}
        >
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4 text-white/60" />
          )}
        </button>

        {/* 区块浏览器链接 */}
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "p-2 rounded-lg transition-all duration-200",
              "hover:bg-white/10 active:scale-95"
            )}
            title={t('wallet.viewOnExplorer', '在区块浏览器中查看')}
          >
            <ExternalLink className="w-4 h-4 text-white/60" />
          </a>
        )}
      </div>
    </div>
  )
}
