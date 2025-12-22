import { vi } from 'vitest'

// Mock account state
export const mockAccount = {
  address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  isConnected: false,
  isConnecting: false,
  isDisconnected: true,
  chain: undefined as { id: number; name: string } | undefined,
}

// Mock balance
export const mockBalance = {
  data: {
    formatted: '1.5',
    symbol: 'ETH',
    value: BigInt('1500000000000000000'),
    decimals: 18,
  },
  isLoading: false,
  isError: false,
}

// Mock connectors
export const mockConnectors = [
  {
    id: 'metaMask',
    name: 'MetaMask',
    type: 'injected',
  },
]

// Mock functions
export const mockConnect = vi.fn()
export const mockDisconnect = vi.fn()
export const mockSwitchChain = vi.fn()

// Create mock hook returns
export function createMockUseAccount(overrides: Partial<typeof mockAccount> = {}) {
  return {
    ...mockAccount,
    ...overrides,
  }
}

export function createMockUseConnect(overrides: { isPending?: boolean } = {}) {
  return {
    connect: mockConnect,
    connectors: mockConnectors,
    isPending: overrides.isPending ?? false,
    isSuccess: false,
    isError: false,
    error: null,
  }
}

export function createMockUseDisconnect() {
  return {
    disconnect: mockDisconnect,
    isPending: false,
  }
}

export function createMockUseBalance(overrides: Partial<typeof mockBalance> = {}) {
  return {
    ...mockBalance,
    ...overrides,
  }
}

export function createMockUseSwitchChain(overrides: { isPending?: boolean } = {}) {
  return {
    switchChain: mockSwitchChain,
    isPending: overrides.isPending ?? false,
  }
}

// Reset all mocks
export function resetWagmiMocks() {
  mockConnect.mockReset()
  mockDisconnect.mockReset()
  mockSwitchChain.mockReset()
}

// Mock MetaMask installed state
export function mockMetaMaskInstalled(installed: boolean) {
  if (installed) {
    Object.defineProperty(window, 'ethereum', {
      value: {
        isMetaMask: true,
        request: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    })
  } else {
    Object.defineProperty(window, 'ethereum', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  }
}

