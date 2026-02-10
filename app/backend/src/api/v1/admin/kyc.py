"""
管理员 KYC 路由 - KYC 审核、列表、同步

路由前缀: /api/v1/admin/kyc
"""

import datetime as dt
from typing import Literal, Optional

from falib.utils.handlers import (
    PaginationInfo,
    create_error_response,
    create_success_response,
)
from falib.utils.log import get_logger
from fastapi import APIRouter, Depends, Query

from src.services.admin.kyc_schemas import BatchReviewRequest, KycListQuery
from src.services.admin.kyc_service import AdminKycService
from src.services.kyc.schemas import (
    KycReviewRequest,
    RecordAdmissionRequest,
    RecordRevocationRequest,
    ReviewProgressRequest,
)
from src.services.kyc.service import KycService
from src.shared.common.exceptions import BusinessException
from src.shared.middleware.rate_limit import (
    require_batch_rate_limit,
    require_chain_rate_limit,
)
from src.shared.schemas.enums import KycStatus, ReviewPriority, RiskLevel
from src.shared.security import require_admin

logger = get_logger("kyc.api")

router = APIRouter()


def get_kyc_service() -> KycService:
    """依赖注入：获取 KYC 服务"""
    return KycService()


def get_admin_kyc_service() -> AdminKycService:
    """依赖注入：获取 Admin KYC 服务"""
    return AdminKycService()


@router.get(
    "/stats",
    summary="Get KYC Statistics",
    description="Get comprehensive KYC statistics including processing times and trends (admin only)",
)
async def get_kyc_stats(
    admin_service: AdminKycService = Depends(get_admin_kyc_service),
):
    """
    获取 KYC 扩展统计 (管理员用)

    返回完整的 KYC 统计数据，包括：
    - 基础计数 (pending, approved, rejected, failed_sync, total)
    - 处理时间统计 (avg_processing_time_minutes, median_processing_time_minutes)
    - 转化率 (approval_rate, resubmit_rate)
    - 风险分布 (risk_distribution)
    - 每日统计 (daily_stats - 最近7天)
    - 审核者统计 (reviewer_stats)

    - 需要管理员权限

    Requirements Reference: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
    """
    stats = await admin_service.get_stats()
    return create_success_response(object_data=stats.model_dump(mode="json"))


@router.post(
    "/batch-review",
    summary="Batch Review KYC",
    description="Approve or reject multiple KYC applications at once (admin only)",
)
async def batch_review_kyc(
    request: BatchReviewRequest,
    _rate: None = Depends(require_batch_rate_limit),
    admin_address: str = Depends(require_admin),
    admin_service: AdminKycService = Depends(get_admin_kyc_service),
):
    """
    批量审核 KYC 申请 (管理员用)

    处理多个 KYC 记录的审核操作，支持批量通过或拒绝。
    采用"尽力而为"策略：遇到单条记录错误时继续处理其他记录。

    - 需要管理员权限
    - **kyc_ids**: KYC ID 列表 (必填)
    - **action**: 审核操作 (approve/reject)
    - **reject_reason_code**: 拒绝原因代码 (拒绝时必填)
    - **reject_reason**: 拒绝原因详情 (可选)
    - **is_accredited**: 是否为合格投资者 (仅 approve 时有效)

    返回 BatchReviewResponse，包含：
    - total: 总处理数量
    - success: 成功数量
    - failed: 失败数量
    - results: 各条记录处理结果

    Requirements Reference: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
    """
    result = await admin_service.batch_review(request, admin_address)
    return create_success_response(object_data=result.model_dump(mode="json"))


@router.get(
    "/reject-reasons",
    summary="Get Reject Reasons",
    description="Get predefined reject reason codes and labels (admin only)",
)
async def get_reject_reasons():
    """
    获取拒绝原因预设列表

    用于前端显示拒绝原因下拉选项。
    返回所有预设的拒绝原因代码和多语言标签。

    - 需要管理员权限
    - 支持国际化 (zh/en)
    """
    from src.shared.constants import get_registry

    registry = get_registry()
    items = registry.get_group("kyc_reject_reason")

    if not items:
        return create_success_response(list_data=[])

    reasons = [{"code": item.value, "labels": item.labels} for item in items]
    return create_success_response(list_data=reasons)


