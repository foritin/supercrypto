/**
 * 全局 API 类型声明
 * 使用 namespace 避免全局污染
 * 使用方式: API.ResponseData<User>
 */
declare namespace API {
  /**
   * 标准 API 响应数据格式 (falib.utils.handlers)
   */
  interface ResponseData<T> {
    msg: string
    list: T[]
    object: T | null
    pagination: Pagination | null
  }

  /**
   * 分页信息
   */
  interface Pagination {
    total: number
    page: number
    page_size: number
    total_pages: number
  }

  /**
   * 完整 API 响应格式
   */
  interface Response<T> {
    code: number
    data: ResponseData<T>
  }

  /**
   * 分页列表结果
   */
  interface PaginatedResult<T> {
    items: T[]
    total: number
    page: number
    page_size: number
    total_pages: number
  }

  /**
   * 列表查询参数
   */
  interface ListParams {
    page?: number
    page_size?: number
  }
}
