#!/usr/bin/env python3
"""
SuperCrypto 合约部署执行器
==========================

核心部署逻辑，包括：
- 数据库操作
- ABI 管理
- 合约部署和记录
"""

from pathlib import Path
from typing import Any, Optional

from ape import accounts, networks, project
from falib.utils.tools import DevTools, PathTools

from src.models import Account, Contract
from src.models.contracts.contract_dependency import (
    PROVIDER_KEYS,
    ContractDependency,
)
from src.shared.common.adapters import get_db_adapter, get_minio_adapter
from src.shared.schemas.enums import ChainID, ContractStatus, NetWork

from .base import ZERO_ADDRESS, ContractConfig

# ============================================
# 单例适配器
# ============================================

_db_adapter = None
_minio_adapter = None


def get_db():
    """获取数据库适配器"""
    global _db_adapter
    if _db_adapter is None:
        _db_adapter = get_db_adapter()
    return _db_adapter


def get_minio():
    """获取 MinIO 适配器"""
    global _minio_adapter
    if _minio_adapter is None:
        _minio_adapter = get_minio_adapter()
    return _minio_adapter


# ============================================
# 网络和账户
# ============================================


def get_current_network() -> str:
    """获取当前网络名称"""
    provider = networks.active_provider
    if provider is None:
        raise RuntimeError("❌ 未连接到网络，请使用 --network 参数")
    return provider.network.name


def get_chain_id(network: str) -> int:
    """获取链 ID"""
    return DevTools.get_enum_value(ChainID, network)


def get_network_enum(network: str) -> NetWork:
    """获取网络枚举"""
    return DevTools.get_enum_value(NetWork, network)


def get_deployer(network: str, tag: str = "admin"):
    """
    从数据库获取部署账户

    Args:
        network: 网络名称
        tag: 账户标签

    Returns:
        Ape 账户对象
    """
    net_enum = get_network_enum(network)

    with get_db() as db:
        data = db.query(Account.filter(tag=tag, network=net_enum).first())

    if not data:
        raise ValueError(f"❌ 未找到 tag={tag}, network={network} 的账户")

    target_address = data.address.lower()

    # 在测试账户中查找
    for i, test_account in enumerate(accounts.test_accounts):
        if test_account.address.lower() == target_address:
            print(f"✅ 部署账户: {test_account.address}")
            print(f"   余额: {test_account.balance / 10**18:.4f} ETH")
            return test_account

    raise ValueError(f"❌ 账户 {data.address} 不在 test_accounts 中")


# ============================================
# ABI 管理
# ============================================


def get_abi_path(contract_name: str) -> Path:
    """获取本地 ABI 文件路径"""
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


def upload_abi(
    contract_name: str, scope: str, contract_type: str, project_name: str = ""
) -> str:
    """
    上传 ABI 到 MinIO

    Args:
        contract_name: 合约名称
        scope: 作用域 (global/project)
        contract_type: 功能类型
        project_name: 项目名称

    Returns:
        远程路径
    """
    abi_path = get_abi_path(contract_name)

    # 构建远程路径: abi/{scope}/{contract_type}/{project}/{contract}.json
    parts = ["abi", scope, contract_type]
    if project_name and scope == "project":
        parts.append(project_name)
    parts.append(f"{contract_name}.json")
    object_name = "/".join(parts)

    with get_minio() as minio:
        if minio.upload_file(str(abi_path), object_name):
            print(f"   📤 ABI 上传: {object_name}")
            return object_name
        else:
            print(f"   ⚠️  ABI 上传失败: {object_name}")
            return ""


# ============================================
# 合约查询
# ============================================


def get_deployed_contract(
    name: str, chain_id: int, network: NetWork, project_name: str = ""
) -> Optional[Contract]:
    """
    查询已部署的合约

    Args:
        name: 合约名称
        chain_id: 链 ID
        network: 网络
        project_name: 项目名称（可选）

    Returns:
        Contract 对象或 None
    """
    with get_db() as db:
        query = Contract.filter(
            name=name,
            chain_id=chain_id,
            network=network,
            status=ContractStatus.ACTIVE,
        )
        if project_name:
            query = query.filter(project_name=project_name)
        return db.query(query.first())


def get_all_deployed(
    chain_id: int, network: NetWork, project_name: str = ""
) -> dict[str, str]:
    """
    获取已部署合约的地址映射

    Args:
        chain_id: 链 ID
        network: 网络
        project_name: 项目名称（空=所有，"_common"=公共，其他=指定项目）

    Returns:
        {contract_name: address}
    """
    with get_db() as db:
        query = Contract.filter(
            chain_id=chain_id,
            network=network,
            status=ContractStatus.ACTIVE,
        )
        if project_name:
            query = query.filter(project_name=project_name)
        contracts = db.query(query.all())

    return {c.name: c.address for c in contracts}


