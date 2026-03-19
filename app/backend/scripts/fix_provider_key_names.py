#!/usr/bin/env python
"""
修复 ContractConfig / ProviderRegistry 中历史错误的 provider_key 名称。

背景:
- 历史部署脚本按合约名自动拆分生成 key（如 KYC -> K_Y_C）
- 正确语义应与 AddressProvider 常量一致（如 KYC_MANAGER）

用法:
    cd app/backend
    source .venv/bin/activate
    PYTHONPATH=. python scripts/fix_provider_key_names.py          # 仅预览
    PYTHONPATH=. python scripts/fix_provider_key_names.py --apply  # 执行修复
"""

import argparse
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from tortoise import Tortoise

from scripts.deploy.base import ProviderKey
from src.aerich_redirect import TORTOISE_ORM
from src.models.contracts import ContractConfig
from src.models.contracts.provider_registry import ProviderRegistry


def build_hash_to_name_map() -> dict[str, str]:
    """构建 {key_hash -> canonical_key_name} 映射。"""
    mapping: dict[str, str] = {}
    for key_name, key_value in vars(ProviderKey).items():
        if key_name.startswith("_"):
            continue
        if isinstance(key_value, (bytes, bytearray)):
            mapping[("0x" + bytes(key_value).hex()).lower()] = key_name
    return mapping


async def preview_contract_config_fixes(
    hash_map: dict[str, str],
) -> list[tuple[int, str, str, str]]:
    """返回需要修复的 ContractConfig 列表。"""
    rows = await ContractConfig.filter(provider_key_hash__not_isnull=True).all()
    fixes: list[tuple[int, str, str, str]] = []

    for row in rows:
        if not row.provider_key_hash:
            continue
        target = hash_map.get(row.provider_key_hash.lower())
        if not target:
            continue
        if row.provider_key != target:
            fixes.append((row.id, row.contract_name, row.provider_key or "", target))

    return fixes


async def preview_provider_registry_fixes(
    hash_map: dict[str, str],
) -> list[tuple[int, str, str, str]]:
    """返回可直接改名的 ProviderRegistry 列表（冲突项会跳过）。"""
    rows = await ProviderRegistry.filter(key_hash__not_isnull=True).all()
    fixes: list[tuple[int, str, str, str]] = []

    for row in rows:
        target = hash_map.get((row.key_hash or "").lower())
        if not target or row.key == target:
            continue

        conflict = (
            await ProviderRegistry.filter(
                provider_address=row.provider_address,
                chain_id=row.chain_id,
                key=target,
            )
            .exclude(id=row.id)
            .first()
        )

        if conflict:
            print(
                "⚠️ ProviderRegistry 冲突，跳过: "
                f"id={row.id}, {row.key} -> {target}, "
                f"provider={row.provider_address}, chain_id={row.chain_id}"
            )
            continue

        fixes.append((row.id, row.contract_name, row.key, target))

    return fixes


async def apply_fixes(
    contract_fixes: list[tuple[int, str, str, str]],
    registry_fixes: list[tuple[int, str, str, str]],
) -> None:
    """执行修复。"""
    for row_id, contract_name, old_key, new_key in contract_fixes:
        await ContractConfig.filter(id=row_id).update(provider_key=new_key)
        print(f"✅ ContractConfig 已修复: {contract_name} | {old_key} -> {new_key}")

    for row_id, contract_name, old_key, new_key in registry_fixes:
        await ProviderRegistry.filter(id=row_id).update(key=new_key)
        print(
            f"✅ ProviderRegistry 已修复: {contract_name} (id={row_id}) | {old_key} -> {new_key}"
        )


async def main() -> None:
    """Run preview or apply mode for provider_key canonicalization."""
    parser = argparse.ArgumentParser(description="修复 provider_key 历史错误命名")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="执行修复（默认仅预览）",
    )
    args = parser.parse_args()

    print("正在连接数据库...")
    await Tortoise.init(config=TORTOISE_ORM)
    print("✅ 数据库连接成功")

    try:
        hash_map = build_hash_to_name_map()
        contract_fixes = await preview_contract_config_fixes(hash_map)
        registry_fixes = await preview_provider_registry_fixes(hash_map)

        print("\n=== 预览 ===")
        print(f"ContractConfig 待修复: {len(contract_fixes)}")
        for _, contract_name, old_key, new_key in contract_fixes:
            print(f"  - {contract_name}: {old_key} -> {new_key}")

        print(f"ProviderRegistry 待修复: {len(registry_fixes)}")
        for _, contract_name, old_key, new_key in registry_fixes:
            print(f"  - {contract_name}: {old_key} -> {new_key}")

        if not args.apply:
            print("\nℹ️ 仅预览模式。使用 --apply 执行修复。")
            return

        print("\n开始执行修复...")
        await apply_fixes(contract_fixes, registry_fixes)
        print("\n✅ 修复完成")

    finally:
        await Tortoise.close_connections()
        print("数据库连接已关闭")


if __name__ == "__main__":
    asyncio.run(main())