@router.get(
    "/contract-info",
    summary="Get KYCManager Contract Info",
    description="Get KYCManager contract address and deployer address for the current network (admin only)",
)
async def get_contract_info(
    service: KycService = Depends(get_kyc_service),
):
    """
    获取 KYCManager 合约部署信息

    从 ContractDeployment 表查询当前网络的 KYCManager 合约地址和部署者地址，
    用于前端验证管理员钱包是否为合约部署者。

    - 需要管理员权限

    Requirements Reference: 6.1
    """
    try:
        info = await service.get_contract_info()
        return create_success_response(object_data=info)
    except BusinessException as e:
        return create_error_response(code=e.code, msg=e.message)


@router.get(
    "/{kyc_id}/audit-logs",
    summary="Get KYC Audit Logs",
    description="Get audit logs for a specific KYC record (admin only)",
)
async def get_kyc_audit_logs(
    kyc_id: int, admin_service: AdminKycService = Depends(get_admin_kyc_service)
):
    """
    获取 KYC 审核日志 (管理员用)

    返回指定 KYC 的所有审核日志记录，按 created_at 降序排序 (最新的在前)。
    每条日志包含 action, actor_address, actor_role, details, created_at 字段。

    - 需要管理员权限
    - **kyc_id**: KYC ID

    Requirements Reference: 7.1, 7.2, 7.3
    """
    try:
        logs = await admin_service.get_audit_logs(kyc_id)
        return create_success_response(
            list_data=[log.model_dump(mode="json") for log in logs]
        )
    except ValueError as e:
        return create_error_response(code=404, msg=str(e))


@router.get(
    "/{kyc_id}",
    summary="Get KYC Detail",
    description="Get detailed KYC record by ID including documents and audit logs (admin only)",
)
async def get_kyc_by_id(
    kyc_id: int, admin_service: AdminKycService = Depends(get_admin_kyc_service)
):
    """
    获取 KYC 详情 (管理员用)

    返回完整的 KYC 详情，包括：
    - KYC 基本信息及扩展字段 (风险等级、优先级等)
    - 文档预签名 URL (id_front, id_back, selfie)
    - 审核日志列表
    - 预留字段 (ocr_data, facial_comparison)

    - 需要管理员权限
    - **kyc_id**: KYC ID

    Requirements Reference: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
    """
    result = await admin_service.get_detail(kyc_id)
    if not result:
        return create_error_response(code=404, msg="KYC record not found")
    return create_success_response(object_data=result.model_dump(mode="json"))


