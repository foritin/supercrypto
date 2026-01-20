"""
合约验证器
==========

提供合约地址格式验证和链上存在性验证功能。

Usage:
    from src.services.asset.validators import ContractValidator

    # 格式验证
    is_valid, error = ContractValidator.validate_address_format(address)

    # 链上验证
    exists, message = await ContractValidator.validate_contract_exists(address)
"""

import re
import time
from typing import Optional

import httpx
from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

logger = get_logger("asset.validator")


class ContractValidatorError(Exception):
    """合约验证异常"""

    pass


class ContractValidator:
    """
    合约验证器

    提供:
    - 地址格式验证
    - 链上存在验证
    - 验证结果缓存
    """

    # 验证结果缓存: {address: (exists, timestamp)}
    _cache: dict[str, tuple[bool, float]] = {}
    CACHE_TTL = 300  # 5分钟

    # 以太坊地址正则
    ADDRESS_PATTERN = re.compile(r"^0x[a-fA-F0-9]{40}$")

    @classmethod
    def validate_address_format(cls, address: str) -> tuple[bool, str]:
        """
        验证以太坊地址格式

        Args:
            address: 合约地址

        Returns:
            (is_valid, error_message)
        """
        if not address:
            return False, "地址不能为空"

        if not address.startswith("0x"):
            return False, "地址必须以 0x 开头"

        if len(address) != 42:
            return False, f"地址长度必须为 42 字符（当前 {len(address)}）"

        if not cls.ADDRESS_PATTERN.match(address):
            return False, "地址包含非法字符（只允许 0-9, a-f, A-F）"

        return True, ""

    @classmethod
    def _get_from_cache(cls, address: str) -> Optional[bool]:
        """从缓存获取验证结果"""
        address = address.lower()
        if address in cls._cache:
            exists, timestamp = cls._cache[address]
            if time.time() - timestamp < cls.CACHE_TTL:
                return exists
            else:
                del cls._cache[address]
        return None

    @classmethod
    def _set_cache(cls, address: str, exists: bool):
        """设置缓存"""
        cls._cache[address.lower()] = (exists, time.time())

    @classmethod
    async def validate_contract_exists(
        cls,
        address: str,
        use_cache: bool = True,
    ) -> tuple[bool, str]:
        """
        链上验证合约存在

        Args:
            address: 合约地址
            use_cache: 是否使用缓存

        Returns:
            (exists, message)
        """
        # 先验证格式
        is_valid, error = cls.validate_address_format(address)
        if not is_valid:
            return False, error

        # 检查缓存
        if use_cache:
            cached = cls._get_from_cache(address)
            if cached is not None:
                logger.debug(f"使用缓存的验证结果: {address} -> {cached}")
                return cached, "合约存在" if cached else "该地址不是合约地址（缓存）"

        # 链上验证 - 使用 JSON-RPC eth_getCode
        try:
            rpc_url = SETTINGS.CRYPTO.MAINNET_URL

            async with httpx.AsyncClient(timeout=10.0) as client:
                payload = {
                    "jsonrpc": "2.0",
                    "method": "eth_getCode",
                    "params": [address, "latest"],
                    "id": 1,
                }
                response = await client.post(rpc_url, json=payload)
                result = response.json()

                if "error" in result:
                    return (
                        False,
                        f"RPC 错误: {result['error'].get('message', 'unknown')}",
                    )

                code = result.get("result", "0x")

                # 判断是否是合约
                # 如果返回 '0x' 或空，说明不是合约（是 EOA 或不存在）
                if code in ("0x", "", None):
                    cls._set_cache(address, False)
                    return False, "该地址不是合约地址（无合约代码）"

                cls._set_cache(address, True)
                return True, "合约存在"

        except httpx.TimeoutException:
            return False, "链上验证超时"
        except Exception as e:
            logger.error(f"链上验证失败: {address}, error: {e}")
            return False, f"链上验证失败: {str(e)}"

    @classmethod
    async def validate_contracts_batch(
        cls,
        addresses: list[str],
    ) -> dict[str, tuple[bool, str]]:
        """
        批量验证合约

        Args:
            addresses: 地址列表

        Returns:
            {address: (exists, message)}
        """
        results = {}
        for address in addresses:
            exists, message = await cls.validate_contract_exists(address)
            results[address] = (exists, message)
        return results

    @classmethod
    def clear_cache(cls):
        """清空缓存"""
        cls._cache.clear()

    @classmethod
    async def validate_rwa_token_binding(
        cls,
        contract_addresses: list[str],
        rwa_token_name: str = "VankeRWAToken",
    ) -> tuple[bool, str, Optional[str]]:
        """
        验证合约绑定是否包含 RWA Token

        Args:
            contract_addresses: 绑定的合约地址列表
            rwa_token_name: RWA Token 合约名称

        Returns:
            (has_rwa_token, message, rwa_token_address)
        """
        from src.models import Contract

        if not contract_addresses:
            return False, "未绑定任何合约", None

        # 查询绑定的合约中是否有 RWA Token
        for address in contract_addresses:
            contract = await Contract.filter(
                address__iexact=address,
                name__icontains="RWAToken",
            ).first()

            if contract:
                return True, f"已绑定 RWA Token: {contract.name}", address

        return False, "未绑定 RWA Token 合约（必需）", None


__all__ = [
    "ContractValidator",
    "ContractValidatorError",
]
