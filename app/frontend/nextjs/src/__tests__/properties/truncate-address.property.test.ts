/**
 * Property 2: 以太坊地址截断格式一致性
 *
 * 对于任意有效的以太坊地址（0x + 40 hex chars），
 * truncateAddress 应返回前缀和后缀与原始地址一致的截断字符串，
 * 且包含 "..." 分隔符。
 *
 * **Validates: Requirements 2.2**
 */

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'

import { truncateAddress } from '@/lib/utils'

// 生成有效的以太坊地址 (0x + 40 hex chars)
const ethAddressArb = fc
  .stringMatching(/^[0-9a-f]{40}$/)
  .map((hex) => `0x${hex}`)

describe('Feature: dynamic-contract-addresses, Property 2: 以太坊地址截断格式一致性', () => {
  /**
   * **Validates: Requirements 2.2**
   * 截断结果的前缀与原始地址前6位一致
   */
  it('property: 截断结果前缀与原始地址一致 (默认前6位)', () => {
    fc.assert(
      fc.property(ethAddressArb, (address) => {
        const truncated = truncateAddress(address)
        expect(truncated.slice(0, 6)).toBe(address.slice(0, 6))
      }),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 2.2**
   * 截断结果的后缀与原始地址后4位一致
   */
  it('property: 截断结果后缀与原始地址一致 (默认后4位)', () => {
    fc.assert(
      fc.property(ethAddressArb, (address) => {
        const truncated = truncateAddress(address)
        expect(truncated.slice(-4)).toBe(address.slice(-4))
      }),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 2.2**
   * 截断结果包含 "..." 分隔符
   */
  it('property: 截断结果包含 "..." 分隔符', () => {
    fc.assert(
      fc.property(ethAddressArb, (address) => {
        const truncated = truncateAddress(address)
        expect(truncated).toContain('...')
      }),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 2.2**
   * 截断结果格式为 prefix...suffix，长度小于原始地址
   */
  it('property: 截断结果长度小于原始地址', () => {
    fc.assert(
      fc.property(ethAddressArb, (address) => {
        const truncated = truncateAddress(address)
        expect(truncated.length).toBeLessThan(address.length)
      }),
      { numRuns: 100 },
    )
  })
})
