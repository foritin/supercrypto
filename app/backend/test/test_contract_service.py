"""
Contract Service 单元测试

测试主合约管理功能：
- set_primary: 设置合约为主合约
- unset_primary: 取消合约的主合约标记
- get_project_primary_contract: 获取项目的主合约

Validates: Requirements 1.4, 1.5, 4.5
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.services.contract.service import ContractService
from src.shared.schemas.enums import ContractScope, ContractStatus, NetWork


def run_async(coro):
    """辅助函数：运行异步协程"""
    return asyncio.get_event_loop().run_until_complete(coro)


class TestContractServiceSetPrimary:
    """测试 set_primary 方法"""

    @pytest.fixture
    def contract_service(self):
        """创建 ContractService 实例"""
        with patch("src.services.contract.service.SETTINGS") as mock_settings:
            mock_settings.NETWORK = NetWork.HARDHAT
            service = ContractService()
            return service

    @pytest.fixture
    def mock_project_contract(self):
        """创建 PROJECT scope 的模拟合约"""
        contract = MagicMock()
        contract.id = 1
        contract.name = "VankeRWAToken"
        contract.project_name = "vanke"
        contract.scope = ContractScope.PROJECT
        contract.is_primary = False
        contract.symbol = "VANKE"
        contract.address = "0x1234567890abcdef1234567890abcdef12345678"
        contract.save = AsyncMock()
        return contract

    @pytest.fixture
    def mock_global_contract(self):
        """创建 GLOBAL scope 的模拟合约"""
        contract = MagicMock()
        contract.id = 2
        contract.name = "KYC"
        contract.project_name = "common"
        contract.scope = ContractScope.GLOBAL
        contract.is_primary = False
        contract.symbol = None
        contract.address = "0xabcdef1234567890abcdef1234567890abcdef12"
        contract.save = AsyncMock()
        return contract

    def test_set_primary_success(self, contract_service, mock_project_contract):
        """
        测试成功设置主合约

        场景：
        1. 创建一个 PROJECT scope 的合约
        2. 项目没有现有的主合约
        3. 调用 set_primary
        4. 验证 is_primary 被设置为 True

        Validates: Requirements 1.4, 4.5
        """
        with patch(
            "src.services.contract.service.ContractModel"
        ) as MockContractModel:
            # 模拟合约查询 - 合约存在
            # 第一次调用返回合约，第二次调用（检查主合约）返回 None
            call_count = 0

            async def mock_first():
                nonlocal call_count
                call_count += 1
                if call_count == 1:
                    return mock_project_contract
                return None  # 项目没有现有主合约

            MockContractModel.filter.return_value.first = mock_first

            # 执行
            result = run_async(contract_service.set_primary(contract_id=1))

            # 验证
            assert result.is_primary is True
            mock_project_contract.save.assert_called_once()

    def test_set_primary_already_exists(
        self, contract_service, mock_project_contract
    ):
        """
        测试项目已有主合约时设置失败

        场景：
        1. 创建一个 PROJECT scope 的合约并设为主合约
        2. 创建另一个 PROJECT scope 的合约（同一项目）
        3. 尝试将第二个合约设为主合约
        4. 验证抛出错误

        Validates: Requirements 1.5
        """
        # 创建已存在的主合约
        existing_primary = MagicMock()
        existing_primary.id = 99
        existing_primary.name = "ExistingPrimaryToken"
        existing_primary.project_name = "vanke"
        existing_primary.is_primary = True

        with patch(
            "src.services.contract.service.ContractModel"
        ) as MockContractModel:
            call_count = 0

            async def mock_first():
                nonlocal call_count
                call_count += 1
                if call_count == 1:
                    return mock_project_contract  # 要设置的合约
                return existing_primary  # 项目已有主合约

            MockContractModel.filter.return_value.first = mock_first

            # 执行并验证抛出错误
            with pytest.raises(ValueError) as exc_info:
                run_async(contract_service.set_primary(contract_id=1))

            assert "该项目已有主合约" in str(exc_info.value)

    def test_set_primary_global_scope(
        self, contract_service, mock_global_contract
    ):
        """
        测试设置 GLOBAL scope 合约为主合约失败

        场景：
        1. 创建一个 GLOBAL scope 的合约
        2. 尝试将其设为主合约
        3. 验证抛出错误

        Validates: Requirements 4.5, 5.3
        """
        with patch(
            "src.services.contract.service.ContractModel"
        ) as MockContractModel:
            MockContractModel.filter.return_value.first = AsyncMock(
                return_value=mock_global_contract
            )

            # 执行并验证抛出错误
            with pytest.raises(ValueError) as exc_info:
                run_async(contract_service.set_primary(contract_id=2))

            assert "只有项目专属合约（PROJECT scope）可以设为主合约" in str(
                exc_info.value
            )

    def test_set_primary_contract_not_found(self, contract_service):
        """
        测试合约不存在时设置失败

        场景：
        1. 尝试设置一个不存在的合约为主合约
        2. 验证抛出错误
        """
        with patch(
            "src.services.contract.service.ContractModel"
        ) as MockContractModel:
            MockContractModel.filter.return_value.first = AsyncMock(return_value=None)

            # 执行并验证抛出错误
            with pytest.raises(ValueError) as exc_info:
                run_async(contract_service.set_primary(contract_id=999))

            assert "合约不存在" in str(exc_info.value)


class TestContractServiceUnsetPrimary:
    """测试 unset_primary 方法"""

    @pytest.fixture
    def contract_service(self):
        """创建 ContractService 实例"""
        with patch("src.services.contract.service.SETTINGS") as mock_settings:
            mock_settings.NETWORK = NetWork.HARDHAT
            service = ContractService()
            return service

    @pytest.fixture
    def mock_primary_contract(self):
        """创建已设为主合约的模拟合约"""
        contract = MagicMock()
        contract.id = 1
        contract.name = "VankeRWAToken"
        contract.project_name = "vanke"
        contract.scope = ContractScope.PROJECT
        contract.is_primary = True
        contract.symbol = "VANKE"
        contract.address = "0x1234567890abcdef1234567890abcdef12345678"
        contract.save = AsyncMock()
        return contract

    @pytest.fixture
    def mock_non_primary_contract(self):
        """创建非主合约的模拟合约"""
        contract = MagicMock()
        contract.id = 2
        contract.name = "VankeSubscription"
        contract.project_name = "vanke"
        contract.scope = ContractScope.PROJECT
        contract.is_primary = False
        contract.symbol = None
        contract.address = "0xabcdef1234567890abcdef1234567890abcdef12"
        contract.save = AsyncMock()
        return contract

    def test_unset_primary_success(
        self, contract_service, mock_primary_contract
    ):
        """
        测试成功取消主合约标记

        场景：
        1. 创建一个已设为主合约的合约
        2. 调用 unset_primary
        3. 验证 is_primary 被设置为 False

        Validates: Requirements 4.3
        """
        with patch(
            "src.services.contract.service.ContractModel"
        ) as MockContractModel:
            MockContractModel.filter.return_value.first = AsyncMock(
                return_value=mock_primary_contract
            )

            # 执行
            result = run_async(contract_service.unset_primary(contract_id=1))

            # 验证
            assert result.is_primary is False
            mock_primary_contract.save.assert_called_once()

    def test_unset_primary_not_primary(
        self, contract_service, mock_non_primary_contract
    ):
        """
        测试取消非主合约的标记失败

        场景：
        1. 创建一个非主合约的合约
        2. 尝试取消其主合约标记
        3. 验证抛出错误
        """
        with patch(
            "src.services.contract.service.ContractModel"
        ) as MockContractModel:
            MockContractModel.filter.return_value.first = AsyncMock(
                return_value=mock_non_primary_contract
            )

            # 执行并验证抛出错误
            with pytest.raises(ValueError) as exc_info:
                run_async(contract_service.unset_primary(contract_id=2))

            assert "该合约不是主合约" in str(exc_info.value)

    def test_unset_primary_contract_not_found(self, contract_service):
        """
        测试合约不存在时取消失败

        场景：
        1. 尝试取消一个不存在的合约的主合约标记
        2. 验证抛出错误
        """
        with patch(
            "src.services.contract.service.ContractModel"
        ) as MockContractModel:
            MockContractModel.filter.return_value.first = AsyncMock(return_value=None)

            # 执行并验证抛出错误
            with pytest.raises(ValueError) as exc_info:
                run_async(contract_service.unset_primary(contract_id=999))

            assert "合约不存在" in str(exc_info.value)


class TestContractServiceGetProjectPrimaryContract:
    """测试 get_project_primary_contract 方法"""

    @pytest.fixture
    def contract_service(self):
        """创建 ContractService 实例"""
        with patch("src.services.contract.service.SETTINGS") as mock_settings:
            mock_settings.NETWORK = NetWork.HARDHAT
            service = ContractService()
            return service

    @pytest.fixture
    def mock_primary_contract(self):
        """创建主合约的模拟对象"""
        contract = MagicMock()
        contract.id = 1
        contract.name = "VankeRWAToken"
        contract.project_name = "vanke"
        contract.scope = ContractScope.PROJECT
        contract.is_primary = True
        contract.symbol = "VANKE"
        contract.address = "0x1234567890abcdef1234567890abcdef12345678"
        return contract

    def test_get_project_primary_contract_exists(
        self, contract_service, mock_primary_contract
    ):
        """
        测试获取存在的项目主合约

        场景：
        1. 项目有一个主合约
        2. 调用 get_project_primary_contract
        3. 验证返回正确的主合约

        Validates: Requirements 5.5
        """
        with patch(
            "src.services.contract.service.ContractModel"
        ) as MockContractModel:
            MockContractModel.filter.return_value.first = AsyncMock(
                return_value=mock_primary_contract
            )

            # 执行
            result = run_async(
                contract_service.get_project_primary_contract(project_name="vanke")
            )

            # 验证
            assert result is not None
            assert result.name == "VankeRWAToken"
            assert result.is_primary is True
            assert result.symbol == "VANKE"

    def test_get_project_primary_contract_not_exists(self, contract_service):
        """
        测试获取不存在主合约的项目

        场景：
        1. 项目没有主合约
        2. 调用 get_project_primary_contract
        3. 验证返回 None

        Validates: Requirements 5.5
        """
        with patch(
            "src.services.contract.service.ContractModel"
        ) as MockContractModel:
            MockContractModel.filter.return_value.first = AsyncMock(return_value=None)

            # 执行
            result = run_async(
                contract_service.get_project_primary_contract(
                    project_name="nonexistent_project"
                )
            )

            # 验证
            assert result is None
