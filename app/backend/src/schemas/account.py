"""
Account 领域 - Schema 定义
数据传输对象（DTO）
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.schemas.base import IDMixin, PaginationParams, TimestampMixin

# 预定义角色列表
ACCOUNT_ROLES = [
    "admin",
    "treasury", 
    "multisig_signer",
    "contract_owner",  # 包含部署和合约所有权管理
]


class AccountBase(BaseModel):
    """账户基础 Schema"""

    address: str = Field(..., max_length=128, description="钱包地址")
    roles: List[str] = Field(default_factory=list, description="账户角色列表: admin, treasury, multisig_signer, contract_owner")
    network: str = Field(
        default="hardhat",
        description="网络类型: hardhat/sepolia/mainnet/arbitrum/arbitrum-sepolia",
    )

    @field_validator("network")
    @classmethod
    def validate_network(cls, v: str) -> str:
        """验证网络类型"""
        if v not in ["hardhat", "sepolia", "mainnet", "arbitrum", "arbitrum-sepolia"]:
            raise ValueError(
                "network必须是: hardhat, sepolia, mainnet, arbitrum, arbitrum-sepolia 之一"
            )
        return v

    @field_validator("address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        """验证地址格式（简单验证）"""
        if not v or len(v) < 10:
            raise ValueError("Invalid address format")
        return v

    @field_validator("roles")
    @classmethod
    def validate_roles(cls, v: List[str]) -> List[str]:
        """验证角色是否合法"""
        if v is None:
            return []
        invalid_roles = [r for r in v if r not in ACCOUNT_ROLES]
        if invalid_roles:
            raise ValueError(f"Invalid roles: {invalid_roles}. Allowed: {ACCOUNT_ROLES}")
        return v


class AccountCreate(AccountBase):
    """创建账户请求 Schema"""

    private_key: str = Field(..., max_length=256, description="私钥")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "private_key": "0x0123456789abcdef...",
                "roles": ["treasury"],
                "network": "hardhat",
            }
        }
    )


class AccountUpdate(BaseModel):
    """更新账户请求 Schema"""

    roles: Optional[List[str]] = Field(None, description="账户角色列表")
    network: Optional[str] = Field(None, description="网络类型")

    @field_validator("network")
    @classmethod
    def validate_network(cls, v: Optional[str]) -> Optional[str]:
        """验证网络类型"""
        if v is not None and v not in [
            "hardhat",
            "sepolia",
            "mainnet",
            "arbitrum",
            "arbitrum-sepolia",
        ]:
            raise ValueError(
                "network必须是: hardhat, sepolia, mainnet, arbitrum, arbitrum-sepolia 之一"
            )
        return v

    @field_validator("roles")
    @classmethod
    def validate_roles(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """验证角色是否合法"""
        if v is None:
            return v
        invalid_roles = [r for r in v if r not in ACCOUNT_ROLES]
        if invalid_roles:
            raise ValueError(f"Invalid roles: {invalid_roles}. Allowed: {ACCOUNT_ROLES}")
        return v

    model_config = ConfigDict(
        json_schema_extra={"example": {"roles": ["treasury", "multisig_signer"], "network": "mainnet"}}
    )


class AccountResponse(AccountBase, IDMixin, TimestampMixin):
    """账户响应 Schema（不包含私钥）"""

    last_login_dt: Optional[datetime] = Field(None, description="最后登录时间(UTC)")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "roles": ["treasury", "multisig_signer"],
                "network": "hardhat",
                "last_login_dt": "2025-11-16T10:00:00Z",
                "created_at": "2025-11-01T08:00:00Z",
                "updated_at": "2025-11-16T10:00:00Z",
            }
        },
    )


class AccountWithBalance(AccountResponse):
    """带余额的账户响应 Schema"""

    balance: str = Field(description="账户余额（字符串格式保证精度）")
    balance_usd: Optional[str] = Field(None, description="美元价值")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "roles": ["treasury"],
                "network": "hardhat",
                "balance": "1.5",
                "balance_usd": "3750.25",
                "last_login_dt": "2025-11-16T10:00:00Z",
                "created_at": "2025-11-01T08:00:00Z",
                "updated_at": "2025-11-16T10:00:00Z",
            }
        },
    )


class AccountListQuery(PaginationParams):
    """账户列表查询参数"""

    roles: Optional[List[str]] = Field(None, description="角色过滤（包含任意指定角色）")
    address: Optional[str] = Field(None, description="地址过滤（模糊搜索）")

    @field_validator("roles")
    @classmethod
    def validate_roles(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """验证角色是否合法"""
        if v is None:
            return v
        invalid_roles = [r for r in v if r not in ACCOUNT_ROLES]
        if invalid_roles:
            raise ValueError(f"Invalid roles: {invalid_roles}. Allowed: {ACCOUNT_ROLES}")
        return v


class AccountRolesUpdate(BaseModel):
    """更新账户角色专用 Schema"""
    
    roles: List[str] = Field(..., description="账户角色列表")
    
    @field_validator("roles")
    @classmethod
    def validate_roles(cls, v: List[str]) -> List[str]:
        """验证角色是否合法"""
        invalid_roles = [r for r in v if r not in ACCOUNT_ROLES]
        if invalid_roles:
            raise ValueError(f"Invalid roles: {invalid_roles}. Allowed: {ACCOUNT_ROLES}")
        return v
    
    model_config = ConfigDict(
        json_schema_extra={"example": {"roles": ["treasury", "multisig_signer"]}}
    )
