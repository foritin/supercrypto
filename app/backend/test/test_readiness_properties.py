#!/usr/bin/env python3
"""
就绪状态计算正确性属性测试
==========================

测试项目合约组的就绪状态 (project_readiness) 计算逻辑的正确性。

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

Property 2: Readiness Calculation Correctness
- project_readiness == "ready" ⟺ 三个条件都满足
- 即：all_registered ∧ no_missing_deps ∧ has_primary

设计文档定义:
∀ project P:
  P.project_readiness == "ready" ⟺ 
    (P.readiness_details.all_registered ∧ 
     P.readiness_details.no_missing_deps ∧ 
     P.readiness_details.has_primary)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional

import pytest
from hypothesis import given, settings, strategies as st, assume


# ============ Mock 数据类 ============

@dataclass
class MockContractData:
    """模拟合约状态数据"""
    id: Optional[int]
    name: str
    address: Optional[str]
    registration_status: str  # synced/not_registered/mismatch
    scope: str  # global/project
    is_primary: bool
    dependencies: List[Dict] = field(default_factory=list)  # [{"key": "...", "registered": True/False}]


@dataclass
class MockReadinessDetails:
    """模拟就绪状态详情"""
    all_registered: bool = False
    no_missing_deps: bool = False
    has_primary: bool = False


@dataclass
class MockProjectContractsGroup:
    """模拟项目合约组"""
    project: str
    contracts: List[MockContractData] = field(default_factory=list)
    has_primary: bool = False
    primary_contract: Optional[MockContractData] = None
    
    # 就绪状态字段
    project_readiness: str = "not_ready"  # ready/partially_ready/not_ready
    readiness_details: MockReadinessDetails = field(default_factory=MockReadinessDetails)


# ============ 核心逻辑模拟 ============

def calculate_readiness_details(
    project_group: MockProjectContractsGroup,
) -> MockReadinessDetails:
    """
    计算项目的就绪详情
    
    模拟 ContractStatusService.get_contract_status() 中的就绪详情计算逻辑
    
    **Validates: Requirements 1.2, 1.3, 1.4**
    """
    # 条件1: 所有合约已注册到 Provider
    all_registered = all(
        c.registration_status == "synced"
        for c in project_group.contracts
    ) if project_group.contracts else False
    
    # 条件2: 所有依赖都已注册 (基于 dependencies 数组的 registered 字段)
    deps_all_registered = all(
        dep.get("registered", False)
        for c in project_group.contracts
        for dep in c.dependencies
    ) if project_group.contracts else True  # 无合约时默认为 True
    no_missing_deps = deps_all_registered
    
    # 条件3: 已设置主合约
    has_primary = project_group.has_primary
    
    return MockReadinessDetails(
        all_registered=all_registered,
        no_missing_deps=no_missing_deps,
        has_primary=has_primary,
    )


def calculate_project_readiness(
    readiness_details: MockReadinessDetails,
) -> str:
    """
    根据就绪详情计算项目就绪状态
    
    模拟 ContractStatusService.get_contract_status() 中的就绪状态映射逻辑
    
    **Validates: Requirements 1.5, 1.6**
    
    Returns:
        "ready" - 三个条件都满足
        "partially_ready" - 有主合约且至少一个其他条件满足
        "not_ready" - 其他情况
    """
    all_registered = readiness_details.all_registered
    no_missing_deps = readiness_details.no_missing_deps
    has_primary = readiness_details.has_primary
    
    if all_registered and no_missing_deps and has_primary:
        return "ready"
    elif has_primary and (all_registered or no_missing_deps):
        return "partially_ready"
    else:
        return "not_ready"


def apply_readiness_calculation(
    project_group: MockProjectContractsGroup,
) -> None:
    """
    应用就绪状态计算到项目组
    
    **Validates: Requirements 1.1-1.6**
    """
    # 计算就绪详情
    project_group.readiness_details = calculate_readiness_details(project_group)
    
    # 计算就绪状态
    project_group.project_readiness = calculate_project_readiness(
        project_group.readiness_details
    )


def verify_readiness_correctness(
    project_group: MockProjectContractsGroup,
) -> bool:
    """
    验证就绪状态计算正确性
    
    Property 2: project_readiness == "ready" ⟺ 三个条件都满足
    
    **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
    
    Returns:
        True 如果正确性满足，False 否则
    """
    details = project_group.readiness_details
    
    # 检查三个条件是否都满足
    all_conditions_met = (
        details.all_registered and
        details.no_missing_deps and
        details.has_primary
    )
    
    # 验证双向蕴含
    # project_readiness == "ready" ⟺ all_conditions_met
    is_ready = project_group.project_readiness == "ready"
    
    return is_ready == all_conditions_met


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

# 注册状态策略
registration_status_strategy = st.sampled_from(["synced", "not_registered", "mismatch"])

# 依赖名称策略
dependency_name_strategy = st.sampled_from([
    "KYCManager", "AddressProvider", "MockUSDT", "MockUSDC"
])


# ============ 属性测试 ============

class TestReadinessCalculationCorrectnessProperties:
    """
    就绪状态计算正确性属性测试
    
    **Property 2: Readiness Calculation Correctness**
    **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
    """
    
    @given(
        project_name=project_name_strategy,
        all_registered=st.booleans(),
        no_missing_deps=st.booleans(),
        has_primary=st.booleans(),
    )
    @settings(max_examples=100)
    def test_readiness_biconditional_property(
        self,
        project_name: str,
        all_registered: bool,
        no_missing_deps: bool,
        has_primary: bool,
    ):
        """
        **Property 2.1: 就绪状态双向蕴含**
        
        验证: project_readiness == "ready" ⟺ (all_registered ∧ no_missing_deps ∧ has_primary)
        
        **Validates: Requirements 1.5, 1.6**
        """
        # Arrange - 直接使用就绪详情
        readiness_details = MockReadinessDetails(
            all_registered=all_registered,
            no_missing_deps=no_missing_deps,
            has_primary=has_primary,
        )
        
        # Act - 计算就绪状态
        project_readiness = calculate_project_readiness(readiness_details)
        
        # Assert - 验证双向蕴含
        all_conditions_met = all_registered and no_missing_deps and has_primary
        is_ready = project_readiness == "ready"
        
        assert is_ready == all_conditions_met, (
            f"就绪状态双向蕴含失败: "
            f"project_readiness={project_readiness}, "
            f"all_registered={all_registered}, "
            f"no_missing_deps={no_missing_deps}, "
            f"has_primary={has_primary}, "
            f"all_conditions_met={all_conditions_met}"
        )
    
    @given(
        project_name=project_name_strategy,
        num_contracts=st.integers(min_value=1, max_value=5),
        data=st.data(),
    )
    @settings(max_examples=100)
    def test_all_registered_condition(
        self,
        project_name: str,
        num_contracts: int,
        data,
    ):
        """
        **Property 2.2: all_registered 条件计算正确性**
        
        验证: all_registered == True ⟺ 所有合约的 registration_status == "synced"
        
        **Validates: Requirements 1.2**
        """
        # Arrange - 生成合约列表
        contracts: List[MockContractData] = []
        all_synced = True
        
        for i in range(num_contracts):
            status = data.draw(registration_status_strategy)
            if status != "synced":
                all_synced = False
            
            contract = MockContractData(
                id=i + 1,
                name=f"Contract_{i}",
                address=data.draw(eth_address_strategy),
                registration_status=status,
                scope="project",
                is_primary=(i == 0),
            )
            contracts.append(contract)
        
        project_group = MockProjectContractsGroup(
            project=project_name,
            contracts=contracts,
            has_primary=True,
            primary_contract=contracts[0] if contracts else None,
        )
        
        # Act - 计算就绪详情
        readiness_details = calculate_readiness_details(project_group)
        
        # Assert - 验证 all_registered 条件
        assert readiness_details.all_registered == all_synced, (
            f"all_registered 条件计算错误: "
            f"expected={all_synced}, actual={readiness_details.all_registered}, "
            f"statuses={[c.registration_status for c in contracts]}"
        )
    
    @given(
        project_name=project_name_strategy,
        num_contracts=st.integers(min_value=1, max_value=3),
        all_deps_registered=st.booleans(),
        data=st.data(),
    )
    @settings(max_examples=100)
    def test_no_missing_deps_condition(
        self,
        project_name: str,
        num_contracts: int,
        all_deps_registered: bool,
        data,
    ):
        """
        **Property 2.3: no_missing_deps 条件计算正确性**
        
        验证: no_missing_deps == True ⟺ 所有依赖的 registered 字段都为 True
        
        **Validates: Requirements 1.3**
        """
        # Arrange - 生成合约列表，每个合约有依赖
        contracts: List[MockContractData] = []
        for i in range(num_contracts):
            num_deps = data.draw(st.integers(min_value=0, max_value=2))
            deps = []
            for j in range(num_deps):
                dep_name = data.draw(dependency_name_strategy)
                # 根据 all_deps_registered 决定依赖是否已注册
                deps.append({
                    "key": dep_name,
                    "contract": dep_name,
                    "registered": all_deps_registered,
                })
            
            contracts.append(MockContractData(
                id=i + 1,
                name=f"Contract{i}",
                address=f"0x{i:040x}",
                registration_status="synced",
                scope="project",
                is_primary=False,
                dependencies=deps,
            ))
        
        project_group = MockProjectContractsGroup(
            project=project_name,
            contracts=contracts,
            has_primary=False,
        )
        
        # Act - 计算就绪详情
        readiness_details = calculate_readiness_details(project_group)
        
        # Assert - 验证 no_missing_deps 条件
        # 如果没有依赖，则 no_missing_deps 应为 True
        has_any_deps = any(c.dependencies for c in contracts)
        if not has_any_deps:
            expected_no_missing = True
        else:
            expected_no_missing = all_deps_registered
        
        assert readiness_details.no_missing_deps == expected_no_missing, (
            f"no_missing_deps 条件计算错误: "
            f"expected={expected_no_missing}, actual={readiness_details.no_missing_deps}, "
            f"all_deps_registered={all_deps_registered}"
        )
    
    @given(
        project_name=project_name_strategy,
        has_primary=st.booleans(),
    )
    @settings(max_examples=50)
    def test_has_primary_condition(
        self,
        project_name: str,
        has_primary: bool,
    ):
        """
        **Property 2.4: has_primary 条件计算正确性**
        
        验证: has_primary 直接从项目组的 has_primary 字段获取
        
        **Validates: Requirements 1.4**
        """
        # Arrange
        project_group = MockProjectContractsGroup(
            project=project_name,
            contracts=[],
            has_primary=has_primary,
        )
        
        # Act - 计算就绪详情
        readiness_details = calculate_readiness_details(project_group)
        
        # Assert - 验证 has_primary 条件
        assert readiness_details.has_primary == has_primary, (
            f"has_primary 条件计算错误: "
            f"expected={has_primary}, actual={readiness_details.has_primary}"
        )
    
    @given(
        project_name=project_name_strategy,
        num_contracts=st.integers(min_value=1, max_value=5),
        all_deps_registered=st.booleans(),
        has_primary=st.booleans(),
        data=st.data(),
    )
    @settings(max_examples=100)
    def test_full_readiness_calculation(
        self,
        project_name: str,
        num_contracts: int,
        all_deps_registered: bool,
        has_primary: bool,
        data,
    ):
        """
        **Property 2.5: 完整就绪状态计算正确性**
        
        验证完整的就绪状态计算流程，包括:
        1. 从合约列表计算 all_registered
        2. 从依赖的 registered 字段计算 no_missing_deps
        3. 从 has_primary 字段获取 has_primary
        4. 根据三个条件计算 project_readiness
        
        **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
        """
        # Arrange - 生成合约列表
        contracts: List[MockContractData] = []
        primary_contract: Optional[MockContractData] = None
        
        for i in range(num_contracts):
            status = data.draw(registration_status_strategy)
            is_primary = (i == 0) and has_primary
            
            # 生成依赖列表
            num_deps = data.draw(st.integers(min_value=0, max_value=2))
            deps = []
            for j in range(num_deps):
                dep_name = data.draw(dependency_name_strategy)
                deps.append({
                    "key": dep_name,
                    "contract": dep_name,
                    "registered": all_deps_registered,
                })
            
            contract = MockContractData(
                id=i + 1,
                name=f"Contract_{i}",
                address=data.draw(eth_address_strategy),
                registration_status=status,
                scope="project",
                is_primary=is_primary,
                dependencies=deps,
            )
            contracts.append(contract)
            
            if is_primary:
                primary_contract = contract
        
        project_group = MockProjectContractsGroup(
            project=project_name,
            contracts=contracts,
            has_primary=has_primary,
            primary_contract=primary_contract,
        )
        
        # Act - 应用就绪状态计算
        apply_readiness_calculation(project_group)
        
        # Assert - 验证正确性
        assert verify_readiness_correctness(project_group), (
            f"就绪状态计算不正确: "
            f"project_readiness={project_group.project_readiness}, "
            f"readiness_details={project_group.readiness_details}"
        )


class TestReadinessStatusMapping:
    """
    就绪状态映射测试
    
    **Validates: Requirements 1.5, 1.6**
    """
    
    def test_ready_status_all_conditions_met(self):
        """
        **Property 2.6: ready 状态 - 三个条件都满足**
        
        **Validates: Requirements 1.5**
        """
        readiness_details = MockReadinessDetails(
            all_registered=True,
            no_missing_deps=True,
            has_primary=True,
        )
        
        status = calculate_project_readiness(readiness_details)
        
        assert status == "ready", (
            f"三个条件都满足时应返回 'ready'，实际返回 '{status}'"
        )
    
    @given(
        all_registered=st.booleans(),
        no_missing_deps=st.booleans(),
    )
    @settings(max_examples=50)
    def test_not_ready_without_primary(
        self,
        all_registered: bool,
        no_missing_deps: bool,
    ):
        """
        **Property 2.7: 无主合约时不能为 ready**
        
        **Validates: Requirements 1.4, 1.6**
        """
        readiness_details = MockReadinessDetails(
            all_registered=all_registered,
            no_missing_deps=no_missing_deps,
            has_primary=False,  # 无主合约
        )
        
        status = calculate_project_readiness(readiness_details)
        
        assert status != "ready", (
            f"无主合约时不应返回 'ready'，实际返回 '{status}'"
        )
    
    @given(
        all_registered=st.booleans(),
        no_missing_deps=st.booleans(),
    )
    @settings(max_examples=50)
    def test_partially_ready_with_primary_and_one_condition(
        self,
        all_registered: bool,
        no_missing_deps: bool,
    ):
        """
        **Property 2.8: partially_ready 状态条件**
        
        有主合约且至少一个其他条件满足（但不是全部）时应为 partially_ready
        
        **Validates: Requirements 1.5, 1.6**
        """
        # 跳过三个条件都满足的情况（应该是 ready）
        assume(not (all_registered and no_missing_deps))
        # 跳过两个其他条件都不满足的情况（应该是 not_ready）
        assume(all_registered or no_missing_deps)
        
        readiness_details = MockReadinessDetails(
            all_registered=all_registered,
            no_missing_deps=no_missing_deps,
            has_primary=True,
        )
        
        status = calculate_project_readiness(readiness_details)
        
        assert status == "partially_ready", (
            f"有主合约且部分条件满足时应返回 'partially_ready'，实际返回 '{status}'"
        )
    
    def test_not_ready_no_conditions_met(self):
        """
        **Property 2.9: not_ready 状态 - 无条件满足**
        
        **Validates: Requirements 1.6**
        """
        readiness_details = MockReadinessDetails(
            all_registered=False,
            no_missing_deps=False,
            has_primary=False,
        )
        
        status = calculate_project_readiness(readiness_details)
        
        assert status == "not_ready", (
            f"无条件满足时应返回 'not_ready'，实际返回 '{status}'"
        )
    
    def test_not_ready_only_primary(self):
        """
        **Property 2.10: not_ready 状态 - 仅有主合约**
        
        只有主合约但其他两个条件都不满足时应为 not_ready
        
        **Validates: Requirements 1.6**
        """
        readiness_details = MockReadinessDetails(
            all_registered=False,
            no_missing_deps=False,
            has_primary=True,
        )
        
        status = calculate_project_readiness(readiness_details)
        
        assert status == "not_ready", (
            f"仅有主合约时应返回 'not_ready'，实际返回 '{status}'"
        )


class TestReadinessEdgeCases:
    """就绪状态边界情况测试"""
    
    def test_empty_contracts_list(self):
        """
        空合约列表时 all_registered 应为 False
        
        注意: 空列表的 all() 在 Python 中返回 True，
        但业务逻辑上空项目不应该被认为是"所有合约已注册"
        """
        project_group = MockProjectContractsGroup(
            project="empty_project",
            contracts=[],
            has_primary=False,
        )
        
        readiness_details = calculate_readiness_details(project_group)
        
        # 空合约列表时，all_registered 应为 False（业务逻辑）
        assert readiness_details.all_registered is False, (
            "空合约列表时 all_registered 应为 False"
        )
    
    def test_single_synced_contract(self):
        """单个已同步合约时 all_registered 应为 True"""
        contract = MockContractData(
            id=1,
            name="RWATokenSTO",
            address="0x" + "a" * 40,
            registration_status="synced",
            scope="project",
            is_primary=True,
        )
        
        project_group = MockProjectContractsGroup(
            project="test_project",
            contracts=[contract],
            has_primary=True,
            primary_contract=contract,
        )
        
        readiness_details = calculate_readiness_details(project_group)
        
        assert readiness_details.all_registered is True, (
            "单个已同步合约时 all_registered 应为 True"
        )
    
    def test_mixed_registration_status(self):
        """混合注册状态时 all_registered 应为 False"""
        contracts = [
            MockContractData(
                id=1,
                name="Contract1",
                address="0x" + "a" * 40,
                registration_status="synced",
                scope="project",
                is_primary=True,
            ),
            MockContractData(
                id=2,
                name="Contract2",
                address="0x" + "b" * 40,
                registration_status="not_registered",  # 未注册
                scope="project",
                is_primary=False,
            ),
        ]
        
        project_group = MockProjectContractsGroup(
            project="test_project",
            contracts=contracts,
            has_primary=True,
            primary_contract=contracts[0],
        )
        
        readiness_details = calculate_readiness_details(project_group)
        
        assert readiness_details.all_registered is False, (
            "存在未注册合约时 all_registered 应为 False"
        )
    
    def test_all_synced_contracts(self):
        """所有合约都已同步时 all_registered 应为 True"""
        contracts = [
            MockContractData(
                id=i,
                name=f"Contract{i}",
                address=f"0x{'a' * 39}{i}",
                registration_status="synced",
                scope="project",
                is_primary=(i == 1),
            )
            for i in range(1, 4)
        ]
        
        project_group = MockProjectContractsGroup(
            project="test_project",
            contracts=contracts,
            has_primary=True,
            primary_contract=contracts[0],
        )
        
        readiness_details = calculate_readiness_details(project_group)
        
        assert readiness_details.all_registered is True, (
            "所有合约都已同步时 all_registered 应为 True"
        )
    
    def test_complete_ready_project(self):
        """完整就绪项目测试"""
        contract = MockContractData(
            id=1,
            name="RWATokenSTO",
            address="0x" + "a" * 40,
            registration_status="synced",
            scope="project",
            is_primary=True,
            dependencies=[],  # 无依赖
        )
        
        project_group = MockProjectContractsGroup(
            project="vanke",
            contracts=[contract],
            has_primary=True,
            primary_contract=contract,
        )
        
        apply_readiness_calculation(project_group)
        
        assert project_group.project_readiness == "ready", (
            f"完整就绪项目应返回 'ready'，实际返回 '{project_group.project_readiness}'"
        )
        assert project_group.readiness_details.all_registered is True
        assert project_group.readiness_details.no_missing_deps is True
        assert project_group.readiness_details.has_primary is True
        assert verify_readiness_correctness(project_group)


class TestReadinessStatusExhaustive:
    """
    就绪状态穷举测试
    
    测试所有 8 种可能的条件组合
    """
    
    @pytest.mark.parametrize(
        "all_registered,no_missing_deps,has_primary,expected_status",
        [
            # 三个条件都满足 -> ready
            (True, True, True, "ready"),
            # 有主合约 + 一个其他条件 -> partially_ready
            (True, False, True, "partially_ready"),
            (False, True, True, "partially_ready"),
            # 有主合约但其他条件都不满足 -> not_ready
            (False, False, True, "not_ready"),
            # 无主合约 -> not_ready (无论其他条件)
            (True, True, False, "not_ready"),
            (True, False, False, "not_ready"),
            (False, True, False, "not_ready"),
            (False, False, False, "not_ready"),
        ],
    )
    def test_all_condition_combinations(
        self,
        all_registered: bool,
        no_missing_deps: bool,
        has_primary: bool,
        expected_status: str,
    ):
        """
        **Property 2.11: 所有条件组合的就绪状态**
        
        穷举测试所有 8 种条件组合
        
        **Validates: Requirements 1.5, 1.6**
        """
        readiness_details = MockReadinessDetails(
            all_registered=all_registered,
            no_missing_deps=no_missing_deps,
            has_primary=has_primary,
        )
        
        status = calculate_project_readiness(readiness_details)
        
        assert status == expected_status, (
            f"条件组合 (all_registered={all_registered}, "
            f"no_missing_deps={no_missing_deps}, has_primary={has_primary}) "
            f"应返回 '{expected_status}'，实际返回 '{status}'"
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
