"""
区块链网络服务 — 提供链配置查询

路由层通过此服务访问 Chain 模型，避免 API 层直接导入 ORM 模型。
"""

from falib.utils.log import get_logger

from src.models.chain import Chain

logger = get_logger("supercrypto.service.chain")


class ChainService:
    """区块链网络配置服务"""

    # ============ 查询 ============

    async def get_enabled_chains(self, environment: str | None = None) -> list:
        """获取启用的网络列表"""
        return await Chain.get_enabled_chains(environment)

    async def get_by_chain_id(self, chain_id: int):
        """根据链 ID 获取网络配置"""
        return await Chain.get_by_chain_id(chain_id)
