#!/usr/bin/env python3
"""
工具脚本: 批量同步 ContractMeta 表
==================================

用途:
1. 数据恢复: 数据库清空后，从配置文件重新同步元数据
2. 批量更新: 不通过部署流程，直接同步所有配置到数据库

⚠️ 注意: 正常流程下，ContractMeta 会在部署时自动写入 (executor.py)
       此脚本主要用于恢复/调试场景。

Usage:
    cd app/backend
    python scripts/migrate_contract_meta.py

数据来源:
    - scripts/deploy/common/config.py: COMMON_PROJECT
    - scripts/deploy/projects/*/config.py: 各项目配置
"""

import asyncio
import importlib
import sys
from pathlib import Path
from typing import Generator

# 添加项目根目录到 path
sys.path.insert(0, str(Path(__file__).parent.parent))

from eth_utils import keccak
from tortoise import Tortoise

from scripts.deploy.base import ContractConfig, ProjectConfig

# ============================================
# 配置发现
# ============================================

# 项目配置模块路径 (相对于 scripts/)
PROJECT_CONFIGS = [
    ("deploy.common.config", "COMMON_PROJECT"),  # 公共合约
    ("deploy.projects.vanke.config", "VANKE_PROJECT"),  # Vanke 项目
    # 新项目添加到这里:
    # ("deploy.projects.xxx.config", "XXX_PROJECT"),
]


def discover_all_contracts() -> Generator[tuple[ContractConfig, str], None, None]:
    """
    从配置模块动态发现所有合约配置

    Yields:
        (ContractConfig, project_name) 元组
    """
    for module_path, project_var in PROJECT_CONFIGS:
        try:
            module = importlib.import_module(f"scripts.{module_path}")
            project: ProjectConfig = getattr(module, project_var)

            # 确定 project_name
            project_name = project.name if project.name != "common" else "_common"

            for config in project.contracts:
                yield config, project_name

        except (ImportError, AttributeError) as e:
            print(f"⚠️  无法加载配置 {module_path}.{project_var}: {e}")
            continue


def compute_key_hash(key: str) -> str:
    """计算 Provider Key 的 keccak256 hash"""
    return "0x" + keccak(text=key).hex()


def contract_name_to_provider_key(contract_name: str) -> str:
    """
    合约名称转 Provider Key 名称

    VankeRWAToken -> VANKE_RWA_TOKEN
    KYC -> KYC_MANAGER (特殊处理)
    """
    special_mappings = {
        "KYC": "KYC_MANAGER",
        "MultiSigManager": "MULTI_SIG",
    }
    if contract_name in special_mappings:
        return special_mappings[contract_name]

    result = []
    for i, char in enumerate(contract_name):
        if char.isupper() and i > 0:
            result.append("_")
        result.append(char.upper())
    return "".join(result)


async def migrate():
    """执行数据同步"""
    from src.models.contracts.contract_meta import ContractMeta
    from src.shared.aerich_redirect import TORTOISE_ORM

    print("=" * 60)
    print("📦 ContractMeta 批量同步 (从配置文件)")
    print("=" * 60)

    # 初始化数据库连接
    await Tortoise.init(config=TORTOISE_ORM)

    created_count = 0
    updated_count = 0

    for config, project_name in discover_all_contracts():
        contract_name = config.name

        # 计算 provider_key 名称和 hash
        provider_key_name = None
        provider_key_hash = None

        if config.provider_key:
            provider_key_hash = "0x" + config.provider_key.hex()
            provider_key_name = contract_name_to_provider_key(config.name)

        # 检查是否已存在
        existing = await ContractMeta.filter(contract_name=contract_name).first()

        meta_data = {
            "project_name": project_name,
            "provider_key": provider_key_name,
            "provider_key_hash": provider_key_hash,
            "dependencies": config.provider_deps,
            "contract_type": config.contract_type,
            "scope": config.scope,
            "description": config.description,
        }

        if existing:
            # 更新现有记录
            for key, value in meta_data.items():
                setattr(existing, key, value)
            await existing.save()
            print(f"  ✏️  更新: {contract_name} ({project_name})")
            updated_count += 1
        else:
            # 创建新记录
            await ContractMeta.create(
                contract_name=contract_name,
                **meta_data,
            )
            print(f"  ✅ 创建: {contract_name} ({project_name})")
            created_count += 1

    print("─" * 60)
    print(f"📊 同步完成: 创建 {created_count} 条, 更新 {updated_count} 条")

    # 显示同步结果
    print("\n📋 ContractMeta 表内容:")
    print("─" * 60)
    all_metas = await ContractMeta.all().order_by("project_name", "contract_name")

    current_project = None
    for meta in all_metas:
        if meta.project_name != current_project:
            current_project = meta.project_name
            print(f"\n[{current_project}]")

        deps_str = ", ".join(meta.dependencies) if meta.dependencies else "(无)"
        print(f"  {meta.contract_name}: deps=[{deps_str}]")

    await Tortoise.close_connections()


if __name__ == "__main__":
    asyncio.run(migrate())
