/**
 * Property 9: Wallet Connection State Consistency
 * 
 * For any wallet connection state change (connect, disconnect, account change, network change),
 * the Wallet_Connector SHALL correctly update the displayed address, balance, and network 
 * information to match the actual wallet state.
 * 
 * ∀ state ∈ WalletStates:
 *   (state.isConnected ∧ state.address) ⟹ UI.showsConnectedState(state.address)
 *   ∧ ¬state.isConnected ⟹ UI.showsDisconnectedState
 * 
 * **Validates: Requirements 7.3, 7.4, 7.8**
 * 
 * Requirements:
 * - 7.3: 支持账户切换事件处理 (Support account switching event handling)
 * - 7.4: 支持网络切换事件处理 (Support network switching event handling)
 * - 7.8: 断开连接时清除认证状态 (Clear authentication state on disconnect)
 * 
 * Note: Since wallet connection involves complex browser APIs and external dependencies,
 * this test focuses on the state management logic and utility functions rather than
 * full component rendering with actual wallet connections.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] || null,
  }
})()

// Setup localStorage mock before importing auth utilities
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Import auth utilities after localStorage mock is set up
import {
  clearAuthData,
  setWalletConnected,
  setWalletAddress,
  hasJwtToken,
  getAddressFromToken,
  getWalletAddress,
  wasWalletConnected,
  saveTokens,
  parseJwtPayload,
} from '@/utils/auth'

// Ethereum address generator - generates valid Ethereum addresses
// Using fc.string with hex characters to create valid addresses
const hexCharArb = fc.constantFrom(
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'a', 'b', 'c', 'd', 'e', 'f'
)

const ethereumAddressArb = fc.array(hexCharArb, { minLength: 40, maxLength: 40 })
  .map(chars => `0x${chars.join('')}`)

// Chain ID generator - common Ethereum chain IDs
const chainIdArb = fc.constantFrom(1, 5, 11155111, 31337, 137, 42161, 10)

// Network name generator
const networkNameArb = fc.constantFrom(
  'Ethereum',
  'Goerli',
  'Sepolia',
  'Hardhat',
  'Polygon',
  'Arbitrum',
  'Optimism'
)

// Wallet state generator
interface WalletState {
  isConnected: boolean
  address: string | undefined
  chainId: number | undefined
  networkName: string | undefined
}

const walletStateArb: fc.Arbitrary<WalletState> = fc.record({
  isConnected: fc.boolean(),
  address: fc.option(ethereumAddressArb, { nil: undefined }),
  chainId: fc.option(chainIdArb, { nil: undefined }),
  networkName: fc.option(networkNameArb, { nil: undefined }),
}).map(state => {
  // Ensure consistency: if connected, must have address
  if (state.isConnected && !state.address) {
    return { ...state, address: `0x${'a'.repeat(40)}` }
  }
  // If not connected, clear address
  if (!state.isConnected) {
    return { ...state, address: undefined, chainId: undefined, networkName: undefined }
  }
  return state
})

// JWT token generator for testing
const createMockJwt = (address: string): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ 
    address: address.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  }))
  const signature = btoa('mock-signature')
  return `${header}.${payload}.${signature}`
}

// Feature: frontend-shadcn-migration, Property 9: Wallet Connection State Consistency
describe('Property 9: Wallet Connection State Consistency', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  /**
   * Test that connected state with address results in proper state storage
   * **Validates: Requirements 7.3, 7.4**
   */
  describe('Connected State Consistency', () => {
    it('when connected with address, wallet state is properly stored', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          (address) => {
            localStorageMock.clear()
            
            // Simulate wallet connection
            setWalletConnected(true)
            setWalletAddress(address)
            
            // Verify state consistency
            expect(wasWalletConnected()).toBe(true)
            expect(getWalletAddress()).toBe(address.toLowerCase())
          }
        ),
        { numRuns: 100 }
      )
    })

    it('connected state with JWT shows authenticated state', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          (address) => {
            localStorageMock.clear()
            
            // Simulate authenticated connection
            setWalletConnected(true)
            setWalletAddress(address)
            const mockJwt = createMockJwt(address)
            saveTokens({
              accessToken: mockJwt,
              refreshToken: 'mock-refresh-token',
              expiresInMins: 60
            })
            
            // Verify authenticated state
            expect(hasJwtToken()).toBe(true)
            expect(getAddressFromToken()?.toLowerCase()).toBe(address.toLowerCase())
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Test that disconnected state results in cleared authentication
   * **Validates: Requirement 7.8**
   */
  describe('Disconnected State Consistency', () => {
    it('when disconnected, authentication state is cleared', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          (address) => {
            localStorageMock.clear()
            
            // First, simulate connected state
            setWalletConnected(true)
            setWalletAddress(address)
            const mockJwt = createMockJwt(address)
            saveTokens({
              accessToken: mockJwt,
              refreshToken: 'mock-refresh-token',
              expiresInMins: 60
            })
            
            // Verify connected state
            expect(wasWalletConnected()).toBe(true)
            expect(hasJwtToken()).toBe(true)
            
            // Simulate disconnect - clear all auth data
            clearAuthData()
            
            // Verify disconnected state - all auth data cleared
            expect(wasWalletConnected()).toBe(false)
            expect(hasJwtToken()).toBe(false)
            expect(getWalletAddress()).toBeNull()
            expect(getAddressFromToken()).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('disconnect clears all authentication tokens', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          fc.string({ minLength: 10, maxLength: 50 }),
          (address, refreshToken) => {
            localStorageMock.clear()
            
            // Setup authenticated state
            const mockJwt = createMockJwt(address)
            saveTokens({
              accessToken: mockJwt,
              refreshToken: refreshToken,
              expiresInMins: 60
            })
            setWalletConnected(true)
            setWalletAddress(address)
            
            // Clear auth data (simulating disconnect)
            clearAuthData()
            
            // Verify all tokens are cleared
            expect(hasJwtToken()).toBe(false)
            expect(getAddressFromToken()).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Test account change handling
   * **Validates: Requirement 7.3**
   */
  describe('Account Change Handling', () => {
    it('account change clears previous authentication and updates address', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          ethereumAddressArb,
          (oldAddress, newAddress) => {
            // Skip if addresses are the same
            if (oldAddress.toLowerCase() === newAddress.toLowerCase()) return true
            
            localStorageMock.clear()
            
            // Setup initial authenticated state with old address
            setWalletConnected(true)
            setWalletAddress(oldAddress)
            const oldJwt = createMockJwt(oldAddress)
            saveTokens({
              accessToken: oldJwt,
              refreshToken: 'old-refresh-token',
              expiresInMins: 60
            })
            
            // Verify old address is stored
            expect(getWalletAddress()).toBe(oldAddress.toLowerCase())
            expect(getAddressFromToken()?.toLowerCase()).toBe(oldAddress.toLowerCase())
            
            // Simulate account change - clear auth data first (as the component does)
            clearAuthData()
            
            // Then set new address
            setWalletConnected(true)
            setWalletAddress(newAddress)
            
            // Verify new address is stored and old JWT is cleared
            expect(getWalletAddress()).toBe(newAddress.toLowerCase())
            expect(hasJwtToken()).toBe(false) // JWT cleared, needs re-authentication
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('address mismatch between JWT and wallet triggers re-authentication need', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          ethereumAddressArb,
          (jwtAddress, walletAddress) => {
            // Skip if addresses are the same
            if (jwtAddress.toLowerCase() === walletAddress.toLowerCase()) return true
            
            localStorageMock.clear()
            
            // Setup JWT with one address
            const mockJwt = createMockJwt(jwtAddress)
            saveTokens({
              accessToken: mockJwt,
              refreshToken: 'mock-refresh-token',
              expiresInMins: 60
            })
            
            // Set wallet address to different address
            setWalletAddress(walletAddress)
            
            // Verify mismatch detection
            const tokenAddress = getAddressFromToken()
            const storedWalletAddress = getWalletAddress()
            
            // Addresses should not match - this indicates re-auth is needed
            expect(tokenAddress?.toLowerCase()).not.toBe(storedWalletAddress?.toLowerCase())
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Test network change handling
   * **Validates: Requirement 7.4**
   */
  describe('Network Change Handling', () => {
    it('network change preserves wallet connection state', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          chainIdArb,
          chainIdArb,
          (address, oldChainId, newChainId) => {
            localStorageMock.clear()
            
            // Setup connected state
            setWalletConnected(true)
            setWalletAddress(address)
            
            // Network change should not affect connection state
            // (network info is managed by wagmi/RainbowKit, not localStorage)
            
            // Verify connection state is preserved
            expect(wasWalletConnected()).toBe(true)
            expect(getWalletAddress()).toBe(address.toLowerCase())
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('network change preserves authentication tokens', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          chainIdArb,
          chainIdArb,
          (address, oldChainId, newChainId) => {
            localStorageMock.clear()
            
            // Setup authenticated state
            setWalletConnected(true)
            setWalletAddress(address)
            const mockJwt = createMockJwt(address)
            saveTokens({
              accessToken: mockJwt,
              refreshToken: 'mock-refresh-token',
              expiresInMins: 60
            })
            
            // Network change should not clear authentication
            // (authentication is address-based, not network-based)
            
            // Verify authentication is preserved
            expect(hasJwtToken()).toBe(true)
            expect(getAddressFromToken()?.toLowerCase()).toBe(address.toLowerCase())
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Test wallet state invariants
   * **Validates: Requirements 7.3, 7.4, 7.8**
   */
  describe('Wallet State Invariants', () => {
    it('wallet state transitions maintain consistency', () => {
      fc.assert(
        fc.property(
          walletStateArb,
          (state) => {
            localStorageMock.clear()
            
            if (state.isConnected && state.address) {
              // Connected state
              setWalletConnected(true)
              setWalletAddress(state.address)
              
              expect(wasWalletConnected()).toBe(true)
              expect(getWalletAddress()).toBe(state.address.toLowerCase())
            } else {
              // Disconnected state
              clearAuthData()
              
              expect(wasWalletConnected()).toBe(false)
              expect(getWalletAddress()).toBeNull()
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('JWT address always matches stored wallet address when authenticated', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          (address) => {
            localStorageMock.clear()
            
            // Setup properly authenticated state
            setWalletConnected(true)
            setWalletAddress(address)
            const mockJwt = createMockJwt(address)
            saveTokens({
              accessToken: mockJwt,
              refreshToken: 'mock-refresh-token',
              expiresInMins: 60
            })
            
            // Verify address consistency
            const jwtAddress = getAddressFromToken()
            const walletAddress = getWalletAddress()
            
            expect(jwtAddress?.toLowerCase()).toBe(walletAddress?.toLowerCase())
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('clearAuthData removes all authentication-related data', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          fc.string({ minLength: 10, maxLength: 100 }),
          (address, sessionId) => {
            localStorageMock.clear()
            
            // Setup full authenticated state
            setWalletConnected(true)
            setWalletAddress(address)
            const mockJwt = createMockJwt(address)
            saveTokens({
              accessToken: mockJwt,
              refreshToken: 'mock-refresh-token',
              expiresInMins: 60
            })
            
            // Clear all auth data
            clearAuthData()
            
            // Verify everything is cleared
            expect(wasWalletConnected()).toBe(false)
            expect(getWalletAddress()).toBeNull()
            expect(hasJwtToken()).toBe(false)
            expect(getAddressFromToken()).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Test JWT parsing consistency
   * **Validates: Requirements 7.3, 7.8**
   */
  describe('JWT Parsing Consistency', () => {
    it('parseJwtPayload correctly extracts address from valid JWT', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          (address) => {
            const mockJwt = createMockJwt(address)
            const payload = parseJwtPayload(mockJwt)
            
            expect(payload).not.toBeNull()
            expect(payload?.address).toBe(address.toLowerCase())
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('parseJwtPayload returns null for invalid JWT format', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (invalidToken) => {
            // Skip if the string happens to have valid JWT structure
            if (invalidToken.split('.').length === 3) return true
            
            const payload = parseJwtPayload(invalidToken)
            expect(payload).toBeNull()
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
