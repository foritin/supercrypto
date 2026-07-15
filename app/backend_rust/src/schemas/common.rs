// schemas/common.rs
use serde::Serialize;

/// 统一成功响应
#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub code: i64,
    pub message: String,
    pub data: T,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            code: 200,
            message: "success".to_string(),
            data,
        }
    }
}

/// 分页数据包装
#[derive(Debug, Serialize)]
pub struct DataWrapper<T: Serialize> {
    #[serde(rename = "object_data", skip_serializing_if = "Option::is_none")]
    pub object: Option<T>,
    #[serde(rename = "list_data", skip_serializing_if = "Option::is_none")]
    pub list: Option<Vec<T>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pagination: Option<Pagination>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}

impl<T: Serialize> DataWrapper<T> {
   pub fn object(data: T) -> Self {
       Self {
           object: Some(data),
           list: None,
           pagination: None,
            msg: Some("success".to_string()),
       }
   }

   pub fn list(data: Vec<T>, pagination: Pagination) -> Self {
       Self {
           object: None,
           list: Some(data),
           pagination: Some(pagination),
            msg: Some("success".to_string()),
       }
   }

    pub fn msg(text: impl Into<String>) -> Self {
        Self {
            object: None,
            list: None,
            pagination: None,
            msg: Some(text.into()),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct Pagination {
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

impl Pagination {
    pub fn new(total: i64, page: i64, page_size: i64) -> Self {
        let total_pages = if total == 0 {
            0
        } else {
            (total + page_size - 1) / page_size
        };
        Self {
            total,
            page,
            page_size,
            total_pages,
        }
    }
}
