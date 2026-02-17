"""
用户质押路由 - 质押操作、列表、领取奖励

路由前缀: /api/v1/user/staking
"""

from typing import Optional

from falib.utils.handlers import PaginationInfo, create_success_response
from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.common.dependencies import get_staking_service
from src.schemas.enums import StakingStatus
from src.schemas.staking import (
    ClaimRewardsRequest,
    StakingCreateRequest,
    StakingPreviewRequest,
    UnstakeRequest,
)
from src.security import require_user
from src.services import StakingService

router = APIRouter()


@router.post(
    "/preview",
    summary="Preview Staking Rewards",
    description="Calculate expected PLT rewards for staking",
)
async def preview_staking(
    data: StakingPreviewRequest,
    wallet_address: str = Depends(require_user),
    service: StakingService = Depends(get_staking_service),
):
    """
    预览质押收益

    - 需要 JWT 认证
    - **subscription_id**: 关联的认购ID
    - **amount**: 质押金额（RWA Token）
    - **period**: 质押周期（天）: 15/30/45/60
    """
    result = await service.preview_staking(wallet_address, data)
    return create_success_response(object_data=result.model_dump(mode="json"))


@router.post(
    "",
    summary="Create Staking",
    description="Stake RWA Token to participate in mining",
)
async def create_staking(
    data: StakingCreateRequest,
    wallet_address: str = Depends(require_user),
    service: StakingService = Depends(get_staking_service),
):
    """
    创建质押

    - 需要 JWT 认证
    - 需要 KYC 验证
    - 需要足够的 RWA Token
    - 会顺延关联认购的赎回时间
    """
    result = await service.create_staking(wallet_address, data)
    return create_success_response(
        object_data=result.model_dump(mode="json"), msg="Staking created successfully"
    )


@router.get(
    "",
    summary="List Stakings",
    description="Get the user's staking records",
)
async def list_stakings(
    staking_status: Optional[StakingStatus] = Query(
        None, alias="status", description="状态筛选"
    ),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    wallet_address: str = Depends(require_user),
    service: StakingService = Depends(get_staking_service),
):
    """
    获取用户质押列表

    - 需要 JWT 认证
    - 支持按状态筛选
    - 支持分页
    """
    items, total, total_pages = await service.list_stakings(
        wallet_address=wallet_address,
        status=staking_status,
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
    "/stats",
    summary="Get User Staking Stats",
    description="Get the user's staking statistics",
)
async def get_user_stats(
    wallet_address: str = Depends(require_user),
    service: StakingService = Depends(get_staking_service),
):
    """
    获取用户质押统计

    - 需要 JWT 认证
    - 总质押金额
    - 活跃质押数
    - 已领取奖励
    - 待领取奖励
    - 当前 APY
    """
    stats = await service.get_user_stats(wallet_address)
    return create_success_response(object_data=stats.model_dump(mode="json"))


@router.get(
    "/{staking_id}",
    summary="Get Staking Detail",
    description="Get detailed staking information by ID",
)
async def get_staking(
    staking_id: int,
    wallet_address: str = Depends(require_user),
    service: StakingService = Depends(get_staking_service),
):
    """
    获取质押详情

    - 需要 JWT 认证
    - **staking_id**: 质押ID
    """
    result = await service.get_staking(staking_id, wallet_address)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Staking record not found"
        )

    return create_success_response(object_data=result.model_dump(mode="json"))


@router.post(
    "/{staking_id}/unstake",
    summary="Unstake",
    description="Unstake a matured staking position",
)
async def unstake(
    staking_id: int,
    data: UnstakeRequest,
    wallet_address: str = Depends(require_user),
    service: StakingService = Depends(get_staking_service),
):
    """
    解除质押

    - 需要 JWT 认证
    - 只能解除已到期的质押
    - 会自动领取剩余奖励
    - 需要提供解押交易哈希
    """
    result = await service.unstake(staking_id, wallet_address, data.tx_hash)
    return create_success_response(
        object_data=result.model_dump(mode="json"), msg="Unstaked successfully"
    )


@router.post(
    "/{staking_id}/claim",
    summary="Claim Rewards",
    description="Claim PLT rewards from staking",
)
async def claim_rewards(
    staking_id: int,
    data: ClaimRewardsRequest,
    wallet_address: str = Depends(require_user),
    service: StakingService = Depends(get_staking_service),
):
    """
    领取奖励

    - 需要 JWT 认证
    - 领取当前累积的可领取奖励
    - 需要提供领取交易哈希
    """
    result = await service.claim_rewards(staking_id, wallet_address, data.tx_hash)
    return create_success_response(
        object_data=result.model_dump(mode="json"), msg="Rewards claimed successfully"
    )
