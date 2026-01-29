#!/usr/bin/env python3
"""
变更限制属性测试
================

测试已绑定 Asset 的项目合约变更限制。

**Property 3: Modification Restriction**
**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

属性: is_bound_to_asset == True ⟹ 变更操作返回 PROJECT_BOUND_CANNOT_MODIFY

设计文档定义:
∀ project P, operation O ∈ {set_primary, unset_primary, replace_contract}:
  P.is_bound_to_asset ⟹ O(P) 返回 PROJECT_BOUND_CANNOT_MODIFY
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import pytest
from hypothesis import given, settings, strategies as st, assume

from src.shared.schemas.enums import ErrorCode


# ============ Mock 数据类 ============

@dataclass
class MockAsset:
    """模拟 Asset 模型"""
    id: int
    name: str


@dataclass
class MockAssetContractBinding:
    """模拟 AssetContractBinding 模型"""
    id: int
    asset_id: int
    contract_name: str
    contract_address: str
    contract_type: str
    is_primary: bool
    asset: MockAsset = None


@dataclass
class MockContractDeployment:
    """模拟 ContractDeployment 模型"""
    id: int
    name: str
    address: str
    project_name: str
    is_primary: bool
    network: str = "hardhat"


class MockBusinessException(Exception):
    """模拟 BusinessException"""
    def __init__(self, error_code: str, detail: Dict = None):
        self.error_code = error_code
        self.detail = detail or {}
        super().__init__(f"{error_code}: {detail}")


# ============ 核心逻辑模拟 ============

class MockContractStatusService:
    """
    模拟 ContractStatusService
    
    实现 check_project_can_modify() 方法的核心逻辑
    """
    
    def __init__(
        self,
        deployments: List[MockContractDeployment],
        bindings: List[MockAssetContractBinding],
        network: str = "hardhat",
    ):
        self.network = network
        self._deployments = deployments
        self._bindings = bindings
        
        # 构建查询映射
        self._deployment_map: Dict[Tuple[str, bool], MockContractDeployment] = {}
        for d in deployments:
            if d.network == network:
                key = (d.project_name, d.is_primary)
                self._deployment_map[key] = d
        
        self._binding_map: Dict[str, MockAssetContractBinding] = {}
        for b in bindings:
            if b.is_primary:
                self._binding_map[b.contract_address] = b
    
    def check_project_can_modify(self, project_name: str) -> None:
        """
        检查项目是否可以修改（未绑定 Asset）
        
        **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
        
        Args:
            project_name: 项目名称
            
        Raises:
            MockBusinessException: 如果项目已绑定 Asset
        """
        # 查询项目主合约
        primary = self._deployment_map.get((project_name, True))
        
        if not primary:
            # 没有主合约，可以修改
            return
        
        # 检查主合约是否已绑定 Asset
        binding = self._binding_map.get(primary.address)
        
        if binding:
            raise MockBusinessException(
                error_code=ErrorCode.PROJECT_BOUND_CANNOT_MODIFY,
                detail={
                    "project": project_name,
                    "bound_asset_id": binding.asset.id,
                    "bound_asset_name": binding.asset.name,
                    "message": "项目已绑定 Asset，请先解绑后再进行此操作",
                },
            )


def simulate_set_primary_operation(
    service: MockContractStatusService,
    project_name: str,
) -> Tuple[bool, Optional[str]]:
    """
    模拟设置主合约操作
    
    Returns:
        (success, error_code): 操作是否成功，失败时返回错误码
    """
    try:
        service.check_project_can_modify(project_name)
        return True, None
    except MockBusinessException as e:
        return False, e.error_code


def simulate_unset_primary_operation(
    service: MockContractStatusService,
    project_name: str,
) -> Tuple[bool, Optional[str]]:
    """
    模拟取消主合约操作
    
    Returns:
        (success, error_code): 操作是否成功，失败时返回错误码
    """
    try:
        service.check_project_can_modify(project_name)
        return True, None
    except MockBusinessException as e:
        return False, e.error_code


def simulate_replace_contract_operation(
    service: MockContractStatusService,
    project_name: str,
) -> Tuple[bool, Optional[str]]:
    """
    模拟替换合约操作
    
    Returns:
        (success, error_code): 操作是否成功，失败时返回错误码
    """
    try:
        service.check_project_can_modify(project_name)
        return True, None
    except MockBusinessException as e:
        return False, e.error_code


# ============ Hypothesis Strategies ============

# 以太坊地址策略
eth_address_strategy = st.from_regex(r"0x[a-fA-F0-9]{40}", fullmatch=True)

# 项目名称策略
project_name_strategy = st.sampled_from(["vanke", "project_a", "project_b", "test_project"])

# 合约名称策略
contract_name_strategy = st.sampled_from([
    "RWATokenSTO", "Subscription", "Staking", "PlatformToken", 
    "LiquidityMining", "MockUSDT", "MockUSDC"
])

# Asset 名称策略
asset_name_strategy = st.text(
    min_size=1, 
    max_size=50, 
    alphabet=st.characters(whitelist_categories=('L', 'N', 'Zs'))
).filter(lambda x: x.strip())


# ============ 属性测试 ============

class TestModificationRestrictionProperties:
    """
    变更限制属性测试
    
    **Property 3: Modification Restriction**
    **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
    
    属性: is_bound_to_asset == True ⟹ 变更操作返回 PROJECT_BOUND_CANNOT_MODIFY
    """
    
    @given(
        project_name=project_name_strategy,
        contract_name=contract_name_strategy,
        contract_address=eth_address_strategy,
        asset_id=st.integers(min_value=1, max_value=10000),
        asset_name=asset_name_strategy,
    )
    @settings(max_examples=100)
    def test_bound_project_cannot_set_primary(
        self,
        project_name: str,
        contract_name: str,
        contract_address: str,
        asset_id: int,
        asset_name: str,
    ):
        """
        **Property 3.1: 已绑定项目不能设置主合约**
        
        当项目已绑定 Asset 时，set_primary 操作应返回 PROJECT_BOUND_CANNOT_MODIFY
        
        **Validates: Requirements 8.1, 8.2**
        """
        # Arrange - 创建已绑定的项目
        deployment = MockContractDeployment(
            id=1,
            name=contract_name,
            address=contract_address,
            project_name=project_name,
            is_primary=True,
            network="hardhat",
        )
        
        asset = MockAsset(id=asset_id, name=asset_name)
        binding = MockAssetContractBinding(
            id=1,
            asset_id=asset_id,
            contract_name=contract_name,
            contract_address=contract_address,
            contract_type="project",
            is_primary=True,
            asset=asset,
        )
        
        service = MockContractStatusService(
            deployments=[deployment],
            bindings=[binding],
            network="hardhat",
        )
        
        # Act
        success, error_code = simulate_set_primary_operation(service, project_name)
        
        # Assert
        assert success is False, (
            f"已绑定项目 '{project_name}' 的 set_primary 操作应该失败"
        )
        assert error_code == ErrorCode.PROJECT_BOUND_CANNOT_MODIFY, (
            f"错误码应为 PROJECT_BOUND_CANNOT_MODIFY，实际为 {error_code}"
        )
    
    @given(
        project_name=project_name_strategy,
        contract_name=contract_name_strategy,
        contract_address=eth_address_strategy,
        asset_id=st.integers(min_value=1, max_value=10000),
        asset_name=asset_name_strategy,
    )
    @settings(max_examples=100)
    def test_bound_project_cannot_unset_primary(
        self,
        project_name: str,
        contract_name: str,
        contract_address: str,
        asset_id: int,
        asset_name: str,
    ):
        """
        **Property 3.2: 已绑定项目不能取消主合约**
        
        当项目已绑定 Asset 时，unset_primary 操作应返回 PROJECT_BOUND_CANNOT_MODIFY
        
        **Validates: Requirements 8.1, 8.3**
        """
        # Arrange
        deployment = MockContractDeployment(
            id=1,
            name=contract_name,
            address=contract_address,
            project_name=project_name,
            is_primary=True,
            network="hardhat",
        )
        
        asset = MockAsset(id=asset_id, name=asset_name)
        binding = MockAssetContractBinding(
            id=1,
            asset_id=asset_id,
            contract_name=contract_name,
            contract_address=contract_address,
            contract_type="project",
            is_primary=True,
            asset=asset,
        )
        
        service = MockContractStatusService(
            deployments=[deployment],
            bindings=[binding],
            network="hardhat",
        )
        
        # Act
        success, error_code = simulate_unset_primary_operation(service, project_name)
        
        # Assert
        assert success is False, (
            f"已绑定项目 '{project_name}' 的 unset_primary 操作应该失败"
        )
        assert error_code == ErrorCode.PROJECT_BOUND_CANNOT_MODIFY, (
            f"错误码应为 PROJECT_BOUND_CANNOT_MODIFY，实际为 {error_code}"
        )
    
    @given(
        project_name=project_name_strategy,
        contract_name=contract_name_strategy,
        contract_address=eth_address_strategy,
        asset_id=st.integers(min_value=1, max_value=10000),
        asset_name=asset_name_strategy,
    )
    @settings(max_examples=100)
    def test_bound_project_cannot_replace_contract(
        self,
        project_name: str,
        contract_name: str,
        contract_address: str,
        asset_id: int,
        asset_name: str,
    ):
        """
        **Property 3.3: 已绑定项目不能替换合约**
        
        当项目已绑定 Asset 时，replace_contract 操作应返回 PROJECT_BOUND_CANNOT_MODIFY
        
        **Validates: Requirements 8.1, 8.4**
        """
        # Arrange
        deployment = MockContractDeployment(
            id=1,
            name=contract_name,
            address=contract_address,
            project_name=project_name,
            is_primary=True,
            network="hardhat",
        )
        
        asset = MockAsset(id=asset_id, name=asset_name)
        binding = MockAssetContractBinding(
            id=1,
            asset_id=asset_id,
            contract_name=contract_name,
            contract_address=contract_address,
            contract_type="project",
            is_primary=True,
            asset=asset,
        )
        
        service = MockContractStatusService(
            deployments=[deployment],
            bindings=[binding],
            network="hardhat",
        )
        
        # Act
        success, error_code = simulate_replace_contract_operation(service, project_name)
        
        # Assert
        assert success is False, (
            f"已绑定项目 '{project_name}' 的 replace_contract 操作应该失败"
        )
        assert error_code == ErrorCode.PROJECT_BOUND_CANNOT_MODIFY, (
            f"错误码应为 PROJECT_BOUND_CANNOT_MODIFY，实际为 {error_code}"
        )
    
    @given(
        project_name=project_name_strategy,
        contract_name=contract_name_strategy,
        contract_address=eth_address_strategy,
    )
    @settings(max_examples=100)
    def test_unbound_project_can_modify(
        self,
        project_name: str,
        contract_name: str,
        contract_address: str,
    ):
        """
        **Property 3.4: 未绑定项目可以修改**
        
        当项目未绑定 Asset 时，所有变更操作应该成功
        
        **Validates: Requirements 8.1 (逆否命题)**
        """
        # Arrange - 创建未绑定的项目
        deployment = MockContractDeployment(
            id=1,
            name=contract_name,
            address=contract_address,
            project_name=project_name,
            is_primary=True,
            network="hardhat",
        )
        
        # 没有绑定记录
        service = MockContractStatusService(
            deployments=[deployment],
            bindings=[],  # 空绑定列表
            network="hardhat",
        )
        
        # Act & Assert - 所有操作都应该成功
        success, error_code = simulate_set_primary_operation(service, project_name)
        assert success is True, (
            f"未绑定项目 '{project_name}' 的 set_primary 操作应该成功"
        )
        assert error_code is None
        
        success, error_code = simulate_unset_primary_operation(service, project_name)
        assert success is True, (
            f"未绑定项目 '{project_name}' 的 unset_primary 操作应该成功"
        )
        assert error_code is None
        
        success, error_code = simulate_replace_contract_operation(service, project_name)
        assert success is True, (
            f"未绑定项目 '{project_name}' 的 replace_contract 操作应该成功"
        )
        assert error_code is None
    
    @given(
        project_name=project_name_strategy,
    )
    @settings(max_examples=50)
    def test_project_without_primary_can_modify(
        self,
        project_name: str,
    ):
        """
        **Property 3.5: 无主合约的项目可以修改**
        
        当项目没有主合约时，变更操作应该成功（因为无法绑定）
        
        **Validates: Requirements 8.1**
        """
        # Arrange - 没有主合约的项目
        service = MockContractStatusService(
            deployments=[],  # 没有部署记录
            bindings=[],
            network="hardhat",
        )
        
        # Act & Assert
        success, error_code = simulate_set_primary_operation(service, project_name)
        assert success is True, (
            f"无主合约项目 '{project_name}' 的操作应该成功"
        )
        assert error_code is None


class TestModificationRestrictionErrorDetails:
    """
    变更限制错误详情测试
    
    **Validates: Requirements 8.4**
    """
    
    @given(
        project_name=project_name_strategy,
        contract_address=eth_address_strategy,
        asset_id=st.integers(min_value=1, max_value=10000),
        asset_name=asset_name_strategy,
    )
    @settings(max_examples=50)
    def test_error_detail_contains_project_info(
        self,
        project_name: str,
        contract_address: str,
        asset_id: int,
        asset_name: str,
    ):
        """
        **Property 3.6: 错误详情包含项目信息**
        
        当变更操作失败时，错误详情应包含项目名称和绑定的 Asset 信息
        
        **Validates: Requirements 8.4**
        """
        # Arrange
        deployment = MockContractDeployment(
            id=1,
            name="RWATokenSTO",
            address=contract_address,
            project_name=project_name,
            is_primary=True,
            network="hardhat",
        )
        
        asset = MockAsset(id=asset_id, name=asset_name)
        binding = MockAssetContractBinding(
            id=1,
            asset_id=asset_id,
            contract_name="RWATokenSTO",
            contract_address=contract_address,
            contract_type="project",
            is_primary=True,
            asset=asset,
        )
        
        service = MockContractStatusService(
            deployments=[deployment],
            bindings=[binding],
            network="hardhat",
        )
        
        # Act
        try:
            service.check_project_can_modify(project_name)
            pytest.fail("应该抛出 MockBusinessException")
        except MockBusinessException as e:
            # Assert
            assert e.error_code == ErrorCode.PROJECT_BOUND_CANNOT_MODIFY
            assert "project" in e.detail, "错误详情应包含 project 字段"
            assert e.detail["project"] == project_name, (
                f"project 应为 {project_name}，实际为 {e.detail['project']}"
            )
            assert "bound_asset_id" in e.detail, "错误详情应包含 bound_asset_id 字段"
            assert e.detail["bound_asset_id"] == asset_id, (
                f"bound_asset_id 应为 {asset_id}，实际为 {e.detail['bound_asset_id']}"
            )
            assert "bound_asset_name" in e.detail, "错误详情应包含 bound_asset_name 字段"
            assert e.detail["bound_asset_name"] == asset_name, (
                f"bound_asset_name 应为 {asset_name}，实际为 {e.detail['bound_asset_name']}"
            )
            assert "message" in e.detail, "错误详情应包含 message 字段"


class TestModificationRestrictionMultipleProjects:
    """
    多项目场景的变更限制测试
    
    **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
    """
    
    def test_modification_restriction_isolation_two_projects(self):
        """
        **Property 3.7: 变更限制的项目隔离性 (两个项目)**
        
        一个项目的绑定状态不应影响其他项目的变更能力
        
        **Validates: Requirements 8.1**
        """
        # Arrange - 项目 A 已绑定，项目 B 未绑定
        address_a = "0x" + "a" * 40
        address_b = "0x" + "b" * 40
        
        deployment_a = MockContractDeployment(
            id=1,
            name="Token_A",
            address=address_a,
            project_name="project_a",
            is_primary=True,
            network="hardhat",
        )
        deployment_b = MockContractDeployment(
            id=2,
            name="Token_B",
            address=address_b,
            project_name="project_b",
            is_primary=True,
            network="hardhat",
        )
        
        # 只有项目 A 绑定了 Asset
        asset_a = MockAsset(id=1, name="Asset_A")
        binding_a = MockAssetContractBinding(
            id=1,
            asset_id=1,
            contract_name="Token_A",
            contract_address=address_a,
            contract_type="project",
            is_primary=True,
            asset=asset_a,
        )
        
        service = MockContractStatusService(
            deployments=[deployment_a, deployment_b],
            bindings=[binding_a],
            network="hardhat",
        )
        
        # Act & Assert
        # 项目 A 已绑定，不能修改
        success_a, error_code_a = simulate_set_primary_operation(service, "project_a")
        assert success_a is False, "已绑定项目 A 应该无法修改"
        assert error_code_a == ErrorCode.PROJECT_BOUND_CANNOT_MODIFY
        
        # 项目 B 未绑定，可以修改
        success_b, error_code_b = simulate_set_primary_operation(service, "project_b")
        assert success_b is True, "未绑定项目 B 应该可以修改"
        assert error_code_b is None
    
    @given(
        project_a_bound=st.booleans(),
        project_b_bound=st.booleans(),
    )
    @settings(max_examples=20)
    def test_modification_restriction_isolation_property(
        self,
        project_a_bound: bool,
        project_b_bound: bool,
    ):
        """
        **Property 3.7b: 变更限制的项目隔离性 (属性测试)**
        
        验证两个项目的绑定状态相互独立
        
        **Validates: Requirements 8.1**
        """
        # Arrange - 使用固定地址避免冲突
        address_a = "0x" + "a" * 40
        address_b = "0x" + "b" * 40
        
        deployments = [
            MockContractDeployment(
                id=1, name="Token_A", address=address_a,
                project_name="project_a", is_primary=True, network="hardhat",
            ),
            MockContractDeployment(
                id=2, name="Token_B", address=address_b,
                project_name="project_b", is_primary=True, network="hardhat",
            ),
        ]
        
        bindings = []
        if project_a_bound:
            bindings.append(MockAssetContractBinding(
                id=1, asset_id=1, contract_name="Token_A",
                contract_address=address_a, contract_type="project",
                is_primary=True, asset=MockAsset(id=1, name="Asset_A"),
            ))
        if project_b_bound:
            bindings.append(MockAssetContractBinding(
                id=2, asset_id=2, contract_name="Token_B",
                contract_address=address_b, contract_type="project",
                is_primary=True, asset=MockAsset(id=2, name="Asset_B"),
            ))
        
        service = MockContractStatusService(
            deployments=deployments,
            bindings=bindings,
            network="hardhat",
        )
        
        # Act & Assert - 每个项目的限制独立
        success_a, _ = simulate_set_primary_operation(service, "project_a")
        success_b, _ = simulate_set_primary_operation(service, "project_b")
        
        # 项目 A 的结果只取决于 project_a_bound
        assert success_a == (not project_a_bound), (
            f"项目 A 绑定状态={project_a_bound}，修改结果应为 {not project_a_bound}"
        )
        
        # 项目 B 的结果只取决于 project_b_bound
        assert success_b == (not project_b_bound), (
            f"项目 B 绑定状态={project_b_bound}，修改结果应为 {not project_b_bound}"
        )


class TestModificationRestrictionEdgeCases:
    """边界情况测试"""
    
    def test_binding_to_different_address(self):
        """
        绑定到不同地址时，项目应该可以修改
        """
        project_name = "test_project"
        contract_address = "0x" + "a" * 40
        other_address = "0x" + "b" * 40
        
        deployment = MockContractDeployment(
            id=1,
            name="RWATokenSTO",
            address=contract_address,
            project_name=project_name,
            is_primary=True,
            network="hardhat",
        )
        
        # 绑定到不同的地址
        asset = MockAsset(id=1, name="Other Asset")
        binding = MockAssetContractBinding(
            id=1,
            asset_id=1,
            contract_name="OtherToken",
            contract_address=other_address,  # 不同地址
            contract_type="project",
            is_primary=True,
            asset=asset,
        )
        
        service = MockContractStatusService(
            deployments=[deployment],
            bindings=[binding],
            network="hardhat",
        )
        
        # 应该可以修改
        success, error_code = simulate_set_primary_operation(service, project_name)
        assert success is True, "绑定到不同地址时，项目应该可以修改"
        assert error_code is None
    
    def test_non_primary_binding_allows_modification(self):
        """
        非主绑定（is_primary=False）不应阻止修改
        """
        project_name = "test_project"
        contract_address = "0x" + "a" * 40
        
        deployment = MockContractDeployment(
            id=1,
            name="RWATokenSTO",
            address=contract_address,
            project_name=project_name,
            is_primary=True,
            network="hardhat",
        )
        
        # 非主绑定
        asset = MockAsset(id=1, name="Test Asset")
        binding = MockAssetContractBinding(
            id=1,
            asset_id=1,
            contract_name="RWATokenSTO",
            contract_address=contract_address,
            contract_type="project",
            is_primary=False,  # 非主绑定
            asset=asset,
        )
        
        service = MockContractStatusService(
            deployments=[deployment],
            bindings=[binding],
            network="hardhat",
        )
        
        # 应该可以修改（因为只检查 is_primary=True 的绑定）
        success, error_code = simulate_set_primary_operation(service, project_name)
        assert success is True, "非主绑定不应阻止修改"
        assert error_code is None
    
    def test_different_network_binding_allows_modification(self):
        """
        不同网络的部署不应受其他网络绑定的影响
        """
        project_name = "test_project"
        contract_address_hardhat = "0x" + "a" * 40
        contract_address_mainnet = "0x" + "b" * 40
        
        # hardhat 网络的部署
        deployment_hardhat = MockContractDeployment(
            id=1,
            name="RWATokenSTO",
            address=contract_address_hardhat,
            project_name=project_name,
            is_primary=True,
            network="hardhat",
        )
        
        # mainnet 网络的部署（不同地址）
        deployment_mainnet = MockContractDeployment(
            id=2,
            name="RWATokenSTO",
            address=contract_address_mainnet,
            project_name=project_name,
            is_primary=True,
            network="mainnet",
        )
        
        # 只有 mainnet 的合约被绑定
        asset = MockAsset(id=1, name="Test Asset")
        binding = MockAssetContractBinding(
            id=1,
            asset_id=1,
            contract_name="RWATokenSTO",
            contract_address=contract_address_mainnet,
            contract_type="project",
            is_primary=True,
            asset=asset,
        )
        
        # 在 hardhat 网络上检查
        service = MockContractStatusService(
            deployments=[deployment_hardhat, deployment_mainnet],
            bindings=[binding],
            network="hardhat",  # 检查 hardhat 网络
        )
        
        # hardhat 网络的项目应该可以修改
        success, error_code = simulate_set_primary_operation(service, project_name)
        assert success is True, "不同网络的绑定不应影响当前网络"
        assert error_code is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
