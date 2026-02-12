"""
合约状态查询服务
_Requirements: 3.1_
"""

from typing import Any, Dict, List, Optional

from falib.utils.config import SETTINGS
from falib.utils.log import get_logger

from src.models.asset import AssetContractBinding
from src.models.contracts.contract_config import ContractConfig
from src.models.contracts.contract_deployment import ContractDeployment
from src.models.contracts.provider_registry import ProviderRegistry
from src.shared.common.exceptions import BusinessException
from src.shared.schemas.enums import ContractStatus, ErrorCode

logger = get_logger("business.contract.status")

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


class ContractStatusService:
    """合约状态查询服务"""

    def __init__(self, network: Optional[str] = None):
        self.network = network or SETTINGS.network

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
        """获取公开合约地址（供 Public Router 使用）_Requirements: 1.3_"""
        contract = await ContractDeployment.filter(
            network=self.network,
            name=contract_name,
            status=ContractStatus.ACTIVE,
        ).first()
        if not contract:
            return None
        # network 可能是 enum 或 str
        network_value = getattr(self.network, "value", self.network)
        return {
            "name": contract.name,
            "address": contract.address,
            "project": contract.project_name,
            "network": network_value,
        }

    async def _build_contract_maps(self):
        """构建合约相关映射"""
        configs = await ContractConfig.all().order_by("project_name", "contract_name")
        contracts = await ContractDeployment.filter(network=self.network).order_by(
            "name"
        )
        registrations = await ProviderRegistry.filter(network=self.network)

        contract_map = {c.name: c for c in contracts}
        registry_map = {r.contract_name: r for r in registrations}

        return configs, contract_map, registry_map

    def _get_contract_status(
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

    def _build_dep_status(self, deps, registry_map):
        """构建依赖状态列表 - 直接使用合约名作为依赖标识"""
        result = []
        for contract_name in deps or []:
            dep_registry = registry_map.get(contract_name)
            result.append(
                {
                    "key": contract_name,  # 直接使用合约名
                    "contract": contract_name,
                    "registered": dep_registry.is_registered if dep_registry else False,
                    "address": dep_registry.registered_address
                    if dep_registry
                    else None,
                }
            )
        return result

    async def get_contract_status(self) -> dict:
        """获取合约状态列表（纯 Provider 模式）Requirements: 4.1, 4.6, 7.3, 7.4"""

        configs, contract_map, registry_map = await self._build_contract_maps()
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
            status, update_inc = self._get_contract_status(
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
                "dependencies": self._build_dep_status(
                    config.required_deps or [], registry_map
                ),
                "optional_dependencies": self._build_dep_status(
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

        # 注意: 移除了基于 readiness_checker 的 missing_dependencies 计算
        # 因为它使用 deployment.bindings 数据源，与 dependencies 数组使用的 registry_map 不一致
        # 就绪状态现在完全基于 readiness_details 计算，见下方逻辑

        # === 新增：批量查询绑定状态 ===
        # _Requirements: 2.1-2.5 - 项目绑定状态查询
        # 收集所有项目的主合约地址
        primary_addresses: List[str] = []
        for pn, pg in project_contracts.items():
            if pg.get("primary_contract") and pg["primary_contract"].get("address"):
                primary_addresses.append(pg["primary_contract"]["address"])

        # 批量查询绑定关系
        binding_map: Dict[str, AssetContractBinding] = {}
        if primary_addresses:
            bindings = await AssetContractBinding.filter(
                contract_address__in=primary_addresses,
                is_primary=True,
            ).prefetch_related("asset").all()
            binding_map = {b.contract_address: b for b in bindings}
            logger.debug(
                f"Batch queried {len(bindings)} bindings for {len(primary_addresses)} primary addresses"
            )

        # === 为每个项目添加绑定状态和就绪详情 ===
        # _Requirements: 1.1-1.6, 2.1-2.5, 3.1-3.6 - 项目绑定状态和就绪详情字段
        for pn, pg in project_contracts.items():
            # 绑定状态
            primary_addr = pg.get("primary_contract", {}).get("address") if pg.get("primary_contract") else None
            binding = binding_map.get(primary_addr) if primary_addr else None

            is_bound = binding is not None
            pg["is_bound_to_asset"] = is_bound
            pg["bound_asset"] = {
                "asset_id": binding.asset.id,
                "asset_name": binding.asset.name,
            } if binding else None

            # === 就绪详情（从现有数据计算）===
            # _Requirements: 1.1-1.6 - 项目就绪状态计算
            all_registered = all(
                c["registration_status"] == "synced"
                for c in pg["contracts"]
            )
            
            # 检查所有依赖是否已注册（synced）
            # 收集所有合约的依赖
            all_deps = set()
            for c in pg["contracts"]:
                for dep in c.get("dependencies", []):
                    all_deps.add(dep.get("contract") or dep.get("key"))
            
            # 检查依赖是否都已注册
            # 依赖可能在 global_contracts 或 project_contracts 中
            all_contract_names = set(c["name"] for c in global_contracts)
            for pg_other in project_contracts.values():
                for c in pg_other["contracts"]:
                    all_contract_names.add(c["name"])
            
            # 检查每个依赖是否已注册
            deps_all_registered = all(
                dep.get("registered", False)
                for c in pg["contracts"]
                for dep in c.get("dependencies", [])
            )
            
            # no_missing_deps 基于依赖是否都已注册
            no_missing_deps = deps_all_registered
            has_primary = pg.get("has_primary", False)

            pg["readiness_details"] = {
                "all_registered": all_registered,
                "no_missing_deps": no_missing_deps,
                "has_primary": has_primary,
            }

            # === 就绪状态映射 ===
            # _Requirements: 1.5, 1.6 - 就绪状态判断逻辑
            if all_registered and no_missing_deps and has_primary:
                pg["project_readiness"] = "ready"
            elif has_primary and (all_registered or no_missing_deps):
                pg["project_readiness"] = "partially_ready"
            else:
                pg["project_readiness"] = "not_ready"

            # is_ready 基于 project_readiness (兼容旧字段)
            pg["is_ready"] = pg["project_readiness"] != "not_ready"

            # === can_bind_asset 基于 project_readiness ===
            # _Requirements: 3.5 - 项目就绪且未绑定时可绑定 Asset
            pg["can_bind_asset"] = pg["project_readiness"] == "ready" and not is_bound

            # === 为每个合约添加操作权限 ===
            # _Requirements: 3.6, 5.1-5.5, 8.5-8.6 - 合约操作权限和禁用原因
            for contract in pg["contracts"]:
                # 判断是否可以设置为主合约
                # 条件：项目合约 + 已同步 + 不是主合约 + 项目未绑定 + 项目没有其他主合约
                can_set = (
                    contract["scope"] == "project"
                    and contract["registration_status"] == "synced"
                    and not contract["is_primary"]
                    and not is_bound
                    and not has_primary  # 项目没有其他主合约
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
                    "disabled_reason": disabled_reason if not (can_set or can_unset) else None,
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
        ) = await self._build_contract_maps()

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
        """获取项目的主合约 Validates: Requirements 5.5"""
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
        
        _Requirements: 8.1-8.4 - 已绑定 Asset 的项目合约变更限制
        
        参数:
            project_name: 项目名称
            
        异常:
            BusinessException: 如果项目已绑定 Asset，抛出 PROJECT_BOUND_CANNOT_MODIFY 异常
        """
        # 查询项目主合约
        primary = await ContractDeployment.filter(
            project_name=project_name,
            is_primary=True,
            network=self.network,
        ).first()

        if not primary:
            # 没有主合约，可以修改
            logger.debug(f"Project '{project_name}' has no primary contract, can modify")
            return

        # 检查主合约是否已绑定 Asset
        binding = await AssetContractBinding.filter(
            contract_address=primary.address,
            is_primary=True,
        ).prefetch_related("asset").first()

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


def get_contract_status_service(network: Optional[str] = None) -> ContractStatusService:
    """获取合约状态服务实例"""
    return ContractStatusService(network)
