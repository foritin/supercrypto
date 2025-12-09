"""
Transaction领域 - API路由
"""
from typing import Dict, Optional
from fastapi import APIRouter, Depends, Query, status

from src.domains.transaction.schemas import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionListQuery,
    TransactionStats
)
from src.domains.transaction.services import TransactionService
from src.shared.schemas.base import ApiResponse, PaginatedResponse
# from src.shared.dependencies import get_current_user

router = APIRouter()


def get_transaction_service() -> TransactionService:
    """依赖注入：获取交易服务"""
    return TransactionService()


@router.post(
    "/",
    response_model=ApiResponse[TransactionResponse],
    status_code=status.HTTP_201_CREATED,
    summary="记录交易",
    description="创建新的交易记录"
)
async def record_transaction(
    data: TransactionCreate,
    service: TransactionService = Depends(get_transaction_service)
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
    return ApiResponse(
        data=tx,
        message="Transaction recorded successfully"
    )


@router.get(
    "/{tx_id}",
    response_model=ApiResponse[TransactionResponse],
    summary="获取交易详情",
    description="根据交易ID获取交易详细信息"
)
async def get_transaction(
    tx_id: int,
    service: TransactionService = Depends(get_transaction_service)
):
    """
    获取交易详情
    
    - **tx_id**: 交易ID
    
    返回交易详细信息
    """
    tx = await service.get_transaction(tx_id)
    return ApiResponse(data=tx)


@router.get(
    "/hash/{tx_hash}",
    response_model=ApiResponse[TransactionResponse],
    summary="根据哈希查询交易",
    description="根据交易哈希查询交易信息"
)
async def get_transaction_by_hash(
    tx_hash: str,
    service: TransactionService = Depends(get_transaction_service)
):
    """
    根据哈希查询交易
    
    - **tx_hash**: 交易哈希
    
    返回交易信息或404
    """
    tx = await service.get_transaction_by_hash(tx_hash)
    if not tx:
        return ApiResponse(
            code=404,
            message="Transaction not found",
            data=None
        )
    return ApiResponse(data=tx)


@router.get(
    "/",
    response_model=ApiResponse[PaginatedResponse[TransactionResponse]],
    summary="查询交易列表",
    description="查询交易列表，支持多种过滤条件"
)
async def list_transactions(
    address: Optional[str] = Query(None, description="地址过滤（发送或接收）"),
    from_address: Optional[str] = Query(None, description="发送地址过滤"),
    to_address: Optional[str] = Query(None, description="接收地址过滤"),
    wallet_id: Optional[int] = Query(None, description="钱包ID过滤"),
    network: Optional[str] = Query(None, description="网络过滤"),
    status: Optional[str] = Query(None, description="状态过滤"),
    tx_type: Optional[str] = Query(None, description="交易类型过滤"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    service: TransactionService = Depends(get_transaction_service)
):
    """
    查询交易列表
    
    支持的过滤参数：
    - **address**: 地址（发送或接收）
    - **from_address**: 发送地址
    - **to_address**: 接收地址
    - **wallet_id**: 钱包ID
    - **network**: 网络类型
    - **status**: 交易状态
    - **tx_type**: 交易类型
    - **page**: 页码（从1开始）
    - **page_size**: 每页数量（1-100）
    
    返回分页的交易列表
    """
    query = TransactionListQuery(
        address=address,
        from_address=from_address,
        to_address=to_address,
        wallet_id=wallet_id,
        network=network,
        status=status,
        tx_type=tx_type,
        page=page,
        page_size=page_size
    )
    
    transactions, total, total_pages = await service.list_transactions(query)
    
    paginated = PaginatedResponse(
        items=transactions,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
    
    return ApiResponse(data=paginated)


@router.get(
    "/address/{address}/history",
    response_model=ApiResponse[PaginatedResponse[TransactionResponse]],
    summary="查询地址交易历史",
    description="查询指定地址的所有交易历史"
)
async def get_address_transactions(
    address: str,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    service: TransactionService = Depends(get_transaction_service)
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
    
    paginated = PaginatedResponse(
        items=transactions,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
    
    return ApiResponse(data=paginated)


@router.get(
    "/wallet/{wallet_id}/history",
    response_model=ApiResponse[PaginatedResponse[TransactionResponse]],
    summary="查询钱包交易历史",
    description="查询指定钱包的所有交易历史"
)
async def get_wallet_transactions(
    wallet_id: int,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    service: TransactionService = Depends(get_transaction_service)
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
    
    paginated = PaginatedResponse(
        items=transactions,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
    
    return ApiResponse(data=paginated)


@router.get(
    "/stats",
    response_model=ApiResponse[TransactionStats],
    summary="获取交易统计",
    description="获取交易统计信息"
)
async def get_transaction_stats(
    address: Optional[str] = Query(None, description="按地址统计"),
    wallet_id: Optional[int] = Query(None, description="按钱包ID统计"),
    service: TransactionService = Depends(get_transaction_service)
):
    """
    获取交易统计
    
    - **address**: 地址（可选）
    - **wallet_id**: 钱包ID（可选）
    
    如果不提供参数，返回全部交易统计
    """
    stats = await service.get_transaction_stats(address, wallet_id)
    return ApiResponse(data=stats)


@router.put(
    "/{tx_id}",
    response_model=ApiResponse[TransactionResponse],
    summary="更新交易信息",
    description="更新交易状态、区块信息等"
)
async def update_transaction(
    tx_id: int,
    data: TransactionUpdate,
    service: TransactionService = Depends(get_transaction_service)
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
    return ApiResponse(
        data=tx,
        message="Transaction updated successfully"
    )


# @router.delete(
#     "/{tx_id}",
#     response_model=ApiResponse[Dict],
#     summary="删除交易",
#     description="删除指定的交易记录"
# )
# async def delete_transaction(
#     tx_id: int,
#     service: TransactionService = Depends(get_transaction_service),
#     current_user: Dict = Depends(get_current_user)  # 需要认证
# ):
#     """
#     删除交易
    
#     - **tx_id**: 交易ID
    
#     需要认证才能删除交易
    
#     返回删除成功消息
#     """
#     await service.delete_transaction(tx_id)
#     return ApiResponse(
#         data={"tx_id": tx_id},
#         message="Transaction deleted successfully"
#     )

