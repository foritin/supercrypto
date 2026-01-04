"""
公开资产路由 - 资产列表、详情、价格历史

路由前缀: /api/v1/public/assets
"""

from typing import Optional

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.services.asset.service import AssetService
from src.shared.schemas.enums import AssetStatus, AssetType

router = APIRouter()


def get_asset_service() -> AssetService:
    """依赖注入：获取资产服务"""
    return AssetService()


@router.get("", summary="获取资产列表", description="获取所有可投资的 RWA 资产列表")
async def list_assets(
    asset_status: Optional[AssetStatus] = Query(None, alias="status", description="状态筛选"),
    asset_type: Optional[AssetType] = Query(None, description="类型筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    service: AssetService = Depends(get_asset_service),
):
    """
    获取资产列表

    - 支持按状态、类型筛选
    - 支持分页
    """
    items, total, total_pages = await service.list_assets(
        status=asset_status, asset_type=asset_type, page=page, page_size=page_size
    )

    return create_success_response(
        list_data=[item.model_dump(mode="json") for item in items],
        pagination={
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    )


@router.get(
    "/{asset_id}", summary="获取资产详情", description="根据ID获取资产的详细信息"
)
async def get_asset(asset_id: int, service: AssetService = Depends(get_asset_service)):
    """
    获取资产详情

    - **asset_id**: 资产ID
    """
    result = await service.get_asset(asset_id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found"
        )

    return create_success_response(object_data=result.model_dump(mode="json"))


@router.get(
    "/symbol/{symbol}",
    summary="根据符号获取资产",
    description="根据代币符号获取资产详情",
)
async def get_asset_by_symbol(
    symbol: str, service: AssetService = Depends(get_asset_service)
):
    """
    根据符号获取资产

    - **symbol**: 代币符号 (如 RWA001)
    """
    result = await service.get_asset_by_symbol(symbol)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset with symbol '{symbol}' not found",
        )

    return create_success_response(object_data=result.model_dump(mode="json"))


@router.get(
    "/{asset_id}/price-history",
    summary="获取价格历史",
    description="获取资产的价格更新历史记录",
)
async def get_price_history(
    asset_id: int,
    limit: int = Query(50, ge=1, le=200, description="返回条数"),
    service: AssetService = Depends(get_asset_service),
):
    """
    获取资产价格历史

    - **asset_id**: 资产ID
    - **limit**: 返回条数 (默认50)
    """
    history = await service.get_price_history(asset_id, limit)

    return create_success_response(
        list_data=[item.model_dump(mode="json") for item in history]
    )

