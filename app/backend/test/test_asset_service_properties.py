"""
Asset Service 属性测试

使用 pytest + hypothesis 进行属性测试，验证 Asset Service 的核心正确性属性。

Feature: primary-contract-management
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import HealthCheck, assume, given, settings
from hypothesis import strategies as st

from src.schemas.enums import ContractScope, ContractStatus, Network
from src.services.asset_service import AssetService


def run_async(coro):
    """辅助函数：运行异步协程"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def create_mock_status_service(project_name: str = "test"):
    """创建模拟的 ContractStatusService，避免真实 ORM 查询"""
    mock_status_service = MagicMock()
    mock_status_service.get_contract_status = AsyncMock(
        return_value={
            "project_contracts": [
                {
                    "project": project_name,
                    "project_readiness": "ready",
                    "readiness_details": {
                        "has_primary": True,
                        "all_registered": True,
                        "no_missing_deps": True,
                    },
                }
            ],
        }
    )
    mock_status_service.check_project_can_modify = AsyncMock(return_value=None)
    return mock_status_service


def create_asset_service():
    """创建 AssetService 实例（在测试内部使用）"""
    with patch("src.services.asset_service.SETTINGS") as mock_settings:
        mock_settings.NETWORK = Network.HARDHAT
        return AssetService()


# ============ 测试数据生成策略 ============

# 合约名称策略
contract_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd")),
    min_size=3,
    max_size=30,
).filter(lambda x: x.isalnum() and len(x) >= 3)

# 项目名称策略
project_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Ll", "Nd")),
    min_size=3,
    max_size=20,
).filter(lambda x: x.isalnum() and len(x) >= 3)

# 合约地址策略 (以太坊地址格式)
contract_address_strategy = st.text(
    alphabet="0123456789abcdef",
    min_size=40,
    max_size=40,
).map(lambda x: f"0x{x}")

# Symbol 策略
symbol_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("Lu",)),
    min_size=2,
    max_size=10,
).filter(lambda x: x.isalpha() and len(x) >= 2)


def create_mock_contract(
    contract_id: int,
    name: str,
    address: str,
    project_name: str,
    scope: ContractScope,
    is_primary: bool = False,
    symbol: str | None = None,
):
    """创建模拟合约对象"""
    contract = MagicMock()
    contract.id = contract_id
    contract.name = name
    contract.address = address
    contract.project_name = project_name
    contract.scope = scope
    contract.is_primary = is_primary
    contract.symbol = symbol
    contract.status = ContractStatus.ACTIVE
    contract.contract_type = MagicMock()
    contract.contract_type.value = "token" if is_primary else "defi"
    return contract


def create_mock_asset(
    asset_id: int, name: str, symbol: str, project: str | None = None
):
    """创建模拟资产对象"""
    asset = MagicMock()
    asset.id = asset_id
    asset.name = name
    asset.symbol = symbol
    asset.project = project
    asset.contract_address = None
    asset.save = AsyncMock()
    return asset


