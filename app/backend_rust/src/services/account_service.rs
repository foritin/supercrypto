use serde_json::Value;
use sqlx::SqlitePool;

use crate::error::AppError;
use crate::schemas::common::Pagination;

pub struct AccountService;

impl AccountService {
    /// List accounts with pagination
    pub async fn list(
        db: &SqlitePool,
        page: i64,
        page_size: i64,
    ) -> Result<(Vec<Value>, Pagination), AppError> {
        let offset = (page - 1).max(0) * page_size;
        let total = sqlx::query_scalar!("SELECT COUNT(*) FROM account")
            .fetch_one(db).await.unwrap_or(0);

        let rows = sqlx::query!(
            "SELECT id, address, roles, network, is_active, is_blocked, is_deleted, balance, created_at, updated_at, last_login_dt FROM account ORDER BY created_at DESC LIMIT ? OFFSET ?",
            page_size, offset
        ).fetch_all(db).await?;

        let items: Vec<Value> = rows.into_iter().map(|r| {
            let roles: Value = serde_json::from_str(&r.roles).unwrap_or(Value::Array(vec![]));
            serde_json::json!({
                "id": r.id,
                "address": r.address,
                "roles": roles,
                "network": r.network,
                "is_active": r.is_active != 0,
                "is_blocked": r.is_blocked != 0,
                "is_deleted": r.is_deleted != 0,
                "balance": r.balance,
                "created_at": r.created_at,
                "updated_at": r.updated_at,
                "last_login_dt": r.last_login_dt,
            })
        }).collect();

        Ok((items, Pagination::new(total, page, page_size)))
    }

    /// Get account by id
    pub async fn get_by_id(db: &SqlitePool, id: i64) -> Result<Value, AppError> {
        let r = sqlx::query!(
            "SELECT id, address, roles, network, is_active, is_blocked, is_deleted, balance, created_at, updated_at, last_login_dt FROM account WHERE id = ?",
            id
        ).fetch_optional(db).await?
        .ok_or_else(|| AppError::NotFound(format!("account {} not found", id)))?;

        let roles: Value = serde_json::from_str(&r.roles).unwrap_or(Value::Array(vec![]));
        Ok(serde_json::json!({
            "id": r.id,
            "address": r.address,
            "roles": roles,
            "network": r.network,
            "is_active": r.is_active != 0,
            "is_blocked": r.is_blocked != 0,
            "is_deleted": r.is_deleted != 0,
            "balance": r.balance,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
            "last_login_dt": r.last_login_dt,
        }))
    }

    /// Create a new account
    pub async fn create(
        db: &SqlitePool,
        address: &str,
        private_key: &str,
        roles: &[String],
        network: &str,
    ) -> Result<Value, AppError> {
        let roles_json = serde_json::to_string(roles).unwrap_or_else(|_| "[]".into());
        let r = sqlx::query!(
            "INSERT INTO account (address, private_key, roles, network) VALUES (?, ?, ?, ?) RETURNING id, address, roles, network, created_at",
            address, private_key, roles_json, network
        ).fetch_one(db).await?;

        let roles: Value = serde_json::from_str(&r.roles).unwrap_or(Value::Array(vec![]));
        Ok(serde_json::json!({
            "id": r.id,
            "address": r.address,
            "roles": roles,
            "network": r.network,
            "created_at": r.created_at,
        }))
    }

    /// Update account roles by address
    pub async fn update_roles(
        db: &SqlitePool,
        address: &str,
        roles: &[String],
    ) -> Result<Value, AppError> {
        let roles_json = serde_json::to_string(roles).unwrap_or_else(|_| "[]".into());
        sqlx::query!(
            "UPDATE account SET roles = ?, updated_at = CURRENT_TIMESTAMP WHERE address = ?",
            roles_json, address
        ).execute(db).await?;

        // Fetch updated account
        let r = sqlx::query!(
            "SELECT id, address, roles, network, created_at, updated_at FROM account WHERE address = ?",
            address
        ).fetch_optional(db).await?
        .ok_or_else(|| AppError::NotFound(format!("account {} not found", address)))?;

        let roles: Value = serde_json::from_str(&r.roles).unwrap_or(Value::Array(vec![]));
        Ok(serde_json::json!({
            "id": r.id,
            "address": r.address,
            "roles": roles,
            "network": r.network,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
        }))
    }

    /// Soft-delete account by address
    pub async fn delete_by_address(db: &SqlitePool, address: &str) -> Result<(), AppError> {
        let result = sqlx::query!(
            "UPDATE account SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE address = ?",
            address
        ).execute(db).await?;
        if result.rows_affected() == 0 {
            return Err(AppError::NotFound(format!("account {} not found", address)));
        }
        Ok(())
    }

    /// List accounts by role
    pub async fn list_by_role(
        db: &SqlitePool,
        role: &str,
    ) -> Result<Vec<Value>, AppError> {
        let pattern = format!("%\"{}\"%", role);
        let rows = sqlx::query!(
            "SELECT id, address, roles, network, is_active, created_at FROM account WHERE roles LIKE ? AND is_deleted = 0",
            pattern
        ).fetch_all(db).await?;

        let items: Vec<Value> = rows.into_iter().map(|r| {
            let roles: Value = serde_json::from_str(&r.roles).unwrap_or(Value::Array(vec![]));
            serde_json::json!({
                "id": r.id,
                "address": r.address,
                "roles": roles,
                "network": r.network,
                "is_active": r.is_active != 0,
                "created_at": r.created_at,
            })
        }).collect();

        Ok(items)
    }

    /// Get available roles
    pub fn available_roles() -> Vec<Value> {
        vec![
            serde_json::json!({"name": "user", "label": "User"}),
            serde_json::json!({"name": "admin", "label": "Admin"}),
            serde_json::json!({"name": "superadmin", "label": "Super Admin"}),
        ]
    }
}
