"""
资产服务 (AssetService) CRUD 单元测试

覆盖范围:
- 创建资产 (create_asset)
- 更新资产 (update_asset)
- 状态转换 (draft → active → paused → closed)
- 价格更新 (update_price)
- 供应量管理 (update_subscribed_amount)

_Requirements: 8.4_
"""

import asyncio
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from tortoise import Tortoise

from src.models.asset import Asset, AssetContractBinding, AssetPriceHistory
from src.services.asset.schemas import (
    AssetCreateRequest,
    AssetUpdateRequest,
)
from src.services.asset.service import AssetService
from src.shared.common.exceptions import BusinessException
from src.shared.schemas.enums import AssetStatus, AssetType

# 抑制 DeprecationWarning
pytestmark = pytest.mark.filterwarnings("ignore::DeprecationWarning")


# ============================================================
# 异步运行器 (与 conftest.py 保持一致)
# ============================================================


def run_async(coro):
    """在同步上下文中运行异步协程"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============================================================
# 辅助函数
# ============================================================


def _make_create_request(**overrides) -> AssetCreateRequest:
    """创建默认的 AssetCreateRequest，可通过 overrides 覆盖字段"""
    defaults = dict(
        name="测试资产",
        symbol="TEST",
        description="测试用 RWA 资产",
        asset_type=AssetType.REAL_ESTATE,
        total_supply=Decimal("1000000"),
        min_subscription=Decimal("100"),
        current_price=Decimal("1"),
        apy_3m=Decimal("10"),
        apy_6m=Decimal("12"),
        apy_12m=Decimal("15"),
    )
    defaults.update(overrides)
    return AssetCreateRequest(**defaults)


async def _create_test_asset(
    service: AssetService, **overrides
) -> Asset:
    """通过 AssetService.create_asset 创建资产并返回 ORM 对象"""
    request = _make_create_request(**overrides)
    detail = await service.create_asset(request)
    return await Asset.get(id=detail.id)


# ============================================================
# 测试类: 创建资产
# ============================================================


class TestCreateAsset:
    """资产创建测试"""

    @pytest.fixture(autouse=True)
    def setup_db(self, sqlite_db):
        """使用 SQLite 内存数据库"""
        pass

    def test_create_asset_basic(self):
        """创建基本资产 — 验证所有字段正确存储"""

        async def _test():
            service = AssetService()
            request = _make_create_request(
                name="深圳湾壹号",
                symbol="SZW1",
                description="深圳湾超级总部基地核心地段",
                asset_type=AssetType.REAL_ESTATE,
                total_supply=Decimal("5000000"),
                min_subscription=Decimal("1000"),
                current_price=Decimal("100"),
                apy_3m=Decimal("10"),
                apy_6m=Decimal("12"),
                apy_12m=Decimal("15"),
            )

            result = await service.create_asset(request)

            assert result.name == "深圳湾壹号"
            assert result.symbol == "SZW1"
            assert result.description == "深圳湾超级总部基地核心地段"
            assert result.asset_type == AssetType.REAL_ESTATE
            assert result.total_supply == 5000000.0
            assert result.min_subscription == 1000.0
            assert result.current_price == 100.0
            assert result.apy_3m == 10.0
            assert result.apy_6m == 12.0
            assert result.apy_12m == 15.0
            assert result.status == AssetStatus.ACTIVE
            assert result.subscribed_amount == 0.0
            assert result.is_available is True

        run_async(_test())

    def test_create_asset_records_initial_price_history(self):
        """创建资产时如果有初始价格，应记录价格历史"""

        async def _test():
            service = AssetService()
            request = _make_create_request(current_price=Decimal("50"))

            result = await service.create_asset(request)

            history = await AssetPriceHistory.filter(asset_id=result.id).all()
            assert len(history) == 1
            assert history[0].price == Decimal("50")
            assert history[0].source == "initial"

        run_async(_test())

    def test_create_asset_zero_price_no_history(self):
        """创建资产时价格为 0 不应记录价格历史"""

        async def _test():
            service = AssetService()
            request = _make_create_request(current_price=Decimal("0"))

            result = await service.create_asset(request)

            history = await AssetPriceHistory.filter(asset_id=result.id).all()
            assert len(history) == 0

        run_async(_test())

    def test_create_asset_symbol_uppercased(self):
        """创建资产时符号应自动转为大写"""

        async def _test():
            service = AssetService()
            request = _make_create_request(symbol="test")

            result = await service.create_asset(request)
            assert result.symbol == "TEST"

        run_async(_test())

    def test_create_asset_duplicate_symbol_rejected(self):
        """重复符号应被拒绝"""

        async def _test():
            service = AssetService()

            await service.create_asset(_make_create_request(symbol="DUP"))

            with pytest.raises(BusinessException) as exc_info:
                await service.create_asset(
                    _make_create_request(name="另一个资产", symbol="DUP")
                )

            assert exc_info.value.code == 400
            assert "already exists" in exc_info.value.message.lower()

        run_async(_test())

    def test_create_asset_different_types(self):
        """创建不同类型的资产"""

        async def _test():
            service = AssetService()

            for i, asset_type in enumerate(AssetType):
                result = await service.create_asset(
                    _make_create_request(
                        name=f"资产_{asset_type.value}",
                        symbol=f"T{i}",
                        asset_type=asset_type,
                    )
                )
                assert result.asset_type == asset_type

        run_async(_test())


# ============================================================
# 测试类: 更新资产
# ============================================================


class TestUpdateAsset:
    """资产更新测试"""

    @pytest.fixture(autouse=True)
    def setup_db(self, sqlite_db):
        """使用 SQLite 内存数据库"""
        pass

    def test_update_asset_name(self):
        """更新资产名称"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(service, name="旧名称", symbol="UPD1")

            update = AssetUpdateRequest(name="新名称")
            result = await service.update_asset(asset.id, update)

            assert result.name == "新名称"
            assert result.symbol == "UPD1"  # 其他字段不变

        run_async(_test())

    def test_update_asset_apy(self):
        """更新资产 APY"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(service, symbol="UPD2")

            update = AssetUpdateRequest(
                apy_3m=Decimal("8"),
                apy_6m=Decimal("10"),
                apy_12m=Decimal("13"),
            )
            result = await service.update_asset(asset.id, update)

            assert result.apy_3m == 8.0
            assert result.apy_6m == 10.0
            assert result.apy_12m == 13.0

        run_async(_test())

    def test_update_asset_price_records_history(self):
        """更新价格时应记录价格历史"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service, symbol="UPD3", current_price=Decimal("10")
            )

            update = AssetUpdateRequest(current_price=Decimal("20"))
            await service.update_asset(asset.id, update)

            history = await AssetPriceHistory.filter(asset_id=asset.id).order_by("created_at").all()
            # 初始价格 + 更新价格 = 2 条记录
            assert len(history) == 2
            assert history[0].price == Decimal("10")
            assert history[0].source == "initial"
            assert history[1].price == Decimal("20")
            assert history[1].source == "manual_update"

        run_async(_test())

    def test_update_asset_same_price_no_extra_history(self):
        """价格未变化时不应新增价格历史"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service, symbol="UPD4", current_price=Decimal("10")
            )

            update = AssetUpdateRequest(current_price=Decimal("10"))
            await service.update_asset(asset.id, update)

            history = await AssetPriceHistory.filter(asset_id=asset.id).all()
            # 仅初始价格 1 条
            assert len(history) == 1

        run_async(_test())

    def test_update_asset_symbol_duplicate_rejected(self):
        """更新符号为已存在的符号应被拒绝"""

        async def _test():
            service = AssetService()
            await _create_test_asset(service, symbol="EXIST")
            asset2 = await _create_test_asset(service, name="资产2", symbol="OTHER")

            with pytest.raises(BusinessException) as exc_info:
                await service.update_asset(
                    asset2.id, AssetUpdateRequest(symbol="EXIST")
                )

            assert exc_info.value.code == 400
            assert "already exists" in exc_info.value.message.lower()

        run_async(_test())

    def test_update_nonexistent_asset_rejected(self):
        """更新不存在的资产应返回 404"""

        async def _test():
            service = AssetService()

            with pytest.raises(BusinessException) as exc_info:
                await service.update_asset(
                    99999, AssetUpdateRequest(name="不存在")
                )

            assert exc_info.value.code == 404

        run_async(_test())

    def test_update_asset_partial_fields(self):
        """部分更新 — 未指定的字段保持不变"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service,
                name="原始名称",
                symbol="PART",
                description="原始描述",
                apy_3m=Decimal("10"),
            )

            update = AssetUpdateRequest(description="新描述")
            result = await service.update_asset(asset.id, update)

            assert result.name == "原始名称"
            assert result.description == "新描述"
            assert result.apy_3m == 10.0

        run_async(_test())


