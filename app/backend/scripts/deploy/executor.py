#!/usr/bin/env python3
"""
SuperCrypto 合约部署执行器（异步版本）
==========================

核心部署逻辑，包括：
- 数据库操作
- ABI 管理
- 合约部署和记录

数据库模型:
- ContractDeployment: 合约部署记录
- ContractConfig: 合约配置
"""

import json
from pathlib import Path
from typing import Optional

from src.models import Account
from src.models.contracts import ContractConfig as ContractConfigModel
from src.models.contracts import ContractDeployment
from src.models.contracts.provider_registry import (
    ZERO_ADDRESS as PROVIDER_ZERO_ADDRESS,
)
from src.models.contracts.provider_registry import (
    ProviderRegistry,
)
from src.schemas.enums import (
    ChainID,
    ContractScope,
    ContractStatus,
    ContractType,
    DependencyType,
    Network,
)

from .base import ContractConfig, ProviderKey

# ============================================
# 网络和账户
# ============================================


def get_current_network() -> str:
    """获取当前网络名称"""
    from ape import networks

    provider = networks.active_provider
    if provider is None:
        raise RuntimeError("❌ 未连接到网络，请使用 --network 参数")
    return provider.network.name


def get_chain_id(network: str) -> int:
    """获取链 ID"""
    from falib.utils.tools import DevTools

    return DevTools.get_enum_value(ChainID, network)


def get_network_enum(network: str) -> Network:
    """获取网络枚举"""
    from falib.utils.tools import DevTools

    return DevTools.get_enum_value(Network, network)


async def get_deployer(network: str):
    """
    从数据库获取部署账户

    Args:
        network: 网络名称

    Returns:
        Ape 账户对象
    """
    from ape import accounts

    net_enum = get_network_enum(network)

    # 直接在数据库层过滤 JSON roles，避免全量查询后再在 Python 侧筛选
    account = await Account.filter(
        network=net_enum,
        roles__contains=["contract_owner"],
    ).first()

    if not account:
        raise ValueError(
            f"❌ 未找到具有 contract_owner 角色的 network={network} 的账户"
        )

    target_address = account.address.lower()

    # 在测试账户中查找
    for test_account in accounts.test_accounts:
        if test_account.address.lower() == target_address:
            print(f"✅ 部署账户: {test_account.address}")
            print(f"   余额: {test_account.balance / 10**18:.4f} ETH")
            return test_account

    raise ValueError(f"❌ 账户 {target_address} 不在 test_accounts 中")


# ============================================
# ABI 管理
# ============================================


def get_abi_path(contract_name: str) -> Path:
    """获取本地 ABI 文件路径"""
    from falib.utils.tools import PathTools

    root_path = PathTools.get_root_path()
    return PathTools.combine_path(root_path, ".build", "abi", f"{contract_name}.json")


def check_abi_exists(contract_name: str) -> bool:
    """检查 ABI 文件是否存在"""
    abi_path = get_abi_path(contract_name)
    if not abi_path.exists():
        print(f"❌ ABI 不存在: {abi_path}")
        print("   请先编译: ape compile")
        return False
    return True


def get_abi(contract_name: str) -> list:
    """
    获取合约 ABI

    优先顺序：
    1. 本地 .build/abi/{name}.json
    2. ape 项目编译结果
    """
    # 1. 尝试从本地文件读取
    abi_path = get_abi_path(contract_name)
    if abi_path.exists():
        with open(abi_path) as f:
            artifact = json.load(f)
            if isinstance(artifact, list):
                return artifact
            if isinstance(artifact, dict) and "abi" in artifact:
                return artifact["abi"]
            raise ValueError(f"❌ ABI 文件格式错误: {abi_path}")

    # 2. 从 ape 项目获取
    try:
        from ape import project

        contract = getattr(project, contract_name)
        return contract.contract_type.abi
    except AttributeError:
        raise ValueError(f"❌ 未找到合约 {contract_name} 的 ABI")


def save_abi_to_file(contract_name: str, abi: list, address: str = "") -> str:
    """
    保存 ABI 到本地文件（供前端使用）

    Returns:
        文件保存路径
    """
    from datetime import datetime

    abi_path = get_abi_path(contract_name)
    abi_path.parent.mkdir(parents=True, exist_ok=True)

    # 包含地址的完整 ABI 信息
    abi_data = {
        "contractName": contract_name,
        "abi": abi,
        "address": address,
        "updatedAt": datetime.now().isoformat(),
    }

    with open(abi_path, "w") as f:
        json.dump(abi_data, f, indent=2)

    print(f"   💾 ABI 已保存: {abi_path}")
    return str(abi_path)


