"""
Auth 领域 - Schema 定义
认证相关的数据传输对象（DTO）
"""

from typing import Optional

from pydantic import BaseModel, Field


class TokenRequest(BaseModel):
    """登录请求 - 钱包签名验证"""

    address: str = Field(..., description="钱包地址")
    signature: str = Field(..., description="钱包签名")
    expires_in_mins: Optional[int] = Field(None, description="自定义令牌过期时间(分钟)")

    class Config:
        json_schema_extra = {
            "example": {
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "signature": "0x1234567890abcdef...",
                "expires_in_mins": 60,
            }
        }


class TokenResponse(BaseModel):
    """令牌响应"""

    access_token: str = Field(..., description="访问令牌")
    refresh_token: str = Field(..., description="刷新令牌")
    token_type: str = Field(default="Bearer", description="令牌类型")
    expires_in_mins: int = Field(..., description="令牌过期时间(分钟)")

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "Bearer",
                "expires_in_mins": 60,
            }
        }


class RefreshTokenRequest(BaseModel):
    """刷新令牌请求"""

    refresh_token: str = Field(..., description="刷新令牌")


class LogoutRequest(BaseModel):
    """登出请求"""

    wallet_address: str = Field(..., description="钱包地址")


class CurrentUserResponse(BaseModel):
    """当前用户信息响应"""

    address: str = Field(..., description="钱包地址")
    is_admin: bool = Field(default=False, description="是否为管理员")
    tag: Optional[str] = Field(None, description="标签")
    net_type: str = Field(default="local", description="网络类型")
    kyc_status: Optional[str] = Field(None, description="KYC 状态")

    class Config:
        from_attributes = True


class SessionInfo(BaseModel):
    """会话信息"""

    wallet_address: str = Field(..., description="钱包地址")
    session_id: str = Field(..., description="会话 ID")
    login_at: str = Field(..., description="登录时间")
    last_active_at: str = Field(..., description="最后活跃时间")
    user_agent: Optional[str] = Field(None, description="用户代理")
    ip_address: Optional[str] = Field(None, description="IP 地址")

    class Config:
        from_attributes = True

