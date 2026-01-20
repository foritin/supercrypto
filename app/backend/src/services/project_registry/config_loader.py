"""
项目配置加载器

Story 10.2: 项目配置 YAML 定义与加载

配置来源:
- 优先从 SETTINGS.project_registry.projects 读取 (falib.utils.config)
- 回退到 config/projects/*.yaml 文件
"""

from pathlib import Path
from typing import Dict, List, Optional, Set

import yaml
from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from src.models.project_registry import ProjectContractConfig

from src.shared.schemas.enums import DependencyType

from .schemas import ProjectConfigSchema

logger = get_logger("contract.registry")


class ConfigLoadError(Exception):
    """配置加载错误"""

    pass


class CyclicDependencyError(ConfigLoadError):
    """循环依赖错误"""

    pass


class ProjectConfigLoader:
    """
    项目配置加载器

    支持两种配置来源:
    1. SETTINGS.project_registry.projects (config.{env}.yaml)
    2. config/projects/{project_name}.yaml (回退)
    """

    # 回退配置文件目录
    FALLBACK_CONFIG_DIR = (
        Path(__file__).parent.parent.parent.parent / "config" / "projects"
    )

    def __init__(self):
        self._cache: Dict[str, ProjectConfigSchema] = {}

    def _get_settings_projects(self) -> Dict[str, any]:
        """
        从 SETTINGS 获取项目配置

        Returns:
            项目配置字典 {project_name: DynamicConfig}
        """
        try:
            project_registry = SETTINGS.project_registry
            if hasattr(project_registry, "projects"):
                return project_registry.projects
        except AttributeError:
            pass
        return None

    def _get_project_names_from_settings(self) -> List[str]:
        """
        从 SETTINGS 获取项目名称列表

        DynamicConfig 通过 dir() 获取属性名（即项目名）
        """
        projects = self._get_settings_projects()
        if projects is None:
            return []

        # DynamicConfig 的属性名就是项目名
        return [name for name in dir(projects) if not name.startswith("_")]

    def list_projects(self) -> List[str]:
        """列出所有可用项目"""
        projects = set()

        # 1. 从 SETTINGS 获取
        projects.update(self._get_project_names_from_settings())

        # 2. 从回退目录获取
        if self.FALLBACK_CONFIG_DIR.exists():
            for f in self.FALLBACK_CONFIG_DIR.glob("*.yaml"):
                if f.is_file():
                    projects.add(f.stem)

        return list(sorted(projects))

    def load_config(
        self, project_name: str, use_cache: bool = True
    ) -> ProjectConfigSchema:
        """
        加载项目配置

        优先从 SETTINGS 读取，回退到文件系统

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

        raw_config = None
        config_source = None

        # 1. 尝试从 SETTINGS 加载
        settings_projects = self._get_settings_projects()
        if settings_projects and hasattr(settings_projects, project_name):
            project_config = getattr(settings_projects, project_name)
            raw_config = self._convert_dynamic_config(project_config)
            config_source = "SETTINGS"

        # 2. 回退到文件系统
        if raw_config is None:
            config_path = self.FALLBACK_CONFIG_DIR / f"{project_name}.yaml"
            if not config_path.exists():
                raise ConfigLoadError(
                    f"配置不存在: 项目 '{project_name}' 未在 SETTINGS 或 {config_path} 中定义"
                )

            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    raw_config = yaml.safe_load(f)
                config_source = f"file:{config_path}"
            except yaml.YAMLError as e:
                raise ConfigLoadError(f"YAML 解析错误: {e}")

        # Pydantic 验证
        try:
            config = ProjectConfigSchema(**raw_config)
        except Exception as e:
            raise ConfigLoadError(f"配置验证失败 ({config_source}): {e}")

        # 检测循环依赖
        self._detect_cyclic_dependencies(config)

        # 缓存
        self._cache[project_name] = config
        logger.info(
            f"加载项目配置成功: {project_name}, "
            f"来源: {config_source}, "
            f"合约数量: {len(config.contracts)}"
        )

        return config

    def _convert_dynamic_config(self, obj) -> any:
        """
        将 falib 的 DynamicConfig 转换为普通 dict/list

        DynamicConfig 支持点号访问但 Pydantic 需要 dict
        """
        if obj is None:
            return None

        # 处理 DynamicConfig - 通过 dir() 获取所有属性
        if hasattr(obj, "__class__") and obj.__class__.__name__ == "DynamicConfig":
            result = {}
            for attr in dir(obj):
                if not attr.startswith("_"):
                    value = getattr(obj, attr)
                    result[attr] = self._convert_dynamic_config(value)
            return result

        # 处理字典
        if isinstance(obj, dict):
            return {k: self._convert_dynamic_config(v) for k, v in obj.items()}

        # 处理列表
        if isinstance(obj, list):
            return [self._convert_dynamic_config(item) for item in obj]

        # 基本类型直接返回
        return obj

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
    ) -> Dict[str, any]:
        """
        同步配置到数据库

        Args:
            project_name: 项目名称
            force: 是否强制覆盖

        Returns:
            同步结果统计
        """
        config = self.load_config(project_name, use_cache=False)

        stats = {
            "created": 0,
            "updated": 0,
            "unchanged": 0,
            "contracts": [],
        }

        for contract_config in config.contracts:
            # 查找现有记录
            existing = await ProjectContractConfig.filter(
                project_name=project_name, contract_name=contract_config.name
            ).first()

            # 准备数据
            data = {
                "project_name": project_name,
                "contract_name": contract_config.name,
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
                await ProjectContractConfig.create(**data)
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
