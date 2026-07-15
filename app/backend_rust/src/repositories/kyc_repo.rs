use chrono::Utc;
use sqlx::SqlitePool;

use crate::error::AppError;
use crate::models::kyc::AccountKyc;

pub struct KycRepo {
    db: SqlitePool,
}

impl KycRepo {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// 按 ID 查询 KYC 记录
    pub async fn find_by_id(&self, kyc_id: i64) -> Result<AccountKyc, AppError> {
        sqlx::query_as::<_, AccountKyc>(
            "SELECT id, address, network, status, submitted_at, reviewed_at, reviewer_address, reject_reason, external_kyc_id, country_code, is_accredited, full_name, date_of_birth, selfie_url, email, phone, address_line1, address_line2, city, state, postal_code, residence_country, liveness_verified, face_image_url, liveness_video_url, on_chain_sync_status, on_chain_tx_hash, on_chain_synced_at, on_chain_error, risk_level, risk_score, priority, review_progress, is_pep, is_sanctioned, source_ip, device_fingerprint, created_at, updated_at FROM account_kyc WHERE id = $1"
        )
        .bind(kyc_id)
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("KYC record not found: id={}", kyc_id)))
    }

    /// 审核通过 — 设置审核信息 + on_chain_sync_status = pending
    pub async fn approve_review(
        &self,
        kyc_id: i64,
        reviewer_address: &str,
        is_accredited: bool,
    ) -> Result<(), AppError> {
        let now = Utc::now();
        let now = now.naive_utc();
        let accredited: i64 = if is_accredited { 1 } else { 0 };
        sqlx::query!(
            "UPDATE account_kyc SET reviewed_at = $2, reviewer_address = $3, is_accredited = $4,
             on_chain_sync_status = 'pending', on_chain_tx_hash = NULL, on_chain_synced_at = NULL,
             on_chain_error = NULL, reject_reason = NULL, review_progress = NULL,
             updated_at = $5 WHERE id = $1 AND status = 'pending'",
            kyc_id,
            now,
            reviewer_address,
            accredited,
            now,
        )
        .execute(&self.db)
        .await?;
        Ok(())
    }

    /// 审核拒绝
    pub async fn reject_review(
        &self,
        kyc_id: i64,
        reviewer_address: &str,
        reject_reason: Option<&str>,
    ) -> Result<(), AppError> {
        let now = Utc::now();
        let now = now.naive_utc();
        sqlx::query!(
            "UPDATE account_kyc SET status = 'rejected', reviewed_at = $2, reviewer_address = $3,
             reject_reason = $4, is_accredited = 0, on_chain_sync_status = 'not_required',
             on_chain_tx_hash = NULL, on_chain_synced_at = NULL, on_chain_error = NULL,
             review_progress = NULL, updated_at = $5 WHERE id = $1 AND status = 'pending'",
            kyc_id,
            now,
            reviewer_address,
            reject_reason,
            now,
        )
        .execute(&self.db)
        .await?;
        Ok(())
    }

    /// 创建审计日志
    pub async fn create_audit_log(
        &self,
        kyc_id: i64,
        action: &str,
        actor_address: &str,
        actor_role: &str,
        details: Option<serde_json::Value>,
    ) -> Result<(), AppError> {
        sqlx::query!(
            "INSERT INTO audit_log (resource_type, resource_id, action, actor_address, actor_role, details, status, category)
             VALUES ('kyc', $1, $2, $3, $4, $5, 'success', 'kyc')",
            kyc_id,
            action,
            actor_address,
            actor_role,
            details,
        )
        .execute(&self.db)
        .await?;
        Ok(())
    }
}
