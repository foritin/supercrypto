"""
开发者工具 Schemas
用于测试数据重置等开发辅助功能
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class ResetDataType(str, Enum):
    """可重置的数据类型"""
    KYC = "kyc"
    TRANSACTION = "transaction"
    ALL = "all"


class DataResetRequest(BaseModel):
    """数据重置请求"""
    confirmation: str = Field(..., description="确认文字，必须为 'RESET'")
    data_types: List[ResetDataType] = Field(
        default=[ResetDataType.ALL],
        description="要重置的数据类型列表"
    )


class DataResetResponse(BaseModel):
    """数据重置响应"""
    success: bool
    message: str
    reset_counts: dict = Field(default_factory=dict, description="各类型重置的记录数")


class ResetableDataInfo(BaseModel):
    """可重置数据的统计信息"""
    kyc_count: int = Field(default=0, description="KYC 记录数")
    transaction_count: int = Field(default=0, description="交易记录数")
    environment: str = Field(..., description="当前环境")


class TokenRecipient(BaseModel):
    """可接收代币的用户"""
    address: str = Field(..., description="钱包地址")
    kyc_status: Optional[str] = Field(None, description="KYC 状态")
    tag: Optional[str] = Field(None, description="用户标签")
    label: str = Field(..., description="显示标签")

