"""
共享安全模块
JWT 令牌、权限验证等安全相关工具
"""

import datetime
from typing import Optional, Tuple

import jwt
from eth_account.messages import encode_defunct
from falib.utils.config import SETTINGS
from fastapi import Header, HTTPException, status
from web3 import Web3

from src.shared.exceptions import UnauthorizedException

# =============================================================================
# JWT 令牌管理
# =============================================================================


def create_access_token(
    data: dict, expires_delta: Optional[datetime.timedelta] = None
) -> str:
    """
    创建访问令牌（Access Token）

    Args:
        data: 要编码到 JWT 中的数据
        expires_delta: 自定义过期时间

    Returns:
        编码后的 JWT 访问令牌
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.now(tz=datetime.UTC) + expires_delta
    else:
        expire = datetime.datetime.now(tz=datetime.UTC) + datetime.timedelta(
            minutes=SETTINGS.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SETTINGS.JWT_SECRET, algorithm="HS256")
    return encoded_jwt


def create_refresh_token(
    data: dict, expires_delta: Optional[datetime.timedelta] = None
) -> str:
    """
    创建刷新令牌（Refresh Token）

    Args:
        data: 要编码到 JWT 中的数据
        expires_delta: 自定义过期时间

    Returns:
        编码后的 JWT 刷新令牌
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.now(tz=datetime.UTC) + expires_delta
    else:
        expire = datetime.datetime.now(tz=datetime.UTC) + datetime.timedelta(
            minutes=SETTINGS.REFRESH_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SETTINGS.JWT_SECRET, algorithm="HS256")
    return encoded_jwt


def verify_token(token: str) -> dict:
    """
    验证 JWT Token

    Args:
        token: JWT 令牌字符串

    Returns:
        解码后的 payload

    Raises:
        UnauthorizedException: 令牌无效或已过期
    """
    try:
        payload = jwt.decode(token, SETTINGS.JWT_SECRET, algorithms=["HS256"])
        address = payload.get("address")
        if not address:
            raise UnauthorizedException("Invalid token")
    except jwt.ExpiredSignatureError:
        raise UnauthorizedException("Token expired")
    except jwt.InvalidTokenError:
        raise UnauthorizedException("Invalid token")
    except jwt.PyJWTError:
        raise UnauthorizedException("Invalid token")
    return payload


def refresh_tokens(token: str) -> Tuple[str, str]:
    """
    使用刷新令牌生成新的令牌对

    Args:
        token: 刷新令牌

    Returns:
        (新的访问令牌, 新的刷新令牌)
    """
    payload = verify_token(token)
    # 保留原有的 session_id
    new_payload = {"address": payload.get("address")}
    if "session_id" in payload:
        new_payload["session_id"] = payload["session_id"]

    access_token = create_access_token(new_payload)
    new_refresh_token = create_refresh_token(new_payload)
    return access_token, new_refresh_token


# =============================================================================
# 钱包签名验证
# =============================================================================


def verify_wallet_signature(
    address: str, signature: str, message: str = "Sign in to SuperCrypto"
) -> bool:
    """
    验证钱包签名

    Args:
        address: 钱包地址
        signature: 签名
        message: 签名的消息

    Returns:
        签名是否有效
    """
    try:
        w3 = Web3()
        message_hash = encode_defunct(text=message)
        recovered_address = w3.eth.account.recover_message(
            message_hash, signature=signature
        )
        return recovered_address.lower() == address.lower()
    except Exception:
        return False


# =============================================================================
# FastAPI 权限依赖
# =============================================================================


def extract_token_from_header(authorization: Optional[str]) -> str:
    """
    从 Authorization header 中提取 JWT token

    Args:
        authorization: Authorization header 值，格式为 "Bearer <token>"

    Returns:
        JWT token 字符串

    Raises:
        HTTPException: 如果 header 格式不正确
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Use: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return parts[1]


def verify_jwt_and_get_address(token: str) -> str:
    """
    验证 JWT token 并返回钱包地址

    Args:
        token: JWT token 字符串

    Returns:
        钱包地址

    Raises:
        HTTPException: 如果 token 无效或已过期
    """
    try:
        payload = verify_token(token)
        address = payload.get("address")
        if not address:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing address",
            )
        return address.lower()
    except UnauthorizedException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_admin(
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    """
    管理员权限验证依赖

    用于需要管理员权限的接口
    检查：
    1. JWT token 有效性
    2. 从 token 中提取并验证钱包地址（不可伪造）
    3. 是否为管理员账户
    4. 会话是否已被撤销
    """
    # 延迟导入避免循环依赖
    from src.domains.auth.session_service import session_service
    from src.models.account import Account

    # 1. 提取并验证 JWT token
    token = extract_token_from_header(authorization)
    wallet_address = verify_jwt_and_get_address(token)

    environment = SETTINGS.environment or "local"

    # 2. 检查会话是否被撤销
    if await session_service.is_session_revoked(wallet_address):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session revoked. Please reconnect your wallet.",
        )

    # 3. 查询账户并验证管理员权限
    account = await Account.filter(address=wallet_address, net_type=environment).first()

    if not account or account.tag != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin permission required"
        )

    return wallet_address


async def require_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    """
    普通用户认证依赖

    检查：
    1. JWT token 有效性
    2. 从 token 中提取并验证钱包地址（不可伪造）
    3. 会话是否已被撤销
    """
    # 延迟导入避免循环依赖
    from src.domains.auth.session_service import session_service

    # 1. 提取并验证 JWT token
    token = extract_token_from_header(authorization)
    wallet_address = verify_jwt_and_get_address(token)

    # 2. 检查会话是否被撤销
    if await session_service.is_session_revoked(wallet_address):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session revoked. Please reconnect your wallet.",
        )

    return wallet_address
