"""
管理员统计路由 - 平台统计

路由前缀: /api/v1/admin/stats
注意: KYC 相关路由已移至 kyc.py (/api/v1/admin/kyc)
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends

from src.services.admin.service import AdminService, admin_service
from src.shared.security import require_admin

router = APIRouter()


def get_admin_service() -> AdminService:
    """依赖注入：获取管理员服务"""
    return admin_service


# ============ 平台统计 ============


@router.get(
    "",
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
    "/tvl",
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


@router.get("/users", summary="获取用户统计", description="获取用户数量和 KYC 统计")
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


@router.get("/staking", summary="获取质押池统计", description="获取质押挖矿统计数据")
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
