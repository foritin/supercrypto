"""
管理员统计路由 - 平台统计、审计日志、KYC 审核

路由前缀: /api/v1/admin
子路径: /stats, /audit-logs, /kyc-review
"""

from typing import Optional

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.services.admin.kyc_service import AdminKycService, get_admin_kyc_service
from src.services.admin.schemas import AuditLogListQuery
from src.services.admin.service import AdminService, admin_service
from src.services.kyc.schemas import REJECT_REASON_LABELS
from src.shared.schemas.enums import AuditAction, KycStatus
from src.shared.security import require_admin

router = APIRouter()


def get_admin_service() -> AdminService:
    """依赖注入：获取管理员服务"""
    return admin_service


# ============ 用户管理 ============


@router.get("/users", summary="获取用户列表", description="获取用户列表")
async def get_users(
    _: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
):
    """
    获取用户列表
    """
    result = await service.get_users()
    return create_success_response(object_data=result.model_dump(mode="json"))


# ============ 平台统计 ============


@router.get(
    "/stats",
    summary="获取平台统计汇总",
    description="获取平台所有统计数据，包括 TVL、用户、质押等",
)
async def get_platform_stats(
    _: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
):
    """
    获取平台统计汇总

    需要管理员权限
    """
    result = await service.get_platform_stats()
    return create_success_response(object_data=result.model_dump(mode="json"))


@router.get(
    "/stats/tvl",
    summary="获取 TVL 统计",
    description="获取总锁仓价值统计，包括按资产分解",
)
async def get_tvl_stats(
    _: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
):
    """
    获取 TVL 统计

    - 总 TVL
    - 24h/7d 变化
    - 按资产分解
    """
    result = await service.get_tvl_stats()
    return create_success_response(object_data=result.model_dump(mode="json"))


@router.get(
    "/stats/users", summary="获取用户统计", description="获取用户数量和 KYC 统计"
)
async def get_user_stats(
    _: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
):
    """
    获取用户统计

    - 总用户数
    - KYC 各状态数量
    - 新增用户
    - KYC 转化率
    """
    result = await service.get_user_stats()
    return create_success_response(object_data=result.model_dump(mode="json"))


@router.get(
    "/stats/staking", summary="获取质押池统计", description="获取质押挖矿统计数据"
)
async def get_staking_stats(
    _: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
):
    """
    获取质押池统计

    - 总质押量
    - 活跃质押数
    - 奖励分发情况
    - 各周期分布
    """
    result = await service.get_staking_pool_stats()
    return create_success_response(object_data=result.model_dump(mode="json"))


# ============ 审计日志 ============


