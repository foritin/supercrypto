"""
JWT 令牌管理

纯工具函数，无外部业务依赖
"""

import datetime
from typing import Optional, Tuple

import jwt
from falib.utils.config import SETTINGS

from src.shared.security.exceptions import (
    AccessTokenExpiredException,
    RefreshTokenExpiredException,
)
from src.shared.common.exceptions import UnauthorizedException


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


def verify_token(token: str, expected_type: Optional[str] = None) -> dict:
    """
    验证 JWT Token

    Args:
        token: JWT 令牌字符串
        expected_type: 期望的 token 类型 ("access" 或 "refresh")，None 表示不检查类型

    Returns:
        解码后的 payload

    Raises:
        AccessTokenExpiredException: Access Token 已过期
        RefreshTokenExpiredException: Refresh Token 已过期
        UnauthorizedException: 令牌无效
    """
    try:
        payload = jwt.decode(token, SETTINGS.JWT_SECRET, algorithms=["HS256"])
        address = payload.get("address")
        if not address:
            raise UnauthorizedException("Invalid token: missing address")

        # 检查 token 类型是否匹配
        token_type = payload.get("type", "access")
        if expected_type and token_type != expected_type:
            raise UnauthorizedException(f"Invalid token type: expected {expected_type}")

    except jwt.ExpiredSignatureError:
        # 尝试解码过期的 token 以获取类型信息
        try:
            expired_payload = jwt.decode(
                token,
                SETTINGS.JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_exp": False},
            )
            token_type = expired_payload.get("type", "access")
        except Exception:
            token_type = "access"  # 默认当作 access token

        # 根据 token 类型抛出不同异常
        if token_type == "refresh":
            raise RefreshTokenExpiredException()
        else:
            raise AccessTokenExpiredException()

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

    Raises:
        RefreshTokenExpiredException: Refresh Token 已过期，需要重新登录
        UnauthorizedException: Token 无效
    """
    # 验证必须是 refresh token 类型
    payload = verify_token(token, expected_type="refresh")

    # 保留原有的 session_id
    new_payload = {"address": payload.get("address")}
    if "session_id" in payload:
        new_payload["session_id"] = payload["session_id"]

    access_token = create_access_token(new_payload)
    new_refresh_token = create_refresh_token(new_payload)
    return access_token, new_refresh_token

