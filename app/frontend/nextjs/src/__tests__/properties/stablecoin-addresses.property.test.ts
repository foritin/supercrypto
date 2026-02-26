/**
 * Property 1: Stablecoin 地址解析正确性
 *
 * 对于任意合约地址列表（包含/不包含 MockUSDT/MockUSDC），
 * resolveStablecoinAddresses 应正确提取匹配条目的地址，
 * 缺少条目时回退到默认值。
 *
 * **Validates: Requirements 1.2, 1.4**
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { resolveStablecoinAddresses } from '@/hooks/use-stablecoin-addresses'
import type { ContractAddressItem } from '@/services/contract'
import { MOCK_TOKEN_ADDRESSES } from '@/contracts/mock-token'

// 生成有效的以太坊地址 (0x + 40 hex chars)
const ethAddressArb = fc
  .stringMatching(/^[0-9a-f]{40}$/)
  .map((hex) => `0x${hex}` as `0x${string}`)

// 生成一个 ContractAddressItem
function contractItemArb(name: string, address: `0x${string}`): ContractAddressItem {
  return {
    name,
    address,
    symbol: name === 'MockUSDT' ? 'USDT' : 'USDC',
    scope: 'global',
    project_name: 'mock',
  }
}

// 默认地址
const defaults = {
  MockUSDT: MOCK_TOKEN_ADDRESSES.MockUSDT,
  MockUSDC: MOCK_TOKEN_ADDRESSES.MockUSDC,
}

describe('Feature: dynamic-contract-addresses, Property 1: Stablecoin 地址解析正确性', () => {
  /**
   * **Validates: Requirements 1.2, 1.4**
   * 当列表中包含 MockUSDT 条目时，解析结果应使用该条目的地址
   */
  it('property: 列表中有 MockUSDT 时返回后端地址', () => {
    fc.assert(
      fc.property(ethAddressArb, (addr) => {
        const contracts: ContractAddressItem[] = [contractItemArb('MockUSDT', addr)]
        const result = resolveStablecoinAddresses(contracts, defaults)

        expect(result.addresses.MockUSDT).toBe(addr)
        expect(result.addresses.MockUSDC).toBe(defaults.MockUSDC)
        expect(result.isFromBackend).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 1.2, 1.4**
   * 当列表中包含 MockUSDC 条目时，解析结果应使用该条目的地址
   */
  it('property: 列表中有 MockUSDC 时返回后端地址', () => {
    fc.assert(
      fc.property(ethAddressArb, (addr) => {
        const contracts: ContractAddressItem[] = [contractItemArb('MockUSDC', addr)]
        const result = resolveStablecoinAddresses(contracts, defaults)

        expect(result.addresses.MockUSDC).toBe(addr)
        expect(result.addresses.MockUSDT).toBe(defaults.MockUSDT)
        expect(result.isFromBackend).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 1.2, 1.4**
   * 当列表中同时包含 MockUSDT 和 MockUSDC 时，两者都使用后端地址
   */
  it('property: 列表中同时有 MockUSDT 和 MockUSDC 时都返回后端地址', () => {
    fc.assert(
      fc.property(ethAddressArb, ethAddressArb, (usdtAddr, usdcAddr) => {
        const contracts: ContractAddressItem[] = [
          contractItemArb('MockUSDT', usdtAddr),
          contractItemArb('MockUSDC', usdcAddr),
        ]
        const result = resolveStablecoinAddresses(contracts, defaults)

        expect(result.addresses.MockUSDT).toBe(usdtAddr)
        expect(result.addresses.MockUSDC).toBe(usdcAddr)
        expect(result.isFromBackend).toBe(true)
      }),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 1.4**
   * 当列表为空或不包含目标条目时，回退到默认值
   */
  it('property: 列表中缺少目标条目时回退到默认值', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string().filter((n) => n !== 'MockUSDT' && n !== 'MockUSDC'),
            address: fc.stringMatching(/^0x[0-9a-f]{40}$/),
            symbol: fc.constant(null),
            scope: fc.constant('global'),
            project_name: fc.constant('mock'),
          }),
          { maxLength: 10 },
        ),
        (contracts) => {
          const result = resolveStablecoinAddresses(
            contracts as ContractAddressItem[],
            defaults,
          )

          expect(result.addresses.MockUSDT).toBe(defaults.MockUSDT)
          expect(result.addresses.MockUSDC).toBe(defaults.MockUSDC)
          expect(result.isFromBackend).toBe(false)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 1.4**
   * undefined 或空数组输入时回退到默认值
   */
  it('property: undefined 或空数组时回退到默认值', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(undefined), fc.constant([])),
        (contracts) => {
          const result = resolveStablecoinAddresses(
            contracts as ContractAddressItem[] | undefined,
            defaults,
          )

          expect(result.addresses.MockUSDT).toBe(defaults.MockUSDT)
          expect(result.addresses.MockUSDC).toBe(defaults.MockUSDC)
          expect(result.isFromBackend).toBe(false)
        },
      ),
      { numRuns: 100 },
    )
  })
})
