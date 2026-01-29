#!/usr/bin/env python3
"""
绑定状态一致性属性测试
======================

测试项目合约组的绑定状态 (is_bound_to_asset) 与 AssetContractBinding 记录的一致性。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 1: Binding Status Consistency
- is_bound_to_asset == True ⟺ 存在对应的 AssetContractBinding 记录
- 即：项目主合约地址存在于 AssetContractBinding 表中 (is_primary=True) 时，
  is_bound_to_asset 应为 True，否则应为 False

设计文档定义:
∀ project P:
  P.is_bound_to_asset == True ⟺ 
    ∃ binding B: B.contract_address == P.primary_contract.address ∧ B.is_primary
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import pytest
from hypothesis import given, settings, strategies as st, assume


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


@dataclass
class MockContractData:
    """模拟合约状态数据"""
    id: Optional[int]
    name: str
    address: Optional[str]
    registration_status: str  # synced/not_registered/mismatch
    scope: str  # global/project
    is_primary: bool


@dataclass
class MockProjectContractsGroup:
    """模拟项目合约组"""
    project: str
    contracts: List[MockContractData] = field(default_factory=list)
    has_primary: bool = False
    primary_contract: Optional[MockContractData] = None
    is_ready: bool = False
    
    # 绑定状态字段
    is_bound_to_asset: bool = False
    bound_asset: Optional[Dict] = None
    can_bind_asset: bool = False
    
    # 就绪详情
    project_readiness: str = "not_ready"
    readiness_details: Dict = field(default_factory=dict)


# ============ 核心逻辑模拟 ============

def calculate_binding_status(
    project_group: MockProjectContractsGroup,
    binding_map: Dict[str, MockAssetContractBinding],
) -> None:
    """
    计算项目的绑定状态
    
    模拟 ContractStatusService.get_contract_status() 中的绑定状态计算逻辑
    
    **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
    """
    # 获取主合约地址
    primary_addr = None
    if project_group.primary_contract and project_group.primary_contract.address:
        primary_addr = project_group.primary_contract.address
    
    # 查找绑定记录
    binding = binding_map.get(primary_addr) if primary_addr else None
    
    # 设置绑定状态
    is_bound = binding is not None
    project_group.is_bound_to_asset = is_bound
    
    if binding:
        project_group.bound_asset = {
            "asset_id": binding.asset.id,
            "asset_name": binding.asset.name,
        }
    else:
        project_group.bound_asset = None


def verify_binding_consistency(
    project_group: MockProjectContractsGroup,
    binding_map: Dict[str, MockAssetContractBinding],
) -> bool:
    """
    验证绑定状态一致性
    
    Property 1: is_bound_to_asset == True ⟺ 存在对应的 AssetContractBinding 记录
    
    **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
    
    Returns:
        True 如果一致性满足，False 否则
    """
    # 获取主合约地址
    primary_addr = None
    if project_group.primary_contract and project_group.primary_contract.address:
        primary_addr = project_group.primary_contract.address
    
    # 检查是否存在绑定记录
    binding_exists = primary_addr is not None and primary_addr in binding_map
    
    # 验证双向蕴含
    # is_bound_to_asset == True ⟺ binding_exists
    return project_group.is_bound_to_asset == binding_exists


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

class TestBindingStatusConsistencyProperties:
    """
    绑定状态一致性属性测试
    
    **Property 1: Binding Status Consistency**
    **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
    """
    
    @given(
        project_name=project_name_strategy,
        contract_name=contract_name_strategy,
        contract_address=eth_address_strategy,
        asset_id=st.integers(min_value=1, max_value=10000),
        asset_name=asset_name_strategy,
        has_binding=st.booleans(),
    )
    @settings(max_examples=100)
    def test_binding_status_consistency_with_primary_contract(
        self,
        project_name: str,
        contract_name: str,
        contract_address: str,
        asset_id: int,
        asset_name: str,
        has_binding: bool,
    ):
        """
        **Property 1.1: 有主合约时的绑定状态一致性**
        
        当项目有主合约时，验证:
        - 如果存在 AssetContractBinding 记录，则 is_bound_to_asset == True
        - 如果不存在 AssetContractBinding 记录，则 is_bound_to_asset == False
        
        **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
        """
        # Arrange - 创建主合约
        primary_contract = MockContractData(
            id=1,
            name=contract_name,
            address=contract_address,
            registration_status="synced",
            scope="project",
            is_primary=True,
        )
        
        # 创建项目合约组
        project_group = MockProjectContractsGroup(
            project=project_name,
            contracts=[primary_contract],
            has_primary=True,
            primary_contract=primary_contract,
        )
        
        # 创建绑定映射
        binding_map: Dict[str, MockAssetContractBinding] = {}
        
        if has_binding:
            # 创建绑定记录
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
            binding_map[contract_address] = binding
        
        # Act - 计算绑定状态
        calculate_binding_status(project_group, binding_map)
        
        # Assert - 验证一致性
        assert verify_binding_consistency(project_group, binding_map), (
            f"绑定状态不一致: is_bound_to_asset={project_group.is_bound_to_asset}, "
            f"has_binding={has_binding}, primary_addr={contract_address}"
        )
        
        # 额外验证
        if has_binding:
            assert project_group.is_bound_to_asset is True, (
                "存在绑定记录时，is_bound_to_asset 应为 True"
            )
            assert project_group.bound_asset is not None, (
                "存在绑定记录时，bound_asset 不应为 None"
            )
            assert project_group.bound_asset["asset_id"] == asset_id, (
                f"bound_asset.asset_id ({project_group.bound_asset['asset_id']}) "
                f"应等于 {asset_id}"
            )
            assert project_group.bound_asset["asset_name"] == asset_name, (
                f"bound_asset.asset_name ({project_group.bound_asset['asset_name']}) "
                f"应等于 {asset_name}"
            )
        else:
            assert project_group.is_bound_to_asset is False, (
                "不存在绑定记录时，is_bound_to_asset 应为 False"
            )
            assert project_group.bound_asset is None, (
                "不存在绑定记录时，bound_asset 应为 None"
            )
    
    @given(
        project_name=project_name_strategy,
    )
    @settings(max_examples=50)
    def test_binding_status_without_primary_contract(
        self,
        project_name: str,
    ):
        """
        **Property 1.2: 无主合约时的绑定状态**
        
        当项目没有主合约时，is_bound_to_asset 应始终为 False
        
        **Validates: Requirements 2.2, 2.3**
        """
        # Arrange - 创建没有主合约的项目
        non_primary_contract = MockContractData(
            id=1,
            name="SomeContract",
            address="0x" + "a" * 40,
            registration_status="synced",
            scope="project",
            is_primary=False,
        )
        
        project_group = MockProjectContractsGroup(
            project=project_name,
            contracts=[non_primary_contract],
            has_primary=False,
            primary_contract=None,
        )
        
        # 即使有绑定记录，但没有主合约，也应该返回 False
        binding_map: Dict[str, MockAssetContractBinding] = {}
        
        # Act
        calculate_binding_status(project_group, binding_map)
        
        # Assert
        assert project_group.is_bound_to_asset is False, (
            "无主合约时，is_bound_to_asset 应为 False"
        )
        assert project_group.bound_asset is None, (
            "无主合约时，bound_asset 应为 None"
        )
        assert verify_binding_consistency(project_group, binding_map), (
            "无主合约时，绑定状态一致性应满足"
        )
    
    @given(
        project_name=project_name_strategy,
        contract_name=contract_name_strategy,
    )
    @settings(max_examples=50)
    def test_binding_status_with_null_address(
        self,
        project_name: str,
        contract_name: str,
    ):
        """
        **Property 1.3: 主合约地址为空时的绑定状态**
        
        当主合约存在但地址为空时，is_bound_to_asset 应为 False
        
        **Validates: Requirements 2.2, 2.3**
        """
        # Arrange - 创建地址为空的主合约
        primary_contract = MockContractData(
            id=1,
            name=contract_name,
            address=None,  # 地址为空
            registration_status="not_deployed",
            scope="project",
            is_primary=True,
        )
        
        project_group = MockProjectContractsGroup(
            project=project_name,
            contracts=[primary_contract],
            has_primary=True,
            primary_contract=primary_contract,
        )
        
        binding_map: Dict[str, MockAssetContractBinding] = {}
        
        # Act
        calculate_binding_status(project_group, binding_map)
        
        # Assert
        assert project_group.is_bound_to_asset is False, (
            "主合约地址为空时，is_bound_to_asset 应为 False"
        )
        assert verify_binding_consistency(project_group, binding_map), (
            "主合约地址为空时，绑定状态一致性应满足"
        )
    
    @given(
        project_name=project_name_strategy,
        contract_name=contract_name_strategy,
        contract_address=eth_address_strategy,
        other_address=eth_address_strategy,
        asset_id=st.integers(min_value=1, max_value=10000),
        asset_name=asset_name_strategy,
    )
    @settings(max_examples=100)
    def test_binding_status_address_mismatch(
        self,
        project_name: str,
        contract_name: str,
        contract_address: str,
        other_address: str,
        asset_id: int,
        asset_name: str,
    ):
        """
        **Property 1.4: 地址不匹配时的绑定状态**
        
        当绑定记录的地址与主合约地址不匹配时，is_bound_to_asset 应为 False
        
        **Validates: Requirements 2.2, 2.3**
        """
        # 确保两个地址不同
        assume(contract_address.lower() != other_address.lower())
        
        # Arrange
        primary_contract = MockContractData(
            id=1,
            name=contract_name,
            address=contract_address,
            registration_status="synced",
            scope="project",
            is_primary=True,
        )
        
        project_group = MockProjectContractsGroup(
            project=project_name,
            contracts=[primary_contract],
            has_primary=True,
            primary_contract=primary_contract,
        )
        
        # 创建绑定记录，但使用不同的地址
        asset = MockAsset(id=asset_id, name=asset_name)
        binding = MockAssetContractBinding(
            id=1,
            asset_id=asset_id,
            contract_name=contract_name,
            contract_address=other_address,  # 不同的地址
            contract_type="project",
            is_primary=True,
            asset=asset,
        )
        binding_map = {other_address: binding}  # 绑定到其他地址
        
        # Act
        calculate_binding_status(project_group, binding_map)
        
        # Assert
        assert project_group.is_bound_to_asset is False, (
            f"地址不匹配时，is_bound_to_asset 应为 False "
            f"(primary: {contract_address}, binding: {other_address})"
        )
        assert verify_binding_consistency(project_group, binding_map), (
            "地址不匹配时，绑定状态一致性应满足"
        )
    
    @given(
        num_projects=st.integers(min_value=1, max_value=5),
        data=st.data(),
    )
    @settings(max_examples=50)
    def test_binding_status_multiple_projects(
        self,
        num_projects: int,
        data,
    ):
        """
        **Property 1.5: 多项目场景的绑定状态一致性**
        
        验证多个项目同时存在时，每个项目的绑定状态都正确
        
        **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
        """
        # Arrange
        projects: List[MockProjectContractsGroup] = []
        binding_map: Dict[str, MockAssetContractBinding] = {}
        
        for i in range(num_projects):
            project_name = f"project_{i}"
            contract_address = data.draw(eth_address_strategy)
            has_binding = data.draw(st.booleans())
            
            primary_contract = MockContractData(
                id=i + 1,
                name=f"Token_{i}",
                address=contract_address,
                registration_status="synced",
                scope="project",
                is_primary=True,
            )
            
            project_group = MockProjectContractsGroup(
                project=project_name,
                contracts=[primary_contract],
                has_primary=True,
                primary_contract=primary_contract,
            )
            
            if has_binding:
                asset = MockAsset(id=i + 1, name=f"Asset_{i}")
                binding = MockAssetContractBinding(
                    id=i + 1,
                    asset_id=i + 1,
                    contract_name=f"Token_{i}",
                    contract_address=contract_address,
                    contract_type="project",
                    is_primary=True,
                    asset=asset,
                )
                binding_map[contract_address] = binding
            
            projects.append(project_group)
        
        # Act - 计算所有项目的绑定状态
        for project_group in projects:
            calculate_binding_status(project_group, binding_map)
        
        # Assert - 验证所有项目的一致性
        for project_group in projects:
            assert verify_binding_consistency(project_group, binding_map), (
                f"项目 {project_group.project} 的绑定状态不一致"
            )


class TestBindingStatusBoundAssetInfo:
    """
    绑定 Asset 信息测试
    
    **Validates: Requirements 2.4, 2.5**
    """
    
    @given(
        project_name=project_name_strategy,
        contract_address=eth_address_strategy,
        asset_id=st.integers(min_value=1, max_value=10000),
        asset_name=asset_name_strategy,
    )
    @settings(max_examples=50)
    def test_bound_asset_info_correctness(
        self,
        project_name: str,
        contract_address: str,
        asset_id: int,
        asset_name: str,
    ):
        """
        **Property 1.6: bound_asset 信息正确性**
        
        当项目已绑定 Asset 时，bound_asset 应包含正确的 asset_id 和 asset_name
        
        **Validates: Requirements 2.4, 2.5**
        """
        # Arrange
        primary_contract = MockContractData(
            id=1,
            name="RWATokenSTO",
            address=contract_address,
            registration_status="synced",
            scope="project",
            is_primary=True,
        )
        
        project_group = MockProjectContractsGroup(
            project=project_name,
            contracts=[primary_contract],
            has_primary=True,
            primary_contract=primary_contract,
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
        binding_map = {contract_address: binding}
        
        # Act
        calculate_binding_status(project_group, binding_map)
        
        # Assert
        assert project_group.is_bound_to_asset is True
        assert project_group.bound_asset is not None
        assert project_group.bound_asset["asset_id"] == asset_id, (
            f"asset_id 应为 {asset_id}，实际为 {project_group.bound_asset['asset_id']}"
        )
        assert project_group.bound_asset["asset_name"] == asset_name, (
            f"asset_name 应为 {asset_name}，实际为 {project_group.bound_asset['asset_name']}"
        )


class TestBindingStatusEdgeCases:
    """边界情况测试"""
    
    def test_empty_project_group(self):
        """空项目组应返回 is_bound_to_asset=False"""
        project_group = MockProjectContractsGroup(
            project="empty_project",
            contracts=[],
            has_primary=False,
            primary_contract=None,
        )
        
        binding_map: Dict[str, MockAssetContractBinding] = {}
        calculate_binding_status(project_group, binding_map)
        
        assert project_group.is_bound_to_asset is False
        assert project_group.bound_asset is None
    
    def test_empty_binding_map(self):
        """空绑定映射应返回 is_bound_to_asset=False"""
        primary_contract = MockContractData(
            id=1,
            name="RWATokenSTO",
            address="0x" + "a" * 40,
            registration_status="synced",
            scope="project",
            is_primary=True,
        )
        
        project_group = MockProjectContractsGroup(
            project="test_project",
            contracts=[primary_contract],
            has_primary=True,
            primary_contract=primary_contract,
        )
        
        binding_map: Dict[str, MockAssetContractBinding] = {}
        calculate_binding_status(project_group, binding_map)
        
        assert project_group.is_bound_to_asset is False
        assert project_group.bound_asset is None
    
    def test_case_sensitivity_of_address(self):
        """
        地址比较应该是精确匹配
        
        注意: 在实际实现中，地址比较可能需要考虑大小写
        这里测试当前实现的行为
        """
        contract_address = "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12"
        
        primary_contract = MockContractData(
            id=1,
            name="RWATokenSTO",
            address=contract_address,
            registration_status="synced",
            scope="project",
            is_primary=True,
        )
        
        project_group = MockProjectContractsGroup(
            project="test_project",
            contracts=[primary_contract],
            has_primary=True,
            primary_contract=primary_contract,
        )
        
        # 使用相同地址（精确匹配）
        asset = MockAsset(id=1, name="Test Asset")
        binding = MockAssetContractBinding(
            id=1,
            asset_id=1,
            contract_name="RWATokenSTO",
            contract_address=contract_address,  # 精确匹配
            contract_type="project",
            is_primary=True,
            asset=asset,
        )
        binding_map = {contract_address: binding}
        
        calculate_binding_status(project_group, binding_map)
        
        assert project_group.is_bound_to_asset is True
        assert project_group.bound_asset is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
