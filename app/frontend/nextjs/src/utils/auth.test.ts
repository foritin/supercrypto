import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  setJwtToken,
  getJwtToken,
  clearJwtToken,
  hasJwtToken,
  setWalletConnected,
  wasWalletConnected,
  clearAuthData,
  parseJwtPayload,
  isJwtExpired,
} from './auth'

describe('Auth Utils', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('JWT Token Management', () => {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxOTk5OTk5OTk5fQ.signature'

    it('should store JWT token', () => {
      setJwtToken(testToken)
      expect(localStorage.getItem('supercrypto-jwt')).toBe(testToken)
    })

    it('should retrieve JWT token', () => {
      localStorage.setItem('supercrypto-jwt', testToken)
      expect(getJwtToken()).toBe(testToken)
    })

    it('should return null when no token exists', () => {
      expect(getJwtToken()).toBeNull()
    })

    it('should clear JWT token', () => {
      localStorage.setItem('supercrypto-jwt', testToken)
      clearJwtToken()
      expect(localStorage.getItem('supercrypto-jwt')).toBeNull()
    })

    it('should check if token exists', () => {
      expect(hasJwtToken()).toBe(false)
      setJwtToken(testToken)
      expect(hasJwtToken()).toBe(true)
    })
  })

  describe('Wallet Connection State', () => {
    it('should store wallet connected state', () => {
      setWalletConnected(true)
      expect(localStorage.getItem('supercrypto-wallet-connected')).toBe('true')
    })

    it('should remove wallet connected state when false', () => {
      localStorage.setItem('supercrypto-wallet-connected', 'true')
      setWalletConnected(false)
      expect(localStorage.getItem('supercrypto-wallet-connected')).toBeNull()
    })

    it('should check if wallet was connected', () => {
      expect(wasWalletConnected()).toBe(false)
      setWalletConnected(true)
      expect(wasWalletConnected()).toBe(true)
    })
  })

  describe('clearAuthData', () => {
    it('should clear all auth data', () => {
      localStorage.setItem('supercrypto-jwt', 'test-token')
      localStorage.setItem('supercrypto-wallet-connected', 'true')
      
      clearAuthData()
      
      expect(localStorage.getItem('supercrypto-jwt')).toBeNull()
      expect(localStorage.getItem('supercrypto-wallet-connected')).toBeNull()
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

