"""
部署配置加载服务（仅供部署/运维脚本使用）

职责:
- 从 scripts/deploy/*/config.py 加载项目配置
- 转换为 ProjectConfigSchema
- 将项目配置同步到 ContractConfig 表

说明:
- 该服务属于部署域，不用于运行期业务查询
"""

from typing import Any, Dict, Optional, Set

from falib.utils.log import get_logger

from src.common.exceptions import ConfigLoadError, CyclicDependencyError
from src.models.contracts.contract_config import ContractConfig
from src.schemas.enums.contract import DependencyType
from src.schemas.project_registry import (
    ContractConfigSchema,
    DependencyTypeEnum,
    ProjectConfigSchema,
)

logger = get_logger("business.deploy.config_loader")


def get_project_configs_static() -> Dict[str, Any]:
    """
    获取所有项目配置（部署域）

    从 scripts/deploy/*/config.py 导入 ProjectConfig。
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


class DeployConfigLoaderService:
    """部署配置加载器（脚本专用）"""

    def __init__(self):
        self._config_cache: Dict[str, ProjectConfigSchema] = {}
        self._project_configs = get_project_configs_static()

    def list_projects(self) -> list[str]:
        """列出可同步项目（来自部署配置）"""
        return list(sorted(self._project_configs.keys()))

    def load_config(
        self, project_name: str, use_cache: bool = True
    ) -> ProjectConfigSchema:
        """加载并验证项目配置"""
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
        """检测循环依赖 (DFS)"""
        contract_names = {c.name for c in config.contracts}
        graph: Dict[str, Set[str]] = {}

        for contract in config.contracts:
            deps = set(contract.required_deps + contract.optional_deps) & contract_names
            graph[contract.name] = deps

        visited: Set[str] = set()
        rec_stack: Set[str] = set()
        path: list[str] = []

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
        """同步配置到 ContractConfig 表"""
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


_config_loader_instance: Optional[DeployConfigLoaderService] = None


def get_config_loader() -> DeployConfigLoaderService:
    """获取部署配置加载器单例（脚本专用）"""
    global _config_loader_instance  # noqa: PLW0603
    if _config_loader_instance is None:
        _config_loader_instance = DeployConfigLoaderService()
    return _config_loader_instance
