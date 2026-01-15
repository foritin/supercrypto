"""
用户认证路由 - 当前用户信息

路由前缀: /api/v1/user/auth
"""

from falib.utils.config import SETTINGS
from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, Request

from src.models.account import Account
from src.models.kyc import UserKyc
from src.services.auth.schemas import CurrentUserResponse
from src.shared.schemas.enums import NetWork
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
    network = SETTINGS.NETWORK
    network_type = NetWork.from_value(network)
    # 查询账户
    account = await Account.filter(address=wallet_address, network=network_type).first()

    # 查询 KYC 状态
    kyc = await UserKyc.filter(
        wallet_address=wallet_address, wallet=network_type
    ).first()

    # 判断是否为管理员
    is_admin = account.tag == "admin" if account and account.tag else False

    response = CurrentUserResponse(
        address=wallet_address,
        is_admin=is_admin,
        tag=account.tag if account else None,
        net_type=network_type.value,
        kyc_status=kyc.status.value if kyc else None,
    )

    return create_success_response(object_data=response.model_dump())
