"""
KYC 合约服务 (Story 2.8)

与 KYCManager 智能合约交互：
- add_investor: 添加投资者 (审核通过后调用)
- is_verified: 查询投资者验证状态
- get_investor_info: 获取投资者完整信息
"""

import json
from pathlib import Path
from typing import Optional, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.models.account import Account
from src.shared.schemas.enums import NetType

logger = get_logger("kyc.contract")

# 合约 ABI 文件路径
ABI_PATH = Path(__file__).parent.parent.parent.parent / "contracts" / ".build"


class KycContractService:
    """KYC 合约服务"""

    def __init__(self):
        self._web3 = None
        self._contract = None
        self._contract_address = None

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

        # 环境映射到 NetType
        net_type_map = {
            "local": NetType.LOCAL,
            "test": NetType.TEST,
            "main": NetType.MAIN,
        }
        net_type = net_type_map.get(env, NetType.LOCAL)

        admin = await Account.filter(tag="admin", network=net_type).first()
        if not admin:
            raise ValueError(f"Admin account not found for {env} environment")

        logger.debug(f"Found admin account: {admin.address}")
        return admin.private_key

    async def _get_contract_address(self) -> str:
        """
        获取 KYCManager 合约地址

        直接从 Contract 表查询，避免循环依赖 ContractService
        """
        if self._contract_address is None:
            from src.models.contracts.contract import Contract
            from src.shared.schemas.enums import ContractStatus

            # KYCManager 是 GLOBAL scope，project_name 为 _common
            contract = await Contract.filter(
                name="KYCManager",
                project_name="_common",
                network=SETTINGS.NETWORK,
                status=ContractStatus.ACTIVE,
            ).first()

            if not contract:
                raise ValueError("KYCManager contract not deployed")

            self._contract_address = contract.address
            logger.debug(f"KYCManager address: {self._contract_address}")

        return self._contract_address

    async def _get_contract(self):
        """获取 KYCManager 合约实例"""
        if self._contract is None:
            address = await self._get_contract_address()

            # 加载 ABI
            abi_file = ABI_PATH / "KYCManager.json"
            if not abi_file.exists():
                raise FileNotFoundError(f"ABI file not found: {abi_file}")

            with open(abi_file) as f:
                artifact = json.load(f)

            self._contract = self.web3.eth.contract(
                address=self.web3.to_checksum_address(address),
                abi=artifact["abi"],
            )

        return self._contract

    async def add_investor(
        self,
        investor_address: str,
        country_code: str,
        is_accredited: bool,
        wait_confirmation: bool = True,
    ) -> Tuple[str, bool]:
        """
        调用 KYCManager.addInvestor()

        Args:
            investor_address: 投资者地址
            country_code: 国家代码 (2 字符)
            is_accredited: 是否为合格投资者
            wait_confirmation: 是否等待确认

        Returns:
            Tuple[str, bool]: (tx_hash, success)

        Raises:
            ValueError: Admin 不是 verifier
        """
        contract = await self._get_contract()
        private_key = await self._get_admin_private_key()
        admin_account = self.web3.eth.account.from_key(private_key)

        logger.info(
            f"Adding investor: {investor_address}, "
            f"country: {country_code}, accredited: {is_accredited}"
        )

        # 检查 admin 是否为 verifier
        try:
            is_verifier = await contract.functions.verifiers(
                admin_account.address
            ).call()
            if not is_verifier:
                raise ValueError(
                    f"Admin {admin_account.address} is not a verifier in KYCManager contract"
                )
        except Exception as e:
            logger.warning(f"Failed to check verifier status: {e}")
            # 继续执行，让合约调用失败时返回更详细的错误

        # 构建交易 (Code Review M2: 使用 estimate_gas 代替硬编码)
        try:
            # 预估 gas
            investor_checksum = self.web3.to_checksum_address(investor_address)
            country_upper = country_code[:2].upper()

            estimated_gas = await contract.functions.addInvestor(
                investor_checksum,
                country_upper,
                is_accredited,
            ).estimate_gas({"from": admin_account.address})

            # 添加 20% buffer
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
            tx_hash = await self.web3.eth.send_raw_transaction(signed.raw_transaction)
            tx_hash_hex = tx_hash.hex()

            logger.info(f"Transaction sent: {tx_hash_hex}")

            if wait_confirmation:
                try:
                    receipt = await self.web3.eth.wait_for_transaction_receipt(
                        tx_hash, timeout=60
                    )
                    success = receipt.status == 1
                    if success:
                        logger.info(f"Transaction confirmed: {tx_hash_hex}")
                    else:
                        logger.warning(f"Transaction failed: {tx_hash_hex}")
                    return tx_hash_hex, success
                except Exception as e:
                    logger.error(f"Transaction confirmation failed: {e}")
                    return tx_hash_hex, False

            return tx_hash_hex, True

        except Exception as e:
            logger.error(f"Failed to add investor: {e}")
            raise

    async def is_verified(self, investor_address: str) -> bool:
        """
        查询合约中的 KYC 状态

        Args:
            investor_address: 投资者地址

        Returns:
            bool: 是否已验证
        """
        contract = await self._get_contract()
        return await contract.functions.isVerified(
            self.web3.to_checksum_address(investor_address)
        ).call()

    async def get_investor_info(self, investor_address: str) -> Optional[dict]:
        """
        获取投资者完整信息

        Args:
            investor_address: 投资者地址

        Returns:
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