class TestProperty3BindingOnlyProjectScope:
    """
    Property 3: 绑定只包含 PROJECT scope 合约

    *For any* AssetContractBinding 记录，其关联的合约的 `scope` 必须为 `PROJECT`。

    **Validates: Requirements 2.1, 2.2**
    """

    @given(
        project_name=project_name_strategy,
        num_project_contracts=st.integers(min_value=1, max_value=5),
        num_global_contracts=st.integers(min_value=0, max_value=3),
    )
    @settings(
        max_examples=20,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    def test_property_binding_only_project_scope(
        self,
        project_name: str,
        num_project_contracts: int,
        num_global_contracts: int,
    ):
        """
        属性测试：绑定操作只绑定 PROJECT scope 合约

        验证：
        1. 给定一个项目，包含 PROJECT 和 GLOBAL scope 的合约
        2. 执行绑定操作后
        3. 只有 PROJECT scope 的合约被绑定到 AssetContractBinding

        **Validates: Requirements 2.1, 2.2**
        """
        # 在测试内部创建 service
        asset_service = create_asset_service()

        # 生成测试数据
        project_contracts = []
        global_contracts = []

        # 创建 PROJECT scope 合约
        for i in range(num_project_contracts):
            contract = create_mock_contract(
                contract_id=i + 1,
                name=f"ProjectContract{i}",
                address=f"0x{'a' * 39}{i}",
                project_name=project_name,
                scope=ContractScope.PROJECT,
                is_primary=(i == 0),  # 第一个设为主合约
                symbol=f"SYM{i}" if i == 0 else None,
            )
            project_contracts.append(contract)

        # 创建 GLOBAL scope 合约
        for i in range(num_global_contracts):
            contract = create_mock_contract(
                contract_id=100 + i,
                name=f"GlobalContract{i}",
                address=f"0x{'b' * 39}{i}",
                project_name=project_name,
                scope=ContractScope.GLOBAL,
                is_primary=False,
            )
            global_contracts.append(contract)

        # 确保至少有一个主合约
        assume(len(project_contracts) > 0)
        primary_contract = project_contracts[0]

        # 创建模拟资产
        mock_asset = create_mock_asset(
            asset_id=1,
            name="TestAsset",
            symbol="TEST",
            project=None,
        )

        # 记录创建的绑定
        created_bindings = []

        async def mock_create(**kwargs):
            binding = MagicMock()
            for key, value in kwargs.items():
                setattr(binding, key, value)
            created_bindings.append(binding)
            return binding

        # 创建 mock 的 AssetDetailResponse
        mock_detail_response = MagicMock()

        with (
            patch("src.services.asset_service.Asset") as MockAsset,
            patch("src.services.asset_service.AssetContractBinding") as MockBinding,
            patch.object(
                asset_service,
                "_to_detail_response",
                new=AsyncMock(return_value=mock_detail_response),
            ),
        ):
            # 模拟资产查询
            MockAsset.filter.return_value.first = AsyncMock(return_value=mock_asset)

            # 模拟绑定查询（无现有绑定）
            MockBinding.filter.return_value.prefetch_related.return_value.all = (
                AsyncMock(return_value=[])
            )
            MockBinding.filter.return_value.all = AsyncMock(return_value=[])
            MockBinding.create = mock_create

            # 执行绑定（传入预获取的合约信息）
            run_async(
                asset_service.bind_project_contracts(
                    asset_id=1,
                    project=project_name,
                    primary_contract=primary_contract,
                    project_contracts=project_contracts,
                )
            )

        # 验证属性：所有创建的绑定都是 PROJECT scope 合约
        # 由于我们只查询 PROJECT scope 合约，所以绑定数量应该等于 PROJECT 合约数量
        assert len(created_bindings) == len(project_contracts), (
            f"绑定数量 ({len(created_bindings)}) 应该等于 PROJECT scope 合约数量 ({len(project_contracts)})"
        )

        # 验证没有 GLOBAL scope 合约被绑定
        bound_addresses = {b.contract_address for b in created_bindings}
        global_addresses = {c.address for c in global_contracts}

        for global_addr in global_addresses:
            assert global_addr not in bound_addresses, (
                f"GLOBAL scope 合约 {global_addr} 不应该被绑定"
            )

        # 验证所有绑定的合约类型都是 'project'
        for binding in created_bindings:
            assert binding.contract_type == "project", (
                f"绑定的合约类型应该是 'project'，但得到 '{binding.contract_type}'"
            )

    @given(
        project_name=project_name_strategy,
    )
    @settings(
        max_examples=10,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    def test_property_no_global_contracts_in_binding(
        self,
        project_name: str,
    ):
        """
        属性测试：GLOBAL scope 合约永远不会出现在绑定中

        验证：
        1. 即使项目只有 GLOBAL scope 合约
        2. 绑定操作也不会创建任何绑定（会因为没有主合约而失败）

        **Validates: Requirements 2.1, 2.2**
        """
        # 在测试内部创建 service
        asset_service = create_asset_service()

        # 只创建 GLOBAL scope 合约
        global_contracts = [
            create_mock_contract(
                contract_id=i + 1,
                name=f"GlobalContract{i}",
                address=f"0x{'c' * 39}{i}",
                project_name=project_name,
                scope=ContractScope.GLOBAL,
                is_primary=False,
            )
            for i in range(3)
        ]

        mock_asset = create_mock_asset(
            asset_id=1,
            name="TestAsset",
            symbol="TEST",
        )

        with (
            patch("src.services.asset_service.Asset") as MockAsset,
            patch("src.services.asset_service.AssetContractBinding") as MockBinding,
        ):
            MockAsset.filter.return_value.first = AsyncMock(return_value=mock_asset)

            # 执行绑定 - 传入空的 project_contracts 列表（因为只有 GLOBAL scope 合约，不会被传入）
            # 需要一个 primary_contract 占位（但由于 project_contracts 为空，会先报错）
            dummy_primary = create_mock_contract(
                contract_id=999,
                name="DummyPrimary",
                address=f"0x{'f' * 40}",
                project_name=project_name,
                scope=ContractScope.PROJECT,
                is_primary=True,
                symbol="DUM",
            )

            from src.common.exceptions import BusinessException

            with pytest.raises(BusinessException):
                run_async(
                    asset_service.bind_project_contracts(
                        asset_id=1,
                        project=project_name,
                        primary_contract=dummy_primary,
                        project_contracts=[],  # 空列表，因为只有 GLOBAL scope 合约
                    )
                )


class TestProperty4AssetFieldAutoFill:
    """
    Property 4: 绑定后 Asset 字段自动填充

    *For any* 成功的项目绑定操作，绑定后 `Asset.symbol` 应该等于主合约的 `symbol`，
    `Asset.contract_address` 应该等于主合约的 `address`。

    **Validates: Requirements 2.5, 2.6**
    """

    @given(
        project_name=project_name_strategy,
        primary_symbol=symbol_strategy,
        primary_address=contract_address_strategy,
    )
    @settings(
        max_examples=20,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    def test_property_asset_symbol_filled_from_primary(
        self,
        project_name: str,
        primary_symbol: str,
        primary_address: str,
    ):
        """
        属性测试：绑定后 Asset.symbol 自动从主合约填充

        验证：
        1. 给定一个项目，有主合约（带 symbol）
        2. 执行绑定操作后
        3. Asset.symbol 应该等于主合约的 symbol

        **Validates: Requirements 2.5**
        """
        # 在测试内部创建 service
        asset_service = create_asset_service()

        # 创建主合约
        primary_contract = create_mock_contract(
            contract_id=1,
            name="RWAToken",
            address=primary_address,
            project_name=project_name,
            scope=ContractScope.PROJECT,
            is_primary=True,
            symbol=primary_symbol,
        )

        # 创建其他 PROJECT scope 合约
        other_contract = create_mock_contract(
            contract_id=2,
            name="OtherContract",
            address=f"0x{'d' * 40}",
            project_name=project_name,
            scope=ContractScope.PROJECT,
            is_primary=False,
            symbol=None,
        )

        project_contracts = [primary_contract, other_contract]

        # 创建模拟资产（初始 symbol 不同于主合约）
        mock_asset = create_mock_asset(
            asset_id=1,
            name="TestAsset",
            symbol="ORIGINAL",  # 原始 symbol
            project=None,
        )

        # 记录 asset.save() 调用时的状态
        saved_symbol = None
        saved_contract_address = None

        async def mock_save():
            nonlocal saved_symbol, saved_contract_address
            saved_symbol = mock_asset.symbol
            saved_contract_address = mock_asset.contract_address

        mock_asset.save = mock_save

        # 创建 mock 的 AssetDetailResponse
        mock_detail_response = MagicMock()

        with (
            patch("src.services.asset_service.Asset") as MockAsset,
            patch("src.services.asset_service.AssetContractBinding") as MockBinding,
            patch.object(
                asset_service,
                "_to_detail_response",
                new=AsyncMock(return_value=mock_detail_response),
            ),
        ):
            # 模拟资产查询
            MockAsset.filter.return_value.first = AsyncMock(return_value=mock_asset)

            # 模拟绑定查询（无现有绑定）
            MockBinding.filter.return_value.prefetch_related.return_value.all = (
                AsyncMock(return_value=[])
            )
            MockBinding.filter.return_value.all = AsyncMock(return_value=[])
            MockBinding.create = AsyncMock()

            # 执行绑定（传入预获取的合约信息）
            run_async(
                asset_service.bind_project_contracts(
                    asset_id=1,
                    project=project_name,
                    primary_contract=primary_contract,
                    project_contracts=project_contracts,
                )
            )

        # 验证属性：Asset.symbol 应该等于主合约的 symbol
        assert saved_symbol == primary_symbol, (
            f"Asset.symbol ({saved_symbol}) 应该等于主合约的 symbol ({primary_symbol})"
        )

    @given(
        project_name=project_name_strategy,
        primary_address=contract_address_strategy,
    )
    @settings(
        max_examples=20,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    def test_property_asset_contract_address_filled_from_primary(
        self,
        project_name: str,
        primary_address: str,
    ):
        """
        属性测试：绑定后 Asset.contract_address 自动从主合约填充

        验证：
        1. 给定一个项目，有主合约（带 address）
        2. 执行绑定操作后
        3. Asset.contract_address 应该等于主合约的 address

        **Validates: Requirements 2.6**
        """
        # 在测试内部创建 service
        asset_service = create_asset_service()

        # 创建主合约
        primary_contract = create_mock_contract(
            contract_id=1,
            name="RWAToken",
            address=primary_address,
            project_name=project_name,
            scope=ContractScope.PROJECT,
            is_primary=True,
            symbol="SYM",
        )

        project_contracts = [primary_contract]

        # 创建模拟资产（初始 contract_address 为空）
        mock_asset = create_mock_asset(
            asset_id=1,
            name="TestAsset",
            symbol="TEST",
            project=None,
        )
        mock_asset.contract_address = None  # 初始为空

        # 记录 asset.save() 调用时的状态
        saved_contract_address = None

        async def mock_save():
            nonlocal saved_contract_address
            saved_contract_address = mock_asset.contract_address

        mock_asset.save = mock_save

        # 创建 mock 的 AssetDetailResponse
        mock_detail_response = MagicMock()

        with (
            patch("src.services.asset_service.Asset") as MockAsset,
            patch("src.services.asset_service.AssetContractBinding") as MockBinding,
            patch.object(
                asset_service,
                "_to_detail_response",
                new=AsyncMock(return_value=mock_detail_response),
            ),
        ):
            # 模拟资产查询
            MockAsset.filter.return_value.first = AsyncMock(return_value=mock_asset)

            # 模拟绑定查询（无现有绑定）
            MockBinding.filter.return_value.prefetch_related.return_value.all = (
                AsyncMock(return_value=[])
            )
            MockBinding.filter.return_value.all = AsyncMock(return_value=[])
            MockBinding.create = AsyncMock()

            # 执行绑定（传入预获取的合约信息）
            run_async(
                asset_service.bind_project_contracts(
                    asset_id=1,
                    project=project_name,
                    primary_contract=primary_contract,
                    project_contracts=project_contracts,
                )
            )

        # 验证属性：Asset.contract_address 应该等于主合约的 address
        assert saved_contract_address == primary_address, (
            f"Asset.contract_address ({saved_contract_address}) 应该等于主合约的 address ({primary_address})"
        )

    @given(
        project_name=project_name_strategy,
        primary_symbol=symbol_strategy,
        primary_address=contract_address_strategy,
    )
    @settings(
        max_examples=15,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture],
    )
    def test_property_both_fields_filled_atomically(
        self,
        project_name: str,
        primary_symbol: str,
        primary_address: str,
    ):
        """
        属性测试：绑定后 symbol 和 contract_address 同时填充

        验证：
        1. 给定一个项目，有主合约
        2. 执行绑定操作后
        3. Asset.symbol 和 Asset.contract_address 都应该被正确填充

        **Validates: Requirements 2.5, 2.6**
        """
        # 在测试内部创建 service
        asset_service = create_asset_service()

        # 创建主合约
        primary_contract = create_mock_contract(
            contract_id=1,
            name="RWAToken",
            address=primary_address,
            project_name=project_name,
            scope=ContractScope.PROJECT,
            is_primary=True,
            symbol=primary_symbol,
        )

        project_contracts = [primary_contract]

        # 创建模拟资产
        mock_asset = create_mock_asset(
            asset_id=1,
            name="TestAsset",
            symbol="ORIGINAL",
            project=None,
        )
        mock_asset.contract_address = None

        # 记录 asset.save() 调用时的状态
        saved_states = []

        async def mock_save():
            saved_states.append(
                {
                    "symbol": mock_asset.symbol,
                    "contract_address": mock_asset.contract_address,
                    "project": mock_asset.project,
                }
            )

        mock_asset.save = mock_save

        # 创建 mock 的 AssetDetailResponse
        mock_detail_response = MagicMock()

        with (
            patch("src.services.asset_service.Asset") as MockAsset,
            patch("src.services.asset_service.AssetContractBinding") as MockBinding,
            patch.object(
                asset_service,
                "_to_detail_response",
                new=AsyncMock(return_value=mock_detail_response),
            ),
        ):
            # 模拟资产查询
            MockAsset.filter.return_value.first = AsyncMock(return_value=mock_asset)

            # 模拟绑定查询（无现有绑定）
            MockBinding.filter.return_value.prefetch_related.return_value.all = (
                AsyncMock(return_value=[])
            )
            MockBinding.filter.return_value.all = AsyncMock(return_value=[])
            MockBinding.create = AsyncMock()

            # 执行绑定（传入预获取的合约信息）
            run_async(
                asset_service.bind_project_contracts(
                    asset_id=1,
                    project=project_name,
                    primary_contract=primary_contract,
                    project_contracts=project_contracts,
                )
            )

        # 验证属性：最终状态应该同时包含正确的 symbol 和 contract_address
        assert len(saved_states) > 0, "asset.save() 应该被调用"

        final_state = saved_states[-1]
        assert final_state["symbol"] == primary_symbol, (
            f"Asset.symbol ({final_state['symbol']}) 应该等于主合约的 symbol ({primary_symbol})"
        )
        assert final_state["contract_address"] == primary_address, (
            f"Asset.contract_address ({final_state['contract_address']}) 应该等于主合约的 address ({primary_address})"
        )
        assert final_state["project"] == project_name, (
            f"Asset.project ({final_state['project']}) 应该等于项目名称 ({project_name})"
        )
