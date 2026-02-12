/**
 * API 基础 URL 常量
 * 全局唯一定义，所有服务层统一从此处导入
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