async def upload_abi_to_minio(
    contract_name: str,
    abi: list,
    network: Network,
    project_name: str,
) -> str:
    """上传 ABI 到 MinIO 并返回对象路径。"""
    from falib.utils.config import SETTINGS

    from src.common.adapters import get_async_minio_adapter

    network_value = getattr(network, "value", str(network))
    object_name = f"contracts/abi/{str(network_value).lower()}/{project_name}/{contract_name}.json"
    content = json.dumps(abi, ensure_ascii=False).encode("utf-8")

    async with get_async_minio_adapter() as minio:
        await minio.put_object(SETTINGS.MINIO.BUCKET, object_name, content)

    print(f"   ☁️ ABI 已上传: {object_name}")
    return object_name


# ============================================
# 合约部署核心逻辑
# ============================================


async def deploy_contract(
    config: ContractConfig,
    deployer,
    chain_id: int,
    network: Network,
    project_name: str = "common",
    deployed: dict = None,
    provider=None,
):
    """
    部署合约

    Args:
        config: 合约配置
        deployer: 部署账户
        chain_id: 链 ID
        network: 网络
        project_name: 项目名称
        deployed: 已部署合约地址字典
        provider: AddressProvider 实例

    Returns:
        (合约实例, 地址)
    """
    from ape import chain, project

    deployed = deployed or {}

    # 1. 检查是否已部署
    if config.skip_if_exists:
        existing = await get_deployed_contract(
            config.name,
            chain_id,
            network,
            project_name,
            scope=config.scope,
            contract_type=config.contract_type,
        )
        if existing:
            # 验证链上是否真的有合约代码
            code = chain.provider.get_code(existing.address)
            if code and len(code) > 0:
                print(f"   ⏭️  已存在: {existing.address}")
                await save_contract_config(config, project_name)
                if config.provider_key and provider:
                    await create_provider_registry_record(
                        config=config,
                        project_name=project_name,
                        provider_address=str(provider.address),
                        chain_id=chain_id,
                        network=network,
                    )
                contract_class = getattr(project, config.contract_class_name)
                return contract_class.at(existing.address), existing.address
            else:
                print(f"   ⚠️  DB 记录存在但链上无代码，将重新部署: {existing.address}")

    # 2. 检查 ABI
    if not check_abi_exists(config.name):
        raise RuntimeError(f"ABI 不存在: {config.name}")

    # 3. 保存 ABI
    abi = get_abi(config.name)
    save_abi_to_file(config.name, abi)
    abi_path = await upload_abi_to_minio(
        contract_name=config.name,
        abi=abi,
        network=network,
        project_name=project_name,
    )

    # 4. 解析构造函数参数
    constructor_args = config.get_constructor_args(deployed, provider)

    # 5. 部署（Ape 是同步的）
    print("   🚀 部署中...")
    if constructor_args:
        print(f"      参数: {constructor_args}")

    contract_class = getattr(project, config.contract_class_name)
    contract = contract_class.deploy(*constructor_args, sender=deployer)

    # 6. 获取交易哈希
    tx_hash = ""
    if contract.creation_metadata:
        tx_hash = str(contract.creation_metadata.txn_hash)

    # 7. 保存到数据库
    await save_contract(
        name=config.name,
        address=str(contract.address),
        deployer_address=deployer.address,
        network=network,
        chain_id=chain_id,
        scope=config.scope,
        contract_type=config.contract_type,
        project_name=project_name,
        tx_hash=tx_hash,
        abi_path=abi_path,
    )

    # 8. 自动写入 ContractConfig 表
    await save_contract_config(config, project_name)

    # 9. 预创建 ProviderRegistry 记录
    if config.provider_key and provider:
        await create_provider_registry_record(
            config=config,
            project_name=project_name,
            provider_address=str(provider.address),
            chain_id=chain_id,
            network=network,
        )

    print(f"   ✅ 已部署: {contract.address}")

    return contract, str(contract.address)


