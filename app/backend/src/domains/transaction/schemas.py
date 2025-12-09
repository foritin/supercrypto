"""
Transaction领域 - Schema定义
"""
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

from src.shared.schemas.base import IDMixin, TimestampMixin


class TransactionBase(BaseModel):
    """交易基础Schema"""
    tx_hash: str = Field(..., description="交易哈希")
    from_address: str = Field(..., description="发送地址")
    to_address: str = Field(..., description="接收地址")
    amount: str = Field(..., description="金额")
    network: str = Field(default="ethereum", description="网络")


class TransactionCreate(TransactionBase):
    """创建交易记录请求Schema"""
    status: str = Field(default="pending", description="状态")
    tx_type: str = Field(default="transfer", description="交易类型")
    gas_price: Optional[str] = Field(None, description="Gas价格")
    wallet_id: Optional[int] = Field(None, description="关联钱包ID")
    note: Optional[str] = Field(None, description="备注")


class TransactionUpdate(BaseModel):
    """更新交易记录请求Schema"""
    status: Optional[str] = Field(None, description="状态")
    gas_used: Optional[str] = Field(None, description="Gas使用量")
    block_number: Optional[int] = Field(None, description="区块号")
    block_timestamp: Optional[datetime] = Field(None, description="区块时间")
    note: Optional[str] = Field(None, description="备注")


class TransactionResponse(TransactionBase, IDMixin, TimestampMixin):
    """交易响应Schema"""
    status: str = Field(description="交易状态")
    tx_type: str = Field(description="交易类型")
    gas_price: Optional[str] = Field(None, description="Gas价格")
    gas_used: Optional[str] = Field(None, description="Gas使用量")
    block_number: Optional[int] = Field(None, description="区块号")
    block_timestamp: Optional[datetime] = Field(None, description="区块时间")
    wallet_id: Optional[int] = Field(None, description="关联钱包ID")
    note: Optional[str] = Field(None, description="备注")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "tx_hash": "0xabcdef1234567890...",
                "from_address": "0x742d35Cc...",
                "to_address": "0x12345678...",
                "amount": "0.1",
                "network": "ethereum",
                "status": "confirmed",
                "tx_type": "transfer",
                "gas_price": "20000000000",
                "gas_used": "21000",
                "block_number": 18000000,
                "created_at": "2025-11-16T10:00:00Z",
                "updated_at": "2025-11-16T10:05:00Z"
            }
        }


class TransactionListQuery(BaseModel):
    """交易列表查询参数"""
    address: Optional[str] = Field(None, description="地址过滤（发送或接收）")
    from_address: Optional[str] = Field(None, description="发送地址过滤")
    to_address: Optional[str] = Field(None, description="接收地址过滤")
    wallet_id: Optional[int] = Field(None, description="钱包ID过滤")
    network: Optional[str] = Field(None, description="网络过滤")
    status: Optional[str] = Field(None, description="状态过滤")
    tx_type: Optional[str] = Field(None, description="交易类型过滤")
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=10, ge=1, le=100, description="每页数量")


class TransactionStats(BaseModel):
    """交易统计Schema"""
    total_transactions: int = Field(description="总交易数")
    pending_count: int = Field(description="待确认数量")
    confirmed_count: int = Field(description="已确认数量")
    failed_count: int = Field(description="失败数量")
    total_amount: str = Field(description="总金额")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_transactions": 100,
                "pending_count": 5,
                "confirmed_count": 90,
                "failed_count": 5,
                "total_amount": "10.5"
            }
        }

