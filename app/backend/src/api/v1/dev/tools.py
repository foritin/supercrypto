"""
开发者工具路由 - 通用开发工具
仅在 dev/test 环境可用

路由前缀: /api/v1/dev
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, HTTPException, status

from src.common.exceptions import ValidationException
from src.schemas.dev import DataResetRequest, FaucetRequest
from src.schemas.enums import ErrorCode
from src.security import require_admin
from src.services import DevToolsService

router = APIRouter()


def get_service() -> DevToolsService:
    """获取开发者工具服务实例"""
    return DevToolsService()


@router.get("/reset/info")
async def get_reset_info():
    """
    获取可重置数据的统计信息

    Returns:
        可重置数据的统计信息
    """
    service = get_service()

    # 检查环境
    if not service.is_reset_allowed():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Data reset is not allowed in this environment",
        )

    info = await service.get_resetable_data_info()
    return create_success_response(object_data=info.model_dump())


@router.post("/reset")
async def reset_data(request: DataResetRequest):
    """重置测试数据 — 此操作不可逆，需输入 'RESET' 确认"""
    service = get_service()

    if not service.is_reset_allowed():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Data reset is not allowed in this environment",
        )

    if request.confirmation != "RESET":
        raise ValidationException(
            message="Invalid confirmation. Please type 'RESET' to confirm.",
            error_code=ErrorCode.VALIDATION_ERROR,
        )

    reset_counts = await service.reset_data(request.data_types)
    return create_success_response(
        object_data={
            "success": True,
            "message": "Data reset successfully",
            "reset_counts": reset_counts,
            "environment": service.get_environment(),
        }
    )


@router.get("/environment")
async def get_environment():
    """
    获取当前环境信息

    Returns:
        环境信息
    """
    service = get_service()

    return create_success_response(
        object_data={
            "environment": service.get_environment(),
            "reset_allowed": service.is_reset_allowed(),
        }
    )


@router.get("/token-recipients")
async def get_token_recipients(
    admin_address: str = Depends(require_admin),
):
    """
    获取可接收测试代币的用户列表

    仅管理员可调用，返回所有已通过 KYC 的用户（排除 admin 自己）

    Returns:
        可接收代币的用户列表
    """
    service = get_service()

    # 检查环境
    if not service.is_reset_allowed():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature is only available in hardhat environment",
        )

    recipients = await service.get_token_recipients()
    return create_success_response(list_data=[r.model_dump() for r in recipients])

@router.post("/faucet")
async def faucet_eth(
    request: FaucetRequest,
    admin_address: str = Depends(require_admin),
):
    """
    ETH 水龙头 - 给指定地址充值 ETH

    仅在 hardhat 网络可用，通过 hardhat_setBalance 直接设置余额
    """
    service = get_service()

    if not service.is_reset_allowed():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature is only available in hardhat environment",
        )

    result = await service.faucet_eth(request.address, request.amount_eth)
    return create_success_response(object_data=result)