# ============================================================
# 测试类: 状态转换
# ============================================================


class TestAssetStatusTransitions:
    """资产状态转换测试

    状态流: active → paused → active → closed
    """

    @pytest.fixture(autouse=True)
    def setup_db(self, sqlite_db):
        """使用 SQLite 内存数据库"""
        pass

    def test_initial_status_active(self):
        """新创建的资产默认状态为 ACTIVE"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(service, symbol="ST1")
            assert asset.status == AssetStatus.ACTIVE

        run_async(_test())

    def test_active_to_paused(self):
        """ACTIVE → PAUSED: 暂停认购"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(service, symbol="ST2")

            result = await service.update_asset_status(asset.id, AssetStatus.PAUSED)
            assert result.status == AssetStatus.PAUSED

            # 验证数据库
            db_asset = await Asset.get(id=asset.id)
            assert db_asset.status == AssetStatus.PAUSED
            assert db_asset.is_available is False

        run_async(_test())

    def test_paused_to_active(self):
        """PAUSED → ACTIVE: 恢复认购"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(service, symbol="ST3")

            await service.update_asset_status(asset.id, AssetStatus.PAUSED)
            result = await service.update_asset_status(asset.id, AssetStatus.ACTIVE)

            assert result.status == AssetStatus.ACTIVE
            assert result.is_available is True

        run_async(_test())

    def test_active_to_closed(self):
        """ACTIVE → CLOSED: 关闭资产"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(service, symbol="ST4")

            result = await service.update_asset_status(asset.id, AssetStatus.CLOSED)
            assert result.status == AssetStatus.CLOSED

            db_asset = await Asset.get(id=asset.id)
            assert db_asset.is_available is False

        run_async(_test())

    def test_paused_to_closed(self):
        """PAUSED → CLOSED: 从暂停直接关闭"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(service, symbol="ST5")

            await service.update_asset_status(asset.id, AssetStatus.PAUSED)
            result = await service.update_asset_status(asset.id, AssetStatus.CLOSED)

            assert result.status == AssetStatus.CLOSED

        run_async(_test())

    def test_status_update_nonexistent_asset(self):
        """更新不存在资产的状态应返回 404"""

        async def _test():
            service = AssetService()

            with pytest.raises(BusinessException) as exc_info:
                await service.update_asset_status(99999, AssetStatus.PAUSED)

            assert exc_info.value.code == 404

        run_async(_test())

    def test_full_lifecycle(self):
        """完整生命周期: ACTIVE → PAUSED → ACTIVE → CLOSED"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(service, symbol="LIFE")

            # ACTIVE (初始)
            assert asset.status == AssetStatus.ACTIVE

            # → PAUSED
            result = await service.update_asset_status(asset.id, AssetStatus.PAUSED)
            assert result.status == AssetStatus.PAUSED

            # → ACTIVE (恢复)
            result = await service.update_asset_status(asset.id, AssetStatus.ACTIVE)
            assert result.status == AssetStatus.ACTIVE

            # → CLOSED (最终)
            result = await service.update_asset_status(asset.id, AssetStatus.CLOSED)
            assert result.status == AssetStatus.CLOSED

        run_async(_test())


