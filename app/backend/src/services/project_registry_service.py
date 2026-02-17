"""
项目合约注册表服务

Epic 10: 项目合约注册表系统

单一 ProjectRegistryService 类，通过注释分割线组织三个职责分区：
- Config: 配置加载
- Readiness: 就绪检查
- Binding Sync: 绑定同步
"""

import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

from falib.utils.log import get_logger

from src.common.exceptions import ConfigLoadError, CyclicDependencyError
from src.constants.definitions import ZERO_ADDRESS
from src.models.contracts.contract_config import ContractConfig
from src.models.contracts.contract_deployment import ContractDeployment
from src.schemas.enums import ContractStatus
from src.schemas.enums.contract import (
    ContractRegistryStatus,
    DependencyType,
    ProjectReadiness,
)
from src.schemas.project_registry import (
    BindingSyncResult,
    ContractConfigSchema,
    ContractReadinessInfo,
    DependencyTypeEnum,
    ProjectConfigSchema,
    ProjectStatusReport,
    ProjectSyncResult,
)

logger = get_logger("business.contract.registry")


# ============================================
# 项目配置注册表
# ============================================


def _get_project_configs() -> Dict[str, Any]:
    """
    获取所有项目配置

    从 scripts/deploy/*/config.py 导入 ProjectConfig
    """
    configs: Dict[str, Any] = {}

    try:
        from scripts.deploy.common.config import COMMON_PROJECT

        configs["common"] = COMMON_PROJECT
    except ImportError:
        logger.warning("无法导入 common 项目配置")

    try:
        from scripts.deploy.projects.vanke.config import VANKE_PROJECT

        configs["vanke"] = VANKE_PROJECT
    except ImportError:
        logger.warning("无法导入 vanke 项目配置")

    return configs


