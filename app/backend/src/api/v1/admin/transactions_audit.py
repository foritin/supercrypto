"""
管理员交易审计路由

路由前缀: /api/v1/admin/transactions/audit
"""
from datetime import datetime
from typing import Optional

from falib.utils.handlers import PaginationInfo, create_success_response
from fastapi import APIRouter, Depends, Query

from src.services.audit.transaction_service import (
    TransactionAuditService,
    transaction_audit_service,
)
from src.shared.schemas.enums.audit import TransactionAuditStatus, TransactionAuditType
from src.shared.security import require_admin

router = APIRouter()


# ============ 依赖注入 ============

def get_transaction_audit_service() -> TransactionAuditService:
    """获取交易审计服务实例"""
    return transaction_audit_service


# ============ Endpoints ============

@router.get(
    "",
    summary="查询交易审计",
    description="分页查询链上交易审计记录",
)
async def query_transactions(
    chain_id: Optional[int] = Query(None, description="链ID"),
    from_address: Optional[str] = Query(None, description="发送方地址"),
    to_address: Optional[str] = Query(None, description="接收方地址"),
    tx_type: Optional[TransactionAuditType] = Query(None, description="交易类型"),
    status: Optional[TransactionAuditStatus] = Query(None, description="交易状态"),
    token_address: Optional[str] = Query(None, description="Token地址"),
    operator_id: Optional[int] = Query(None, description="操作者ID"),
    start_time: Optional[datetime] = Query(None, description="开始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    service: TransactionAuditService = Depends(get_transaction_audit_service),
    _admin=Depends(require_admin),
):
    """
    查询交易审计记录

    支持的过滤条件：
    - chain_id: 链ID
    - from_address: 发送方地址
    - to_address: 接收方地址
    - tx_type: 交易类型 (transfer/token_transfer/token_approve/contract_deploy/contract_call/staking/unstaking/claim_reward/swap/other)
    - status: 交易状态 (pending/confirmed/failed/reverted/dropped)
    - token_address: Token合约地址
    - operator_id: 操作者ID
    - start_time/end_time: 时间范围
    """
    txs, total, total_pages = await service.query(
        chain_id=chain_id,
        from_address=from_address,
        to_address=to_address,
        tx_type=tx_type,
        status=status,
        token_address=token_address,
        operator_id=operator_id,
        start_time=start_time,
        end_time=end_time,
        page=page,
        page_size=page_size,
    )

    pagination = PaginationInfo(
        total=total, page=page, page_size=page_size, total_pages=total_pages
    )

    return create_success_response(
        list_data=txs,
        pagination=pagination,
    )


@router.get(
    "/stats",
    summary="获取交易统计",
    description="获取交易审计统计数据",
)
async def get_transaction_stats(
    chain_id: Optional[int] = Query(None, description="链ID"),
    start_time: Optional[datetime] = Query(None, description="开始时间"),
    end_time: Optional[datetime] = Query(None, description="结束时间"),
    service: TransactionAuditService = Depends(get_transaction_audit_service),
    _admin=Depends(require_admin),
):
    """
    获取交易统计数据

    返回：
    - total_transactions: 总交易数
    - pending_count: 待确认数
    - confirmed_count: 已确认数
    - failed_count: 失败数
    - reverted_count: 已回滚数
    - by_type: 按类型统计
    - by_chain: 按链统计
    - total_gas_used: 总Gas消耗
    - total_gas_cost: 总Gas费用
    """
    stats = await service.get_stats(
        chain_id=chain_id,
        start_time=start_time,
        end_time=end_time,
    )
    return create_success_response(object_data=stats)


@router.get(
    "/pending",
    summary="获取待确认交易",
    description="获取所有待确认的交易",
)
async def get_pending_transactions(
    chain_id: Optional[int] = Query(None, description="链ID"),
    service: TransactionAuditService = Depends(get_transaction_audit_service),
    _admin=Depends(require_admin),
):
    """
    获取待确认交易列表

    用于监控和处理待确认的链上交易
    """
    txs = await service.get_pending_transactions(chain_id=chain_id)
    return create_success_response(list_data=txs)


@router.get(
    "/{tx_hash}",
    summary="获取交易详情",
    description="根据交易哈希获取交易详情",
)
async def get_transaction(
    tx_hash: str,
    service: TransactionAuditService = Depends(get_transaction_audit_service),
    _admin=Depends(require_admin),
):
    """
    获取交易详情

    Args:
        tx_hash: 交易哈希
    """
    tx = await service.get_by_hash(tx_hash)
    return create_success_response(object_data=tx)
