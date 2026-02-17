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


# 全局服务实例
