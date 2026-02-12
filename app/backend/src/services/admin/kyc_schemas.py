"""
KYC Admin Schemas

KYC 管理后端增强功能的 Pydantic Schema 定义
包含列表、详情、统计、批量审核等响应和请求模型
"""

import datetime as dt
from typing import Any, Dict, List, Literal, Optional

from pydantic import ConfigDict, BaseModel, Field

from src.shared.schemas.enums import (
    KycAuditAction,
    KycStatus,
    OnChainSyncStatus,
    ReviewPriority,
    RiskLevel,
)

# ============ 审核日志 ============


class KycAuditLogEntry(BaseModel):
    """KYC 审核日志条目"""

    id: int = Field(..., description="日志 ID")
    kyc_id: int = Field(..., description="关联的 KYC ID")
    action: KycAuditAction = Field(..., description="操作类型")
    actor_address: str = Field(..., description="操作者地址")
    actor_role: str = Field(..., description="操作者角色 (user/admin/system)")
    details: Optional[Dict[str, Any]] = Field(None, description="操作详情")
    created_at: dt.datetime = Field(..., description="创建时间")

    model_config = ConfigDict(from_attributes=True)


# ============ 列表响应 ============


class KycListItem(BaseModel):
    """KYC 列表项"""

    id: int = Field(..., description="KYC ID")
    wallet_address: str = Field(..., description="钱包地址")
    environment: str = Field(..., description="环境 (local/test/main)")
    status: KycStatus = Field(..., description="KYC 状态")
    submitted_at: Optional[dt.datetime] = Field(None, description="提交时间")
    reviewed_at: Optional[dt.datetime] = Field(None, description="审核时间")
    reviewer_address: Optional[str] = Field(None, description="审核者地址")
    reject_reason: Optional[str] = Field(None, description="拒绝原因")
    country_code: Optional[str] = Field(None, description="国家代码")
    is_accredited: bool = Field(False, description="是否为合格投资者")
    full_name: Optional[str] = Field(None, description="全名")
    date_of_birth: Optional[dt.date] = Field(None, description="出生日期")

    # 文档状态
    has_id_front: bool = Field(False, description="是否有身份证正面")
    has_id_back: bool = Field(False, description="是否有身份证背面")
    has_selfie: bool = Field(False, description="是否有自拍照")

    # 链上同步状态
    on_chain_sync_status: Optional[OnChainSyncStatus] = Field(
        None, description="链上同步状态"
    )
    on_chain_tx_hash: Optional[str] = Field(None, description="链上交易哈希")
    on_chain_error: Optional[str] = Field(None, description="链上同步错误信息")

    # 扩展字段 - 风险评估
    risk_level: RiskLevel = Field(RiskLevel.LOW, description="风险等级")
    risk_score: int = Field(0, ge=0, le=100, description="风险评分 (0-100)")
    priority: ReviewPriority = Field(ReviewPriority.NORMAL, description="审核优先级")
    processing_time_minutes: Optional[float] = Field(
        None, description="处理耗时 (分钟)"
    )
    is_pep: bool = Field(False, description="是否为政治敏感人物")
    is_sanctioned: bool = Field(False, description="是否在制裁名单")

    # 时间戳
    created_at: Optional[dt.datetime] = Field(None, description="创建时间")
    updated_at: Optional[dt.datetime] = Field(None, description="更新时间")

    model_config = ConfigDict(from_attributes=True)


# ============ 详情响应 ============


class KycDetail(BaseModel):
    """KYC 详情响应"""

    kyc: KycListItem = Field(..., description="KYC 基本信息")
    documents: Dict[str, Optional[str]] = Field(
        default_factory=dict,
        description="文档预签名 URL (id_front, id_back, selfie, face_image, liveness_video)",
    )
    audit_logs: List[KycAuditLogEntry] = Field(
        default_factory=list, description="审核日志列表"
    )
    ocr_data: Optional[Dict[str, Any]] = Field(None, description="OCR 识别数据 (预留)")
    facial_comparison: Optional[Dict[str, Any]] = Field(
        None, description="人脸比对数据 (预留)"
    )
    review_progress: Optional[Dict[str, Any]] = Field(
        None, description="审核步骤进度 (Stepper Modal)"
    )


