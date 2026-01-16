/**
 * Admin Session Management Service
 * 管理员会话管理 API
 */

import { get, post } from '@/services/api'

/**
 * 用户会话信息
 */
export interface UserSession {
  wallet_address: string
  session_id: string
  login_at: string
  last_active_at: string
  user_agent: string
  ip_address: string
}

/**
 * 会话列表响应
 */
export interface SessionListResponse {
  list_data: UserSession[]
  pagination: {
    total: number
    page: number
    page_size: number
    total_pages: number
  }
}

/**
 * 撤销会话响应
 */
export interface RevokeSessionResponse {
  object_data: {
    wallet_address: string
    revoked_sessions: number
  }
  msg: string
}

/**
 * 获取活跃会话列表
 */
export async function listActiveSessions(params: {
  page?: number
  page_size?: number
  search?: string
}): Promise<SessionListResponse> {
  return get('/admin/auth/sessions', params)
}

/**
 * 强制下线用户
 */
export async function revokeUserSession(walletAddress: string): Promise<RevokeSessionResponse> {
  return post(`/admin/auth/sessions/${walletAddress}/revoke`)
}

/**
 * 获取用户会话列表
 */
export async function getUserSessions(walletAddress: string): Promise<{
  list_data: UserSession[]
  object_data: {
    wallet_address: string
    session_count: number
  }
}> {
  return get(`/admin/auth/sessions/${walletAddress}`)
}

export const adminSessionService = {
  listActiveSessions,
  revokeUserSession,
  getUserSessions,
}

