"""
项目就绪状态检查服务

Story 10.3: 项目就绪状态检查服务
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from falib.utils.log import get_logger

from src.models.contracts.contract_config import ContractConfig
from src.models.contracts.contract_deployment import ContractDeployment
from src.shared.schemas.enums import ContractStatus
from src.shared.schemas.enums.contract import (
    ContractRegistryStatus,
    DependencyType,
    ProjectReadiness,
)

from .config_loader import get_config_loader

logger = get_logger("contract.readiness")


@dataclass
class ContractReadinessInfo:
    """单个合约就绪信息"""

    contract_name: str
    config_id: Optional[int] = None
    dependency_type: DependencyType = DependencyType.BUSINESS
    is_primary: bool = False

    # 状态信息
    is_registered: bool = False
    is_deployed: bool = False
    current_status: Optional[ContractRegistryStatus] = None
    address: Optional[str] = None
    network: Optional[str] = None

    # 依赖信息
    required_deps: List[str] = field(default_factory=list)
    optional_deps: List[str] = field(default_factory=list)
    missing_required_deps: List[str] = field(default_factory=list)
    missing_optional_deps: List[str] = field(default_factory=list)
    zero_bound_deps: List[str] = field(default_factory=list)

    # 就绪判断
    is_ready: bool = False
    blocking_reason: Optional[str] = None

    @property
    def can_deploy(self) -> bool:
        """是否可以部署（所有必须依赖已部署）"""
        return len(self.missing_required_deps) == 0 and not self.is_deployed


@dataclass
class ProjectStatusReport:
    """项目状态报告"""

    project_name: str
    readiness: ProjectReadiness = ProjectReadiness.NOT_READY

    # 统计
    total_contracts: int = 0
    registered_count: int = 0
    deployed_count: int = 0
    active_count: int = 0

    # 分类
    primary_contract: Optional[ContractReadinessInfo] = None
    contracts: Dict[str, ContractReadinessInfo] = field(default_factory=dict)

    # 分析
    blocking_contracts: List[str] = field(default_factory=list)
    deployable_contracts: List[str] = field(default_factory=list)
    missing_dependencies: Dict[str, List[str]] = field(default_factory=dict)

    # 摘要
    summary: str = ""


class ProjectReadinessChecker:
    """项目就绪状态检查器"""

    def __init__(self, network: str = "hardhat"):
        self.network = network
        self.config_loader = get_config_loader()

    async def get_project_status(
        self, project_name: str, network: Optional[str] = None
    ) -> ProjectStatusReport:
        """
        获取项目完整状态报告

        Args:
            project_name: 项目名称
            network: 网络名称，默认使用初始化时的网络

        Returns:
            ProjectStatusReport: 完整状态报告
        """
        network = network or self.network
        report = ProjectStatusReport(
            project_name=project_name, readiness=ProjectReadiness.NOT_READY
        )

        # 1. 获取项目所有合约配置 (使用新的 ContractConfig 模型)
        configs = await ContractConfig.filter(project_name=project_name).all()

        if not configs:
            report.summary = f"项目 '{project_name}' 未找到任何合约配置"
            return report

        report.total_contracts = len(configs)

        # 2. 构建合约状态信息
        for config in configs:
            info = await self._build_contract_info(config, network)
            report.contracts[config.contract_name] = info

            if config.is_primary:
                report.primary_contract = info

            # 统计
            if info.is_registered:
                report.registered_count += 1
            if info.is_deployed:
                report.deployed_count += 1
            if info.current_status == ContractRegistryStatus.ACTIVE:
                report.active_count += 1

        # 3. 分析依赖关系
        self._analyze_dependencies(report)

        # 4. 计算就绪状态
        report.readiness = self._compute_readiness(report)

        # 5. 生成摘要
        report.summary = self._generate_summary(report)

        return report

    async def _build_contract_info(
        self, config: ContractConfig, network: str
    ) -> ContractReadinessInfo:
        """构建单个合约状态信息"""
        info = ContractReadinessInfo(
            contract_name=config.contract_name,
            config_id=config.id,
            dependency_type=config.dependency_type,
            is_primary=config.is_primary,
            is_registered=True,
            required_deps=config.required_deps or [],
            optional_deps=config.optional_deps or [],
        )

        # 获取部署状态 (使用新的 ContractDeployment 模型)
        deployment = await ContractDeployment.filter(
            name=config.contract_name, network=network
        ).first()

        if deployment:
            info.is_deployed = bool(deployment.address)
            # 映射 ContractStatus 到 ContractRegistryStatus
            info.current_status = self._map_contract_to_registry_status(
                deployment.status
            )
            info.address = deployment.address
            info.network = deployment.network.value if deployment.network else network

            # 分析绑定状态
            bindings = deployment.bindings or {}
            for dep in info.required_deps:
                binding = bindings.get(dep, {})
                if not binding.get("is_bound", False):
                    info.missing_required_deps.append(dep)
                elif binding.get("is_zero", False):
                    info.zero_bound_deps.append(dep)

            for dep in info.optional_deps:
                binding = bindings.get(dep, {})
                if not binding.get("is_bound", False):
                    info.missing_optional_deps.append(dep)
        else:
            info.current_status = ContractRegistryStatus.REGISTERED
            info.missing_required_deps = list(info.required_deps)
            info.missing_optional_deps = list(info.optional_deps)

        # 判断就绪
        info.is_ready = self._is_contract_ready(info)
        if not info.is_ready:
            info.blocking_reason = self._get_blocking_reason(info)

        return info

    def _map_contract_to_registry_status(
        self, status: Optional[ContractStatus]
    ) -> ContractRegistryStatus:
        """映射 ContractStatus 到 ContractRegistryStatus"""
        if status == ContractStatus.ACTIVE:
            return ContractRegistryStatus.ACTIVE
        elif status == ContractStatus.PAUSED:
            return ContractRegistryStatus.DEPLOYED
        elif status == ContractStatus.DEPRECATED:
            return ContractRegistryStatus.DEPLOYED
        elif status == ContractStatus.FROZEN:
            return ContractRegistryStatus.DEPLOYED
        return ContractRegistryStatus.REGISTERED

    def _is_contract_ready(self, info: ContractReadinessInfo) -> bool:
        """判断合约是否就绪"""
        if info.current_status != ContractRegistryStatus.ACTIVE:
            return False

        # 检查必须依赖（零地址绑定算已绑定）
        unbound_required = [
            dep for dep in info.missing_required_deps if dep not in info.zero_bound_deps
        ]
        return len(unbound_required) == 0

    def _get_blocking_reason(self, info: ContractReadinessInfo) -> str:
        """获取阻塞原因"""
        reasons = []

        if not info.is_deployed:
            reasons.append("未部署")
        elif info.current_status != ContractRegistryStatus.ACTIVE:
            reasons.append(f"状态为 {info.current_status.value}")

        if info.missing_required_deps:
            reasons.append(f"缺失依赖: {', '.join(info.missing_required_deps)}")

        return "; ".join(reasons) if reasons else "未知原因"

    def _analyze_dependencies(self, report: ProjectStatusReport):
        """分析依赖关系"""
        # 找出已部署合约
        deployed_names = {
            name for name, info in report.contracts.items() if info.is_deployed
        }

        for name, info in report.contracts.items():
            if info.is_deployed:
                continue

            # 检查所有必须依赖是否已部署
            deps_satisfied = all(
                dep in deployed_names or dep not in report.contracts
                for dep in info.required_deps
            )

            if deps_satisfied:
                report.deployable_contracts.append(name)
            else:
                # 找出缺失的依赖
                missing = [
                    dep
                    for dep in info.required_deps
                    if dep not in deployed_names and dep in report.contracts
                ]
                if missing:
                    report.missing_dependencies[name] = missing

        # 找出阻塞合约（被其他合约依赖但未就绪）
        blocking = set()
        for name, info in report.contracts.items():
            if not info.is_ready:
                # 检查是否有其他合约依赖它
                for other_name, other_info in report.contracts.items():
                    if name in other_info.required_deps:
                        blocking.add(name)
                        break

        report.blocking_contracts = list(blocking)

    def _compute_readiness(self, report: ProjectStatusReport) -> ProjectReadiness:
        """计算项目就绪状态"""
        # 检查主合约
        if not report.primary_contract or not report.primary_contract.is_ready:
            return ProjectReadiness.NOT_READY

        # 检查 REQUIRED 合约
        required_contracts = [
            info
            for info in report.contracts.values()
            if info.dependency_type == DependencyType.REQUIRED
        ]
        if any(not c.is_ready for c in required_contracts):
            return ProjectReadiness.NOT_READY

        # 检查 BUSINESS 合约
        business_contracts = [
            info
            for info in report.contracts.values()
            if info.dependency_type == DependencyType.BUSINESS
        ]
        if any(not c.is_ready for c in business_contracts):
            return ProjectReadiness.PARTIALLY_READY

        return ProjectReadiness.FULLY_READY

    def _generate_summary(self, report: ProjectStatusReport) -> str:
        """生成状态摘要"""
        lines = [
            f"项目 '{report.project_name}' 状态: {report.readiness.value}",
            f"合约统计: {report.active_count}/{report.total_contracts} 已激活",
        ]

        if report.blocking_contracts:
            lines.append(f"阻塞合约: {', '.join(report.blocking_contracts)}")

        if report.deployable_contracts:
            lines.append(f"可部署: {', '.join(report.deployable_contracts)}")

        return "\n".join(lines)

    # ===== 便捷方法 =====

    async def is_project_ready(
        self,
        project_name: str,
        network: Optional[str] = None,
        min_level: ProjectReadiness = ProjectReadiness.PARTIALLY_READY,
    ) -> bool:
        """
        检查项目是否就绪

        Args:
            project_name: 项目名称
            network: 网络
            min_level: 最低就绪级别

        Returns:
            是否达到最低就绪级别
        """
        report = await self.get_project_status(project_name, network)

        level_order = {
            ProjectReadiness.NOT_READY: 0,
            ProjectReadiness.PARTIALLY_READY: 1,
            ProjectReadiness.FULLY_READY: 2,
        }

        return level_order[report.readiness] >= level_order[min_level]

    async def get_missing_dependencies(
        self,
        project_name: str,
        network: Optional[str] = None,
        include_optional: bool = False,
    ) -> Dict[str, List[str]]:
        """
        获取缺失依赖

        Returns:
            {contract_name: [missing_dep1, missing_dep2, ...]}
        """
        report = await self.get_project_status(project_name, network)

        result = {}
        for name, info in report.contracts.items():
            missing = list(info.missing_required_deps)
            if include_optional:
                missing.extend(info.missing_optional_deps)

            if missing:
                result[name] = missing

        return result

    async def get_deployable_contracts(
        self, project_name: str, network: Optional[str] = None
    ) -> List[str]:
        """获取当前可部署的合约列表（依赖已满足）"""
        report = await self.get_project_status(project_name, network)
        return report.deployable_contracts

    async def get_blocking_contracts(
        self, project_name: str, network: Optional[str] = None
    ) -> List[Tuple[str, str]]:
        """
        获取阻塞合约及原因

        Returns:
            [(contract_name, blocking_reason), ...]
        """
        report = await self.get_project_status(project_name, network)

        return [
            (name, report.contracts[name].blocking_reason)
            for name in report.blocking_contracts
        ]

    async def get_contract_status(
        self, project_name: str, contract_name: str, network: Optional[str] = None
    ) -> Optional[ContractReadinessInfo]:
        """获取单个合约状态"""
        report = await self.get_project_status(project_name, network)
        return report.contracts.get(contract_name)


# ===== 工厂函数 =====

_checker_instances: Dict[str, ProjectReadinessChecker] = {}


def get_readiness_checker(network: str = "hardhat") -> ProjectReadinessChecker:
    """获取就绪检查器实例"""
    if network not in _checker_instances:
        _checker_instances[network] = ProjectReadinessChecker(network)
    return _checker_instances[network]