# ============ 统计响应 ============


class DailyStats(BaseModel):
    """每日统计"""

    date: dt.date = Field(..., description="日期")
    submitted: int = Field(0, description="提交数量")
    approved: int = Field(0, description="通过数量")
    rejected: int = Field(0, description="拒绝数量")


class ReviewerStats(BaseModel):
    """审核者统计"""

    reviewer_address: str = Field(..., description="审核者地址")
    reviewed_count: int = Field(0, description="审核数量")
    approval_rate: float = Field(0, ge=0, le=100, description="通过率 (0-100)")


class KycStats(BaseModel):
    """KYC 统计响应"""

    # 基础计数
    pending: int = Field(0, description="待审核数量")
    approved: int = Field(0, description="已通过数量")
    rejected: int = Field(0, description="已拒绝数量")
    failed_sync: int = Field(0, description="同步失败数量")
    revoked: int = Field(0, description="链上准入已解除数量")
    total: int = Field(0, description="总数量")

    # 时间统计
    avg_processing_time_minutes: float = Field(0, description="平均处理时间 (分钟)")
    median_processing_time_minutes: float = Field(
        0, description="中位数处理时间 (分钟)"
    )

    # 转化率
    approval_rate: float = Field(0, ge=0, le=100, description="通过率 (0-100)")
    resubmit_rate: float = Field(0, ge=0, le=100, description="重新提交率 (0-100)")

    # 风险分布
    risk_distribution: Dict[str, int] = Field(
        default_factory=dict, description="风险等级分布 (risk_level -> count)"
    )

    # 详细统计
    daily_stats: List[DailyStats] = Field(
        default_factory=list, description="每日统计 (最近7天)"
    )
    reviewer_stats: List[ReviewerStats] = Field(
        default_factory=list, description="审核者统计"
    )


# ============ 批量审核 ============


class BatchReviewRequest(BaseModel):
    """批量审核请求"""

    kyc_ids: List[int] = Field(..., min_length=1, description="KYC ID 列表")
    action: Literal["approve", "reject"] = Field(..., description="审核操作")
    reject_reason_code: Optional[str] = Field(None, description="拒绝原因代码")
    reject_reason: Optional[str] = Field(None, description="拒绝原因详情")
    is_accredited: bool = Field(
        False, description="是否为合格投资者 (仅 approve 时有效)"
    )


class BatchReviewResult(BaseModel):
    """批量审核单条结果"""

    kyc_id: int = Field(..., description="KYC ID")
    success: bool = Field(..., description="是否成功")
    error: Optional[str] = Field(None, description="错误信息")


class BatchReviewResponse(BaseModel):
    """批量审核响应"""

    total: int = Field(..., description="总处理数量")
    success: int = Field(..., description="成功数量")
    failed: int = Field(..., description="失败数量")
    results: List[BatchReviewResult] = Field(
        default_factory=list, description="各条记录处理结果"
    )


# ============ 查询参数 ============


class KycListQuery(BaseModel):
    """KYC 列表查询参数"""

    # 筛选条件
    status: Optional[KycStatus] = Field(None, description="KYC 状态筛选")
    risk_level: Optional[RiskLevel] = Field(None, description="风险等级筛选")
    priority: Optional[ReviewPriority] = Field(None, description="优先级筛选")
    country_code: Optional[str] = Field(None, description="国家代码筛选")
    date_from: Optional[dt.datetime] = Field(None, description="开始日期")
    date_to: Optional[dt.datetime] = Field(None, description="结束日期")
    search_query: Optional[str] = Field(None, description="搜索关键词 (钱包地址或姓名)")

    # 排序
    sort_by: Optional[Literal["submitted_at", "risk_score", "priority"]] = Field(
        "submitted_at", description="排序字段"
    )
    sort_order: Optional[Literal["asc", "desc"]] = Field("desc", description="排序方向")

    # 分页
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")