async def save_contract(
    name: str,
    address: str,
    deployer_address: str,
    network: Network,
    chain_id: int,
    scope: str,
    contract_type: str,
    project_name: str,
    tx_hash: str,
    abi_path: str,
):
    """保存合约记录到数据库"""
    scope_enum = ContractScope.GLOBAL if scope == "global" else ContractScope.PROJECT
    try:
        type_enum = ContractType(contract_type)
    except ValueError:
        type_enum = ContractType.UNKNOWN

    # 查找现有记录
    existing = await ContractDeployment.filter(
        name=name,
        chain_id=chain_id,
        network=network,
        project_name=project_name,
        scope=scope_enum,
        contract_type=type_enum,
        status=ContractStatus.ACTIVE,
    ).first()

    if existing:
        # 更新现有记录
        await ContractDeployment.filter(id=existing.id).update(
            address=address,
            deployer_address=deployer_address,
            tx_hash=tx_hash,
            abi_path=abi_path,
            scope=scope_enum,
            contract_type=type_enum,
        )
    else:
        # 创建新记录
        await ContractDeployment.create(
            name=name,
            address=address,
            deployer_address=deployer_address,
            network=network,
            chain_id=chain_id,
            scope=scope_enum,
            contract_type=type_enum,
            project_name=project_name,
            tx_hash=tx_hash,
            status=ContractStatus.ACTIVE,
            abi_path=abi_path,
        )


async def save_external_contract_placeholder(
    name: str,
    placeholder_address: str,
    deployer_address: str,
    network: Network,
    chain_id: int,
    scope: str,
    contract_type: str,
    project_name: str,
):
    """保存外部合约占位记录到数据库"""
    scope_enum = ContractScope.GLOBAL if scope == "global" else ContractScope.PROJECT
    try:
        type_enum = ContractType(contract_type)
    except ValueError:
        type_enum = ContractType.UNKNOWN

    existing = await ContractDeployment.filter(
        name=name,
        chain_id=chain_id,
        network=network,
        project_name=project_name,
        scope=scope_enum,
        contract_type=type_enum,
    ).first()

    if existing:
        await ContractDeployment.filter(id=existing.id).update(
            address=placeholder_address,
            deployer_address=deployer_address,
            tx_hash="EXTERNAL_PENDING",
            status=ContractStatus.PAUSED,
        )
    else:
        await ContractDeployment.create(
            name=name,
            address=placeholder_address,
            deployer_address=deployer_address,
            network=network,
            chain_id=chain_id,
            scope=scope_enum,
            contract_type=type_enum,
            project_name=project_name,
            tx_hash="EXTERNAL_PENDING",
            status=ContractStatus.PAUSED,
            abi_path="",
        )


async def save_contract_config(config: ContractConfig, project_name: str):
    """保存合约配置到 ContractConfig 表"""
    # 计算 provider_key 名称和 hash
    provider_key_name = None
    provider_key_hash = None

    if config.provider_key:
        provider_key_hash = "0x" + config.provider_key.hex()
        provider_key_name = _provider_key_bytes_to_name(config.provider_key)
        if not provider_key_name:
            provider_key_name = _contract_name_to_provider_key(config.name)

    # 转换 dependency_type
    try:
        dep_type = DependencyType(config.dependency_type.lower())
    except (ValueError, AttributeError):
        dep_type = DependencyType.BUSINESS

    # 查找现有记录
    existing = await ContractConfigModel.filter(contract_name=config.name).first()

    config_data = {
        "project_name": project_name or "common",
        "provider_key": provider_key_name,
        "provider_key_hash": provider_key_hash,
        "dependencies": config.provider_deps,
        "contract_type": config.contract_type,
        "scope": config.scope,
        "description": config.description,
        "dependency_type": dep_type,
        "is_primary": config.is_primary,
        "deploy_order": config.deploy_order,
        "required_deps": config.required_deps,
        "optional_deps": config.optional_deps,
    }

    if existing:
        await ContractConfigModel.filter(id=existing.id).update(**config_data)
        print(f"   📝 ContractConfig 已更新: {config.name}")
    else:
        await ContractConfigModel.create(contract_name=config.name, **config_data)
        print(f"   📝 ContractConfig 已创建: {config.name}")


async def create_provider_registry_record(
    config: ContractConfig,
    project_name: str,
    provider_address: str,
    chain_id: int,
    network: Network,
):
    """创建 ProviderRegistry 记录"""
    if not config.provider_key:
        return

    provider_key_name = _provider_key_bytes_to_name(config.provider_key)
    if not provider_key_name:
        provider_key_name = _contract_name_to_provider_key(config.name)
    key_hash = "0x" + config.provider_key.hex()

    existing = await ProviderRegistry.filter(
        provider_address=provider_address,
        chain_id=chain_id,
        key=provider_key_name,
    ).first()

    if existing:
        if existing.is_deleted:
            await ProviderRegistry.filter(id=existing.id).update(
                is_deleted=False,
                deleted_at=None,
                deleted_by=None,
                is_registered=False,
                registered_address=PROVIDER_ZERO_ADDRESS,
            )
            print(f"   📋 ProviderRegistry 已恢复: {provider_key_name}")
        else:
            print(f"   📋 ProviderRegistry 已存在: {provider_key_name}")
    else:
        await ProviderRegistry.create(
            provider_address=provider_address,
            chain_id=chain_id,
            network=network,
            key=provider_key_name,
            key_hash=key_hash,
            is_registered=False,
            registered_address=PROVIDER_ZERO_ADDRESS,
        )
        print(f"   📋 ProviderRegistry 已创建: {provider_key_name}")


