/**
 * Property 1: Stablecoin 地址解析正确性
 *
 * 对于任意合约地址列表（包含/不包含 MockUSDT/MockUSDC），
 * resolveStablecoinAddresses 应正确提取匹配条目的地址，
 * 缺少条目时回退到默认值。
 *
 * **Validates: Requirements 1.2, 1.4**
 */

import fc from 'fast-check'
import { describe, it, expect } from 'vitest'

import { resolveStablecoinAddresses } from '@/hooks/use-stablecoin-addresses'
import type { AddressInfo } from '@/services/platform-info'

// 生成有效的以太坊地址 (0x + 40 hex chars)
const ethAddressArb = fc
  .stringMatching(/^[0-9a-f]{40}$/)
  .map((hex) => `0x${hex}` as `0x${string}`)

// 生成一个 AddressInfo（模拟 platformInfoStore 中的合约条目）
function contractItemArb(name: string, address: `0x${string}`): AddressInfo {
  return {
    id: 1,
    name,
    address,
    scope: 'global',
    contract_type: 'stablecoin',
    status: 'active',
    deployer_address: '0x0000000000000000000000000000000000000000',
    abi_info: [],
  }
}

// 默认地址（环境变量已移除，默认为空）
const defaults = {
  MockUSDT: '' as `0x${string}`,
  MockUSDC: '' as `0x${string}`,
}

describe('Feature: dynamic-contract-addresses, Property 1: Stablecoin 地址解析正确性', () => {
  /**
   * **Validates: Requirements 1.2, 1.4**
   * 当列表中包含 MockUSDT 条目时，解析结果应使用该条目的地址
   */
  it('property: 列表中有 MockUSDT 时返回后端地址', () => {
    fc.assert(
      fc.property(ethAddressArb, (addr) => {
        const contracts: AddressInfo[] = [contractItemArb('MockUSDT', addr)]
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
        const contracts: AddressInfo[] = [contractItemArb('MockUSDC', addr)]
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
        const contracts: AddressInfo[] = [
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
            id: fc.constant(1),
            name: fc.string().filter((n) => n !== 'MockUSDT' && n !== 'MockUSDC'),
            address: fc.stringMatching(/^0x[0-9a-f]{40}$/),
            scope: fc.constant('global'),
            contract_type: fc.constant('stablecoin'),
            status: fc.constant('active'),
            deployer_address: fc.constant('0x0000000000000000000000000000000000000000'),
            abi_info: fc.constant([]),
          }),
          { maxLength: 10 },
        ),
        (contracts) => {
          const result = resolveStablecoinAddresses(
            contracts as unknown as AddressInfo[],
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
            contracts as AddressInfo[] | undefined,
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
   * **Validates: active/global 优先级规则**
   * 同名合约存在多条记录时，应优先选择 active + global 的地址
   */
  it('property: 同名稳定币冲突时优先 active+global', () => {
    fc.assert(
      fc.property(
        ethAddressArb,
        ethAddressArb,
        ethAddressArb,
        (activeGlobalAddr, activeProjectAddr, pausedGlobalAddr) => {
          const contracts: AddressInfo[] = [
            {
              ...contractItemArb('USDT', activeProjectAddr),
              id: 1,
              scope: 'project',
              status: 'active',
            },
            {
              ...contractItemArb('USDT', pausedGlobalAddr),
              id: 2,
              scope: 'global',
              status: 'paused',
            },
            {
              ...contractItemArb('USDT', activeGlobalAddr),
              id: 3,
              scope: 'global',
              status: 'active',
            },
          ]

          const result = resolveStablecoinAddresses(contracts, defaults)
          expect(result.addresses.MockUSDT).toBe(activeGlobalAddr)
          expect(result.isFromBackend).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })
})
