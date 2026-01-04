"""
KYC 审核策略模式 (Story 2.8, ADR-2)

根据环境和配置选择不同的审核策略：
- LocalTestKycStrategy: local/test 环境，管理员手动审核 + 合约同步
- MainnetKycStrategy: main 环境，预留第三方 KYC 服务接口
"""

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Tuple

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

if TYPE_CHECKING:
    from src.models.kyc import UserKyc

logger = get_logger(__name__)


class KycReviewStrategy(ABC):
    """KYC 审核策略抽象基类"""

    @abstractmethod
    async def submit_for_review(self, kyc: "UserKyc") -> str:
        """
        提交审核

        Args:
            kyc: KYC 记录

        Returns:
            str: 审核状态描述
        """
        pass

    @abstractmethod
    async def process_approval(
        self, kyc: "UserKyc", reviewer_address: str
    ) -> Tuple[str, bool]:
        """
        处理审核通过

        Args:
            kyc: KYC 记录
            reviewer_address: 审核人地址

        Returns:
            Tuple[str, bool]: (tx_hash, success)
        """
        pass


class LocalTestKycStrategy(KycReviewStrategy):
    """
    Local/Test 环境策略

    - 管理员手动审核
    - 审核通过后同步到 KYCManager 合约
    """

    async def submit_for_review(self, kyc: "UserKyc") -> str:
        """提交等待管理员审核"""
        logger.info(f"KYC submitted for admin review: {kyc.wallet_address}")
        return "pending_admin_review"

    async def process_approval(
        self, kyc: "UserKyc", reviewer_address: str
    ) -> Tuple[str, bool]:
        """
        审核通过后同步到合约

        调用 KYCManager.addInvestor(address, countryCode, isAccredited)
        """
        from src.services.kyc.contract_service import KycContractService

        logger.info(
            f"Processing KYC approval for {kyc.wallet_address}, "
            f"syncing to KYCManager contract..."
        )

        contract_service = KycContractService()
        return await contract_service.add_investor(
            investor_address=kyc.wallet_address,
            country_code=kyc.country_code or "XX",
            is_accredited=kyc.is_accredited,
        )


class MainnetKycStrategy(KycReviewStrategy):
    """
    Main 环境策略 (预留)

    - 第三方 KYC 服务 (Sumsub/Jumio/Onfido)
    - 不同步到链上 (链上 KYC 由第三方服务管理)
    """

    async def submit_for_review(self, kyc: "UserKyc") -> str:
        """
        提交到第三方 KYC 服务

        TODO: 实现第三方 API 调用
        """
        logger.info(
            f"KYC submitted to third-party service: {kyc.wallet_address} (not implemented)"
        )
        # TODO: 调用第三方 API (Sumsub/Jumio/Onfido)
        return "pending_third_party"

    async def process_approval(
        self, kyc: "UserKyc", reviewer_address: str
    ) -> Tuple[str, bool]:
        """
        Main 环境不同步到链上

        链上 KYC 状态由第三方服务管理
        """
        logger.info(
            f"KYC approved in mainnet mode: {kyc.wallet_address}, "
            "skipping on-chain sync"
        )
        # Main 环境不同步到链上，返回空 tx_hash
        return ("", True)


# 策略注册表
STRATEGY_MAP = {
    "internal": LocalTestKycStrategy,
    "sumsub": MainnetKycStrategy,
    "jumio": MainnetKycStrategy,
    "onfido": MainnetKycStrategy,
}


def get_kyc_strategy() -> KycReviewStrategy:
    """
    工厂函数：根据配置返回审核策略

    优先级：
    1. main 环境强制使用 MainnetKycStrategy
    2. 根据 kyc.provider 配置选择策略
    3. 默认使用 LocalTestKycStrategy
    """
    kyc_config = getattr(SETTINGS, "kyc", {})

    if isinstance(kyc_config, dict):
        provider = kyc_config.get("provider", "internal")
    else:
        provider = "internal"

    environment = SETTINGS.environment

    # main 环境强制使用 MainnetKycStrategy
    if environment == "main" and provider == "internal":
        logger.info("Using MainnetKycStrategy for main environment")
        return MainnetKycStrategy()

    # 根据 provider 选择策略
    strategy_class = STRATEGY_MAP.get(provider, LocalTestKycStrategy)
    logger.info(f"Using {strategy_class.__name__} for provider: {provider}")
    return strategy_class()