def _contract_name_to_provider_key(contract_name: str) -> str:
    """将合约名称转换为 Provider Key 名称"""
    # VankeRWAToken -> VANKE_RWA_TOKEN
    result = []
    for i, char in enumerate(contract_name):
        if char.isupper() and i > 0:
            result.append("_")
        result.append(char.upper())
    return "".join(result)


def _provider_key_bytes_to_name(provider_key: bytes) -> Optional[str]:
    """根据 ProviderKey 的 bytes32 反查标准 key 名称。"""
    if not provider_key:
        return None

    key_bytes = bytes(provider_key)
    for key_name, key_value in vars(ProviderKey).items():
        if key_name.startswith("_"):
            continue
        if isinstance(key_value, (bytes, bytearray)) and bytes(key_value) == key_bytes:
            return key_name

    return None


# ============================================
# 合约查询
# ============================================


async def get_deployed_contract(
    name: str,
    chain_id: int,
    network: Network,
    project_name: str = "",
    scope: str = "",
    contract_type: str = "",
) -> Optional[ContractDeployment]:
    """查询已部署的合约"""
    query = ContractDeployment.filter(
        name=name,
        chain_id=chain_id,
        network=network,
        status=ContractStatus.ACTIVE,
    )

    if project_name:
        query = query.filter(project_name=project_name)
    if scope:
        scope_enum = (
            ContractScope.GLOBAL if scope == "global" else ContractScope.PROJECT
        )
        query = query.filter(scope=scope_enum)
    if contract_type:
        try:
            type_enum = ContractType(contract_type)
            query = query.filter(contract_type=type_enum)
        except ValueError:
            pass

    return await query.first()


async def get_all_deployed(
    chain_id: int, network: Network, project_name: str = ""
) -> dict[str, str]:
    """获取已部署合约的地址映射"""
    query = ContractDeployment.filter(
        chain_id=chain_id,
        network=network,
        status=ContractStatus.ACTIVE,
    )
    if project_name:
        query = query.filter(project_name=project_name)
    contracts = await query.all()

    return {c.name: c.address for c in contracts}


async def get_global_and_project_deployed(
    chain_id: int, network: Network, project_name: str
) -> dict[str, str]:
    """获取公共合约 + 指定项目合约的地址映射"""
    global_contracts = await get_all_deployed(chain_id, network, "common")
    project_contracts = await get_all_deployed(chain_id, network, project_name)
    return {**global_contracts, **project_contracts}


# ============================================
# 项目注册表管理
# ============================================


def sync_project_registry_before_deploy(project_name: str):
    """
    部署前同步项目注册表配置

    Args:
        project_name: 项目名称
    """
    # 目前这是一个占位函数，将来可以在这里同步项目配置
    print(f"   📋 项目注册表同步: {project_name}")


async def record_dependencies(
    contract_name: str,
    contract_id: int,
    contract_address: str,
    config: ContractConfig,
    chain_id: int,
    network: Network,
):
    """
    记录合约依赖关系到数据库

    Args:
        contract_name: 合约名称
        contract_id: 合约在 ContractDeployment 表中的 ID
        contract_address: 合约地址
        config: 合约配置
        chain_id: 链 ID
        network: 网络枚举
    """
    # 目前这是一个占位函数，将来可以在这里实现依赖关系记录
    if config.provider_deps:
        deps_str = ", ".join(config.provider_deps)
        print(f"   📝 依赖关系记录: {contract_name} -> [{deps_str}]")


# ============================================
# 简化导出
# ============================================

__all__ = [
    # 网络和账户
    "get_current_network",
    "get_chain_id",
    "get_network_enum",
    "get_deployer",
    # ABI 管理
    "get_abi_path",
    "get_abi",
    "check_abi_exists",
    "save_abi_to_file",
    # 合约部署
    "deploy_contract",
    "save_contract",
    "save_external_contract_placeholder",
    # 合约配置
    "save_contract_config",
    "create_provider_registry_record",
    # 已部署合约查询
    "get_deployed_contract",
    "get_all_deployed",
    "get_global_and_project_deployed",
    # 项目注册表管理
    "sync_project_registry_before_deploy",
    "record_dependencies",
]
