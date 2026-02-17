"""
Contract Service - 合约管理服务

包含:
- Config Loader: 合约配置加载（模块级函数）
- ContractService: 统一合约管理服务
  - Registry 分区: Provider 注册/注销
  - Status 分区: 状态查询
  - Sync 分区: 同步与主合约管理
"""

from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.common.adapters import get_async_web3_adapter
from src.common.exceptions import BusinessException
from src.constants.definitions.contract import ZERO_ADDRESS
from src.models.asset import AssetContractBinding
from src.models.contracts.contract_config import ContractConfig
from src.models.contracts.contract_deployment import ContractDeployment
from src.models.contracts.provider_registry import (
    ProviderRegistry,
    compute_key_hash,
)
from src.schemas.contract_config import (
    ContractConfigModel,
    ProjectConfig,
    ProviderKeyConfig,
)
from src.schemas.enums import ContractScope, ContractStatus, ErrorCode
from src.services.storage_service import StorageService

__all__ = [
    # 配置加载
    "ProviderKeyConfig",
    "ProjectConfig",
    "ContractConfigModel",
    "load_contract_config",
    "reload_config",
    "get_provider_keys",
    "get_contract_dependencies",
    "get_project_configs",
    "get_dependency_set_functions",
    "get_keys_by_category",
    "get_contract_category",
    "get_provider_key_for_contract",
    "get_config_path",
    "validate_config",
    # 主服务
    "ContractService",
    "get_contract_service",
]


# =============================================================================
# Config Loader - 合约配置加载服务
# =============================================================================

logger_config = get_logger("business.contract.config")


def _get_config_dir() -> Path:
    """获取配置目录路径"""
    current_file = Path(__file__)
    backend_dir = current_file.parent.parent
    return backend_dir / "config"


def get_config_path() -> Path:
    """
    获取配置文件路径

    优先级:
    1. contracts.{environment}.yaml (如 contracts.hardhat.yaml)
    2. contracts.yaml (默认)

    返回:
        配置文件 Path

    异常:
        FileNotFoundError: 如果配置文件不存在
    """
    config_dir = _get_config_dir()
    env = getattr(SETTINGS, "environment", "hardhat")

    env_config = config_dir / f"contracts.{env}.yaml"
    if env_config.exists():
        return env_config

    default_config = config_dir / "contracts.yaml"
    if default_config.exists():
        return default_config

    raise FileNotFoundError(
        f"Contract config not found. Expected at {env_config} or {default_config}"
    )


@lru_cache(maxsize=1)
def load_contract_config() -> ContractConfigModel:
    """
    加载合约配置（带缓存）

    配置文件仅在首次调用时加载，之后从缓存返回。
    如需重新加载，调用 reload_config()。

    返回:
        ContractConfigModel 实例
    """
    config_path = get_config_path()
    logger_config.info(f"Loading contract config from {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        raw_config = yaml.safe_load(f)

    config = ContractConfigModel(**raw_config)
    logger_config.info(
        f"Loaded config: {len(config.provider_keys)} keys, "
        f"{len(config.contract_dependencies)} deps, "
        f"{len(config.projects)} projects"
    )

    return config


def reload_config() -> ContractConfigModel:
    """
    重新加载配置（清除缓存）

    返回:
        新加载的 ContractConfigModel 实例
    """
    load_contract_config.cache_clear()
    return load_contract_config()


def get_provider_keys() -> dict[str, dict[str, str]]:
    """
    获取 Provider Keys 配置

    返回:
        {key_name: {"category": ..., "contract": ..., "description": ...}}
    """
    config = load_contract_config()
    return {k: v.model_dump() for k, v in config.provider_keys.items()}


def get_contract_dependencies() -> dict[str, list[str]]:
    """
    获取合约依赖配置

    返回:
        {contract_name: [dep_key1, dep_key2, ...]}
    """
    return load_contract_config().contract_dependencies


def get_project_configs() -> dict[str, dict[str, Any]]:
    """
    获取项目配置

    返回:
        {project_name: {"label": ..., "color": ..., ...}}
    """
    config = load_contract_config()
    return {k: v.model_dump() for k, v in config.projects.items()}


def get_dependency_set_functions() -> dict[str, str]:
    """
    获取依赖设置函数映射

    返回:
        {provider_key: setter_function_name}
    """
    return load_contract_config().dependency_set_functions


def get_keys_by_category(category: str) -> list[str]:
    """
    获取指定分类的所有 Key

    参数:
        category: 分类名称 (common/stablecoin/vanke 等)

    返回:
        Provider Key 名称列表
    """
    config = load_contract_config()
    return [k for k, v in config.provider_keys.items() if v.category == category]


def get_contract_category(contract_name: str) -> str | None:
    """
    获取合约所属分类

    参数:
        contract_name: 合约名称

    返回:
        分类名称，如果未找到则返回 None
    """
    config = load_contract_config()

    for key_info in config.provider_keys.values():
        if key_info.contract == contract_name:
            return key_info.category

    for project_name, project in config.projects.items():
        if contract_name in project.contracts:
            return project_name

    return None


def get_provider_key_for_contract(contract_name: str) -> str | None:
    """
    获取合约对应的 Provider Key

    参数:
        contract_name: 合约名称

    返回:
        Provider Key 名称，如果未找到则返回 None
    """
    config = load_contract_config()
    for key_name, key_info in config.provider_keys.items():
        if key_info.contract == contract_name:
            return key_name
    return None


def validate_config() -> list[str]:
    """
    验证配置完整性

    返回:
        错误消息列表（空列表表示无错误）
    """
    errors = []
    config = load_contract_config()

    for contract, deps in config.contract_dependencies.items():
        for dep_key in deps:
            if dep_key not in config.provider_keys:
                errors.append(
                    f"Contract '{contract}' references unknown key '{dep_key}'"
                )

    for project_name, project in config.projects.items():
        for contract in project.contracts:
            if contract not in config.contract_dependencies:
                errors.append(
                    f"Project '{project_name}' references unknown contract '{contract}'"
                )

    return errors


# =============================================================================
# Contract Service - 统一合约管理服务
# =============================================================================

logger = get_logger("business.contract.service")

# set_address 函数 ABI
SET_ADDRESS_ABI = [
    {
        "name": "set_address",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "_key", "type": "bytes32"},
            {"name": "_address", "type": "address"},
        ],
        "outputs": [],
    }
]

