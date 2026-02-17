"""
后端测试共享 fixtures 和辅助函数

集中管理:
- run_async() 异步测试运行器
- wallet_address_strategy / tx_hash_strategy hypothesis 策略
- SQLite 内存数据库 fixture
- create_mock_kyc() 工厂函数

使用方式:
    from conftest import run_async, wallet_address_strategy, tx_hash_strategy

    class TestMyFeature:
        @pytest.fixture(autouse=True)
        def setup_db(self, sqlite_db):
            '''使用 SQLite 内存数据库'''
            pass

        @given(address=wallet_address_strategy)
        def test_something(self, address):
            ...
"""

import asyncio
from typing import Optional
from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import strategies as st
from tortoise import Tortoise

from src.models.kyc import AccountKyc
from src.schemas.enums import (
    KycStatus,
    Network,
    OnChainSyncStatus,
    ReviewPriority,
    RiskLevel,
)

# ============================================================
# 异步测试运行器
# ============================================================


def run_async(coro):
    """在同步上下文中运行异步协程

    每次调用创建新的事件循环，避免 'Event loop is closed' 错误。

    用法::

        result = run_async(some_async_function())
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============================================================
# Hypothesis 策略 — 可复用的测试数据生成器
# ============================================================

# 以太坊钱包地址: 0x + 40 个十六进制字符
wallet_address_strategy = st.from_regex(r"0x[0-9a-f]{40}", fullmatch=True)

# 以太坊交易哈希: 0x + 64 个十六进制字符
tx_hash_strategy = st.from_regex(r"0x[0-9a-f]{64}", fullmatch=True)

# 合约地址 (与钱包地址格式相同)
contract_address_strategy = st.from_regex(r"0x[0-9a-f]{40}", fullmatch=True)


# ============================================================
# SQLite 内存数据库 fixture
# ============================================================


@pytest.fixture
def sqlite_db():
    """初始化 SQLite 内存数据库，测试结束后自动清理

    用法::

        class TestMyFeature:
            @pytest.fixture(autouse=True)
            def setup_db(self, sqlite_db):
                pass

            def test_something(self):
                result = run_async(MyModel.all())
                assert result == []
    """

    async def _init():
        await Tortoise.init(
            db_url="sqlite://:memory:",
            modules={"models": ["src.models"]},
        )
        await Tortoise.generate_schemas()

    async def _cleanup():
        await Tortoise.close_connections()

    run_async(_init())
    yield
    run_async(_cleanup())


# ============================================================
# KYC Mock 工厂函数
# ============================================================


def create_mock_kyc(
    kyc_id: int = 1,
    address: str = "0x" + "a" * 40,
    network: Network = Network.HARDHAT,
    status: KycStatus = KycStatus.PENDING,
    full_name: str = "测试用户",
    country_code: Optional[str] = "CN",
    email: Optional[str] = None,
    phone: Optional[str] = None,
    face_image_url: Optional[str] = None,
    liveness_video_url: Optional[str] = None,
    selfie_url: Optional[str] = None,
    liveness_verified: bool = False,
    on_chain_sync_status: OnChainSyncStatus = OnChainSyncStatus.PENDING,
    on_chain_tx_hash: Optional[str] = None,
    reviewer_address: Optional[str] = None,
    reject_reason: Optional[str] = None,
    risk_level: RiskLevel = RiskLevel.LOW,
    risk_score: int = 0,
    priority: ReviewPriority = ReviewPriority.NORMAL,
) -> MagicMock:
    """创建模拟的 AccountKyc 记录

    返回一个 MagicMock 对象，spec 为 AccountKyc，
    包含所有常用字段的默认值，可通过参数覆盖。

    用法::

        kyc = create_mock_kyc(status=KycStatus.APPROVED, full_name="张三")
        assert kyc.status == KycStatus.APPROVED
    """
    kyc = MagicMock(spec=AccountKyc)
    kyc.id = kyc_id
    kyc.address = address
    kyc.network = network
    kyc.status = status

    # 基本信息
    kyc.full_name = full_name
    kyc.date_of_birth = None
    kyc.country_code = country_code
    kyc.is_accredited = False

    # 联系信息
    kyc.email = email
    kyc.phone = phone

    # 居住地址
    kyc.address_line1 = None
    kyc.address_line2 = None
    kyc.city = None
    kyc.state = None
    kyc.postal_code = None
    kyc.residence_country = None

    # 媒体文件
    kyc.selfie_url = selfie_url
    kyc.face_image_url = face_image_url
    kyc.liveness_video_url = liveness_video_url
    kyc.liveness_verified = liveness_verified

    # 审核信息
    kyc.submitted_at = None
    kyc.reviewed_at = None
    kyc.reviewer_address = reviewer_address
    kyc.reject_reason = reject_reason
    kyc.external_kyc_id = None

    # 风险评估
    kyc.risk_level = risk_level
    kyc.risk_score = risk_score
    kyc.priority = priority
    kyc.is_pep = False
    kyc.is_sanctioned = False

    # 链上同步
    kyc.on_chain_sync_status = on_chain_sync_status
    kyc.on_chain_tx_hash = on_chain_tx_hash
    kyc.on_chain_synced_at = None
    kyc.on_chain_error = None

    # 来源追踪
    kyc.source_ip = None
    kyc.device_fingerprint = None

    # 审核步骤进度
    kyc.review_progress = None

    # 时间戳
    kyc.created_at = None
    kyc.updated_at = None

    # Mock 异步方法
    kyc.save = AsyncMock()
    kyc.delete = AsyncMock()

    # Mock documents 关系
    kyc.documents = MagicMock()
    kyc.documents.all = AsyncMock(return_value=[])

    return kyc
