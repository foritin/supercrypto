"""
用户认证路由 - 当前用户信息

路由前缀: /api/v1/user/auth

遵循分层架构原则：Router → Service → Model
Router 层只调用 Service 方法，不直接使用 ORM 模型查询
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, Request

from src.services.auth.schemas import CurrentUserResponse
from src.services.auth.service import get_auth_service
from src.shared.security import require_user

router = APIRouter()


@router.get("/me", summary="获取当前用户信息", description="获取当前登录用户的信息")
async def get_current_user(
    request: Request,
    wallet_address: str = Depends(require_user),
):
    """
    获取当前用户信息

    认证方式：
    - Authorization: Bearer <token> - JWT 认证（由中间件解析）

    返回用户信息、是否为管理员、KYC 状态等
    """
    # 使用 AuthService 获取用户信息，遵循分层架构
    auth_service = get_auth_service()
    user_info = await auth_service.get_current_user_info(wallet_address)

    # 从 Service 返回的数据构建响应
    account = user_info["account"]
    kyc = user_info["kyc"]
    is_admin = user_info["is_admin"]
    network_type = user_info["network_type"]

    response = CurrentUserResponse(
        address=wallet_address,
        is_admin=is_admin,
        tag=account.tag if account else None,
        net_type=network_type.value,
        kyc_status=kyc.status.value if kyc else None,
    )

    return create_success_response(object_data=response.model_dump())
