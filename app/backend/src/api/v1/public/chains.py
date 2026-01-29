"""
区块链网络 API 路由

提供公开的网络配置查询接口，供前端获取可用网络列表。
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel

from src.models.chain import Chain

router = APIRouter()


class ChainResponse(BaseModel):
    """网络配置响应"""

    chain_id: int
    name: str
    display_name: str
    symbol: str
    decimals: int
    rpc_url: str
    rpc_url_backup: str | None
    block_explorer: str | None
    is_testnet: bool
    icon: str | None

    class Config:
        from_attributes = True


class ChainsListResponse(BaseModel):
    """网络列表响应"""

    chains: list[ChainResponse]
    count: int


@router.get("", response_model=ChainsListResponse, summary="获取可用网络列表")
async def get_chains(
    environment: str | None = Query(
        None, description="环境筛选: development / production，为空返回所有启用的网络"
    ),
):
    """
    获取当前环境可用的区块链网络列表

    - **development**: 返回开发环境网络 (Hardhat, Sepolia)
    - **production**: 返回生产环境网络 (Ethereum, Arbitrum)
    - **不传**: 返回所有启用的网络
    """
    chains = await Chain.get_enabled_chains(environment)
    return ChainsListResponse(
        chains=[ChainResponse.model_validate(c) for c in chains], count=len(chains)
    )


@router.get(
    "/{chain_id}", response_model=ChainResponse | None, summary="获取指定网络配置"
)
async def get_chain_by_id(chain_id: int):
    """
    根据链 ID 获取网络配置

    - **chain_id**: 链 ID，如 1 (Ethereum), 31337 (Hardhat)
    """
    chain = await Chain.get_by_chain_id(chain_id)
    if not chain:
        return None
    return ChainResponse.model_validate(chain)
