"""
部署顺序计算器

Story 10.4: 部署顺序计算（拓扑排序）

基于依赖关系图的 Kahn 算法实现，支持：
- 分层拓扑排序
- 按 deploy_order 权重排序
- 排除已部署合约
- 循环依赖检测
"""

from collections import deque
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

from falib.utils.log import get_logger

from src.models.project_registry import ContractDeploymentStatus, ProjectContractConfig
from src.shared.schemas.enums import ContractRegistryStatus

from .config_loader import get_config_loader
from .schemas import ProjectConfigSchema

logger = get_logger("project_registry.deployment_order")


@dataclass
class DeploymentStep:
    """单个部署步骤"""

    order: int  # 全局顺序（1-based）
    phase: int  # 所属阶段（层次）
    contract_name: str
    deploy_order: int  # 配置的部署优先级
    dependencies: List[str] = field(default_factory=list)
    is_deployed: bool = False


@dataclass
class DeploymentPlan:
    """部署计划"""

    project_name: str
    total_steps: int = 0
    phases: Dict[int, List[DeploymentStep]] = field(default_factory=dict)
    steps: List[DeploymentStep] = field(default_factory=list)

    # 统计
    deployed_count: int = 0
    pending_count: int = 0

    def get_next_deployable(self) -> List[str]:
        """获取下一批可部署的合约（当前阶段中未部署的）"""
        for phase_num in sorted(self.phases.keys()):
            phase_steps = self.phases[phase_num]
            pending = [s for s in phase_steps if not s.is_deployed]
            if pending:
                return [s.contract_name for s in pending]
        return []

    def to_flat_list(self) -> List[str]:
        """转换为扁平顺序列表"""
        return [s.contract_name for s in self.steps]

    def get_phase_summary(self) -> Dict[int, Dict[str, any]]:
        """获取各阶段摘要"""
        summary = {}
        for phase_num, steps in self.phases.items():
            summary[phase_num] = {
                "total": len(steps),
                "deployed": sum(1 for s in steps if s.is_deployed),
                "pending": sum(1 for s in steps if not s.is_deployed),
                "contracts": [s.contract_name for s in steps],
            }
        return summary


