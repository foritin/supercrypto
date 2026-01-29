/**
 * 错误处理工具
 * 
 * 根据后端返回的 error_code 进行国际化翻译
 * 优先级：error_code 翻译 > 后端 message > HTTP 状态码默认消息
 */
import i18n from '@/config/i18n'
import { ApiError } from '@/services/api'

/**
 * HTTP 状态码默认消息
 */
const HTTP_STATUS_MESSAGES: Record<number, { zh: string; en: string }> = {
  400: { zh: '请求参数错误', en: 'Bad Request' },
  401: { zh: '未授权，请先登录', en: 'Unauthorized' },
  403: { zh: '无权限执行此操作', en: 'Forbidden' },
  404: { zh: '资源不存在', en: 'Not Found' },
  409: { zh: '资源冲突', en: 'Conflict' },
  422: { zh: '数据验证失败', en: 'Validation Error' },
  429: { zh: '请求过于频繁，请稍后重试', en: 'Too Many Requests' },
  500: { zh: '服务器内部错误', en: 'Internal Server Error' },
  502: { zh: '网关错误', en: 'Bad Gateway' },
  503: { zh: '服务暂时不可用', en: 'Service Unavailable' },
  504: { zh: '网关超时', en: 'Gateway Timeout' },
}

/**
 * 获取当前语言
 */
function getCurrentLanguage(): 'zh' | 'en' {
  const lang = i18n.language || 'zh-CN'
  return lang.startsWith('zh') ? 'zh' : 'en'
}

/**
 * 获取 HTTP 状态码的默认消息
 */
function getHttpStatusMessage(statusCode: number): string {
  const lang = getCurrentLanguage()
  const messages = HTTP_STATUS_MESSAGES[statusCode]
  if (messages) {
    return messages[lang]
  }
  return lang === 'zh' ? '请求失败' : 'Request Failed'
}

/**
 * 获取错误的国际化消息
 * 
 * 优先级：
 * 1. error_code 对应的翻译（支持插值参数）
 * 2. 后端返回的 message
 * 3. HTTP 状态码默认消息
 * 
 * @param error - 错误对象 (ApiError 或 Error)
 * @returns 国际化后的错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // 1. 优先尝试使用 error_code 翻译
    if (error.errorCode) {
      const translationKey = `errors.${error.errorCode}`
      const translated = i18n.t(translationKey, error.detail || {})
      
      // 如果翻译成功（不等于 key 本身），返回翻译结果
      if (translated !== translationKey) {
        return translated
      }
    }
    
    // 2. 使用后端返回的 message（如果不是通用的 "Request failed"）
    if (error.message && error.message !== 'Request failed') {
      return error.message
    }
    
    // 3. 使用 HTTP 状态码默认消息
    return getHttpStatusMessage(error.code)
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return i18n.t('errors.default')
}

/**
 * 判断是否为特定错误码
 */
export function isErrorCode(error: unknown, code: number): boolean {
  return error instanceof ApiError && error.errorCode === code
}

/**
 * 判断是否为特定 HTTP 状态码
 */
export function isHttpStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.code === status
}
