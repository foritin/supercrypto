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
from src.shared.schemas.enums import NetWork

logger = get_logger("supercrypto.service.auth")


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

        Args:
            network: 网络类型，默认从配置读取
        """
        self.network = network or SETTINGS.NETWORK

    async def get_current_user_info(self, wallet_address: str) -> dict:
        """
        获取当前用户信息

        封装 Account 和 AccountKyc 的数据库查询逻辑，
        供 Router 层调用，避免 Router 直接访问 ORM。

        Args:
            wallet_address: 钱包地址

        Returns:
            包含以下字段的字典:
            - account: Account 模型实例或 None
            - kyc: AccountKyc 模型实例或 None
            - is_admin: 是否为管理员
            - network_type: 网络类型枚举

        Example:
            >>> auth_service = get_auth_service()
            >>> info = await auth_service.get_current_user_info("0x123...")
            >>> print(info["is_admin"])
            False
        """
        # 转换网络类型
        network_type = NetWork.from_value(self.network)

        logger.debug(
            f"查询用户信息: address={wallet_address[:10]}..., "
            f"network={network_type.value}"
        )

        # 查询账户
        account = await Account.filter(
            address=wallet_address, network=network_type
        ).first()

        # 查询 KYC 状态
        kyc = await AccountKyc.filter(
            address=wallet_address, network=network_type
        ).first()

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
            "network_type": network_type,
        }


# 工厂函数
_auth_service_instance: Optional[AuthService] = None


def get_auth_service(network: Optional[str] = None) -> AuthService:
    """
    获取 AuthService 实例

    使用工厂函数模式，支持依赖注入和测试。
    默认返回单例实例，传入 network 参数时创建新实例。

    Args:
        network: 网络类型，传入时创建新实例

    Returns:
        AuthService 实例

    Example:
        >>> # 使用默认配置
        >>> auth_service = get_auth_service()
        >>> # 指定网络
        >>> auth_service = get_auth_service(network="sepolia")
    """
    global _auth_service_instance

    if network is not None:
        # 传入参数时创建新实例
        return AuthService(network=network)

    if _auth_service_instance is None:
        _auth_service_instance = AuthService()

    return _auth_service_instance