class DeploymentOrderCalculator:
    """
    部署顺序计算器
    
    使用 Kahn 算法（BFS 拓扑排序）计算合约部署顺序
    """

    def __init__(self):
        self.config_loader = get_config_loader()

    async def calculate_order(
        self,
        project_name: str,
        exclude_deployed: bool = False,
        network: Optional[str] = None,
    ) -> DeploymentPlan:
        """
        计算部署顺序

        Args:
            project_name: 项目名称
            exclude_deployed: 是否排除已部署合约
            network: 网络名称（用于检查已部署状态）

        Returns:
            DeploymentPlan: 部署计划
        """
        # 加载配置
        config = self.config_loader.load_config(project_name)

        # 获取已部署合约
        deployed_set: Set[str] = set()
        if network:
            deployed_set = await self._get_deployed_contracts(project_name, network)

        # 构建依赖图
        graph, in_degree, order_map, deps_map = self._build_dependency_graph(config)

        # 如果排除已部署，需要调整图
        if exclude_deployed and deployed_set:
            graph, in_degree = self._adjust_graph_for_deployed(
                graph, in_degree, deployed_set
            )

        # 拓扑排序
        phases, ordered = self._topological_sort(
            graph, in_degree, order_map, deps_map, deployed_set
        )

        # 构建部署计划
        plan = DeploymentPlan(
            project_name=project_name,
            phases=phases,
            steps=ordered,
            total_steps=len(ordered),
            deployed_count=len(deployed_set),
            pending_count=len(ordered) - sum(1 for s in ordered if s.is_deployed),
        )

        logger.debug(
            f"计算部署顺序: {project_name}, "
            f"总步骤={plan.total_steps}, "
            f"已部署={plan.deployed_count}"
        )

        return plan

    def _build_dependency_graph(
        self, config: ProjectConfigSchema
    ) -> Tuple[Dict[str, Set[str]], Dict[str, int], Dict[str, int], Dict[str, List[str]]]:
        """
        构建依赖图

        Returns:
            (graph, in_degree, order_map, deps_map)
            - graph: {node: set(dependents)}  邻接表（指向依赖它的节点）
            - in_degree: {node: count}  入度（依赖数量）
            - order_map: {node: deploy_order}  部署优先级
            - deps_map: {node: [dependencies]}  依赖列表
        """
        contract_names = {c.name for c in config.contracts}

        graph: Dict[str, Set[str]] = {c.name: set() for c in config.contracts}
        in_degree: Dict[str, int] = {c.name: 0 for c in config.contracts}
        order_map: Dict[str, int] = {}
        deps_map: Dict[str, List[str]] = {}

        for contract in config.contracts:
            order_map[contract.name] = contract.deploy_order

            # 只考虑项目内的依赖（required_deps）
            deps = set(contract.required_deps) & contract_names
            deps_map[contract.name] = list(deps)

            for dep in deps:
                # dep -> contract (dep 必须先部署，contract 依赖 dep)
                graph[dep].add(contract.name)
                in_degree[contract.name] += 1

        return graph, in_degree, order_map, deps_map

    def _adjust_graph_for_deployed(
        self,
        graph: Dict[str, Set[str]],
        in_degree: Dict[str, int],
        deployed_set: Set[str],
    ) -> Tuple[Dict[str, Set[str]], Dict[str, int]]:
        """
        调整图以排除已部署合约

        已部署合约视为已满足的依赖，从图中移除
        """
        # 复制数据
        new_graph = {k: set(v) for k, v in graph.items() if k not in deployed_set}
        new_in_degree = {k: v for k, v in in_degree.items() if k not in deployed_set}

        # 减少因已部署合约满足的入度
        for deployed in deployed_set:
            for dependent in graph.get(deployed, set()):
                if dependent in new_in_degree:
                    new_in_degree[dependent] = max(0, new_in_degree[dependent] - 1)

        return new_graph, new_in_degree

    def _topological_sort(
        self,
        graph: Dict[str, Set[str]],
        in_degree: Dict[str, int],
        order_map: Dict[str, int],
        deps_map: Dict[str, List[str]],
        deployed_set: Set[str],
    ) -> Tuple[Dict[int, List[DeploymentStep]], List[DeploymentStep]]:
        """
        Kahn 算法拓扑排序（分层）

        Returns:
            (phases, ordered_steps)
        """
        phases: Dict[int, List[DeploymentStep]] = {}
        ordered: List[DeploymentStep] = []

        # 复制入度（避免修改原数据）
        in_deg = dict(in_degree)

        # 初始化：入度为 0 的节点
        current_phase = 1
        current_level: List[str] = [n for n in in_deg if in_deg[n] == 0]

        global_order = 1

        while current_level:
            # 按 deploy_order 和名称排序
            current_level.sort(key=lambda x: (order_map.get(x, 999), x))

            phases[current_phase] = []
            next_level: List[str] = []

            for node in current_level:
                # 创建步骤
                step = DeploymentStep(
                    order=global_order,
                    phase=current_phase,
                    contract_name=node,
                    deploy_order=order_map.get(node, 0),
                    dependencies=deps_map.get(node, []),
                    is_deployed=node in deployed_set,
                )

                ordered.append(step)
                phases[current_phase].append(step)
                global_order += 1

                # 更新邻居入度，收集下一层节点
                for neighbor in graph.get(node, set()):
                    if neighbor in in_deg:
                        in_deg[neighbor] -= 1
                        if in_deg[neighbor] == 0:
                            next_level.append(neighbor)

            current_level = next_level
            current_phase += 1

        # 检查是否有未处理的节点（循环依赖）
        if len(ordered) != len(in_degree):
            remaining = set(in_degree.keys()) - {s.contract_name for s in ordered}
            raise ValueError(f"检测到循环依赖，涉及合约: {remaining}")

        return phases, ordered

    async def _get_deployed_contracts(
        self, project_name: str, network: str
    ) -> Set[str]:
        """获取已部署的合约集合"""
        deployed_statuses = [
            ContractRegistryStatus.DEPLOYED,
            ContractRegistryStatus.BOUND,
            ContractRegistryStatus.ACTIVE,
        ]

        deployed = await ContractDeploymentStatus.filter(
            config__project_name=project_name,
            network=network,
            status__in=[s.value for s in deployed_statuses],
        ).values_list("config__contract_name", flat=True)

        return set(deployed)

    # ===== 便捷方法 =====

    async def get_next_deployable(
        self, project_name: str, network: str
    ) -> List[str]:
        """获取下一批可部署的合约"""
        plan = await self.calculate_order(
            project_name, exclude_deployed=True, network=network
        )
        return plan.get_next_deployable()

    async def get_deployment_phases(self, project_name: str) -> Dict[int, List[str]]:
        """
        获取部署阶段划分

        Returns:
            {phase: [contract_names]}
        """
        plan = await self.calculate_order(project_name, exclude_deployed=False)
        return {
            phase: [s.contract_name for s in steps]
            for phase, steps in plan.phases.items()
        }

    def calculate_order_from_config(
        self, config: ProjectConfigSchema
    ) -> List[str]:
        """
        从配置直接计算顺序（不查数据库）

        用于配置验证和预览
        """
        graph, in_degree, order_map, deps_map = self._build_dependency_graph(config)

        # 简化版拓扑排序
        result = []
        in_deg = dict(in_degree)
        current_level = [n for n in in_deg if in_deg[n] == 0]

        while current_level:
            current_level.sort(key=lambda x: (order_map.get(x, 999), x))

            for node in current_level:
                result.append(node)

            next_level = []
            for node in current_level:
                for neighbor in graph[node]:
                    in_deg[neighbor] -= 1
                    if in_deg[neighbor] == 0:
                        next_level.append(neighbor)

            current_level = next_level

        return result

    async def validate_deployment_order(
        self, project_name: str, proposed_order: List[str]
    ) -> Tuple[bool, Optional[str]]:
        """
        验证提议的部署顺序是否有效

        Returns:
            (is_valid, error_message)
        """
        config = self.config_loader.load_config(project_name)
        contract_names = {c.name for c in config.contracts}

        # 检查是否包含所有合约
        proposed_set = set(proposed_order)
        if proposed_set != contract_names:
            missing = contract_names - proposed_set
            extra = proposed_set - contract_names
            errors = []
            if missing:
                errors.append(f"缺少合约: {missing}")
            if extra:
                errors.append(f"未知合约: {extra}")
            return False, "; ".join(errors)

        # 检查依赖顺序
        deployed_so_far: Set[str] = set()
        graph, _, _, deps_map = self._build_dependency_graph(config)

        for contract in proposed_order:
            deps = set(deps_map.get(contract, []))
            unmet = deps - deployed_so_far
            if unmet:
                return False, f"合约 '{contract}' 的依赖 {unmet} 尚未部署"
            deployed_so_far.add(contract)

        return True, None


# ===== 工厂函数 =====

_calculator_instance: Optional[DeploymentOrderCalculator] = None


def get_deployment_calculator() -> DeploymentOrderCalculator:
    """获取部署顺序计算器单例"""
    global _calculator_instance
    if _calculator_instance is None:
        _calculator_instance = DeploymentOrderCalculator()
    return _calculator_instance
