"""
项目配置加载器

配置来源: scripts/deploy/*/config.py (唯一数据源)

部署时自动写入 contract_config 表，UI 通过 API 从数据库读取。
此加载器用于：
1. 部署前预览配置
2. 列出可用项目
3. 同步配置到数据库（部署脚本已自动完成）
"""

from typing import Any, Dict, List, Optional, Set

from falib.utils.log import get_logger

from src.models.contracts.contract_config import ContractConfig
from src.shared.schemas.enums import DependencyType

from .schemas import ContractConfigSchema, DependencyTypeEnum, ProjectConfigSchema

logger = get_logger("contract.registry")


class ConfigLoadError(Exception):
    """配置加载错误"""
    pass


class CyclicDependencyError(ConfigLoadError):
    """循环依赖错误"""
    pass


# ============================================
# 项目配置注册表
# ============================================

# 从部署脚本导入项目配置
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


class ProjectConfigLoader:
    """
    项目配置加载器
    
    从 scripts/deploy/*/config.py 加载配置
    """

    def __init__(self):
        self._cache: Dict[str, ProjectConfigSchema] = {}
        self._project_configs = _get_project_configs()

    def list_projects(self) -> List[str]:
        """列出所有可用项目"""
        return list(sorted(self._project_configs.keys()))

    def load_config(
        self, project_name: str, use_cache: bool = True
    ) -> ProjectConfigSchema:
        """
        加载项目配置
        
        从 Python 配置转换为 Pydantic schema

        Args:
            project_name: 项目名称
            use_cache: 是否使用缓存

        Returns:
            ProjectConfigSchema: 验证后的配置对象

        Raises:
            ConfigLoadError: 配置加载失败
            CyclicDependencyError: 存在循环依赖
        """
        # 尝试从缓存获取
        if use_cache and project_name in self._cache:
            return self._cache[project_name]

        # 从 Python 配置获取
        project_config = self._project_configs.get(project_name)
        if not project_config:
            raise ConfigLoadError(
                f"配置不存在: 项目 '{project_name}' 未在 scripts/deploy/ 中定义"
            )

        # 转换为 Pydantic schema
        try:
            config = self._convert_to_schema(project_config)
        except Exception as e:
            raise ConfigLoadError(f"配置转换失败: {e}")

        # 检测循环依赖
        self._detect_cyclic_dependencies(config)

        # 缓存
        self._cache[project_name] = config
        logger.info(
            f"加载项目配置成功: {project_name}, "
            f"合约数量: {len(config.contracts)}"
        )

        return config

    def _convert_to_schema(self, project_config: Any) -> ProjectConfigSchema:
        """
        将 Python dataclass 配置转换为 Pydantic schema
        """
        contracts = []
        for c in project_config.contracts:
            # 转换 dependency_type
            dep_type_str = c.dependency_type.upper() if hasattr(c, 'dependency_type') else "BUSINESS"
            dep_type = DependencyTypeEnum(dep_type_str)
            
            contracts.append(ContractConfigSchema(
                name=c.name,
                type=dep_type,
                description=c.description or "",
                module=c.scope if c.scope != "project" else None,
                required_deps=c.required_deps if hasattr(c, 'required_deps') else [],
                optional_deps=c.optional_deps if hasattr(c, 'optional_deps') else [],
                deploy_order=c.deploy_order if hasattr(c, 'deploy_order') else 100,
                allow_zero_address=False,
                environments=[],
                production_address=None,
            ))
        
        return ProjectConfigSchema(
            project_name=project_config.name,
            description=project_config.description if hasattr(project_config, 'description') else "",
            version=project_config.version if hasattr(project_config, 'version') else "1.0.0",
            primary_contract=project_config.primary_contract if hasattr(project_config, 'primary_contract') else "",
            contracts=contracts,
        )

    def _detect_cyclic_dependencies(self, config: ProjectConfigSchema):
        """
        检测循环依赖 (DFS)

        Raises:
            CyclicDependencyError: 检测到循环依赖
        """
        # 构建依赖图
        contract_names = {c.name for c in config.contracts}
        graph: Dict[str, Set[str]] = {}

        for contract in config.contracts:
            # 只考虑项目内的依赖
            deps = set(contract.required_deps + contract.optional_deps) & contract_names
            graph[contract.name] = deps

        # DFS 检测环
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
                    # 找到环
                    cycle_start = path.index(neighbor)
                    cycle = path[cycle_start:] + [neighbor]
                    raise CyclicDependencyError(f"检测到循环依赖: {' -> '.join(cycle)}")

            path.pop()
            rec_stack.remove(node)
            return False

        for node in graph:
            if node not in visited:
                dfs(node)

    def clear_cache(self, project_name: Optional[str] = None):
        """清除缓存"""
        if project_name:
            self._cache.pop(project_name, None)
        else:
            self._cache.clear()

    async def sync_to_database(
        self, project_name: str, force: bool = False
    ) -> Dict[str, Any]:
        """
        同步配置到数据库
        
        注意: 部署脚本已自动完成此操作，此方法仅用于手动同步

        Args:
            project_name: 项目名称
            force: 是否强制覆盖

        Returns:
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
            # 查找现有记录
            existing = await ContractConfig.filter(
                contract_name=contract_config.name
            ).first()

            # 准备数据
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


# ===== 单例实例 =====

_loader_instance: Optional[ProjectConfigLoader] = None


def get_config_loader() -> ProjectConfigLoader:
    """获取配置加载器单例"""
    global _loader_instance
    if _loader_instance is None:
        _loader_instance = ProjectConfigLoader()
    return _loader_instance
