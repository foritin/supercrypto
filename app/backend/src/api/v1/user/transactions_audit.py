"""
用户交易审计路由

路由前缀: /api/v1/user/transactions/audit

用于记录前端发起的链上交易，包括：
- Token Approve/Transfer
- 认购/质押操作
- 合约调用
"""

from typing import Optional

from falib.utils.handlers import PaginationInfo, create_success_response
from fastapi import APIRouter, Depends, HTTPException, Request, status

from src.services.audit.schemas import (
    RecordTransactionRequest,
    UpdateTransactionStatusRequest,
)
from src.services.audit.transaction_service import (
    TransactionAuditService,
    transaction_audit_service,
)
from src.shared.schemas.enums.audit import TransactionAuditStatus, TransactionAuditType

router = APIRouter()


# ============ 依赖注入 ============


def get_transaction_audit_service() -> TransactionAuditService:
    """获取交易审计服务实例"""
    return transaction_audit_service


# ============ Endpoints ============


@router.post(
    "",
    summary="记录交易",
    description="记录前端发起的链上交易",
)
async def record_transaction(
    data: RecordTransactionRequest,
    request: Request,
    service: TransactionAuditService = Depends(get_transaction_audit_service),
):
    """
    记录交易

    在前端发送交易后调用此接口，用于审计追踪。

    支持的交易类型：
    - transfer: ETH 转账
    - token_transfer: Token 转账
    - token_approve: Token 授权
    - contract_call: 合约调用
    - staking: 质押
    - unstaking: 解质押
    - claim_reward: 领取奖励
    """
    # 获取当前用户信息
    user = getattr(request.state, "user", None)
    operator_id = user.id if user else None

    # 验证 from_address 与当前用户钱包地址匹配
    if user and user.wallet_address:
        if data.from_address.lower() != user.wallet_address.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Transaction from_address does not match current user wallet",
            )

    try:
        tx = await service.record_transaction(
            tx_hash=data.tx_hash,
            chain_id=data.chain_id,
            network=data.network,
            from_address=data.from_address,
            to_address=data.to_address,
            value=data.value,
            tx_type=data.tx_type,
            token_address=data.token_address,
            token_symbol=data.token_symbol,
            token_decimals=data.token_decimals,
            token_amount=data.token_amount,
            operator_id=operator_id,
            contract_name=data.contract_name,
            function_name=data.function_name,
            function_args=data.function_args,
            gas_price=data.gas_price,
            gas_limit=data.gas_limit,
            nonce=data.nonce,
            description=data.description,
            extra_data=data.extra_data,
        )

        return create_success_response(
            object_data=service._to_response(tx),
            msg="Transaction recorded successfully",
        )
    except Exception as e:
        # 如果是重复交易，返回成功（幂等性）
        if "already exists" in str(e):
            existing = await service.get_by_hash(data.tx_hash)
            return create_success_response(
                object_data=existing,
                msg="Transaction already recorded",
            )
        raise


@router.post(
    "/{tx_hash}/status",
    summary="更新交易状态",
    description="更新交易的确认状态",
)
async def update_transaction_status(
    tx_hash: str,
    data: UpdateTransactionStatusRequest,
    request: Request,
    service: TransactionAuditService = Depends(get_transaction_audit_service),
):
    """
    更新交易状态

    在交易确认后调用此接口更新状态。

    状态值：
    - confirmed: 已确认
    - failed: 失败
    - reverted: 已回滚
    """
    # 获取当前用户信息
    user = getattr(request.state, "user", None)

    # 获取交易记录
    tx_record = await service.get_by_hash(tx_hash)

    # 验证是否是交易发起者
    if user and user.wallet_address:
        if tx_record.from_address.lower() != user.wallet_address.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only transaction sender can update status",
            )

    tx = await service.update_status(
        tx_hash=tx_hash,
        status=data.status,
        block_number=data.block_number,
        gas_used=data.gas_used,
        effective_gas_price=data.effective_gas_price,
        error_message=data.error_message,
    )

    return create_success_response(
        object_data=service._to_response(tx),
        msg="Transaction status updated",
    )


@router.get(
    "/my",
    summary="获取我的交易",
    description="获取当前用户的交易记录",
)
async def get_my_transactions(
    request: Request,
    page: int = 1,
    page_size: int = 20,
    tx_type: Optional[TransactionAuditType] = None,
    tx_status: Optional[TransactionAuditStatus] = None,
    service: TransactionAuditService = Depends(get_transaction_audit_service),
):
    """
    获取当前用户的交易记录
    """
    user = getattr(request.state, "user", None)
    if not user or not user.wallet_address:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User wallet address not found",
        )

    txs, total, total_pages = await service.query(
        from_address=user.wallet_address,
        tx_type=tx_type,
        status=tx_status,
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
