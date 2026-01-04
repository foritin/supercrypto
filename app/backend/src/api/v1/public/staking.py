"""
公开质押路由 - 质押配置、限额、PLT 信息

路由前缀: /api/v1/public/staking
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends

from src.services.staking.service import StakingService

router = APIRouter()


def get_staking_service() -> StakingService:
    """依赖注入：获取质押服务"""
    return StakingService()


@router.get(
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


@router.get(
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


@router.get(
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

