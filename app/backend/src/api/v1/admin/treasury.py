"""
Admin Treasury 路由 - 国库多签管理

路由前缀: /api/v1/admin/treasury
权限: require_admin (主路由注入) + 关键操作 require_contract_owner

功能:
- 赎回队列管理
- 多签提案签名
- 国库状态查询
"""

from typing import Optional

from falib.utils.handlers import PaginationInfo, create_success_response
from fastapi import APIRouter, Depends, Query

from src.common.dependencies import get_treasury_service
from src.schemas.enums.redemption import RedemptionStatus
from src.schemas.redemption import (
    RedemptionRejectRequest,
    TreasuryExecuteRequest,
    TreasurySignRequest,
)
from src.security import require_contract_owner, require_multisig_signer
from src.services import TreasuryService

router = APIRouter(tags=["admin-treasury"])


@router.get(
    "/queue",
    summary="Get Redemption Queue",
    description="Get redemption queue for admin review with pagination",
)
async def get_redemption_queue(
    status: Optional[RedemptionStatus] = Query(None, description="状态筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=100, description="每页数量"),
    service: TreasuryService = Depends(get_treasury_service),
):
    """
    获取赎回队列 (Admin)

    - **status**: 按状态筛选 (pending/approved/executed/rejected)
    - **page**: 页码 (从1开始)
    - **page_size**: 每页数量 (1-100)
    """
    items, total, total_pages = await service.get_redemption_queue(
        status=status,
        page=page,
        page_size=page_size,
    )

    return create_success_response(
        list_data=[item.model_dump(mode="json") for item in items],
        pagination=PaginationInfo(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


@router.get(
    "/queue/{redemption_id}",
    summary="Get Redemption Detail",
    description="Get detailed redemption request information",
)
async def get_redemption_detail(
    redemption_id: int,
    service: TreasuryService = Depends(get_treasury_service),
):
    """
    获取赎回详情

    - **redemption_id**: 赎回请求ID
    """
    detail = await service.get_redemption_detail(redemption_id)
    return create_success_response(object_data=detail.model_dump(mode="json"))


@router.post(
    "/queue/{redemption_id}/sign",
    summary="Sign Redemption",
    description="Sign a redemption proposal (multisig signer only)",
)
async def sign_redemption(
    redemption_id: int,
    data: TreasurySignRequest,
    wallet_address: str = Depends(require_multisig_signer),
    service: TreasuryService = Depends(get_treasury_service),
):
    """
    签名赎回请求

    - **redemption_id**: 赎回请求ID
    - **tx_hash**: 链上签名交易哈希

    需要多签成员权限
    """
    result = await service.submit_signature(
        redemption_id=redemption_id,
        signer_address=wallet_address,
        tx_hash=data.tx_hash,
    )

    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg="Signature submitted successfully",
    )


@router.post(
    "/queue/{redemption_id}/reject",
    summary="Reject Redemption",
    description="Reject a redemption request",
)
async def reject_redemption(
    redemption_id: int,
    data: RedemptionRejectRequest,
    wallet_address: str = Depends(require_contract_owner),
    service: TreasuryService = Depends(get_treasury_service),
):
    """
    拒绝赎回请求

    - **redemption_id**: 赎回请求ID
    - **reason**: 拒绝原因 (可选)
    """
    result = await service.reject_redemption(
        redemption_id=redemption_id,
        rejected_by=wallet_address,
        reason=data.reason,
    )

    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg="Redemption request rejected",
    )


@router.post(
    "/queue/{redemption_id}/execute",
    summary="Execute Redemption",
    description="Confirm a redemption execution after on-chain execute_proposal",
)
async def execute_redemption(
    redemption_id: int,
    data: TreasuryExecuteRequest,
    wallet_address: str = Depends(require_contract_owner),
    service: TreasuryService = Depends(get_treasury_service),
):
    """
    执行赎回请求回写

    - **redemption_id**: 赎回请求ID
    - **tx_hash**: 链上 execute_proposal 交易哈希
    """
    result = await service.execute_redemption(
        redemption_id=redemption_id,
        executor_address=wallet_address,
        tx_hash=data.tx_hash,
    )

    return create_success_response(
        object_data=result.model_dump(mode="json"),
        msg="Redemption executed successfully",
    )


@router.get(
    "/multisig/status",
    summary="Get Multisig Status",
    description="Get multisig contract status and signer information",
)
async def get_multisig_status(
    service: TreasuryService = Depends(get_treasury_service),
):
    """
    获取多签合约状态

    返回:
    - 合约地址
    - 签名者列表
    - 签名阈值
    """
    status_info = await service.get_multisig_status()
    return create_success_response(object_data=status_info)


@router.get(
    "/stats",
    summary="Get Treasury Stats",
    description="Get treasury statistics",
)
async def get_treasury_stats(
    service: TreasuryService = Depends(get_treasury_service),
):
    """
    获取国库统计信息

    返回:
    - 总请求数
    - 各状态数量
    - 总赎回金额
    - 平均签名时间
    """
    stats = await service.get_treasury_stats()
    return create_success_response(object_data=stats.model_dump(mode="json"))
