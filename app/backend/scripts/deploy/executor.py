#!/usr/bin/env python3
"""
SuperCrypto 合约部署执行器
==========================

核心部署逻辑，包括：
- 数据库操作
- ABI 管理
- 合约部署和记录

数据库模型:
- ContractDeployment: 合约部署记录
- ContractConfig: 合约配置
"""

from pathlib import Path
from typing import Any, Optional

from ape import accounts, networks, project
from falib.utils.tools import DevTools, PathTools

from src.models import Account
from src.models.contracts import ContractConfig as ContractConfigModel
from src.models.contracts import ContractDeployment
from src.models.contracts.provider_registry import (
    ZERO_ADDRESS as PROVIDER_ZERO_ADDRESS,
    ProviderRegistry,
    compute_key_hash,
)
from src.shared.common.adapters import get_db_adapter, get_minio_adapter
from src.shared.schemas.enums import (
    ChainID,
    ContractScope,
    ContractStatus,
    ContractType,
    NetWork,
)

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
) -> Optional[ContractDeployment]:
    """
    查询已部署的合约

    Args:
        name: 合约名称
        chain_id: 链 ID
        network: 网络
        project_name: 项目名称（可选）

    Returns:
        ContractDeployment 对象或 None
    """
    with get_db() as db:
        query = ContractDeployment.filter(
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
        query = ContractDeployment.filter(
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

    # 8. 自动写入 ContractConfig 表
    save_contract_config(config, project_name)

    # 9. 更新项目注册表部署状态
    update_project_registry_status(
        project_name=project_name,
        contract_name=config.name,
        network=network,
        address=str(contract.address),
        tx_hash=tx_hash,
    )

    # 10. 预创建 ProviderRegistry 记录 (如果有 provider_key)
    if config.provider_key and provider:
        create_provider_registry_record(
            config=config,
            project_name=project_name,
            provider_address=str(provider.address),
            chain_id=chain_id,
            network=network,
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
    """保存合约记录到数据库 (使用 ContractDeployment)"""
    # 转换 scope 和 contract_type 为枚举
    scope_enum = ContractScope.GLOBAL if scope == "global" else ContractScope.PROJECT
    try:
        type_enum = ContractType(contract_type)
    except ValueError:
        type_enum = ContractType.UNKNOWN

    with get_db() as db:
        # 查找现有记录
        existing = db.query(
            ContractDeployment.filter(
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
                ContractDeployment.filter(id=existing.id).update(
                    address=address,
                    deployer_address=deployer_address,
                    tx_hash=tx_hash,
                    abi_path=abi_url,
                    scope=scope_enum,
                    contract_type=type_enum,
                )
            )
        else:
            # 创建新记录
            db.query(
                ContractDeployment.create(
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
                    abi_path=abi_url,
                )
            )


def save_contract_config(config: ContractConfig, project_name: str):
    """
    保存合约配置到 ContractConfig 表

    从 ContractConfig (部署配置) 自动提取并写入所有配置字段。
    这是唯一的配置数据源，UI 通过 API 从数据库读取。

    Args:
        config: 合约配置 (部署脚本中的 ContractConfig dataclass)
        project_name: 项目名称
    """
    from src.shared.schemas.enums import DependencyType
    
    # 计算 provider_key 名称和 hash
    provider_key_name = None
    provider_key_hash = None

    if config.provider_key:
        # provider_key 是 bytes32，转为 hex
        provider_key_hash = "0x" + config.provider_key.hex()
        # 从 config.name 推断 key 名称 (VankeRWAToken -> VANKE_RWA_TOKEN)
        provider_key_name = _contract_name_to_provider_key(config.name)

    # 转换 dependency_type 字符串为枚举
    try:
        dep_type = DependencyType(config.dependency_type.lower())
    except (ValueError, AttributeError):
        dep_type = DependencyType.BUSINESS

    with get_db() as db:
        # 查找现有记录 (按 contract_name 唯一)
        existing = db.query(ContractConfigModel.filter(contract_name=config.name).first())

        config_data = {
            "project_name": project_name or "common",
            "provider_key": provider_key_name,
            "provider_key_hash": provider_key_hash,
            "dependencies": config.provider_deps,
            "contract_type": config.contract_type,
            "scope": config.scope,
            "description": config.description,
            # 元数据字段
            "dependency_type": dep_type,
            "is_primary": config.is_primary,
            "deploy_order": config.deploy_order,
            "required_deps": config.required_deps,
            "optional_deps": config.optional_deps,
        }

        if existing:
            # 更新现有记录
            db.query(ContractConfigModel.filter(id=existing.id).update(**config_data))
            print(f"   📝 ContractConfig 已更新: {config.name}")
        else:
            # 创建新记录
            db.query(ContractConfigModel.create(contract_name=config.name, **config_data))
            print(f"   📝 ContractConfig 已创建: {config.name}")


def update_project_registry_status(
    project_name: str,
    contract_name: str,
    network: NetWork,
    address: str,
    tx_hash: str = None,
):
    """
    更新项目注册表部署状态

    部署成功后自动更新 ContractDeployment 表的 bindings 字段。
    同时更新 ContractConfig 表的相关信息。

    Args:
        project_name: 项目名称
        contract_name: 合约名称
        network: 网络枚举
        address: 部署地址
        tx_hash: 部署交易哈希
    """
    with get_db() as db:
        # 查找合约配置
        config = db.query(
            ContractConfigModel.filter(
                project_name=project_name,
                contract_name=contract_name,
            ).first()
        )

        if not config:
            print(f"   ⚠️  ContractConfig 未找到: {project_name}/{contract_name}")
            return

        # 查找部署记录
        deployment = db.query(
            ContractDeployment.filter(
                address=address,
            ).first()
        )

        if deployment:
            # 更新部署记录，关联配置
            db.query(
                ContractDeployment.filter(id=deployment.id).update(
                    config_id=config.id,
                )
            )
            print(f"   📋 ContractDeployment 已关联配置: {contract_name}")
        else:
            print(f"   ⚠️  ContractDeployment 未找到: {address}")


def _contract_name_to_provider_key(contract_name: str) -> str:
    """
    合约名称转 Provider Key 名称

    VankeRWAToken -> VANKE_RWA_TOKEN
    KYC -> KYC_MANAGER (特殊处理)
    """
    # 特殊映射
    special_mappings = {
        "KYC": "KYC_MANAGER",
        "MultiSigManager": "MULTI_SIG",
    }
    if contract_name in special_mappings:
        return special_mappings[contract_name]

    # 通用规则: 驼峰转下划线大写
    result = []
    for i, char in enumerate(contract_name):
        if char.isupper() and i > 0:
            result.append("_")
        result.append(char.upper())
    return "".join(result)


def create_provider_registry_record(
    config: ContractConfig,
    project_name: str,
    provider_address: str,
    chain_id: int,
    network: NetWork,
):
    """
    部署时预创建 ProviderRegistry 记录

    创建 is_registered=False 的记录，后续注册/解除注册只需 update。
    如果记录已存在且未删除，则跳过创建。

    Args:
        config: 合约配置
        project_name: 项目名称
        provider_address: AddressProvider 合约地址
        chain_id: 链 ID
        network: 网络
    """
    # 只有有 provider_key 的合约才需要创建记录
    if not config.provider_key:
        return

    provider_key_name = _contract_name_to_provider_key(config.name)
    key_hash = compute_key_hash(provider_key_name)

    with get_db() as db:
        # 查找现有记录（包括已删除的）
        existing = db.query(
            ProviderRegistry.filter(
                provider_address=provider_address,
                chain_id=chain_id,
                key=provider_key_name,
            ).first()
        )

        if existing:
            if existing.is_deleted:
                # 如果是已删除的记录，恢复它
                db.query(
                    ProviderRegistry.filter(id=existing.id).update(
                        is_deleted=False,
                        deleted_at=None,
                        deleted_by=None,
                        is_registered=False,
                        registered_address=PROVIDER_ZERO_ADDRESS,
                    )
                )
                print(f"   📋 ProviderRegistry 已恢复: {provider_key_name}")
            else:
                # 记录已存在且未删除，跳过
                print(f"   📋 ProviderRegistry 已存在: {provider_key_name}")
        else:
            # 创建新记录
            from datetime import datetime

            db.query(
                ProviderRegistry.create(
                    provider_address=provider_address,
                    chain_id=chain_id,
                    network=network,
                    key=provider_key_name,
                    key_hash=key_hash,
                    registered_address=PROVIDER_ZERO_ADDRESS,
                    category=project_name or "_common",
                    contract_name=config.name,
                    is_registered=False,
                    is_deleted=False,
                    last_synced_at=datetime.now(),
                )
            )
            print(f"   📋 ProviderRegistry 已创建: {provider_key_name}")


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
    记录合约依赖关系到数据库 (使用 ContractDeployment.bindings)

    Args:
        contract_name: 合约名称
        contract_id: 合约 ID
        contract_address: 合约地址
        config: 合约配置
        chain_id: 链 ID
        network: 网络
    """
    if not config.provider_deps:
        return

    # 构建 bindings 字典
    bindings = {}

    for provider_key in config.provider_deps:
        # 从 provider_key 反推合约名称
        dep_contract_name = _provider_key_to_contract_name(provider_key)

        # 查找依赖合约
        dep_contract = get_deployed_contract(dep_contract_name, chain_id, network)
        dep_address = dep_contract.address if dep_contract else ZERO_ADDRESS

        bindings[provider_key] = dep_address

    # 更新 ContractDeployment 的 bindings 字段
    with get_db() as db:
        db.query(
            ContractDeployment.filter(id=contract_id).update(bindings=bindings)
        )
        print(f"   📋 依赖绑定已更新: {contract_name} ({len(bindings)} 个依赖)")


def _provider_key_to_contract_name(provider_key: str) -> str:
    """
    Provider Key 转合约名称 (简单规则映射)

    部署脚本中使用，无法访问数据库，使用简单规则映射。
    对于复杂场景，应在部署后通过 ContractConfig 查询。
    """
    # 特殊映射
    special_mappings = {
        "KYC_MANAGER": "KYC",
        "MULTI_SIG": "MultiSigManager",
    }
    if provider_key in special_mappings:
        return special_mappings[provider_key]

    # 通用规则: VANKE_RWA_TOKEN -> VankeRWAToken (下划线分隔转驼峰)
    parts = provider_key.split("_")
    return "".join(part.capitalize() for part in parts)



# ============================================
# 项目注册表同步
# ============================================


def sync_project_registry_before_deploy(project_name: str):
    """
    部署前同步项目注册表配置

    将 config.yaml 中的项目配置同步到 ContractConfig 表。
    这是部署流程的前置步骤，确保配置存在后才能更新部署状态。

    Args:
        project_name: 项目名称
    """
    from src.services.project_registry import get_config_loader

    print(f"\n🔄 同步项目注册表配置: {project_name}")

    with get_db() as db:
        loader = get_config_loader()

        try:
            # 加载配置
            config = loader.load_config(project_name)
            print(f"   配置加载成功: {len(config.contracts)} 个合约")

            # 同步到数据库（同步版本）
            stats = _sync_project_config_sync(db, project_name, config)

            if stats["created"] > 0:
                print(f"   ✅ 创建 {stats['created']} 个合约配置")
            if stats["updated"] > 0:
                print(f"   ✅ 更新 {stats['updated']} 个合约配置")
            if stats["unchanged"] > 0:
                print(f"   ✅ {stats['unchanged']} 个合约配置无变化")

        except Exception as e:
            print(f"   ❌ 同步失败: {e}")
            raise


def _sync_project_config_sync(db, project_name: str, config) -> dict:
    """
    同步版本的配置同步（用于部署脚本）

    将项目配置同步到 ContractConfig 表。

    Args:
        db: 数据库适配器
        project_name: 项目名称
        config: ProjectConfigSchema

    Returns:
        同步统计
    """
    from src.shared.schemas.enums import DependencyType

    stats = {"created": 0, "updated": 0, "unchanged": 0}

    for contract_config in config.contracts:
        # 查找现有记录
        existing = db.query(
            ContractConfigModel.filter(
                contract_name=contract_config.name,
            ).first()
        )

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
            # 检查是否有变化（简单比较关键字段）
            changed = (
                existing.project_name != data["project_name"]
                or existing.description != data["description"]
                or existing.dependency_type != data["dependency_type"]
                or existing.is_primary != data["is_primary"]
                or existing.required_deps != data["required_deps"]
                or existing.optional_deps != data["optional_deps"]
                or existing.deploy_order != data["deploy_order"]
            )

            if changed:
                db.query(ContractConfigModel.filter(id=existing.id).update(**data))
                stats["updated"] += 1
            else:
                stats["unchanged"] += 1
        else:
            db.query(ContractConfigModel.create(**data))
            stats["created"] += 1

    return stats