@router.get(
    "/",
    summary="List KYC Records",
    description="List KYC records with advanced filtering, sorting and pagination (admin only)",
)
async def list_kyc(
    status: Optional[KycStatus] = Query(None, description="KYC 状态筛选"),
    risk_level: Optional[RiskLevel] = Query(None, description="风险等级筛选"),
    priority: Optional[ReviewPriority] = Query(None, description="优先级筛选"),
    country_code: Optional[str] = Query(None, description="国家代码筛选"),
    date_from: Optional[dt.datetime] = Query(None, description="开始日期"),
    date_to: Optional[dt.datetime] = Query(None, description="结束日期"),
    search_query: Optional[str] = Query(
        None, description="搜索关键词 (钱包地址或姓名)"
    ),
    sort_by: Optional[Literal["submitted_at", "risk_score", "priority"]] = Query(
        "submitted_at", description="排序字段"
    ),
    sort_order: Optional[Literal["asc", "desc"]] = Query(
        "desc", description="排序方向"
    ),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    admin_service: AdminKycService = Depends(get_admin_kyc_service),
):
    """
    获取 KYC 列表 (管理员用) - 支持高级筛选和排序

    - 需要管理员权限
    - **status**: 按状态筛选 (not_started/pending/approved/rejected)
    - **risk_level**: 按风险等级筛选 (low/medium/high/critical)
    - **priority**: 按优先级筛选 (low/normal/high/urgent)
    - **country_code**: 按国家代码筛选
    - **date_from**: 开始日期 (提交时间)
    - **date_to**: 结束日期 (提交时间)
    - **search_query**: 搜索钱包地址或姓名
    - **sort_by**: 排序字段 (submitted_at/risk_score/priority)
    - **sort_order**: 排序方向 (asc/desc)
    - **page**: 页码
    - **page_size**: 每页数量

    Requirements Reference: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
    """
    # 构建查询参数对象
    query_params = KycListQuery(
        status=status,
        risk_level=risk_level,
        priority=priority,
        country_code=country_code,
        date_from=date_from,
        date_to=date_to,
        search_query=search_query,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )

    # 调用 AdminKycService.list_kyc()
    items, total, total_pages = await admin_service.list_kyc(query_params)

    return create_success_response(
        list_data=[item.model_dump(mode="json") for item in items],
        pagination=PaginationInfo(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


@router.put(
    "/{kyc_id}/review-progress",
    summary="Update Review Progress",
    description="Save review step progress for a KYC record (admin only)",
)
async def update_review_progress(
    kyc_id: int,
    data: ReviewProgressRequest,
    admin_address: str = Depends(require_admin),
    service: KycService = Depends(get_kyc_service),
):
    """
    更新审核步骤进度 (Stepper Modal)

    将审核员的当前步骤和确认状态保存到数据库，
    确保审核员关闭浏览器后重新打开仍能恢复进度。

    - 需要管理员权限
    - **kyc_id**: KYC ID
    - **current_step**: 当前步骤索引 (0-3)
    - **confirmed_steps**: 各步骤确认状态 (长度为4的布尔数组)

    Requirements Reference: 8.2, 8.3
    """
    try:
        await service.update_review_progress(
            kyc_id=kyc_id,
            current_step=data.current_step,
            confirmed_steps=data.confirmed_steps,
            reviewer_address=admin_address,
        )
        return create_success_response(msg="Review progress updated successfully")
    except BusinessException as e:
        return create_error_response(code=e.code, msg=e.message)


@router.post(
    "/{kyc_id}/review",
    summary="Review KYC",
    description="Approve or reject a KYC application (admin only)",
)
async def review_kyc(
    kyc_id: int,
    data: KycReviewRequest,
    admin_address: str = Depends(require_admin),
    service: KycService = Depends(get_kyc_service),
):
    """
    审核 KYC 申请 (管理员用)

    - 需要管理员权限
    - **kyc_id**: KYC ID
    - **approved**: 是否通过
    - **reject_reason**: 拒绝原因 (拒绝时必填)
    - **is_accredited**: 是否为合格投资者

    Updates the KYC status and optionally updates on-chain KYC status.
    """
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

    # 使用管理员地址作为 reviewer 标识
    result = await service.review(kyc_id, data, reviewer_address=admin_address)

    action = "approved" if data.approved else "rejected"

    # 记录详细的审计日志
    audit_action = AuditAction.KYC_APPROVE if data.approved else AuditAction.KYC_REJECT
    await audit_service.log_async(
        category=AuditCategory.KYC,
        action=audit_action,
        operator_address=admin_address,
        operator_type="admin",
        target_type="kyc",
        target_id=kyc_id,
        target_address=result.wallet_address,
        status=AuditStatus.SUCCESS,
        description=f"KYC #{kyc_id} {action}",
        reason=data.reject_reason if not data.approved else None,
        new_value={
            "status": result.status.value,
            "is_accredited": result.is_accredited,
            "on_chain_sync_status": result.on_chain_sync_status.value
            if result.on_chain_sync_status
            else None,
        },
    )

    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg=f"KYC application {action} successfully",
    )


@router.post(
    "/{kyc_id}/record-admission",
    summary="Record On-Chain Admission",
    description="Record successful on-chain KYC admission transaction (admin only)",
)
async def record_admission(
    kyc_id: int,
    data: RecordAdmissionRequest,
    _rate: None = Depends(require_chain_rate_limit),
    admin_address: str = Depends(require_admin),
    service: KycService = Depends(get_kyc_service),
):
    """
    记录链上准入结果

    管理员通过浏览器钱包发起 addInvestor() 交易成功后，
    前端调用此端点记录交易哈希并更新链上同步状态为 SYNCED。

    - 需要管理员权限
    - **kyc_id**: KYC ID
    - **tx_hash**: 链上交易哈希

    Requirements Reference: 2.7, 6.2
    """
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

    try:
        result = await service.record_admission(
            kyc_id=kyc_id,
            tx_hash=data.tx_hash,
            admin_address=admin_address,
        )

        # 记录审计日志
        await audit_service.log_async(
            category=AuditCategory.KYC,
            action=AuditAction.KYC_ADMIT,
            operator_address=admin_address,
            operator_type="admin",
            target_type="kyc",
            target_id=kyc_id,
            target_address=result.wallet_address,
            status=AuditStatus.SUCCESS,
            description=f"KYC #{kyc_id} admitted on-chain",
            new_value={
                "on_chain_sync_status": "synced",
                "tx_hash": data.tx_hash,
            },
        )

        return create_success_response(
            object_data=result.model_dump(mode="json"),
            msg="On-chain admission recorded successfully",
        )
    except BusinessException as e:
        return create_error_response(code=e.code, msg=e.message)


@router.post(
    "/{kyc_id}/record-revocation",
    summary="Record On-Chain Revocation",
    description="Record successful on-chain KYC revocation transaction (admin only)",
)
async def record_revocation(
    kyc_id: int,
    data: RecordRevocationRequest,
    _rate: None = Depends(require_chain_rate_limit),
    admin_address: str = Depends(require_admin),
    service: KycService = Depends(get_kyc_service),
):
    """
    记录链上解除准入结果

    管理员通过浏览器钱包发起 removeInvestor() 交易成功后，
    前端调用此端点记录交易哈希并更新链上同步状态为 PENDING。

    - 需要管理员权限
    - **kyc_id**: KYC ID
    - **tx_hash**: 链上交易哈希
    - **reason**: 解除准入原因

    Requirements Reference: 4.5, 6.3
    """
    from src.services.audit.service import audit_service
    from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus

    try:
        result = await service.record_revocation(
            kyc_id=kyc_id,
            tx_hash=data.tx_hash,
            admin_address=admin_address,
            reason=data.reason,
        )

        # 记录审计日志
        await audit_service.log_async(
            category=AuditCategory.KYC,
            action=AuditAction.KYC_REVOKE,
            operator_address=admin_address,
            operator_type="admin",
            target_type="kyc",
            target_id=kyc_id,
            target_address=result.wallet_address,
            status=AuditStatus.SUCCESS,
            description=f"KYC #{kyc_id} revoked on-chain",
            reason=data.reason,
            new_value={
                "on_chain_sync_status": "pending",
                "tx_hash": data.tx_hash,
                "reason": data.reason,
            },
        )

        return create_success_response(
            object_data=result.model_dump(mode="json"),
            msg="On-chain revocation recorded successfully",
        )
    except BusinessException as e:
        return create_error_response(code=e.code, msg=e.message)


@router.get(
    "/contract-status/{wallet_address}",
    summary="Get Contract KYC Status",
    description="Compare database and on-chain KYC status (admin only)",
)
async def get_contract_kyc_status(
    wallet_address: str,
    service: KycService = Depends(get_kyc_service),
):
    """
    获取合约 KYC 状态对比 (Story 2.8)

    - 需要管理员权限
    - **wallet_address**: 钱包地址

    返回数据库状态和合约状态的对比，帮助管理员排查同步问题。
    """
    result = await service.get_contract_comparison(wallet_address)

    if not result:
        return create_error_response(code=404, msg="KYC record not found in database")

    return create_success_response(object_data=result.model_dump(mode="json"))
