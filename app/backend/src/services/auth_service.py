"""
Auth 服务 - 认证相关业务逻辑

封装用户认证、账户查询等数据库操作，供 Router 层调用
遵循分层架构原则：Router → Service → Model
"""

from typing import Optional

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.models.account import Account
from src.models.kyc import AccountKyc
from src.schemas.enums import Network

logger = get_logger("business.auth.service")


class AuthService:
    """
    认证服务

    负责用户认证相关的业务逻辑，包括：
    - 获取当前用户信息
    - 查询账户和 KYC 状态
    """

    def __init__(self, network: Optional[str] = None):
        """
        初始化认证服务

        参数:
            network: 网络类型，默认从配置读取
        """
        self.network = network or SETTINGS.network

    async def get_current_user_info(self, wallet_address: str) -> dict:
        """
        获取当前用户信息

        封装 Account 和 AccountKyc 的数据库查询逻辑，
        供 Router 层调用，避免 Router 直接访问 ORM。

        参数:
            wallet_address: 钱包地址

        返回:
            包含以下字段的字典:
            - account: Account 模型实例或 None
            - kyc: AccountKyc 模型实例或 None
            - is_admin: 是否为管理员
            - network: 网络类型枚举

        示例:
            >>> auth_service = get_auth_service()
            >>> info = await auth_service.get_current_user_info("0x123...")
            >>> print(info["is_admin"])
            False
        """
        # 转换网络类型
        network = Network.from_value(self.network)

        logger.debug(
            f"查询用户信息: address={wallet_address[:10]}..., network={network.value}"
        )

        # 查询账户
        account = await Account.filter(address=wallet_address, network=network).first()

        # 查询 KYC 状态
        kyc = await AccountKyc.filter(address=wallet_address, network=network).first()

        # 判断是否为管理员
        is_admin = account.tag == "admin" if account and account.tag else False

        if account:
            logger.debug(f"找到账户: id={account.id}, tag={account.tag}")
        else:
            logger.debug(f"未找到账户: address={wallet_address[:10]}...")

        return {
            "account": account,
            "kyc": kyc,
            "is_admin": is_admin,
            "network": network,
        }
