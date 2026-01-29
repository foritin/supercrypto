"""
公开常量路由 - 系统常量表 API

路由前缀: /api/v1/public/constants

提供统一的常量数据接口，支持:
- 获取所有常量分组
- 获取指定分组的常量列表
"""

from falib.utils.handlers import create_success_response
from fastapi import APIRouter, HTTPException, status

# 确保常量已注册
from src.shared.constants.registry import get_registry

router = APIRouter()


@router.get(
    "",
    summary="获取所有常量分组",
    description="返回系统中所有已注册的常量分组及其常量项",
)
async def get_all_constants():
    """
    获取所有常量分组

    返回所有已注册的常量分组，包含每个分组的常量项列表。
    每个常量项包含 value（值）、labels（多语言标签）和可选的 metadata（元数据）。

    Returns:
        包含所有常量分组的响应对象
    """
    registry = get_registry()
    all_groups = registry.get_all_groups()

    # 将 ConstantItem 对象转换为字典
    result = {
        group: [item.model_dump(mode="json") for item in items]
        for group, items in all_groups.items()
    }

    return create_success_response(object_data=result)


@router.get(
    "/{group}",
    summary="获取指定分组的常量",
    description="根据分组名称获取该分组下的所有常量项",
)
async def get_constants_by_group(group: str):
    """
    获取指定分组的常量

    Args:
        group: 常量分组名称，如 "asset_type"、"asset_status" 等

    Returns:
        包含该分组常量项列表的响应对象

    Raises:
        HTTPException: 当请求的分组不存在时返回 404 错误
    """
    registry = get_registry()
    items = registry.get_group(group)

    if items is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Constant group '{group}' not found",
        )

    return create_success_response(
        list_data=[item.model_dump(mode="json") for item in items]
    )
