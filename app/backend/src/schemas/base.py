"""
base schema 定义 + 向后兼容导出 (IDMixin, TimestampMixin)
"""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

# 向后兼容: 部分模块从 base 导入 IDMixin/TimestampMixin
from src.schemas.mixins import IDMixin, TimestampMixin  # noqa: F401

T = TypeVar("T")


class PaginationParams(BaseModel):
    """通用分页参数基类"""

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)


class PaginatedResponse(BaseModel, Generic[T]):
    """通用分页响应泛型"""

    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ChainInfo(BaseModel):
    """链信息"""

    chain_id: int
    chain_name: str
    network: str
    rpc_url: str


class AddressInfo(BaseModel):
    """地址信息"""

    id: int
    scope: str
    contract_type: str
    status: str
    address: str
    deployer_address: str
    name: str
    abi_info: list


class InfoResponse(BaseModel):
    """基础信息响应"""

    chain_info: ChainInfo
    address_info: list[AddressInfo]
