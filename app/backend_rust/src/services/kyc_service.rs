use serde_json::json;
use sqlx::SqlitePool;
use tracing::info;

use crate::error::AppError;
use crate::repositories::kyc_repo::KycRepo;
use crate::schemas::kyc::{
    BatchReviewRequest, BatchReviewResponse, BatchReviewResult, KycReviewRequest,
};

pub struct KycService {
    repo: KycRepo,
}

impl KycService {
    pub fn new(db: SqlitePool) -> Self {
        Self {
            repo: KycRepo::new(db),
        }
    }

    /// 审核 KYC 申请 (管理员用) — "一键审核"核心逻辑
    ///
    /// 对应 Python KycService.review()
    /// 审核通过后保持 status=PENDING，仅设置 on_chain_sync_status=PENDING，
    /// 等待管理员通过浏览器钱包手动发起链上准入交易。
    /// 仅在 record_admission 链上确认成功后，才将 status 置为 APPROVED 并入库存档。
    pub async fn review(
        &self,
        kyc_id: i64,
        data: &KycReviewRequest,
        reviewer_address: &str,
    ) -> Result<serde_json::Value, AppError> {
        let kyc = self.repo.find_by_id(kyc_id).await?;

        // 只允许审核 PENDING 状态的记录
        if kyc.status != "pending" {
            return Err(AppError::BadRequest(format!(
                "Cannot review KYC in status: {} (only 'pending' allowed)",
                kyc.status
            )));
        }

        let (audit_action, audit_details) = if data.approved {
            // 审核通过：保持 PENDING，标记等待链上确认
            self.repo
                .approve_review(kyc_id, reviewer_address, data.is_accredited)
                .await?;

            let mut details = json!({
                "approved": true,
                "is_accredited": data.is_accredited,
            });
            if let Some(ref steps) = data.review_steps {
                details["review_steps"] = serde_json::to_value(steps).unwrap_or(json!(null));
            }
            ("approve", details)
        } else {
            // 审核拒绝
            self.repo
                .reject_review(kyc_id, reviewer_address, data.reject_reason.as_deref())
                .await?;

            let mut details = json!({
                "approved": false,
                "reject_reason": data.reject_reason,
                "reject_reason_code": data.reject_reason_code,
            });
            if let Some(ref steps) = data.review_steps {
                details["review_steps"] = serde_json::to_value(steps).unwrap_or(json!(null));
            }
            ("reject", details)
        };

        // 创建审计日志
        self.repo
            .create_audit_log(
                kyc_id,
                audit_action,
                reviewer_address,
                "admin",
                Some(audit_details),
            )
            .await?;

        info!(
            "KYC review completed: kyc_id={}, action={}, reviewer={:.10}...",
            kyc_id, audit_action, reviewer_address
        );

        // 返回更新后的记录
        let updated = self.repo.find_by_id(kyc_id).await?;
        Ok(serde_json::to_value(updated).unwrap_or(json!({})))
    }

    /// 批量审核 KYC 申请
    ///
    /// 对应 Python KycService.batch_review()
    /// 采用"尽力而为"策略：遇到单条记录错误时继续处理其他记录。
    pub async fn batch_review(
        &self,
        request: &BatchReviewRequest,
        reviewer_address: &str,
    ) -> Result<BatchReviewResponse, AppError> {
        let mut results: Vec<BatchReviewResult> = Vec::new();
        let mut success_count = 0usize;
        let mut failed_count = 0usize;

        // 拒绝时必须提供原因
        if request.action == "reject" && request.reject_reason_code.is_none() {
            for &kyc_id in &request.kyc_ids {
                results.push(BatchReviewResult {
                    kyc_id,
                    success: false,
                    error: Some("reject_reason_code is required when rejecting".to_string()),
                });
            }
            return Ok(BatchReviewResponse {
                total: request.kyc_ids.len(),
                success: 0,
                failed: request.kyc_ids.len(),
                results,
            });
        }

        for &kyc_id in &request.kyc_ids {
            match self
                .review(
                    kyc_id,
                    &KycReviewRequest {
                        approved: request.action == "approve",
                        is_accredited: request.is_accredited,
                        reject_reason: request.reject_reason.clone(),
                        reject_reason_code: request.reject_reason_code.clone(),
                        review_steps: None,
                    },
                    reviewer_address,
                )
                .await
            {
                Ok(_) => {
                    results.push(BatchReviewResult {
                        kyc_id,
                        success: true,
                        error: None,
                    });
                    success_count += 1;
                }
                Err(e) => {
                    results.push(BatchReviewResult {
                        kyc_id,
                        success: false,
                        error: Some(e.to_string()),
                    });
                    failed_count += 1;
                }
            }
        }

        info!(
            "Batch review completed: total={}, success={}, failed={}, action={}",
            request.kyc_ids.len(),
            success_count,
            failed_count,
            request.action
        );

        Ok(BatchReviewResponse {
            total: request.kyc_ids.len(),
            success: success_count,
            failed: failed_count,
            results,
        })
    }
}
