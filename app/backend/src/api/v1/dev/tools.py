"""
开发者工具路由 - 通用开发工具
仅在 dev/test 环境可用

路由前缀: /api/v1/dev
"""

from falib.utils.handlers import create_success_response, success_response
from fastapi import APIRouter, Depends, HTTPException, status

from src.services.dev.schemas import DataResetRequest
from src.services.dev.service import DevToolsService
from src.shared.security import require_admin

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
    """
    重置测试数据

    注意：此操作不可逆，请谨慎使用

    Args:
        request: 重置请求，包含确认文字和要重置的数据类型

    Returns:
        重置结果
    """
    service = get_service()

    # 检查环境
    if not service.is_reset_allowed():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Data reset is not allowed in this environment",
        )

    # 验证确认文字
    if request.confirmation != "RESET":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid confirmation. Please type 'RESET' to confirm.",
        )

    # 执行重置
    try:
        reset_counts = await service.reset_data(request.data_types)

        return create_success_response(
            object_data={
                "success": True,
                "message": "Data reset successfully",
                "reset_counts": reset_counts,
                "environment": service.get_environment(),
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset data: {str(e)}",
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
    return success_response(list_data=[r.model_dump() for r in recipients])
