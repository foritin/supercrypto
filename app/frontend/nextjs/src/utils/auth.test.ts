import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  saveTokens,
  getJwtToken,
  hasJwtToken,
  setWalletConnected,
  wasWalletConnected,
  clearAuthData,
  parseJwtPayload,
  isJwtExpired,
  getAddressFromToken,
} from './auth'

/**
 * 注意: vitest setup.ts 中 localStorage 被 vi.fn() mock，
 * 需要手动模拟存储行为才能测试依赖 localStorage 的函数。
 */
const store: Record<string, string> = {}

describe('Auth Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清空模拟存储
    Object.keys(store).forEach(key => delete store[key])

    // 配置 localStorage mock 模拟真实行为
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => store[key] ?? null)
    vi.mocked(localStorage.setItem).mockImplementation((key: string, value: string) => { store[key] = value })
    vi.mocked(localStorage.removeItem).mockImplementation((key: string) => { delete store[key] })
    vi.mocked(localStorage.clear).mockImplementation(() => { Object.keys(store).forEach(key => delete store[key]) })
  })

  describe('JWT Token Management', () => {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxOTk5OTk5OTk5fQ.signature'

    it('should store and retrieve JWT token via saveTokens', () => {
      saveTokens({ accessToken: testToken, refreshToken: 'refresh', expiresInMins: 30 })
      expect(getJwtToken()).toBe(testToken)
    })

    it('should retrieve JWT token', () => {
      store['supercrypto-jwt'] = testToken
      expect(getJwtToken()).toBe(testToken)
    })

    it('should return null when no token exists', () => {
      expect(getJwtToken()).toBeNull()
    })

    it('should check if token exists', () => {
      expect(hasJwtToken()).toBe(false)
      saveTokens({ accessToken: testToken, refreshToken: 'refresh', expiresInMins: 30 })
      expect(hasJwtToken()).toBe(true)
    })
  })

  describe('Wallet Connection State', () => {
    it('should store wallet connected state', () => {
      setWalletConnected(true)
      expect(store['supercrypto-wallet-connected']).toBe('true')
    })

    it('should remove wallet connected state when false', () => {
      store['supercrypto-wallet-connected'] = 'true'
      setWalletConnected(false)
      expect(store['supercrypto-wallet-connected']).toBeUndefined()
    })

    it('should check if wallet was connected', () => {
      expect(wasWalletConnected()).toBe(false)
      setWalletConnected(true)
      expect(wasWalletConnected()).toBe(true)
    })
  })

  describe('clearAuthData', () => {
    it('should clear all auth data', () => {
      store['supercrypto-jwt'] = 'test-token'
      store['supercrypto-wallet-connected'] = 'true'
      
      clearAuthData()
      
      expect(store['supercrypto-jwt']).toBeUndefined()
      expect(store['supercrypto-wallet-connected']).toBeUndefined()
    })
  })

  describe('JWT Parsing', () => {
    it('should parse valid JWT payload', () => {
      // JWT with payload: {"sub":"1234567890","exp":1999999999}
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxOTk5OTk5OTk5fQ.signature'
      const payload = parseJwtPayload(token)
      
      expect(payload).not.toBeNull()
      expect(payload?.sub).toBe('1234567890')
      expect(payload?.exp).toBe(1999999999)
    })

    it('should return null for invalid JWT', () => {
      expect(parseJwtPayload('invalid')).toBeNull()
      expect(parseJwtPayload('a.b')).toBeNull()
      expect(parseJwtPayload('')).toBeNull()
    })
  })

  describe('getAddressFromToken', () => {
    it('should extract address from Rust backend JWT (sub claim)', () => {
      // payload: {"sub":"0x90f79bf6eb2c4f870365e785982e1f101e93b906","exp":1999999999,"token_type":"access"}
      const rustToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIweDkwZjc5YmY2ZWIyYzRmODcwMzY1ZTc4NTk4MmUxZjEwMWU5M2I5MDYiLCJleHAiOjE5OTk5OTk5OTksInRva2VuX3R5cGUiOiJhY2Nlc3MifQ.signature'
      store['supercrypto-jwt'] = rustToken

      expect(getAddressFromToken()).toBe('0x90f79bf6eb2c4f870365e785982e1f101e93b906')
    })

    it('should extract address from Python backend JWT (address claim)', () => {
      // payload: {"address":"0xabc123","exp":1999999999,"type":"access"}
      const pyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHhhYmMxMjMiLCJleHAiOjE5OTk5OTk5OTksInR5cGUiOiJhY2Nlc3MifQ.signature'
      store['supercrypto-jwt'] = pyToken

      expect(getAddressFromToken()).toBe('0xabc123')
    })

    it('should return null when no token exists', () => {
      expect(getAddressFromToken()).toBeNull()
    })
  })

  describe('JWT Expiration', () => {
    it('should detect expired token', () => {
      // Token with exp in the past (exp: 1000000000 = Sep 2001)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxMDAwMDAwMDAwfQ.signature'
      expect(isJwtExpired(expiredToken)).toBe(true)
    })

    it('should detect valid token', () => {
      // Token with exp in the future (exp: 9999999999 = Nov 2286)
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjo5OTk5OTk5OTk5fQ.signature'
      expect(isJwtExpired(validToken)).toBe(false)
    })

    it('should return true for invalid token', () => {
      expect(isJwtExpired('invalid')).toBe(true)
    })
  })
})

