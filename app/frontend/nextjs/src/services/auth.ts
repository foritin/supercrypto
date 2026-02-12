/**
 * Authentication Service
 * Handles login, logout, and token refresh
 */

import axios from "axios";
import {
  saveTokens,
  getRefreshToken,
  clearAuthData,
  setSessionId,
  getWalletAddress,
  TokenData,
} from "@/utils/auth";

import { API_BASE_URL } from "@/constants/api";

/**
 * Login response from backend
 */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_mins: number;
  session_id?: string;
}

/**
 * Login with wallet signature
 * @param address Wallet address
 * @param signature Wallet signature
 * @param chainId Current wallet network chain ID (1=mainnet, 11155111=sepolia, 31337=localhost)
 * @param chainName Chain name as shown in MetaMask (e.g., "Ethereum Mainnet", "Sepolia", "Localhost 8545")
 */
export async function login(
  address: string,
  signature: string,
  chainId?: number,
  chainName?: string
): Promise<LoginResponse> {
  const response = await axios.post(
    `${API_BASE_URL}/public/auth/token`,
    {
      address: address.toLowerCase(),
      signature,
      chain_id: chainId,
      chain_name: chainName,
    },
    { withCredentials: true } // 接收后端设置的 httpOnly cookie
  );

  const data = response.data.data.object_data as LoginResponse;

  // Save tokens
  saveTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresInMins: data.expires_in_mins,
  });

  // Save session ID if provided
  if (data.session_id) {
    setSessionId(data.session_id);
  }

  return data;
}

/**
 * Refresh access token using refresh token
 * 优先通过 httpOnly cookie 自动携带 refresh token（推荐）
 * 同时支持 localStorage 中的 refresh token（向后兼容）
 * @returns New token data or null if refresh failed
 */
export async function refreshAccessToken(): Promise<TokenData | null> {
  try {
    // 发送请求时浏览器会自动携带 httpOnly cookie
    // 同时传递 localStorage 中的 refresh token 作为后备
    const refreshToken = getRefreshToken();
    const response = await axios.post(
      `${API_BASE_URL}/public/auth/refresh`,
      refreshToken ? { refresh_token: refreshToken } : {},
      { withCredentials: true } // 确保携带 httpOnly cookie
    );

    const data = response.data.data.object_data as LoginResponse;

    const tokenData: TokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresInMins: data.expires_in_mins,
    };

    // Save new tokens
    saveTokens(tokenData);

    // Save session ID if provided
    if (data.session_id) {
      setSessionId(data.session_id);
    }

    return tokenData;
  } catch {
    // Refresh failed, clear all auth data
    return null;
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
  const walletAddress = getWalletAddress();

  // Try to notify backend (best effort, don't block on failure)
  if (walletAddress) {
    try {
      await axios.post(`${API_BASE_URL}/public/auth/logout`, {
        wallet_address: walletAddress,
      });
    } catch {
      // Ignore errors - we're logging out anyway
      console.warn("Failed to notify backend of logout");
    }
  }

  // Always clear local auth data
  clearAuthData();
}

/**
 * Check if current session is valid
 */
export async function validateSession(): Promise<boolean> {
  const walletAddress = getWalletAddress();
  if (!walletAddress) return false;

  try {
    const token = localStorage.getItem("supercrypto-jwt");
    const response = await axios.get(`${API_BASE_URL}/user/auth/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data.code === 0 || response.data.code === 200;
  } catch {
    return false;
  }
}

/**
 * Try to restore session on page load
 * 页面刷新时通过 httpOnly cookie 中的 refresh token 换取新的 access token
 * 恢复登录状态到 user store
 * @returns true if session was restored, false otherwise
 */
export async function tryRestoreSession(): Promise<boolean> {
  try {
    const tokenData = await refreshAccessToken();
    if (!tokenData) return false;

    // 恢复 user store 中的认证状态
    const { useUserStore } = await import("@/stores/user-store");
    const expiresAt = Date.now() + tokenData.expiresInMins * 60 * 1000;
    useUserStore.getState().setAuthenticated(tokenData.accessToken, expiresAt);
    return true;
  } catch {
    return false;
  }
}

export const authService = {
  login,
  logout,
  refreshAccessToken,
  validateSession,
  tryRestoreSession,
};
