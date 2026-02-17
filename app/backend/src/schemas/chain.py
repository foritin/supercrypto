"""
Chain Domain - Schemas

区块链网络配置相关的响应 Schema 定义
"""

from pydantic import BaseModel, ConfigDict


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

    model_config = ConfigDict(from_attributes=True)


class ChainsListResponse(BaseModel):
    """网络列表响应"""

    chains: list[ChainResponse]
    count: int
