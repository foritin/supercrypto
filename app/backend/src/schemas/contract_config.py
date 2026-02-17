"""
合约配置 Schema

从 contract_service.py 提取的 Pydantic 配置模型：
- ProviderKeyConfig: Provider Key 配置
- ProjectConfig: 项目配置
- ContractConfigModel: 顶层合约配置模型
"""

from pydantic import BaseModel, Field


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


class ContractConfigModel(BaseModel):
    """合约配置 - 顶层配置模型"""

    version: str = "1.0"
    provider_keys: dict[str, ProviderKeyConfig] = Field(default_factory=dict)
    contract_dependencies: dict[str, list[str]] = Field(default_factory=dict)
    projects: dict[str, ProjectConfig] = Field(default_factory=dict)
    dependency_set_functions: dict[str, str] = Field(default_factory=dict)