# ============================================================
# 测试类: 价格更新
# ============================================================


class TestUpdateAssetPrice:
    """资产价格更新测试"""

    @pytest.fixture(autouse=True)
    def setup_db(self, sqlite_db):
        """使用 SQLite 内存数据库"""
        pass

    def test_update_price_basic(self):
        """基本价格更新"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service, symbol="PRC1", current_price=Decimal("10")
            )

            result = await service.update_price(asset.id, Decimal("25"), source="oracle")

            assert result.current_price == 25.0
            assert result.price_updated_at is not None

        run_async(_test())

    def test_update_price_records_history(self):
        """价格更新应记录历史"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service, symbol="PRC2", current_price=Decimal("10")
            )

            await service.update_price(asset.id, Decimal("15"), source="oracle")
            await service.update_price(asset.id, Decimal("20"), source="manual")

            history = await AssetPriceHistory.filter(asset_id=asset.id).order_by("created_at").all()
            # 初始 + 2 次更新 = 3 条
            assert len(history) == 3
            assert history[0].price == Decimal("10")
            assert history[0].source == "initial"
            assert history[1].price == Decimal("15")
            assert history[1].source == "oracle"
            assert history[2].price == Decimal("20")
            assert history[2].source == "manual"

        run_async(_test())

    def test_update_price_nonexistent_asset(self):
        """更新不存在资产的价格应返回 404"""

        async def _test():
            service = AssetService()

            with pytest.raises(BusinessException) as exc_info:
                await service.update_price(99999, Decimal("10"))

            assert exc_info.value.code == 404

        run_async(_test())

    def test_get_price_history(self):
        """获取价格历史"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service, symbol="PRC3", current_price=Decimal("10")
            )

            await service.update_price(asset.id, Decimal("12"))
            await service.update_price(asset.id, Decimal("15"))

            history = await service.get_price_history(asset.id)
            # 按时间倒序: 15, 12, 10
            assert len(history) == 3
            assert history[0].price == 15.0
            assert history[1].price == 12.0
            assert history[2].price == 10.0

        run_async(_test())

    def test_get_price_history_with_limit(self):
        """获取价格历史 — 限制条数"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service, symbol="PRC4", current_price=Decimal("1")
            )

            for i in range(5):
                await service.update_price(asset.id, Decimal(str(i + 2)))

            history = await service.get_price_history(asset.id, limit=3)
            assert len(history) == 3
            # 最新的 3 条 (倒序): 6, 5, 4
            assert history[0].price == 6.0
            assert history[1].price == 5.0
            assert history[2].price == 4.0

        run_async(_test())


