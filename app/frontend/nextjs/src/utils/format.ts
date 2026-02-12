import { formatUnits } from 'viem'

// 从 lib/utils 统一导出截断地址工具函数
export { truncateAddress } from '@/lib/utils'

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
