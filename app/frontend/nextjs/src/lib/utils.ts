import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 区块浏览器 URL 映射
 * 支持 Ethereum 主网、测试网及 L2 网络
 */
const EXPLORER_BASE_URLS: Record<number, string> = {
  1: 'https://etherscan.io',
  5: 'https://goerli.etherscan.io',
  11155111: 'https://sepolia.etherscan.io',
  137: 'https://polygonscan.com',
  80001: 'https://mumbai.polygonscan.com',
  56: 'https://bscscan.com',
  97: 'https://testnet.bscscan.com',
  42161: 'https://arbiscan.io',
  421613: 'https://goerli.arbiscan.io',
}

/**
 * 根据链 ID 构建区块浏览器 URL
 * @param chainId - 链 ID (如 1=主网, 11155111=Sepolia)
 * @param type - 资源类型: 'tx' (交易), 'address' (地址), 'block' (区块), 'token' (代币)
 * @param hash - 交易哈希、地址或区块号
 * @returns 区块浏览器 URL，本地网络或未知链返回 null
 */
export function getExplorerUrl(
  chainId: number,
  type: 'tx' | 'address' | 'block' | 'token',
  hash: string
): string | null {
  const baseUrl = EXPLORER_BASE_URLS[chainId]
  if (!baseUrl) return null
  return `${baseUrl}/${type}/${hash}`
}
/**
 * 截断地址/哈希显示
 * @param address - 钱包地址或交易哈希
 * @param startLen - 前缀保留长度，默认 6
 * @param endLen - 后缀保留长度，默认 4
 * @returns 截断后的字符串，如 "0x1234...5678"
 */
export function truncateAddress(address: string, startLen = 6, endLen = 4): string {
  if (!address) return '';
  if (address.length <= startLen + endLen) return address;
  return `${address.slice(0, startLen)}...${address.slice(-endLen)}`;
}