class ProjectRegistryService:
    """
    项目合约注册表服务

    职责分区:
    - Config: 配置加载（从 scripts/deploy/ 读取项目配置）
    - Readiness: 就绪检查（项目/合约部署状态分析）
    - Binding Sync: 绑定同步（合约依赖绑定状态管理）
    """

    # 依赖名到合约函数的映射（用于链上读取）
    DEPENDENCY_GETTERS: Dict[str, List[str]] = {
        "kyc": ["kyc", "get_kyc", "kyc_contract"],
        "payment_token": ["payment_token", "get_payment_token", "token"],
        "subscription": ["subscription", "get_subscription"],
        "capital_oracle": ["capital_oracle", "oracle"],
        "staking_token": ["staking_token", "stake_token"],
        "reward_token": ["reward_token", "rewards_token"],
        "treasury": ["treasury", "treasury_address"],
        "token": ["token", "rwa_token", "get_token"],
    }

    def __init__(self, network: str = "hardhat"):
        self.network = network
        self._config_cache: Dict[str, ProjectConfigSchema] = {}
        self._project_configs = _get_project_configs()
        self._web3_adapter = None

    # ============ Config - 配置加载 ============

    def list_projects(self) -> List[str]:
        """列出所有可用项目"""
        return list(sorted(self._project_configs.keys()))

    def load_config(
        self, project_name: str, use_cache: bool = True
    ) -> ProjectConfigSchema:
        """
        加载项目配置

        从 Python 配置转换为 Pydantic schema

        参数:
            project_name: 项目名称
            use_cache: 是否使用缓存

        返回:
            ProjectConfigSchema: 验证后的配置对象

        异常:
            ConfigLoadError: 配置加载失败
            CyclicDependencyError: 存在循环依赖
        """
        if use_cache and project_name in self._config_cache:
            return self._config_cache[project_name]

        project_config = self._project_configs.get(project_name)
        if not project_config:
            raise ConfigLoadError(
                f"配置不存在: 项目 '{project_name}' 未在 scripts/deploy/ 中定义"
            )

        try:
            config = self.convert_to_schema(project_config)
        except Exception as e:
            raise ConfigLoadError(f"配置转换失败: {e}")

        self.detect_cyclic_dependencies(config)

        self._config_cache[project_name] = config
        logger.info(
            f"加载项目配置成功: {project_name}, 合约数量: {len(config.contracts)}"
        )

        return config

    def convert_to_schema(self, project_config: Any) -> ProjectConfigSchema:
        """将 Python dataclass 配置转换为 Pydantic schema"""
        contracts = []
        for c in project_config.contracts:
            dep_type_str = (
                c.dependency_type.upper()
                if hasattr(c, "dependency_type")
                else "BUSINESS"
            )
            dep_type = DependencyTypeEnum(dep_type_str)

            contracts.append(
                ContractConfigSchema(
                    name=c.name,
                    type=dep_type,
                    description=c.description or "",
                    module=c.scope if c.scope != "project" else None,
                    required_deps=c.required_deps
                    if hasattr(c, "required_deps")
                    else [],
                    optional_deps=c.optional_deps
                    if hasattr(c, "optional_deps")
                    else [],
                    deploy_order=c.deploy_order if hasattr(c, "deploy_order") else 100,
                    allow_zero_address=False,
                    environments=[],
                    production_address=None,
                )
            )

        return ProjectConfigSchema(
            project_name=project_config.name,
            description=project_config.description
            if hasattr(project_config, "description")
            else "",
            version=project_config.version
            if hasattr(project_config, "version")
            else "1.0.0",
            primary_contract=project_config.primary_contract
            if hasattr(project_config, "primary_contract")
            else "",
            contracts=contracts,
        )

    def detect_cyclic_dependencies(self, config: ProjectConfigSchema):
        """
        检测循环依赖 (DFS)

        异常:
            CyclicDependencyError: 检测到循环依赖
        """
        contract_names = {c.name for c in config.contracts}
        graph: Dict[str, Set[str]] = {}

        for contract in config.contracts:
            deps = set(contract.required_deps + contract.optional_deps) & contract_names
            graph[contract.name] = deps

        visited: Set[str] = set()
        rec_stack: Set[str] = set()
        path: List[str] = []

        def dfs(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            path.append(node)

            for neighbor in graph.get(node, set()):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    cycle_start = path.index(neighbor)
                    cycle = path[cycle_start:] + [neighbor]
                    raise CyclicDependencyError(f"检测到循环依赖: {' -> '.join(cycle)}")

            path.pop()
            rec_stack.remove(node)
            return False

        for node in graph:
            if node not in visited:
                dfs(node)

    def clear_config_cache(self, project_name: Optional[str] = None):
        """清除配置缓存"""
        if project_name:
            self._config_cache.pop(project_name, None)
        else:
            self._config_cache.clear()

    async def sync_to_database(
        self, project_name: str, force: bool = False
    ) -> Dict[str, Any]:
        """
        同步配置到数据库

        注意: 部署脚本已自动完成此操作，此方法仅用于手动同步

        参数:
            project_name: 项目名称
            force: 是否强制覆盖

        返回:
            同步结果统计
        """
        config = self.load_config(project_name, use_cache=False)

        stats: Dict[str, Any] = {
            "created": 0,
            "updated": 0,
            "unchanged": 0,
            "contracts": [],
        }

        for contract_config in config.contracts:
            existing = await ContractConfig.filter(
                contract_name=contract_config.name
            ).first()

            data = {
                "contract_name": contract_config.name,
                "project_name": project_name,
                "description": contract_config.description,
                "dependency_type": DependencyType(contract_config.type.value.lower()),
                "is_primary": contract_config.name == config.primary_contract,
                "module": contract_config.module,
                "required_deps": contract_config.required_deps,
                "optional_deps": contract_config.optional_deps,
                "deploy_order": contract_config.deploy_order,
                "allow_zero_address": contract_config.allow_zero_address,
                "environments": contract_config.environments,
                "production_address": contract_config.production_address,
            }

            if existing:
                if force:
                    await existing.update_from_dict(data)
                    await existing.save()
                    stats["updated"] += 1
                    logger.debug(f"更新合约配置: {contract_config.name}")
                else:
                    stats["unchanged"] += 1
            else:
                await ContractConfig.create(**data)
                stats["created"] += 1
                logger.debug(f"创建合约配置: {contract_config.name}")

            stats["contracts"].append(contract_config.name)

        logger.info(
            f"同步项目配置完成: {project_name}, "
            f"created={stats['created']}, "
            f"updated={stats['updated']}, "
            f"unchanged={stats['unchanged']}"
        )

        return stats

    # ============ Readiness - 就绪检查 ============

    async def get_project_status(
        self, project_name: str, network: Optional[str] = None
    ) -> ProjectStatusReport:
        """
        获取项目完整状态报告

        参数:
            project_name: 项目名称
            network: 网络名称，默认使用初始化时的网络

        返回:
            ProjectStatusReport: 完整状态报告
        """
        network = network or self.network
        report = ProjectStatusReport(
            project_name=project_name, readiness=ProjectReadiness.NOT_READY
        )

        configs = await ContractConfig.filter(project_name=project_name).all()

        if not configs:
            report.summary = f"项目 '{project_name}' 未找到任何合约配置"
            return report

        report.total_contracts = len(configs)

        for config in configs:
            info = await self.build_contract_info(config, network)
            report.contracts[config.contract_name] = info

            if config.is_primary:
                report.primary_contract = info

            if info.is_registered:
                report.registered_count += 1
            if info.is_deployed:
                report.deployed_count += 1
            if info.current_status == ContractRegistryStatus.ACTIVE:
                report.active_count += 1

        self.analyze_dependencies(report)
        report.readiness = self.compute_readiness(report)
        report.summary = self.generate_summary(report)

        return report

    async def build_contract_info(
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

        deployment = await ContractDeployment.filter(
            name=config.contract_name, network=network
        ).first()

        if deployment:
            info.is_deployed = bool(deployment.address)
            info.current_status = self.map_contract_to_registry_status(
                deployment.status
            )
            info.address = deployment.address
            info.network = deployment.network.value if deployment.network else network

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

        info.is_ready = self.is_contract_ready(info)
        if not info.is_ready:
            info.blocking_reason = self.get_blocking_reason(info)

        return info

    def map_contract_to_registry_status(
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

    def is_contract_ready(self, info: ContractReadinessInfo) -> bool:
        """判断合约是否就绪"""
        if info.current_status != ContractRegistryStatus.ACTIVE:
            return False

        unbound_required = [
            dep for dep in info.missing_required_deps if dep not in info.zero_bound_deps
        ]
        return len(unbound_required) == 0

    def get_blocking_reason(self, info: ContractReadinessInfo) -> str:
        """获取阻塞原因"""
        reasons = []

        if not info.is_deployed:
            reasons.append("未部署")
        elif info.current_status != ContractRegistryStatus.ACTIVE:
            reasons.append(f"状态为 {info.current_status.value}")

        if info.missing_required_deps:
            reasons.append(f"缺失依赖: {', '.join(info.missing_required_deps)}")

        return "; ".join(reasons) if reasons else "未知原因"

    def analyze_dependencies(self, report: ProjectStatusReport):
        """分析依赖关系"""
        deployed_names = {
            name for name, info in report.contracts.items() if info.is_deployed
        }

        for name, info in report.contracts.items():
            if info.is_deployed:
                continue

            deps_satisfied = all(
                dep in deployed_names or dep not in report.contracts
                for dep in info.required_deps
            )

            if deps_satisfied:
                report.deployable_contracts.append(name)
            else:
                missing = [
                    dep
                    for dep in info.required_deps
                    if dep not in deployed_names and dep in report.contracts
                ]
                if missing:
                    report.missing_dependencies[name] = missing

        blocking = set()
        for name, info in report.contracts.items():
            if not info.is_ready:
                for other_name, other_info in report.contracts.items():
                    if name in other_info.required_deps:
                        blocking.add(name)
                        break

        report.blocking_contracts = list(blocking)

    def compute_readiness(self, report: ProjectStatusReport) -> ProjectReadiness:
        """计算项目就绪状态"""
        if not report.primary_contract or not report.primary_contract.is_ready:
            return ProjectReadiness.NOT_READY

        required_contracts = [
            info
            for info in report.contracts.values()
            if info.dependency_type == DependencyType.REQUIRED
        ]
        if any(not c.is_ready for c in required_contracts):
            return ProjectReadiness.NOT_READY

        business_contracts = [
            info
            for info in report.contracts.values()
            if info.dependency_type == DependencyType.BUSINESS
        ]
        if any(not c.is_ready for c in business_contracts):
            return ProjectReadiness.PARTIALLY_READY

        return ProjectReadiness.FULLY_READY

    def generate_summary(self, report: ProjectStatusReport) -> str:
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

    async def is_project_ready(
        self,
        project_name: str,
        network: Optional[str] = None,
        min_level: ProjectReadiness = ProjectReadiness.PARTIALLY_READY,
    ) -> bool:
        """
        检查项目是否就绪

        参数:
            project_name: 项目名称
            network: 网络
            min_level: 最低就绪级别

        返回:
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

        返回:
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

        返回:
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

    # ============ Binding Sync - 绑定同步 ============

    async def update_contract_bindings(
        self,
        project_name: str,
        contract_name: str,
        network: str,
        bindings: Dict[str, str],
    ) -> BindingSyncResult:
        """
        手动更新合约绑定状态

        参数:
            project_name: 项目名称
            contract_name: 合约名称
            network: 网络
            bindings: 绑定地址映射 {dep_name: address}

        返回:
            BindingSyncResult: 同步结果
        """
        result = BindingSyncResult(contract_name=contract_name, success=False)

        try:
            deployment = (
                await ContractDeployment.filter(
                    name=contract_name,
                    project_name=project_name,
                    network=network,
                )
                .prefetch_related("config")
                .first()
            )

            if not deployment:
                result.error = (
                    f"未找到部署记录: {project_name}/{contract_name}@{network}"
                )
                return result

            config = await ContractConfig.filter(contract_name=contract_name).first()

            current_bindings = deployment.bindings or {}
            updated_bindings = dict(current_bindings)
            bindings_changed = 0

            for dep_name, address in bindings.items():
                is_zero = address == ZERO_ADDRESS
                allow_zero = config.allow_zero_address if config else False
                is_bound = address != ZERO_ADDRESS or allow_zero

                old_binding = current_bindings.get(dep_name, {})
                new_binding = {
                    "address": address,
                    "is_bound": is_bound,
                    "is_zero": is_zero,
                    "last_synced": datetime.now(timezone.utc).isoformat(),
                }

                if old_binding.get("address") != address:
                    bindings_changed += 1
                    logger.info(
                        f"绑定更新: {contract_name}.{dep_name} "
                        f"{old_binding.get('address', 'N/A')} -> {address}"
                    )

                updated_bindings[dep_name] = new_binding

            deployment.bindings = updated_bindings

            old_status = deployment.status
            new_status = self.compute_deployment_status(deployment, config)

            if new_status != old_status:
                deployment.status = new_status
                result.status_changed = True
                result.old_status = old_status.value if old_status else None
                result.new_status = new_status.value

            await deployment.save()

            result.success = True
            result.bindings_updated = bindings_changed

        except Exception as e:
            logger.exception(f"更新绑定失败: {contract_name}")
            result.error = str(e)

        return result

    async def update_deployment_status(
        self,
        project_name: str,
        contract_name: str,
        network: str,
        address: Optional[str] = None,
        status: Optional[ContractRegistryStatus] = None,
    ) -> BindingSyncResult:
        """
        更新合约部署状态

        参数:
            project_name: 项目名称
            contract_name: 合约名称
            network: 网络
            address: 部署地址
            status: 新状态

        返回:
            BindingSyncResult
        """
        result = BindingSyncResult(contract_name=contract_name, success=False)

        try:
            config = await ContractConfig.filter(
                contract_name=contract_name,
            ).first()

            if not config:
                result.error = f"未找到合约配置: {project_name}/{contract_name}"
                return result

            deployment = await ContractDeployment.filter(
                name=contract_name,
                network=network,
            ).first()

            if deployment:
                old_status = deployment.status
                if address:
                    deployment.address = address
                if status:
                    deployment.status = self.map_registry_to_contract_status(status)

                    if old_status != deployment.status:
                        result.status_changed = True
                        result.old_status = old_status.value if old_status else None
                        result.new_status = deployment.status.value

                await deployment.save()
            else:
                result.error = (
                    f"部署记录不存在，请先部署合约: {contract_name}@{network}"
                )
                return result

            result.success = True
            logger.info(
                f"更新部署状态: {contract_name}@{network}, "
                f"address={address}, status={status}"
            )

        except Exception as e:
            logger.exception(f"更新部署状态失败: {contract_name}")
            result.error = str(e)

        return result

    def map_registry_to_contract_status(
        self, registry_status: ContractRegistryStatus
    ) -> ContractStatus:
        """映射 ContractRegistryStatus 到 ContractStatus"""
        mapping = {
            ContractRegistryStatus.REGISTERED: ContractStatus.ACTIVE,
            ContractRegistryStatus.DEPLOYED: ContractStatus.ACTIVE,
            ContractRegistryStatus.BOUND: ContractStatus.ACTIVE,
            ContractRegistryStatus.ACTIVE: ContractStatus.ACTIVE,
        }
        return mapping.get(registry_status, ContractStatus.ACTIVE)

    async def sync_project_bindings(
        self,
        project_name: str,
        network: str,
    ) -> ProjectSyncResult:
        """
        同步整个项目的绑定状态（从链上读取）

        注意: 需要配置 Web3 适配器才能使用

        参数:
            project_name: 项目名称
            network: 网络名称

        返回:
            ProjectSyncResult: 项目同步结果
        """
        start_time = time.time()

        deployments = (
            await ContractDeployment.filter(
                project_name=project_name,
                network=network,
            )
            .prefetch_related("config")
            .all()
        )

        results = []
        synced = 0
        failed = 0

        for deployment in deployments:
            if not deployment.address:
                results.append(
                    BindingSyncResult(
                        contract_name=deployment.name,
                        success=False,
                        error="合约未部署（无地址）",
                    )
                )
                failed += 1
                continue

            # TODO: 实现链上读取绑定地址
            result = BindingSyncResult(
                contract_name=deployment.name,
                success=False,
                error="链上同步功能待实现",
            )
            results.append(result)
            failed += 1

        elapsed = (time.time() - start_time) * 1000

        return ProjectSyncResult(
            project_name=project_name,
            network=network,
            total_contracts=len(deployments),
            synced_count=synced,
            failed_count=failed,
            results=results,
            elapsed_ms=elapsed,
        )

    def compute_deployment_status(
        self, deployment: ContractDeployment, config: Optional[ContractConfig] = None
    ) -> ContractStatus:
        """根据绑定状态计算合约状态"""
        bindings = deployment.bindings or {}

        if not deployment.address:
            return ContractStatus.ACTIVE

        required_deps = config.required_deps if config else []

        for dep in required_deps:
            binding = bindings.get(dep, {})
            if not binding.get("is_bound", False):
                break

        return ContractStatus.ACTIVE

    async def get_binding_status(
        self,
        project_name: str,
        contract_name: str,
        network: str,
    ) -> Optional[Dict[str, Any]]:
        """
        获取合约绑定状态

        返回:
            绑定状态字典，包含地址和绑定信息
        """
        deployment = await ContractDeployment.filter(
            name=contract_name,
            project_name=project_name,
            network=network,
        ).first()

        if not deployment:
            return None

        return {
            "contract_name": contract_name,
            "address": deployment.address,
            "status": deployment.status.value if deployment.status else None,
            "is_deployed": bool(deployment.address),
            "bindings": deployment.bindings or {},
            "updated_at": deployment.updated_at.isoformat()
            if deployment.updated_at
            else None,
        }


__all__ = [
    # 主服务类
    "ProjectRegistryService",
    # 异常（从 common.exceptions 重导出）
    "ConfigLoadError",
    "CyclicDependencyError",
    # Schemas（从 schemas.project_registry 重导出）
    "ProjectStatusReport",
    "ContractReadinessInfo",
    "BindingSyncResult",
    "ProjectSyncResult",
    "ProjectConfigSchema",
    "ContractConfigSchema",
    "DependencyTypeEnum",
]
