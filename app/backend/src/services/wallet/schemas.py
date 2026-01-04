"""
Wallet领域 - Schema定义
"""
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from decimal import Decimal

from src.shared.schemas.base import IDMixin, TimestampMixin


class WalletBase(BaseModel):
    """钱包基础Schema"""
    address: str = Field(..., max_length=128, description="钱包地址")
    network: str = Field(default="ethereum", description="网络类型")
    tag: Optional[str] = Field(None, max_length=255, description="标签")
    
    @field_validator('network')
    @classmethod
    def validate_network(cls, v: str) -> str:
        """验证网络类型"""
        valid_networks = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism']
        if v.lower() not in valid_networks:
            raise ValueError(f'network必须是: {", ".join(valid_networks)} 之一')
        return v.lower()


class WalletCreate(BaseModel):
    """创建钱包请求Schema"""
    network: str = Field(default="ethereum", description="网络类型")
    tag: Optional[str] = Field(None, max_length=255, description="标签")
    account_id: Optional[int] = Field(None, description="关联的账户ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "network": "ethereum",
                "tag": "我的ETH钱包"
            }
        }


class WalletImport(BaseModel):
    """导入钱包请求Schema"""
    private_key: str = Field(..., description="私钥")
    network: str = Field(default="ethereum", description="网络类型")
    tag: Optional[str] = Field(None, description="标签")
    account_id: Optional[int] = Field(None, description="关联的账户ID")


class WalletUpdate(BaseModel):
    """更新钱包请求Schema"""
    tag: Optional[str] = Field(None, description="标签")
    is_active: Optional[bool] = Field(None, description="是否激活")


class WalletResponse(WalletBase, IDMixin, TimestampMixin):
    """钱包响应Schema（不包含私钥）"""
    balance: str = Field(description="余额（Ether单位）")
    is_active: bool = Field(description="是否激活")
    account_id: Optional[int] = Field(None, description="关联的账户ID")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "network": "ethereum",
                "balance": "1.5",
                "tag": "我的ETH钱包",
                "is_active": True,
                "account_id": 1,
                "created_at": "2025-11-16T10:00:00Z",
                "updated_at": "2025-11-16T10:00:00Z"
            }
        }


class TransferRequest(BaseModel):
    """转账请求Schema"""
    to_address: str = Field(..., description="目标地址")
    amount: str = Field(..., description="金额（Ether单位）")
    gas_price: Optional[str] = Field(None, description="Gas价格（Gwei）")
    gas_limit: Optional[int] = Field(None, description="Gas限制")
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: str) -> str:
        """验证金额格式"""
        try:
            amount = Decimal(v)
            if amount <= 0:
                raise ValueError('金额必须大于0')
        except Exception:
            raise ValueError('无效的金额格式')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "to_address": "0x1234567890abcdef1234567890abcdef12345678",
                "amount": "0.1",
                "gas_price": "20",
                "gas_limit": 21000
            }
        }


class TransferResponse(BaseModel):
    """转账响应Schema"""
    tx_hash: str = Field(description="交易哈希")
    from_address: str = Field(description="发送地址")
    to_address: str = Field(description="接收地址")
    amount: str = Field(description="金额")
    status: str = Field(description="状态")
    
    class Config:
        json_schema_extra = {
            "example": {
                "tx_hash": "0xabcdef1234567890...",
                "from_address": "0x742d35Cc...",
                "to_address": "0x12345678...",
                "amount": "0.1",
                "status": "pending"
            }
        }


class BalanceResponse(BaseModel):
    """余额查询响应Schema"""
    address: str = Field(description="钱包地址")
    balance: str = Field(description="余额（Ether）")
    balance_wei: str = Field(description="余额（Wei）")
    network: str = Field(description="网络")
    
    class Config:
        json_schema_extra = {
            "example": {
                "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                "balance": "1.5",
                "balance_wei": "1500000000000000000",
                "network": "ethereum"
            }
        }

