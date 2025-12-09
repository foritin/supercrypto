"""
Wallet领域 - API路由
"""
from typing import Dict, Optional
from fastapi import APIRouter, Depends, Query, status

from src.domains.wallet.schemas import (
    WalletCreate,
    WalletImport,
    WalletUpdate,
    WalletResponse,
    TransferRequest,
    TransferResponse,
    BalanceResponse
)
from src.domains.wallet.services import WalletService
from src.shared.schemas.base import ApiResponse, PaginatedResponse
# from src.shared.dependencies import get_current_user

router = APIRouter()


def get_wallet_service() -> WalletService:
    """依赖注入：获取钱包服务"""
    return WalletService()


@router.post(
    "/",
    response_model=ApiResponse[WalletResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建钱包",
    description="生成新的钱包地址和私钥"
)
async def create_wallet(
    data: WalletCreate,
    service: WalletService = Depends(get_wallet_service)
):
    """
    创建钱包
    
    - **network**: 网络类型 (ethereum/bsc/polygon等)
    - **tag**: 标签（可选）
    - **account_id**: 关联的账户ID（可选）
    
    返回新创建的钱包信息（不包含私钥）
    """
    wallet = await service.create_wallet(data)
    return ApiResponse(
        data=wallet,
        message="Wallet created successfully"
    )


@router.post(
    "/import",
    response_model=ApiResponse[WalletResponse],
    status_code=status.HTTP_201_CREATED,
    summary="导入钱包",
    description="从私钥导入现有钱包"
)
async def import_wallet(
    data: WalletImport,
    service: WalletService = Depends(get_wallet_service)
):
    """
    导入钱包
    
    - **private_key**: 私钥（必填）
    - **network**: 网络类型
    - **tag**: 标签（可选）
    - **account_id**: 关联的账户ID（可选）
    
    返回导入的钱包信息
    """
    wallet = await service.import_wallet(data)
    return ApiResponse(
        data=wallet,
        message="Wallet imported successfully"
    )


@router.get(
    "/{wallet_id}",
    response_model=ApiResponse[WalletResponse],
    summary="获取钱包详情",
    description="根据钱包ID获取钱包详细信息"
)
async def get_wallet(
    wallet_id: int,
    service: WalletService = Depends(get_wallet_service)
):
    """
    获取钱包详情
    
    - **wallet_id**: 钱包ID
    
    返回钱包详细信息（包含数据库缓存的余额）
    """
    wallet = await service.get_wallet(wallet_id)
    return ApiResponse(data=wallet)


@router.get(
    "/{wallet_id}/balance",
    response_model=ApiResponse[BalanceResponse],
    summary="查询钱包余额",
    description="从区块链实时查询钱包余额"
)
async def get_wallet_balance(
    wallet_id: int,
    service: WalletService = Depends(get_wallet_service)
):
    """
    查询钱包余额
    
    - **wallet_id**: 钱包ID
    
    从区块链实时查询余额并更新数据库
    """
    balance = await service.get_balance(wallet_id)
    return ApiResponse(data=balance)


@router.post(
    "/{wallet_id}/transfer",
    response_model=ApiResponse[TransferResponse],
    summary="转账",
    description="从钱包发送转账交易"
)
async def transfer_funds(
    wallet_id: int,
    data: TransferRequest,
    service: WalletService = Depends(get_wallet_service)
):
    """
    转账
    
    - **wallet_id**: 钱包ID
    - **to_address**: 目标地址
    - **amount**: 金额（Ether单位）
    - **gas_price**: Gas价格（Gwei，可选）
    - **gas_limit**: Gas限制（可选）
    
    返回交易哈希和状态
    """
    result = await service.transfer(wallet_id, data)
    return ApiResponse(
        data=result,
        message="Transaction submitted successfully"
    )


@router.post(
    "/{wallet_id}/sync",
    response_model=ApiResponse[WalletResponse],
    summary="同步余额",
    description="从区块链同步余额到数据库"
)
async def sync_wallet_balance(
    wallet_id: int,
    service: WalletService = Depends(get_wallet_service)
):
    """
    同步余额
    
    - **wallet_id**: 钱包ID
    
    从区块链查询最新余额并更新数据库
    """
    wallet = await service.sync_balance(wallet_id)
    return ApiResponse(
        data=wallet,
        message="Balance synced successfully"
    )


@router.get(
    "/",
    response_model=ApiResponse[PaginatedResponse[WalletResponse]],
    summary="查询钱包列表",
    description="查询钱包列表，支持分页和过滤"
)
async def list_wallets(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    account_id: Optional[int] = Query(None, description="按账户ID过滤"),
    network: Optional[str] = Query(None, description="按网络类型过滤"),
    service: WalletService = Depends(get_wallet_service)
):
    """
    查询钱包列表
    
    支持的过滤参数：
    - **account_id**: 按账户ID过滤
    - **network**: 按网络类型过滤
    - **page**: 页码（从1开始）
    - **page_size**: 每页数量（1-100）
    
    返回分页的钱包列表
    """
    wallets, total, total_pages = await service.list_wallets(
        page=page,
        page_size=page_size,
        account_id=account_id,
        network=network
    )
    
    paginated = PaginatedResponse(
        items=wallets,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
    
    return ApiResponse(data=paginated)


@router.put(
    "/{wallet_id}",
    response_model=ApiResponse[WalletResponse],
    summary="更新钱包",
    description="更新钱包信息（标签、激活状态等）"
)
async def update_wallet(
    wallet_id: int,
    data: WalletUpdate,
    service: WalletService = Depends(get_wallet_service)
):
    """
    更新钱包
    
    - **wallet_id**: 钱包ID
    - **tag**: 新标签（可选）
    - **is_active**: 激活状态（可选）
    
    返回更新后的钱包信息
    """
    wallet = await service.update_wallet(wallet_id, data)
    return ApiResponse(
        data=wallet,
        message="Wallet updated successfully"
    )


# @router.delete(
#     "/{wallet_id}",
#     response_model=ApiResponse[Dict],
#     summary="删除钱包",
#     description="删除指定的钱包"
# )
# async def delete_wallet(
#     wallet_id: int,
#     service: WalletService = Depends(get_wallet_service),
#     current_user: Dict = Depends(get_current_user)  # 需要认证
# ):
#     """
#     删除钱包
    
#     - **wallet_id**: 钱包ID
    
#     需要认证才能删除钱包
    
#     返回删除成功消息
#     """
#     await service.delete_wallet(wallet_id)
#     return ApiResponse(
#         data={"wallet_id": wallet_id},
#         message="Wallet deleted successfully"
#     )
