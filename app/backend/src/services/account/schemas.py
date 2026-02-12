"""
Account 领域 - Schema 定义
数据传输对象（DTO）
"""

from datetime import datetime
from typing import Optional

from pydantic import ConfigDict, BaseModel, Field, field_validator

from src.shared.schemas.base import IDMixin, TimestampMixin


class AccountBase(BaseModel):
    """账户基础 Schema"""

    address: str = Field(..., max_length=128, description="钱包地址")
    tag: Optional[str] = Field(None, max_length=255, description="标签")
    net_type: str = Field(
        default="hardhat", description="网络类型: hardhat/sepolia/mainnet"
    )

    @field_validator("net_type")
    @classmethod
    def validate_net_type(cls, v: str) -> str:
        """验证网络类型"""
        if v not in ["hardhat", "sepolia", "mainnet"]:
            raise ValueError("net_type必须是: hardhat, sepolia, mainnet 之一")
        return v

    @field_validator("address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        """验证地址格式（简单验证）"""
        if not v or len(v) < 10:
            raise ValueError("Invalid address format")
        return v


class AccountCreate(AccountBase):
    """创建账户请求 Schema"""

    private_key: str = Field(..., max_length=256, description="私钥")

    @field_validator("private_key")
    @classmethod
    def validate_private_key(cls, v: str) -> str:
        """验证私钥格式"""
        if not v or len(v) < 10:
            raise ValueError("Invalid private key format")
        return v

    model_config = ConfigDict(json_schema_extra={
            "example": {
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "private_key": "0x0123456789abcdef...",
                "tag": "我的主钱包",
                "net_type": "test",
            }
        })


class AccountUpdate(BaseModel):
    """更新账户请求 Schema"""

    tag: Optional[str] = Field(None, max_length=255, description="标签")
    net_type: Optional[str] = Field(None, description="网络类型")

    @field_validator("net_type")
    @classmethod
    def validate_net_type(cls, v: Optional[str]) -> Optional[str]:
        """验证网络类型"""
        if v is not None and v not in ["hardhat", "sepolia", "mainnet"]:
            raise ValueError("net_type必须是: hardhat, sepolia, mainnet 之一")
        return v

    model_config = ConfigDict(json_schema_extra={"example": {"tag": "更新后的标签", "net_type": "mainnet"}})


class AccountResponse(AccountBase, IDMixin, TimestampMixin):
    """账户响应 Schema（不包含私钥）"""

    last_login_dt: Optional[datetime] = Field(None, description="最后登录时间(UTC)")

    model_config = ConfigDict(from_attributes=True, json_schema_extra={
            "example": {
                "id": 1,
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "tag": "我的主钱包",
                "net_type": "test",
                "last_login_dt": "2025-11-16T10:00:00Z",
                "created_at": "2025-11-01T08:00:00Z",
                "updated_at": "2025-11-16T10:00:00Z",
            }
        })


class AccountWithBalance(AccountResponse):
    """带余额的账户响应 Schema"""

    balance: str = Field(description="账户余额（字符串格式保证精度）")
    balance_usd: Optional[str] = Field(None, description="美元价值")

    model_config = ConfigDict(from_attributes=True, json_schema_extra={
            "example": {
                "id": 1,
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "tag": "我的主钱包",
                "net_type": "test",
                "balance": "1.5",
                "balance_usd": "3750.25",
                "last_login_dt": "2025-11-16T10:00:00Z",
                "created_at": "2025-11-01T08:00:00Z",
                "updated_at": "2025-11-16T10:00:00Z",
            }
        })


class AccountListQuery(BaseModel):
    """账户列表查询参数"""

    tag: Optional[str] = Field(None, description="标签过滤（模糊搜索）")
    address: Optional[str] = Field(None, description="地址过滤（模糊搜索）")
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=10, ge=1, le=100, description="每页数量")
