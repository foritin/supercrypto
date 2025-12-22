"""
Staking Domain - API Routes
"""

from typing import Optional

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.domains.staking.schemas import (
    ClaimRewardsRequest,
    StakingCreateRequest,
    StakingPreviewRequest,
    UnstakeRequest,
)
from src.domains.staking.service import StakingService
from src.models.staking import StakingStatus
from src.shared.security import require_user

# 公开路由（无需认证）
public_router = APIRouter()

# 用户路由（需要认证，将在 router.py 中统一注入 require_user）
user_router = APIRouter()


def get_staking_service() -> StakingService:
    """依赖注入：获取质押服务"""
    return StakingService()


# ============ 公开接口 ============


@public_router.get(
    "/config",
    summary="获取质押配置",
    description="获取质押周期、倍数等配置信息",
)
async def get_staking_config(service: StakingService = Depends(get_staking_service)):
    """
    获取质押配置（公开接口）

    返回:
    - 可选周期 (15/30/45/60 天)
    - 对应倍数 (1.0x/2.5x/4.5x/7.0x)
    - 基础日产出率
    - 最小质押金额
    """
    result = await service.get_config()
    return create_success_response(object_data=result.model_dump(mode="json"))


@public_router.get(
    "/limit",
    summary="获取今日质押限额",
    description="获取当日的质押限额信息",
)
async def get_today_limit(service: StakingService = Depends(get_staking_service)):
    """
    获取今日质押限额（公开接口）

    返回:
    - 基础限额
    - 累积限额
    - 已使用限额
    - 剩余限额
    """
    result = await service.get_today_limit()
    return create_success_response(object_data=result.model_dump(mode="json"))


@public_router.get(
    "/plt-token",
    summary="获取 PLT 代币信息",
    description="获取 PLT 代币的完整信息，包括总量、分配、质押池状态等",
)
async def get_plt_token_info(service: StakingService = Depends(get_staking_service)):
    """
    获取 PLT 代币信息（公开接口）

    返回:
    - 总发行量
    - 流通量
    - 质押奖励池状态
    - 代币分配详情
    - 当前价格与市值
    """
    result = await service.get_plt_token_info()
    return create_success_response(object_data=result.model_dump(mode="json"))


# ============ 用户接口（需要 JWT 认证）============


@user_router.post(
    "/preview",
    summary="预览质押收益",
    description="计算质押的预期 PLT 奖励",
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


@user_router.post(
    "",
    summary="创建质押",
    description="质押 RWA Token 参与挖矿",
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


@user_router.get(
    "",
    summary="获取质押列表",
    description="获取用户的质押记录列表",
)
async def list_stakings(
    status: Optional[StakingStatus] = Query(None, description="状态筛选"),
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
        wallet_address=wallet_address, status=status, page=page, page_size=page_size
    )

    return create_success_response(
        list_data=[item.model_dump(mode="json") for item in items],
        pagination={
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    )


@user_router.get(
    "/stats",
    summary="获取用户质押统计",
    description="获取用户的质押统计数据",
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


@user_router.get(
    "/{staking_id}",
    summary="获取质押详情",
    description="根据ID获取质押的详细信息",
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


@user_router.post(
    "/{staking_id}/unstake",
    summary="解除质押",
    description="解除已到期的质押",
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


@user_router.post(
    "/{staking_id}/claim",
    summary="领取奖励",
    description="领取质押产生的 PLT 奖励",
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