def get_global_and_project_deployed(
    chain_id: int, network: NetWork, project_name: str
) -> dict[str, str]:
    """
    获取公共合约 + 指定项目合约的地址映射

    用于项目部署时获取完整上下文（公共依赖 + 本项目合约）

    Args:
        chain_id: 链 ID
        network: 网络
        project_name: 项目名称

    Returns:
        {contract_name: address}
    """
    # 获取公共合约
    global_contracts = get_all_deployed(chain_id, network, "_common")

    # 获取项目合约
    project_contracts = get_all_deployed(chain_id, network, project_name)

    # 合并（项目合约优先，因为可能同名覆盖）
    return {**global_contracts, **project_contracts}


# ============================================
# 合约部署
# ============================================


def deploy_contract(
    config: ContractConfig,
    deployer,
    chain_id: int,
    network: NetWork,
    project_name: str = "",
    deployed: dict = None,
    provider=None,
) -> tuple[Any, str]:
    """
    部署单个合约

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
    deployed = deployed or {}

    # 1. 检查是否已部署
    if config.skip_if_exists:
        existing = get_deployed_contract(config.name, chain_id, network, project_name)
        if existing:
            print(f"   ⏭️  已存在: {existing.address}")
            contract_class = getattr(project, config.contract_class_name)
            return contract_class.at(existing.address), existing.address

    # 2. 检查 ABI
    if not check_abi_exists(config.name):
        raise RuntimeError(f"ABI 不存在: {config.name}")

    # 3. 上传 ABI
    abi_url = upload_abi(config.name, config.scope, config.contract_type, project_name)

    # 4. 解析构造函数参数
    constructor_args = config.get_constructor_args(deployed, provider)

    # 5. 部署
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
    save_contract(
        name=config.name,
        address=str(contract.address),
        deployer_address=deployer.address,
        network=network,
        chain_id=chain_id,
        scope=config.scope,
        contract_type=config.contract_type,
        project_name=project_name,
        tx_hash=tx_hash,
        abi_url=abi_url,
    )

    print(f"   ✅ 已部署: {contract.address}")

    return contract, str(contract.address)


def save_contract(
    name: str,
    address: str,
    deployer_address: str,
    network: NetWork,
    chain_id: int,
    scope: str,
    contract_type: str,
    project_name: str,
    tx_hash: str,
    abi_url: str,
):
    """保存合约记录到数据库"""

    with get_db() as db:
        # 查找现有记录
        existing = db.query(
            Contract.filter(
                name=name,
                chain_id=chain_id,
                network=network,
                project_name=project_name,
                status=ContractStatus.ACTIVE,
            ).first()
        )

        if existing:
            # 更新现有记录
            db.query(
                Contract.filter(id=existing.id).update(
                    address=address,
                    deployer_address=deployer_address,
                    tx_hash=tx_hash,
                    abi_path=abi_url,
                    scope=scope,
                    contract_type=contract_type,
                )
            )
        else:
            # 创建新记录
            db.query(
                Contract.create(
                    name=name,
                    address=address,
                    deployer_address=deployer_address,
                    network=network,
                    chain_id=chain_id,
                    scope=scope,
                    contract_type=contract_type,
                    project_name=project_name,
                    tx_hash=tx_hash,
                    status=ContractStatus.ACTIVE,
                    abi_path=abi_url,
                )
            )


# ============================================
# 依赖记录
# ============================================


def record_dependencies(
    contract_name: str,
    contract_id: int,
    contract_address: str,
    config: ContractConfig,
    chain_id: int,
    network: NetWork,
):
    """
    记录合约依赖关系到数据库 (纯 Provider 模式)

    Args:
        contract_name: 合约名称
        contract_id: 合约 ID
        contract_address: 合约地址
        config: 合约配置
        chain_id: 链 ID
        network: 网络
    """
    # Provider 依赖 - 使用 Provider Key
    for provider_key in config.provider_deps:
        # 从 PROVIDER_KEYS 配置获取依赖合约信息
        key_info = PROVIDER_KEYS.get(provider_key, {})
        dep_contract_name = key_info.get("contract", provider_key)

        # 查找依赖合约 (在 with 块外调用，避免嵌套)
        dep_contract = get_deployed_contract(dep_contract_name, chain_id, network)
        dep_id = dep_contract.id if dep_contract else None
        dep_address = dep_contract.address if dep_contract else ZERO_ADDRESS

        # 数据库操作
        with get_db() as db:
            # 检查是否已存在
            existing = db.query(
                ContractDependency.filter(
                    contract_name=contract_name,
                    dependency_name=dep_contract_name,
                ).first()
            )

            if not existing:
                db.query(
                    ContractDependency.create(
                        contract_id=contract_id,
                        contract_address=contract_address,
                        contract_name=contract_name,
                        dependency_id=dep_id,
                        dependency_address=dep_address,
                        dependency_name=dep_contract_name,
                        provider_key=provider_key,
                        is_deployed=dep_contract is not None,
                    )
                )
            else:
                # 更新现有记录
                db.query(
                    ContractDependency.filter(id=existing.id).update(
                        dependency_id=dep_id,
                        dependency_address=dep_address,
                        is_deployed=dep_contract is not None,
                    )
                )
