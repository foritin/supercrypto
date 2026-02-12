"""
KYC 合约服务 (Story 2.8)

与 KYC 智能合约交互：
- add_investor: 添加投资者 (审核通过后调用)
- is_verified: 查询投资者验证状态
- get_investor_info: 获取投资者完整信息

合约查找方式: scope=global + contract_type=kyc (唯一标识)
"""

import asyncio
import json
from pathlib import Path
from typing import Optional, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.models.account import Account
from src.shared.common.chain_logger import ChainLogger
from src.shared.common.metrics import start_timer
from src.shared.schemas.enums import Network
from src.shared.schemas.enums.contract import ContractScope, ContractType

logger = get_logger("business.kyc.contract")
chain_log = ChainLogger("business.kyc.contract")

# 本地 ABI 文件目录 (fallback)
LOCAL_ABI_PATH = Path(__file__).parent.parent.parent.parent / ".build" / "abi"


class KycContractService:
    """KYC 合约服务"""

    # C-02: 类级别 nonce 锁 — 防止并发交易 nonce 冲突
    _nonce_lock = asyncio.Lock()

    def __init__(self):
        self._web3 = None
        self._contract = None
        self._contract_address = None
        self._deployment = None

    @property
    def web3(self):
        """懒加载 Web3 实例"""
        if self._web3 is None:
            from web3 import AsyncHTTPProvider, AsyncWeb3

            rpc_url = SETTINGS.crypto.mainnet_url
            self._web3 = AsyncWeb3(AsyncHTTPProvider(rpc_url))
            logger.debug(f"Initialized Web3 with RPC: {rpc_url}")
        return self._web3

    async def _get_admin_private_key(self) -> str:
        """
        获取 admin 账户私钥

        根据当前环境查找对应的 admin 账户
        """

        env = SETTINGS.environment

        # 环境映射到 Network 枚举
        net_type_map = {
            "hardhat": Network.HARDHAT,
            "sepolia": Network.SEPOLIA,
            "mainnet": Network.ETHEREUM,
        }
        net_type = net_type_map.get(env, Network.HARDHAT)

        admin = await Account.filter(tag="admin", network=net_type).first()
        if not admin:
            raise ValueError(f"Admin account not found for {env} environment")

        logger.debug(f"Found admin account: {admin.address}")
        return admin.private_key

    async def _get_contract_deployment(self):
        """
        获取 KYC 合约部署记录

        通过 scope=global + contract_type=kyc 唯一标识查找，
        避免硬编码合约名称。
        """
        if self._deployment is None:
            from src.models.contracts.contract_deployment import ContractDeployment
            from src.shared.schemas.enums import ContractStatus

            self._deployment = await ContractDeployment.filter(
                scope=ContractScope.GLOBAL,
                contract_type=ContractType.KYC,
                network=SETTINGS.network,
                status=ContractStatus.ACTIVE,
            ).first()

            if not self._deployment:
                raise ValueError("KYC 合约未部署 (scope=global, contract_type=kyc)")

            logger.debug(
                f"KYC contract: name={self._deployment.name}, "
                f"address={self._deployment.address}"
            )

        return self._deployment

    async def _get_contract_address(self) -> str:
        """获取 KYC 合约地址"""
        if self._contract_address is None:
            deployment = await self._get_contract_deployment()
            self._contract_address = deployment.address

        return self._contract_address

    async def _get_contract(self):
        """获取 KYC 合约实例，ABI 从部署记录的 abi_path 或本地文件加载"""
        if self._contract is None:
            deployment = await self._get_contract_deployment()
            address = deployment.address

            # 优先从 MinIO (abi_path) 加载
            abi = await self._load_abi(deployment)

            self._contract = self.web3.eth.contract(
                address=self.web3.to_checksum_address(address),
                abi=abi,
            )

        return self._contract

    async def _load_abi(self, deployment) -> list:
        """
        加载合约 ABI，按优先级尝试:
        1. MinIO (deployment.abi_path)
        2. 本地 .build/abi/{name}.json

        兼容两种 JSON 格式:
        - 纯数组: [{...}, {...}]  (ape compile 输出)
        - 对象包装: {"abi": [{...}, {...}]}  (Hardhat/Foundry 输出)
        """
        # 1. 尝试从 MinIO 加载
        if deployment.abi_path:
            try:
                from src.shared.common.adapters import get_async_minio_adapter

                async with get_async_minio_adapter() as minio:
                    artifact = await minio.get_json(deployment.abi_path)
                    abi = self._extract_abi(artifact)
                    logger.debug(f"ABI loaded from MinIO: {deployment.abi_path}")
                    return abi
            except Exception as e:
                logger.warning(f"Failed to load ABI from MinIO: {e}, trying local")

        # 2. 本地 fallback
        abi_file = LOCAL_ABI_PATH / f"{deployment.name}.json"
        if not abi_file.exists():
            raise FileNotFoundError(
                f"ABI 文件未找到: {abi_file} (合约: {deployment.name})"
            )

        with open(abi_file) as f:
            artifact = json.load(f)

        return self._extract_abi(artifact)

    @staticmethod
    def _extract_abi(artifact) -> list:
        """
        从 JSON 内容提取 ABI 数组

        兼容:
        - list: 直接就是 ABI 数组 (ape compile)
        - dict with "abi": Hardhat/Foundry 格式
        """
        if isinstance(artifact, list):
            return artifact
        if isinstance(artifact, dict) and "abi" in artifact:
            return artifact["abi"]
        raise ValueError(
            f"无法识别的 ABI 格式: type={type(artifact).__name__}, "
            f"keys={list(artifact.keys()) if isinstance(artifact, dict) else 'N/A'}"
        )

    async def add_investor(
        self,
        investor_address: str,
        country_code: str,
        is_accredited: bool,
        wait_confirmation: bool = True,
    ) -> Tuple[str, bool]:
        """
        调用合约 addInvestor()

        参数:
            investor_address: 投资者地址
            country_code: 国家代码 (2 字符)
            is_accredited: 是否为合格投资者
            wait_confirmation: 是否等待确认

        返回:
            Tuple[str, bool]: (tx_hash, success)

        异常:
            ValueError: Admin 不是 verifier
        """
        contract = await self._get_contract()
        private_key = await self._get_admin_private_key()
        admin_account = self.web3.eth.account.from_key(private_key)

        logger.info(
            f"Adding investor: {investor_address}, "
            f"country: {country_code}, accredited: {is_accredited}"
        )

        chain_log.chain_op(
            "add_investor",
            "Initiating on-chain addInvestor",
            investor_address=investor_address,
            country=country_code,
            accredited=is_accredited,
        )

        # 检查 admin 是否为 verifier
        try:
            is_verifier = await contract.functions.verifiers(
                admin_account.address
            ).call()
            if not is_verifier:
                raise ValueError(
                    f"Admin {admin_account.address} is not a verifier in KYC contract"
                )
        except Exception as e:
            logger.warning(f"Failed to check verifier status: {e}")
            # 继续执行，让合约调用失败时返回更详细的错误

        # 构建交易 (Code Review M2: 使用 estimate_gas 代替硬编码)
        # C-02: nonce lock 保证并发安全
        async with self._nonce_lock:
            timer = start_timer("add_investor")
            try:
                # C-03: 预估 gas + 20% buffer
                investor_checksum = self.web3.to_checksum_address(investor_address)
                country_upper = country_code[:2].upper()

                estimated_gas = await contract.functions.addInvestor(
                    investor_checksum,
                    country_upper,
                    is_accredited,
                ).estimate_gas({"from": admin_account.address})

                gas_with_buffer = int(estimated_gas * 1.2)
                logger.debug(
                    f"Estimated gas: {estimated_gas}, with buffer: {gas_with_buffer}"
                )

                tx = await contract.functions.addInvestor(
                    investor_checksum,
                    country_upper,
                    is_accredited,
                ).build_transaction(
                    {
                        "from": admin_account.address,
                        "nonce": await self.web3.eth.get_transaction_count(
                            admin_account.address
                        ),
                        "gas": gas_with_buffer,
                        "gasPrice": await self.web3.eth.gas_price,
                    }
                )

                # 签名并发送
                signed = self.web3.eth.account.sign_transaction(tx, private_key)
                tx_hash = await self.web3.eth.send_raw_transaction(
                    signed.raw_transaction
                )
                tx_hash_hex = tx_hash.hex()

                logger.info(f"Transaction sent: {tx_hash_hex}")

                chain_log.chain_op(
                    "add_investor",
                    "Transaction sent, awaiting confirmation",
                    investor_address=investor_address,
                    tx_hash=tx_hash_hex,
                    gas_used=gas_with_buffer,
                )

                if wait_confirmation:
                    try:
                        receipt = await self.web3.eth.wait_for_transaction_receipt(
                            tx_hash, timeout=60
                        )
                        success = receipt.status == 1
                        if success:
                            chain_log.chain_op(
                                "add_investor",
                                "Transaction confirmed",
                                investor_address=investor_address,
                                tx_hash=tx_hash_hex,
                                block=receipt.get("blockNumber"),
                            )
                        else:
                            chain_log.chain_op(
                                "add_investor",
                                "Transaction failed on-chain",
                                level="warning",
                                investor_address=investor_address,
                                tx_hash=tx_hash_hex,
                                status=receipt.status,
                            )
                        await timer.finish(success=success, error=None if success else "tx_reverted")
                        return tx_hash_hex, success
                    except Exception as e:
                        logger.error(f"Transaction confirmation failed: {e}")
                        await timer.finish(success=False, error=str(e)[:100])
                        return tx_hash_hex, False

                return tx_hash_hex, True

            except Exception as e:
                logger.error(f"Failed to add investor: {e}")
                await timer.finish(success=False, error=str(e)[:100])
                raise

    async def is_verified(self, investor_address: str) -> bool:
        """
        查询合约中的 KYC 状态

        参数:
            investor_address: 投资者地址

        返回:
            bool: 是否已验证
        """
        contract = await self._get_contract()
        return await contract.functions.isVerified(
            self.web3.to_checksum_address(investor_address)
        ).call()

    async def get_investor_info(self, investor_address: str) -> Optional[dict]:
        """
        获取投资者完整信息

        参数:
            investor_address: 投资者地址

        返回:
            dict: 投资者信息，如果不存在返回 None
        """
        contract = await self._get_contract()

        try:
            info = await contract.functions.getInvestorInfo(
                self.web3.to_checksum_address(investor_address)
            ).call()

            return {
                "verified": info[0],
                "country": info[1],
                "accredited_investor": info[2],
                "added_time": info[3],
                "verification_time": info[4],
                "expiry_time": info[5],
                "frozen": info[6],
            }
        except Exception as e:
            logger.warning(f"Failed to get investor info: {e}")
            return None


# 单例实例
_kyc_contract_service: Optional[KycContractService] = None


def get_kyc_contract_service() -> KycContractService:
    """获取 KYC 合约服务单例"""
    global _kyc_contract_service
    if _kyc_contract_service is None:
        _kyc_contract_service = KycContractService()
    return _kyc_contract_service
