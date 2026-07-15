// Authentication utilities

// Storage keys
const JWT_STORAGE_KEY = 'supercrypto-jwt'
const REFRESH_TOKEN_KEY = 'supercrypto-refresh-token'
const WALLET_ADDRESS_KEY = 'supercrypto-wallet-address'
const WALLET_CONNECTED_KEY = 'supercrypto-wallet-connected'
const SESSION_ID_KEY = 'supercrypto-session-id'

/**
 * Token data structure (from backend response)
 */
export interface TokenData {
  accessToken: string
  refreshToken: string
  expiresInMins: number
}

/**
 * Save tokens from login/refresh response
 */
export function saveTokens(data: TokenData): void {
  localStorage.setItem(JWT_STORAGE_KEY, data.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
}

/**
 * Get JWT (access token) from localStorage
 */
export function getJwtToken(): string | null {
  return localStorage.getItem(JWT_STORAGE_KEY)
}

/**
 * Get refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * Check if user has JWT token (may or may not be expired - backend will tell us)
 */
export function hasJwtToken(): boolean {
  return !!getJwtToken()
}

/**
 * Store wallet connected state
 */
export function setWalletConnected(connected: boolean): void {
  if (connected) {
    localStorage.setItem(WALLET_CONNECTED_KEY, 'true')
  } else {
    localStorage.removeItem(WALLET_CONNECTED_KEY)
  }
}

/**
 * Check if wallet was previously connected
 */
export function wasWalletConnected(): boolean {
  return localStorage.getItem(WALLET_CONNECTED_KEY) === 'true'
}

/**
 * Get wallet address from localStorage
 */
export function getWalletAddress(): string | null {
  return localStorage.getItem(WALLET_ADDRESS_KEY)
}

/**
 * Set wallet address in localStorage
 */
export function setWalletAddress(address: string): void {
  localStorage.setItem(WALLET_ADDRESS_KEY, address.toLowerCase())
}

/**
 * Get session ID from localStorage
 */
export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_ID_KEY)
}

/**
 * Set session ID in localStorage
 */
export function setSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_ID_KEY, sessionId)
}

/**
 * Clear all authentication data
 * Called when:
 * - User disconnects wallet (MetaMask)
 * - Session is revoked by admin
 * - Both tokens expired
 */
export function clearAuthData(): void {
  localStorage.removeItem(JWT_STORAGE_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(WALLET_ADDRESS_KEY)
  localStorage.removeItem(WALLET_CONNECTED_KEY)
  localStorage.removeItem(SESSION_ID_KEY)
}

/**
 * Parse JWT token to get payload (without verification)
 * Used for reading claims like address
 */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = parts[1]
    if (!payload) return null
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

/**
 * Get address from JWT token payload
 *
 * Supports two JWT claim formats:
 * - Rust backend: address stored in standard `sub` claim
 * - Python backend: address stored in custom `address` claim
 */
export function getAddressFromToken(): string | null {
  const token = getJwtToken()
  if (!token) return null

  const payload = parseJwtPayload(token)
  return (payload?.sub as string) || (payload?.address as string) || null
}

/**
 * Check if JWT token is expired (local check, for reference only)
 * Backend is the source of truth via 401 response
 */
export function isJwtExpired(token: string): boolean {
  const payload = parseJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return true
  
  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now
}
