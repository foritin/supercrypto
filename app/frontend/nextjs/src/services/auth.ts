/**
 * Authentication Service
 * Handles login, logout, and token refresh
 */

import axios from 'axios'
import { 
  saveTokens, 
  getRefreshToken, 
  clearAuthData, 
  setSessionId,
  getWalletAddress,
  TokenData 
} from '@/utils/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

/**
 * Login response from backend
 */
export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in_mins: number
  session_id?: string
}

/**
 * Login with wallet signature
 */
export async function login(address: string, signature: string): Promise<LoginResponse> {
  const response = await axios.post(`${API_BASE_URL}/auth/token`, {
    address: address.toLowerCase(),
    signature,
  })
  
  const data = response.data.data.object as LoginResponse
  
  // Save tokens
  saveTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresInMins: data.expires_in_mins,
  })
  
  // Save session ID if provided
  if (data.session_id) {
    setSessionId(data.session_id)
  }
  
  return data
}

/**
 * Refresh access token using refresh token
 * @returns New token data or null if refresh failed
 */
export async function refreshAccessToken(): Promise<TokenData | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    })
    
    const data = response.data.data.object as LoginResponse
    
    const tokenData: TokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresInMins: data.expires_in_mins,
    }
    
    // Save new tokens
    saveTokens(tokenData)
    
    // Save session ID if provided
    if (data.session_id) {
      setSessionId(data.session_id)
    }
    
    return tokenData
  } catch {
    // Refresh failed, clear all auth data
    return null
  }
}

/**
 * Logout - notify backend and clear local auth data
 * Called when:
 * 1. User manually disconnects wallet
 * 2. MetaMask disconnects
 * 3. Token is revoked by admin
 */
export async function logout(): Promise<void> {
  const walletAddress = getWalletAddress()
  
  // Try to notify backend (best effort, don't block on failure)
  if (walletAddress) {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {
        wallet_address: walletAddress,
      })
    } catch {
      // Ignore errors - we're logging out anyway
      console.warn('Failed to notify backend of logout')
    }
  }
  
  // Always clear local auth data
  clearAuthData()
}

/**
 * Check if current session is valid
 */
export async function validateSession(): Promise<boolean> {
  const walletAddress = getWalletAddress()
  if (!walletAddress) return false
  
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        'X-Wallet-Address': walletAddress,
      },
    })
    return response.data.code === 0 || response.data.code === 200
  } catch {
    return false
  }
}

export const authService = {
  login,
  logout,
  refreshAccessToken,
  validateSession,
}

