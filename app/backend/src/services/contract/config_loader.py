"""
Contract Config Loader
合约配置加载服务

从 YAML 文件加载合约配置，支持：
- 多环境配置 (hardhat/sepolia/mainnet)
- 配置验证 (Pydantic)
- 缓存加载

Usage:
    from src.services.contract.config_loader import (
        get_provider_keys,
        get_contract_dependencies,
        get_project_configs,
    )

    # 获取配置
    keys = get_provider_keys()
    deps = get_contract_dependencies()
"""

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from falib.utils.config import SETTINGS
from falib.utils.log import get_logger
from pydantic import BaseModel, Field

logger = get_logger("contract.config")


# =============================================================================
# Pydantic Models
# =============================================================================


class ProviderKeyConfig(BaseModel):
    """Provider Key 配置"""

    category: str
    contract: str
    description: str = ""


class ProjectConfig(BaseModel):
    """项目配置"""

    label: str
    label_en: str = ""
    color: str = "default"
    order: int = 99
    contracts: list[str] = Field(default_factory=list)


class ContractConfig(BaseModel):
    """合约配置 - 顶层配置模型"""

    version: str = "1.0"
    provider_keys: dict[str, ProviderKeyConfig] = Field(default_factory=dict)
    contract_dependencies: dict[str, list[str]] = Field(default_factory=dict)
    projects: dict[str, ProjectConfig] = Field(default_factory=dict)
    dependency_set_functions: dict[str, str] = Field(default_factory=dict)


# =============================================================================
# Config Loading
# =============================================================================


def _get_config_dir() -> Path:
    """获取配置目录路径"""
    # 假设结构: app/backend/src/services/contract/config_loader.py
    # 配置在: app/backend/config/
    current_file = Path(__file__)
    backend_dir = current_file.parent.parent.parent.parent
    return backend_dir / "config"


def get_config_path() -> Path:
    """
    获取配置文件路径

    优先级:
    1. contracts.{environment}.yaml (如 contracts.hardhat.yaml)
    2. contracts.yaml (默认)

    Returns:
        配置文件 Path

    Raises:
        FileNotFoundError: 如果配置文件不存在
    """
    config_dir = _get_config_dir()
    env = getattr(SETTINGS, "environment", "hardhat")

    # 尝试环境特定配置
    env_config = config_dir / f"contracts.{env}.yaml"
    if env_config.exists():
        return env_config

    # 回退到默认配置
    default_config = config_dir / "contracts.yaml"
    if default_config.exists():
        return default_config

    raise FileNotFoundError(
        f"Contract config not found. Expected at {env_config} or {default_config}"
    )


@lru_cache(maxsize=1)
def load_contract_config() -> ContractConfig:
    """
    加载合约配置（带缓存）

    配置文件仅在首次调用时加载，之后从缓存返回。
    如需重新加载，调用 reload_config()。

    Returns:
        ContractConfig 实例
    """
    config_path = get_config_path()
    logger.info(f"Loading contract config from {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        raw_config = yaml.safe_load(f)

    config = ContractConfig(**raw_config)
    logger.info(
        f"Loaded config: {len(config.provider_keys)} keys, "
        f"{len(config.contract_dependencies)} deps, "
        f"{len(config.projects)} projects"
    )

    return config


def reload_config() -> ContractConfig:
    """
    重新加载配置（清除缓存）

    Returns:
        新加载的 ContractConfig 实例
    """
    load_contract_config.cache_clear()
    return load_contract_config()


# =============================================================================
# Convenience Functions
# =============================================================================


def get_provider_keys() -> dict[str, dict[str, str]]:
    """
    获取 Provider Keys 配置

    Returns:
        {key_name: {"category": ..., "contract": ..., "description": ...}}
    """
    config = load_contract_config()
    return {k: v.model_dump() for k, v in config.provider_keys.items()}


def get_contract_dependencies() -> dict[str, list[str]]:
    """
    获取合约依赖配置

    Returns:
        {contract_name: [dep_key1, dep_key2, ...]}
    """
    return load_contract_config().contract_dependencies


def get_project_configs() -> dict[str, dict[str, Any]]:
    """
    获取项目配置

    Returns:
        {project_name: {"label": ..., "color": ..., ...}}
    """
    config = load_contract_config()
    return {k: v.model_dump() for k, v in config.projects.items()}


def get_dependency_set_functions() -> dict[str, str]:
    """
    获取依赖设置函数映射

    Returns:
        {provider_key: setter_function_name}
    """
    return load_contract_config().dependency_set_functions


def get_keys_by_category(category: str) -> list[str]:
    """
    获取指定分类的所有 Key

    Args:
        category: 分类名称 (common/stablecoin/vanke 等)

    Returns:
        Provider Key 名称列表
    """
    config = load_contract_config()
    return [k for k, v in config.provider_keys.items() if v.category == category]


def get_contract_category(contract_name: str) -> str | None:
    """
    获取合约所属分类

    Args:
        contract_name: 合约名称

    Returns:
        分类名称，如果未找到则返回 None
    """
    config = load_contract_config()

    # 先从 provider_keys 中查找
    for key_info in config.provider_keys.values():
        if key_info.contract == contract_name:
            return key_info.category

    # 再从 projects.contracts 中查找
    for project_name, project in config.projects.items():
        if contract_name in project.contracts:
            return project_name

    return None


def get_provider_key_for_contract(contract_name: str) -> str | None:
    """
    获取合约对应的 Provider Key

    Args:
        contract_name: 合约名称

    Returns:
        Provider Key 名称，如果未找到则返回 None
    """
    config = load_contract_config()
    for key_name, key_info in config.provider_keys.items():
        if key_info.contract == contract_name:
            return key_name
    return None


# =============================================================================
# Validation
# =============================================================================


def validate_config() -> list[str]:
    """
    验证配置完整性

    Returns:
        错误消息列表（空列表表示无错误）
    """
    errors = []
    config = load_contract_config()

    # 检查依赖引用的 Key 是否存在
    for contract, deps in config.contract_dependencies.items():
        for dep_key in deps:
            if dep_key not in config.provider_keys:
                errors.append(
                    f"Contract '{contract}' references unknown key '{dep_key}'"
                )

    # 检查 projects.contracts 引用的合约是否在 dependencies 中
    for project_name, project in config.projects.items():
        for contract in project.contracts:
            if contract not in config.contract_dependencies:
                errors.append(
                    f"Project '{project_name}' references unknown contract '{contract}'"
                )

    return errors