# ============================================================
# 测试类: 供应量管理
# ============================================================


class TestAssetSupplyManagement:
    """资产供应量管理测试"""

    @pytest.fixture(autouse=True)
    def setup_db(self, sqlite_db):
        """使用 SQLite 内存数据库"""
        pass

    def test_add_subscribed_amount(self):
        """增加已认购金额"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service, symbol="SUP1", total_supply=Decimal("10000")
            )

            result = await service.update_subscribed_amount(
                asset.id, Decimal("3000"), is_add=True
            )

            assert result.subscribed_amount == 3000.0
            assert result.remaining_amount == 7000.0

        run_async(_test())

    def test_add_multiple_subscriptions(self):
        """多次增加认购金额"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service, symbol="SUP2", total_supply=Decimal("10000")
            )

            await service.update_subscribed_amount(asset.id, Decimal("2000"), is_add=True)
            result = await service.update_subscribed_amount(
                asset.id, Decimal("3000"), is_add=True
            )

            assert result.subscribed_amount == 5000.0
            assert result.remaining_amount == 5000.0

        run_async(_test())

    def test_exceeds_total_supply_rejected(self):
        """认购金额超过总供应量应被拒绝"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service, symbol="SUP3", total_supply=Decimal("10000")
            )

            with pytest.raises(BusinessException) as exc_info:
                await service.update_subscribed_amount(
                    asset.id, Decimal("10001"), is_add=True
                )

            assert exc_info.value.code == 400
            assert "exceeds" in exc_info.value.message.lower()

        run_async(_test())

    def test_sold_out_auto_status_change(self):
        """认购满额时自动变为 SOLD_OUT 状态"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service, symbol="SUP4", total_supply=Decimal("10000")
            )

            await service.update_subscribed_amount(asset.id, Decimal("10000"), is_add=True)

            db_asset = await Asset.get(id=asset.id)
            assert db_asset.status == AssetStatus.SOLD_OUT
            assert db_asset.remaining_amount == Decimal("0")
            assert db_asset.is_available is False

        run_async(_test())

    def test_reduce_subscribed_amount(self):
        """减少已认购金额 (赎回场景)"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service, symbol="SUP5", total_supply=Decimal("10000")
            )

            await service.update_subscribed_amount(asset.id, Decimal("5000"), is_add=True)
            result = await service.update_subscribed_amount(
                asset.id, Decimal("2000"), is_add=False
            )

            assert result.subscribed_amount == 3000.0
            assert result.remaining_amount == 7000.0

        run_async(_test())

    def test_reduce_below_zero_clamps_to_zero(self):
        """减少金额超过已认购额时应钳位到 0"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service, symbol="SUP6", total_supply=Decimal("10000")
            )

            await service.update_subscribed_amount(asset.id, Decimal("1000"), is_add=True)
            result = await service.update_subscribed_amount(
                asset.id, Decimal("5000"), is_add=False
            )

            assert result.subscribed_amount == 0.0

        run_async(_test())

    def test_sold_out_to_active_on_reduce(self):
        """从 SOLD_OUT 状态减少认购后应恢复为 ACTIVE"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service, symbol="SUP7", total_supply=Decimal("10000")
            )

            # 先售罄
            await service.update_subscribed_amount(asset.id, Decimal("10000"), is_add=True)
            db_asset = await Asset.get(id=asset.id)
            assert db_asset.status == AssetStatus.SOLD_OUT

            # 赎回部分
            await service.update_subscribed_amount(asset.id, Decimal("1000"), is_add=False)
            db_asset = await Asset.get(id=asset.id)
            assert db_asset.status == AssetStatus.ACTIVE
            assert db_asset.is_available is True

        run_async(_test())

    def test_supply_nonexistent_asset(self):
        """更新不存在资产的供应量应返回 404"""

        async def _test():
            service = AssetService()

            with pytest.raises(BusinessException) as exc_info:
                await service.update_subscribed_amount(99999, Decimal("100"))

            assert exc_info.value.code == 404

        run_async(_test())

    def test_subscription_progress_calculation(self):
        """认购进度计算"""

        async def _test():
            service = AssetService()
            asset = await _create_test_asset(
                service, symbol="SUP8", total_supply=Decimal("10000")
            )

            await service.update_subscribed_amount(asset.id, Decimal("2500"), is_add=True)

            db_asset = await Asset.get(id=asset.id)
            assert db_asset.subscription_progress == 25.0

        run_async(_test())
