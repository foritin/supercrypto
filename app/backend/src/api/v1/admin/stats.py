"""
管理员统计路由 - 平台统计

路由前缀: /api/v1/admin/stats
注意: KYC 相关路由已移至 kyc.py (/api/v1/admin/kyc)
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends

from src.common.dependencies import get_admin_service
from src.security import require_admin
from src.services import AdminService

router = APIRouter()


# ============ 平台统计 ============


@router.get(
    "",
    summary="Get Platform Stats Summary",
    description="Get all platform statistics including TVL, users, staking, etc.",
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
    "/tvl",
    summary="Get TVL Stats",
    description="Get total value locked statistics with per-asset breakdown",
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
    "/users", summary="Get User Stats", description="Get user count and KYC statistics"
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
    "/staking",
    summary="Get Staking Pool Stats",
    description="Get staking mining statistics",
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
