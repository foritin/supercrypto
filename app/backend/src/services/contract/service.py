"""
Contract Service
合约地址服务 (纯 Provider 模式)

数据来源:
- ContractMeta 表: 合约元数据、依赖关系
- Contract 表: 合约部署信息
- ProviderRegistry 表: Provider 注册状态
"""

from datetime import datetime
from typing import Any, Dict, Optional

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.shared.common.adapters import get_async_web3_adapter

from src.models.contracts.contract import Contract as ContractModel
from src.models.contracts.contract_meta import ContractMeta
from src.models.contracts.provider_registry import (
    ZERO_ADDRESS,
    ProviderRegistry,
    compute_key_hash,
)
from src.shared.schemas.enums import ContractStatus

logger = get_logger("contract.service")

# AddressProvider ABI (仅包含需要的函数)
ADDRESS_PROVIDER_ABI = [
    {
        "name": "get_all_addresses",
        "type": "function",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [
            {"name": "", "type": "bytes32[]"},
            {"name": "", "type": "address[]"},
        ],
    },
    {
        "name": "getAddress",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "key", "type": "bytes32"}],
        "outputs": [{"name": "", "type": "address"}],
    },
]


class ContractService:
    """合约服务 (纯 Provider 模式)"""

    def __init__(self, network: Optional[str] = None):
        self.network = SETTINGS.NETWORK

    async def get_contract_address(
        self, project_name: str, contract_name: str
    ) -> Optional[str]:
        """获取单个合约地址"""
        contract = await ContractModel.filter(
            project_name=project_name,
            name=contract_name,
            network=self.network,
            status=ContractStatus.ACTIVE,
        ).first()
        return contract.address if contract else None

    async def get_contract_status(self) -> dict:
        """
        获取合约状态列表（纯 Provider 模式）

        数据来源:
        - ContractMeta: 合约元数据、依赖关系
        - Contract: 部署状态（包含 is_primary, symbol 字段）
        - ProviderRegistry: Provider 注册状态

        返回结构按 scope 分组:
        - global_contracts: 公共合约 (AddressProvider, KYC, USDT, USDC 等)
        - project_contracts: 按项目分组的项目合约
          - 每个项目组包含 has_primary, primary_contract, is_ready, missing_dependencies 字段
        
        注意: 返回所有记录（包括已删除的），由前端根据 is_deleted 字段过滤显示
        
        Requirements: 4.1, 4.6, 7.3, 7.4
        """
        from src.services.project_registry import get_readiness_checker
        from src.shared.schemas.enums import ProjectReadiness

        # 查询所有合约元数据
        metas = await ContractMeta.all().order_by("project_name", "contract_name")

        # 查询所有本地合约记录
        contracts = await ContractModel.filter(network=self.network).order_by("name")
        contract_map = {c.name: c for c in contracts}

        # 获取 Provider 注册状态（返回所有记录，包括已删除的，由前端过滤）
        registrations = await ProviderRegistry.filter(network=self.network)
        registry_map = {r.contract_name: r for r in registrations}

        # 构建 provider_key -> contract_name 映射
        key_to_contract = {}
        for m in metas:
            if m.provider_key:
                key_to_contract[m.provider_key] = m.contract_name

        # 合约类型配置
        contract_type_configs = {
            "registry": {"label": "注册中心", "color": "purple", "icon": "📦"},
            "kyc": {"label": "KYC", "color": "blue", "icon": "🔐"},
            "governance": {"label": "治理", "color": "indigo", "icon": "⚖️"},
            "stablecoin": {"label": "稳定币", "color": "green", "icon": "💵"},
            "token": {"label": "代币", "color": "yellow", "icon": "🪙"},
            "defi": {"label": "DeFi", "color": "orange", "icon": "📊"},
        }

        # 项目配置
        project_configs = {
            "common": {"name": "common", "label": "公共合约", "color": "blue"},
            "vanke": {"name": "vanke", "label": "万科项目", "color": "green"},
        }

        global_contracts = []  # scope == 'global'
        project_contracts: Dict[str, dict] = {}  # scope == 'project', 按 project_name 分组
        needs_update_count = 0

        # 遍历 ContractMeta (而非 Contract 表)
        for meta in metas:
            contract = contract_map.get(meta.contract_name)
            db_addr = contract.address if contract else None

            # 从 ProviderRegistry 查找注册状态
            registry = registry_map.get(meta.contract_name)
            chain_addr = (
                registry.registered_address
                if registry and registry.is_registered
                else None
            )

            # 判断状态
            if not db_addr:
                status = "not_deployed"
            elif chain_addr and db_addr.lower() != chain_addr.lower():
                status = "mismatch"  # DB与链上不一致
                needs_update_count += 1
            elif registry and not registry.is_registered:
                status = "not_registered"  # 已部署但未注册到 Provider
            elif not registry and meta.provider_key:
                status = "not_registered"  # 有 provider_key 但未注册
            else:
                status = "synced"

            # 获取依赖信息 (从 ContractMeta.dependencies)
            deps = meta.dependencies or []
            dep_status_list = []
            for dep_key in deps:
                dep_contract_name = key_to_contract.get(dep_key, dep_key)
                dep_registry = registry_map.get(dep_contract_name)
                dep_status_list.append(
                    {
                        "key": dep_key,
                        "contract": dep_contract_name,
                        "registered": dep_registry.is_registered
                        if dep_registry
                        else False,
                        "address": dep_registry.registered_address
                        if dep_registry
                        else None,
                    }
                )

            # 构造合约数据（包含 is_primary 和 symbol 字段）
            # Requirements: 4.1, 4.6
            contract_data = {
                "name": meta.contract_name,
                "project": meta.project_name,
                "address": db_addr,
                "deployed": bool(db_addr),
                "deployed_at": contract.created_at.isoformat()
                if contract and contract.created_at
                else None,
                "registration_status": status,
                "provider_address": chain_addr,
                "provider_key": meta.provider_key,
                "dependencies": dep_status_list,
                "scope": meta.scope or "project",
                "contract_type": meta.contract_type,
                "type_config": contract_type_configs.get(meta.contract_type, {}),
                "description": meta.description,
                "last_synced": registry.last_synced_at.isoformat()
                if registry and registry.last_synced_at
                else None,
                "is_deleted": registry.is_deleted if registry else False,
                # 新增字段：主合约标记和 Token Symbol
                "is_primary": contract.is_primary if contract else False,
                "symbol": contract.symbol if contract else None,
            }

            # 按 scope 分组
            if meta.scope == "global":
                global_contracts.append(contract_data)
            else:
                # 按 project_name 分组
                project_name = meta.project_name
                if project_name not in project_contracts:
                    project_contracts[project_name] = {
                        "project": project_name,
                        "config": project_configs.get(
                            project_name,
                            {
                                "name": project_name,
                                "label": project_name,
                                "color": "gray",
                            },
                        ),
                        "contracts": [],
                        # 新增字段：主合约相关信息（初始化）
                        "has_primary": False,
                        "primary_contract": None,
                        "is_ready": False,
                        "missing_dependencies": [],
                    }
                project_contracts[project_name]["contracts"].append(contract_data)
                
                # 检查是否为主合约
                if contract_data["is_primary"]:
                    project_contracts[project_name]["has_primary"] = True
                    project_contracts[project_name]["primary_contract"] = contract_data

        # 计算每个项目的就绪状态
        # Requirements: 7.3, 7.4
        checker = get_readiness_checker(self.network)
        for project_name, project_group in project_contracts.items():
            try:
                report = await checker.get_project_status(project_name, self.network)
                # 项目就绪：NOT_READY 以外的状态都算就绪
                project_group["is_ready"] = report.readiness != ProjectReadiness.NOT_READY
                
                # 收集缺失的必选依赖
                missing_deps: list[str] = []
                for contract_info in report.contracts.values():
                    missing_deps.extend(contract_info.missing_required_deps)
                project_group["missing_dependencies"] = list(set(missing_deps))
            except Exception as e:
                logger.warning(f"Failed to get readiness status for project '{project_name}': {e}")
                project_group["is_ready"] = False
                project_group["missing_dependencies"] = []

        return {
            # 新结构：按 scope 分组
            "global_contracts": global_contracts,
            "project_contracts": list(project_contracts.values()),
            # 元数据
            "contract_types": contract_type_configs,
            "projects": list(project_configs.values()),
            "network": self.network,
            "needs_update_count": needs_update_count,
            # 统计
            "stats": {
                "total": len(metas),
                "global_count": len(global_contracts),
                "project_count": sum(
                    len(p["contracts"]) for p in project_contracts.values()
                ),
                "deployed": sum(1 for m in metas if contract_map.get(m.contract_name)),
                "registered": sum(
                    1
                    for m in metas
                    if (reg := registry_map.get(m.contract_name)) and reg.is_registered
                ),
            },
        }


    async def sync_from_provider(self) -> Dict[str, Any]:
        """
        从链上 Provider 同步状态到 ProviderRegistry

        数据来源: ContractMeta 表获取所有有 provider_key 的合约

        Returns:
            同步结果统计
        """
        from src.shared.common.adapters import get_async_minio_adapter

        provider_contract = await ContractModel.filter(
            name="AddressProvider", network=self.network, status=ContractStatus.ACTIVE
        ).first()

        if not provider_contract or not provider_contract.address:
            raise Exception("AddressProvider not found or not deployed")

        # 加载 ABI
        minio_adapter = get_async_minio_adapter()
        provider_abi = await minio_adapter.get_json(provider_contract.abi_path)

        # 从 ContractMeta 获取所有有 provider_key 的合约
        metas = await ContractMeta.filter(provider_key__not_isnull=True)

        updated_count = 0
        created_count = 0
        now = datetime.now()

        # 注册合约到 web3_adapter
        web3_adapter = get_async_web3_adapter()
        web3_adapter.register_contract(provider_contract.address, provider_abi)

        async with web3_adapter as adapter:
            for meta in metas:
                key = meta.provider_key
                key_hash = compute_key_hash(key)

                try:
                    registered_addr = await adapter.call_function(
                        provider_contract.address, "getAddress", [key_hash]
                    )
                except Exception as e:
                    logger.warning(f"Failed to query Provider for key {key}: {e}")
                    registered_addr = ZERO_ADDRESS

                # 更新或创建 ProviderRegistry 记录
                _, created = await ProviderRegistry.update_or_create(
                    provider_address=provider_contract.address,
                    chain_id=provider_contract.chain_id,
                    key=key,
                    defaults={
                        "network": self.network,
                        "key_hash": key_hash,
                        "registered_address": registered_addr,
                        "category": meta.project_name,
                        "contract_name": meta.contract_name,
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
            "total": len(metas),
        }

    async def update_registry_record(self, contract_name: str, address: str):
        """
        手动更新本地合约记录
        """
        contract = await ContractModel.filter(
            name=contract_name, network=self.network
        ).first()
        if not contract:
            raise Exception(f"Contract {contract_name} not found in DB")

        contract.address = address
        await contract.save()
        logger.info(f"Manually updated contract {contract_name} to {address}")
        return contract

    async def prepare_register(
        self,
        contract_name: str,
        provider_key: Optional[str] = None,
    ) -> dict:
        """
        准备注册调用参数 (前端钱包签名模式)

        返回前端需要的调用信息，由前端签名发送交易

        Args:
            contract_name: 合约名称
            provider_key: Provider Key (可选，不传则从 ContractMeta 获取)

        Returns:
            调用参数 dict
        """
        # 1. 获取合约元数据
        meta = await ContractMeta.filter(contract_name=contract_name).first()
        if not meta:
            raise Exception(f"Contract '{contract_name}' not found in ContractMeta")

        # 使用传入的 key 或从 meta 获取
        key = provider_key or meta.provider_key
        if not key:
            raise Exception(
                f"No provider_key specified and contract '{contract_name}' has no provider_key in ContractMeta"
            )

        # 2. 验证合约已部署
        contract = await ContractModel.filter(
            name=contract_name,
            network=self.network,
        ).first()

        if not contract:
            raise Exception(f"Contract '{contract_name}' not found in Contract table")

        if not contract.address:
            raise Exception(f"Contract '{contract_name}' not deployed (no address)")

        # 3. 获取 AddressProvider 合约
        provider_contract = await ContractModel.filter(
            name="AddressProvider",
            network=self.network,
            status=ContractStatus.ACTIVE,
        ).first()

        if not provider_contract or not provider_contract.address:
            raise Exception("AddressProvider not found or not deployed")

        # 4. 计算 Key Hash
        key_hash = compute_key_hash(key)

        # 5. 返回调用参数 (ABI 只需要 set_address 函数)
        set_address_abi = [
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

        return {
            "provider_address": provider_contract.address,
            "function_name": "set_address",
            "key_hash": key_hash,
            "contract_address": contract.address,
            "contract_name": contract_name,
            "provider_key": key,
            "abi": set_address_abi,
        }

    async def confirm_register(
        self,
        contract_name: str,
        provider_key: str,
        tx_hash: str,
    ) -> dict:
        """
        确认注册完成，更新数据库缓存 (前端完成交易后调用)

        如果合约之前被 unregister (soft delete)，重新注册时会清空 deleted_by 和 deleted_at

        Args:
            contract_name: 合约名称
            provider_key: Provider Key
            tx_hash: 交易哈希

        Returns:
            确认结果
        """
        # 1. 获取合约信息
        contract = await ContractModel.filter(
            name=contract_name,
            network=self.network,
        ).first()

        if not contract:
            raise Exception(f"Contract '{contract_name}' not found")

        # 2. 获取 Provider 合约
        provider_contract = await ContractModel.filter(
            name="AddressProvider",
            network=self.network,
            status=ContractStatus.ACTIVE,
        ).first()

        if not provider_contract:
            raise Exception("AddressProvider not found")

        # 3. 获取元数据
        meta = await ContractMeta.filter(contract_name=contract_name).first()

        # 4. 更新 ProviderRegistry 缓存
        key_hash = compute_key_hash(provider_key)
        now = datetime.now()

        # 查找现有记录（包括已删除的）
        existing_registry = await ProviderRegistry.filter(
            provider_address=provider_contract.address,
            chain_id=provider_contract.chain_id,
            key=provider_key,
        ).first()

        if existing_registry:
            # 更新现有记录
            existing_registry.network = self.network
            existing_registry.key_hash = key_hash
            existing_registry.registered_address = contract.address
            existing_registry.category = meta.project_name if meta else "unknown"
            existing_registry.contract_name = contract_name
            existing_registry.is_registered = True
            existing_registry.last_synced_at = now
            
            # 如果之前被删除，清空删除标记（恢复）
            if existing_registry.is_deleted:
                existing_registry.is_deleted = False
                existing_registry.deleted_at = None
                existing_registry.deleted_by = None
                logger.info(f"Restored previously unregistered contract: {contract_name}")
            
            await existing_registry.save()
        else:
            # 创建新记录
            await ProviderRegistry.create(
                provider_address=provider_contract.address,
                chain_id=provider_contract.chain_id,
                key=provider_key,
                network=self.network,
                key_hash=key_hash,
                registered_address=contract.address,
                category=meta.project_name if meta else "unknown",
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
        self,
        contract_name: str,
        provider_key: Optional[str] = None,
    ) -> dict:
        """
        准备解除注册调用参数 (前端钱包签名模式)

        1. 验证合约存在于 ContractMeta
        2. 验证合约已注册 (is_registered=True)
        3. 返回调用参数，target_address 为零地址

        Args:
            contract_name: 合约名称
            provider_key: Provider Key (可选，不传则从 ContractMeta 获取)

        Returns:
            调用参数 dict
        """
        # 1. 获取合约元数据
        meta = await ContractMeta.filter(contract_name=contract_name).first()
        if not meta:
            raise Exception(f"Contract '{contract_name}' not found in ContractMeta")

        # 使用传入的 key 或从 meta 获取
        key = provider_key or meta.provider_key
        if not key:
            raise Exception(
                f"No provider_key specified and contract '{contract_name}' has no provider_key in ContractMeta"
            )

        # 2. 获取 AddressProvider 合约
        provider_contract = await ContractModel.filter(
            name="AddressProvider",
            network=self.network,
            status=ContractStatus.ACTIVE,
        ).first()

        if not provider_contract or not provider_contract.address:
            raise Exception("AddressProvider not found or not deployed")

        # 3. 验证合约已注册
        registry = await ProviderRegistry.filter(
            provider_address=provider_contract.address,
            chain_id=provider_contract.chain_id,
            key=key,
            is_deleted=False,
        ).first()

        if not registry or not registry.is_registered:
            raise Exception(f"Contract '{contract_name}' is not registered")

        # 4. 计算 Key Hash
        key_hash = compute_key_hash(key)

        # 5. 返回调用参数 (target_address 为零地址)
        set_address_abi = [
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

        return {
            "provider_address": provider_contract.address,
            "function_name": "set_address",
            "key_hash": key_hash,
            "contract_address": ZERO_ADDRESS,  # 解除注册使用零地址
            "contract_name": contract_name,
            "provider_key": key,
            "abi": set_address_abi,
        }

    async def confirm_unregister(
        self,
        contract_name: str,
        provider_key: str,
        tx_hash: str,
    ) -> dict:
        """
        确认解除注册完成，更新数据库缓存 (前端完成交易后调用)

        1. 更新 ProviderRegistry.is_registered = False
        2. 更新 ProviderRegistry.registered_address = ZERO_ADDRESS
        3. 调用 soft_delete() 设置 is_deleted=True
        4. 更新 last_synced_at

        Args:
            contract_name: 合约名称
            provider_key: Provider Key
            tx_hash: 交易哈希

        Returns:
            确认结果
        """
        # 1. 获取 Provider 合约
        provider_contract = await ContractModel.filter(
            name="AddressProvider",
            network=self.network,
            status=ContractStatus.ACTIVE,
        ).first()

        if not provider_contract:
            raise Exception("AddressProvider not found")

        # 2. 查找 ProviderRegistry 记录
        registry = await ProviderRegistry.filter(
            provider_address=provider_contract.address,
            chain_id=provider_contract.chain_id,
            key=provider_key,
            is_deleted=False,
        ).first()

        if not registry:
            raise Exception(
                f"ProviderRegistry record not found for key '{provider_key}'"
            )

        # 3. 更新记录
        now = datetime.now()
        registry.is_registered = False
        registry.registered_address = ZERO_ADDRESS
        registry.last_synced_at = now
        await registry.save()

        # 4. 软删除记录
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

    async def get_provider_status(self, category: Optional[str] = None) -> dict:
        """
        获取 Provider 注册状态详情

        Args:
            category: 可选，按分类过滤 (如 "vanke", "common")

        Returns:
            注册状态详情
        """
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
            # 按分类统计
            if reg.category not in result["categories"]:
                result["categories"][reg.category] = {
                    "total": 0,
                    "registered": 0,
                }
            result["categories"][reg.category]["total"] += 1
            if reg.is_registered:
                result["categories"][reg.category]["registered"] += 1

            # 详细列表
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
        """
        获取合约依赖关系图数据 (纯 Provider 模式)

        数据来源：
        - ContractMeta 表获取合约元数据和依赖关系
        - Contract 表获取部署信息
        - ProviderRegistry 获取注册状态

        返回用于前端可视化图的数据结构：
        {
            "nodes": [{"id": "ContractName", "label": "...", "type": "...", "address": "...", "status": "...", "project": "..."}],
            "edges": [{"source": "ContractA", "target": "DependencyKey", "status": "..."}]
        }
        
        注意: 返回所有记录（包括已删除的），由前端根据 isDeleted 字段过滤显示
        """
        # 查询所有合约元数据
        metas = await ContractMeta.all()

        # 构建 provider_key -> contract_name 映射
        key_to_contract = {}
        for m in metas:
            if m.provider_key:
                key_to_contract[m.provider_key] = m.contract_name

        # 查询所有合约部署记录
        contracts = await ContractModel.filter(network=self.network)
        contract_map = {c.name: c for c in contracts}

        # 查询 Provider 注册状态（返回所有记录，包括已删除的，由前端过滤）
        registrations = await ProviderRegistry.filter(network=self.network)
        registry_map = {r.contract_name: r for r in registrations}

        # 合约类型映射
        type_to_graph_type = {
            "registry": "common",
            "kyc": "common",
            "stablecoin": "mock",
            "governance": "common",
            "token": "exclusive",
            "defi": "exclusive",
        }

        # 构建节点列表 (基于 ContractMeta)
        nodes = []
        for meta in metas:
            contract = contract_map.get(meta.contract_name)
            registry = registry_map.get(meta.contract_name)

            # 检查该合约的依赖是否都已注册
            deps = meta.dependencies or []
            missing_deps = []
            for dep_key in deps:
                dep_contract_name = key_to_contract.get(dep_key, dep_key)
                dep_registry = registry_map.get(dep_contract_name)
                if not dep_registry or not dep_registry.is_registered:
                    missing_deps.append(dep_key)

            # 决定节点状态
            if not contract or not contract.address:
                node_status = "not_deployed"
            elif meta.provider_key and (not registry or not registry.is_registered):
                node_status = "not_registered"
            elif missing_deps:
                node_status = "missing_deps"
            else:
                node_status = "ready"

            # 映射 contract_type 到图类型
            graph_type = type_to_graph_type.get(meta.contract_type, "exclusive")

            nodes.append(
                {
                    "id": meta.contract_name,
                    "label": meta.contract_name,
                    "type": graph_type,
                    "module": meta.contract_type,
                    "address": contract.address if contract else None,
                    "status": node_status,
                    "project": meta.project_name,
                    "deployedAt": contract.created_at.isoformat()
                    if contract and contract.created_at
                    else None,
                    "isRegistered": registry.is_registered if registry else False,
                    "providerAddress": registry.registered_address
                    if registry
                    else None,
                    "missingDeps": missing_deps,
                    "description": meta.description,
                    "isDeleted": registry.is_deleted if registry else False,
                }
            )

        # 构建边列表 (基于 ContractMeta.dependencies)
        edges = []
        for meta in metas:
            deps = meta.dependencies or []
            for dep_key in deps:
                dep_contract_name = key_to_contract.get(dep_key, dep_key)
                dep_registry = registry_map.get(dep_contract_name)

                # 检查边的状态
                if dep_registry and dep_registry.is_registered:
                    edge_status = "registered"
                else:
                    edge_status = "not_registered"

                edges.append(
                    {
                        "source": meta.contract_name,
                        "target": dep_contract_name,
                        "key": dep_key,
                        "status": edge_status,
                        "registeredAddress": dep_registry.registered_address
                        if dep_registry
                        else None,
                    }
                )

        return {
            "nodes": nodes,
            "edges": edges,
        }


    async def set_primary(self, contract_id: int) -> ContractModel:
        """
        设置合约为主合约

        验证规则:
        1. 合约必须存在
        2. 合约必须是 PROJECT scope（只有项目专属合约可以设为主合约）
        3. 项目不能已有主合约（每个项目只能有一个主合约）

        Args:
            contract_id: 合约 ID

        Returns:
            更新后的合约对象

        Raises:
            ValueError: 合约不存在、scope 不正确、或项目已有主合约
        """
        from src.shared.schemas.enums import ContractScope

        # 1. 验证合约存在
        contract = await ContractModel.filter(id=contract_id).first()
        if not contract:
            raise ValueError("合约不存在")

        # 2. 验证合约是 PROJECT scope
        if contract.scope != ContractScope.PROJECT:
            raise ValueError("只有项目专属合约（PROJECT scope）可以设为主合约")

        # 3. 检查项目是否已有主合约
        existing_primary = await ContractModel.filter(
            project_name=contract.project_name,
            network=self.network,
            is_primary=True,
        ).first()

        if existing_primary:
            raise ValueError("该项目已有主合约，请先取消现有主合约标记")

        # 4. 设置为主合约
        contract.is_primary = True
        await contract.save()

        logger.info(
            f"Set contract as primary: {contract.name} (project: {contract.project_name})"
        )

        return contract

    async def unset_primary(self, contract_id: int) -> ContractModel:
        """
        取消合约的主合约标记

        验证规则:
        1. 合约必须存在
        2. 合约必须是当前的主合约（is_primary=True）

        Args:
            contract_id: 合约 ID

        Returns:
            更新后的合约对象

        Raises:
            ValueError: 合约不存在或合约不是主合约
        """
        # 1. 验证合约存在
        contract = await ContractModel.filter(id=contract_id).first()
        if not contract:
            raise ValueError("合约不存在")

        # 2. 验证合约是主合约
        if not contract.is_primary:
            raise ValueError("该合约不是主合约")

        # 3. 取消主合约标记
        contract.is_primary = False
        await contract.save()

        logger.info(
            f"Unset contract as primary: {contract.name} (project: {contract.project_name})"
        )

        return contract

    async def get_project_primary_contract(
        self, project_name: str
    ) -> Optional[ContractModel]:
        """
        获取项目的主合约

        根据项目名称查询该项目的主合约（is_primary=True 的合约）。
        每个项目最多只有一个主合约。

        Args:
            project_name: 项目名称

        Returns:
            主合约对象，如果项目没有主合约则返回 None

        Validates: Requirements 5.5
        """
        contract = await ContractModel.filter(
            project_name=project_name,
            network=self.network,
            is_primary=True,
        ).first()

        if contract:
            logger.debug(
                f"Found primary contract for project '{project_name}': {contract.name}"
            )
        else:
            logger.debug(f"No primary contract found for project '{project_name}'")

        return contract


def get_contract_service(network: Optional[str] = None) -> ContractService:
    """获取合约服务实例"""
    return ContractService(network)