@router.get(
    "/audit-logs", summary="查询审计日志", description="查询管理员操作的审计日志"
)
async def list_audit_logs(
    action: Optional[AuditAction] = Query(None, description="操作类型"),
    operator_address: Optional[str] = Query(None, description="操作者地址"),
    target_type: Optional[str] = Query(None, description="目标类型"),
    success: Optional[bool] = Query(None, description="是否成功"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    _: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
):
    """
    查询审计日志

    - 支持按操作类型、操作者、目标、结果筛选
    - 支持分页
    """
    query = AuditLogListQuery(
        action=action,
        operator_address=operator_address,
        target_type=target_type,
        success=success,
        page=page,
        page_size=page_size,
    )

    items, total, total_pages = await service.list_audit_logs(query)

    return create_success_response(
        list_data=[item.model_dump(mode="json") for item in items],
        pagination={
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    )


@router.get(
    "/audit-logs/{log_id}",
    summary="获取审计日志详情",
    description="获取单条审计日志的详细信息",
)
async def get_audit_log(
    log_id: int,
    _: dict = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
):
    """
    获取审计日志详情

    - **log_id**: 日志 ID
    """
    result = await service.get_audit_log(log_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Audit log not found"
        )

    return create_success_response(object_data=result.model_dump(mode="json"))


# ============ KYC 审核 (Story 2.9) ============


def _kyc_to_dict(kyc) -> dict:
    """将 UserKyc 转换为字典"""
    return {
        "id": kyc.id,
        "wallet_address": kyc.wallet_address,
        "environment": kyc.environment,
        "status": kyc.status.value,
        "submitted_at": kyc.submitted_at.isoformat() if kyc.submitted_at else None,
        "reviewed_at": kyc.reviewed_at.isoformat() if kyc.reviewed_at else None,
        "reviewer_address": kyc.reviewer_address,
        "reject_reason": kyc.reject_reason,
        "country_code": kyc.country_code,
        "is_accredited": kyc.is_accredited,
        # Story 2.7 新增字段
        "id_type": kyc.id_type.value if kyc.id_type else None,
        "id_number_last4": kyc.id_number_last4,
        "full_name": kyc.full_name,
        "date_of_birth": kyc.date_of_birth.isoformat() if kyc.date_of_birth else None,
        "has_id_front": bool(kyc.id_front_url),
        "has_id_back": bool(kyc.id_back_url),
        "has_selfie": bool(kyc.selfie_url),
        # Story 2.8 新增字段
        "on_chain_sync_status": kyc.on_chain_sync_status.value
        if kyc.on_chain_sync_status
        else None,
        "on_chain_tx_hash": kyc.on_chain_tx_hash,
        "on_chain_error": kyc.on_chain_error,
        # 时间戳
        "created_at": kyc.created_at.isoformat() if kyc.created_at else None,
        "updated_at": kyc.updated_at.isoformat() if kyc.updated_at else None,
    }


@router.get(
    "/kyc/stats",
    summary="获取 KYC 统计",
    description="获取 KYC 各状态数量统计",
)
async def get_kyc_stats(
    _: dict = Depends(require_admin),
    kyc_service: AdminKycService = Depends(get_admin_kyc_service),
):
    """
    获取 KYC 统计

    - pending: 待审核数量
    - approved: 已通过数量
    - rejected: 已拒绝数量
    - failed_sync: 同步失败数量
    """
    result = await kyc_service.get_stats()
    return create_success_response(object_data=result)


@router.get(
    "/kyc/pending",
    summary="获取待审核 KYC 列表",
    description="获取待审核的 KYC 申请列表",
)
async def list_pending_kyc(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    _: dict = Depends(require_admin),
    kyc_service: AdminKycService = Depends(get_admin_kyc_service),
):
    """
    获取待审核 KYC 列表

    返回所有状态为 pending 的 KYC 申请
    """
    items, total, total_pages = await kyc_service.list_pending(page, page_size)

    return create_success_response(
        list_data=[_kyc_to_dict(kyc) for kyc in items],
        pagination={
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    )


@router.get(
    "/kyc/list",
    summary="获取 KYC 列表",
    description="获取 KYC 列表，支持按状态筛选",
)
async def list_kyc(
    kyc_status: Optional[KycStatus] = Query(
        None, alias="status", description="KYC 状态筛选"
    ),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    _: dict = Depends(require_admin),
    kyc_service: AdminKycService = Depends(get_admin_kyc_service),
):
    """
    获取 KYC 列表

    - **status**: 按状态筛选 (pending/approved/rejected)
    - **page**: 页码
    - **page_size**: 每页数量
    """
    items, total, total_pages = await kyc_service.list_by_status(
        kyc_status, page, page_size
    )

    return create_success_response(
        list_data=[_kyc_to_dict(kyc) for kyc in items],
        pagination={
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    )


@router.get(
    "/kyc/failed-sync",
    summary="获取同步失败的 KYC 列表",
    description="获取链上同步失败的 KYC 列表",
)
async def list_failed_sync_kyc(
    _: dict = Depends(require_admin),
    kyc_service: AdminKycService = Depends(get_admin_kyc_service),
):
    """
    获取同步失败的 KYC 列表

    返回所有 on_chain_sync_status = FAILED 的 KYC
    """
    items = await kyc_service.list_failed_sync()
    return create_success_response(list_data=[_kyc_to_dict(kyc) for kyc in items])


@router.get(
    "/kyc/reject-reasons",
    summary="获取拒绝原因预设列表",
    description="获取所有预设的拒绝原因代码和文本",
)
async def get_reject_reasons(_: dict = Depends(require_admin)):
    """
    获取拒绝原因预设列表

    用于前端显示拒绝原因下拉选项
    """
    reasons = [
        {"code": code.value, "label": label}
        for code, label in REJECT_REASON_LABELS.items()
    ]
    return create_success_response(list_data=reasons)


@router.get(
    "/kyc/{kyc_id}",
    summary="获取 KYC 详情",
    description="获取 KYC 详情，包含证件预签名 URL",
)
async def get_kyc_detail(
    kyc_id: int,
    _: dict = Depends(require_admin),
    kyc_service: AdminKycService = Depends(get_admin_kyc_service),
):
    """
    获取 KYC 详情

    - **kyc_id**: KYC ID

    返回 KYC 信息和证件照片预签名 URL
    """
    result = await kyc_service.get_detail_with_documents(kyc_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="KYC record not found"
        )

    return create_success_response(
        object_data={
            "kyc": _kyc_to_dict(result["kyc"]),
            "documents": result["documents"],
        }
    )


@router.get(
    "/kyc/{kyc_id}/contract-comparison",
    summary="获取 KYC 数据库与合约状态对比",
    description="对比数据库状态和链上状态",
)
async def get_kyc_contract_comparison(
    kyc_id: int,
    _: dict = Depends(require_admin),
    kyc_service: AdminKycService = Depends(get_admin_kyc_service),
):
    """
    获取 KYC 数据库与合约状态对比

    - **kyc_id**: KYC ID

    用于排查同步问题
    """
    result = await kyc_service.get_contract_comparison(kyc_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="KYC record not found"
        )

    return create_success_response(object_data=result)

