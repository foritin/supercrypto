"""
管理员交易路由 - 交易记录管理

路由前缀: /api/v1/admin/transactions
"""

from typing import Optional

from falib.utils.handlers import (
    PaginationInfo,
    create_success_response,
)
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse

from src.common.dependencies import get_transaction_service
from src.common.exceptions import NotFoundException
from src.schemas.transaction import (
    TransactionCreate,
    TransactionListQuery,
    TransactionUpdate,
)
from src.services import TransactionService

router = APIRouter()


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Record Transaction",
    description="Create a new transaction record",
)
async def record_transaction(
    data: TransactionCreate,
    service: TransactionService = Depends(get_transaction_service),
):
    """
    记录交易

    - **tx_hash**: 交易哈希（必填）
    - **from_address**: 发送地址（必填）
    - **to_address**: 接收地址（必填）
    - **amount**: 金额（必填）
    - **network**: 网络类型
    - **status**: 状态 (pending/confirmed/failed)
    - **tx_type**: 交易类型 (transfer/contract/mint/swap)

    返回创建的交易记录
    """
    tx = await service.record_transaction(data)
    return create_success_response(
        object_data=tx.model_dump(mode="json") if hasattr(tx, "model_dump") else tx,
        msg="Transaction recorded successfully",
    )


@router.get(
    "/{tx_id}",
    summary="Get Transaction Detail",
    description="Get detailed transaction information by ID",
)
async def get_transaction(
    tx_id: int, service: TransactionService = Depends(get_transaction_service)
):
    """
    获取交易详情

    - **tx_id**: 交易ID

    返回交易详细信息
    """
    tx = await service.get_transaction(tx_id)
    return create_success_response(
        object_data=tx.model_dump(mode="json") if hasattr(tx, "model_dump") else tx
    )


@router.get(
    "/hash/{tx_hash}",
    summary="Get Transaction by Hash",
    description="Get transaction information by transaction hash",
)
async def get_transaction_by_hash(
    tx_hash: str, service: TransactionService = Depends(get_transaction_service)
):
    """
    根据哈希查询交易

    - **tx_hash**: 交易哈希

    返回交易信息或404
    """
    tx = await service.get_transaction_by_hash(tx_hash)
    if not tx:
        raise NotFoundException(message="Transaction not found")
    return create_success_response(
        object_data=tx.model_dump(mode="json") if hasattr(tx, "model_dump") else tx
    )


@router.get(
    "",
    summary="List Transactions",
    description="List transactions with multiple filter conditions",
)
async def list_transactions(
    address: Optional[str] = Query(None, description="地址过滤（发送或接收）"),
    from_address: Optional[str] = Query(None, description="发送地址过滤"),
    to_address: Optional[str] = Query(None, description="接收地址过滤"),
    wallet_id: Optional[int] = Query(None, description="钱包ID过滤"),
    network: Optional[str] = Query(None, description="网络过滤"),
    tx_status: Optional[str] = Query(None, alias="status", description="状态过滤"),
    tx_type: Optional[str] = Query(None, description="交易类型过滤"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    service: TransactionService = Depends(get_transaction_service),
):
    """查询交易列表 — 支持按地址/网络/状态/类型等多条件过滤"""
    query = TransactionListQuery(
        address=address,
        from_address=from_address,
        to_address=to_address,
        wallet_id=wallet_id,
        network=network,
        status=tx_status,
        tx_type=tx_type,
        page=page,
        page_size=page_size,
    )
    transactions, total, total_pages = await service.list_transactions(query)

    return create_success_response(
        list_data=[
            tx.model_dump(mode="json") if hasattr(tx, "model_dump") else tx
            for tx in transactions
        ],
        pagination=PaginationInfo(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


@router.get(
    "/address/{address}/history",
    summary="Get Address Transaction History",
    description="Get all transaction history for a specific address",
)
async def get_address_transactions(
    address: str,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    service: TransactionService = Depends(get_transaction_service),
):
    """
    查询地址交易历史

    - **address**: 地址
    - **page**: 页码
    - **page_size**: 每页数量

    返回该地址作为发送方或接收方的所有交易
    """
    transactions, total, total_pages = await service.get_address_transactions(
        address, page, page_size
    )

    return create_success_response(
        list_data=[
            tx.model_dump(mode="json") if hasattr(tx, "model_dump") else tx
            for tx in transactions
        ],
        pagination=PaginationInfo(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


@router.get(
    "/wallet/{wallet_id}/history",
    summary="Get Wallet Transaction History",
    description="Get all transaction history for a specific wallet",
)
async def get_wallet_transactions(
    wallet_id: int,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    service: TransactionService = Depends(get_transaction_service),
):
    """
    查询钱包交易历史

    - **wallet_id**: 钱包ID
    - **page**: 页码
    - **page_size**: 每页数量

    返回该钱包的所有交易记录
    """
    transactions, total, total_pages = await service.get_wallet_transactions(
        wallet_id, page, page_size
    )

    return create_success_response(
        list_data=[
            tx.model_dump(mode="json") if hasattr(tx, "model_dump") else tx
            for tx in transactions
        ],
        pagination=PaginationInfo(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        ),
    )


@router.get(
    "/stats",
    summary="Get Transaction Stats",
    description="Get transaction statistics",
)
async def get_transaction_stats(
    address: Optional[str] = Query(None, description="按地址统计"),
    wallet_id: Optional[int] = Query(None, description="按钱包ID统计"),
    service: TransactionService = Depends(get_transaction_service),
):
    """
    获取交易统计

    - **address**: 地址（可选）
    - **wallet_id**: 钱包ID（可选）

    如果不提供参数，返回全部交易统计
    """
    stats = await service.get_transaction_stats(address, wallet_id)
    return create_success_response(
        object_data=stats.model_dump(mode="json")
        if hasattr(stats, "model_dump")
        else stats
    )


@router.get(
    "/export",
    summary="Export Transactions",
    description="Export transaction records in CSV format",
)
async def export_transactions(
    address: Optional[str] = Query(None, description="按地址筛选"),
    tx_status: Optional[str] = Query(None, alias="status", description="按状态筛选"),
    tx_type: Optional[str] = Query(None, description="按类型筛选"),
    format: str = Query("csv", description="导出格式 (csv)"),
    service: TransactionService = Depends(get_transaction_service),
):
    """
    导出交易记录

    - **address**: 地址筛选（可选）
    - **status**: 状态筛选（可选）
    - **tx_type**: 类型筛选（可选）
    - **format**: 导出格式，目前仅支持 csv

    返回 CSV 文件
    """
    query = TransactionListQuery(
        address=address,
        status=tx_status,
        tx_type=tx_type,
        page=1,
        page_size=10000,
    )
    csv_content = await service.export_to_csv(query)

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )


@router.put(
    "/{tx_id}",
    summary="Update Transaction",
    description="Update transaction status, block info, etc.",
)
async def update_transaction(
    tx_id: int,
    data: TransactionUpdate,
    service: TransactionService = Depends(get_transaction_service),
):
    """
    更新交易信息

    - **tx_id**: 交易ID
    - **status**: 新状态（可选）
    - **gas_used**: Gas使用量（可选）
    - **block_number**: 区块号（可选）
    - **block_timestamp**: 区块时间（可选）
    - **note**: 备注（可选）

    返回更新后的交易信息
    """
    tx = await service.update_transaction(tx_id, data)
    return create_success_response(
        msg="Transaction updated successfully",
        object_data=tx.model_dump(mode="json") if hasattr(tx, "model_dump") else tx,
    )
