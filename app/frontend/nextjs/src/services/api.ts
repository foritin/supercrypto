/**
 * API Service
 * Base API configuration and utilities using Axios
 * 
 * Token 过期处理流程：
 * 1. 请求带上 access_token
 * 2. 后端返回 401 → 用 refresh_token 续期
 * 3. 续期成功 → 重试原请求
 * 4. 续期失败 → 退出登录
 */

import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios'

import { API_BASE_URL } from '@/constants/api'
import { refreshAccessToken } from '@/services/auth'
import { getJwtToken } from '@/utils/auth'


/**
 * API Error
 */
export class ApiError extends Error {
  code: number
  errorCode?: number
  detail?: Record<string, unknown>

  constructor(code: number, message: string, errorCode?: number, detail?: Record<string, unknown>) {
    super(message)
    this.code = code
    if (errorCode !== undefined) {
      this.errorCode = errorCode
    }
    if (detail !== undefined) {
      this.detail = detail
    }
    this.name = 'ApiError'
  }
}

/**
 * Create Axios instance with default config
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token refresh state - prevent multiple concurrent refresh requests
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback)
}

function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers = []
}

/**
 * Request re-authentication confirmation from UI.
 * UI will show a modal and logout only after user confirms.
 */
function requestReauth(message?: string): void {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent('auth:reauth-required', {
    detail: { message: message || '登录已过期，请重新连接钱包' }
  }))
}

/**
 * Request interceptor - add auth headers
 */
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.data instanceof FormData) {
      const headers = config.headers as Record<string, unknown>
      delete headers['Content-Type']
      delete headers['content-type']
    }

    if (typeof window !== 'undefined') {
      const token = getJwtToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * Response interceptor
 * - 正常响应：解析 API 格式
 * - 401 响应：用 refresh_token 续期，成功则重试请求
 */
axiosInstance.interceptors.response.use(
  (response) => {
    const json: API.Response<unknown> = response.data

    if (json.code !== 0 && json.code !== 200) {
      throw new ApiError(json.code, json.data?.msg || 'Request failed')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return json.data as any
  },
  async (error: AxiosError<API.Response<unknown>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const tokenStatus = String(error.response?.headers?.['x-token-status'] || '').toLowerCase()
    
    // 401 Unauthorized - try refresh token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Don't retry for public auth endpoints
      const isAuthEndpoint = originalRequest.url?.includes('/public/auth/token') || 
                             originalRequest.url?.includes('/public/auth/refresh') ||
                             originalRequest.url?.includes('/public/auth/logout')
      
      if (isAuthEndpoint) {
        return Promise.reject(new ApiError(401, '认证失败'))
      }
      
      originalRequest._retry = true
      
      if (!isRefreshing) {
        isRefreshing = true
        
        try {
          const tokenData = await refreshAccessToken()
          isRefreshing = false
          
          if (tokenData) {
            // Refresh 成功，通知所有等待的请求，并重试原请求
            onTokenRefreshed(tokenData.accessToken)
            originalRequest.headers.Authorization = `Bearer ${tokenData.accessToken}`
            return axiosInstance(originalRequest)
          } else {
            // Refresh 失败，请求用户确认重新登录
            requestReauth('登录已过期，请重新连接钱包')
            return Promise.reject(new ApiError(401, '登录已过期'))
          }
        } catch {
          isRefreshing = false
          requestReauth('登录已过期，请重新连接钱包')
          return Promise.reject(new ApiError(401, '登录已过期'))
        }
      } else {
        // 正在刷新中，等待刷新完成后重试
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(axiosInstance(originalRequest))
          })
          
          // 超时保护
          setTimeout(() => {
            reject(new ApiError(401, '登录刷新超时'))
          }, 10000)
        })
      }
    }
    
    // Session 被管理员撤销
    const responseDataAny = error.response?.data as Record<string, unknown> | undefined
    const dataObjAny = responseDataAny?.data as Record<string, unknown> | undefined
    if (dataObjAny?.msg && (
        String(dataObjAny.msg).includes('Session revoked') ||
        String(dataObjAny.msg).includes('session_revoked'))) {
      requestReauth('您已被管理员强制下线，请重新连接钱包')
      return Promise.reject(new ApiError(401, '会话已被撤销'))
    }

    // 终态 401（刷新后仍失败 / 会话版本不匹配 / 会话不存在）
    if (error.response?.status === 401) {
      const isTerminal401 =
        !!originalRequest?._retry ||
        tokenStatus === 'refresh_expired' ||
        tokenStatus === 'session_not_found' ||
        tokenStatus === 'version_mismatch'

      if (isTerminal401) {
        if (tokenStatus === 'session_not_found' || tokenStatus === 'version_mismatch') {
          requestReauth('会话已失效，请重新连接钱包')
        } else {
          requestReauth('登录已过期，请重新连接钱包')
        }
      }
    }
    
    // 其他错误
    if (error.response?.data) {
      const responseData = error.response.data as unknown as Record<string, unknown>
      // 支持两种错误格式：
      // 1. 业务异常格式: { code, message, error_code, detail, path }
      // 2. 标准 API 格式: { code, data: { msg } }
      const dataObj = responseData.data as Record<string, unknown> | undefined
      const errorMessage = (responseData.message as string) || (dataObj?.msg as string) || 'Request failed'
      const errorCode = typeof responseData.code === 'number' ? responseData.code : error.response.status
      const errorCodeNum = typeof responseData.error_code === 'number' ? responseData.error_code : undefined
      const detailObj = typeof responseData.detail === 'object' ? responseData.detail as Record<string, unknown> : undefined
      throw new ApiError(errorCode, errorMessage, errorCodeNum, detailObj)
    }
    throw new ApiError(500, error.message || 'Network error')
  }
)

/**
 * GET request
 */
export function get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
  return axiosInstance.get(endpoint, { params }) as Promise<T>
}

/**
 * POST request
 */
export function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return axiosInstance.post(endpoint, body) as Promise<T>
}

/**
 * PUT request
 */
export function put<T>(endpoint: string, body?: unknown): Promise<T> {
  return axiosInstance.put(endpoint, body) as Promise<T>
}

/**
 * PATCH request
 */
export function patch<T>(endpoint: string, body?: unknown): Promise<T> {
  return axiosInstance.patch(endpoint, body) as Promise<T>
}

/**
 * DELETE request
 */
export function del<T>(endpoint: string, body?: unknown): Promise<T> {
  return axiosInstance.delete(endpoint, { data: body }) as Promise<T>
}

export { axiosInstance, API_BASE_URL }

export const api = {
  get,
  post,
  put,
  patch,
  delete: del,
}
