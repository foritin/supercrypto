import { beforeEach, describe, expect, it, vi } from 'vitest'

import { revokeCurrentDappPermissions } from './wallet-permissions'

type TestWalletWindow = Window & {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  }
}

describe('wallet-permissions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete (window as Window & { ethereum?: unknown }).ethereum
  })

  it('returns true when provider supports wallet_revokePermissions', async () => {
    const request = vi.fn().mockResolvedValue(null)
    ;(window as unknown as TestWalletWindow).ethereum = { request }

    const result = await revokeCurrentDappPermissions()

    expect(result).toBe(true)
    expect(request).toHaveBeenCalledWith({
      method: 'wallet_revokePermissions',
      params: [{ eth_accounts: {} }],
    })
  })

  it('returns false when provider does not exist', async () => {
    const result = await revokeCurrentDappPermissions()
    expect(result).toBe(false)
  })

  it('returns false when revoke is unsupported or rejected', async () => {
    const request = vi.fn().mockRejectedValue(new Error('Method not found'))
    ;(window as unknown as TestWalletWindow).ethereum = { request }

    const result = await revokeCurrentDappPermissions()

    expect(result).toBe(false)
  })
})
