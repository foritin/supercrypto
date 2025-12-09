// 截断地址显示
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 格式化余额
export function formatBalance(balance?: string, decimals: number = 4): string {
  if (!balance) return '0'
  const num = parseFloat(balance ?? '0')
  return num.toFixed(decimals)
}
