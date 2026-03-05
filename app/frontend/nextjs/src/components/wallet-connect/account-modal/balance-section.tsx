'use client'

import { Wallet } from 'lucide-react'

import { cn } from '@/lib/utils'

interface BalanceSectionProps {
  balance?: string
  symbol?: string
}

/**
 * 余额显示区域
 * - 显示原生代币余额
 * - 大字体突出显示
 */
export function BalanceSection({ balance, symbol = 'ETH' }: BalanceSectionProps) {
  // 格式化余额显示
  const formatBalance = (bal: string | undefined) => {
    if (!bal) return '0.00'
    const num = parseFloat(bal)
    if (num === 0) return '0.00'
    if (num < 0.0001) return '< 0.0001'
    if (num < 1) return num.toFixed(4)
    if (num < 1000) return num.toFixed(2)
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }

  return (
    <div className="flex items-center gap-3 py-2">
      {/* 钱包图标 */}
      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
        <Wallet className="w-4 h-4 text-white/60" />
      </div>
      
      {/* 余额显示 */}
      <div className="flex items-baseline gap-2">
        <span className={cn(
          "text-2xl font-bold text-white/95",
          "tabular-nums"
        )}>
          {formatBalance(balance)}
        </span>
        <span className="text-sm font-medium text-white/60">
          {symbol}
        </span>
      </div>
    </div>
  )
}
