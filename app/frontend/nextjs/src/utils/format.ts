import { formatUnits } from 'viem'

// 截断地址显示
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 代币余额格式化，支持 bigint/字符串，按 decimals 处理
export function formatTokenBalance(
  value?: bigint | string,
  decimals: number = 18,
  precision: number = 4
): string {
  try {
    if (value === undefined || value === null) return '0'
    const asBigInt = typeof value === 'bigint' ? value : BigInt(value)
    const normalized = formatUnits(asBigInt, decimals)
    const num = Number.parseFloat(normalized)
    if (Number.isNaN(num)) return '0'
    return num.toFixed(precision)
  } catch {
    return '0'
  }
}