# 合约类型配置
CONTRACT_TYPE_CONFIGS = {
    "registry": {"label": "注册中心", "color": "purple", "icon": "📦"},
    "kyc": {"label": "KYC", "color": "blue", "icon": "🔐"},
    "governance": {"label": "治理", "color": "indigo", "icon": "⚖️"},
    "stablecoin": {"label": "稳定币", "color": "green", "icon": "💵"},
    "token": {"label": "代币", "color": "yellow", "icon": "🪙"},
    "defi": {"label": "DeFi", "color": "orange", "icon": "📊"},
}

# 项目配置（仅包含业务项目，不包含 common/mock 等基础设施项目）
PROJECT_CONFIGS = {
    "vanke": {"name": "vanke", "label": "VANKE", "color": "green"},
}

# 合约类型到图类型映射
TYPE_TO_GRAPH_TYPE = {
    "registry": "common",
    "kyc": "common",
    "stablecoin": "mock",
    "governance": "common",
    "token": "exclusive",
    "defi": "exclusive",
}


class ContractService:
    """
    合约管理服务

    统一管理合约的注册/注销、状态查询、同步与主合约管理。
    方法按职责分区组织：
    - 初始化
    - Registry: Provider 注册/注销
    - Status: 状态查询
    - Sync: 同步与主合约管理
    """

    def __init__(self, network: Optional[str] = None):
        self.network = network or SETTINGS.network

    # ============ Registry - Provider 注册/注销 ============

    async def get_provider_contract(self) -> ContractDeployment:
        """获取 AddressProvider 合约"""
        provider = await ContractDeployment.filter(
            name="AddressProvider",
            network=self.network,
            status=ContractStatus.ACTIVE,
        ).first()
        if not provider or not provider.address:
            raise BusinessException(
                error_code=ErrorCode.ADDRESS_PROVIDER_NOT_FOUND,
                detail="AddressProvider not found or not deployed",
            )
        return provider

    async def get_config_and_key(
        self, contract_name: str, provider_key: Optional[str]
    ) -> tuple:
        """获取合约配置和 provider_key"""
        config = await ContractConfig.filter(contract_name=contract_name).first()
        if not config:
            raise BusinessException(
                error_code=ErrorCode.CONTRACT_CONFIG_NOT_FOUND,
                detail=f"Contract '{contract_name}' not found in ContractConfig",
            )
        key = provider_key or config.provider_key
        if not key:
            raise BusinessException(
                error_code=ErrorCode.CONTRACT_NO_PROVIDER_KEY,
                detail=f"No provider_key for contract '{contract_name}'",
            )
        return config, key

    async def prepare_register(
        self, contract_name: str, provider_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        准备注册调用参数 (前端钱包签名模式)

        参数:
            contract_name: 合约名称
            provider_key: Provider Key (可选，不传则从 ContractConfig 获取)

        返回:
            调用参数 dict
        """
        config, key = await self.get_config_and_key(contract_name, provider_key)

        # 验证合约已部署
        contract = await ContractDeployment.filter(
            name=contract_name, network=self.network
        ).first()
        if not contract:
            raise BusinessException(
                error_code=ErrorCode.CONTRACT_DEPLOYMENT_NOT_FOUND,
                detail=f"Contract '{contract_name}' not found in ContractDeployment",
            )
        if not contract.address:
            raise BusinessException(
                error_code=ErrorCode.CONTRACT_NOT_DEPLOYED,
                detail=f"Contract '{contract_name}' not deployed (no address)",
            )

        provider = await self.get_provider_contract()
        key_hash = compute_key_hash(key)

        return {
            "provider_address": provider.address,
            "function_name": "set_address",
            "key_hash": key_hash,
            "contract_address": contract.address,
            "contract_name": contract_name,
            "provider_key": key,
            "abi": SET_ADDRESS_ABI,
        }

    async def confirm_register(
        self, contract_name: str, provider_key: str, tx_hash: str
    ) -> Dict[str, Any]:
        """
        确认注册完成，更新数据库缓存

        如果合约之前被 unregister (soft delete)，重新注册时会恢复

        参数:
            contract_name: 合约名称
            provider_key: Provider Key
            tx_hash: 交易哈希

        返回:
            确认结果
        """
        contract = await ContractDeployment.filter(
            name=contract_name, network=self.network
        ).first()
        if not contract:
            raise BusinessException(
                error_code=ErrorCode.CONTRACT_DEPLOYMENT_NOT_FOUND,
                detail=f"Contract '{contract_name}' not found",
            )

        provider = await self.get_provider_contract()
        config = await ContractConfig.filter(contract_name=contract_name).first()
        key_hash = compute_key_hash(provider_key)
        now = datetime.now()

        # 查找现有记录（包括已删除的）
        existing = await ProviderRegistry.filter(
            provider_address=provider.address,
            chain_id=provider.chain_id,
            key=provider_key,
        ).first()

        if existing:
            existing.network = self.network
            existing.key_hash = key_hash
            existing.registered_address = contract.address
            existing.category = config.project_name if config else "unknown"
            existing.contract_name = contract_name
            existing.is_registered = True
            existing.last_synced_at = now
            # 恢复已删除的记录
            if existing.is_deleted:
                existing.is_deleted = False
                existing.deleted_at = None
                existing.deleted_by = None
                logger.info(
                    f"Restored previously unregistered contract: {contract_name}"
                )
            await existing.save()
        else:
            await ProviderRegistry.create(
                provider_address=provider.address,
                chain_id=provider.chain_id,
                key=provider_key,
                network=self.network,
                key_hash=key_hash,
                registered_address=contract.address,
                category=config.project_name if config else "unknown",
                contract_name=contract_name,
                is_registered=True,
                is_deleted=False,
                last_synced_at=now,
            )

        logger.info(
            f"Confirmed registration: {contract_name} -> {provider_key}, tx: {tx_hash}"
        )
        return {
            "status": "registered",
            "contract_name": contract_name,
            "provider_key": provider_key,
            "address": contract.address,
            "tx_hash": tx_hash,
        }

    async def prepare_unregister(
        self, contract_name: str, provider_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        准备解除注册调用参数 (前端钱包签名模式)

        参数:
            contract_name: 合约名称
            provider_key: Provider Key (可选)

        返回:
            调用参数 dict (target_address 为零地址)
        """
        config, key = await self.get_config_and_key(contract_name, provider_key)
        provider = await self.get_provider_contract()

        # 验证合约已注册
        registry = await ProviderRegistry.filter(
            provider_address=provider.address,
            chain_id=provider.chain_id,
            key=key,
            is_deleted=False,
        ).first()
        if not registry or not registry.is_registered:
            raise BusinessException(
                error_code=ErrorCode.CONTRACT_NOT_REGISTERED,
                detail=f"Contract '{contract_name}' is not registered",
            )

        key_hash = compute_key_hash(key)
        return {
            "provider_address": provider.address,
            "function_name": "set_address",
            "key_hash": key_hash,
            "contract_address": ZERO_ADDRESS,
            "contract_name": contract_name,
            "provider_key": key,
            "abi": SET_ADDRESS_ABI,
        }

    async def confirm_unregister(
        self, contract_name: str, provider_key: str, tx_hash: str
    ) -> Dict[str, Any]:
        """
        确认解除注册完成，更新数据库缓存

        参数:
            contract_name: 合约名称
            provider_key: Provider Key
            tx_hash: 交易哈希

        返回:
            确认结果
        """
        provider = await self.get_provider_contract()

        registry = await ProviderRegistry.filter(
            provider_address=provider.address,
            chain_id=provider.chain_id,
            key=provider_key,
            is_deleted=False,
        ).first()
        if not registry:
            raise BusinessException(
                error_code=ErrorCode.PROVIDER_REGISTRY_NOT_FOUND,
                detail=f"ProviderRegistry record not found for key '{provider_key}'",
            )

        # 更新记录
        now = datetime.now()
        registry.is_registered = False
        registry.registered_address = ZERO_ADDRESS
        registry.last_synced_at = now
        await registry.save()

        # 软删除记录
        await registry.soft_delete(deleted_by=f"unregister_tx:{tx_hash[:10]}")

        logger.info(
            f"Confirmed unregistration: {contract_name} -> {provider_key}, tx: {tx_hash}"
        )
        return {
            "success": True,
            "contract_name": contract_name,
            "provider_key": provider_key,
            "tx_hash": tx_hash,
            "message": "Contract unregistered successfully",
        }

    async def sync_from_provider(self) -> Dict[str, Any]:
        """
        从链上 Provider 同步状态到 ProviderRegistry

        返回:
            同步结果统计 {updated, created, total}
        """
        provider = await self.get_provider_contract()

        # 加载 ABI
        storage = StorageService()
        provider_abi = await storage.get_json(provider.abi_path)

        # 获取所有有 provider_key 的合约
        configs = await ContractConfig.filter(provider_key__not_isnull=True)

        updated_count = 0
        created_count = 0
        now = datetime.now()

        async with get_async_web3_adapter() as adapter:
            adapter.register_contract(provider.address, provider_abi)

            for config in configs:
                key = config.provider_key
                key_hash = compute_key_hash(key)

                try:
                    registered_addr = await adapter.call_function(
                        provider.address, "getAddress", [key_hash]
                    )
                except Exception as e:
                    logger.warning(f"Failed to query Provider for key {key}: {e}")
                    registered_addr = ZERO_ADDRESS

                _, created = await ProviderRegistry.update_or_create(
                    provider_address=provider.address,
                    chain_id=provider.chain_id,
                    key=key,
                    defaults={
                        "network": self.network,
                        "key_hash": key_hash,
                        "registered_address": registered_addr,
                        "category": config.project_name,
                        "contract_name": config.contract_name,
                        "is_registered": registered_addr != ZERO_ADDRESS,
                        "last_synced_at": now,
                    },
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

                logger.debug(
                    f"{'Created' if created else 'Updated'} registry: {key} -> {registered_addr[:10]}..."
                )

        return {
            "updated": updated_count,
            "created": created_count,
            "total": len(configs),
        }

    # ============ Status - 状态查询 ============

    async def get_contract_address(
        self, project_name: str, contract_name: str
    ) -> Optional[str]:
        """获取单个合约地址"""
        contract = await ContractDeployment.filter(
            project_name=project_name,
            name=contract_name,
            network=self.network,
            status=ContractStatus.ACTIVE,
        ).first()
        return contract.address if contract else None

    async def get_public_contract_address(
        self, contract_name: str
    ) -> Optional[Dict[str, Any]]:
        """获取公开合约地址（供 Public Router 使用）"""
        contract = await ContractDeployment.filter(
            network=self.network,
            name=contract_name,
            status=ContractStatus.ACTIVE,
        ).first()
        if not contract:
            return None
        network_value = getattr(self.network, "value", self.network)
        return {
            "name": contract.name,
            "address": contract.address,
            "project": contract.project_name,
            "network": network_value,
        }

    async def get_all_contract_addresses(
        self,
        scope: Optional[str] = None,
        contract_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        批量获取活跃合约地址，按 contract_type 分组

        参数:
            scope: 可选，按作用域过滤 (global/project)
            contract_type: 可选，按功能类型过滤 (stablecoin/defi/token 等)

        返回:
            按类型分组的合约地址字典
        """
        filters: Dict[str, Any] = {
            "network": self.network,
            "status": ContractStatus.ACTIVE,
        }
        if scope:
            filters["scope"] = scope
        if contract_type:
            filters["contract_type"] = contract_type

        contracts = await ContractDeployment.filter(**filters).all()

        network_value = getattr(self.network, "value", self.network)
        grouped: Dict[str, List[Dict[str, Any]]] = {}

        for contract in contracts:
            ct = contract.contract_type.value if contract.contract_type else "unknown"
            if ct not in grouped:
                grouped[ct] = []
            grouped[ct].append(
                {
                    "name": contract.name,
                    "address": contract.address,
                    "symbol": contract.symbol,
                    "scope": contract.scope.value if contract.scope else None,
                    "project_name": contract.project_name,
                }
            )

        return {
            "network": network_value,
            "contracts": grouped,
        }

    async def build_contract_maps(self):
        """构建合约相关映射"""
        configs = await ContractConfig.all().order_by("project_name", "contract_name")
        contracts = await ContractDeployment.filter(network=self.network).order_by(
            "name"
        )
        registrations = await ProviderRegistry.filter(network=self.network)

        contract_map = {c.name: c for c in contracts}
        registry_map = {r.contract_name: r for r in registrations}
        key_to_contract = {
            c.provider_key: c.contract_name for c in configs if c.provider_key
        }

        return configs, contract_map, registry_map, key_to_contract

    def resolve_contract_status(
        self, db_addr: Optional[str], chain_addr: Optional[str], registry, config
    ) -> tuple:
        """判断合约状态"""
        if not db_addr:
            return "not_deployed", 0
        if chain_addr and db_addr.lower() != chain_addr.lower():
            return "mismatch", 1
        if registry and not registry.is_registered:
            return "not_registered", 0
        if not registry and config.provider_key:
            return "not_registered", 0
        return "synced", 0

    def build_dep_status(self, deps, registry_map):
        """构建依赖状态列表 - 直接使用合约名作为依赖标识"""
        result = []
        for contract_name in deps or []:
            dep_registry = registry_map.get(contract_name)
            result.append(
                {
                    "key": contract_name,
                    "contract": contract_name,
                    "registered": dep_registry.is_registered if dep_registry else False,
                    "address": dep_registry.registered_address
                    if dep_registry
                    else None,
                }
            )
        return result

    async def get_contract_status(self) -> dict:
        """获取合约状态列表（纯 Provider 模式）"""

        configs, contract_map, registry_map, _ = await self.build_contract_maps()
        global_contracts, project_contracts = [], {}
        needs_update_count = 0

        for config in configs:
            contract = contract_map.get(config.contract_name)
            db_addr = contract.address if contract else None
            registry = registry_map.get(config.contract_name)
            chain_addr = (
                registry.registered_address
                if registry and registry.is_registered
                else None
            )
            status, update_inc = self.resolve_contract_status(
                db_addr, chain_addr, registry, config
            )
            needs_update_count += update_inc

            contract_data = {
                "id": contract.id if contract else None,
                "name": config.contract_name,
                "project": config.project_name,
                "address": db_addr,
                "deployed": bool(db_addr),
                "deployed_at": contract.created_at.isoformat()
                if contract and contract.created_at
                else None,
                "registration_status": status,
                "provider_address": chain_addr,
                "provider_key": config.provider_key,
                "dependencies": self.build_dep_status(
                    config.required_deps or [], registry_map
                ),
                "optional_dependencies": self.build_dep_status(
                    config.optional_deps or [], registry_map
                ),
                "scope": config.scope or "project",
                "contract_type": config.contract_type,
                "type_config": CONTRACT_TYPE_CONFIGS.get(config.contract_type, {}),
                "description": config.description,
                "last_synced": registry.last_synced_at.isoformat()
                if registry and registry.last_synced_at
                else None,
                "is_deleted": registry.is_deleted if registry else False,
                "is_primary": contract.is_primary if contract else False,
                "symbol": contract.symbol if contract else None,
            }

            if config.scope == "global":
                global_contracts.append(contract_data)
            else:
                pn = config.project_name
                if pn not in project_contracts:
                    project_contracts[pn] = {
                        "project": pn,
                        "contracts": [],
                        "has_primary": False,
                        "primary_contract": None,
                        "config": PROJECT_CONFIGS.get(
                            pn, {"name": pn, "label": pn, "color": "gray"}
                        ),
                    }
                project_contracts[pn]["contracts"].append(contract_data)
                if contract_data["is_primary"]:
                    project_contracts[pn]["has_primary"] = True
                    project_contracts[pn]["primary_contract"] = contract_data

        # 批量查询绑定状态
        primary_addresses: List[str] = []
        for pn, pg in project_contracts.items():
            if pg.get("primary_contract") and pg["primary_contract"].get("address"):
                primary_addresses.append(pg["primary_contract"]["address"])

        binding_map: Dict[str, AssetContractBinding] = {}
        if primary_addresses:
            bindings = (
                await AssetContractBinding.filter(
                    contract_address__in=primary_addresses,
                    is_primary=True,
                )
                .prefetch_related("asset")
                .all()
            )
            binding_map = {b.contract_address: b for b in bindings}
            logger.debug(
                f"Batch queried {len(bindings)} bindings for {len(primary_addresses)} primary addresses"
            )

        # 为每个项目添加绑定状态和就绪详情
        for pn, pg in project_contracts.items():
            primary_addr = (
                pg.get("primary_contract", {}).get("address")
                if pg.get("primary_contract")
                else None
            )
            binding = binding_map.get(primary_addr) if primary_addr else None

            is_bound = binding is not None
            pg["is_bound_to_asset"] = is_bound
            pg["bound_asset"] = (
                {
                    "asset_id": binding.asset.id,
                    "asset_name": binding.asset.name,
                }
                if binding
                else None
            )

            # 就绪详情
            all_registered = all(
                c["registration_status"] == "synced" for c in pg["contracts"]
            )

            deps_all_registered = all(
                dep.get("registered", False)
                for c in pg["contracts"]
                for dep in c.get("dependencies", [])
            )

            no_missing_deps = deps_all_registered
            has_primary = pg.get("has_primary", False)

            pg["readiness_details"] = {
                "all_registered": all_registered,
                "no_missing_deps": no_missing_deps,
                "has_primary": has_primary,
            }

            # 就绪状态映射
            if all_registered and no_missing_deps and has_primary:
                pg["project_readiness"] = "ready"
            elif has_primary and (all_registered or no_missing_deps):
                pg["project_readiness"] = "partially_ready"
            else:
                pg["project_readiness"] = "not_ready"

            pg["is_ready"] = pg["project_readiness"] != "not_ready"
            pg["can_bind_asset"] = pg["project_readiness"] == "ready" and not is_bound

            # 为每个合约添加操作权限
            for contract in pg["contracts"]:
                can_set = (
                    contract["scope"] == "project"
                    and contract["registration_status"] == "synced"
                    and not contract["is_primary"]
                    and not is_bound
                    and not has_primary
                )
                can_unset = contract["is_primary"] and not is_bound

                disabled_reason = None
                if is_bound:
                    disabled_reason = f"项目已绑定 Asset「{pg['bound_asset']['asset_name']}」，请先解绑"
                elif contract["registration_status"] != "synced":
                    disabled_reason = "合约未同步到 Provider"
                elif contract["scope"] != "project":
                    disabled_reason = "全局合约不能设为主合约"
                elif has_primary and not contract["is_primary"]:
                    disabled_reason = "项目已有主合约，请先取消现有主合约"

                contract["actions"] = {
                    "can_set_primary": can_set,
                    "can_unset_primary": can_unset,
                    "disabled_reason": disabled_reason
                    if not (can_set or can_unset)
                    else None,
                }

        return {
            "global_contracts": global_contracts,
            "project_contracts": list(project_contracts.values()),
            "contract_types": CONTRACT_TYPE_CONFIGS,
            "projects": list(PROJECT_CONFIGS.values()),
            "network": self.network,
            "needs_update_count": needs_update_count,
            "stats": {
                "total": len(configs),
                "global_count": len(global_contracts),
                "project_count": sum(
                    len(p["contracts"]) for p in project_contracts.values()
                ),
                "deployed": sum(
                    1 for c in configs if contract_map.get(c.contract_name)
                ),
                "registered": sum(
                    1
                    for c in configs
                    if (r := registry_map.get(c.contract_name)) and r.is_registered
                ),
            },
        }

    async def get_provider_status(self, category: Optional[str] = None) -> dict:
        """获取 Provider 注册状态详情"""
        filters = {"network": self.network, "is_deleted": False}
        if category:
            filters["category"] = category
        registrations = await ProviderRegistry.filter(**filters).order_by(
            "category", "key"
        )

        result = {
            "total": len(registrations),
            "registered": sum(1 for r in registrations if r.is_registered),
            "unregistered": sum(1 for r in registrations if not r.is_registered),
            "categories": {},
            "registrations": [],
        }
        for reg in registrations:
            if reg.category not in result["categories"]:
                result["categories"][reg.category] = {"total": 0, "registered": 0}
            result["categories"][reg.category]["total"] += 1
            if reg.is_registered:
                result["categories"][reg.category]["registered"] += 1
            result["registrations"].append(
                {
                    "key": reg.key,
                    "key_hash": reg.key_hash,
                    "contract_name": reg.contract_name,
                    "category": reg.category,
                    "registered_address": reg.registered_address,
                    "is_registered": reg.is_registered,
                    "last_synced_at": reg.last_synced_at.isoformat()
                    if reg.last_synced_at
                    else None,
                }
            )
        return result

    async def get_dependency_graph(self) -> dict:
        """获取合约依赖关系图数据（纯 Provider 模式）"""
        (
            configs,
            contract_map,
            registry_map,
            key_to_contract,
        ) = await self.build_contract_maps()

        nodes = []
        for config in configs:
            contract = contract_map.get(config.contract_name)
            registry = registry_map.get(config.contract_name)
            deps = config.dependencies or []
            missing_deps = []
            for dk in deps:
                dep_contract = key_to_contract.get(dk, dk)
                dr = registry_map.get(dep_contract) if dep_contract else None
                if not dr or not dr.is_registered:
                    missing_deps.append(dk)

            if not contract or not contract.address:
                node_status = "not_deployed"
            elif config.provider_key and (not registry or not registry.is_registered):
                node_status = "not_registered"
            elif missing_deps:
                node_status = "missing_deps"
            else:
                node_status = "ready"

            nodes.append(
                {
                    "id": config.contract_name,
                    "label": config.contract_name,
                    "type": TYPE_TO_GRAPH_TYPE.get(config.contract_type, "exclusive"),
                    "module": config.contract_type,
                    "address": contract.address if contract else None,
                    "status": node_status,
                    "project": config.project_name,
                    "deployedAt": contract.created_at.isoformat()
                    if contract and contract.created_at
                    else None,
                    "isRegistered": registry.is_registered if registry else False,
                    "providerAddress": registry.registered_address
                    if registry
                    else None,
                    "missingDeps": missing_deps,
                    "description": config.description,
                    "isDeleted": registry.is_deleted if registry else False,
                }
            )

        edges = []
        for config in configs:
            for dep_key in config.dependencies or []:
                dep_name = key_to_contract.get(dep_key, dep_key)
                dep_reg = registry_map.get(dep_name) if dep_name else None
                edges.append(
                    {
                        "source": config.contract_name,
                        "target": dep_name,
                        "key": dep_key,
                        "status": "registered"
                        if dep_reg and dep_reg.is_registered
                        else "not_registered",
                        "registeredAddress": dep_reg.registered_address
                        if dep_reg
                        else None,
                    }
                )
        return {"nodes": nodes, "edges": edges}

    async def get_project_primary_contract(
        self, project_name: str
    ) -> Optional[ContractDeployment]:
        """获取项目的主合约"""
        contract = await ContractDeployment.filter(
            project_name=project_name,
            network=self.network,
            is_primary=True,
        ).first()
        if contract:
            logger.debug(
                f"Found primary contract for '{project_name}': {contract.name}"
            )
        else:
            logger.debug(f"No primary contract for '{project_name}'")
        return contract

    async def check_project_can_modify(self, project_name: str) -> None:
        """
        检查项目是否可以修改（未绑定 Asset）

        参数:
            project_name: 项目名称

        异常:
            BusinessException: 如果项目已绑定 Asset
        """
        primary = await ContractDeployment.filter(
            project_name=project_name,
            is_primary=True,
            network=self.network,
        ).first()

        if not primary:
            logger.debug(
                f"Project '{project_name}' has no primary contract, can modify"
            )
            return

        binding = (
            await AssetContractBinding.filter(
                contract_address=primary.address,
                is_primary=True,
            )
            .prefetch_related("asset")
            .first()
        )

        if binding:
            logger.warning(
                f"Project '{project_name}' is bound to Asset '{binding.asset.name}' (ID: {binding.asset.id}), cannot modify"
            )
            raise BusinessException(
                error_code=ErrorCode.PROJECT_BOUND_CANNOT_MODIFY,
                detail={
                    "project": project_name,
                    "bound_asset_id": binding.asset.id,
                    "bound_asset_name": binding.asset.name,
                    "message": "项目已绑定 Asset，请先解绑后再进行此操作",
                },
            )

        logger.debug(f"Project '{project_name}' is not bound to any Asset, can modify")

    async def get_all_contracts(self) -> list:
        """获取所有合约列表"""
        contracts = await ContractDeployment.filter(network=self.network).order_by(
            "name"
        )
        return [
            {
                "id": c.id,
                "name": c.name,
                "address": c.address,
                "project_name": c.project_name,
                "status": c.status.value if c.status else None,
                "is_primary": c.is_primary,
                "symbol": c.symbol,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in contracts
        ]

    async def get_project_deployments(
        self,
        project: str,
        status: Optional[str] = None,
        scope: Optional[str] = None,
    ) -> list[ContractDeployment]:
        """
        获取项目的合约部署列表

        参数:
            project: 项目名称
            status: 合约状态过滤 (可选)
            scope: 作用域过滤 (可选)

        返回:
            ContractDeployment 列表
        """
        filters: Dict[str, Any] = {"project_name": project}
        if status:
            filters["status"] = status
        if scope:
            filters["scope"] = scope
        return await ContractDeployment.filter(**filters).all()

    async def validate_project_for_binding(self, project: str) -> tuple:
        """
        校验项目就绪状态并返回绑定所需的合约信息

        验证项目存在、就绪、未被其他 Asset 绑定，获取主合约和项目合约列表。

        参数:
            project: 项目标识

        返回:
            (primary_contract, project_contracts) 元组

        异常:
            BusinessException: 项目不存在、未就绪、已绑定、或无主合约
        """
        # 获取合约状态
        contract_status = await self.get_contract_status()

        # 查找项目组
        project_group = None
        for pg in contract_status.get("project_contracts", []):
            if pg.get("project") == project:
                project_group = pg
                break

        if not project_group:
            raise BusinessException(
                code=400,
                error_code=ErrorCode.PROJECT_NOT_READY,
                detail={
                    "project": project,
                    "reasons": ["项目不存在"],
                    "message": "项目未就绪，无法绑定 Asset",
                },
            )

        # 校验就绪状态
        if project_group.get("project_readiness") != "ready":
            reasons: list[str] = []
            readiness_details = project_group.get("readiness_details", {})
            if not readiness_details.get("has_primary"):
                reasons.append("未设置主合约")
            if not readiness_details.get("all_registered"):
                reasons.append("存在未注册的合约")
            if not readiness_details.get("no_missing_deps"):
                reasons.append("存在未注册的依赖")

            raise BusinessException(
                code=400,
                error_code=ErrorCode.PROJECT_NOT_READY,
                detail={
                    "project": project,
                    "reasons": reasons if reasons else ["项目未就绪"],
                    "message": "项目未就绪，无法绑定 Asset",
                },
            )

        # 校验项目未被其他 Asset 绑定
        await self.check_project_can_modify(project)

        # 获取主合约
        primary_contract = await self.get_project_primary_contract(project)
        if not primary_contract:
            raise BusinessException(
                code=400,
                error_code=ErrorCode.PROJECT_NO_PRIMARY_CONTRACT,
                detail={"project": project},
            )

        # 获取项目合约列表 - 只查询 PROJECT scope
        project_contracts = await self.get_project_deployments(
            project=project,
            status=ContractStatus.ACTIVE,
            scope=ContractScope.PROJECT,
        )

        return primary_contract, project_contracts

    # ============ Provider Registry - 业务流程 ============

    async def sync_provider_registry(
        self, provider_address: str, chain_id: int, network, web3_provider
    ) -> list[ProviderRegistry]:
        """
        从链上同步 Provider 注册状态

        参数:
            provider_address: AddressProvider 合约地址
            chain_id: 链 ID
            network: 网络类型
            web3_provider: Web3 provider 实例

        返回:
            更新后的注册记录列表
        """
        results = []
        now = datetime.now()

        # 从 ContractConfig 获取所有合约配置
        all_configs = await ContractConfig.all()

        for config in all_configs:
            if not config.provider_key:
                continue

            key_hash = config.provider_key_hash or compute_key_hash(config.provider_key)

            # 查询链上地址
            # registered_addr = provider_contract.functions.get_address(key_hash).call()
            # 临时: 使用零地址
            registered_addr = ZERO_ADDRESS

            # 更新或创建记录
            registry, _ = await ProviderRegistry.update_or_create(
                provider_address=provider_address,
                chain_id=chain_id,
                key=config.provider_key,
                defaults={
                    "network": network,
                    "key_hash": key_hash,
                    "registered_address": registered_addr,
                    "category": config.project_name,
                    "contract_name": config.contract_name,
                    "is_registered": registered_addr != ZERO_ADDRESS,
                    "last_synced_at": now,
                },
            )
            results.append(registry)

        return results

    async def check_project_ready(
        self, project_name: str, provider_address: str, chain_id: int
    ) -> dict:
        """
        检查项目是否就绪（所有依赖已注册）

        参数:
            project_name: 项目名称，如 "vanke"
            provider_address: Provider 地址
            chain_id: 链 ID

        返回:
            项目状态字典
        """
        # 从 ContractConfig 获取项目的所有合约
        project_configs = await ContractConfig.filter(project_name=project_name).all()
        project_keys = [c.provider_key for c in project_configs if c.provider_key]

        # 查询注册状态（排除已删除记录）
        registrations = await ProviderRegistry.filter(
            provider_address=provider_address,
            chain_id=chain_id,
            key__in=project_keys,
            is_deleted=False,
        )

        registered_keys = {r.key for r in registrations if r.is_registered}

        result = {
            "project": project_name,
            "status": "ready",
            "registered": len(registered_keys),
            "total": len(project_keys),
            "contracts": [],
            "missing_registrations": [],
        }

        for config in project_configs:
            if not config.provider_key:
                continue

            deps = config.dependencies or []

            # 检查合约本身是否注册
            self_registered = config.provider_key in registered_keys

            # 检查依赖是否注册
            missing_deps = [dep for dep in deps if dep not in registered_keys]

            contract_status = {
                "name": config.contract_name,
                "key": config.provider_key,
                "ready": self_registered and len(missing_deps) == 0,
                "registered": self_registered,
                "missing_deps": missing_deps,
            }
            result["contracts"].append(contract_status)

            if not self_registered:
                result["missing_registrations"].append(config.provider_key)

            if not contract_status["ready"]:
                result["status"] = "partially_ready"

        if len(result["missing_registrations"]) == len(project_keys):
            result["status"] = "not_ready"

        return result

    # ============ Sync - 同步与主合约管理 ============

    async def update_registry_record(
        self, contract_name: str, address: str
    ) -> ContractDeployment:
        """
        手动更新本地合约记录

        参数:
            contract_name: 合约名称
            address: 新的合约地址

        返回:
            更新后的合约对象
        """
        contract = await ContractDeployment.filter(
            name=contract_name, network=self.network
        ).first()
        if not contract:
            raise BusinessException(
                error_code=ErrorCode.CONTRACT_DEPLOYMENT_NOT_FOUND,
                detail=f"Contract {contract_name} not found in DB",
            )

        contract.address = address
        await contract.save()
        logger.info(f"Manually updated contract {contract_name} to {address}")
        return contract

    async def set_primary(self, contract_id: int) -> ContractDeployment:
        """
        设置合约为主合约

        验证规则:
        1. 合约必须存在
        2. 合约必须是 PROJECT scope
        3. 项目不能已有主合约

        参数:
            contract_id: 合约 ID

        返回:
            更新后的合约对象
        """
        contract = await ContractDeployment.filter(id=contract_id).first()
        if not contract:
            raise BusinessException(
                code=404,
                error_code=ErrorCode.CONTRACT_DEPLOYMENT_NOT_FOUND,
                detail={"contract_id": contract_id},
            )

        if contract.scope != ContractScope.PROJECT:
            raise BusinessException(
                code=400,
                error_code=ErrorCode.CONTRACT_NOT_PROJECT_SCOPE,
                detail={
                    "contract_id": contract_id,
                    "scope": contract.scope.value if contract.scope else None,
                },
            )

        existing_primary = await ContractDeployment.filter(
            project_name=contract.project_name,
            network=self.network,
            is_primary=True,
        ).first()

        if existing_primary:
            raise BusinessException(
                code=400,
                error_code=ErrorCode.PROJECT_ALREADY_HAS_PRIMARY,
                detail={
                    "project_name": contract.project_name,
                    "existing_primary_id": existing_primary.id,
                    "existing_primary_name": existing_primary.name,
                },
            )

        contract.is_primary = True
        await contract.save()

        logger.info(
            f"Set contract as primary: {contract.name} (project: {contract.project_name})"
        )

        return contract

    async def unset_primary(self, contract_id: int) -> ContractDeployment:
        """
        取消合约的主合约标记

        验证规则:
        1. 合约必须存在
        2. 合约必须是当前的主合约

        参数:
            contract_id: 合约 ID

        返回:
            更新后的合约对象
        """
        contract = await ContractDeployment.filter(id=contract_id).first()
        if not contract:
            raise BusinessException(
                code=404,
                error_code=ErrorCode.CONTRACT_DEPLOYMENT_NOT_FOUND,
                detail={"contract_id": contract_id},
            )

        if not contract.is_primary:
            raise BusinessException(
                code=400,
                error_code=ErrorCode.CONTRACT_NOT_PRIMARY,
                detail={"contract_id": contract_id, "contract_name": contract.name},
            )

        contract.is_primary = False
        await contract.save()

        logger.info(
            f"Unset contract as primary: {contract.name} (project: {contract.project_name})"
        )

        return contract
