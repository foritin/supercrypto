"""
审计服务 Schemas

定义审计服务的请求/响应数据结构
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from src.shared.schemas.enums import AuditAction, AuditCategory, AuditStatus
from src.shared.schemas.enums.audit import (
    TransactionAuditStatus,
    TransactionAuditType,
)


# ==================== 审计日志 Schemas ====================

class AuditLogCreate(BaseModel):
    """创建审计日志"""
    category: AuditCategory
    action: AuditAction
    status: AuditStatus = AuditStatus.SUCCESS
    # 操作者信息
    operator_id: Optional[int] = None
    operator_address: Optional[str] = None
    operator_type: Optional[str] = None  # user | admin | system
    # 目标信息
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    target_address: Optional[str] = None
    # 操作详情
    description: Optional[str] = None
    reason: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    extra_data: Optional[Dict[str, Any]] = None
    # 请求上下文
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    # 区块链关联
    tx_hash: Optional[str] = None
    # 性能
    duration_ms: Optional[int] = None
    # 错误信息
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class AuditLogResponse(BaseModel):
    """审计日志响应"""
    id: int
    category: AuditCategory
    action: AuditAction
    status: AuditStatus
    # 操作者信息
    operator_id: Optional[int] = None
    operator_address: Optional[str] = None
    operator_type: Optional[str] = None
    # 目标信息
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    target_address: Optional[str] = None
    # 操作详情
    description: Optional[str] = None
    reason: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    extra_data: Optional[Dict[str, Any]] = None
    # 请求上下文
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    # 区块链关联
    tx_hash: Optional[str] = None
    block_number: Optional[int] = None
    gas_used: Optional[int] = None
    # 时间和性能
    operated_at: datetime
    duration_ms: Optional[int] = None
    # 错误信息
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    # 环境
    environment: str

    class Config:
        from_attributes = True


class AuditLogQuery(BaseModel):
    """审计日志查询参数"""
    category: Optional[AuditCategory] = None
    action: Optional[AuditAction] = None
    operator_id: Optional[int] = None
    operator_type: Optional[str] = None
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    status: Optional[AuditStatus] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    tx_hash: Optional[str] = None
    ip_address: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class AuditStats(BaseModel):
    """审计统计数据"""
    total_operations: int = 0
    success_count: int = 0
    failed_count: int = 0
    pending_count: int = 0
    # 按类别统计
    by_category: Dict[str, int] = Field(default_factory=dict)
    # 按操作统计
    by_action: Dict[str, int] = Field(default_factory=dict)
    # 时间范围
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


# ==================== 交易审计 Schemas ====================

class TransactionAuditCreate(BaseModel):
    """创建交易审计记录"""
    tx_hash: str
    chain_id: int
    network: str
    from_address: str
    to_address: Optional[str] = None
    value: str = "0"
    tx_type: TransactionAuditType
    # Token 信息
    token_address: Optional[str] = None
    token_symbol: Optional[str] = None
    token_decimals: Optional[int] = None
    token_amount: Optional[str] = None
    # 关联信息
    operator_id: Optional[int] = None
    related_audit_id: Optional[int] = None
    contract_name: Optional[str] = None
    function_name: Optional[str] = None
    function_args: Optional[Dict[str, Any]] = None
    # Gas 信息
    gas_price: Optional[str] = None
    gas_limit: Optional[int] = None
    nonce: Optional[int] = None
    # 其他
    description: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None


class TransactionAuditResponse(BaseModel):
    """交易审计响应"""
    id: int
    tx_hash: str
    chain_id: int
    network: str
    from_address: str
    to_address: Optional[str] = None
    value: str
    tx_type: TransactionAuditType
    status: TransactionAuditStatus
    # Token 信息
    token_address: Optional[str] = None
    token_symbol: Optional[str] = None
    token_decimals: Optional[int] = None
    token_amount: Optional[str] = None
    # 合约调用信息
    contract_name: Optional[str] = None
    function_name: Optional[str] = None
    function_args: Optional[Dict[str, Any]] = None
    # Gas 信息
    gas_price: Optional[str] = None
    gas_limit: Optional[int] = None
    gas_used: Optional[int] = None
    effective_gas_price: Optional[str] = None
    gas_cost: Optional[str] = None
    # 区块信息
    block_number: Optional[int] = None
    block_timestamp: Optional[datetime] = None
    nonce: Optional[int] = None
    # 关联信息
    operator_id: Optional[int] = None
    related_audit_id: Optional[int] = None
    # 其他
    description: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    # 时间戳
    created_at: datetime
    updated_at: datetime
    confirmed_at: Optional[datetime] = None
    # 环境
    environment: str

    class Config:
        from_attributes = True


class TransactionAuditQuery(BaseModel):
    """交易审计查询参数"""
    chain_id: Optional[int] = None
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    tx_type: Optional[TransactionAuditType] = None
    status: Optional[TransactionAuditStatus] = None
    token_address: Optional[str] = None
    operator_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class TransactionAuditStatusUpdate(BaseModel):
    """交易状态更新"""
    status: TransactionAuditStatus
    block_number: Optional[int] = None
    block_timestamp: Optional[datetime] = None
    gas_used: Optional[int] = None
    effective_gas_price: Optional[str] = None
    error_message: Optional[str] = None


class TransactionStats(BaseModel):
    """交易统计数据"""
    total_transactions: int = 0
    pending_count: int = 0
    confirmed_count: int = 0
    failed_count: int = 0
    reverted_count: int = 0
    # 按类型统计
    by_type: Dict[str, int] = Field(default_factory=dict)
    # 按链统计
    by_chain: Dict[int, int] = Field(default_factory=dict)
    # Gas 统计
    total_gas_used: int = 0
    total_gas_cost: str = "0"
    # 时间范围
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
