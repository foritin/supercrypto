"""
开发者工具 Service
处理测试数据重置等开发辅助功能
"""

from typing import List, Optional

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.models import Account, AccountKyc, TransactionAudit
from src.schemas.dev import ResetableDataInfo, ResetDataType, TokenRecipient

logger = get_logger("business.dev.service")

# ETH 水龙头限额配置
FAUCET_MAX_AMOUNT_ETH = 10000.0  # 单次最大充值限额


class DevToolsService:
    """开发者工具服务"""

    def __init__(self):
        # 使用 network 而非 environment
        # environment 是应用环境 (dev/prod)
        # network 是区块链网络 (hardhat/testnet/mainnet)
        self.network = SETTINGS.network

    async def get_resetable_data_info(self) -> ResetableDataInfo:
        """获取可重置数据的统计信息"""
        # 只统计当前网络的数据
        kyc_count = await AccountKyc.filter(network=self.network).count()

        # TransactionAudit 有 environment 字段
        transaction_count = await TransactionAudit.filter(
            environment=self.network
        ).count()

        return ResetableDataInfo(
            kyc_count=kyc_count,
            transaction_count=transaction_count,
            environment=self.network,
        )

    async def reset_data(self, data_types: List[ResetDataType]) -> dict:
        """
        重置测试数据

        参数:
            data_types: 要重置的数据类型列表

        返回:
            各类型重置的记录数

        注意: TransactionAudit 是不可变的审计记录，不支持删除
        """
        reset_counts = {}

        # 检查是否重置全部
        reset_all = ResetDataType.ALL in data_types

        # 重置 KYC 数据
        if reset_all or ResetDataType.KYC in data_types:
            deleted_count = await AccountKyc.filter(network=self.network).delete()
            reset_counts["kyc"] = deleted_count

        # 交易审计数据不支持删除 (TransactionAudit 是不可变的)
        if reset_all or ResetDataType.TRANSACTION in data_types:
            reset_counts["transaction"] = 0
            reset_counts["transaction_note"] = (
                "TransactionAudit is immutable and cannot be deleted"
            )

        return reset_counts

    def is_reset_allowed(self) -> bool:
        """检查当前网络是否允许数据重置"""
        # 只有 hardhat 网络允许重置
        return self.network == "hardhat"

    def get_environment(self) -> str:
        """获取当前网络"""
        return self.network

    async def get_token_recipients(
        self, exclude_address: Optional[str] = None
    ) -> List[TokenRecipient]:
        """
        获取可接收测试代币的用户列表

        参数:
            exclude_address: 要排除的地址（通常是 admin 自己）

        返回:
            可接收代币的用户列表
        """
        recipients = []

        # 获取当前网络的所有账户
        accounts = await Account.filter(network=self.network).all()

        for account in accounts:
            # 排除指定地址
            if exclude_address:
                if account.address.lower() == exclude_address.lower():
                    continue

            # 查询 KYC 状态 (按 address 和 network 过滤)
            kyc = await AccountKyc.filter(
                address=account.address, network=self.network
            ).first()

            kyc_status = kyc.status.value if kyc else None

            # 构建显示标签
            parts = [account.address[:6] + "..." + account.address[-4:]]
            if account.tag:
                parts.append(f"({account.tag})")
            if kyc_status:
                parts.append(f"[KYC: {kyc_status}]")

            recipients.append(
                TokenRecipient(
                    address=account.address,
                    kyc_status=kyc_status,
                    tag=account.tag,
                    label=" ".join(parts),
                )
            )

        return recipients

    # ============ ETH 水龙头 ============

    async def faucet_eth(self, address: str, amount_eth: float) -> dict:
        """
        通过 hardhat_setBalance 给指定地址充值 ETH

        仅在 hardhat 网络可用，直接设置余额，无需 gas

        参数:
            address: 目标钱包地址
            amount_eth: 充值 ETH 数量

        返回:
            充值结果

        异常:
            ValueError: 当充值金额超过限额或无效时
        """
        import httpx

        from src.models.chain import Chain

        # 验证充值金额
        if amount_eth <= 0:
            raise ValueError(f"Invalid amount: {amount_eth} ETH. Amount must be greater than 0.")

        # 检查限额
        if amount_eth > FAUCET_MAX_AMOUNT_ETH:
            raise ValueError(
                f"Amount exceeds faucet limit: {amount_eth} ETH requested, "
                f"but maximum allowed is {FAUCET_MAX_AMOUNT_ETH} ETH. "
                f"Please reduce the amount and try again."
            )

        chain = await Chain.get_by_chain_id(31337)
        if not chain:
            raise ValueError("Hardhat chain (31337) not found in database")

        rpc_url = chain.rpc_url

        # 先查询当前余额
        async with httpx.AsyncClient(timeout=10) as client:
            balance_resp = await client.post(
                rpc_url,
                json={
                    "jsonrpc": "2.0",
                    "method": "eth_getBalance",
                    "params": [address, "latest"],
                    "id": 1,
                },
            )
            balance_data = balance_resp.json()
            old_balance_wei = int(balance_data.get("result", "0x0"), 16)

            # 计算新余额 = 当前余额 + 充值数量
            add_wei = int(amount_eth * 10**18)
            new_balance_wei = old_balance_wei + add_wei
            new_balance_hex = hex(new_balance_wei)

            # 调用 hardhat_setBalance
            resp = await client.post(
                rpc_url,
                json={
                    "jsonrpc": "2.0",
                    "method": "hardhat_setBalance",
                    "params": [address, new_balance_hex],
                    "id": 2,
                },
            )
            result = resp.json()

        if "error" in result:
            logger.error(f"Faucet failed: {result['error']}")
            raise ValueError(f"hardhat_setBalance failed: {result['error']}")

        logger.info(f"Faucet: {amount_eth} ETH → {address[:10]}...")
        return {
            "address": address,
            "amount_eth": amount_eth,
            "old_balance_eth": old_balance_wei / 10**18,
            "new_balance_eth": new_balance_wei / 10**18,
        }


# 全局服务实例
